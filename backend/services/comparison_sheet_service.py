"""
Comparison Sheet service for generating venue comparison data.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from config import db


async def get_venue_comparison_data(venue_id: str, lead_id: str) -> Optional[Dict]:
    """Get enriched venue data for comparison sheet."""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        return None
    
    # Get shortlist item for proposed price
    shortlist_item = await db.venue_shortlist.find_one(
        {"lead_id": lead_id, "venue_id": venue_id}, {"_id": 0}
    )
    
    # Get availability for next 30 days
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    next_month = (now.replace(day=1) + timedelta(days=32)).strftime("%Y-%m")
    
    availability_slots = await db.venue_availability.find({
        "venue_id": venue_id,
        "date": {"$regex": f"^{current_month}|^{next_month}"}
    }, {"_id": 0}).to_list(60)
    
    available_count = sum(1 for s in availability_slots if s.get("status") == "available")
    blocked_count = sum(1 for s in availability_slots if s.get("status") in ["blocked", "booked"])
    
    # Determine availability indicator
    if blocked_count == 0:
        availability_status = "high"
        availability_text = "High availability"
    elif available_count > blocked_count:
        availability_status = "medium"
        availability_text = "Limited availability"
    else:
        availability_status = "low"
        availability_text = "Low availability"
    
    # Calculate rating summary
    rating = venue.get("rating", 4.5)
    review_count = venue.get("review_count", 0)
    
    # Get key amenities (top 6)
    amenities = venue.get("amenities", {})
    key_amenities = [k.replace("_", " ").title() for k, v in amenities.items() if v][:6]
    
    # Pricing info
    pricing = venue.get("pricing", {})
    starting_price = pricing.get("price_per_plate_veg") or pricing.get("rental_per_day") or 0
    
    return {
        "venue_id": venue_id,
        "name": venue.get("name"),
        "venue_type": venue.get("venue_type", "").replace("_", " ").title(),
        "location": {
            "area": venue.get("area"),
            "city": venue.get("city"),
            "full_address": venue.get("address")
        },
        "capacity": {
            "min": venue.get("capacity_min", 50),
            "max": venue.get("capacity_max", 500)
        },
        "pricing": {
            "starting_price": starting_price,
            "proposed_price": shortlist_item.get("proposed_price") if shortlist_item else None,
            "price_type": "per plate" if pricing.get("price_per_plate_veg") else "rental"
        },
        "availability": {
            "status": availability_status,
            "text": availability_text
        },
        "amenities": key_amenities,
        "images": (venue.get("images") or [])[:3],
        "rating": {
            "score": rating,
            "review_count": review_count
        },
        "indoor_outdoor": venue.get("indoor_outdoor", "indoor").title(),
        "description": venue.get("description", "")[:200]
    }


async def generate_comparison_sheet(
    lead_id: str,
    venue_ids: List[str],
    user_id: str,
    user_name: str
) -> Dict:
    """Generate a comparison sheet for selected venues."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        return None
    
    # Get venue details with enriched data
    venues_data = []
    for venue_id in venue_ids:
        venue_data = await get_venue_comparison_data(venue_id, lead_id)
        if venue_data:
            venues_data.append(venue_data)
    
    # Generate comparison sheet metadata
    comparison_sheet = {
        "sheet_id": f"comp_{uuid.uuid4().hex[:12]}",
        "lead_id": lead_id,
        "customer_name": lead.get("customer_name"),
        "event_type": lead.get("event_type", "").replace("_", " ").title(),
        "event_date": lead.get("event_date"),
        "guest_count": lead.get("guest_count"),
        "venues": venues_data,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": {
            "user_id": user_id,
            "name": user_name
        },
        "branding": {
            "company": "BookMyVenue",
            "tagline": "Your Perfect Venue, Our Promise",
            "contact": "support@bookmyvenue.com"
        }
    }
    
    # Store comparison sheet for tracking
    await db.comparison_sheets.insert_one({
        **comparison_sheet,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Remove MongoDB _id
    comparison_sheet.pop("_id", None)
    
    return comparison_sheet


async def get_comparison_sheet_by_id(sheet_id: str) -> Optional[Dict]:
    """Get a previously generated comparison sheet."""
    sheet = await db.comparison_sheets.find_one({"sheet_id": sheet_id}, {"_id": 0})
    return sheet
