"""
VenuLoQ — Owner Onboarding (Public + Internal)
Secure token-based onboarding flow for venue owners.
Real email delivery via Resend + WhatsApp deep link.
"""
import os
import uuid
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from urllib.parse import quote
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
logger = logging.getLogger("onboarding")

TERMS_VERSION = "1.0.0"
TOKEN_EXPIRY_DAYS = 7


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_db(request: Request):
    from config import db as app_db
    return app_db


async def get_current_user(request: Request):
    from routes.acquisitions import get_current_user as _get
    return await _get(request)


def generate_token():
    raw = uuid.uuid4().hex + uuid.uuid4().hex
    return hashlib.sha256(raw.encode()).hexdigest()[:48]


# ── Models ──

class OnboardingSend(BaseModel):
    channels: List[str]  # ["whatsapp", "email"]


class OnboardingAccept(BaseModel):
    signer_name: str
    consent_publish: bool = False
    consent_commercial: bool = False
    consent_platform_terms: bool = False
    consent_media_usage: bool = False


class OnboardingDecline(BaseModel):
    reason: Optional[str] = None


# ── Email Template ──

def build_onboarding_email(owner_name: str, venue_name: str, onboarding_link: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:#0B0B0D;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#D4B36A;font-size:22px;font-weight:700;letter-spacing:0.5px;">VenuLoQ</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Venue Onboarding</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0B0B0D;">Dear <strong>{owner_name}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
      Great news! Your venue <strong>"{venue_name}"</strong> has been reviewed and approved for listing on the VenuLoQ platform.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
      To complete the onboarding, please review the venue details and commercial terms, and digitally accept the listing agreement. This takes about 2 minutes.
    </p>
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="{onboarding_link}" target="_blank"
         style="display:inline-block;background:#D4B36A;color:#0B0B0D;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
        Review &amp; Accept
      </a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.5;">
      This link is valid for 7 days. If you have any questions, please contact your VenuLoQ representative.
    </p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#F8F7F4;padding:20px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#999;">
      &copy; {datetime.now().year} VenuLoQ &middot; Premium Event Venues
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


# ── Internal endpoints (auth required) ──

@router.post("/send/{acq_id}")
async def send_onboarding(request: Request, acq_id: str, body: OnboardingSend):
    """Generate token, send email via Resend, build WhatsApp deep link."""
    user = await get_current_user(request)
    if user.get("role") not in {"venue_manager", "admin"}:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    if doc["status"] not in ("approved", "owner_onboarding_pending", "owner_onboarding_sent", "owner_onboarding_viewed", "owner_onboarding_expired"):
        raise HTTPException(400, f"Cannot send onboarding from status '{doc['status']}'")

    valid_channels = [c for c in body.channels if c in ("whatsapp", "email")]
    if not valid_channels:
        raise HTTPException(400, "At least one valid channel required (whatsapp, email)")

    # Generate token (invalidate old if exists)
    token = generate_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRY_DAYS)).isoformat()

    # Build link
    frontend_url = os.environ.get("FRONTEND_URL", "")
    onboarding_link = f"{frontend_url}/onboarding/{token}"

    owner_name = doc.get("owner_name", "Sir/Madam")
    venue_name = doc.get("venue_name", "your venue")
    owner_email = doc.get("owner_email", "")
    owner_phone = doc.get("owner_phone", "")

    # ── Deliver via channels ──
    delivery_results = []

    # Email delivery via Resend
    if "email" in valid_channels:
        if owner_email:
            from utils import send_email_async
            email_html = build_onboarding_email(owner_name, venue_name, onboarding_link)
            subject = f"VenuLoQ — Onboarding for {venue_name}"
            email_sent = await send_email_async(owner_email, subject, email_html)
            delivery_results.append({
                "channel": "email",
                "recipient": owner_email,
                "status": "delivered" if email_sent else "failed",
                "attempted_at": now_iso(),
                "failure_reason": None if email_sent else "Resend delivery failed",
            })
            logger.info(f"[Onboarding] Email {'sent' if email_sent else 'FAILED'} to {owner_email} for {acq_id}")
        else:
            delivery_results.append({
                "channel": "email",
                "recipient": None,
                "status": "skipped",
                "attempted_at": now_iso(),
                "failure_reason": "No email address on record",
            })

    # WhatsApp deep link
    whatsapp_link = None
    if "whatsapp" in valid_channels:
        if owner_phone:
            phone_clean = owner_phone.replace(" ", "").replace("+91", "").replace("-", "")
            if not phone_clean.startswith("91"):
                phone_clean = "91" + phone_clean
            msg = f"Hello {owner_name}, your venue \"{venue_name}\" has been approved for listing on VenuLoQ. Please review and accept the onboarding terms here: {onboarding_link}"
            whatsapp_link = f"https://wa.me/{phone_clean}?text={quote(msg)}"
            delivery_results.append({
                "channel": "whatsapp",
                "recipient": owner_phone,
                "status": "link_generated",
                "attempted_at": now_iso(),
                "whatsapp_link": whatsapp_link,
                "failure_reason": None,
            })
        else:
            delivery_results.append({
                "channel": "whatsapp",
                "recipient": None,
                "status": "skipped",
                "attempted_at": now_iso(),
                "failure_reason": "No phone number on record",
            })

    # Build send record
    onboarding = doc.get("onboarding", {})
    sends = onboarding.get("sends", [])
    send_record = {
        "channels": valid_channels,
        "sent_at": now_iso(),
        "sent_by": user.get("name", user.get("email", "")),
        "sent_by_user_id": user.get("user_id"),
        "token": token,
        "delivery": delivery_results,
    }
    sends.append(send_record)

    onboarding_update = {
        "onboarding.token": token,
        "onboarding.token_expires_at": expires_at,
        "onboarding.issued_by": user.get("name", user.get("email", "")),
        "onboarding.issued_at": now_iso(),
        "onboarding.channels": valid_channels,
        "onboarding.sends": sends,
        "onboarding.invalidated": False,
        "onboarding.terms_version": TERMS_VERSION,
    }

    # Transition status
    new_status = "owner_onboarding_sent"
    history_entry = {
        "action": f"status_change:{doc['status']}->{new_status}",
        "status": new_status,
        "by_user_id": user["user_id"],
        "by_name": user.get("name", ""),
        "by_role": user.get("role"),
        "reason": f"Onboarding link sent via {', '.join(valid_channels)}",
        "timestamp": now_iso(),
    }

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {**onboarding_update, "status": new_status, "updated_at": now_iso()},
            "$push": {"history": history_entry},
        }
    )

    # Determine fallback suggestion
    fallback_suggestion = None
    email_failed = any(d["channel"] == "email" and d["status"] == "failed" for d in delivery_results)
    email_skipped = any(d["channel"] == "email" and d["status"] == "skipped" for d in delivery_results)
    if email_failed and "whatsapp" not in valid_channels:
        fallback_suggestion = "Email delivery failed. Try sending via WhatsApp."
    elif email_skipped and "whatsapp" not in valid_channels:
        fallback_suggestion = "No email on record. Try sending via WhatsApp."

    return {
        "message": "Onboarding link sent",
        "token": token,
        "onboarding_link": onboarding_link,
        "whatsapp_link": whatsapp_link,
        "channels": valid_channels,
        "delivery": delivery_results,
        "fallback_suggestion": fallback_suggestion,
        "expires_at": expires_at,
    }


@router.get("/status/{acq_id}")
async def onboarding_status(request: Request, acq_id: str):
    """Internal: Get onboarding status for an acquisition."""
    user = await get_current_user(request)
    if user.get("role") not in {"venue_manager", "admin", "vam"}:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")

    onboarding = doc.get("onboarding", {})
    return {
        "acquisition_id": acq_id,
        "status": doc["status"],
        "venue_name": doc.get("venue_name"),
        "owner_name": doc.get("owner_name"),
        "owner_phone": doc.get("owner_phone"),
        "owner_email": doc.get("owner_email"),
        "onboarding": {
            "token_issued": bool(onboarding.get("token")),
            "issued_at": onboarding.get("issued_at"),
            "issued_by": onboarding.get("issued_by"),
            "channels": onboarding.get("channels", []),
            "expires_at": onboarding.get("token_expires_at"),
            "sends": onboarding.get("sends", []),
            "viewed_at": onboarding.get("viewed_at"),
            "signer_name": onboarding.get("signer_name"),
            "accepted_at": onboarding.get("accepted_at"),
            "declined_at": onboarding.get("declined_at"),
            "decline_reason": onboarding.get("decline_reason"),
            "terms_version": onboarding.get("terms_version"),
            "invalidated": onboarding.get("invalidated", False),
        },
    }


# ── Public endpoints (no auth — token-based) ──

@router.get("/view/{token}")
async def view_onboarding(request: Request, token: str):
    """Public: Owner views their onboarding page via token."""
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one(
        {"onboarding.token": token, "onboarding.invalidated": {"$ne": True}},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Invalid or expired link")

    onboarding = doc.get("onboarding", {})
    exp = onboarding.get("token_expires_at", "")
    if exp and datetime.fromisoformat(exp) < datetime.now(timezone.utc):
        await db.venue_acquisitions.update_one(
            {"acquisition_id": doc["acquisition_id"]},
            {"$set": {"status": "owner_onboarding_expired", "updated_at": now_iso()}}
        )
        raise HTTPException(410, "This onboarding link has expired")

    if doc["status"] == "owner_onboarding_completed":
        return {
            "venue_name": doc.get("venue_name"),
            "status": "completed",
            "already_accepted": True,
            "signer_name": onboarding.get("signer_name"),
            "accepted_at": onboarding.get("accepted_at"),
        }

    if doc["status"] == "owner_onboarding_declined":
        return {
            "venue_name": doc.get("venue_name"),
            "status": "declined",
            "already_declined": True,
            "signer_name": onboarding.get("signer_name"),
            "accepted_at": onboarding.get("accepted_at"),
        }

    # Mark as viewed (first view)
    if doc["status"] in ("owner_onboarding_sent",):
        await db.venue_acquisitions.update_one(
            {"acquisition_id": doc["acquisition_id"]},
            {"$set": {
                "status": "owner_onboarding_viewed",
                "onboarding.viewed_at": now_iso(),
                "updated_at": now_iso(),
            }}
        )

    return {
        "venue_name": doc.get("venue_name"),
        "owner_name": doc.get("owner_name"),
        "owner_phone": doc.get("owner_phone"),
        "owner_email": doc.get("owner_email"),
        "city": doc.get("city"),
        "locality": doc.get("locality"),
        "venue_type": doc.get("venue_type"),
        "capacity_min": doc.get("capacity_min"),
        "capacity_max": doc.get("capacity_max"),
        "pricing_band_min": doc.get("pricing_band_min"),
        "pricing_band_max": doc.get("pricing_band_max"),
        "publishable_summary": doc.get("publishable_summary"),
        "photos": [p.get("url") for p in (doc.get("photos") or [])[:3]],
        "status": "pending",
        "onboarding": {
            "terms_version": onboarding.get("terms_version"),
            "invalidated": onboarding.get("invalidated", False),
        },
    }


@router.post("/accept/{token}")
async def accept_onboarding(request: Request, token: str, body: OnboardingAccept):
    """Public: Owner accepts onboarding terms."""
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one(
        {"onboarding.token": token, "onboarding.invalidated": {"$ne": True}},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Invalid or expired link")

    if doc["status"] == "owner_onboarding_completed":
        raise HTTPException(400, "Onboarding already accepted")

    onboarding = doc.get("onboarding", {})
    exp = onboarding.get("token_expires_at", "")
    if exp and datetime.fromisoformat(exp) < datetime.now(timezone.utc):
        raise HTTPException(410, "This onboarding link has expired")

    if not body.consent_publish or not body.consent_platform_terms:
        raise HTTPException(400, "Publication authorization and platform terms consent are required")

    now = now_iso()
    forwarded_for = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")

    acceptance_record = {
        "signer_name": body.signer_name,
        "accepted_at": now,
        "terms_version": onboarding.get("terms_version", TERMS_VERSION),
        "consents": {
            "publish": body.consent_publish,
            "commercial": body.consent_commercial,
            "platform_terms": body.consent_platform_terms,
            "media_usage": body.consent_media_usage,
        },
        "ip_address": forwarded_for,
        "user_agent": request.headers.get("User-Agent", ""),
    }

    await db.venue_acquisitions.update_one(
        {"acquisition_id": doc["acquisition_id"]},
        {"$set": {
            "status": "owner_onboarding_completed",
            "onboarding.signer_name": body.signer_name,
            "onboarding.accepted_at": now,
            "onboarding.acceptance_record": acceptance_record,
            "updated_at": now,
        }}
    )

    return {
        "message": "Onboarding accepted",
        "accepted_at": now,
        "venue_name": doc.get("venue_name"),
        "signer_name": body.signer_name,
    }


@router.post("/decline/{token}")
async def decline_onboarding(request: Request, token: str, body: OnboardingDecline):
    """Public: Owner declines onboarding."""
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one(
        {"onboarding.token": token, "onboarding.invalidated": {"$ne": True}},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Invalid or expired link")

    if doc["status"] == "owner_onboarding_completed":
        raise HTTPException(400, "Cannot decline — already accepted")
    if doc["status"] == "owner_onboarding_declined":
        raise HTTPException(400, "Already declined")

    now = now_iso()
    await db.venue_acquisitions.update_one(
        {"acquisition_id": doc["acquisition_id"]},
        {"$set": {
            "status": "owner_onboarding_declined",
            "onboarding.declined_at": now,
            "onboarding.decline_reason": body.reason,
            "updated_at": now,
        }}
    )

    return {"message": "Onboarding declined", "declined_at": now}
