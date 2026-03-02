"""
Favorites routes - User-based venue favorites stored in database
"""
from fastapi import APIRouter, Depends, Request
from config import db
from utils import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("")
async def get_favorites(user: dict = Depends(get_current_user)):
    """Get all favorite venue IDs for the current user."""
    doc = await db.favorites.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "venue_ids": 1}
    )
    return {"venue_ids": doc.get("venue_ids", []) if doc else []}


@router.post("")
async def add_favorite(request: Request, user: dict = Depends(get_current_user)):
    """Add a venue to favorites."""
    body = await request.json()
    venue_id = body.get("venue_id")
    if not venue_id:
        return {"error": "venue_id required"}, 400

    await db.favorites.update_one(
        {"user_id": user["user_id"]},
        {
            "$addToSet": {"venue_ids": venue_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    return {"message": "Added to favorites", "venue_id": venue_id}


@router.delete("/{venue_id}")
async def remove_favorite(venue_id: str, user: dict = Depends(get_current_user)):
    """Remove a venue from favorites."""
    await db.favorites.update_one(
        {"user_id": user["user_id"]},
        {
            "$pull": {"venue_ids": venue_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Removed from favorites", "venue_id": venue_id}


@router.post("/merge")
async def merge_favorites(request: Request, user: dict = Depends(get_current_user)):
    """Merge localStorage favorites into user account on login."""
    body = await request.json()
    local_ids = body.get("venue_ids", [])
    if not local_ids or not isinstance(local_ids, list):
        return {"message": "Nothing to merge", "venue_ids": []}

    await db.favorites.update_one(
        {"user_id": user["user_id"]},
        {
            "$addToSet": {"venue_ids": {"$each": local_ids}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    doc = await db.favorites.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "venue_ids": 1}
    )
    return {"message": "Merged", "venue_ids": doc.get("venue_ids", [])}


@router.delete("")
async def clear_favorites(user: dict = Depends(get_current_user)):
    """Clear all favorites."""
    await db.favorites.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"venue_ids": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "All favorites cleared"}
