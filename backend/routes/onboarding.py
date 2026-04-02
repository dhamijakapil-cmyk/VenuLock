"""
VenuLoQ — Owner Onboarding (Public + Internal)
Secure token-based onboarding flow for venue owners.
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

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


# ── Internal endpoints (auth required) ──

@router.post("/send/{acq_id}")
async def send_onboarding(request: Request, acq_id: str, body: OnboardingSend):
    """Generate token and mark onboarding as sent."""
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

    onboarding = doc.get("onboarding", {})
    sends = onboarding.get("sends", [])
    sends.append({
        "channels": valid_channels,
        "sent_at": now_iso(),
        "sent_by": user.get("name", user.get("email", "")),
        "sent_by_user_id": user.get("user_id"),
        "token": token,
    })

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
        "action": f"status_change:{doc['status']}→{new_status}",
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

    # Build link
    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
    onboarding_link = f"{frontend_url}/onboarding/{token}"

    # Build WhatsApp/email messages
    owner_name = doc.get("owner_name", "Sir/Madam")
    venue_name = doc.get("venue_name", "your venue")
    phone = doc.get("owner_phone", "")

    whatsapp_link = None
    if "whatsapp" in valid_channels and phone:
        msg = f"Hello {owner_name}, your venue '{venue_name}' has been approved for listing on VenuLoQ. Please review and accept the onboarding terms: {onboarding_link}"
        whatsapp_link = f"https://wa.me/91{phone.replace(' ','').replace('+91','')}?text={msg}"

    return {
        "message": "Onboarding link sent",
        "token": token,
        "onboarding_link": onboarding_link,
        "whatsapp_link": whatsapp_link,
        "channels": valid_channels,
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


# ── Public endpoints (no auth) ──

@router.get("/view/{token}")
async def view_onboarding(request: Request, token: str):
    """Public: Owner views onboarding page via secure token."""
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one(
        {"onboarding.token": token},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Invalid or expired link")

    onboarding = doc.get("onboarding", {})

    # Check invalidated
    if onboarding.get("invalidated"):
        raise HTTPException(410, "This link has been invalidated. Please request a new one.")

    # Check expiry
    expires_at = onboarding.get("token_expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at)
            if datetime.now(timezone.utc) > exp:
                await db.venue_acquisitions.update_one(
                    {"onboarding.token": token},
                    {"$set": {"status": "owner_onboarding_expired", "onboarding.invalidated": True}}
                )
                raise HTTPException(410, "This link has expired. Please contact VenuLoQ for a new link.")
        except ValueError:
            pass

    # Check already completed
    already_completed = onboarding.get("accepted_at") is not None
    already_declined = onboarding.get("declined_at") is not None

    # Mark as viewed (first time only)
    if not onboarding.get("viewed_at") and not already_completed and not already_declined:
        await db.venue_acquisitions.update_one(
            {"onboarding.token": token},
            {
                "$set": {
                    "onboarding.viewed_at": now_iso(),
                    "status": "owner_onboarding_viewed",
                    "updated_at": now_iso(),
                },
                "$push": {"history": {
                    "action": "owner_viewed_onboarding",
                    "status": "owner_onboarding_viewed",
                    "by_name": doc.get("owner_name", "Owner"),
                    "by_role": "owner",
                    "timestamp": now_iso(),
                }},
            }
        )

    # Return owner-safe data only
    return {
        "venue_name": doc.get("venue_name"),
        "city": doc.get("city"),
        "locality": doc.get("locality"),
        "venue_type": doc.get("venue_type"),
        "capacity_min": doc.get("capacity_min"),
        "capacity_max": doc.get("capacity_max"),
        "owner_name": doc.get("owner_name"),
        "owner_phone": doc.get("owner_phone"),
        "owner_email": doc.get("owner_email"),
        "publishable_summary": doc.get("publishable_summary"),
        "pricing_band_min": doc.get("pricing_band_min"),
        "pricing_band_max": doc.get("pricing_band_max"),
        "terms_version": TERMS_VERSION,
        "already_completed": already_completed,
        "already_declined": already_declined,
        "signer_name": onboarding.get("signer_name"),
        "accepted_at": onboarding.get("accepted_at"),
    }


@router.post("/accept/{token}")
async def accept_onboarding(request: Request, token: str, body: OnboardingAccept):
    """Public: Owner accepts onboarding terms."""
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"onboarding.token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Invalid or expired link")

    onboarding = doc.get("onboarding", {})
    if onboarding.get("invalidated"):
        raise HTTPException(410, "Link invalidated")
    if onboarding.get("accepted_at"):
        raise HTTPException(400, "Already accepted")

    # Check expiry
    expires_at = onboarding.get("token_expires_at")
    if expires_at:
        try:
            if datetime.now(timezone.utc) > datetime.fromisoformat(expires_at):
                raise HTTPException(410, "Link expired")
        except ValueError:
            pass

    # Validate consents
    if not body.signer_name.strip():
        raise HTTPException(400, "Signer name is required")
    if not body.consent_publish:
        raise HTTPException(400, "Consent to publish/list is required")
    if not body.consent_platform_terms:
        raise HTTPException(400, "Consent to platform terms is required")

    now = now_iso()
    await db.venue_acquisitions.update_one(
        {"onboarding.token": token},
        {
            "$set": {
                "status": "owner_onboarding_completed",
                "updated_at": now,
                "onboarding.signer_name": body.signer_name.strip(),
                "onboarding.accepted_at": now,
                "onboarding.consents": {
                    "publish": body.consent_publish,
                    "commercial": body.consent_commercial,
                    "platform_terms": body.consent_platform_terms,
                    "media_usage": body.consent_media_usage,
                },
                "onboarding.acceptance_record": {
                    "signer_name": body.signer_name.strip(),
                    "accepted_at": now,
                    "terms_version": TERMS_VERSION,
                    "ip_address": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                },
            },
            "$push": {"history": {
                "action": "owner_accepted_onboarding",
                "status": "owner_onboarding_completed",
                "by_name": body.signer_name.strip(),
                "by_role": "owner",
                "timestamp": now,
                "notes": f"Terms v{TERMS_VERSION} accepted. Consents: publish={body.consent_publish}, commercial={body.consent_commercial}, platform={body.consent_platform_terms}, media={body.consent_media_usage}",
            }},
        }
    )

    return {"message": "Onboarding accepted", "accepted_at": now, "terms_version": TERMS_VERSION}


@router.post("/decline/{token}")
async def decline_onboarding(request: Request, token: str, body: OnboardingDecline):
    """Public: Owner declines onboarding."""
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"onboarding.token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Invalid or expired link")

    onboarding = doc.get("onboarding", {})
    if onboarding.get("invalidated"):
        raise HTTPException(410, "Link invalidated")
    if onboarding.get("accepted_at"):
        raise HTTPException(400, "Already accepted — cannot decline")

    now = now_iso()
    await db.venue_acquisitions.update_one(
        {"onboarding.token": token},
        {
            "$set": {
                "status": "owner_onboarding_declined",
                "updated_at": now,
                "onboarding.declined_at": now,
                "onboarding.decline_reason": body.reason,
            },
            "$push": {"history": {
                "action": "owner_declined_onboarding",
                "status": "owner_onboarding_declined",
                "by_name": doc.get("owner_name", "Owner"),
                "by_role": "owner",
                "reason": body.reason,
                "timestamp": now,
            }},
        }
    )

    return {"message": "Onboarding declined", "declined_at": now}
