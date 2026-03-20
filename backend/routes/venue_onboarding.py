"""
VenuLoQ — Venue Onboarding API
================================
Handles the complete venue acquisition workflow:
  Specialist creates draft → submits for review → VAM approves/rejects → goes live
  Venue Owner can edit → submit changes → VAM re-approves

ENDPOINTS:
  POST   /venue-onboarding/create                 — Specialist creates venue draft
  GET    /venue-onboarding/my-submissions          — Specialist's venue list
  GET    /venue-onboarding/{venue_id}              — Get venue onboarding details
  PUT    /venue-onboarding/{venue_id}              — Update venue draft
  POST   /venue-onboarding/{venue_id}/media        — Upload photo/video
  DELETE /venue-onboarding/{venue_id}/media/{idx}  — Remove a media item
  POST   /venue-onboarding/{venue_id}/submit       — Submit for VAM review
  GET    /venue-onboarding/review-queue            — VAM's pending review queue
  GET    /venue-onboarding/all                     — VAM's full venue list
  PATCH  /venue-onboarding/{venue_id}/review       — VAM approves/rejects
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone

from config import db
from utils import require_role, generate_id, create_notification

router = APIRouter(prefix="/venue-onboarding", tags=["venue-onboarding"])

# Valid venue statuses
VENUE_STATUSES = ["draft", "submitted", "approved", "changes_requested", "rejected"]

VENUE_TYPES = [
    "Banquet Hall", "Farmhouse", "Hotel", "Resort", "Convention Center",
    "Garden/Lawn", "Rooftop", "Palace/Heritage", "Restaurant", "Club",
    "Beach Venue", "Destination Wedding", "Other"
]

AMENITY_OPTIONS = [
    "Parking", "AC", "DJ", "Decor", "Catering", "Alcohol Allowed",
    "Outdoor Area", "Indoor Area", "Bridal Room", "Valet Parking",
    "Power Backup", "WiFi", "Stage", "Sound System", "Projector",
    "Swimming Pool", "Helipad"
]

VIBE_OPTIONS = [
    "Royal", "Modern", "Rustic", "Minimalist", "Bohemian", "Vintage",
    "Tropical", "Industrial", "Classic", "Luxury", "Garden", "Beachside"
]


def _now():
    return datetime.now(timezone.utc).isoformat()


# ============== SPECIALIST ENDPOINTS ==============

@router.post("/create")
async def create_venue_draft(request: Request, user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Specialist creates a new venue draft."""
    body = await request.json()
    now = _now()
    venue_id = generate_id("vonb_")

    venue = {
        "venue_onboarding_id": venue_id,
        "status": "draft",
        # Basic Info
        "name": body.get("name", ""),
        "venue_type": body.get("venue_type", ""),
        "description": body.get("description", ""),
        # Location
        "address": body.get("address", ""),
        "city": body.get("city", ""),
        "map_link": body.get("map_link", ""),
        # Capacity & Pricing
        "capacity_min": body.get("capacity_min"),
        "capacity_max": body.get("capacity_max"),
        "per_person_price": body.get("per_person_price"),
        "min_spend": body.get("min_spend"),
        # Features
        "amenities": body.get("amenities", []),
        "vibes": body.get("vibes", []),
        # Media
        "photos": body.get("photos", []),  # list of {url, caption}
        "videos": body.get("videos", []),  # list of {url, caption}
        # Owner Contact
        "owner_name": body.get("owner_name", ""),
        "owner_phone": body.get("owner_phone", ""),
        "owner_email": body.get("owner_email", ""),
        # Metadata
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": now,
        "updated_at": now,
        "submitted_at": None,
        "reviewed_by": None,
        "reviewed_by_name": None,
        "reviewed_at": None,
        "review_notes": None,
        # If approved, this links to the main venues collection
        "published_venue_id": None,
    }
    await db.venue_onboarding.insert_one(venue)

    return {
        "message": "Venue draft created",
        "venue_onboarding_id": venue_id,
    }


@router.get("/my-submissions")
async def get_my_submissions(
    status: str = None,
    user: dict = Depends(require_role("venue_specialist", "vam", "admin")),
):
    """Get venues created by this specialist."""
    query = {"created_by": user["user_id"]}
    if status:
        query["status"] = status

    venues = await db.venue_onboarding.find(
        query, {"_id": 0, "photos": {"$slice": 1}, "videos": 0}
    ).sort("updated_at", -1).to_list(100)

    return {"venues": venues, "total": len(venues)}


@router.get("/stats")
async def get_specialist_stats(user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Get stats for the specialist dashboard."""
    uid = user["user_id"]
    role = user["role"]

    if role == "venue_specialist":
        base_query = {"created_by": uid}
    else:
        base_query = {}

    drafts = await db.venue_onboarding.count_documents({**base_query, "status": "draft"})
    submitted = await db.venue_onboarding.count_documents({**base_query, "status": "submitted"})
    approved = await db.venue_onboarding.count_documents({**base_query, "status": "approved"})
    changes = await db.venue_onboarding.count_documents({**base_query, "status": "changes_requested"})
    rejected = await db.venue_onboarding.count_documents({**base_query, "status": "rejected"})

    return {
        "drafts": drafts,
        "submitted": submitted,
        "approved": approved,
        "changes_requested": changes,
        "rejected": rejected,
        "total": drafts + submitted + approved + changes + rejected,
    }


@router.get("/review-queue")
async def get_review_queue(user: dict = Depends(require_role("vam", "admin"))):
    """VAM: Get venues submitted for review."""
    venues = await db.venue_onboarding.find(
        {"status": "submitted"},
        {"_id": 0, "photos": {"$slice": 1}, "videos": 0},
    ).sort("submitted_at", -1).to_list(100)

    return {"venues": venues, "total": len(venues)}


@router.get("/all")
async def get_all_venues(
    status: str = None,
    user: dict = Depends(require_role("vam", "admin")),
):
    """VAM: Get all onboarding venues."""
    query = {}
    if status:
        query["status"] = status

    venues = await db.venue_onboarding.find(
        query, {"_id": 0, "photos": {"$slice": 1}, "videos": 0}
    ).sort("updated_at", -1).to_list(200)

    return {"venues": venues, "total": len(venues)}


@router.get("/options")
async def get_venue_options():
    """Get venue types, amenities, and vibes options for forms."""
    return {
        "venue_types": VENUE_TYPES,
        "amenities": AMENITY_OPTIONS,
        "vibes": VIBE_OPTIONS,
    }


@router.get("/{venue_id}")
async def get_venue_detail(venue_id: str, user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Get full venue onboarding details."""
    venue = await db.venue_onboarding.find_one(
        {"venue_onboarding_id": venue_id}, {"_id": 0}
    )
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    # Specialists can only see their own
    if user["role"] == "venue_specialist" and venue.get("created_by") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return venue


@router.put("/{venue_id}")
async def update_venue_draft(venue_id: str, request: Request, user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Update a venue draft. Only editable when status is draft or changes_requested."""
    venue = await db.venue_onboarding.find_one(
        {"venue_onboarding_id": venue_id}, {"_id": 0}
    )
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    if user["role"] == "venue_specialist" and venue.get("created_by") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if venue["status"] not in ("draft", "changes_requested"):
        raise HTTPException(status_code=400, detail=f"Cannot edit venue in '{venue['status']}' status")

    body = await request.json()
    now = _now()

    editable_fields = [
        "name", "venue_type", "description", "address", "city", "map_link",
        "capacity_min", "capacity_max", "per_person_price", "min_spend",
        "amenities", "vibes", "photos", "videos",
        "owner_name", "owner_phone", "owner_email",
    ]

    updates = {"updated_at": now}
    for field in editable_fields:
        if field in body:
            updates[field] = body[field]

    await db.venue_onboarding.update_one(
        {"venue_onboarding_id": venue_id}, {"$set": updates}
    )

    return {"message": "Venue updated", "venue_onboarding_id": venue_id}


@router.post("/{venue_id}/media")
async def add_media(venue_id: str, request: Request, user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Add a photo or video to the venue."""
    venue = await db.venue_onboarding.find_one(
        {"venue_onboarding_id": venue_id}, {"_id": 0}
    )
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    if user["role"] == "venue_specialist" and venue.get("created_by") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    body = await request.json()
    media_type = body.get("type", "photo")  # "photo" or "video"
    file_data = body.get("file_data")  # base64
    caption = body.get("caption", "")

    if not file_data:
        raise HTTPException(status_code=400, detail="No file data provided")

    media_item = {
        "id": generate_id("media_"),
        "url": file_data,
        "caption": caption,
        "uploaded_at": _now(),
        "uploaded_by": user["user_id"],
    }

    field = "photos" if media_type == "photo" else "videos"
    await db.venue_onboarding.update_one(
        {"venue_onboarding_id": venue_id},
        {"$push": {field: media_item}, "$set": {"updated_at": _now()}}
    )

    return {"message": f"{media_type.title()} added", "media_id": media_item["id"]}


@router.delete("/{venue_id}/media/{media_id}")
async def remove_media(venue_id: str, media_id: str, user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Remove a photo or video from the venue."""
    now = _now()
    # Try removing from photos first, then videos
    result = await db.venue_onboarding.update_one(
        {"venue_onboarding_id": venue_id},
        {"$pull": {"photos": {"id": media_id}}, "$set": {"updated_at": now}}
    )
    if result.modified_count == 0:
        await db.venue_onboarding.update_one(
            {"venue_onboarding_id": venue_id},
            {"$pull": {"videos": {"id": media_id}}, "$set": {"updated_at": now}}
        )

    return {"message": "Media removed"}


@router.post("/{venue_id}/submit")
async def submit_for_review(venue_id: str, user: dict = Depends(require_role("venue_specialist", "vam", "admin"))):
    """Submit a venue draft for VAM review."""
    venue = await db.venue_onboarding.find_one(
        {"venue_onboarding_id": venue_id}, {"_id": 0}
    )
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    if user["role"] == "venue_specialist" and venue.get("created_by") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if venue["status"] not in ("draft", "changes_requested"):
        raise HTTPException(status_code=400, detail=f"Cannot submit venue in '{venue['status']}' status")

    # Basic validation
    if not venue.get("name"):
        raise HTTPException(status_code=400, detail="Venue name is required")
    if not venue.get("city"):
        raise HTTPException(status_code=400, detail="City is required")
    if not venue.get("photos") or len(venue.get("photos", [])) == 0:
        raise HTTPException(status_code=400, detail="At least one photo is required")

    now = _now()
    await db.venue_onboarding.update_one(
        {"venue_onboarding_id": venue_id},
        {"$set": {"status": "submitted", "submitted_at": now, "updated_at": now}}
    )

    # Notify VAMs
    vams = await db.users.find(
        {"role": "vam", "status": "active"}, {"_id": 0, "user_id": 1}
    ).to_list(20)
    for vam in vams:
        await create_notification(
            vam["user_id"],
            "New Venue Submission",
            f"{venue.get('name', 'A venue')} in {venue.get('city', '')} has been submitted for review by {user['name']}.",
            "venue_onboarding",
        )

    return {"message": "Venue submitted for review", "status": "submitted"}


# ============== VAM REVIEW ENDPOINTS ==============

@router.patch("/{venue_id}/review")
async def review_venue(venue_id: str, request: Request, user: dict = Depends(require_role("vam", "admin"))):
    """VAM approves or rejects a submitted venue."""
    venue = await db.venue_onboarding.find_one(
        {"venue_onboarding_id": venue_id}, {"_id": 0}
    )
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    if venue["status"] != "submitted":
        raise HTTPException(status_code=400, detail=f"Cannot review venue in '{venue['status']}' status. Must be 'submitted'.")

    body = await request.json()
    action = body.get("action")  # "approve", "request_changes", "reject"
    notes = body.get("notes", "")

    if action not in ("approve", "request_changes", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve', 'request_changes', or 'reject'")

    now = _now()
    update = {
        "reviewed_by": user["user_id"],
        "reviewed_by_name": user["name"],
        "reviewed_at": now,
        "review_notes": notes,
        "updated_at": now,
    }

    if action == "approve":
        update["status"] = "approved"
        # Publish to main venues collection
        published_id = await _publish_venue(venue)
        update["published_venue_id"] = published_id
    elif action == "request_changes":
        update["status"] = "changes_requested"
    else:
        update["status"] = "rejected"

    await db.venue_onboarding.update_one(
        {"venue_onboarding_id": venue_id}, {"$set": update}
    )

    # Notify the specialist
    specialist_id = venue.get("created_by")
    if specialist_id:
        status_label = {
            "approve": "approved",
            "request_changes": "sent back with change requests",
            "reject": "rejected",
        }[action]
        note_text = f" Notes: {notes}" if notes else ""
        await create_notification(
            specialist_id,
            "Venue Review Update",
            f"'{venue.get('name', 'Your venue')}' has been {status_label} by {user['name']}.{note_text}",
            "venue_onboarding",
        )

    return {
        "message": f"Venue {action.replace('_', ' ')}d",
        "status": update["status"],
        "venue_onboarding_id": venue_id,
    }


async def _publish_venue(onboarding_venue: dict) -> str:
    """Create or update a venue in the main venues collection from the onboarding data."""
    now = _now()
    venue_id = onboarding_venue.get("published_venue_id") or generate_id("venue_")

    # Extract photo URLs (first item's url from each photo)
    photo_urls = [p.get("url", "") for p in onboarding_venue.get("photos", []) if p.get("url")]
    video_urls = [v.get("url", "") for v in onboarding_venue.get("videos", []) if v.get("url")]

    # Build slug
    name_slug = (onboarding_venue.get("name", "") or "").lower().strip().replace(" ", "-")
    city_slug = (onboarding_venue.get("city", "") or "").lower().strip().replace(" ", "-")

    venue_doc = {
        "venue_id": venue_id,
        "name": onboarding_venue.get("name", ""),
        "slug": f"{name_slug}-{city_slug}",
        "venue_type": onboarding_venue.get("venue_type", ""),
        "description": onboarding_venue.get("description", ""),
        "address": onboarding_venue.get("address", ""),
        "city": onboarding_venue.get("city", ""),
        "city_slug": city_slug,
        "map_link": onboarding_venue.get("map_link", ""),
        "capacity_min": onboarding_venue.get("capacity_min") or 0,
        "capacity_max": onboarding_venue.get("capacity_max") or 0,
        "pricing": {
            "per_person_price": onboarding_venue.get("per_person_price") or 0,
            "min_spend": onboarding_venue.get("min_spend") or 0,
        },
        "amenities": onboarding_venue.get("amenities", []),
        "vibes": onboarding_venue.get("vibes", []),
        "images": photo_urls,
        "videos": video_urls,
        "owner_name": onboarding_venue.get("owner_name", ""),
        "owner_phone": onboarding_venue.get("owner_phone", ""),
        "owner_email": onboarding_venue.get("owner_email", ""),
        "rating": 0,
        "status": "approved",
        "onboarding_id": onboarding_venue.get("venue_onboarding_id"),
        "created_at": now,
        "updated_at": now,
    }

    # Upsert: update if exists, insert if new
    existing = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if existing:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": venue_doc})
    else:
        await db.venues.insert_one(venue_doc)

    return venue_id
