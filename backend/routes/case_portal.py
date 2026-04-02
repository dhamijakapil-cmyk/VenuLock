"""
VenuLoQ — Customer Case Portal + Proposal/File Sharing Hub (Phase 15)
Operates on: leads collection (customer access), case_shares collection (shared items)
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from config import db
from utils import generate_id, get_current_user, require_role, create_audit_log

router = APIRouter(prefix="/case-portal", tags=["case-portal"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Constants ─────────────────────────────────────────────────────────────────

SHARE_TYPES = [
    "shortlist", "proposal", "quote", "brochure", "menu",
    "photo_gallery", "comparison", "visit_details", "note", "file",
]

SHARE_LIFECYCLE = ["shared", "viewed", "responded", "superseded", "revoked", "expired"]

CUSTOMER_RESPONSES = [
    "interested", "maybe", "not_for_me", "need_more_options",
    "request_callback", "request_visit", "accept_quote", "have_question",
]

# Customer-safe stage labels (no internal jargon)
CUSTOMER_STAGE_LABELS = {
    "new": "Enquiry Received",
    "enquiry_received": "Enquiry Received",
    "contacted": "We're In Touch",
    "requirement_qualified": "Understanding Your Needs",
    "venues_shortlisted": "Curating Venues for You",
    "shortlisted": "Curating Venues for You",
    "quote_requested": "Requesting Quotes",
    "quote_received": "Quotes Ready for Review",
    "site_visit": "Planning Your Visit",
    "site_visit_planned": "Planning Your Visit",
    "site_visit_completed": "Visit Complete",
    "negotiation": "Working on Best Terms",
    "negotiation_in_progress": "Working on Best Terms",
    "commercial_accepted": "Terms Agreed",
    "booking_confirmation_pending": "Confirming Your Booking",
    "booking_confirmed": "Booking Confirmed",
    "booked": "Booking Confirmed",
    "lost": "Case Closed",
}

# Customer-safe timeline event types
CUSTOMER_TIMELINE_EVENTS = {
    "enquiry_received": "We received your enquiry",
    "rm_assigned": "A dedicated relationship manager has been assigned",
    "shortlist_shared": "We've curated venue options for you",
    "quote_shared": "A quotation has been shared",
    "revised_quote_shared": "An updated quotation is available",
    "visit_proposed": "A site visit has been proposed",
    "visit_confirmed": "Your site visit is confirmed",
    "negotiation_update": "We're working on better terms for you",
    "proposal_shared": "A proposal has been shared",
    "booking_progressing": "Your booking is progressing",
    "file_shared": "New documents have been shared",
    "note_shared": "An update has been posted",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Models ────────────────────────────────────────────────────────────────────

class ShareItem(BaseModel):
    share_type: str
    title: str
    description: Optional[str] = None
    venue_id: Optional[str] = None
    venue_name: Optional[str] = None
    content: Optional[dict] = None  # Flexible: venues list, quote data, visit data
    change_summary: Optional[str] = None  # For versioned items
    customer_note: Optional[str] = None  # Customer-facing note

class CustomerResponse(BaseModel):
    response: str
    note: Optional[str] = None
    share_id: Optional[str] = None  # Response to a specific shared item


# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_customer_lead(lead_id: str, user: dict):
    """Get lead with customer access control. Primary: user_id match. Fallback: email."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    # Primary: customer_user_id match
    if lead.get("customer_user_id") == user["user_id"]:
        return lead
    # Fallback: email match (legacy data)
    if lead.get("customer_email") and lead["customer_email"].lower() == user.get("email", "").lower():
        # Auto-link for future access
        await db.leads.update_one({"lead_id": lead_id}, {"$set": {"customer_user_id": user["user_id"]}})
        return lead
    raise HTTPException(403, "You do not have access to this case")


async def get_internal_lead(lead_id: str, user: dict):
    """Get lead for internal team access."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")
    return lead


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMER-FACING ENDPOINTS (customer role)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/my-cases")
async def list_customer_cases(user: dict = Depends(get_current_user)):
    """List all cases for the authenticated customer."""
    query = {"$or": [
        {"customer_user_id": user["user_id"]},
        {"customer_email": {"$regex": f"^{user.get('email', 'NOMATCH')}$", "$options": "i"}},
    ]}
    leads = await db.leads.find(query, {
        "_id": 0, "lead_id": 1, "customer_name": 1, "event_type": 1,
        "event_date": 1, "city": 1, "stage": 1, "rm_name": 1,
        "created_at": 1, "updated_at": 1, "guest_count": 1,
    }).sort("updated_at", -1).to_list(50)

    cases = []
    for lead in leads:
        stage = lead.get("stage", "enquiry_received")
        # Get latest share
        latest_share = await db.case_shares.find_one(
            {"lead_id": lead["lead_id"], "lifecycle": "shared"},
            {"_id": 0, "title": 1, "share_type": 1, "created_at": 1},
            sort=[("created_at", -1)]
        )
        # Count pending actions
        pending = await db.case_shares.count_documents({
            "lead_id": lead["lead_id"], "lifecycle": "shared",
            "customer_response": None
        })
        cases.append({
            "lead_id": lead["lead_id"],
            "customer_name": lead.get("customer_name"),
            "event_type": lead.get("event_type"),
            "event_date": lead.get("event_date"),
            "city": lead.get("city"),
            "guest_count": lead.get("guest_count"),
            "stage": stage,
            "stage_label": CUSTOMER_STAGE_LABELS.get(stage, stage),
            "rm_name": lead.get("rm_name"),
            "updated_at": lead.get("updated_at"),
            "latest_share": latest_share,
            "pending_actions": pending,
        })

    return {"cases": cases, "total": len(cases)}


@router.get("/cases/{lead_id}")
async def get_customer_case(lead_id: str, user: dict = Depends(get_current_user)):
    """Get customer case detail — clean, safe view."""
    lead = await get_customer_lead(lead_id, user)
    stage = lead.get("stage", "enquiry_received")

    # Get shared items (customer-visible only, active lifecycle)
    shares = await db.case_shares.find(
        {"lead_id": lead_id, "lifecycle": {"$in": ["shared", "viewed", "responded"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Build customer-safe timeline
    timeline = await _build_customer_timeline(lead_id, lead)

    # Pending actions count
    pending_items = [s for s in shares if s.get("lifecycle") == "shared" and not s.get("customer_response")]

    # Payment pending count
    payment_pending = await db.case_payments.count_documents({
        "lead_id": lead_id,
        "status": {"$in": ["payment_requested", "payment_due", "payment_failed"]},
    })

    # What VenuLoQ is doing
    status_message = _get_status_message(stage)

    return {
        "lead_id": lead_id,
        "customer_name": lead.get("customer_name"),
        "event_type": lead.get("event_type"),
        "event_date": lead.get("event_date"),
        "city": lead.get("city"),
        "guest_count": lead.get("guest_count"),
        "budget_range": lead.get("budget_range"),
        "stage": stage,
        "stage_label": CUSTOMER_STAGE_LABELS.get(stage, stage),
        "rm_name": lead.get("rm_name"),
        "rm_phone": lead.get("rm_phone"),
        "status_message": status_message,
        "shares": shares,
        "timeline": timeline,
        "pending_count": len(pending_items),
        "payment_pending_count": payment_pending,
        "updated_at": lead.get("updated_at"),
    }


@router.get("/cases/{lead_id}/shares")
async def get_customer_shares(lead_id: str, share_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get shared items for a customer case."""
    await get_customer_lead(lead_id, user)
    query = {"lead_id": lead_id, "lifecycle": {"$in": ["shared", "viewed", "responded"]}}
    if share_type:
        query["share_type"] = share_type
    shares = await db.case_shares.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"shares": shares, "total": len(shares)}


@router.post("/cases/{lead_id}/view/{share_id}")
async def mark_share_viewed(lead_id: str, share_id: str, user: dict = Depends(get_current_user)):
    """Mark a shared item as viewed by the customer."""
    await get_customer_lead(lead_id, user)
    share = await db.case_shares.find_one({"share_id": share_id, "lead_id": lead_id})
    if not share:
        raise HTTPException(404, "Item not found")
    if share.get("lifecycle") == "shared":
        await db.case_shares.update_one(
            {"share_id": share_id},
            {"$set": {
                "lifecycle": "viewed",
                "viewed_at": now_iso(),
                "viewed_by": user["user_id"],
            }}
        )
    return {"message": "Marked as viewed"}


@router.post("/cases/{lead_id}/respond")
async def customer_respond(lead_id: str, body: CustomerResponse, user: dict = Depends(get_current_user)):
    """Customer responds to case or specific shared item."""
    lead = await get_customer_lead(lead_id, user)
    if body.response not in CUSTOMER_RESPONSES:
        raise HTTPException(400, f"Invalid response. Use: {CUSTOMER_RESPONSES}")

    now = now_iso()
    response_entry = {
        "response_id": generate_id("resp_"),
        "lead_id": lead_id,
        "share_id": body.share_id,
        "response": body.response,
        "note": body.note,
        "responded_by": user["user_id"],
        "responded_by_name": user.get("name", ""),
        "responded_at": now,
    }

    # If responding to a specific share, update that share
    if body.share_id:
        share = await db.case_shares.find_one({"share_id": body.share_id, "lead_id": lead_id})
        if share:
            await db.case_shares.update_one(
                {"share_id": body.share_id},
                {"$set": {
                    "lifecycle": "responded",
                    "customer_response": body.response,
                    "customer_response_note": body.note,
                    "responded_at": now,
                }}
            )

    # Push to lead communications (so RM sees it)
    comm_entry = {
        "id": generate_id("comm_"),
        "channel": "portal",
        "action_type": "customer_response",
        "outcome": body.response,
        "summary": f"Customer: {body.response.replace('_', ' ')}" + (f" — {body.note}" if body.note else ""),
        "note": body.note,
        "template_id": None,
        "next_follow_up_at": None,
        "waiting_state": "none",
        "performed_by": user["user_id"],
        "performed_by_name": user.get("name", "Customer"),
        "performed_role": "customer",
        "timestamp": now,
    }
    await db.leads.update_one(
        {"lead_id": lead_id},
        {
            "$push": {"communications": comm_entry},
            "$set": {
                "last_customer_response": body.response,
                "last_customer_response_at": now,
                "updated_at": now,
            }
        }
    )

    return {"message": "Response recorded", "response_id": response_entry["response_id"]}


# ══════════════════════════════════════════════════════════════════════════════
# RM / INTERNAL ENDPOINTS (share, upload, manage)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/{lead_id}/share")
async def share_to_customer(
    lead_id: str, body: ShareItem,
    request: Request, user: dict = Depends(require_role("rm", "admin"))
):
    """RM shares an item to the customer case portal."""
    lead = await get_internal_lead(lead_id, user)

    if body.share_type not in SHARE_TYPES:
        raise HTTPException(400, f"Invalid share_type. Use: {SHARE_TYPES}")

    now = now_iso()
    share_id = generate_id("share_")

    # Version handling for proposals/quotes
    version = 1
    if body.share_type in ("proposal", "quote"):
        existing = await db.case_shares.count_documents({
            "lead_id": lead_id, "share_type": body.share_type,
            "venue_id": body.venue_id, "lifecycle": {"$ne": "revoked"},
        })
        version = existing + 1
        # Supersede previous versions
        if existing > 0:
            await db.case_shares.update_many(
                {
                    "lead_id": lead_id, "share_type": body.share_type,
                    "venue_id": body.venue_id,
                    "lifecycle": {"$in": ["shared", "viewed", "responded"]},
                    "is_current_version": True,
                },
                {"$set": {"is_current_version": False, "lifecycle": "superseded", "superseded_at": now}}
            )

    share = {
        "share_id": share_id,
        "lead_id": lead_id,
        "share_type": body.share_type,
        "title": body.title,
        "description": body.description,
        "venue_id": body.venue_id,
        "venue_name": body.venue_name,
        "content": body.content or {},
        "change_summary": body.change_summary,
        "customer_note": body.customer_note,
        "version": version,
        "is_current_version": True,
        "lifecycle": "shared",
        "customer_response": None,
        "customer_response_note": None,
        "viewed_at": None,
        "viewed_by": None,
        "responded_at": None,
        "file_path": None,
        "file_type": None,
        "file_name": None,
        "shared_by": user["user_id"],
        "shared_by_name": user.get("name", ""),
        "shared_by_role": user.get("role", ""),
        "created_at": now,
        "updated_at": now,
    }

    await db.case_shares.insert_one(share)
    share.pop("_id", None)

    # Add to customer timeline
    timeline_type = f"{body.share_type}_shared"
    if body.share_type in ("proposal", "quote") and version > 1:
        timeline_type = f"revised_{body.share_type}_shared"

    await _add_customer_timeline_event(lead_id, timeline_type, body.title, user)

    # Log to lead communications
    comm_entry = {
        "id": generate_id("comm_"),
        "channel": "portal",
        "action_type": "share_sent",
        "outcome": body.share_type,
        "summary": f"Shared {body.share_type}: {body.title}" + (f" (v{version})" if version > 1 else ""),
        "note": body.customer_note,
        "template_id": None,
        "next_follow_up_at": None,
        "waiting_state": "none",
        "performed_by": user["user_id"],
        "performed_by_name": user.get("name", ""),
        "performed_role": user.get("role", ""),
        "timestamp": now,
    }
    await db.leads.update_one({"lead_id": lead_id}, {"$push": {"communications": comm_entry}})

    await create_audit_log("lead", lead_id, "item_shared", user, {
        "share_id": share_id, "share_type": body.share_type,
        "title": body.title, "version": version,
    }, request)

    return {"message": "Shared to customer", "share_id": share_id, "version": version}


@router.post("/{lead_id}/upload")
async def upload_file_share(
    lead_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    share_type: str = Form("file"),
    description: str = Form(None),
    venue_id: str = Form(None),
    venue_name: str = Form(None),
    customer_note: str = Form(None),
    request: Request = None,
    user: dict = Depends(require_role("rm", "admin")),
):
    """Upload and share a file (PDF, image, brochure)."""
    lead = await get_internal_lead(lead_id, user)

    if share_type not in SHARE_TYPES:
        raise HTTPException(400, f"Invalid share_type. Use: {SHARE_TYPES}")

    # Save file
    ext = os.path.splitext(file.filename)[1].lower()
    allowed = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"}
    if ext not in allowed:
        raise HTTPException(400, f"File type not allowed. Use: {allowed}")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    now = now_iso()
    share_id = generate_id("share_")

    # Version handling
    version = 1
    if share_type in ("proposal", "quote"):
        existing = await db.case_shares.count_documents({
            "lead_id": lead_id, "share_type": share_type,
            "venue_id": venue_id, "lifecycle": {"$ne": "revoked"},
        })
        version = existing + 1
        if existing > 0:
            await db.case_shares.update_many(
                {
                    "lead_id": lead_id, "share_type": share_type,
                    "venue_id": venue_id,
                    "lifecycle": {"$in": ["shared", "viewed", "responded"]},
                    "is_current_version": True,
                },
                {"$set": {"is_current_version": False, "lifecycle": "superseded", "superseded_at": now}}
            )

    share = {
        "share_id": share_id,
        "lead_id": lead_id,
        "share_type": share_type,
        "title": title,
        "description": description,
        "venue_id": venue_id,
        "venue_name": venue_name,
        "content": {},
        "change_summary": None,
        "customer_note": customer_note,
        "version": version,
        "is_current_version": True,
        "lifecycle": "shared",
        "customer_response": None,
        "customer_response_note": None,
        "viewed_at": None,
        "viewed_by": None,
        "responded_at": None,
        "file_path": f"/api/case-portal/files/{safe_name}",
        "file_type": ext.lstrip("."),
        "file_name": file.filename,
        "shared_by": user["user_id"],
        "shared_by_name": user.get("name", ""),
        "shared_by_role": user.get("role", ""),
        "created_at": now,
        "updated_at": now,
    }

    await db.case_shares.insert_one(share)
    share.pop("_id", None)

    await _add_customer_timeline_event(lead_id, "file_shared", title, user)

    return {"message": "File shared", "share_id": share_id, "version": version, "file_path": share["file_path"]}


@router.post("/{lead_id}/revoke/{share_id}")
async def revoke_share(
    lead_id: str, share_id: str,
    request: Request, user: dict = Depends(require_role("rm", "admin"))
):
    """Revoke a shared item (hide from customer)."""
    await get_internal_lead(lead_id, user)
    share = await db.case_shares.find_one({"share_id": share_id, "lead_id": lead_id})
    if not share:
        raise HTTPException(404, "Share not found")
    await db.case_shares.update_one(
        {"share_id": share_id},
        {"$set": {"lifecycle": "revoked", "revoked_at": now_iso(), "revoked_by": user["user_id"]}}
    )
    return {"message": "Share revoked"}


@router.get("/{lead_id}/shares")
async def get_internal_shares(lead_id: str, user: dict = Depends(require_role("rm", "admin", "vam", "venue_manager"))):
    """Internal view: all shares for a case (including revoked/superseded)."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1})
    if not lead:
        raise HTTPException(404, "Case not found")
    shares = await db.case_shares.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"shares": shares, "total": len(shares)}


@router.get("/{lead_id}/engagement")
async def get_engagement_summary(lead_id: str, user: dict = Depends(require_role("rm", "admin", "vam", "venue_manager"))):
    """Internal view: engagement/view tracking for all shares."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1})
    if not lead:
        raise HTTPException(404, "Case not found")
    shares = await db.case_shares.find(
        {"lead_id": lead_id, "lifecycle": {"$ne": "revoked"}},
        {"_id": 0, "share_id": 1, "share_type": 1, "title": 1, "version": 1,
         "lifecycle": 1, "viewed_at": 1, "customer_response": 1, "responded_at": 1,
         "created_at": 1, "is_current_version": 1}
    ).sort("created_at", -1).to_list(200)

    summary = {
        "total_shared": len(shares),
        "viewed": len([s for s in shares if s.get("viewed_at")]),
        "responded": len([s for s in shares if s.get("customer_response")]),
        "pending": len([s for s in shares if s.get("lifecycle") == "shared" and not s.get("customer_response")]),
    }

    return {"shares": shares, "summary": summary}


# ── File Serving ──────────────────────────────────────────────────────────────

from fastapi.responses import FileResponse

@router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve uploaded files."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)


# ── Timeline Helpers ──────────────────────────────────────────────────────────

async def _build_customer_timeline(lead_id: str, lead: dict):
    """Build customer-safe timeline from lead data and shares."""
    events = []

    # 1. Case created
    if lead.get("created_at"):
        events.append({
            "type": "enquiry_received",
            "label": CUSTOMER_TIMELINE_EVENTS["enquiry_received"],
            "timestamp": lead["created_at"],
        })

    # 2. RM assigned
    if lead.get("rm_name"):
        events.append({
            "type": "rm_assigned",
            "label": f"{lead['rm_name']} has been assigned as your relationship manager",
            "timestamp": lead.get("rm_assigned_at") or lead.get("created_at"),
        })

    # 3. Share events
    shares = await db.case_shares.find(
        {"lead_id": lead_id, "lifecycle": {"$in": ["shared", "viewed", "responded", "superseded"]}},
        {"_id": 0, "share_type": 1, "title": 1, "created_at": 1, "version": 1, "shared_by_name": 1}
    ).sort("created_at", 1).to_list(100)

    for share in shares:
        stype = share.get("share_type", "file")
        version = share.get("version", 1)
        label = f"{share['title']}"
        if stype in ("proposal", "quote") and version > 1:
            label = f"{share['title']} (v{version})"
        event_type = f"{stype}_shared"
        if stype in ("proposal", "quote") and version > 1:
            event_type = f"revised_{stype}_shared"

        events.append({
            "type": event_type,
            "label": label,
            "timestamp": share["created_at"],
            "by": share.get("shared_by_name"),
        })

    # 4. Stage changes from lead history
    for entry in (lead.get("stage_history") or []):
        stage = entry.get("to") or entry.get("stage")
        if stage and stage in CUSTOMER_STAGE_LABELS:
            events.append({
                "type": "stage_update",
                "label": CUSTOMER_STAGE_LABELS[stage],
                "timestamp": entry.get("timestamp") or entry.get("at"),
            })

    # Sort newest first
    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return events


async def _add_customer_timeline_event(lead_id: str, event_type: str, title: str, user: dict):
    """Push a timeline event to the lead's customer_timeline array."""
    event = {
        "id": generate_id("evt_"),
        "type": event_type,
        "title": title,
        "by": user.get("name", ""),
        "timestamp": now_iso(),
    }
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"customer_timeline": event}, "$set": {"updated_at": now_iso()}}
    )


def _get_status_message(stage: str) -> str:
    """What VenuLoQ is currently doing — customer-friendly."""
    messages = {
        "new": "We're reviewing your enquiry and will reach out shortly.",
        "enquiry_received": "We're reviewing your enquiry and will reach out shortly.",
        "contacted": "We've reached out and are understanding your requirements.",
        "requirement_qualified": "We're understanding your requirements to find the best venues.",
        "venues_shortlisted": "We've curated venue options — check your shared items!",
        "shortlisted": "We've curated venue options — check your shared items!",
        "quote_requested": "We're requesting quotes from venues for you.",
        "quote_received": "Quotes are ready for your review.",
        "site_visit": "A site visit is being planned for you.",
        "site_visit_planned": "A site visit is being planned for you.",
        "site_visit_completed": "We're gathering feedback after your visit.",
        "negotiation": "We're negotiating the best terms for you.",
        "negotiation_in_progress": "We're negotiating the best terms for you.",
        "commercial_accepted": "Terms are agreed — we're preparing your booking.",
        "booking_confirmation_pending": "Almost there! Your booking is being confirmed.",
        "booking_confirmed": "Your booking is confirmed. We're preparing for your event!",
        "booked": "Your booking is confirmed. We're preparing for your event!",
    }
    return messages.get(stage, "We're working on your case.")
