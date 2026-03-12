"""
Notification routes for VenuLoQ API.
Handles fetching and managing in-app notifications for all authenticated users.
"""
from fastapi import APIRouter, Depends
from typing import Optional

from config import db
from utils import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    user: dict = Depends(get_current_user),
    limit: int = 30,
    unread_only: bool = False,
):
    """Get notifications for the current user."""
    query = {"user_id": user["user_id"]}
    if unread_only:
        query["read"] = False

    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    unread_count = await db.notifications.count_documents(
        {"user_id": user["user_id"], "read": False}
    )

    return {
        "notifications": notifications,
        "unread_count": unread_count,
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}},
    )
    return {"success": result.modified_count > 0}


@router.put("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read for the current user."""
    result = await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}},
    )
    return {"success": True, "marked": result.modified_count}
