"""
Admin routes for BookMyVenue API.
Handles admin operations: user management, approvals, analytics, commission settings.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from datetime import datetime, timezone

from config import db
from models import UserUpdate, VenueCommissionSettings
from utils import require_role, create_audit_log, create_notification
from services import admin_analytics_service
from services import rm_analytics_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ============== CONTROL ROOM ==============

@router.get("/control-room")
async def get_control_room_analytics(user: dict = Depends(require_role("admin"))):
    """Get comprehensive pipeline and revenue intelligence for admin control room"""
    return await admin_analytics_service.get_control_room_metrics()


# ============== USER MANAGEMENT ==============

@router.get("/users")
async def admin_get_users(
    user: dict = Depends(require_role("admin")),
    role: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """List all users with filters"""
    query = {}
    if role:
        query["role"] = role
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total}


@router.put("/users/{user_id}")
async def admin_update_user(user_id: str, user_data: UserUpdate, admin: dict = Depends(require_role("admin"))):
    """Update a user's profile or status"""
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    return {"message": "User updated"}


# ============== VENUE APPROVALS ==============

@router.put("/venues/{venue_id}/approve")
async def admin_approve_venue(venue_id: str, user: dict = Depends(require_role("admin"))):
    """Approve a venue listing"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "approved"}})
    
    # Notify owner
    await create_notification(
        venue["owner_id"],
        "Venue Approved",
        f"Your venue '{venue['name']}' has been approved and is now live!",
        "approval",
        {"venue_id": venue_id}
    )
    
    return {"message": "Venue approved"}


@router.put("/venues/{venue_id}/reject")
async def admin_reject_venue(venue_id: str, user: dict = Depends(require_role("admin"))):
    """Reject a venue listing"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "rejected"}})
    
    await create_notification(
        venue["owner_id"],
        "Venue Rejected",
        f"Your venue '{venue['name']}' submission has been rejected. Please contact support for details.",
        "approval",
        {"venue_id": venue_id}
    )
    
    return {"message": "Venue rejected"}


# ============== COMMISSION SETTINGS ==============

@router.put("/venues/{venue_id}/commission-settings")
async def update_venue_commission_settings(
    venue_id: str,
    settings: VenueCommissionSettings,
    request: Request,
    user: dict = Depends(require_role("admin"))
):
    """Set custom commission settings for a venue"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    update_data = {}
    if settings.negotiated_commission_percent is not None:
        update_data["negotiated_commission_percent"] = settings.negotiated_commission_percent
    if settings.minimum_platform_fee is not None:
        update_data["minimum_platform_fee"] = settings.minimum_platform_fee
    if settings.min_advance_percent is not None:
        update_data["min_advance_percent"] = settings.min_advance_percent
    if settings.max_advance_percent is not None:
        update_data["max_advance_percent"] = settings.max_advance_percent
    
    if update_data:
        update_data["commission_settings_updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["commission_settings_updated_by"] = user["user_id"]
        await db.venues.update_one({"venue_id": venue_id}, {"$set": update_data})
        
        await create_audit_log("venue", venue_id, "commission_settings_updated", user, update_data, request)
    
    return {"message": "Commission settings updated", "settings": update_data}


@router.get("/venues/{venue_id}/commission-settings")
async def get_venue_commission_settings(venue_id: str, user: dict = Depends(require_role("admin"))):
    """Get commission settings for a venue"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    return {
        "venue_id": venue_id,
        "venue_name": venue.get("name"),
        "negotiated_commission_percent": venue.get("negotiated_commission_percent"),
        "minimum_platform_fee": venue.get("minimum_platform_fee"),
        "min_advance_percent": venue.get("min_advance_percent"),
        "max_advance_percent": venue.get("max_advance_percent"),
        "updated_at": venue.get("commission_settings_updated_at"),
        "updated_by": venue.get("commission_settings_updated_by")
    }


# ============== PLANNER APPROVALS ==============

@router.put("/planners/{planner_id}/approve")
async def admin_approve_planner(planner_id: str, user: dict = Depends(require_role("admin"))):
    """Approve a planner"""
    planner = await db.planners.find_one({"planner_id": planner_id}, {"_id": 0})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    await db.planners.update_one({"planner_id": planner_id}, {"$set": {"status": "approved"}})
    
    # Notify planner
    if planner.get("user_id"):
        await create_notification(
            planner["user_id"],
            "Profile Approved",
            "Your planner profile has been approved and is now visible to customers!",
            "approval",
            {"planner_id": planner_id}
        )
    
    return {"message": "Planner approved"}


# ============== PENDING APPROVALS ==============

@router.get("/pending-approvals")
async def get_pending_approvals(user: dict = Depends(require_role("admin"))):
    """Get all pending venue and planner approvals"""
    pending_venues = await db.venues.find({"status": "pending"}, {"_id": 0}).to_list(100)
    pending_planners = await db.planners.find({"status": "pending"}, {"_id": 0}).to_list(100)
    
    return {
        "pending_venues": pending_venues,
        "pending_planners": pending_planners,
        "total": len(pending_venues) + len(pending_planners)
    }


# ============== ANALYTICS ==============

@router.get("/stats")
async def get_admin_stats(user: dict = Depends(require_role("admin"))):
    """Get admin dashboard statistics"""
    return await admin_analytics_service.get_admin_stats()


@router.get("/rm-performance")
async def get_rm_performance(
    user: dict = Depends(require_role("admin")),
    time_period: str = "month"
):
    """Get RM performance metrics"""
    return await admin_analytics_service.get_rm_performance(time_period)


@router.get("/commission-report")
async def get_commission_report(
    user: dict = Depends(require_role("admin")),
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get commission report with filters"""
    return await admin_analytics_service.get_commission_report(status, start_date, end_date)


# ============== RM PERFORMANCE ANALYTICS ==============

@router.get("/rm-analytics")
async def get_rm_detailed_analytics(
    user: dict = Depends(require_role("admin")),
    time_period: str = "month"
):
    """Get comprehensive RM performance analytics with funnel, conversion, GMV, time metrics"""
    return await rm_analytics_service.get_rm_detailed_analytics(time_period)


@router.get("/sla-breaches")
async def get_sla_breaches(
    user: dict = Depends(require_role("admin"))
):
    """Get aging leads and SLA breach alerts"""
    return await rm_analytics_service.get_aging_leads_and_sla_breaches()


@router.post("/trigger-sla-check")
async def trigger_sla_check(
    user: dict = Depends(require_role("admin"))
):
    """Admin: Manually trigger SLA monitor check"""
    from services import sla_monitor_service
    return await sla_monitor_service.run_sla_check()


@router.post("/send-weekly-digests")
async def send_weekly_digests(
    user: dict = Depends(require_role("admin"))
):
    """Admin: Trigger weekly RM performance digest emails"""
    from services import email_digest_service
    return await email_digest_service.send_weekly_digests_all()


@router.post("/send-sla-escalations")
async def send_sla_escalation_emails(
    user: dict = Depends(require_role("admin"))
):
    """Admin: Trigger critical SLA escalation emails (>2x threshold)"""
    from services import email_digest_service
    return await email_digest_service.send_sla_escalation_emails()


# ============== CONVERSION INTELLIGENCE ==============

@router.get("/conversion-intelligence")
async def get_conversion_intelligence_data(
    user: dict = Depends(require_role("admin")),
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
    source: Optional[str] = None,
):
    """
    Get conversion intelligence metrics with optional filters.
    
    Query params:
    - date_range: "7", "30", "90" for last N days
    - start_date, end_date: Custom date range (ISO format)
    - city: Filter by city
    - rm_id: Filter by RM
    - source: Filter by lead source (Meta, Google, Organic, etc.)
    """
    from services import conversion_intelligence_service
    return await conversion_intelligence_service.get_conversion_intelligence(
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        city=city,
        rm_id=rm_id,
        source=source,
    )


@router.get("/conversion-intelligence/filters")
async def get_conversion_filter_options(
    user: dict = Depends(require_role("admin")),
):
    """Get available filter options (cities, RMs, sources) for conversion intelligence."""
    from services import conversion_intelligence_service
    return await conversion_intelligence_service.get_filter_options()


@router.get("/conversion-intelligence/export")
async def export_conversion_data(
    user: dict = Depends(require_role("admin")),
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
    source: Optional[str] = None,
):
    """Export lead data for CSV download."""
    from services import conversion_intelligence_service
    return await conversion_intelligence_service.export_conversion_data(
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        city=city,
        rm_id=rm_id,
        source=source,
    )


# ============== CHANNEL PERFORMANCE ==============

@router.get("/channel-performance")
async def get_channel_performance_data(
    user: dict = Depends(require_role("admin")),
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
):
    """
    Get channel/source performance metrics.
    
    Returns leads, GMV, commission, and conversion rate per source.
    """
    from services import channel_analytics_service
    return await channel_analytics_service.get_channel_performance(
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        city=city,
        rm_id=rm_id,
    )


@router.post("/backfill-lead-sources")
async def backfill_lead_sources(
    user: dict = Depends(require_role("admin")),
):
    """Backfill existing leads with 'Direct' source if missing."""
    from services import channel_analytics_service
    return await channel_analytics_service.backfill_lead_sources()
