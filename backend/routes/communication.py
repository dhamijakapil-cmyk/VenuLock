"""
VenuLoQ — RM Customer Communication Hub (Phase 14)
Operates on: leads collection (communications[] array + summary fields)
Templates stored in: communication_templates collection
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from config import db
from utils import generate_id, get_current_user, require_role, create_audit_log

router = APIRouter(prefix="/communication", tags=["communication"])

# ── Constants ─────────────────────────────────────────────────────────────────

CHANNELS = ["call", "whatsapp", "email", "note", "template", "follow_up"]

ACTION_TYPES = [
    "call_initiated", "whatsapp_opened", "email_sent",
    "note_logged", "call_outcome_logged", "message_outcome_logged",
    "template_used", "follow_up_scheduled", "follow_up_completed",
    "follow_up_cancelled", "status_updated",
]

CALL_OUTCOMES = [
    "connected", "no_answer", "busy", "wrong_number",
    "customer_asked_for_callback", "interested", "not_interested",
    "waiting_for_family_discussion", "visit_requested", "quote_requested",
    "negotiation_discussion", "closed_progressed",
]

MESSAGE_OUTCOMES = [
    "message_sent", "customer_replied", "customer_acknowledged",
    "no_response_yet", "waiting_for_customer_reply",
    "information_shared", "shortlist_shared", "quote_shared",
    "visit_details_shared",
]

COMMUNICATION_STATUSES = [
    "never_contacted", "follow_up_due", "overdue",
    "waiting_on_customer", "waiting_on_rm", "recently_contacted",
    "no_response", "blocked_unreachable",
]

WAITING_STATES = [
    "waiting_on_customer", "waiting_on_rm",
    "callback_requested", "none",
]

TEMPLATE_CATEGORIES = [
    "introduction", "callback_confirmation", "shortlist_shared",
    "quote_shared", "site_visit_proposal", "negotiation_followup",
    "reminder_no_response", "booking_progression",
]

TEMPLATE_VARIABLES = [
    "customer_name", "rm_name", "venue_name",
    "shortlist_link", "quote_summary", "visit_datetime", "company_name",
]

def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Pydantic Models ───────────────────────────────────────────────────────────

class LogCommunication(BaseModel):
    channel: str
    action_type: str
    outcome: Optional[str] = None
    summary: Optional[str] = None
    note: Optional[str] = None
    template_id: Optional[str] = None
    next_follow_up_at: Optional[str] = None
    waiting_state: Optional[str] = None

class ScheduleFollowUp(BaseModel):
    scheduled_at: str
    description: Optional[str] = None
    waiting_state: Optional[str] = None

class UpdateCommStatus(BaseModel):
    status: str
    reason: Optional[str] = None

class TemplateCreate(BaseModel):
    name: str
    category: str
    channel: str  # whatsapp, email, note
    subject: Optional[str] = None
    body: str
    variables: Optional[List[str]] = None

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    channel: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def compute_comm_status(lead: dict) -> str:
    """Deterministic communication status from lead summary fields."""
    status = lead.get("communication_status", "never_contacted")
    last_contacted = lead.get("last_contacted_at")
    next_fu = lead.get("next_follow_up_at")

    if not last_contacted:
        return "never_contacted"

    if status in ("blocked_unreachable",):
        return status

    if next_fu:
        try:
            fu_dt = datetime.fromisoformat(next_fu.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            if fu_dt < now_dt:
                return "overdue"
            # Due within 2 hours
            diff_hours = (fu_dt - now_dt).total_seconds() / 3600
            if diff_hours <= 2:
                return "follow_up_due"
        except Exception:
            pass

    waiting = lead.get("waiting_on")
    if waiting == "waiting_on_customer":
        return "waiting_on_customer"
    if waiting == "waiting_on_rm":
        return "waiting_on_rm"

    if lead.get("last_contact_outcome") == "no_answer":
        return "no_response"

    return "recently_contacted"


async def update_lead_comm_summary(lead_id: str, updates: dict):
    """Update lead-level communication summary fields."""
    updates["updated_at"] = now_iso()
    await db.leads.update_one({"lead_id": lead_id}, {"$set": updates})


# ── Log Communication ─────────────────────────────────────────────────────────

@router.post("/{lead_id}/log")
async def log_communication(
    lead_id: str,
    body: LogCommunication,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Log a communication action on a lead."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")

    if body.channel not in CHANNELS:
        raise HTTPException(400, f"Invalid channel. Use: {CHANNELS}")
    if body.action_type not in ACTION_TYPES:
        raise HTTPException(400, f"Invalid action_type. Use: {ACTION_TYPES}")
    if body.outcome:
        valid_outcomes = CALL_OUTCOMES + MESSAGE_OUTCOMES
        if body.outcome not in valid_outcomes:
            raise HTTPException(400, f"Invalid outcome. Use: {valid_outcomes}")
    if body.waiting_state and body.waiting_state not in WAITING_STATES:
        raise HTTPException(400, f"Invalid waiting_state. Use: {WAITING_STATES}")

    now = now_iso()
    comm_id = generate_id("comm_")

    entry = {
        "id": comm_id,
        "channel": body.channel,
        "action_type": body.action_type,
        "outcome": body.outcome,
        "summary": body.summary,
        "note": body.note,
        "template_id": body.template_id,
        "next_follow_up_at": body.next_follow_up_at,
        "waiting_state": body.waiting_state or "none",
        "performed_by": user["user_id"],
        "performed_by_name": user.get("name", ""),
        "performed_role": user.get("role", ""),
        "timestamp": now,
    }

    # Push to communications array
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"communications": entry}}
    )

    # Update lead summary fields
    summary_updates = {
        "last_contacted_at": now,
        "last_contact_channel": body.channel,
        "last_contact_outcome": body.outcome or body.action_type,
    }

    if body.next_follow_up_at:
        summary_updates["next_follow_up_at"] = body.next_follow_up_at

    if body.waiting_state and body.waiting_state != "none":
        summary_updates["waiting_on"] = body.waiting_state
    elif body.outcome in ("connected", "customer_replied", "customer_acknowledged"):
        summary_updates["waiting_on"] = None

    # Recompute status
    lead_updated = {**lead, **summary_updates}
    summary_updates["communication_status"] = compute_comm_status(lead_updated)

    await update_lead_comm_summary(lead_id, summary_updates)

    await create_audit_log("lead", lead_id, "communication_logged", user, {
        "comm_id": comm_id, "channel": body.channel,
        "action_type": body.action_type, "outcome": body.outcome,
    }, request)

    # Workflow prompts based on outcome
    prompts = []
    if body.outcome == "customer_asked_for_callback" and not body.next_follow_up_at:
        prompts.append({"type": "schedule_follow_up", "message": "Customer asked for callback — schedule a follow-up"})
    if body.outcome == "visit_requested":
        prompts.append({"type": "advance_stage", "message": "Customer requested a visit — consider advancing to site visit stage", "suggested_stage": "site_visit_planned"})
    if body.outcome == "quote_requested":
        prompts.append({"type": "advance_stage", "message": "Customer requested a quote — consider advancing to quote stage", "suggested_stage": "quote_requested"})
    if body.outcome == "not_interested":
        prompts.append({"type": "mark_lost", "message": "Customer not interested — consider marking as lost"})
    if body.outcome == "negotiation_discussion":
        prompts.append({"type": "advance_stage", "message": "Negotiation discussed — consider advancing to negotiation stage", "suggested_stage": "negotiation_in_progress"})
    if body.outcome in ("shortlist_shared", "quote_shared", "visit_details_shared") and not body.next_follow_up_at:
        prompts.append({"type": "schedule_follow_up", "message": "Information shared — schedule a follow-up to check response"})

    return {
        "message": "Communication logged",
        "comm_id": comm_id,
        "communication_status": summary_updates.get("communication_status"),
        "prompts": prompts,
    }


# ── Get Communication Timeline ────────────────────────────────────────────────

@router.get("/{lead_id}/timeline")
async def get_timeline(
    lead_id: str,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Get communication timeline for a lead."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "communications": 1, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")

    comms = lead.get("communications") or []
    # Sort newest first
    comms.sort(key=lambda c: c.get("timestamp", ""), reverse=True)

    return {"lead_id": lead_id, "timeline": comms, "total": len(comms)}


# ── Schedule Follow-Up ────────────────────────────────────────────────────────

@router.post("/{lead_id}/follow-up")
async def schedule_follow_up(
    lead_id: str,
    body: ScheduleFollowUp,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Schedule a follow-up for a lead."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")

    now = now_iso()
    comm_id = generate_id("comm_")

    entry = {
        "id": comm_id,
        "channel": "follow_up",
        "action_type": "follow_up_scheduled",
        "outcome": None,
        "summary": body.description or "Follow-up scheduled",
        "note": body.description,
        "template_id": None,
        "next_follow_up_at": body.scheduled_at,
        "waiting_state": body.waiting_state or "none",
        "performed_by": user["user_id"],
        "performed_by_name": user.get("name", ""),
        "performed_role": user.get("role", ""),
        "timestamp": now,
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"communications": entry}}
    )

    summary_updates = {
        "next_follow_up_at": body.scheduled_at,
    }
    if body.waiting_state and body.waiting_state != "none":
        summary_updates["waiting_on"] = body.waiting_state

    lead_updated = {**lead, **summary_updates}
    summary_updates["communication_status"] = compute_comm_status(lead_updated)

    await update_lead_comm_summary(lead_id, summary_updates)

    await create_audit_log("lead", lead_id, "follow_up_scheduled", user, {
        "scheduled_at": body.scheduled_at, "description": body.description,
    }, request)

    return {"message": "Follow-up scheduled", "comm_id": comm_id, "next_follow_up_at": body.scheduled_at}


# ── Update Communication Status ──────────────────────────────────────────────

@router.post("/{lead_id}/status")
async def update_comm_status(
    lead_id: str,
    body: UpdateCommStatus,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Manually update communication status."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if body.status not in COMMUNICATION_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {COMMUNICATION_STATUSES}")

    now = now_iso()
    entry = {
        "id": generate_id("comm_"),
        "channel": "note",
        "action_type": "status_updated",
        "outcome": None,
        "summary": f"Status changed to {body.status}" + (f": {body.reason}" if body.reason else ""),
        "note": body.reason,
        "template_id": None,
        "next_follow_up_at": None,
        "waiting_state": "none",
        "performed_by": user["user_id"],
        "performed_by_name": user.get("name", ""),
        "performed_role": user.get("role", ""),
        "timestamp": now,
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"communications": entry}}
    )

    await update_lead_comm_summary(lead_id, {"communication_status": body.status})

    return {"message": f"Communication status updated to {body.status}"}


# ── Dashboard Aggregation ─────────────────────────────────────────────────────

@router.get("/dashboard-counts")
async def get_dashboard_counts(
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Get communication urgency counts for RM dashboard."""
    query = {"stage": {"$nin": ["booking_confirmed", "lost"]}}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    leads = await db.leads.find(query, {
        "_id": 0, "lead_id": 1, "communication_status": 1,
        "last_contacted_at": 1, "next_follow_up_at": 1,
        "waiting_on": 1, "last_contact_outcome": 1,
    }).to_list(500)

    now_dt = datetime.now(timezone.utc)
    counts = {
        "overdue": 0,
        "follow_up_due": 0,
        "never_contacted": 0,
        "waiting_on_customer": 0,
        "no_response": 0,
        "recently_contacted": 0,
        "total_active": len(leads),
    }

    overdue_leads = []

    for lead in leads:
        status = compute_comm_status(lead)
        if status in counts:
            counts[status] += 1
        if status == "overdue":
            overdue_leads.append({
                "lead_id": lead["lead_id"],
                "next_follow_up_at": lead.get("next_follow_up_at"),
            })

    counts["overdue_leads"] = overdue_leads[:10]  # Top 10 overdue

    return counts


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates")
async def list_templates(
    category: Optional[str] = None,
    channel: Optional[str] = None,
    user: dict = Depends(require_role("rm", "admin"))
):
    """List communication templates."""
    query = {"is_active": True}
    if category:
        query["category"] = category
    if channel:
        query["channel"] = channel

    templates = await db.communication_templates.find(query, {"_id": 0}).sort("category", 1).to_list(100)
    return {"templates": templates}


@router.get("/templates/{template_id}")
async def get_template(template_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get a single template."""
    tmpl = await db.communication_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not tmpl:
        raise HTTPException(404, "Template not found")
    return tmpl


@router.post("/templates")
async def create_template(body: TemplateCreate, request: Request, user: dict = Depends(require_role("admin"))):
    """Create a new communication template (admin only)."""
    if body.category not in TEMPLATE_CATEGORIES:
        raise HTTPException(400, f"Invalid category. Use: {TEMPLATE_CATEGORIES}")

    now = now_iso()
    template_id = generate_id("tmpl_")

    tmpl = {
        "template_id": template_id,
        "name": body.name,
        "category": body.category,
        "channel": body.channel,
        "subject": body.subject,
        "body": body.body,
        "variables": body.variables or [],
        "is_active": True,
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }

    await db.communication_templates.insert_one(tmpl)
    tmpl.pop("_id", None)

    return {"message": "Template created", "template_id": template_id}


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str, body: TemplateUpdate,
    request: Request, user: dict = Depends(require_role("admin"))
):
    """Update a communication template (admin only)."""
    tmpl = await db.communication_templates.find_one({"template_id": template_id})
    if not tmpl:
        raise HTTPException(404, "Template not found")

    updates = {}
    for field in ["name", "category", "channel", "subject", "body", "variables", "is_active"]:
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val
    updates["updated_at"] = now_iso()

    await db.communication_templates.update_one({"template_id": template_id}, {"$set": updates})

    return {"message": "Template updated"}


# ── Render Template ───────────────────────────────────────────────────────────

@router.post("/templates/{template_id}/render")
async def render_template(
    template_id: str,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Render a template with variable substitution."""
    tmpl = await db.communication_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not tmpl:
        raise HTTPException(404, "Template not found")

    body_data = await request.json()
    variables = body_data.get("variables", {})

    rendered_body = tmpl["body"]
    rendered_subject = tmpl.get("subject") or ""

    for var_name in TEMPLATE_VARIABLES:
        placeholder = "{{" + var_name + "}}"
        value = variables.get(var_name, "")
        rendered_body = rendered_body.replace(placeholder, str(value))
        rendered_subject = rendered_subject.replace(placeholder, str(value))

    return {
        "template_id": template_id,
        "rendered_body": rendered_body,
        "rendered_subject": rendered_subject,
        "channel": tmpl["channel"],
    }


# ── Seed Default Templates (called at startup) ───────────────────────────────

async def seed_default_templates():
    """Seed default communication templates if none exist."""
    count = await db.communication_templates.count_documents({})
    if count > 0:
        return

    now = now_iso()
    defaults = [
        {
            "template_id": generate_id("tmpl_"),
            "name": "First Contact Introduction",
            "category": "introduction",
            "channel": "whatsapp",
            "subject": None,
            "body": "Hi {{customer_name}}, this is {{rm_name}} from VenuLoQ. I saw your enquiry for an upcoming event. I'd love to help you find the perfect venue! When would be a good time to discuss your requirements?",
            "variables": ["customer_name", "rm_name"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "Callback Confirmation",
            "category": "callback_confirmation",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, thank you for your time on the call. As discussed, I'll follow up with you on the options we talked about. Please feel free to reach out if you have any questions in the meantime!",
            "variables": ["customer_name"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "Shortlist Shared",
            "category": "shortlist_shared",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, I've curated a shortlist of venues based on your requirements. Please take a look and let me know which ones interest you. I can arrange site visits for your favourites!",
            "variables": ["customer_name"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "Quote Follow-up",
            "category": "quote_shared",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, I've shared the quote for {{venue_name}}. Let me know if the pricing and inclusions work for you, or if you'd like me to negotiate further. Happy to help!",
            "variables": ["customer_name", "venue_name"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "Site Visit Proposal",
            "category": "site_visit_proposal",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, would you like to visit {{venue_name}}? I can schedule a visit on {{visit_datetime}}. The venue looks great in person — I think you'll love it!",
            "variables": ["customer_name", "venue_name", "visit_datetime"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "Negotiation Follow-up",
            "category": "negotiation_followup",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, just following up on our discussion about {{venue_name}}. Have you had a chance to think about the revised terms? I'm available to discuss further at your convenience.",
            "variables": ["customer_name", "venue_name"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "No Response Reminder",
            "category": "reminder_no_response",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, just checking in! I wanted to make sure you received my earlier message. If you're still looking for a venue, I'm here to help. If plans have changed, just let me know!",
            "variables": ["customer_name"],
        },
        {
            "template_id": generate_id("tmpl_"),
            "name": "Booking Progression",
            "category": "booking_progression",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, great news! Everything looks set for your booking at {{venue_name}}. Just a few final steps to confirm. Shall we go ahead and lock the date?",
            "variables": ["customer_name", "venue_name"],
        },
    ]

    for tmpl in defaults:
        tmpl["is_active"] = True
        tmpl["created_by"] = "system"
        tmpl["created_at"] = now
        tmpl["updated_at"] = now
        tmpl.setdefault("subject", None)

    await db.communication_templates.insert_many(defaults)
