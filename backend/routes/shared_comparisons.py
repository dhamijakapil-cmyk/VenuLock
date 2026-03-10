"""
Shared Comparison routes - allows users to save and share venue comparisons.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from config import db
import uuid

router = APIRouter(tags=["shared-comparisons"])


@router.post("/shared-comparisons")
async def create_shared_comparison(payload: dict):
    """Save a venue comparison and return a shareable ID."""
    venue_ids = payload.get("venue_ids", [])
    if len(venue_ids) < 2 or len(venue_ids) > 3:
        raise HTTPException(status_code=400, detail="Need 2-3 venue IDs to share a comparison")

    share_id = uuid.uuid4().hex[:10]

    # Fetch full venue data to snapshot it
    venues = await db.venues.find(
        {"venue_id": {"$in": venue_ids}},
        {"_id": 0}
    ).to_list(3)

    if len(venues) < 2:
        raise HTTPException(status_code=404, detail="Could not find enough venues")

    doc = {
        "share_id": share_id,
        "venue_ids": venue_ids,
        "venues": venues,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "view_count": 0,
    }
    await db.shared_comparisons.insert_one(doc)

    return {"share_id": share_id}


@router.get("/shared-comparisons/{share_id}")
async def get_shared_comparison(share_id: str):
    """Retrieve a shared comparison by ID."""
    doc = await db.shared_comparisons.find_one(
        {"share_id": share_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Comparison not found or expired")

    # Increment view count
    await db.shared_comparisons.update_one(
        {"share_id": share_id},
        {"$inc": {"view_count": 1}}
    )

    return doc
