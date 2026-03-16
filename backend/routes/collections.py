"""
Collections (Wishlists) routes - Users can organize venues into named collections.
"""
import uuid
from fastapi import APIRouter, Depends, Request, HTTPException
from config import db
from utils import get_current_user, generate_id
from datetime import datetime, timezone

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("")
async def get_collections(user: dict = Depends(get_current_user)):
    """Get all collections for the current user."""
    cursor = db.collections.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1)
    collections = await cursor.to_list(50)

    # Attach cover images from first venue in each collection
    for c in collections:
        if c.get("venue_ids"):
            first_venue = await db.venues.find_one(
                {"venue_id": c["venue_ids"][0]},
                {"_id": 0, "images": 1, "name": 1}
            )
            c["cover_image"] = first_venue.get("images", [None])[0] if first_venue else None
        else:
            c["cover_image"] = None
        c["venue_count"] = len(c.get("venue_ids", []))

    return {"collections": collections}


@router.post("")
async def create_collection(request: Request, user: dict = Depends(get_current_user)):
    """Create a new collection."""
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Collection name is required")

    # Check for duplicate names
    existing = await db.collections.find_one(
        {"user_id": user["user_id"], "name": {"$regex": f"^{name}$", "$options": "i"}},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="A collection with this name already exists")

    venue_id = body.get("venue_id")
    collection = {
        "collection_id": generate_id("col_"),
        "user_id": user["user_id"],
        "name": name,
        "venue_ids": [venue_id] if venue_id else [],
        "share_token": str(uuid.uuid4())[:8],
        "is_public": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.collections.insert_one(collection)
    collection.pop("_id", None)
    collection["venue_count"] = len(collection["venue_ids"])
    collection["cover_image"] = None
    return {"collection": collection}


@router.get("/shared/{share_token}")
async def get_shared_collection(share_token: str):
    """Get a publicly shared collection (no auth required)."""
    collection = await db.collections.find_one(
        {"share_token": share_token, "is_public": True},
        {"_id": 0}
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found or is private")

    # Get venue details
    venues = []
    for vid in collection.get("venue_ids", []):
        v = await db.venues.find_one(
            {"venue_id": vid, "status": "approved"},
            {"_id": 0, "venue_id": 1, "name": 1, "city": 1, "area": 1,
             "images": 1, "slug": 1, "city_slug": 1, "capacity_min": 1,
             "capacity_max": 1, "pricing": 1, "venue_type": 1, "rating": 1}
        )
        if v:
            venues.append(v)

    # Get owner name
    owner = await db.users.find_one(
        {"user_id": collection["user_id"]},
        {"_id": 0, "name": 1}
    )

    collection["venues"] = venues
    collection["owner_name"] = owner.get("name", "Someone") if owner else "Someone"
    collection["venue_count"] = len(venues)
    return {"collection": collection}


@router.get("/{collection_id}")
async def get_collection(collection_id: str, user: dict = Depends(get_current_user)):
    """Get a single collection with full venue details."""
    collection = await db.collections.find_one(
        {"collection_id": collection_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    venues = []
    for vid in collection.get("venue_ids", []):
        v = await db.venues.find_one(
            {"venue_id": vid, "status": "approved"},
            {"_id": 0, "venue_id": 1, "name": 1, "city": 1, "area": 1,
             "images": 1, "slug": 1, "city_slug": 1, "capacity_min": 1,
             "capacity_max": 1, "pricing": 1, "venue_type": 1, "rating": 1,
             "amenities": 1}
        )
        if v:
            venues.append(v)

    collection["venues"] = venues
    collection["venue_count"] = len(venues)
    return {"collection": collection}


@router.put("/{collection_id}")
async def update_collection(collection_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Update collection name or public status."""
    body = await request.json()
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if "name" in body:
        name = body["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = name

    if "is_public" in body:
        updates["is_public"] = bool(body["is_public"])

    result = await db.collections.update_one(
        {"collection_id": collection_id, "user_id": user["user_id"]},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")

    updated = await db.collections.find_one(
        {"collection_id": collection_id},
        {"_id": 0}
    )
    return {"collection": updated}


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str, user: dict = Depends(get_current_user)):
    """Delete a collection."""
    result = await db.collections.delete_one(
        {"collection_id": collection_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Collection deleted"}


@router.post("/{collection_id}/venues/{venue_id}")
async def add_venue_to_collection(collection_id: str, venue_id: str, user: dict = Depends(get_current_user)):
    """Add a venue to a collection."""
    result = await db.collections.update_one(
        {"collection_id": collection_id, "user_id": user["user_id"]},
        {
            "$addToSet": {"venue_ids": venue_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Venue added", "venue_id": venue_id}


@router.delete("/{collection_id}/venues/{venue_id}")
async def remove_venue_from_collection(collection_id: str, venue_id: str, user: dict = Depends(get_current_user)):
    """Remove a venue from a collection."""
    result = await db.collections.update_one(
        {"collection_id": collection_id, "user_id": user["user_id"]},
        {
            "$pull": {"venue_ids": venue_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Venue removed", "venue_id": venue_id}


@router.post("/{collection_id}/venues")
async def bulk_add_venues(collection_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Add multiple venues to a collection at once."""
    body = await request.json()
    venue_ids = body.get("venue_ids", [])
    if not venue_ids:
        raise HTTPException(status_code=400, detail="venue_ids required")

    result = await db.collections.update_one(
        {"collection_id": collection_id, "user_id": user["user_id"]},
        {
            "$addToSet": {"venue_ids": {"$each": venue_ids}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": f"{len(venue_ids)} venues added"}
