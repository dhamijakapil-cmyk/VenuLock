"""
VenuLoQ — HR Management API
=============================
HR-specific endpoints for staff verification, onboarding oversight,
and team management.

ENDPOINTS:
  GET   /hr/dashboard          — HR dashboard stats
  GET   /hr/staff              — All staff with verification status
  GET   /hr/pending            — RMs awaiting verification
  PATCH /hr/verify/{user_id}   — Approve or reject an RM
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from config import db
from models import RMVerificationAction
from utils import require_role, generate_id, create_notification

router = APIRouter(prefix="/hr", tags=["hr"])


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/dashboard")
async def hr_dashboard(user: dict = Depends(require_role("hr", "admin"))):
    """HR dashboard with key stats."""
    total_staff = await db.users.count_documents({"role": {"$in": ["rm", "hr"]}})
    pending = await db.users.count_documents({"role": "rm", "verification_status": "pending"})
    verified = await db.users.count_documents({"role": "rm", "verification_status": "verified"})
    rejected = await db.users.count_documents({"role": "rm", "verification_status": "rejected"})
    profile_incomplete = await db.users.count_documents({"role": "rm", "profile_completed": {"$ne": True}})

    return {
        "total_staff": total_staff,
        "pending_verifications": pending,
        "verified_rms": verified,
        "rejected_rms": rejected,
        "profile_incomplete": profile_incomplete,
    }


@router.get("/staff")
async def get_all_staff(
    status: str = None,
    user: dict = Depends(require_role("hr", "admin")),
):
    """List all RM staff with their verification/profile status."""
    query = {"role": "rm"}
    if status:
        query["verification_status"] = status

    staff = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", -1).to_list(200)

    return {"staff": staff, "total": len(staff)}


@router.get("/pending")
async def get_pending_verifications(user: dict = Depends(require_role("hr", "admin"))):
    """List RMs pending HR verification (profile must be completed)."""
    pending = await db.users.find(
        {"role": "rm", "verification_status": "pending", "profile_completed": True},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", -1).to_list(100)

    return {"pending": pending, "total": len(pending)}


@router.patch("/verify/{user_id}")
async def verify_rm(
    user_id: str,
    body: RMVerificationAction,
    user: dict = Depends(require_role("hr", "admin")),
):
    """Approve or reject an RM's profile."""
    rm = await db.users.find_one({"user_id": user_id, "role": "rm"}, {"_id": 0})
    if not rm:
        raise HTTPException(status_code=404, detail="RM not found")

    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    now = _now()
    new_status = "verified" if body.action == "approve" else "rejected"

    update = {
        "verification_status": new_status,
        "verified_by": user["user_id"],
        "verified_by_name": user["name"],
        "verified_at": now,
        "updated_at": now,
    }

    # Approved RMs become active and can login
    if body.action == "approve":
        update["status"] = "active"
    else:
        update["status"] = "inactive"
        if body.notes:
            update["rejection_reason"] = body.notes

    await db.users.update_one({"user_id": user_id}, {"$set": update})

    # Notify the RM
    if body.action == "approve":
        await create_notification(
            user_id,
            "Profile Verified",
            "Your profile has been verified by HR. You can now log in and start managing leads.",
            "verification",
        )
    else:
        reason = f" Reason: {body.notes}" if body.notes else ""
        await create_notification(
            user_id,
            "Profile Verification Update",
            f"Your profile verification was not approved.{reason} Please contact HR for details.",
            "verification",
        )

    return {
        "message": f"RM {'approved' if body.action == 'approve' else 'rejected'} successfully",
        "user_id": user_id,
        "verification_status": new_status,
    }
