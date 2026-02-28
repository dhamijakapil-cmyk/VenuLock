"""
Availability and Date Hold routes for BookMyVenue API.
Handles venue availability management and date hold (tentative lock) operations.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional

from config import db
from models import AvailabilityUpdate, AvailabilityBulkUpdate, DateHoldRequest, DateHoldExtendRequest
from utils import generate_id, require_role, create_audit_log
from services import availability_service

router = APIRouter(tags=["availability"])


# ============== VENUE AVAILABILITY ==============

@router.get("/venues/{venue_id}/availability")
async def get_venue_availability(venue_id: str, month: Optional[str] = None):
    """Get venue availability for a month."""
    slots = await availability_service.get_venue_availability(venue_id, month)
    return {"venue_id": venue_id, "slots": slots}


@router.put("/venues/{venue_id}/availability")
async def update_venue_availability(
    venue_id: str,
    availability: AvailabilityUpdate,
    user: dict = Depends(require_role("venue_owner", "admin"))
):
    """Update venue availability slots."""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if user["role"] != "admin" and venue["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    slots_data = [slot.model_dump() for slot in availability.slots]
    await availability_service.update_venue_availability(venue_id, slots_data)
    
    return {"message": "Availability updated"}


@router.post("/venues/{venue_id}/availability/bulk")
async def bulk_update_availability(
    venue_id: str,
    bulk_data: AvailabilityBulkUpdate,
    user: dict = Depends(require_role("venue_owner", "admin"))
):
    """Bulk update availability for multiple dates."""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if user["role"] != "admin" and venue.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    count = await availability_service.bulk_update_availability(
        venue_id,
        bulk_data.dates,
        bulk_data.status,
        bulk_data.time_slot,
        bulk_data.notes,
        user["user_id"]
    )
    
    return {"message": f"Updated availability for {count} dates", "dates": bulk_data.dates}


# ============== DATE HOLDS ==============

@router.post("/venues/{venue_id}/hold-date")
async def hold_date_for_lead(
    venue_id: str,
    hold_request: DateHoldRequest,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """RM holds a date for a client case (tentative lock)."""
    # Verify venue exists
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Verify lead exists
    lead = await db.leads.find_one({"lead_id": hold_request.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if date is already blocked or booked
    existing = await db.venue_availability.find_one({
        "venue_id": venue_id,
        "date": hold_request.date,
        "status": {"$in": ["blocked", "booked"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Date is {existing['status']} and cannot be held")
    
    # Check for existing hold on this date
    from datetime import datetime, timezone
    existing_hold = await db.date_holds.find_one({
        "venue_id": venue_id,
        "date": hold_request.date,
        "status": "active",
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    if existing_hold and existing_hold.get("lead_id") != hold_request.lead_id:
        raise HTTPException(status_code=400, detail="Date is already held by another client case")
    
    hold_id = generate_id("hold_")
    
    hold_record = await availability_service.create_date_hold(
        venue_id=venue_id,
        venue_name=venue.get("name"),
        date=hold_request.date,
        lead_id=hold_request.lead_id,
        customer_name=lead.get("customer_name"),
        event_type=lead.get("event_type"),
        time_slot=hold_request.time_slot,
        expiry_hours=hold_request.expiry_hours,
        user_id=user["user_id"],
        user_name=user["name"],
        hold_id=hold_id
    )
    
    # Create audit log
    await create_audit_log("date_hold", hold_id, "created", user, {
        "venue_id": venue_id,
        "date": hold_request.date,
        "lead_id": hold_request.lead_id,
        "expires_at": hold_record["expires_at"]
    }, request)
    
    return {
        "message": "Date held successfully",
        "hold": hold_record
    }


@router.delete("/venues/{venue_id}/hold-date/{hold_id}")
async def release_date_hold(
    venue_id: str,
    hold_id: str,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Release a date hold."""
    hold = await availability_service.release_date_hold(hold_id, venue_id, user["user_id"])
    
    if not hold:
        raise HTTPException(status_code=404, detail="Hold not found")
    
    # Create audit log
    await create_audit_log("date_hold", hold_id, "released", user, {
        "venue_id": venue_id,
        "date": hold["date"]
    }, request)
    
    return {"message": "Date hold released"}


@router.post("/venues/{venue_id}/hold-date/{hold_id}/extend")
async def extend_date_hold(
    venue_id: str,
    hold_id: str,
    extend_request: DateHoldExtendRequest,
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Extend a date hold (max 2 extensions without admin approval)."""
    success, message, result = await availability_service.extend_date_hold(
        hold_id=hold_id,
        venue_id=venue_id,
        extension_hours=extend_request.extension_hours,
        user_id=user["user_id"],
        is_admin=user.get("role") == "admin"
    )
    
    if not success:
        if "not found" in message.lower():
            raise HTTPException(status_code=404, detail=message)
        elif "admin" in message.lower():
            raise HTTPException(status_code=403, detail=message)
        else:
            raise HTTPException(status_code=400, detail=message)
    
    # Create audit log
    await create_audit_log("date_hold", hold_id, "extended", user, {
        "venue_id": venue_id,
        "extension_count": result["extension_count"],
        "new_expiry": result["new_expires_at"]
    }, request)
    
    return {
        "message": f"Hold extended by {extend_request.extension_hours} hours",
        **result
    }


@router.get("/venues/{venue_id}/holds")
async def get_venue_holds(
    venue_id: str,
    status: Optional[str] = "active",
    user: dict = Depends(require_role("rm", "admin", "venue_owner"))
):
    """Get all date holds for a venue."""
    holds = await availability_service.get_venue_holds(venue_id, status)
    return {"venue_id": venue_id, "holds": holds}


@router.get("/leads/{lead_id}/holds")
async def get_lead_holds(
    lead_id: str,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Get all date holds for a lead with time remaining info."""
    holds = await availability_service.get_lead_holds(lead_id)
    return {"lead_id": lead_id, "holds": holds}
