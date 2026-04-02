"""
VenuLoQ — Lead Workflow API
============================
Simple, linear pipeline for RMs to manage leads from enquiry to payment.

STAGES (in order):
  new → contacted → site_visit → negotiation → booked →
  deposit_paid → event_done → full_payment → payment_released
  (+ "lost" — can happen at any stage)

ENDPOINTS:
  GET   /workflow/my-leads              — RM's leads, sorted by recent
  GET   /workflow/stages                — Ordered stage list for frontend
  GET   /workflow/{lead_id}             — Lead detail (RM or customer)
  PATCH /workflow/{lead_id}/stage       — Move lead to next stage
  POST  /workflow/{lead_id}/note        — Add a free-text note
  GET   /workflow/{lead_id}/timeline    — Full activity timeline
  POST  /workflow/{lead_id}/message     — RM sends message to customer
  GET   /workflow/{lead_id}/messages    — All messages for a lead
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from config import db
from utils import generate_id, get_current_user, require_role
from routes.push import send_push_to_user

router = APIRouter(prefix="/workflow", tags=["workflow"])


# ──────────────────────────────────────────────
#  CONSTANTS
# ──────────────────────────────────────────────

STAGES = [
    "new",
    "contacted",
    "site_visit",
    "negotiation",
    "booked",
    "deposit_paid",
    "event_done",
    "full_payment",
    "payment_released",
]

STAGE_LABELS = {
    "new": "New Lead",
    "contacted": "Contacted",
    "site_visit": "Site Visit",
    "negotiation": "Negotiation",
    "booked": "Booked",
    "deposit_paid": "Deposit Paid",
    "event_done": "Event Done",
    "full_payment": "Full Payment",
    "payment_released": "Payment Released",
    "lost": "Lost",
}

# Messages sent to customer at each stage transition
CUSTOMER_NOTIFICATIONS = {
    "contacted": "Your venue expert has started working on your enquiry",
    "site_visit": "Site visits are being arranged for you",
    "negotiation": "We're negotiating the best deal for you",
    "booked": "Your venue has been booked!",
    "deposit_paid": "Your deposit has been received",
    "event_done": "We hope your event was wonderful!",
    "full_payment": "Your full payment has been received",
    "payment_released": "Payment has been released to the venue",
}


# ──────────────────────────────────────────────
#  REQUEST MODELS
# ──────────────────────────────────────────────

class StageUpdate(BaseModel):
    stage: str
    note: Optional[str] = None

class NoteCreate(BaseModel):
    content: str

class MessageCreate(BaseModel):
    content: str

class RequestTimeBody(BaseModel):
    reason: str
    days_requested: int = 3

class EscalateBody(BaseModel):
    reason: str
    severity: str = "medium"  # low, medium, high

class MeetingOutcomeBody(BaseModel):
    outcome: str  # positive, neutral, negative, no_show
    summary: str
    next_action: Optional[str] = None
    follow_up_date: Optional[str] = None


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc).isoformat()


async def _log_activity(lead_id: str, action: str, by_id: str, by_name: str, detail: Optional[str] = None, meta: Optional[dict] = None):
    """Write one row to the activity timeline."""
    entry = {
        "activity_id": generate_id("act_"),
        "lead_id": lead_id,
        "action": action,
        "detail": detail,
        "meta": meta or {},
        "created_by": by_id,
        "created_by_name": by_name,
        "created_at": _now(),
    }
    await db.lead_activity.insert_one(entry)


async def _notify_customer(lead: dict, stage: str):
    """Send push notification to customer on stage change."""
    msg = CUSTOMER_NOTIFICATIONS.get(stage)
    if not msg or not lead.get("customer_id"):
        return
    try:
        venue_name = ""
        if lead.get("venue_ids"):
            venue = await db.venues.find_one({"venue_id": lead["venue_ids"][0]}, {"_id": 0, "name": 1})
            venue_name = venue["name"] + ": " if venue else ""
        await send_push_to_user(
            user_id=lead["customer_id"],
            title="VenuLoQ Update",
            body=f"{venue_name}{msg}",
            url="/my-enquiries",
        )
    except Exception:
        pass  # Push failures shouldn't block the workflow


def _can_transition(current: str, target: str) -> bool:
    """Check if a stage transition is valid."""
    if target == "lost":
        return current not in ("payment_released", "lost")
    if current == "lost":
        return False  # Can't move out of lost
    if current not in STAGES or target not in STAGES:
        return False
    return STAGES.index(target) == STAGES.index(current) + 1


# ──────────────────────────────────────────────
#  ENDPOINTS
# ──────────────────────────────────────────────

@router.get("/my-leads")
async def get_my_leads(user: dict = Depends(require_role("rm", "admin"))):
    """
    RM's leads enriched with follow-up, overdue, and blocker info.
    """
    query = {}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    now_dt = datetime.now(timezone.utc)
    today_start = now_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now_dt.replace(hour=23, minute=59, second=59).isoformat()

    # Batch-fetch next follow-ups for all leads
    lead_ids = [l["lead_id"] for l in leads]
    follow_ups = await db.follow_ups.find(
        {"lead_id": {"$in": lead_ids}, "status": "pending"}, {"_id": 0}
    ).sort("scheduled_at", 1).to_list(500)

    # Group follow-ups by lead: only keep earliest pending
    next_fu_map = {}
    for fu in follow_ups:
        lid = fu["lead_id"]
        if lid not in next_fu_map:
            next_fu_map[lid] = fu

    result = []
    for lead in leads:
        venue_name = ""
        if lead.get("venue_ids"):
            venue = await db.venues.find_one({"venue_id": lead["venue_ids"][0]}, {"_id": 0, "name": 1})
            venue_name = venue["name"] if venue else ""

        lid = lead["lead_id"]
        next_fu = next_fu_map.get(lid)
        is_overdue = False
        follow_up_date = None
        if next_fu:
            follow_up_date = next_fu.get("scheduled_at", "")
            if follow_up_date and follow_up_date < now_dt.isoformat():
                is_overdue = True

        result.append({
            "lead_id": lid,
            "customer_name": lead.get("customer_name", ""),
            "customer_phone": lead.get("customer_phone", ""),
            "customer_email": lead.get("customer_email", ""),
            "venue_name": venue_name,
            "city": lead.get("city", ""),
            "event_type": lead.get("event_type", ""),
            "area": lead.get("area", ""),
            "stage": lead.get("stage", "new"),
            "stage_label": STAGE_LABELS.get(lead.get("stage", "new"), lead.get("stage", "new")),
            "guest_count_range": lead.get("guest_count_range"),
            "event_date": lead.get("event_date"),
            "created_at": lead.get("created_at", ""),
            "updated_at": lead.get("updated_at", ""),
            "blocker": lead.get("blocker"),
            "time_extension": lead.get("time_extension"),
            "follow_up_date": follow_up_date,
            "is_overdue": is_overdue,
        })

    return result


@router.get("/rm/action-summary")
async def get_action_summary(user: dict = Depends(require_role("rm", "admin"))):
    """
    Action-first dashboard summary for RM.
    Returns counts + items for: today's follow-ups, overdue, blocked, recent activity.
    """
    query = {}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    leads = await db.leads.find(query, {"_id": 0, "lead_id": 1, "customer_name": 1, "stage": 1, "blocker": 1, "venue_ids": 1}).to_list(200)
    lead_ids = [l["lead_id"] for l in leads]
    now_dt = datetime.now(timezone.utc)
    today_start = now_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now_dt.replace(hour=23, minute=59, second=59).isoformat()

    # Follow-ups due today
    todays_fus = await db.follow_ups.find(
        {"lead_id": {"$in": lead_ids}, "status": "pending", "scheduled_at": {"$gte": today_start, "$lte": today_end}},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(50)

    # Overdue follow-ups
    overdue_fus = await db.follow_ups.find(
        {"lead_id": {"$in": lead_ids}, "status": "pending", "scheduled_at": {"$lt": today_start}},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(50)

    # Blocked leads
    blocked_leads = [l for l in leads if l.get("blocker") and l["blocker"].get("active")]

    # Recent activity (last 24h)
    yesterday = (now_dt - __import__('datetime').timedelta(hours=24)).isoformat()
    recent = await db.lead_activity.find(
        {"lead_id": {"$in": lead_ids}, "created_at": {"$gte": yesterday}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    # Build lead name map
    lead_map = {l["lead_id"]: l.get("customer_name", "Unknown") for l in leads}

    # Enrich follow-ups with customer name
    for fu in todays_fus:
        fu["customer_name"] = lead_map.get(fu["lead_id"], "")
    for fu in overdue_fus:
        fu["customer_name"] = lead_map.get(fu["lead_id"], "")

    # Stage counts
    stage_counts = {}
    active_count = 0
    for l in leads:
        s = l.get("stage", "new")
        stage_counts[s] = stage_counts.get(s, 0) + 1
        if s not in ("lost", "payment_released"):
            active_count += 1

    return {
        "total_leads": len(leads),
        "active_leads": active_count,
        "todays_follow_ups": todays_fus,
        "todays_follow_ups_count": len(todays_fus),
        "overdue": overdue_fus,
        "overdue_count": len(overdue_fus),
        "blocked": [{"lead_id": l["lead_id"], "customer_name": l.get("customer_name"), "blocker": l.get("blocker")} for l in blocked_leads],
        "blocked_count": len(blocked_leads),
        "recent_activity": recent,
        "stage_counts": stage_counts,
    }


@router.get("/stages")
async def get_stages():
    """Return the ordered list of stages with labels. Useful for frontend."""
    return {
        "stages": [{"id": s, "label": STAGE_LABELS[s]} for s in STAGES],
        "terminal": [{"id": "lost", "label": "Lost"}],
    }


@router.get("/{lead_id}")
async def get_lead_detail(lead_id: str, user: dict = Depends(get_current_user)):
    """
    Full lead detail. Works for:
    - RM/Admin: full access
    - Customer: only their own leads (limited fields)
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Auth check
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")
    if user["role"] == "customer" and lead.get("customer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your enquiry")

    # Enrich with venue info
    venue_name = ""
    venue_image = ""
    if lead.get("venue_ids"):
        venue = await db.venues.find_one({"venue_id": lead["venue_ids"][0]}, {"_id": 0, "name": 1, "images": 1, "city": 1, "area": 1})
        if venue:
            venue_name = venue["name"]
            venue_image = venue.get("images", [""])[0] if venue.get("images") else ""

    # RM info
    rm_info = {}
    if lead.get("rm_id"):
        rm = await db.users.find_one({"user_id": lead["rm_id"]}, {"_id": 0, "name": 1, "picture": 1, "rating": 1, "phone": 1})
        if rm:
            rm_info = {
                "name": rm.get("name"),
                "picture": rm.get("picture"),
                "rating": rm.get("rating"),
                "phone": rm.get("phone"),
            }

    # Customer gets limited view
    if user["role"] == "customer":
        return {
            "lead_id": lead["lead_id"],
            "stage": lead.get("stage", "new"),
            "stage_label": STAGE_LABELS.get(lead.get("stage", "new"), ""),
            "venue_name": venue_name,
            "venue_image": venue_image,
            "city": lead.get("city"),
            "event_date": lead.get("event_date"),
            "guest_count_range": lead.get("guest_count_range"),
            "rm": rm_info,
            "created_at": lead.get("created_at"),
            "updated_at": lead.get("updated_at"),
            "stages_completed": _completed_stages(lead.get("stage", "new")),
        }

    # RM/Admin gets everything
    # Fetch next pending follow-up
    next_fu = await db.follow_ups.find_one(
        {"lead_id": lead_id, "status": "pending"},
        {"_id": 0},
        sort=[("scheduled_at", 1)]
    )
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "lead_id": lead["lead_id"],
        "customer_name": lead.get("customer_name"),
        "customer_email": lead.get("customer_email"),
        "customer_phone": lead.get("customer_phone"),
        "customer_id": lead.get("customer_id"),
        "venue_name": venue_name,
        "venue_image": venue_image,
        "venue_ids": lead.get("venue_ids", []),
        "city": lead.get("city"),
        "area": lead.get("area"),
        "event_date": lead.get("event_date"),
        "event_type": lead.get("event_type"),
        "guest_count_range": lead.get("guest_count_range"),
        "guest_count": lead.get("guest_count"),
        "budget": lead.get("budget"),
        "preferences": lead.get("preferences"),
        "stage": lead.get("stage", "new"),
        "stage_label": STAGE_LABELS.get(lead.get("stage", "new"), ""),
        "rm_id": lead.get("rm_id"),
        "rm_name": lead.get("rm_name"),
        "rm": rm_info,
        "source": lead.get("source"),
        "created_at": lead.get("created_at"),
        "updated_at": lead.get("updated_at"),
        "stages_completed": _completed_stages(lead.get("stage", "new")),
        "blocker": lead.get("blocker"),
        "time_extension": lead.get("time_extension"),
        "next_follow_up": next_fu,
        "is_overdue": bool(next_fu and next_fu.get("scheduled_at", "") < now_iso),
    }


def _completed_stages(current_stage: str) -> list:
    """Return list of stages completed so far (for progress tracking)."""
    if current_stage == "lost":
        return []
    if current_stage not in STAGES:
        return []
    idx = STAGES.index(current_stage)
    return [{"id": STAGES[i], "label": STAGE_LABELS[STAGES[i]], "completed": True} for i in range(idx + 1)]


@router.patch("/{lead_id}/stage")
async def update_stage(lead_id: str, body: StageUpdate, user: dict = Depends(require_role("rm", "admin"))):
    """
    Move a lead to the next stage.
    - Only forward movement allowed (or to "lost").
    - Auto-logs the transition to the activity timeline.
    - Optional note is saved alongside.
    - Customer is notified via push.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")

    current = lead.get("stage", "new")
    target = body.stage

    if current == target:
        raise HTTPException(status_code=400, detail="Already at this stage")

    # Admin can skip stages; RM must go sequentially
    if user["role"] == "admin":
        if target not in STAGES and target != "lost":
            raise HTTPException(status_code=400, detail=f"Invalid stage: {target}")
    else:
        if not _can_transition(current, target):
            raise HTTPException(status_code=400, detail={
                "message": f"Cannot move from '{STAGE_LABELS.get(current, current)}' to '{STAGE_LABELS.get(target, target)}'",
                "current_stage": current,
                "next_valid": STAGES[STAGES.index(current) + 1] if current in STAGES and STAGES.index(current) < len(STAGES) - 1 else "lost",
            })

    now = _now()
    update = {"stage": target, "updated_at": now}
    if target == "contacted" and not lead.get("first_contacted_at"):
        update["first_contacted_at"] = now
    if target == "booked":
        update["booked_at"] = now
    if target == "event_done":
        update["event_completed_at"] = now

    await db.leads.update_one({"lead_id": lead_id}, {"$set": update})

    # Log the stage change
    detail = f"Stage changed: {STAGE_LABELS.get(current, current)} → {STAGE_LABELS.get(target, target)}"
    if body.note:
        detail += f"\nNote: {body.note}"

    await _log_activity(
        lead_id, "stage_change", user["user_id"], user["name"],
        detail=detail,
        meta={"from": current, "to": target},
    )

    # Also save the note separately if provided
    if body.note:
        await db.lead_notes.insert_one({
            "note_id": generate_id("note_"),
            "lead_id": lead_id,
            "content": body.note,
            "note_type": "stage_change",
            "created_by": user["user_id"],
            "created_by_name": user["name"],
            "created_at": now,
        })

    # Notify customer
    await _notify_customer(lead, target)

    return {
        "message": f"Lead moved to {STAGE_LABELS.get(target, target)}",
        "lead_id": lead_id,
        "stage": target,
        "stage_label": STAGE_LABELS.get(target, target),
    }


@router.post("/{lead_id}/note")
async def add_note(lead_id: str, body: NoteCreate, user: dict = Depends(require_role("rm", "admin"))):
    """
    Add a free-text note to a lead. Notes are timestamped and attributed.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")

    now = _now()
    note_id = generate_id("note_")

    await db.lead_notes.insert_one({
        "note_id": note_id,
        "lead_id": lead_id,
        "content": body.content,
        "note_type": "general",
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": now,
    })

    await _log_activity(
        lead_id, "note_added", user["user_id"], user["name"],
        detail=body.content,
    )

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"updated_at": now}})

    return {
        "note_id": note_id,
        "content": body.content,
        "created_by_name": user["name"],
        "created_at": now,
    }


@router.get("/{lead_id}/timeline")
async def get_timeline(lead_id: str, user: dict = Depends(get_current_user)):
    """
    Full activity timeline for a lead. Combines:
    - Stage transitions (auto-logged)
    - Notes added by RM
    Sorted newest-first.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1, "customer_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Auth
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")
    if user["role"] == "customer" and lead.get("customer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your enquiry")

    activities = await db.lead_activity.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    return {"lead_id": lead_id, "timeline": activities}


# ──────────────────────────────────────────────
#  RM ACTION ENDPOINTS
# ──────────────────────────────────────────────

@router.post("/{lead_id}/request-time")
async def request_more_time(lead_id: str, body: RequestTimeBody, user: dict = Depends(require_role("rm", "admin"))):
    """
    RM requests more time on a case. Reason is mandatory.
    Logged to timeline and stored on the lead.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")

    now = _now()
    extension = {
        "requested_at": now,
        "requested_by": user["user_id"],
        "requested_by_name": user["name"],
        "role": user["role"],
        "reason": body.reason,
        "days_requested": body.days_requested,
        "status": "active",
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"time_extension": extension, "updated_at": now},
         "$push": {"time_extension_history": extension}}
    )

    await _log_activity(
        lead_id, "time_extension_requested", user["user_id"], user["name"],
        detail=f"Requested {body.days_requested} more days. Reason: {body.reason}",
        meta={"days": body.days_requested, "reason": body.reason},
    )

    return {"message": "Time extension requested", "extension": extension}


@router.post("/{lead_id}/escalate")
async def escalate_blocker(lead_id: str, body: EscalateBody, user: dict = Depends(require_role("rm", "admin"))):
    """
    RM escalates a blocker on a case. Reason is mandatory.
    Logged to timeline and flagged on the lead.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")

    now = _now()
    blocker = {
        "active": True,
        "escalated_at": now,
        "escalated_by": user["user_id"],
        "escalated_by_name": user["name"],
        "role": user["role"],
        "reason": body.reason,
        "severity": body.severity,
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"blocker": blocker, "updated_at": now},
         "$push": {"blocker_history": blocker}}
    )

    await _log_activity(
        lead_id, "blocker_escalated", user["user_id"], user["name"],
        detail=f"Blocker escalated ({body.severity}): {body.reason}",
        meta={"severity": body.severity, "reason": body.reason},
    )

    return {"message": "Blocker escalated", "blocker": blocker}


@router.post("/{lead_id}/resolve-blocker")
async def resolve_blocker(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Resolve/clear an active blocker on a lead."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = _now()
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"blocker.active": False, "blocker.resolved_at": now, "updated_at": now}}
    )

    await _log_activity(
        lead_id, "blocker_resolved", user["user_id"], user["name"],
        detail="Blocker resolved",
    )

    return {"message": "Blocker resolved"}


@router.post("/{lead_id}/meeting-outcome")
async def log_meeting_outcome(lead_id: str, body: MeetingOutcomeBody, user: dict = Depends(require_role("rm", "admin"))):
    """
    Log the outcome of a meeting/site visit for a lead.
    Creates a note + timeline entry + optional follow-up.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")

    now = _now()
    note_id = generate_id("note_")
    outcome_labels = {"positive": "Positive", "neutral": "Neutral", "negative": "Negative", "no_show": "No Show"}

    # Save as a note
    await db.lead_notes.insert_one({
        "note_id": note_id,
        "lead_id": lead_id,
        "content": f"Meeting Outcome ({outcome_labels.get(body.outcome, body.outcome)}): {body.summary}" +
                   (f"\nNext Action: {body.next_action}" if body.next_action else ""),
        "note_type": "meeting_outcome",
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": now,
    })

    await _log_activity(
        lead_id, "meeting_outcome", user["user_id"], user["name"],
        detail=f"Meeting: {outcome_labels.get(body.outcome, body.outcome)} — {body.summary}",
        meta={"outcome": body.outcome, "next_action": body.next_action},
    )

    # Auto-create follow-up if date is provided
    fu_id = None
    if body.follow_up_date:
        fu_id = generate_id("fu_")
        await db.follow_ups.insert_one({
            "follow_up_id": fu_id,
            "lead_id": lead_id,
            "scheduled_at": body.follow_up_date,
            "description": body.next_action or f"Follow up after {outcome_labels.get(body.outcome, '')} meeting",
            "follow_up_type": "meeting_followup",
            "status": "pending",
            "created_by": user["user_id"],
            "created_by_name": user["name"],
            "created_at": now,
        })

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"updated_at": now}})

    return {
        "message": "Meeting outcome logged",
        "note_id": note_id,
        "outcome": body.outcome,
        "follow_up_id": fu_id,
    }


# ──────────────────────────────────────────────
#  MESSAGING
# ──────────────────────────────────────────────

@router.post("/{lead_id}/message")
async def send_message(lead_id: str, body: MessageCreate, user: dict = Depends(require_role("rm", "admin"))):
    """
    RM sends a message to the customer. The message is:
    1. Saved in the lead's message thread
    2. Logged in the activity timeline
    3. In production, would trigger a WhatsApp message to the customer
    
    For now, WhatsApp delivery is mocked — the message is stored and
    a wa.me link can be generated on the frontend.
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1, "customer_name": 1, "customer_phone": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")

    now = _now()
    msg_id = generate_id("msg_")

    message = {
        "message_id": msg_id,
        "lead_id": lead_id,
        "sender_id": user["user_id"],
        "sender_name": user["name"],
        "sender_role": user["role"],
        "content": body.content,
        "channel": "app",  # "app" for now, "whatsapp" when integrated
        "whatsapp_status": "pending",  # pending → sent → delivered → read (future)
        "created_at": now,
    }

    await db.lead_messages.insert_one(message)

    await _log_activity(
        lead_id, "message_sent", user["user_id"], user["name"],
        detail=body.content,
        meta={"channel": "app", "message_id": msg_id},
    )

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"updated_at": now, "last_message_at": now}})

    # TODO: When WhatsApp Business API is integrated, send message here:
    # await send_whatsapp(lead["customer_phone"], body.content)

    return {
        "message_id": msg_id,
        "content": body.content,
        "sender_name": user["name"],
        "channel": "app",
        "created_at": now,
        "whatsapp_status": "pending",
    }


@router.get("/{lead_id}/messages")
async def get_messages(lead_id: str, user: dict = Depends(get_current_user)):
    """
    Get all messages for a lead, sorted oldest-first (chat order).
    """
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1, "customer_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your lead")
    if user["role"] == "customer" and lead.get("customer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your enquiry")

    messages = await db.lead_messages.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    return {"lead_id": lead_id, "messages": messages}


# ──────────────────────────────────────────────
#  RM NOTIFICATIONS
# ──────────────────────────────────────────────

async def notify_rm_new_lead(lead: dict):
    """
    Called after a new lead is created.
    Sends push notification to the assigned RM.
    """
    rm_id = lead.get("rm_id")
    if not rm_id:
        return

    customer_name = lead.get("customer_name", "A customer")
    venue_name = ""
    if lead.get("venue_ids"):
        venue = await db.venues.find_one({"venue_id": lead["venue_ids"][0]}, {"_id": 0, "name": 1})
        venue_name = f" for {venue['name']}" if venue else ""

    try:
        await send_push_to_user(
            user_id=rm_id,
            title="New Lead Assigned",
            body=f"{customer_name} has enquired{venue_name}. Check your dashboard.",
            url="/rm/dashboard",
        )
    except Exception:
        pass  # Push failures shouldn't block lead creation
