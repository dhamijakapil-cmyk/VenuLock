"""
VenuLoQ — Booking Commitment + Execution Handoff (Phase 11)
Operates on: leads (booking_snapshot, execution, pre_event_readiness fields)
New collections: pre_event_checklist, change_requests
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from config import db
from utils import generate_id, get_current_user, require_role, create_audit_log

router = APIRouter(prefix="/execution", tags=["execution"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Statuses ──────────────────────────────────────────────────────────────────

HANDOFF_STATUSES = ["pending", "assigned", "acknowledged", "in_preparation", "ready"]
CR_TYPES = ["customer_requirement", "venue_change", "commercial_change", "schedule_change", "special_requirement"]
CR_STATUSES = ["open", "under_review", "approved", "rejected", "implemented"]
CHECKLIST_STATUSES = ["pending", "in_progress", "done", "blocked", "na"]
CHECKLIST_CATEGORIES = [
    "venue_coordination", "customer_communication", "logistics",
    "vendor_management", "documentation", "payment", "other",
]
READINESS_POSTURES = ["not_started", "in_progress", "blocked", "ready"]


# ── Models ────────────────────────────────────────────────────────────────────

class HandoffCreate(BaseModel):
    venue_id: Optional[str] = None
    venue_name: Optional[str] = None
    event_time: Optional[str] = None
    customer_requirements: Optional[str] = None
    rm_handoff_notes: Optional[str] = None
    special_promises: Optional[str] = None

class ExecutionAssign(BaseModel):
    owner_id: str
    owner_name: str
    supporting_team: Optional[List[dict]] = None
    handoff_notes: Optional[str] = None

class AcknowledgeHandoff(BaseModel):
    notes: Optional[str] = None

class ChecklistItemCreate(BaseModel):
    item: str
    category: Optional[str] = "other"
    assigned_to_name: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ChecklistItemUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_name: Optional[str] = None
    due_date: Optional[str] = None

class ChangeRequestCreate(BaseModel):
    cr_type: str
    description: str
    impact: Optional[str] = None
    requested_by_name: Optional[str] = None

class ChangeRequestResolve(BaseModel):
    status: str
    resolution: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_confirmed_lead(lead_id: str, user: dict):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")
    return lead


def _compute_readiness(checklist_items: list) -> dict:
    if not checklist_items:
        return {"posture": "not_started", "total": 0, "done": 0, "blocked": 0, "pending": 0}
    total = len([c for c in checklist_items if c.get("status") != "na"])
    done = len([c for c in checklist_items if c.get("status") == "done"])
    blocked = len([c for c in checklist_items if c.get("status") == "blocked"])
    pending = total - done - blocked
    if blocked > 0:
        posture = "blocked"
    elif done == total and total > 0:
        posture = "ready"
    elif done > 0:
        posture = "in_progress"
    else:
        posture = "not_started"
    return {"posture": posture, "total": total, "done": done, "blocked": blocked, "pending": pending}


DEFAULT_CHECKLIST_TEMPLATES = [
    {"item": "Confirm venue date and time with venue owner", "category": "venue_coordination"},
    {"item": "Verify final guest count with customer", "category": "customer_communication"},
    {"item": "Confirm menu/catering arrangements", "category": "venue_coordination"},
    {"item": "Verify payment milestones and pending amounts", "category": "payment"},
    {"item": "Confirm decoration/setup requirements", "category": "logistics"},
    {"item": "Share event day contact details with all parties", "category": "customer_communication"},
    {"item": "Verify parking and transportation arrangements", "category": "logistics"},
    {"item": "Final walkthrough with venue coordinator", "category": "venue_coordination"},
]


# ── Handoff Package ───────────────────────────────────────────────────────────

@router.post("/{lead_id}/handoff")
async def create_handoff(lead_id: str, body: HandoffCreate, request: Request,
                         user: dict = Depends(require_role("rm", "admin"))):
    """Create handoff package and lock a commercial snapshot at booking confirmation."""
    lead = await _get_confirmed_lead(lead_id, user)

    if lead.get("stage") != "booking_confirmed" and user.get("role") != "admin":
        raise HTTPException(400, "Handoff can only be created for confirmed bookings")

    if lead.get("booking_snapshot", {}).get("snapshot_locked_at"):
        raise HTTPException(400, "Handoff already created. Use change requests for modifications.")

    # Resolve venue: from body, or find accepted shortlist/quote
    venue_id = body.venue_id
    venue_name = body.venue_name
    final_amount = None
    amount_per_plate = None
    inclusions = None
    exclusions = None
    special_terms = None

    if not venue_id:
        # Try to find accepted venue from shortlist
        accepted = await db.venue_shortlist.find_one(
            {"lead_id": lead_id, "status": "accepted"}, {"_id": 0}
        )
        if accepted:
            venue_id = accepted.get("venue_id")
            venue_name = accepted.get("venue_name")

    # Find accepted/latest quote for this venue
    if venue_id:
        quote = await db.quotes.find_one(
            {"lead_id": lead_id, "venue_id": venue_id, "status": {"$in": ["accepted", "received"]}},
            {"_id": 0},
            sort=[("updated_at", -1)],
        )
        if quote:
            final_amount = quote.get("amount")
            amount_per_plate = quote.get("amount_per_plate")
            inclusions = quote.get("inclusions")
            exclusions = quote.get("exclusions")
            special_terms = quote.get("special_terms")

    # Find agreed negotiation
    if venue_id:
        neg = await db.negotiations.find_one(
            {"lead_id": lead_id, "venue_id": venue_id, "status": "agreed"},
            {"_id": 0},
            sort=[("updated_at", -1)],
        )
        if neg:
            final_amount = neg.get("latest_offer") or neg.get("latest_ask") or final_amount

    # Resolve venue details
    venue_city = None
    if venue_id:
        venue_doc = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0, "name": 1, "city": 1})
        if venue_doc:
            venue_name = venue_name or venue_doc.get("name")
            venue_city = venue_doc.get("city")

    now = now_iso()
    snapshot = {
        "venue_id": venue_id,
        "venue_name": venue_name,
        "venue_city": venue_city or lead.get("city"),
        "event_date": lead.get("event_date"),
        "event_time": body.event_time,
        "guest_count": lead.get("guest_count"),
        "event_type": lead.get("event_type"),
        "final_amount": final_amount,
        "amount_per_plate": amount_per_plate,
        "inclusions": inclusions,
        "exclusions": exclusions,
        "special_terms": special_terms,
        "customer_requirements": body.customer_requirements,
        "special_promises": body.special_promises,
        "rm_handoff_notes": body.rm_handoff_notes,
        "snapshot_locked_at": now,
        "snapshot_locked_by": user["user_id"],
        "snapshot_locked_by_name": user.get("name", ""),
    }

    execution = {
        "owner_id": None,
        "owner_name": None,
        "supporting_team": [],
        "handoff_status": "pending",
        "assigned_at": None,
        "acknowledged_at": None,
        "handoff_notes": None,
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {
            "booking_snapshot": snapshot,
            "execution": execution,
            "pre_event_readiness": {"posture": "not_started", "total": 0, "done": 0, "blocked": 0, "pending": 0},
            "updated_at": now,
        }}
    )

    # Create default checklist items
    for tmpl in DEFAULT_CHECKLIST_TEMPLATES:
        await db.pre_event_checklist.insert_one({
            "checklist_id": generate_id("chk_"),
            "lead_id": lead_id,
            "item": tmpl["item"],
            "category": tmpl["category"],
            "status": "pending",
            "assigned_to_name": None,
            "due_date": None,
            "notes": None,
            "created_by": user["user_id"],
            "created_at": now,
            "updated_at": now,
        })

    await create_audit_log("lead", lead_id, "handoff_created", user, {
        "venue_id": venue_id, "final_amount": final_amount,
    }, request)

    return {"message": "Handoff package created", "snapshot": snapshot, "execution": execution}


@router.get("/{lead_id}/handoff")
async def get_handoff(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get handoff package for a confirmed booking."""
    lead = await _get_confirmed_lead(lead_id, user)
    snapshot = lead.get("booking_snapshot") or {}
    execution = lead.get("execution") or {}
    readiness = lead.get("pre_event_readiness") or {}

    checklist = await db.pre_event_checklist.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    change_reqs = await db.change_requests.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return {
        "lead_id": lead_id,
        "customer_name": lead.get("customer_name"),
        "customer_phone": lead.get("customer_phone"),
        "customer_email": lead.get("customer_email"),
        "event_type": lead.get("event_type"),
        "event_date": lead.get("event_date"),
        "city": lead.get("city"),
        "stage": lead.get("stage"),
        "rm_name": lead.get("rm_name"),
        "confirmed_at": lead.get("confirmed_at"),
        "booking_snapshot": snapshot,
        "execution": execution,
        "pre_event_readiness": readiness,
        "checklist": checklist,
        "change_requests": change_reqs,
    }


# ── Execution Assignment ──────────────────────────────────────────────────────

@router.post("/{lead_id}/assign")
async def assign_execution_owner(lead_id: str, body: ExecutionAssign, request: Request,
                                  user: dict = Depends(require_role("rm", "admin"))):
    """Assign execution owner and optional supporting team."""
    lead = await _get_confirmed_lead(lead_id, user)

    if not lead.get("booking_snapshot", {}).get("snapshot_locked_at"):
        raise HTTPException(400, "Create handoff package first")

    now = now_iso()
    execution = lead.get("execution") or {}
    old_owner = execution.get("owner_id")

    execution.update({
        "owner_id": body.owner_id,
        "owner_name": body.owner_name,
        "supporting_team": [{"name": m.get("name"), "role": m.get("role")} for m in (body.supporting_team or [])],
        "handoff_status": "assigned",
        "assigned_at": now,
        "acknowledged_at": None,
        "handoff_notes": body.handoff_notes or execution.get("handoff_notes"),
    })

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"execution": execution, "updated_at": now}}
    )

    await create_audit_log("lead", lead_id, "execution_assigned", user, {
        "owner_id": body.owner_id, "owner_name": body.owner_name,
        "old_owner": old_owner, "team_size": len(body.supporting_team or []),
    }, request)

    return {"message": f"Execution owner assigned: {body.owner_name}", "handoff_status": "assigned"}


@router.post("/{lead_id}/acknowledge")
async def acknowledge_handoff(lead_id: str, body: AcknowledgeHandoff, request: Request,
                               user: dict = Depends(require_role("rm", "admin"))):
    """Execution owner acknowledges the handoff."""
    lead = await _get_confirmed_lead(lead_id, user)
    execution = lead.get("execution") or {}

    if execution.get("handoff_status") not in ("assigned", "acknowledged"):
        raise HTTPException(400, f"Cannot acknowledge from status '{execution.get('handoff_status')}'")

    now = now_iso()
    execution["handoff_status"] = "acknowledged"
    execution["acknowledged_at"] = now
    if body.notes:
        execution["handoff_notes"] = (execution.get("handoff_notes") or "") + f"\n[ACK] {body.notes}"

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"execution": execution, "updated_at": now}}
    )

    await create_audit_log("lead", lead_id, "handoff_acknowledged", user, {
        "acknowledged_by": user.get("name"),
    }, request)

    return {"message": "Handoff acknowledged", "handoff_status": "acknowledged"}


@router.post("/{lead_id}/handoff-status")
async def update_handoff_status(lead_id: str, request: Request,
                                 user: dict = Depends(require_role("rm", "admin"))):
    """Update handoff status (in_preparation, ready)."""
    body = await request.json()
    new_status = body.get("status")
    if new_status not in HANDOFF_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {HANDOFF_STATUSES}")

    lead = await _get_confirmed_lead(lead_id, user)
    execution = lead.get("execution") or {}
    old_status = execution.get("handoff_status")

    now = now_iso()
    execution["handoff_status"] = new_status
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"execution": execution, "updated_at": now}}
    )

    await create_audit_log("lead", lead_id, "handoff_status_change", user, {
        "from": old_status, "to": new_status,
    }, request)

    return {"message": f"Handoff status: {old_status} → {new_status}"}


# ── Pre-Event Checklist ───────────────────────────────────────────────────────

@router.get("/{lead_id}/checklist")
async def get_checklist(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get pre-event checklist with readiness posture."""
    await _get_confirmed_lead(lead_id, user)
    items = await db.pre_event_checklist.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    readiness = _compute_readiness(items)

    # Sync readiness back to lead
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"pre_event_readiness": readiness}}
    )

    return {"items": items, "readiness": readiness}


@router.post("/{lead_id}/checklist")
async def add_checklist_item(lead_id: str, body: ChecklistItemCreate, request: Request,
                              user: dict = Depends(require_role("rm", "admin"))):
    """Add a checklist item."""
    await _get_confirmed_lead(lead_id, user)
    if body.category and body.category not in CHECKLIST_CATEGORIES:
        raise HTTPException(400, f"Invalid category. Use: {CHECKLIST_CATEGORIES}")

    now = now_iso()
    item = {
        "checklist_id": generate_id("chk_"),
        "lead_id": lead_id,
        "item": body.item,
        "category": body.category or "other",
        "status": "pending",
        "assigned_to_name": body.assigned_to_name,
        "due_date": body.due_date,
        "notes": body.notes,
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.pre_event_checklist.insert_one(item)
    item.pop("_id", None)

    await create_audit_log("lead", lead_id, "checklist_item_added", user, {
        "item": body.item, "category": body.category,
    }, request)

    return item


@router.put("/{lead_id}/checklist/{checklist_id}")
async def update_checklist_item(lead_id: str, checklist_id: str, body: ChecklistItemUpdate,
                                 request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update a checklist item."""
    existing = await db.pre_event_checklist.find_one(
        {"checklist_id": checklist_id, "lead_id": lead_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(404, "Checklist item not found")

    updates = {}
    if body.status is not None:
        if body.status not in CHECKLIST_STATUSES:
            raise HTTPException(400, f"Invalid status. Use: {CHECKLIST_STATUSES}")
        updates["status"] = body.status
    if body.notes is not None:
        updates["notes"] = body.notes
    if body.assigned_to_name is not None:
        updates["assigned_to_name"] = body.assigned_to_name
    if body.due_date is not None:
        updates["due_date"] = body.due_date
    updates["updated_at"] = now_iso()

    await db.pre_event_checklist.update_one(
        {"checklist_id": checklist_id}, {"$set": updates}
    )

    # Recompute readiness
    items = await db.pre_event_checklist.find({"lead_id": lead_id}, {"_id": 0}).to_list(100)
    readiness = _compute_readiness(items)
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"pre_event_readiness": readiness}})

    await create_audit_log("lead", lead_id, "checklist_item_updated", user, {
        "checklist_id": checklist_id, "changes": updates,
    }, request)

    return {"message": "Checklist item updated", "readiness": readiness}


# ── Change Requests ───────────────────────────────────────────────────────────

@router.get("/{lead_id}/change-requests")
async def list_change_requests(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """List change requests for a confirmed booking."""
    await _get_confirmed_lead(lead_id, user)
    crs = await db.change_requests.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"change_requests": crs, "total": len(crs)}


@router.post("/{lead_id}/change-requests")
async def create_change_request(lead_id: str, body: ChangeRequestCreate, request: Request,
                                 user: dict = Depends(require_role("rm", "admin"))):
    """Log a structured change request."""
    await _get_confirmed_lead(lead_id, user)
    if body.cr_type not in CR_TYPES:
        raise HTTPException(400, f"Invalid type. Use: {CR_TYPES}")

    now = now_iso()
    cr = {
        "cr_id": generate_id("cr_"),
        "lead_id": lead_id,
        "cr_type": body.cr_type,
        "description": body.description,
        "impact": body.impact,
        "requested_by_name": body.requested_by_name,
        "status": "open",
        "resolution": None,
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
        "resolved_by": None,
        "resolved_at": None,
    }
    await db.change_requests.insert_one(cr)
    cr.pop("_id", None)

    await create_audit_log("lead", lead_id, "change_request_created", user, {
        "cr_id": cr["cr_id"], "type": body.cr_type,
    }, request)

    return cr


@router.put("/{lead_id}/change-requests/{cr_id}")
async def resolve_change_request(lead_id: str, cr_id: str, body: ChangeRequestResolve,
                                  request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Resolve a change request."""
    existing = await db.change_requests.find_one(
        {"cr_id": cr_id, "lead_id": lead_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(404, "Change request not found")
    if body.status not in CR_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {CR_STATUSES}")

    now = now_iso()
    old_status = existing.get("status")
    await db.change_requests.update_one(
        {"cr_id": cr_id},
        {"$set": {
            "status": body.status,
            "resolution": body.resolution,
            "resolved_by": user["user_id"],
            "resolved_by_name": user.get("name", ""),
            "resolved_at": now,
        }}
    )

    await create_audit_log("lead", lead_id, "change_request_resolved", user, {
        "cr_id": cr_id, "from": old_status, "to": body.status,
        "resolution": body.resolution,
    }, request)

    return {"message": f"Change request: {old_status} → {body.status}"}


# ── Internal Visibility Dashboard ─────────────────────────────────────────────

@router.get("/dashboard")
async def execution_dashboard(
    status: Optional[str] = None,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Internal dashboard: confirmed bookings with handoff/execution status."""
    query = {"stage": "booking_confirmed"}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    leads = await db.leads.find(query, {"_id": 0}).sort("confirmed_at", -1).to_list(200)

    now_dt = datetime.now(timezone.utc)
    items = []
    for lead in leads:
        execution = lead.get("execution") or {}
        snapshot = lead.get("booking_snapshot") or {}
        readiness = lead.get("pre_event_readiness") or {}
        handoff_status = execution.get("handoff_status", "no_handoff")

        if not snapshot.get("snapshot_locked_at"):
            handoff_status = "no_handoff"

        if status and handoff_status != status:
            continue

        # Days until event
        event_date = lead.get("event_date")
        days_until = None
        if event_date:
            try:
                evt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                if evt.tzinfo is None:
                    evt = evt.replace(tzinfo=timezone.utc)
                days_until = (evt - now_dt).days
            except Exception:
                pass

        open_crs = await db.change_requests.count_documents(
            {"lead_id": lead["lead_id"], "status": {"$in": ["open", "under_review"]}}
        )

        items.append({
            "lead_id": lead["lead_id"],
            "customer_name": lead.get("customer_name"),
            "event_type": lead.get("event_type"),
            "event_date": event_date,
            "city": lead.get("city"),
            "guest_count": lead.get("guest_count"),
            "venue_name": snapshot.get("venue_name"),
            "final_amount": snapshot.get("final_amount"),
            "rm_name": lead.get("rm_name"),
            "confirmed_at": lead.get("confirmed_at"),
            "handoff_status": handoff_status,
            "execution_owner": execution.get("owner_name"),
            "readiness_posture": readiness.get("posture", "not_started"),
            "readiness_done": readiness.get("done", 0),
            "readiness_total": readiness.get("total", 0),
            "days_until_event": days_until,
            "approaching_soon": days_until is not None and 0 < days_until <= 7,
            "open_change_requests": open_crs,
        })

    # Sort: approaching soon first, then by event date
    items.sort(key=lambda x: (
        0 if x.get("approaching_soon") else 1,
        0 if x.get("readiness_posture") == "blocked" else 1,
        0 if x.get("handoff_status") == "no_handoff" else (1 if x.get("handoff_status") == "pending" else 2),
        x.get("days_until_event") or 9999,
    ))

    # Summary counts
    total = len(items)
    no_handoff = len([i for i in items if i["handoff_status"] == "no_handoff"])
    pending = len([i for i in items if i["handoff_status"] == "pending"])
    assigned = len([i for i in items if i["handoff_status"] == "assigned"])
    in_prep = len([i for i in items if i["handoff_status"] in ("acknowledged", "in_preparation")])
    ready_count = len([i for i in items if i["handoff_status"] == "ready"])
    blocked_count = len([i for i in items if i["readiness_posture"] == "blocked"])
    approaching = len([i for i in items if i.get("approaching_soon")])

    return {
        "items": items,
        "summary": {
            "total": total,
            "no_handoff": no_handoff,
            "pending_handoff": pending,
            "assigned": assigned,
            "in_preparation": in_prep,
            "ready": ready_count,
            "blocked": blocked_count,
            "approaching_soon": approaching,
        },
    }
