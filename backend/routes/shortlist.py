"""
VenuLoQ — Shortlist / Share Workflow
RM curates venue shortlists and shares them with customers via tokenized public links.
Customers can provide feedback per venue without logging in.
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["shortlist"])

TOKEN_EXPIRY_DAYS = 14


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_db():
    from config import db as app_db
    return app_db


async def get_current_user(request: Request):
    from utils import get_current_user as _get
    return await _get(request)


def generate_share_token():
    raw = uuid.uuid4().hex + uuid.uuid4().hex
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


# ── Models ──

class ShortlistAdd(BaseModel):
    venue_id: str


class ShortlistRemove(BaseModel):
    venue_id: str


class ShareShortlist(BaseModel):
    channels: List[str] = ["whatsapp"]
    message: Optional[str] = None


class CustomerFeedback(BaseModel):
    feedback: List[dict]  # [{"venue_id": "...", "preference": "interested|not_interested|maybe", "comment": "..."}]


# ── RM endpoints (auth required) ──

@router.get("/workflow/{lead_id}/shortlist")
async def get_shortlist(request: Request, lead_id: str):
    """Get the current shortlist for a lead, enriched with venue details."""
    user = await get_current_user(request)
    db = get_db()

    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1, "shortlist": 1, "shortlist_shares": 1})
    if not lead:
        raise HTTPException(404, "Lead not found")

    shortlist = lead.get("shortlist", [])
    enriched = []
    for item in shortlist:
        venue = await db.venues.find_one(
            {"venue_id": item["venue_id"]},
            {"_id": 0, "venue_id": 1, "name": 1, "city": 1, "area": 1, "images": 1, "pricing": 1, "capacity_min": 1, "capacity_max": 1, "slug": 1}
        )
        if venue:
            enriched.append({
                **item,
                "venue_name": venue.get("name", ""),
                "city": venue.get("city", ""),
                "area": venue.get("area", ""),
                "image": (venue.get("images") or [""])[0],
                "pricing": venue.get("pricing"),
                "capacity_min": venue.get("capacity_min"),
                "capacity_max": venue.get("capacity_max"),
            })
        else:
            enriched.append({**item, "venue_name": "Unknown Venue"})

    shares = lead.get("shortlist_shares", [])

    return {
        "lead_id": lead_id,
        "shortlist": enriched,
        "total": len(enriched),
        "shares": shares,
    }


@router.post("/workflow/{lead_id}/shortlist/add")
async def add_to_shortlist(request: Request, lead_id: str, body: ShortlistAdd):
    """Add a venue to the lead's shortlist."""
    user = await get_current_user(request)
    db = get_db()

    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1, "rm_id": 1, "shortlist": 1})
    if not lead:
        raise HTTPException(404, "Lead not found")

    venue = await db.venues.find_one({"venue_id": body.venue_id}, {"_id": 0, "venue_id": 1, "name": 1})
    if not venue:
        raise HTTPException(404, "Venue not found")

    shortlist = lead.get("shortlist", [])
    if any(s["venue_id"] == body.venue_id for s in shortlist):
        raise HTTPException(400, "Venue already in shortlist")

    entry = {
        "venue_id": body.venue_id,
        "added_at": now_iso(),
        "added_by": user.get("name", ""),
        "added_by_user_id": user.get("user_id"),
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"shortlist": entry}, "$set": {"updated_at": now_iso()}}
    )

    # Log activity
    from routes.workflow import _log_activity
    await _log_activity(
        lead_id, "shortlist_add", user["user_id"], user.get("name", ""),
        detail=f"Added \"{venue['name']}\" to shortlist",
        meta={"venue_id": body.venue_id, "venue_name": venue["name"]},
    )

    return {"message": f"Added to shortlist", "venue_id": body.venue_id, "venue_name": venue["name"]}


@router.post("/workflow/{lead_id}/shortlist/remove")
async def remove_from_shortlist(request: Request, lead_id: str, body: ShortlistRemove):
    """Remove a venue from the lead's shortlist."""
    user = await get_current_user(request)
    db = get_db()

    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "lead_id": 1})
    if not lead:
        raise HTTPException(404, "Lead not found")

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$pull": {"shortlist": {"venue_id": body.venue_id}}, "$set": {"updated_at": now_iso()}}
    )

    return {"message": "Removed from shortlist", "venue_id": body.venue_id}


@router.post("/workflow/{lead_id}/share-shortlist")
async def share_shortlist(request: Request, lead_id: str, body: ShareShortlist):
    """Generate a shareable link for the shortlist and log the share."""
    user = await get_current_user(request)
    db = get_db()

    lead = await db.leads.find_one(
        {"lead_id": lead_id},
        {"_id": 0, "lead_id": 1, "shortlist": 1, "customer_name": 1, "customer_phone": 1, "customer_email": 1}
    )
    if not lead:
        raise HTTPException(404, "Lead not found")

    shortlist = lead.get("shortlist", [])
    if not shortlist:
        raise HTTPException(400, "Shortlist is empty — add venues first")

    share_token = generate_share_token()
    frontend_url = os.environ.get("FRONTEND_URL", "")
    share_link = f"{frontend_url}/shortlist/{share_token}"

    now = now_iso()
    share_record = {
        "share_token": share_token,
        "shared_at": now,
        "shared_by": user.get("name", ""),
        "shared_by_user_id": user.get("user_id"),
        "channels": body.channels,
        "venue_ids": [s["venue_id"] for s in shortlist],
        "venue_count": len(shortlist),
        "message": body.message,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRY_DAYS)).isoformat(),
        "customer_viewed_at": None,
        "customer_feedback_at": None,
        "feedback_received": False,
    }

    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"shortlist_shares": share_record}, "$set": {"updated_at": now}}
    )

    # Build WhatsApp link if applicable
    whatsapp_link = None
    customer_name = lead.get("customer_name", "")
    customer_phone = lead.get("customer_phone", "")
    if "whatsapp" in body.channels and customer_phone:
        phone_clean = customer_phone.replace(" ", "").replace("+91", "").replace("-", "")
        if not phone_clean.startswith("91"):
            phone_clean = "91" + phone_clean
        from urllib.parse import quote
        msg = body.message or f"Hi {customer_name.split(' ')[0] if customer_name else ''}! Here are some handpicked venues for you from VenuLoQ: {share_link}"
        whatsapp_link = f"https://wa.me/{phone_clean}?text={quote(msg)}"

    # Send email if applicable
    email_sent = False
    if "email" in body.channels and lead.get("customer_email"):
        from utils import send_email_async
        email_html = build_shortlist_email(customer_name, share_link, len(shortlist))
        email_sent = await send_email_async(
            lead["customer_email"],
            f"Your Curated Venue Shortlist — VenuLoQ",
            email_html,
        )

    # Log activity
    from routes.workflow import _log_activity
    await _log_activity(
        lead_id, "shortlist_shared", user["user_id"], user.get("name", ""),
        detail=f"Shared shortlist ({len(shortlist)} venues) via {', '.join(body.channels)}",
        meta={"share_token": share_token, "venue_count": len(shortlist), "channels": body.channels},
    )

    return {
        "message": "Shortlist shared",
        "share_link": share_link,
        "share_token": share_token,
        "whatsapp_link": whatsapp_link,
        "email_sent": email_sent,
        "venue_count": len(shortlist),
    }


# ── Public endpoints (no auth — token-based) ──

@router.get("/shortlist/{share_token}")
async def view_shortlist(request: Request, share_token: str):
    """Public: Customer views their curated shortlist."""
    db = get_db()

    lead = await db.leads.find_one(
        {"shortlist_shares.share_token": share_token},
        {"_id": 0, "lead_id": 1, "customer_name": 1, "shortlist": 1, "shortlist_shares": 1}
    )
    if not lead:
        raise HTTPException(404, "Invalid or expired link")

    # Find the specific share record
    share = next((s for s in (lead.get("shortlist_shares") or []) if s["share_token"] == share_token), None)
    if not share:
        raise HTTPException(404, "Invalid link")

    # Check expiry
    exp = share.get("expires_at", "")
    if exp and datetime.fromisoformat(exp) < datetime.now(timezone.utc):
        raise HTTPException(410, "This shortlist link has expired")

    # Mark as viewed
    if not share.get("customer_viewed_at"):
        await db.leads.update_one(
            {"lead_id": lead["lead_id"], "shortlist_shares.share_token": share_token},
            {"$set": {"shortlist_shares.$.customer_viewed_at": now_iso()}}
        )

    # Get venue details for the shared venues
    venue_ids = share.get("venue_ids", [])
    venues = []
    for vid in venue_ids:
        venue = await db.venues.find_one(
            {"venue_id": vid},
            {"_id": 0, "venue_id": 1, "name": 1, "city": 1, "area": 1, "images": 1, "pricing": 1, "capacity_min": 1, "capacity_max": 1, "slug": 1}
        )
        if venue:
            # Check if customer already gave feedback
            existing_fb = None
            if share.get("customer_feedback"):
                existing_fb = next((f for f in share["customer_feedback"] if f["venue_id"] == vid), None)
            venues.append({
                "venue_id": venue["venue_id"],
                "name": venue.get("name", ""),
                "city": venue.get("city", ""),
                "area": venue.get("area", ""),
                "image": (venue.get("images") or [""])[0],
                "pricing": venue.get("pricing"),
                "capacity_min": venue.get("capacity_min"),
                "capacity_max": venue.get("capacity_max"),
                "slug": venue.get("slug"),
                "feedback": existing_fb,
            })

    return {
        "customer_name": lead.get("customer_name", ""),
        "venues": venues,
        "total": len(venues),
        "message": share.get("message"),
        "shared_at": share.get("shared_at"),
        "feedback_received": share.get("feedback_received", False),
    }


@router.post("/shortlist/{share_token}/feedback")
async def submit_feedback(request: Request, share_token: str, body: CustomerFeedback):
    """Public: Customer submits venue preference feedback."""
    db = get_db()

    lead = await db.leads.find_one(
        {"shortlist_shares.share_token": share_token},
        {"_id": 0, "lead_id": 1, "shortlist_shares": 1}
    )
    if not lead:
        raise HTTPException(404, "Invalid link")

    share = next((s for s in (lead.get("shortlist_shares") or []) if s["share_token"] == share_token), None)
    if not share:
        raise HTTPException(404, "Invalid link")

    exp = share.get("expires_at", "")
    if exp and datetime.fromisoformat(exp) < datetime.now(timezone.utc):
        raise HTTPException(410, "This shortlist link has expired")

    now = now_iso()
    feedback_list = []
    for item in body.feedback:
        if item.get("venue_id") and item.get("preference") in ("interested", "not_interested", "maybe"):
            feedback_list.append({
                "venue_id": item["venue_id"],
                "preference": item["preference"],
                "comment": item.get("comment", ""),
                "submitted_at": now,
            })

    if not feedback_list:
        raise HTTPException(400, "No valid feedback provided")

    await db.leads.update_one(
        {"lead_id": lead["lead_id"], "shortlist_shares.share_token": share_token},
        {"$set": {
            "shortlist_shares.$.customer_feedback": feedback_list,
            "shortlist_shares.$.customer_feedback_at": now,
            "shortlist_shares.$.feedback_received": True,
            "updated_at": now,
        }}
    )

    # Log activity
    interested_count = sum(1 for f in feedback_list if f["preference"] == "interested")
    from routes.workflow import _log_activity
    await _log_activity(
        lead["lead_id"], "shortlist_feedback_received", "customer", lead.get("customer_name", "Customer"),
        detail=f"Customer responded to shortlist: {interested_count}/{len(feedback_list)} interested",
        meta={"feedback": feedback_list, "interested": interested_count, "total": len(feedback_list)},
    )

    return {
        "message": "Feedback submitted — thank you!",
        "submitted": len(feedback_list),
        "interested": interested_count,
    }


# ── Helpers ──

def build_shortlist_email(customer_name: str, share_link: str, venue_count: int) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <tr><td style="background:#0B0B0D;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#D4B36A;font-size:22px;font-weight:700;">VenuLoQ</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Your Venue Shortlist</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0B0B0D;">Hi <strong>{customer_name.split(' ')[0] if customer_name else ''}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
      We've curated <strong>{venue_count} venue{"s" if venue_count != 1 else ""}</strong> based on your preferences. Review them and let us know which ones interest you.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="{share_link}" target="_blank"
         style="display:inline-block;background:#D4B36A;color:#0B0B0D;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
        View Your Shortlist
      </a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.5;">
      This link is valid for 14 days. Simply tap on each venue to share your preference.
    </p>
  </td></tr>
  <tr><td style="background:#F8F7F4;padding:20px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#999;">&copy; {datetime.now().year} VenuLoQ</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""
