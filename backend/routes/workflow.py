"""
VenuLoQ — Lead Workflow API
============================
Simple, linear pipeline for RMs to manage leads from enquiry to payment.

STAGES (in order):
  new → contacted → site_visit → negotiation → booked →
  deposit_paid → event_done → full_payment → payment_released
  (+ "lost" — can happen at any stage)

ENDPOINTS:
  GET  /workflow/my-leads              — RM's leads, sorted by recent
  GET  /workflow/{lead_id}             — Lead detail (RM or customer)
  PATCH /workflow/{lead_id}/stage      — Move lead to next stage
  POST  /workflow/{lead_id}/note       — Add a free-text note
  GET   /workflow/{lead_id}/timeline   — Full activity timeline
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
    RM's leads, sorted most-recent first.
    Each lead includes: id, customer name, venue, stage, last activity date.
    """
    query = {}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)

    result = []
    for lead in leads:
        venue_name = ""
        if lead.get("venue_ids"):
            venue = await db.venues.find_one({"venue_id": lead["venue_ids"][0]}, {"_id": 0, "name": 1})
            venue_name = venue["name"] if venue else ""

        result.append({
            "lead_id": lead["lead_id"],
            "customer_name": lead.get("customer_name", ""),
            "customer_phone": lead.get("customer_phone", ""),
            "customer_email": lead.get("customer_email", ""),
            "venue_name": venue_name,
            "city": lead.get("city", ""),
            "stage": lead.get("stage", "new"),
            "stage_label": STAGE_LABELS.get(lead.get("stage", "new"), lead.get("stage", "new")),
            "guest_count_range": lead.get("guest_count_range"),
            "event_date": lead.get("event_date"),
            "created_at": lead.get("created_at", ""),
            "updated_at": lead.get("updated_at", ""),
        })

    return result


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
