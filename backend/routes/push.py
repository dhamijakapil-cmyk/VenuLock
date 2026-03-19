"""
Push notification routes for VenuLoQ.
Handles Web Push subscription management and notification delivery.
"""
import os
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pywebpush import webpush, WebPushException

from config import db
from utils import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["push"])

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:admin@venuloq.in")


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict


@router.get("/vapid-public-key")
async def get_vapid_key():
    """Return the VAPID public key for the frontend to use."""
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(
    subscription: PushSubscription,
    user: dict = Depends(get_current_user),
):
    """Store a push subscription for the authenticated user."""
    sub_data = {
        "user_id": user["user_id"],
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Upsert: one subscription per endpoint
    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": sub_data},
        upsert=True,
    )
    return {"success": True}


@router.delete("/unsubscribe")
async def unsubscribe(
    subscription: PushSubscription,
    user: dict = Depends(get_current_user),
):
    """Remove a push subscription."""
    await db.push_subscriptions.delete_one({"endpoint": subscription.endpoint})
    return {"success": True}


async def send_push_to_user(user_id: str, title: str, body: str, url: str = "/"):
    """Send a push notification to all subscriptions for a user."""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured — skipping push notification")
        return 0

    subscriptions = await db.push_subscriptions.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(50)

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": "/icon-192.png",
        "badge": "/icon-192.png",
    })

    sent = 0
    stale_endpoints = []

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"],
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CONTACT},
            )
            sent += 1
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                stale_endpoints.append(sub["endpoint"])
            else:
                logger.error(f"Push failed for {sub['endpoint'][:40]}...: {e}")

    # Clean up stale subscriptions
    if stale_endpoints:
        await db.push_subscriptions.delete_many({"endpoint": {"$in": stale_endpoints}})

    return sent


@router.post("/test")
async def test_notification(user: dict = Depends(get_current_user)):
    """Send a test push notification to the current user."""
    sent = await send_push_to_user(
        user_id=user["user_id"],
        title="VenuLoQ",
        body="Push notifications are working! You'll be notified about your enquiry updates.",
        url="/my-enquiries",
    )
    return {"success": True, "sent": sent}
