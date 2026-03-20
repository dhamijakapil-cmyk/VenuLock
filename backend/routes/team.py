from fastapi import APIRouter, Depends, Request
from datetime import datetime, timezone, timedelta
from config import db

router = APIRouter(prefix="/team", tags=["team"])


@router.get("/dashboard")
async def team_dashboard(request: Request):
    """Return role-specific dashboard data for the team welcome page."""

    # Try to get current user from auth header
    token = request.headers.get("authorization", "").replace("Bearer ", "")
    user = None
    if token:
        import jwt
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id")
            if user_id:
                user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        except Exception:
            pass

    role = user.get("role", "") if user else ""
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
            my_leads = await db.leads.count_documents({"assigned_rm": user.get("user_id")})
            active_leads = await db.leads.count_documents({
                "assigned_rm": user.get("user_id"),
                "status": {"$nin": ["won", "lost", "closed"]}
            })
            won_leads = await db.leads.count_documents({"assigned_rm": user.get("user_id"), "status": "won"})

            result["quick_stats"] = [
                {"label": "My Leads", "value": my_leads, "icon": "file-text"},
                {"label": "Active", "value": active_leads, "icon": "activity"},
                {"label": "Won", "value": won_leads, "icon": "trophy"},
            ]

            recent = await db.leads.find(
                {"assigned_rm": user.get("user_id")},
                {"_id": 0, "lead_id": 1, "customer_name": 1, "status": 1, "created_at": 1}
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

        elif role == "venue_owner":
            my_venues = await db.venues.count_documents({"owner_email": user.get("email")})
            result["quick_stats"] = [
                {"label": "My Venues", "value": my_venues, "icon": "building"},
            ]

    except Exception as e:
        # Non-critical — return what we have
        print(f"Team dashboard data error: {e}")

    # Announcements (static for now, can be DB-driven later)
    result["announcements"] = [
        {
            "title": "Welcome to VenuLoQ Team Portal",
            "body": "Use the quick actions below to jump into your workflow, or navigate using the sidebar.",
            "type": "info",
        }
    ]

    return result
