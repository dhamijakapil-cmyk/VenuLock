"""
VenuLoQ — Booking Commitment + Execution Handoff + Event Coordination (Phase 11 + 12)
Operates on: leads (booking_snapshot, execution, pre_event_readiness, event_day, closure fields)
Collections: pre_event_checklist, change_requests, event_timeline, event_incidents, commitment_addenda
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

EXECUTION_STATUSES = [
    "handoff_pending", "assigned", "in_preparation", "ready_for_event",
    "event_live", "issue_active", "event_completed",
    "closure_note_pending", "closure_ready",
]

CR_TYPES = ["customer_requirement", "venue_change", "commercial_change", "schedule_change", "special_requirement"]
CR_STATUSES = ["open", "under_review", "approved", "rejected", "implemented"]
CHECKLIST_STATUSES = ["pending", "in_progress", "done", "blocked", "na"]
CHECKLIST_CATEGORIES = [
    "venue_coordination", "customer_communication", "logistics",
    "vendor_management", "documentation", "payment", "other",
]
READINESS_POSTURES = ["not_started", "in_progress", "blocked", "ready"]

INCIDENT_TYPES = ["vendor_issue", "venue_issue", "customer_issue", "logistics_issue", "quality_issue", "safety_issue", "other"]
INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"]
INCIDENT_STATUSES = ["open", "investigating", "resolved", "escalated"]

TIMELINE_TYPES = ["note", "setup", "milestone", "issue_raised", "issue_resolved", "customer_update", "vendor_update"]

SETUP_STATUSES = ["not_started", "in_progress", "complete"]


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


class ExecutionStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class EventDaySetup(BaseModel):
    setup_status: Optional[str] = None
    venue_readiness_confirmed: Optional[bool] = None
    customer_readiness_confirmed: Optional[bool] = None
    note: Optional[str] = None

class TimelineEntry(BaseModel):
    entry_type: str = "note"
    content: str

class IncidentCreate(BaseModel):
    incident_type: str
    severity: str
    description: str
    owner_name: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    action_taken: Optional[str] = None
    resolution: Optional[str] = None
    closure_impact: Optional[str] = None

class AddendumCreate(BaseModel):
    linked_cr_id: Optional[str] = None
    change_type: str
    field_changed: str
    original_value: Optional[str] = None
    new_value: str
    reason: str

class EventComplete(BaseModel):
    major_issue: bool = False
    completion_note: Optional[str] = None
    post_event_actions: Optional[str] = None

class ClosureUpdate(BaseModel):
    event_completed: Optional[bool] = None
    critical_issues_resolved: Optional[bool] = None
    closure_note: Optional[str] = None
    post_event_tasks_done: Optional[bool] = None
    change_history_intact: Optional[bool] = None


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
        "execution_status": execution.get("execution_status", _derive_exec_status(execution.get("handoff_status", "pending"))),
        "pre_event_readiness": readiness,
        "event_day": lead.get("event_day") or _default_event_day(),
        "closure": lead.get("closure") or _default_closure(),
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
            "execution_status": execution.get("execution_status", _derive_exec_status(handoff_status)),
            "execution_owner": execution.get("owner_name"),
            "readiness_posture": readiness.get("posture", "not_started"),
            "readiness_done": readiness.get("done", 0),
            "readiness_total": readiness.get("total", 0),
            "days_until_event": days_until,
            "approaching_soon": days_until is not None and 0 < days_until <= 7,
            "is_today": days_until is not None and days_until == 0,
            "open_change_requests": open_crs,
            "open_incidents": await db.event_incidents.count_documents(
                {"lead_id": lead["lead_id"], "status": {"$in": ["open", "investigating"]}}
            ),
        })

    # Sort: today first, then approaching, then blocked, then by status
    items.sort(key=lambda x: (
        0 if x.get("is_today") else 1,
        0 if x.get("execution_status") == "event_live" else 1,
        0 if x.get("execution_status") == "issue_active" else 1,
        0 if x.get("approaching_soon") else 2,
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
    today_count = len([i for i in items if i.get("is_today")])
    event_live = len([i for i in items if i.get("execution_status") == "event_live"])
    issue_active = len([i for i in items if i.get("execution_status") == "issue_active"])
    completed = len([i for i in items if i.get("execution_status") in ("event_completed", "closure_note_pending", "closure_ready")])

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
            "today": today_count,
            "event_live": event_live,
            "issue_active": issue_active,
            "completed": completed,
        },
    }



# ── Phase 12: Helpers ─────────────────────────────────────────────────────────

def _derive_exec_status(handoff_status: str) -> str:
    """Derive execution_status from legacy handoff_status."""
    mapping = {
        "no_handoff": "handoff_pending",
        "pending": "handoff_pending",
        "assigned": "assigned",
        "acknowledged": "in_preparation",
        "in_preparation": "in_preparation",
        "ready": "ready_for_event",
    }
    return mapping.get(handoff_status, "handoff_pending")


def _default_event_day():
    return {
        "setup_status": "not_started",
        "venue_readiness_confirmed": False,
        "customer_readiness_confirmed": False,
        "started_at": None,
        "completed_at": None,
        "completion_note": None,
        "major_issue": False,
        "post_event_actions": None,
    }


def _default_closure():
    return {
        "event_completed": False,
        "critical_issues_resolved": False,
        "closure_note": None,
        "post_event_tasks_done": False,
        "change_history_intact": False,
    }


CLOSURE_CHECKS = [
    {"id": "event_completed", "label": "Event completed"},
    {"id": "critical_issues_resolved", "label": "Critical issues resolved or logged"},
    {"id": "closure_note", "label": "Closure note present"},
    {"id": "post_event_tasks_done", "label": "Post-event tasks complete"},
    {"id": "change_history_intact", "label": "Change history intact"},
]


# ── Phase 12: Execution Status ───────────────────────────────────────────────

@router.post("/{lead_id}/execution-status")
async def update_execution_status(lead_id: str, body: ExecutionStatusUpdate, request: Request,
                                   user: dict = Depends(require_role("rm", "admin"))):
    """Update the full execution lifecycle status."""
    if body.status not in EXECUTION_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {EXECUTION_STATUSES}")

    lead = await _get_confirmed_lead(lead_id, user)
    execution = lead.get("execution") or {}
    old_status = execution.get("execution_status", _derive_exec_status(execution.get("handoff_status", "pending")))

    now = now_iso()
    execution["execution_status"] = body.status

    # Sync handoff_status for backward compat
    hs_map = {"handoff_pending": "pending", "assigned": "assigned", "in_preparation": "in_preparation", "ready_for_event": "ready"}
    if body.status in hs_map:
        execution["handoff_status"] = hs_map[body.status]

    # Initialize event_day if entering live state
    if body.status == "event_live" and not lead.get("event_day"):
        await db.leads.update_one({"lead_id": lead_id}, {"$set": {"event_day": _default_event_day()}})

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"execution": execution, "updated_at": now}})

    # Add timeline entry
    await db.event_timeline.insert_one({
        "entry_id": generate_id("tl_"),
        "lead_id": lead_id,
        "entry_type": "milestone",
        "content": f"Status changed: {old_status} → {body.status}" + (f" — {body.note}" if body.note else ""),
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
    })

    await create_audit_log("lead", lead_id, "execution_status_change", user, {
        "from": old_status, "to": body.status, "note": body.note,
    }, request)

    return {"message": f"Execution status: {old_status} → {body.status}"}


# ── Phase 12: Event-Day Coordination ─────────────────────────────────────────

@router.get("/{lead_id}/event-day")
async def get_event_day(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get event-day data: setup, readiness, timeline, incidents."""
    lead = await _get_confirmed_lead(lead_id, user)
    event_day = lead.get("event_day") or _default_event_day()
    execution = lead.get("execution") or {}

    timeline = await db.event_timeline.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    incidents = await db.event_incidents.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    open_incidents = len([i for i in incidents if i.get("status") in ("open", "investigating")])

    return {
        "lead_id": lead_id,
        "execution_status": execution.get("execution_status", _derive_exec_status(execution.get("handoff_status", "pending"))),
        "event_day": event_day,
        "timeline": timeline,
        "incidents": incidents,
        "open_incidents": open_incidents,
    }


@router.post("/{lead_id}/event-day/setup")
async def update_event_day_setup(lead_id: str, body: EventDaySetup, request: Request,
                                  user: dict = Depends(require_role("rm", "admin"))):
    """Update setup status and readiness confirmations."""
    lead = await _get_confirmed_lead(lead_id, user)
    event_day = lead.get("event_day") or _default_event_day()
    changes = {}

    if body.setup_status is not None:
        if body.setup_status not in SETUP_STATUSES:
            raise HTTPException(400, f"Invalid setup_status. Use: {SETUP_STATUSES}")
        changes["event_day.setup_status"] = body.setup_status
        event_day["setup_status"] = body.setup_status

    if body.venue_readiness_confirmed is not None:
        changes["event_day.venue_readiness_confirmed"] = body.venue_readiness_confirmed
    if body.customer_readiness_confirmed is not None:
        changes["event_day.customer_readiness_confirmed"] = body.customer_readiness_confirmed

    if not changes:
        raise HTTPException(400, "No fields to update")

    now = now_iso()
    changes["updated_at"] = now

    # Initialize event_day if not set
    if not lead.get("event_day"):
        changes = {"event_day": _default_event_day(), "updated_at": now}
        if body.setup_status:
            changes["event_day"]["setup_status"] = body.setup_status
        if body.venue_readiness_confirmed is not None:
            changes["event_day"]["venue_readiness_confirmed"] = body.venue_readiness_confirmed
        if body.customer_readiness_confirmed is not None:
            changes["event_day"]["customer_readiness_confirmed"] = body.customer_readiness_confirmed
        await db.leads.update_one({"lead_id": lead_id}, {"$set": changes})
    else:
        await db.leads.update_one({"lead_id": lead_id}, {"$set": changes})

    # Add timeline entry
    parts = []
    if body.setup_status:
        parts.append(f"Setup: {body.setup_status}")
    if body.venue_readiness_confirmed is not None:
        parts.append(f"Venue ready: {'Yes' if body.venue_readiness_confirmed else 'No'}")
    if body.customer_readiness_confirmed is not None:
        parts.append(f"Customer ready: {'Yes' if body.customer_readiness_confirmed else 'No'}")
    if body.note:
        parts.append(body.note)

    await db.event_timeline.insert_one({
        "entry_id": generate_id("tl_"),
        "lead_id": lead_id,
        "entry_type": "setup",
        "content": " | ".join(parts),
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
    })

    await create_audit_log("lead", lead_id, "event_day_setup_updated", user, {
        "setup_status": body.setup_status, "venue_ready": body.venue_readiness_confirmed,
        "customer_ready": body.customer_readiness_confirmed,
    }, request)

    return {"message": "Event-day setup updated"}


@router.post("/{lead_id}/event-day/timeline")
async def add_timeline_entry(lead_id: str, body: TimelineEntry, request: Request,
                              user: dict = Depends(require_role("rm", "admin"))):
    """Add a real-time timeline entry."""
    await _get_confirmed_lead(lead_id, user)
    if body.entry_type not in TIMELINE_TYPES:
        raise HTTPException(400, f"Invalid entry_type. Use: {TIMELINE_TYPES}")

    now = now_iso()
    entry = {
        "entry_id": generate_id("tl_"),
        "lead_id": lead_id,
        "entry_type": body.entry_type,
        "content": body.content,
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
    }
    await db.event_timeline.insert_one(entry)
    entry.pop("_id", None)
    return entry


# ── Phase 12: Incident / Issue Logging ────────────────────────────────────────

@router.get("/{lead_id}/incidents")
async def list_incidents(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """List incidents for an event."""
    await _get_confirmed_lead(lead_id, user)
    incidents = await db.event_incidents.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    open_count = len([i for i in incidents if i["status"] in ("open", "investigating")])
    return {"incidents": incidents, "total": len(incidents), "open": open_count}


@router.post("/{lead_id}/incidents")
async def create_incident(lead_id: str, body: IncidentCreate, request: Request,
                           user: dict = Depends(require_role("rm", "admin"))):
    """Log a structured incident/issue."""
    await _get_confirmed_lead(lead_id, user)
    if body.incident_type not in INCIDENT_TYPES:
        raise HTTPException(400, f"Invalid type. Use: {INCIDENT_TYPES}")
    if body.severity not in INCIDENT_SEVERITIES:
        raise HTTPException(400, f"Invalid severity. Use: {INCIDENT_SEVERITIES}")

    now = now_iso()
    incident = {
        "incident_id": generate_id("inc_"),
        "lead_id": lead_id,
        "incident_type": body.incident_type,
        "severity": body.severity,
        "description": body.description,
        "owner_name": body.owner_name,
        "status": "open",
        "action_taken": None,
        "resolution": None,
        "closure_impact": None,
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
        "resolved_at": None,
    }
    await db.event_incidents.insert_one(incident)
    incident.pop("_id", None)

    # Timeline entry
    await db.event_timeline.insert_one({
        "entry_id": generate_id("tl_"),
        "lead_id": lead_id,
        "entry_type": "issue_raised",
        "content": f"[{body.severity.upper()}] {body.incident_type}: {body.description}",
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
    })

    # If severity is high/critical, auto-set execution_status to issue_active
    if body.severity in ("high", "critical"):
        lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        execution = lead.get("execution") or {}
        exec_status = execution.get("execution_status", "")
        if exec_status in ("event_live", "ready_for_event"):
            execution["execution_status"] = "issue_active"
            await db.leads.update_one({"lead_id": lead_id}, {"$set": {"execution": execution, "updated_at": now}})

    await create_audit_log("lead", lead_id, "incident_created", user, {
        "incident_id": incident["incident_id"], "type": body.incident_type, "severity": body.severity,
    }, request)

    return incident


@router.put("/{lead_id}/incidents/{incident_id}")
async def update_incident(lead_id: str, incident_id: str, body: IncidentUpdate, request: Request,
                           user: dict = Depends(require_role("rm", "admin"))):
    """Update an incident — action taken, resolution, status."""
    existing = await db.event_incidents.find_one(
        {"incident_id": incident_id, "lead_id": lead_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(404, "Incident not found")

    updates = {}
    if body.status is not None:
        if body.status not in INCIDENT_STATUSES:
            raise HTTPException(400, f"Invalid status. Use: {INCIDENT_STATUSES}")
        updates["status"] = body.status
        if body.status == "resolved":
            updates["resolved_at"] = now_iso()
    if body.action_taken is not None:
        updates["action_taken"] = body.action_taken
    if body.resolution is not None:
        updates["resolution"] = body.resolution
    if body.closure_impact is not None:
        updates["closure_impact"] = body.closure_impact

    now = now_iso()
    await db.event_incidents.update_one({"incident_id": incident_id}, {"$set": updates})

    # Timeline entry for resolution
    if body.status == "resolved":
        await db.event_timeline.insert_one({
            "entry_id": generate_id("tl_"),
            "lead_id": lead_id,
            "entry_type": "issue_resolved",
            "content": f"Issue resolved: {existing.get('description', '')} — {body.resolution or 'No details'}",
            "created_by": user["user_id"],
            "created_by_name": user.get("name", ""),
            "created_at": now,
        })

        # If no more open high/critical incidents, revert from issue_active
        open_severe = await db.event_incidents.count_documents({
            "lead_id": lead_id,
            "status": {"$in": ["open", "investigating"]},
            "severity": {"$in": ["high", "critical"]},
        })
        if open_severe == 0:
            lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            execution = lead.get("execution") or {}
            if execution.get("execution_status") == "issue_active":
                execution["execution_status"] = "event_live"
                await db.leads.update_one({"lead_id": lead_id}, {"$set": {"execution": execution}})

    await create_audit_log("lead", lead_id, "incident_updated", user, {
        "incident_id": incident_id, "changes": updates,
    }, request)

    return {"message": "Incident updated"}


# ── Phase 12: Post-Booking Commitment Addenda ─────────────────────────────────

@router.get("/{lead_id}/addenda")
async def list_addenda(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """List commitment addenda (versioned changes to original snapshot)."""
    await _get_confirmed_lead(lead_id, user)
    addenda = await db.commitment_addenda.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    return {"addenda": addenda, "total": len(addenda)}


@router.post("/{lead_id}/addendum")
async def create_addendum(lead_id: str, body: AddendumCreate, request: Request,
                           user: dict = Depends(require_role("rm", "admin"))):
    """Create a versioned addendum to the original booking commitment.
    Original snapshot is NEVER overwritten — addenda are the versioned committed state."""
    lead = await _get_confirmed_lead(lead_id, user)

    if not lead.get("booking_snapshot", {}).get("snapshot_locked_at"):
        raise HTTPException(400, "No booking snapshot to amend")

    if body.change_type not in CR_TYPES:
        raise HTTPException(400, f"Invalid change_type. Use: {CR_TYPES}")

    # Determine version number
    existing_count = await db.commitment_addenda.count_documents({"lead_id": lead_id})
    version = existing_count + 1

    now = now_iso()
    addendum = {
        "addendum_id": generate_id("add_"),
        "lead_id": lead_id,
        "version": version,
        "linked_cr_id": body.linked_cr_id,
        "change_type": body.change_type,
        "field_changed": body.field_changed,
        "original_value": body.original_value,
        "new_value": body.new_value,
        "reason": body.reason,
        "approved_by": user["user_id"],
        "approved_by_name": user.get("name", ""),
        "created_at": now,
    }
    await db.commitment_addenda.insert_one(addendum)
    addendum.pop("_id", None)

    await create_audit_log("lead", lead_id, "commitment_addendum_created", user, {
        "addendum_id": addendum["addendum_id"], "version": version,
        "field_changed": body.field_changed, "change_type": body.change_type,
    }, request)

    return addendum


# ── Phase 12: Event Completion ────────────────────────────────────────────────

@router.post("/{lead_id}/complete")
async def complete_event(lead_id: str, body: EventComplete, request: Request,
                          user: dict = Depends(require_role("rm", "admin"))):
    """Confirm event completion."""
    lead = await _get_confirmed_lead(lead_id, user)
    execution = lead.get("execution") or {}
    exec_status = execution.get("execution_status", "")

    if exec_status not in ("event_live", "issue_active", "ready_for_event") and user.get("role") != "admin":
        raise HTTPException(400, f"Cannot complete from status '{exec_status}'")

    now = now_iso()
    event_day = lead.get("event_day") or _default_event_day()
    event_day["completed_at"] = now
    event_day["completion_note"] = body.completion_note
    event_day["major_issue"] = body.major_issue
    event_day["post_event_actions"] = body.post_event_actions

    execution["execution_status"] = "event_completed"

    # Initialize closure
    closure = _default_closure()
    closure["event_completed"] = True

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {
        "event_day": event_day,
        "execution": execution,
        "closure": closure,
        "updated_at": now,
    }})

    # Timeline
    await db.event_timeline.insert_one({
        "entry_id": generate_id("tl_"),
        "lead_id": lead_id,
        "entry_type": "milestone",
        "content": "Event completed" + (f" — {body.completion_note}" if body.completion_note else "") + (" [MAJOR ISSUE]" if body.major_issue else ""),
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
    })

    await create_audit_log("lead", lead_id, "event_completed", user, {
        "major_issue": body.major_issue, "completion_note": body.completion_note,
    }, request)

    return {"message": "Event marked as completed", "execution_status": "event_completed"}


# ── Phase 12: Closure Readiness ───────────────────────────────────────────────

@router.get("/{lead_id}/closure")
async def get_closure(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get closure readiness state."""
    lead = await _get_confirmed_lead(lead_id, user)
    closure = lead.get("closure") or _default_closure()
    execution = lead.get("execution") or {}
    exec_status = execution.get("execution_status", "")

    checks = []
    for c in CLOSURE_CHECKS:
        if c["id"] == "closure_note":
            passed = bool(closure.get("closure_note"))
        else:
            passed = bool(closure.get(c["id"]))
        checks.append({"id": c["id"], "label": c["label"], "passed": passed})

    passed_count = len([c for c in checks if c["passed"]])
    all_ready = passed_count == len(CLOSURE_CHECKS)

    return {
        "lead_id": lead_id,
        "execution_status": exec_status,
        "checks": checks,
        "passed_count": passed_count,
        "total_count": len(CLOSURE_CHECKS),
        "all_ready": all_ready,
        "closure": closure,
    }


@router.post("/{lead_id}/closure")
async def update_closure(lead_id: str, body: ClosureUpdate, request: Request,
                          user: dict = Depends(require_role("rm", "admin"))):
    """Update closure readiness checks."""
    lead = await _get_confirmed_lead(lead_id, user)
    closure = lead.get("closure") or _default_closure()
    changes = {}

    for field in ["event_completed", "critical_issues_resolved", "post_event_tasks_done", "change_history_intact"]:
        val = getattr(body, field, None)
        if val is not None:
            closure[field] = val
            changes[field] = val

    if body.closure_note is not None:
        closure["closure_note"] = body.closure_note
        changes["closure_note"] = body.closure_note

    now = now_iso()
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"closure": closure, "updated_at": now}})

    await create_audit_log("lead", lead_id, "closure_updated", user, {"changes": changes}, request)

    return {"message": "Closure readiness updated", "closure": closure}


@router.post("/{lead_id}/close")
async def close_event(lead_id: str, request: Request,
                       user: dict = Depends(require_role("rm", "admin"))):
    """Close the event — requires all closure checks to pass."""
    lead = await _get_confirmed_lead(lead_id, user)
    execution = lead.get("execution") or {}
    exec_status = execution.get("execution_status", "")

    if exec_status not in ("event_completed", "closure_note_pending") and user.get("role") != "admin":
        raise HTTPException(400, f"Cannot close from status '{exec_status}'")

    closure = lead.get("closure") or _default_closure()
    failing = []
    for c in CLOSURE_CHECKS:
        if c["id"] == "closure_note":
            if not closure.get("closure_note"):
                failing.append(c["id"])
        else:
            if not closure.get(c["id"]):
                failing.append(c["id"])

    if failing:
        raise HTTPException(400, f"Closure not ready: {', '.join(failing)}")

    now = now_iso()
    execution["execution_status"] = "closure_ready"
    closure["closed_at"] = now
    closure["closed_by"] = user["user_id"]
    closure["closed_by_name"] = user.get("name", "")

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {
        "execution": execution, "closure": closure, "updated_at": now,
    }})

    await db.event_timeline.insert_one({
        "entry_id": generate_id("tl_"),
        "lead_id": lead_id,
        "entry_type": "milestone",
        "content": "Event closed — all closure checks passed",
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
    })

    await create_audit_log("lead", lead_id, "event_closed", user, {
        "closure_checks_passed": len(CLOSURE_CHECKS),
    }, request)

    return {"message": "Event closed", "execution_status": "closure_ready"}
