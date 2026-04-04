from fastapi import APIRouter, Depends, Request, HTTPException
from datetime import datetime, timezone, timedelta
from config import db
import uuid

router = APIRouter(prefix="/team", tags=["team"])

# ─── Access Control ───────────────────────────────────────────────────
# Whitelist of roles permitted to access any /team/* endpoint.
# customer, venue_owner, and event_planner are explicitly excluded.
TEAM_ALLOWED_ROLES = frozenset({
    "admin", "rm", "hr", "venue_specialist", "vam",
    "finance", "operations", "marketing",
})


def generate_id(prefix="ann"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


async def _get_user_from_token(request: Request):
    """Extract user from Bearer token."""
    token = request.headers.get("authorization", "").replace("Bearer ", "")
    if not token:
        return None
    import jwt
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("user_id")
        if user_id:
            return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    except Exception:
        pass
    return None


async def _require_team_member(request: Request):
    """Extract user and enforce TEAM_ALLOWED_ROLES. Returns user dict or raises 403."""
    user = await _get_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.get("role") not in TEAM_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access restricted to internal team members")
    return user


# ─── Announcements CRUD ──────────────────────────────────────────────

@router.get("/announcements")
async def list_announcements(request: Request):
    """List all active announcements (for welcome dashboard). Sorted by pinned first, then newest."""
    await _require_team_member(request)
    now = datetime.now(timezone.utc).isoformat()
    query = {
        "active": True,
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": now}},
        ]
    }
    announcements = await db.team_announcements.find(
        query, {"_id": 0}
    ).sort([("pinned", -1), ("created_at", -1)]).limit(20).to_list(20)
    return announcements


@router.get("/announcements/all")
async def list_all_announcements(request: Request):
    """Admin: list ALL announcements (including inactive/expired)."""
    user = await _get_user_from_token(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    announcements = await db.team_announcements.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return announcements


@router.post("/announcements")
async def create_announcement(request: Request):
    """Admin: create a new announcement."""
    user = await _get_user_from_token(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    body = await request.json()
    title = body.get("title", "").strip()
    content = body.get("body", "").strip()
    ann_type = body.get("type", "info")
    pinned = body.get("pinned", False)
    expires_at = body.get("expires_at")

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    announcement = {
        "announcement_id": generate_id(),
        "title": title,
        "body": content,
        "type": ann_type if ann_type in ("info", "success", "warning", "urgent") else "info",
        "pinned": bool(pinned),
        "active": True,
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
    }

    await db.team_announcements.insert_one(announcement)
    announcement.pop("_id", None)
    return announcement


@router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, request: Request):
    """Admin: update an existing announcement."""
    user = await _get_user_from_token(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await db.team_announcements.find_one({"announcement_id": announcement_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Announcement not found")

    body = await request.json()
    update = {}
    if "title" in body:
        update["title"] = body["title"].strip()
    if "body" in body:
        update["body"] = body["body"].strip()
    if "type" in body and body["type"] in ("info", "success", "warning", "urgent"):
        update["type"] = body["type"]
    if "pinned" in body:
        update["pinned"] = bool(body["pinned"])
    if "active" in body:
        update["active"] = bool(body["active"])
    if "expires_at" in body:
        update["expires_at"] = body["expires_at"]

    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.team_announcements.update_one(
            {"announcement_id": announcement_id}, {"$set": update}
        )

    updated = await db.team_announcements.find_one(
        {"announcement_id": announcement_id}, {"_id": 0}
    )
    return updated


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, request: Request):
    """Admin: permanently delete an announcement."""
    user = await _get_user_from_token(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.team_announcements.delete_one({"announcement_id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"status": "deleted"}


@router.get("/dashboard")
async def team_dashboard(request: Request):
    """Return role-specific dashboard data for the team welcome page."""
    user = await _require_team_member(request)

    role = user.get("role", "")
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    result = {
        "user_name": user.get("name", "Team Member") if user else "Team Member",
        "role": role,
        "quick_stats": [],
        "recent_activity": [],
        "announcements": [],
    }

    try:
        if role == "admin":
            total_venues = await db.venues.count_documents({})
            total_leads = await db.leads.count_documents({})
            total_users = await db.users.count_documents({})
            pending_venues = await db.venue_onboarding.count_documents({"status": "submitted"})
            new_leads_today = await db.leads.count_documents({"created_at": {"$gte": today_start.isoformat()}})

            result["quick_stats"] = [
                {"label": "Total Venues", "value": total_venues, "icon": "building"},
                {"label": "Total Leads", "value": total_leads, "icon": "file-text"},
                {"label": "Team Members", "value": total_users, "icon": "users"},
                {"label": "Pending Reviews", "value": pending_venues, "icon": "clock"},
            ]

            # Recent leads as activity
            recent_leads = await db.leads.find(
                {}, {"_id": 0, "lead_id": 1, "customer_name": 1, "city": 1, "created_at": 1, "status": 1}
            ).sort("created_at", -1).limit(5).to_list(5)
            for lead in recent_leads:
                result["recent_activity"].append({
                    "type": "lead",
                    "title": f"New enquiry from {lead.get('customer_name', 'Unknown')}",
                    "subtitle": f"{lead.get('city', '')} - {lead.get('status', '')}",
                    "time": lead.get("created_at", ""),
                })

        elif role == "rm":
            my_leads = await db.leads.count_documents({"rm_id": user.get("user_id")})
            active_leads = await db.leads.count_documents({
                "rm_id": user.get("user_id"),
                "stage": {"$nin": ["lost", "closed_not_proceeding"]}
            })
            won_leads = await db.leads.count_documents({"rm_id": user.get("user_id"), "stage": "won"})

            result["quick_stats"] = [
                {"label": "My Leads", "value": my_leads, "icon": "file-text"},
                {"label": "Active", "value": active_leads, "icon": "activity"},
                {"label": "Won", "value": won_leads, "icon": "trophy"},
            ]

            recent = await db.leads.find(
                {"rm_id": user.get("user_id")},
                {"_id": 0, "lead_id": 1, "customer_name": 1, "stage": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5).to_list(5)
            for lead in recent:
                result["recent_activity"].append({
                    "type": "lead",
                    "title": lead.get("customer_name", "Unknown"),
                    "subtitle": f"Status: {lead.get('status', 'new')}",
                    "time": lead.get("created_at", ""),
                })

        elif role == "hr":
            pending_verification = await db.users.count_documents({"verification_status": "pending"})
            total_staff = await db.users.count_documents({"role": {"$ne": "customer"}})
            verified = await db.users.count_documents({"verification_status": "verified"})

            result["quick_stats"] = [
                {"label": "Total Staff", "value": total_staff, "icon": "users"},
                {"label": "Pending Verification", "value": pending_verification, "icon": "clock"},
                {"label": "Verified", "value": verified, "icon": "check-circle"},
            ]

            pending_users = await db.users.find(
                {"verification_status": "pending"},
                {"_id": 0, "user_id": 1, "name": 1, "role": 1, "created_at": 1}
            ).limit(5).to_list(5)
            for u in pending_users:
                result["recent_activity"].append({
                    "type": "verification",
                    "title": f"{u.get('name', 'Unknown')} needs verification",
                    "subtitle": f"Role: {u.get('role', '')}",
                    "time": u.get("created_at", ""),
                })

        elif role == "venue_specialist":
            my_drafts = await db.venue_onboarding.count_documents({"created_by": user.get("user_id"), "status": "draft"})
            submitted = await db.venue_onboarding.count_documents({"created_by": user.get("user_id"), "status": "submitted"})
            approved = await db.venue_onboarding.count_documents({"created_by": user.get("user_id"), "status": "approved"})
            changes = await db.venue_onboarding.count_documents({"created_by": user.get("user_id"), "status": "changes_requested"})

            result["quick_stats"] = [
                {"label": "Drafts", "value": my_drafts, "icon": "edit"},
                {"label": "In Review", "value": submitted, "icon": "clock"},
                {"label": "Approved", "value": approved, "icon": "check-circle"},
                {"label": "Changes Req.", "value": changes, "icon": "alert-circle"},
            ]

            recent_venues = await db.venue_onboarding.find(
                {"created_by": user.get("user_id")},
                {"_id": 0, "venue_onboarding_id": 1, "name": 1, "status": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5).to_list(5)
            for v in recent_venues:
                result["recent_activity"].append({
                    "type": "venue",
                    "title": v.get("name", "Unnamed Venue"),
                    "subtitle": f"Status: {v.get('status', 'draft')}",
                    "time": v.get("created_at", ""),
                })

        elif role == "vam":
            pending_review = await db.venue_onboarding.count_documents({"status": "submitted"})
            approved = await db.venue_onboarding.count_documents({"status": "approved"})
            changes_sent = await db.venue_onboarding.count_documents({"status": "changes_requested"})

            result["quick_stats"] = [
                {"label": "Pending Review", "value": pending_review, "icon": "clock"},
                {"label": "Approved", "value": approved, "icon": "check-circle"},
                {"label": "Changes Sent", "value": changes_sent, "icon": "alert-circle"},
            ]

            pending = await db.venue_onboarding.find(
                {"status": "submitted"},
                {"_id": 0, "venue_onboarding_id": 1, "name": 1, "city": 1, "submitted_at": 1}
            ).sort("submitted_at", -1).limit(5).to_list(5)
            for v in pending:
                result["recent_activity"].append({
                    "type": "review",
                    "title": v.get("name", "Unnamed"),
                    "subtitle": f"City: {v.get('city', '')}",
                    "time": v.get("submitted_at", ""),
                })

    except Exception as e:
        # Non-critical — return what we have
        print(f"Team dashboard data error: {e}")

    # Announcements from database
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        ann_query = {
            "active": True,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gt": now_iso}},
            ]
        }
        db_announcements = await db.team_announcements.find(
            ann_query, {"_id": 0}
        ).sort([("pinned", -1), ("created_at", -1)]).limit(5).to_list(5)
        result["announcements"] = db_announcements if db_announcements else []
    except Exception:
        result["announcements"] = []

    return result



# ─── Sidebar Badge Counts ────────────────────────────────────────────

@router.get("/badge-counts")
async def get_badge_counts(request: Request):
    """Return role-specific unread/pending counts for sidebar badges."""
    user = await _require_team_member(request)

    role = user.get("role", "")
    counts = {}

    try:
        if role == "admin":
            counts["Venues"] = await db.venues.count_documents({"status": "pending"})
            counts["Client Cases"] = await db.leads.count_documents({"status": "new"})
            counts["Users"] = await db.users.count_documents({"verification_status": "pending"})

        elif role == "hr":
            counts["Staff Verification"] = await db.users.count_documents({"verification_status": "pending"})

        elif role == "rm":
            uid = user.get("user_id")
            counts["Pipeline"] = await db.leads.count_documents({
                "assigned_rm": uid,
                "status": {"$nin": ["won", "lost", "closed"]}
            })

        elif role == "vam":
            counts["Review Queue"] = await db.venue_onboarding.count_documents({"status": "submitted"})
            counts["Review Queue"] += await db.venue_edit_requests.count_documents({"status": "pending"})

        elif role == "venue_specialist":
            uid = user.get("user_id")
            counts["My Venues"] = await db.venue_onboarding.count_documents({
                "created_by": uid, "status": "changes_requested"
            })

        elif role == "finance":
            counts["Finance Dashboard"] = await db.payments.count_documents({"status": "pending"})

        elif role == "operations":
            counts["Operations"] = await db.venue_onboarding.count_documents({"status": "submitted"})

        elif role == "marketing":
            counts["Marketing"] = await db.leads.count_documents({"status": "new"})

    except Exception as e:
        print(f"Badge count error: {e}")

    return counts
