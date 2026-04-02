"""
Case Conversation Thread — Phase 17.
One conversation thread per case. Customer messages inside their case,
RM/Team Lead/Manager/Admin can view and reply. Strictly separated from
internal-only notes.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from config import db
from utils import generate_id, require_role, get_current_user, create_audit_log, create_notification

router = APIRouter(prefix="/case-thread", tags=["case-thread"])
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class SendMessage(BaseModel):
    text: str
    # optional reference to a share/payment for contextual replies
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None  # share, payment, visit, etc.


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc).isoformat()


ROLE_LABELS = {
    "customer": "Customer",
    "rm": "Relationship Manager",
    "admin": "VenuLoQ Admin",
    "team_lead": "Team Lead",
    "finance": "Finance",
}


async def _verify_customer_case_access(lead_id: str, user: dict) -> dict:
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Case not found")
    uid = user.get("user_id", "")
    email = user.get("email", "")
    cuid = lead.get("customer_user_id", "")
    cemail = lead.get("customer_email", "")
    if uid == cuid or email == cemail:
        return lead
    raise HTTPException(status_code=403, detail="You do not have access to this case")


async def _verify_internal_case_access(lead_id: str, user: dict) -> dict:
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    role = user.get("role", "")
    if role in ("admin", "finance", "team_lead"):
        return lead
    if role == "rm" and lead.get("rm_id") == user.get("user_id"):
        return lead
    raise HTTPException(status_code=403, detail="Unauthorized")


def _sanitize_message_for_customer(msg: dict) -> dict:
    """Strip internal fields. Customer sees sender_name + role_label."""
    return {
        "message_id": msg.get("message_id"),
        "text": msg.get("text"),
        "sender_name": msg.get("sender_name"),
        "sender_role": msg.get("sender_role"),
        "role_label": ROLE_LABELS.get(msg.get("sender_role"), "VenuLoQ Team"),
        "is_customer": msg.get("sender_role") == "customer",
        "reference_id": msg.get("reference_id"),
        "reference_type": msg.get("reference_type"),
        "created_at": msg.get("created_at"),
    }


def _full_message(msg: dict) -> dict:
    """Internal view — includes sender_id and audit info."""
    return {
        "message_id": msg.get("message_id"),
        "text": msg.get("text"),
        "sender_id": msg.get("sender_id"),
        "sender_name": msg.get("sender_name"),
        "sender_role": msg.get("sender_role"),
        "role_label": ROLE_LABELS.get(msg.get("sender_role"), msg.get("sender_role", "")),
        "is_customer": msg.get("sender_role") == "customer",
        "reference_id": msg.get("reference_id"),
        "reference_type": msg.get("reference_type"),
        "created_at": msg.get("created_at"),
    }


# ═══════════════════════════════════════════════
# 1) Customer — Get Thread Messages
# ═══════════════════════════════════════════════

@router.get("/{lead_id}/customer")
async def get_customer_thread(lead_id: str, user: dict = Depends(get_current_user)):
    """Customer retrieves their conversation thread for a case."""
    lead = await _verify_customer_case_access(lead_id, user)

    messages = await db.case_messages.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    # Mark unread messages as read
    unread_ids = [
        m["message_id"] for m in messages
        if m.get("sender_role") != "customer" and not m.get("read_by_customer")
    ]
    if unread_ids:
        await db.case_messages.update_many(
            {"message_id": {"$in": unread_ids}},
            {"$set": {"read_by_customer": True, "read_by_customer_at": _now()}}
        )

    sanitized = [_sanitize_message_for_customer(m) for m in messages]

    return {
        "lead_id": lead_id,
        "messages": sanitized,
        "total": len(sanitized),
        "rm_name": lead.get("rm_name"),
    }


# ═══════════════════════════════════════════════
# 2) Customer — Send Message
# ═══════════════════════════════════════════════

@router.post("/{lead_id}/customer")
async def customer_send_message(lead_id: str, body: SendMessage, user: dict = Depends(get_current_user)):
    """Customer sends a message in their case thread."""
    lead = await _verify_customer_case_access(lead_id, user)

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    now = _now()
    msg_id = generate_id("msg_")

    message = {
        "message_id": msg_id,
        "lead_id": lead_id,
        "text": text,
        "sender_id": user["user_id"],
        "sender_name": user.get("name", "Customer"),
        "sender_role": "customer",
        "reference_id": body.reference_id,
        "reference_type": body.reference_type,
        "read_by_customer": True,
        "read_by_internal": False,
        "created_at": now,
    }
    await db.case_messages.insert_one(message)

    # Update thread metadata on lead
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {
        "thread_last_message": text[:100],
        "thread_last_sender": "customer",
        "thread_last_at": now,
        "thread_unread_internal": True,
        "updated_at": now,
    }})

    # Notify RM
    rm_id = lead.get("rm_id")
    if rm_id:
        await create_notification(
            rm_id,
            f"New message from {user.get('name', 'Customer')}",
            text[:100],
            "case_message",
            {"lead_id": lead_id, "message_id": msg_id},
        )

    return {"message_id": msg_id, "created_at": now}


# ═══════════════════════════════════════════════
# 3) Internal — Get Thread Messages
# ═══════════════════════════════════════════════

@router.get("/{lead_id}/internal")
async def get_internal_thread(lead_id: str, user: dict = Depends(require_role("rm", "admin", "team_lead", "finance"))):
    """Internal users retrieve the full conversation thread for a case."""
    await _verify_internal_case_access(lead_id, user)

    messages = await db.case_messages.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    # Mark customer messages as read by internal
    unread_ids = [
        m["message_id"] for m in messages
        if m.get("sender_role") == "customer" and not m.get("read_by_internal")
    ]
    if unread_ids:
        await db.case_messages.update_many(
            {"message_id": {"$in": unread_ids}},
            {"$set": {"read_by_internal": True, "read_by_internal_at": _now(), "read_by_internal_user": user["user_id"]}}
        )
        await db.leads.update_one({"lead_id": lead_id}, {"$set": {"thread_unread_internal": False}})

    full = [_full_message(m) for m in messages]

    # Unread count for customer (messages from internal not yet read by customer)
    unread_by_customer = sum(1 for m in messages if m.get("sender_role") != "customer" and not m.get("read_by_customer"))

    return {
        "lead_id": lead_id,
        "messages": full,
        "total": len(full),
        "unread_by_customer": unread_by_customer,
    }


# ═══════════════════════════════════════════════
# 4) Internal — Send Message (RM / Team Lead / Admin)
# ═══════════════════════════════════════════════

@router.post("/{lead_id}/internal")
async def internal_send_message(
    lead_id: str,
    body: SendMessage,
    request: Request,
    user: dict = Depends(require_role("rm", "admin", "team_lead")),
):
    """RM/Team Lead/Admin sends a message in the case thread (visible to customer)."""
    lead = await _verify_internal_case_access(lead_id, user)

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    now = _now()
    msg_id = generate_id("msg_")
    role = user.get("role", "rm")

    message = {
        "message_id": msg_id,
        "lead_id": lead_id,
        "text": text,
        "sender_id": user["user_id"],
        "sender_name": user.get("name", "Team"),
        "sender_role": role,
        "reference_id": body.reference_id,
        "reference_type": body.reference_type,
        "read_by_customer": False,
        "read_by_internal": True,
        "created_at": now,
    }
    await db.case_messages.insert_one(message)

    # Update thread metadata
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {
        "thread_last_message": text[:100],
        "thread_last_sender": role,
        "thread_last_at": now,
        "thread_unread_internal": False,
        "updated_at": now,
    }})

    # Notify customer
    customer_uid = lead.get("customer_user_id")
    if customer_uid:
        sender_label = ROLE_LABELS.get(role, "Your team")
        await create_notification(
            customer_uid,
            f"New message from {sender_label}",
            text[:100],
            "case_message",
            {"lead_id": lead_id, "message_id": msg_id},
        )

    await create_audit_log("case_thread", msg_id, "message_sent", user, {
        "lead_id": lead_id, "role": role, "text_length": len(text),
    }, request)

    return {"message_id": msg_id, "created_at": now}


# ═══════════════════════════════════════════════
# 5) Unread Counts (for badges)
# ═══════════════════════════════════════════════

@router.get("/{lead_id}/unread")
async def get_unread_counts(lead_id: str, user: dict = Depends(get_current_user)):
    """Get unread message count for the current user in this case thread."""
    role = user.get("role", "customer")

    if role == "customer":
        await _verify_customer_case_access(lead_id, user)
        count = await db.case_messages.count_documents({
            "lead_id": lead_id,
            "sender_role": {"$ne": "customer"},
            "read_by_customer": {"$ne": True},
        })
    else:
        await _verify_internal_case_access(lead_id, user)
        count = await db.case_messages.count_documents({
            "lead_id": lead_id,
            "sender_role": "customer",
            "read_by_internal": {"$ne": True},
        })

    return {"unread": count}
