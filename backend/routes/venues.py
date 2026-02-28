"""
Venue routes for BookMyVenue API.
Handles venue CRUD, search, and reviews.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone

from config import db, logger
from models import VenueCreate, VenueUpdate, VenueResponse, ReviewCreate
from utils import (
    generate_id, get_current_user, get_optional_user, 
    require_role, haversine_distance, create_notification
)

router = APIRouter(prefix="/venues", tags=["venues"])


@router.get("", response_model=List[VenueResponse])
async def search_venues(
    request: Request,
    city: Optional[str] = None,
    area: Optional[str] = None,
    pincode: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,
    event_type: Optional[str] = None,
    date: Optional[str] = None,
    guest_min: Optional[int] = None,
    guest_max: Optional[int] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    rating_min: Optional[float] = None,
    venue_type: Optional[str] = None,
    venue_types: Optional[str] = None,
    indoor_outdoor: Optional[str] = None,
    parking: Optional[bool] = None,
    valet: Optional[bool] = None,
    alcohol: Optional[bool] = None,
    rooms: Optional[bool] = None,
    ac: Optional[bool] = None,
    catering_inhouse: Optional[bool] = None,
    catering_outside: Optional[bool] = None,
    decor: Optional[bool] = None,
    sound: Optional[bool] = None,
    sort_by: Optional[str] = "popular",
    page: int = 1,
    limit: int = 20
):
    """Search venues with advanced filters."""
    query = {"status": "approved"}
    
    # Location filters
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    if pincode:
        query["pincode"] = pincode
    
    # Event type filter
    if event_type:
        query["event_types"] = {"$in": [event_type]}
    
    # Guest count filter
    if guest_min:
        query["capacity_max"] = {"$gte": guest_min}
    if guest_max:
        query["capacity_min"] = {"$lte": guest_max}
    
    # Price per plate filter
    if price_min:
        query["$or"] = [
            {"pricing.price_per_plate_veg": {"$gte": price_min}},
            {"pricing.price_per_plate_nonveg": {"$gte": price_min}}
        ]
    if price_max:
        query["$or"] = query.get("$or", []) + [
            {"pricing.price_per_plate_veg": {"$lte": price_max}},
            {"pricing.price_per_plate_nonveg": {"$lte": price_max}}
        ]
    
    # Rating filter
    if rating_min:
        query["rating"] = {"$gte": rating_min}
    
    # Venue type filter (single or multi-select)
    if venue_types:
        types_list = [t.strip() for t in venue_types.split(',') if t.strip()]
        if types_list:
            query["venue_type"] = {"$in": types_list}
    elif venue_type:
        query["venue_type"] = venue_type
    if indoor_outdoor:
        query["indoor_outdoor"] = indoor_outdoor
    
    # Amenities filters
    amenity_filters = {}
    if parking:
        amenity_filters["amenities.parking"] = True
    if valet:
        amenity_filters["amenities.valet"] = True
    if alcohol:
        amenity_filters["amenities.alcohol_allowed"] = True
    if rooms:
        amenity_filters["amenities.rooms_available"] = {"$gt": 0}
    if ac:
        amenity_filters["amenities.ac"] = True
    if catering_inhouse:
        amenity_filters["amenities.catering_inhouse"] = True
    if catering_outside:
        amenity_filters["amenities.catering_outside_allowed"] = True
    if decor:
        amenity_filters["amenities.decor_inhouse"] = True
    if sound:
        amenity_filters["amenities.sound_system"] = True
    
    query.update(amenity_filters)
    
    # Get venues
    skip = (page - 1) * limit
    venues = await db.venues.find(query, {"_id": 0}).skip(skip).limit(limit * 3).to_list(limit * 3)
    
    # Calculate distances if coordinates provided
    if lat and lng:
        for venue in venues:
            venue["distance"] = haversine_distance(lat, lng, venue["latitude"], venue["longitude"])
        
        # Filter by radius
        if radius:
            venues = [v for v in venues if v["distance"] <= radius]
    
    # Sorting
    if sort_by == "price_low":
        venues.sort(key=lambda v: v.get("pricing", {}).get("price_per_plate_veg") or 999999)
    elif sort_by == "price_high":
        venues.sort(key=lambda v: v.get("pricing", {}).get("price_per_plate_veg") or 0, reverse=True)
    elif sort_by == "distance" and lat and lng:
        venues.sort(key=lambda v: v.get("distance", 999999))
    elif sort_by == "rating":
        venues.sort(key=lambda v: v.get("rating", 0), reverse=True)
    elif sort_by == "newest":
        venues.sort(key=lambda v: v.get("created_at", ""), reverse=True)
    else:  # popular
        venues.sort(key=lambda v: (v.get("rating", 0) * v.get("review_count", 0)), reverse=True)
    
    return venues[:limit]


@router.get("/{venue_id}")
async def get_venue(venue_id: str, lat: Optional[float] = None, lng: Optional[float] = None):
    """Get venue details by ID."""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if lat and lng:
        venue["distance"] = haversine_distance(lat, lng, venue["latitude"], venue["longitude"])
    
    # Get reviews
    reviews = await db.reviews.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    venue["reviews"] = reviews
    
    return venue


@router.post("")
async def create_venue(venue_data: VenueCreate, user: dict = Depends(require_role("venue_owner", "admin"))):
    """Create a new venue."""
    venue_id = generate_id("venue_")
    venue = {
        "venue_id": venue_id,
        "owner_id": user["user_id"],
        **venue_data.model_dump(),
        "rating": 0.0,
        "review_count": 0,
        "status": "pending" if user["role"] != "admin" else "approved",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.venues.insert_one(venue)
    
    # Notify admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(100)
    for admin in admins:
        await create_notification(
            admin["user_id"],
            "New Venue Submission",
            f"New venue '{venue_data.name}' submitted for approval",
            "approval",
            {"venue_id": venue_id}
        )
    
    return {"venue_id": venue_id, "status": venue["status"]}


@router.put("/{venue_id}")
async def update_venue(venue_id: str, venue_data: VenueUpdate, user: dict = Depends(require_role("venue_owner", "admin"))):
    """Update venue details."""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if user["role"] != "admin" and venue["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in venue_data.model_dump().items() if v is not None}
    if update_data:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": update_data})
    
    return {"message": "Venue updated"}


# ============== REVIEWS ==============

@router.post("/{venue_id}/reviews")
async def create_review(venue_id: str, review_data: ReviewCreate, user: dict = Depends(get_current_user)):
    """Create a review for a venue."""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    review = {
        "review_id": generate_id("review_"),
        "venue_id": venue_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "rating": review_data.rating,
        "title": review_data.title,
        "content": review_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review)
    
    # Update venue rating
    all_reviews = await db.reviews.find({"venue_id": venue_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.venues.update_one(
        {"venue_id": venue_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(all_reviews)}}
    )
    
    return {"review_id": review["review_id"]}


@router.get("/{venue_id}/reviews")
async def get_venue_reviews(venue_id: str, page: int = 1, limit: int = 10):
    """Get reviews for a venue."""
    skip = (page - 1) * limit
    reviews = await db.reviews.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reviews.count_documents({"venue_id": venue_id})
    return {"reviews": reviews, "total": total}
