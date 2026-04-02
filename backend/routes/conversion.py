"""
VenuLoQ — Commercial Conversion Workflow (Phase 10)
Extends the existing leads model as the canonical conversion object.
Operates on: leads, venue_shortlist, quotes collections.
Creates new: site_visits, negotiations collections.
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from config import db
from utils import generate_id, get_current_user, require_role, create_audit_log

router = APIRouter(prefix="/conversion", tags=["conversion"])

# ── Stage pipeline (extends existing lead stages) ─────────────────────────────

CONVERSION_STAGES = [
    "enquiry_received",             # = "new" (backward compat)
    "requirement_qualified",        # = "contacted"
    "venues_shortlisted",           # = "shortlisted"
    "quote_requested",
    "quote_received",
    "site_visit_planned",           # = "site_visit"
    "site_visit_completed",
    "negotiation_in_progress",      # = "negotiation"
    "commercial_accepted",
    "booking_confirmation_pending",
    "booking_confirmed",
    "lost",
]

# Old→new stage normalization for existing data
STAGE_NORMALIZE = {
    "new": "enquiry_received",
    "contacted": "requirement_qualified",
    "shortlisted": "venues_shortlisted",
    "site_visit": "site_visit_planned",
    "negotiation": "negotiation_in_progress",
}

STAGE_LABEL = {
    "enquiry_received": "Enquiry Received",
    "new": "Enquiry Received",
    "requirement_qualified": "Requirement Qualified",
    "contacted": "Requirement Qualified",
    "venues_shortlisted": "Venues Shortlisted",
    "shortlisted": "Venues Shortlisted",
    "quote_requested": "Quote Requested",
    "quote_received": "Quote Received",
    "site_visit_planned": "Site Visit Planned",
    "site_visit": "Site Visit Planned",
    "site_visit_completed": "Site Visit Completed",
    "negotiation_in_progress": "Negotiation",
    "negotiation": "Negotiation",
    "commercial_accepted": "Commercial Accepted",
    "booking_confirmation_pending": "Booking Pending",
    "booking_confirmed": "Booking Confirmed",
    "lost": "Lost",
}

# Valid forward transitions (from → [allowed targets])
STAGE_TRANSITIONS = {
    "enquiry_received": ["requirement_qualified", "lost"],
    "new": ["requirement_qualified", "lost"],
    "requirement_qualified": ["venues_shortlisted", "lost"],
    "contacted": ["venues_shortlisted", "lost"],
    "venues_shortlisted": ["quote_requested", "site_visit_planned", "lost"],
    "shortlisted": ["quote_requested", "site_visit_planned", "lost"],
    "quote_requested": ["quote_received", "lost"],
    "quote_received": ["site_visit_planned", "negotiation_in_progress", "lost"],
    "site_visit_planned": ["site_visit_completed", "lost"],
    "site_visit": ["site_visit_completed", "lost"],
    "site_visit_completed": ["negotiation_in_progress", "quote_requested", "lost"],
    "negotiation_in_progress": ["commercial_accepted", "lost"],
    "negotiation": ["commercial_accepted", "lost"],
    "commercial_accepted": ["booking_confirmation_pending"],
    "booking_confirmation_pending": ["booking_confirmed", "lost"],
    "booking_confirmed": [],
    "lost": ["enquiry_received"],
}

SHORTLIST_STATUSES = [
    "suggested", "liked", "maybe", "rejected",
    "quote_requested", "quote_received",
    "visit_planned", "visit_completed",
    "in_negotiation", "accepted", "dropped",
]

QUOTE_STATUSES = ["requested", "received", "revised", "expired", "accepted", "rejected"]
VISIT_STATUSES = ["requested", "proposed", "scheduled", "completed", "cancelled"]
NEG_STATUSES = ["started", "counter_sent", "counter_received", "waiting_venue",
                "waiting_customer", "blocked", "agreed", "abandoned"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def normalize_stage(stage: str) -> str:
    return STAGE_NORMALIZE.get(stage, stage)


# ── Models ────────────────────────────────────────────────────────────────────

class IntakeModel(BaseModel):
    source_type: str  # "enquiry" | "callback" | "manual"
    source_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    guest_count: Optional[int] = None
    budget_per_plate: Optional[float] = None
    travel_flexibility: Optional[str] = None
    venue_type_pref: Optional[str] = None
    notes: Optional[str] = None

class StageUpdate(BaseModel):
    stage: str
    reason: Optional[str] = None
    blocker: Optional[str] = None
    next_action: Optional[str] = None
    next_followup: Optional[str] = None

class ShortlistStatusUpdate(BaseModel):
    status: str
    customer_feedback: Optional[str] = None
    rm_notes: Optional[str] = None

class QuoteAction(BaseModel):
    venue_id: str
    venue_name: Optional[str] = None
    status: str  # requested, received, revised, expired, accepted, rejected
    amount_per_plate: Optional[float] = None
    total_amount: Optional[float] = None
    inclusions: Optional[str] = None
    exclusions: Optional[str] = None
    special_terms: Optional[str] = None
    valid_until: Optional[str] = None
    note: Optional[str] = None

class VisitAction(BaseModel):
    venue_id: str
    venue_name: Optional[str] = None
    status: str  # requested, proposed, scheduled, completed, cancelled
    proposed_date: Optional[str] = None
    scheduled_date: Optional[str] = None
    outcome: Optional[str] = None
    customer_notes: Optional[str] = None
    rm_notes: Optional[str] = None

class NegotiationAction(BaseModel):
    venue_id: str
    venue_name: Optional[str] = None
    status: str
    latest_ask: Optional[float] = None
    latest_offer: Optional[float] = None
    counter_note: Optional[str] = None
    blocked_reason: Optional[str] = None
    next_followup: Optional[str] = None

class BookingReadinessUpdate(BaseModel):
    requirement_confirmed: Optional[bool] = None
    final_venue_selected: Optional[bool] = None
    commercial_terms_agreed: Optional[bool] = None
    customer_contact_confirmed: Optional[bool] = None
    payment_milestone_recorded: Optional[bool] = None
    booking_date_locked: Optional[bool] = None
    notes: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/intake")
async def intake_case(body: IntakeModel, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Create or enrich a conversion case from enquiry/callback/manual.
    - enquiry/callback = always create or link to existing lead
    - shortlist enrichment handled separately
    """
    # Check for existing active case for same customer
    if body.customer_email or body.customer_phone:
        existing_query = {"stage": {"$nin": ["booking_confirmed", "lost"]}}
        if body.customer_email:
            existing_query["customer_email"] = body.customer_email
        elif body.customer_phone:
            existing_query["customer_phone"] = body.customer_phone

        existing = await db.leads.find_one(existing_query, {"_id": 0, "lead_id": 1, "stage": 1})
        if existing and body.source_type != "manual":
            # Enrich existing case instead of creating duplicate
            enrich_updates = {"updated_at": now_iso()}
            if body.notes:
                await db.lead_notes.insert_one({
                    "note_id": generate_id("note_"),
                    "lead_id": existing["lead_id"],
                    "content": f"[{body.source_type.upper()} ENRICHMENT] {body.notes}",
                    "note_type": "system",
                    "created_by": user["user_id"],
                    "created_by_name": user.get("name", ""),
                    "created_at": now_iso(),
                })
            await db.leads.update_one({"lead_id": existing["lead_id"]}, {"$set": enrich_updates})
            await create_audit_log("lead", existing["lead_id"], "case_enriched", user, {
                "source_type": body.source_type, "source_id": body.source_id
            }, request)
            return {"action": "enriched", "lead_id": existing["lead_id"], "stage": existing["stage"]}

    # Create new case (operates on leads collection)
    lead_id = generate_id("lead_")
    now = now_iso()
    lead = {
        "lead_id": lead_id,
        "customer_name": body.customer_name,
        "customer_email": body.customer_email,
        "customer_phone": body.customer_phone,
        "city": body.city,
        "area": body.area,
        "event_type": body.event_type or "General Enquiry",
        "event_date": body.event_date,
        "guest_count": body.guest_count,
        "budget": body.budget_per_plate,
        "rm_id": user["user_id"],
        "rm_name": user.get("name", ""),
        "stage": "enquiry_received",
        "source": body.source_type,
        "source_id": body.source_id,
        "conversion_meta": {
            "travel_flexibility": body.travel_flexibility,
            "venue_type_pref": body.venue_type_pref,
            "blocker": None,
            "next_action": None,
            "next_followup": None,
            "urgency": "normal",
        },
        "booking_readiness": {
            "requirement_confirmed": False,
            "final_venue_selected": False,
            "commercial_terms_agreed": False,
            "customer_contact_confirmed": False,
            "payment_milestone_recorded": False,
            "booking_date_locked": False,
            "notes": None,
        },
        "shortlist_count": 0,
        "quote_count": 0,
        "communication_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead)
    lead.pop("_id", None)

    if body.notes:
        await db.lead_notes.insert_one({
            "note_id": generate_id("note_"),
            "lead_id": lead_id,
            "content": body.notes,
            "note_type": "intake",
            "created_by": user["user_id"],
            "created_by_name": user.get("name", ""),
            "created_at": now,
        })

    await create_audit_log("lead", lead_id, "case_created", user, {
        "source_type": body.source_type, "source_id": body.source_id
    }, request)

    return {"action": "created", "lead_id": lead_id, "stage": "enquiry_received"}


@router.get("/cases")
async def list_cases(
    request: Request,
    stage: Optional[str] = None,
    urgency: Optional[str] = None,
    user: dict = Depends(require_role("rm", "admin"))
):
    """List RM's conversion cases — action-first design."""
    query = {}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    if stage:
        query["stage"] = stage

    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)

    # Enrich with action-first data
    cases = []
    now_dt = datetime.now(timezone.utc)
    for lead in leads:
        lead_id = lead.get("lead_id")
        stage_val = lead.get("stage", "")
        norm_stage = normalize_stage(stage_val)
        meta = lead.get("conversion_meta") or {}

        # Calculate overdue
        updated = lead.get("updated_at") or lead.get("created_at") or ""
        try:
            updated_dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            days_stale = (now_dt - updated_dt).days
        except Exception:
            days_stale = 0

        is_overdue = days_stale > 3 and norm_stage not in ("booking_confirmed", "lost")
        is_blocked = bool(meta.get("blocker"))

        # Determine urgency
        case_urgency = meta.get("urgency", "normal")
        if is_overdue:
            case_urgency = "high"
        if is_blocked:
            case_urgency = "critical"

        if urgency and case_urgency != urgency:
            continue

        # Get latest follow-up
        next_fu = await db.follow_ups.find_one(
            {"lead_id": lead_id, "status": "pending"},
            {"_id": 0, "scheduled_at": 1, "description": 1},
        )

        cases.append({
            "lead_id": lead_id,
            "customer_name": lead.get("customer_name"),
            "customer_phone": lead.get("customer_phone"),
            "event_type": lead.get("event_type"),
            "event_date": lead.get("event_date"),
            "city": lead.get("city"),
            "area": lead.get("area"),
            "guest_count": lead.get("guest_count"),
            "stage": stage_val,
            "stage_label": STAGE_LABEL.get(stage_val, stage_val),
            "normalized_stage": norm_stage,
            "rm_name": lead.get("rm_name"),
            "urgency": case_urgency,
            "is_overdue": is_overdue,
            "is_blocked": is_blocked,
            "blocker": meta.get("blocker"),
            "next_action": meta.get("next_action"),
            "days_stale": days_stale,
            "shortlist_count": lead.get("shortlist_count", 0),
            "quote_count": lead.get("quote_count", 0),
            "next_followup": next_fu,
            "updated_at": lead.get("updated_at"),
            "source": lead.get("source"),
        })

    # Sort: critical first, then high, then by staleness
    priority_order = {"critical": 0, "high": 1, "normal": 2}
    cases.sort(key=lambda c: (priority_order.get(c["urgency"], 2), -c["days_stale"]))

    return {"cases": cases, "total": len(cases)}


@router.get("/cases/{lead_id}")
async def get_case_detail(lead_id: str, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Get full conversion case detail."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")

    # Enrich with related data
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    venue_ids = [s["venue_id"] for s in shortlist]
    venues = await db.venues.find({"venue_id": {"$in": venue_ids}}, {"_id": 0}).to_list(50) if venue_ids else []
    venue_map = {v["venue_id"]: v for v in venues}
    for s in shortlist:
        s["venue"] = venue_map.get(s["venue_id"])

    quotes = await db.quotes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    visits = await db.site_visits.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    negotiations = await db.negotiations.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    followups = await db.follow_ups.find({"lead_id": lead_id}, {"_id": 0}).sort("scheduled_at", 1).to_list(20)

    lead["shortlist"] = shortlist
    lead["quotes"] = quotes
    lead["site_visits"] = visits
    lead["negotiations"] = negotiations
    lead["follow_ups"] = followups
    lead["stage_label"] = STAGE_LABEL.get(lead.get("stage", ""), lead.get("stage"))

    return lead


@router.post("/cases/{lead_id}/stage")
async def update_case_stage(lead_id: str, body: StageUpdate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update case stage with validation."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")

    current = lead.get("stage", "")
    new_stage = body.stage

    if new_stage not in CONVERSION_STAGES:
        raise HTTPException(400, f"Invalid stage: {new_stage}")

    allowed = STAGE_TRANSITIONS.get(current, [])
    if new_stage not in allowed and user.get("role") != "admin":
        raise HTTPException(400, f"Cannot move from '{current}' to '{new_stage}'. Allowed: {allowed}")

    now = now_iso()
    update_set = {"stage": new_stage, "updated_at": now}

    # Update conversion meta
    meta = lead.get("conversion_meta") or {}
    if body.blocker is not None:
        meta["blocker"] = body.blocker
    if body.next_action is not None:
        meta["next_action"] = body.next_action
    if body.next_followup is not None:
        meta["next_followup"] = body.next_followup
    update_set["conversion_meta"] = meta

    if new_stage == "booking_confirmed":
        update_set["confirmed_at"] = now

    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_set})

    await create_audit_log("lead", lead_id, "stage_change", user, {
        "from": current, "to": new_stage, "reason": body.reason,
        "blocker": body.blocker, "next_action": body.next_action,
    }, request)

    return {"message": f"Stage updated: {current} → {new_stage}", "stage": new_stage}


# ── Shortlist governance ──────────────────────────────────────────────────────

@router.post("/cases/{lead_id}/shortlist/{shortlist_id}/status")
async def update_shortlist_status(lead_id: str, shortlist_id: str, body: ShortlistStatusUpdate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update venue-level shortlist status with audit."""
    if body.status not in SHORTLIST_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {SHORTLIST_STATUSES}")

    item = await db.venue_shortlist.find_one({"shortlist_id": shortlist_id, "lead_id": lead_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Shortlist item not found")

    old_status = item.get("status", "suggested")
    update = {"status": body.status, "updated_at": now_iso()}
    if body.customer_feedback is not None:
        update["customer_feedback"] = body.customer_feedback
    if body.rm_notes is not None:
        update["rm_notes"] = body.rm_notes

    await db.venue_shortlist.update_one(
        {"shortlist_id": shortlist_id, "lead_id": lead_id},
        {"$set": update}
    )

    await create_audit_log("lead", lead_id, "shortlist_status_change", user, {
        "venue_id": item.get("venue_id"), "from": old_status, "to": body.status,
        "feedback": body.customer_feedback,
    }, request)

    return {"message": f"Shortlist item updated: {old_status} → {body.status}"}


# ── Quote workflow ────────────────────────────────────────────────────────────

@router.post("/cases/{lead_id}/quotes")
async def manage_quote(lead_id: str, body: QuoteAction, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Create or update a quote for a specific venue within a case."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")

    if body.status not in QUOTE_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {QUOTE_STATUSES}")

    # Check if quote already exists for this venue
    existing = await db.quotes.find_one(
        {"lead_id": lead_id, "venue_id": body.venue_id, "status": {"$nin": ["expired", "rejected"]}},
        {"_id": 0}
    )

    now = now_iso()

    if existing:
        # Update existing quote
        old_status = existing.get("status")
        update = {"status": body.status, "updated_at": now}
        history_entry = {
            "action": f"{old_status}→{body.status}",
            "by": user.get("name", ""),
            "role": user.get("role"),
            "timestamp": now,
            "note": body.note,
        }
        if body.amount_per_plate is not None:
            update["amount_per_plate"] = body.amount_per_plate
            history_entry["amount_per_plate"] = body.amount_per_plate
        if body.total_amount is not None:
            update["amount"] = body.total_amount
            history_entry["total_amount"] = body.total_amount
        if body.inclusions is not None:
            update["inclusions"] = body.inclusions
        if body.exclusions is not None:
            update["exclusions"] = body.exclusions
        if body.special_terms is not None:
            update["special_terms"] = body.special_terms
        if body.valid_until is not None:
            update["valid_until"] = body.valid_until

        await db.quotes.update_one(
            {"quote_id": existing["quote_id"]},
            {"$set": update, "$push": {"revision_history": history_entry}}
        )

        await create_audit_log("lead", lead_id, "quote_updated", user, {
            "quote_id": existing["quote_id"], "venue_id": body.venue_id,
            "from": old_status, "to": body.status, "amount": body.total_amount,
        }, request)

        return {"action": "updated", "quote_id": existing["quote_id"], "status": body.status}
    else:
        # Create new quote
        quote_id = generate_id("quote_")
        quote = {
            "quote_id": quote_id,
            "lead_id": lead_id,
            "venue_id": body.venue_id,
            "venue_name": body.venue_name or "",
            "quote_type": "venue",
            "entity_id": body.venue_id,
            "status": body.status,
            "amount": body.total_amount,
            "amount_per_plate": body.amount_per_plate,
            "inclusions": body.inclusions,
            "exclusions": body.exclusions,
            "special_terms": body.special_terms,
            "valid_until": body.valid_until,
            "revision_history": [{
                "action": f"created:{body.status}",
                "by": user.get("name", ""),
                "role": user.get("role"),
                "timestamp": now,
                "note": body.note,
                "amount_per_plate": body.amount_per_plate,
                "total_amount": body.total_amount,
            }],
            "created_by": user["user_id"],
            "created_by_name": user.get("name", ""),
            "created_at": now,
            "updated_at": now,
        }
        await db.quotes.insert_one(quote)
        await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"quote_count": 1}})

        await create_audit_log("lead", lead_id, "quote_created", user, {
            "quote_id": quote_id, "venue_id": body.venue_id, "status": body.status,
        }, request)

        return {"action": "created", "quote_id": quote_id, "status": body.status}


# ── Site visit workflow ───────────────────────────────────────────────────────

@router.post("/cases/{lead_id}/visits")
async def create_visit(lead_id: str, body: VisitAction, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Create a site visit for a venue."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1})
    if not lead:
        raise HTTPException(404, "Case not found")

    if body.status not in VISIT_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {VISIT_STATUSES}")

    now = now_iso()
    visit_id = generate_id("visit_")
    visit = {
        "visit_id": visit_id,
        "lead_id": lead_id,
        "venue_id": body.venue_id,
        "venue_name": body.venue_name or "",
        "status": body.status,
        "proposed_date": body.proposed_date,
        "scheduled_date": body.scheduled_date,
        "completed_date": now if body.status == "completed" else None,
        "outcome": body.outcome,
        "customer_notes": body.customer_notes,
        "rm_notes": body.rm_notes,
        "history": [{
            "action": f"created:{body.status}",
            "by": user.get("name", ""),
            "role": user.get("role"),
            "timestamp": now,
        }],
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.site_visits.insert_one(visit)

    await create_audit_log("lead", lead_id, "visit_created", user, {
        "visit_id": visit_id, "venue_id": body.venue_id, "status": body.status,
    }, request)

    return {"visit_id": visit_id, "status": body.status}


@router.post("/cases/{lead_id}/visits/{visit_id}")
async def update_visit(lead_id: str, visit_id: str, body: VisitAction, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update a site visit."""
    visit = await db.site_visits.find_one({"visit_id": visit_id, "lead_id": lead_id}, {"_id": 0})
    if not visit:
        raise HTTPException(404, "Visit not found")

    if body.status not in VISIT_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {VISIT_STATUSES}")

    old_status = visit.get("status")
    now = now_iso()
    update = {"status": body.status, "updated_at": now}
    if body.proposed_date:
        update["proposed_date"] = body.proposed_date
    if body.scheduled_date:
        update["scheduled_date"] = body.scheduled_date
    if body.status == "completed":
        update["completed_date"] = now
    if body.outcome:
        update["outcome"] = body.outcome
    if body.customer_notes:
        update["customer_notes"] = body.customer_notes
    if body.rm_notes:
        update["rm_notes"] = body.rm_notes

    history_entry = {
        "action": f"{old_status}→{body.status}",
        "by": user.get("name", ""),
        "role": user.get("role"),
        "timestamp": now,
        "outcome": body.outcome,
    }

    await db.site_visits.update_one(
        {"visit_id": visit_id},
        {"$set": update, "$push": {"history": history_entry}}
    )

    await create_audit_log("lead", lead_id, "visit_updated", user, {
        "visit_id": visit_id, "from": old_status, "to": body.status,
    }, request)

    return {"message": f"Visit updated: {old_status} → {body.status}"}


# ── Negotiation workflow ──────────────────────────────────────────────────────

@router.post("/cases/{lead_id}/negotiation")
async def start_negotiation(lead_id: str, body: NegotiationAction, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Start negotiation for a venue."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1})
    if not lead:
        raise HTTPException(404, "Case not found")

    if body.status not in NEG_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {NEG_STATUSES}")

    now = now_iso()
    neg_id = generate_id("neg_")
    negotiation = {
        "neg_id": neg_id,
        "lead_id": lead_id,
        "venue_id": body.venue_id,
        "venue_name": body.venue_name or "",
        "status": body.status,
        "latest_ask": body.latest_ask,
        "latest_offer": body.latest_offer,
        "blocked_reason": body.blocked_reason,
        "next_followup": body.next_followup,
        "counter_history": [{
            "by": user.get("name", ""),
            "role": user.get("role"),
            "ask": body.latest_ask,
            "offer": body.latest_offer,
            "note": body.counter_note,
            "timestamp": now,
        }],
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.negotiations.insert_one(negotiation)

    await create_audit_log("lead", lead_id, "negotiation_started", user, {
        "neg_id": neg_id, "venue_id": body.venue_id,
    }, request)

    return {"neg_id": neg_id, "status": body.status}


@router.post("/cases/{lead_id}/negotiation/{neg_id}")
async def update_negotiation(lead_id: str, neg_id: str, body: NegotiationAction, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update negotiation."""
    neg = await db.negotiations.find_one({"neg_id": neg_id, "lead_id": lead_id}, {"_id": 0})
    if not neg:
        raise HTTPException(404, "Negotiation not found")

    if body.status not in NEG_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {NEG_STATUSES}")

    old_status = neg.get("status")
    now = now_iso()
    update = {"status": body.status, "updated_at": now}
    if body.latest_ask is not None:
        update["latest_ask"] = body.latest_ask
    if body.latest_offer is not None:
        update["latest_offer"] = body.latest_offer
    if body.blocked_reason is not None:
        update["blocked_reason"] = body.blocked_reason
    if body.next_followup is not None:
        update["next_followup"] = body.next_followup

    counter_entry = {
        "by": user.get("name", ""),
        "role": user.get("role"),
        "ask": body.latest_ask,
        "offer": body.latest_offer,
        "note": body.counter_note,
        "status": body.status,
        "timestamp": now,
    }

    await db.negotiations.update_one(
        {"neg_id": neg_id},
        {"$set": update, "$push": {"counter_history": counter_entry}}
    )

    await create_audit_log("lead", lead_id, "negotiation_updated", user, {
        "neg_id": neg_id, "from": old_status, "to": body.status,
        "ask": body.latest_ask, "offer": body.latest_offer,
    }, request)

    return {"message": f"Negotiation: {old_status} → {body.status}"}


# ── Booking readiness ─────────────────────────────────────────────────────────

@router.get("/cases/{lead_id}/booking-readiness")
async def get_booking_readiness(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get booking readiness gate for a case."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")

    readiness = lead.get("booking_readiness") or {
        "requirement_confirmed": False,
        "final_venue_selected": False,
        "commercial_terms_agreed": False,
        "customer_contact_confirmed": False,
        "payment_milestone_recorded": False,
        "booking_date_locked": False,
    }

    checks = [
        {"id": "requirement_confirmed", "label": "Requirement confirmed", "passed": readiness.get("requirement_confirmed", False)},
        {"id": "final_venue_selected", "label": "Final venue selected from shortlist", "passed": readiness.get("final_venue_selected", False)},
        {"id": "commercial_terms_agreed", "label": "Commercial terms agreed", "passed": readiness.get("commercial_terms_agreed", False)},
        {"id": "customer_contact_confirmed", "label": "Customer details/contact confirmed", "passed": readiness.get("customer_contact_confirmed", False)},
        {"id": "payment_milestone_recorded", "label": "Payment/deposit milestone recorded", "passed": readiness.get("payment_milestone_recorded", False)},
        {"id": "booking_date_locked", "label": "Booking date locked", "passed": readiness.get("booking_date_locked", False)},
    ]

    passed = sum(1 for c in checks if c["passed"])
    return {
        "checks": checks,
        "passed_count": passed,
        "total_count": len(checks),
        "all_ready": passed == len(checks),
        "notes": readiness.get("notes"),
    }


@router.post("/cases/{lead_id}/booking-readiness")
async def update_booking_readiness(lead_id: str, body: BookingReadinessUpdate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update booking readiness checks."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")

    readiness = lead.get("booking_readiness") or {}
    updates = body.dict(exclude_none=True)
    changes = {}
    for k, v in updates.items():
        if readiness.get(k) != v:
            changes[k] = {"from": readiness.get(k), "to": v}
        readiness[k] = v

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"booking_readiness": readiness, "updated_at": now_iso()}}
    )

    await create_audit_log("lead", lead_id, "booking_readiness_updated", user, changes, request)

    return {"message": "Booking readiness updated", "changes": changes}


@router.post("/cases/{lead_id}/confirm-booking")
async def confirm_booking(lead_id: str, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Confirm booking — requires all readiness checks to pass."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")

    stage = lead.get("stage", "")
    if stage not in ("booking_confirmation_pending", "commercial_accepted") and user.get("role") != "admin":
        raise HTTPException(400, f"Cannot confirm from stage '{stage}'")

    readiness = lead.get("booking_readiness") or {}
    checks = ["requirement_confirmed", "final_venue_selected", "commercial_terms_agreed",
              "customer_contact_confirmed", "payment_milestone_recorded", "booking_date_locked"]
    failing = [c for c in checks if not readiness.get(c)]

    if failing:
        raise HTTPException(400, f"Booking readiness not met: {', '.join(failing)}")

    now = now_iso()
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"stage": "booking_confirmed", "confirmed_at": now, "updated_at": now}}
    )

    await create_audit_log("lead", lead_id, "booking_confirmed", user, {
        "readiness_checks_passed": len(checks),
    }, request)

    return {"message": "Booking confirmed", "stage": "booking_confirmed"}
