"""
Availability service for venue availability and date holds.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from config import db


async def get_venue_availability(venue_id: str, month: Optional[str] = None) -> List[Dict]:
    """Get venue availability slots for a month."""
    query = {"venue_id": venue_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    slots = await db.venue_availability.find(query, {"_id": 0}).to_list(100)
    return slots


async def update_venue_availability(venue_id: str, slots: List[Dict]) -> None:
    """Update availability for multiple slots."""
    for slot in slots:
        await db.venue_availability.update_one(
            {"venue_id": venue_id, "date": slot["date"]},
            {"$set": {
                "venue_id": venue_id,
                "date": slot["date"],
                "status": slot.get("status", "available"),
                "event_type": slot.get("event_type"),
                "notes": slot.get("notes")
            }},
            upsert=True
        )


async def bulk_update_availability(
    venue_id: str, 
    dates: List[str], 
    status: str, 
    time_slot: str, 
    notes: Optional[str], 
    user_id: str
) -> int:
    """Bulk update availability for multiple dates."""
    now = datetime.now(timezone.utc).isoformat()
    
    for date in dates:
        await db.venue_availability.update_one(
            {"venue_id": venue_id, "date": date},
            {"$set": {
                "venue_id": venue_id,
                "date": date,
                "status": status,
                "time_slot": time_slot or "full_day",
                "notes": notes,
                "updated_at": now,
                "updated_by": user_id
            }},
            upsert=True
        )
    
    return len(dates)


async def release_expired_holds(venue_id: Optional[str] = None, lead_id: Optional[str] = None) -> List[Dict]:
    """Auto-release expired holds and reset availability."""
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "status": "active",
        "expires_at": {"$lt": now}
    }
    if venue_id:
        query["venue_id"] = venue_id
    if lead_id:
        query["lead_id"] = lead_id
    
    expired_holds = await db.date_holds.find(query, {"_id": 0}).to_list(100)
    
    for expired in expired_holds:
        # Release the hold
        await db.date_holds.update_one(
            {"hold_id": expired["hold_id"]},
            {"$set": {"status": "expired", "expired_at": now}}
        )
        # Reset availability to available
        await db.venue_availability.update_one(
            {"venue_id": expired["venue_id"], "date": expired["date"]},
            {"$set": {"status": "available", "hold_id": None, "lead_id": None, "notes": None}}
        )
    
    return expired_holds


async def create_date_hold(
    venue_id: str,
    venue_name: str,
    date: str,
    lead_id: str,
    customer_name: str,
    event_type: str,
    time_slot: str,
    expiry_hours: int,
    user_id: str,
    user_name: str,
    hold_id: str
) -> Dict:
    """Create a new date hold."""
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(hours=expiry_hours)).isoformat()
    
    hold_record = {
        "hold_id": hold_id,
        "venue_id": venue_id,
        "venue_name": venue_name,
        "date": date,
        "lead_id": lead_id,
        "customer_name": customer_name,
        "time_slot": time_slot or "full_day",
        "status": "active",
        "created_at": now.isoformat(),
        "created_by": user_id,
        "created_by_name": user_name,
        "expires_at": expires_at,
        "expiry_hours": expiry_hours
    }
    
    await db.date_holds.insert_one(hold_record)
    
    # Update venue availability to tentative
    await db.venue_availability.update_one(
        {"venue_id": venue_id, "date": date},
        {"$set": {
            "venue_id": venue_id,
            "date": date,
            "status": "tentative",
            "hold_id": hold_id,
            "lead_id": lead_id,
            "time_slot": time_slot or "full_day",
            "notes": f"Held for {customer_name} - {event_type}",
            "updated_at": now.isoformat()
        }},
        upsert=True
    )
    
    hold_record.pop("_id", None)
    return hold_record


async def release_date_hold(hold_id: str, venue_id: str, user_id: str) -> Dict:
    """Release a date hold and reset availability."""
    hold = await db.date_holds.find_one({"hold_id": hold_id, "venue_id": venue_id}, {"_id": 0})
    if not hold:
        return None
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update hold status
    await db.date_holds.update_one(
        {"hold_id": hold_id},
        {"$set": {"status": "released", "released_at": now, "released_by": user_id}}
    )
    
    # Update venue availability back to available
    await db.venue_availability.update_one(
        {"venue_id": venue_id, "date": hold["date"]},
        {"$set": {
            "status": "available",
            "hold_id": None,
            "lead_id": None,
            "notes": None,
            "updated_at": now
        }}
    )
    
    return hold


async def extend_date_hold(
    hold_id: str,
    venue_id: str,
    extension_hours: int,
    user_id: str,
    is_admin: bool
) -> tuple[bool, str, Dict]:
    """Extend a date hold. Returns (success, message, result_data)."""
    hold = await db.date_holds.find_one({"hold_id": hold_id, "venue_id": venue_id}, {"_id": 0})
    if not hold:
        return False, "Hold not found", {}
    
    if hold.get("status") != "active":
        return False, "Only active holds can be extended", {}
    
    # Check extension count
    extension_count = hold.get("extension_count", 0)
    max_extensions = 2
    
    if extension_count >= max_extensions and not is_admin:
        return False, f"Maximum {max_extensions} extensions allowed. Admin approval required.", {}
    
    now = datetime.now(timezone.utc)
    
    # Calculate new expiry from current expiry or now (whichever is later)
    current_expiry_str = hold.get("expires_at")
    try:
        current_expiry = datetime.fromisoformat(current_expiry_str.replace('Z', '+00:00'))
        if current_expiry.tzinfo is None:
            current_expiry = current_expiry.replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        current_expiry = now
    
    base_time = max(current_expiry, now)
    new_expiry = (base_time + timedelta(hours=extension_hours)).isoformat()
    
    # Update hold
    update_data = {
        "expires_at": new_expiry,
        "extension_count": extension_count + 1,
        "last_extended_at": now.isoformat(),
        "last_extended_by": user_id
    }
    
    await db.date_holds.update_one({"hold_id": hold_id}, {"$set": update_data})
    
    return True, "Hold extended successfully", {
        "hold_id": hold_id,
        "new_expires_at": new_expiry,
        "extension_count": extension_count + 1,
        "extensions_remaining": max(0, max_extensions - (extension_count + 1)) if not is_admin else "unlimited"
    }


async def get_venue_holds(venue_id: str, status: Optional[str] = "active") -> List[Dict]:
    """Get all date holds for a venue."""
    # Auto-release expired holds first
    await release_expired_holds(venue_id=venue_id)
    
    query = {"venue_id": venue_id}
    if status:
        query["status"] = status
    
    holds = await db.date_holds.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    return holds


async def get_lead_holds(lead_id: str) -> List[Dict]:
    """Get all date holds for a lead with time remaining info."""
    now = datetime.now(timezone.utc)
    
    # Auto-release expired holds first
    await release_expired_holds(lead_id=lead_id)
    
    holds = await db.date_holds.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Add time remaining for active holds
    for hold in holds:
        if hold.get("status") == "active" and hold.get("expires_at"):
            try:
                expires_at = datetime.fromisoformat(hold["expires_at"].replace('Z', '+00:00'))
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                remaining = expires_at - now
                hold["hours_remaining"] = max(0, remaining.total_seconds() / 3600)
                hold["is_expiring_soon"] = remaining.total_seconds() < 6 * 3600  # Less than 6 hours
            except (ValueError, AttributeError, TypeError):
                hold["hours_remaining"] = 0
                hold["is_expiring_soon"] = True
    
    return holds
