"""
Legacy endpoints for backwards compatibility.
These endpoints are deprecated but maintained for existing integrations.
"""
from fastapi import APIRouter, Depends

from config import db
from utils import require_role

router = APIRouter(tags=["legacy"])


@router.get("/my-venues")
async def get_my_venues_legacy(user: dict = Depends(require_role("venue_owner", "admin"))):
    """
    Get venues owned by current user.
    
    DEPRECATED: Use /api/venues/owner/my-venues instead.
    Maintained for backwards compatibility.
    """
    if user["role"] == "admin":
        venues = await db.venues.find({}, {"_id": 0}).to_list(1000)
    else:
        venues = await db.venues.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return venues
