"""
Top Performers endpoint for landing page.
Returns top 3 RMs ranked by events closed (booking_confirmed + event_completed).
"""
from fastapi import APIRouter
from datetime import datetime, timezone
from config import db

router = APIRouter(tags=["top_performers"])


@router.get("/rms/top-performers")
async def get_top_performers(limit: int = 3):
    """Public: Get top-performing RMs ranked by bookings closed."""
    # Get all active RMs
    rms_cursor = db.users.find(
        {"role": "rm", "status": "active", "name": {"$not": {"$regex": "^Test", "$options": "i"}}},
        {"_id": 0, "password_hash": 0}
    )
    rms = await rms_cursor.to_list(50)

    if not rms:
        return []

    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    result = []
    for rm in rms:
        rm_id = rm["user_id"]

        # Total bookings confirmed (all time)
        total_confirmed = await db.leads.count_documents({
            "rm_id": rm_id,
            "stage": "booking_confirmed"
        })

        # Events completed (all time)
        total_completed = await db.leads.count_documents({
            "rm_id": rm_id,
            "event_completed": True
        })

        # Bookings confirmed this month
        monthly_confirmed = await db.leads.count_documents({
            "rm_id": rm_id,
            "stage": "booking_confirmed",
            "confirmed_at": {"$gte": current_month_start}
        })

        # Total events closed = confirmed + completed (dedup: completed are subset of confirmed)
        events_closed = total_confirmed + total_completed

        # Total leads handled
        total_leads = await db.leads.count_documents({
            "rm_id": rm_id,
            "stage": {"$ne": "lost"}
        })

        result.append({
            "user_id": rm_id,
            "name": rm.get("name", "Venue Expert"),
            "picture": rm.get("picture"),
            "rating": rm.get("rating", 4.8),
            "city_focus": rm.get("city_focus", "Pan India"),
            "bio": rm.get("bio", ""),
            "languages": rm.get("languages", ["English", "Hindi"]),
            "events_closed": events_closed,
            "monthly_confirmed": monthly_confirmed,
            "total_leads": total_leads,
        })

    # Sort by events_closed desc, then total_leads desc as tiebreaker
    result.sort(key=lambda x: (x["events_closed"], x["total_leads"]), reverse=True)
    return result[:limit]
