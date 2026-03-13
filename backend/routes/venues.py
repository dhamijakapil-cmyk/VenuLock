"""
Venue routes for VenuLoQ API.
Handles venue CRUD, search, and reviews.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import re

from config import db, logger
from models import VenueCreate, VenueUpdate, VenueResponse, ReviewCreate
from utils import (
    generate_id, get_current_user, get_optional_user, 
    require_role, haversine_distance, create_notification
)

router = APIRouter(prefix="/venues", tags=["venues"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return re.sub(r'-+', '-', text).strip('-')


# ============== PUBLIC SEO ENDPOINTS ==============

@router.get("/autocomplete")
async def venue_autocomplete(q: str = Query("", min_length=1)):
    """Autocomplete for venue names, cities, and areas."""
    results = []
    regex = {"$regex": q, "$options": "i"}
    
    # Search cities
    cities = await db.venues.distinct("city", {"city": regex})
    for city in cities[:3]:
        results.append({"type": "city", "name": city})
    
    # Search venues by name or area
    venues = await db.venues.find(
        {"$or": [{"name": regex}, {"area": regex}]},
        {"_id": 0, "venue_id": 1, "name": 1, "city": 1, "area": 1, "city_slug": 1, "slug": 1}
    ).limit(7).to_list(7)
    
    for v in venues:
        results.append({
            "type": "venue",
            "name": v["name"],
            "city": v.get("city", ""),
            "area": v.get("area", ""),
            "venue_id": v.get("venue_id", ""),
            "city_slug": v.get("city_slug", ""),
            "slug": v.get("slug", ""),
        })
    
    return results[:10]



@router.get("/price-estimate")
async def get_price_estimate(
    guests: int = 100,
    city: str = "",
    event_type: str = ""
):
    """Return estimated price range for an event based on real venue data."""
    match_filter = {"status": "approved"}
    if city:
        match_filter["city"] = {"$regex": city, "$options": "i"}
    if event_type:
        match_filter["event_types"] = event_type.lower()

    venues = await db.venues.find(match_filter, {"_id": 0, "pricing": 1, "capacity_min": 1, "capacity_max": 1}).to_list(200)

    # Filter venues that can fit the guest count
    fitting = [v for v in venues if v.get("capacity_min", 0) <= guests <= v.get("capacity_max", 99999)]
    if not fitting:
        fitting = venues  # fallback: use all if no exact match

    if not fitting:
        return {"min_price": 0, "max_price": 0, "venue_count": 0, "guests": guests}

    costs = []
    for v in fitting:
        p = v.get("pricing", {})
        veg = p.get("price_per_plate_veg", 0) or 0
        nonveg = p.get("price_per_plate_nonveg", veg) or veg
        min_spend = p.get("min_spend", 0) or 0
        if veg > 0:
            raw_min = veg * guests
            raw_max = nonveg * guests
            actual_min = max(raw_min, min_spend)
            actual_max = max(raw_max, min_spend)
            costs.append({"min": actual_min, "max": actual_max})

    if not costs:
        return {"min_price": 0, "max_price": 0, "venue_count": 0, "guests": guests}

    overall_min = min(c["min"] for c in costs)
    overall_max = max(c["max"] for c in costs)
    avg_price = sum((c["min"] + c["max"]) / 2 for c in costs) // len(costs)

    return {
        "min_price": int(overall_min),
        "max_price": int(overall_max),
        "avg_price": int(avg_price),
        "venue_count": len(fitting),
        "guests": guests,
        "city": city,
        "event_type": event_type,
    }


@router.get("/featured")
async def get_featured_venues():
    """Return top 4 highest-rated approved venues for the landing page."""
    venues = await db.venues.find(
        {"status": "approved"},
        {"_id": 0}
    ).sort("rating", -1).limit(4).to_list(4)
    return venues


@router.get("/cities")
async def list_cities_with_venues():
    """Public: list cities that have approved venues, with counts."""
    pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {
            "_id": "$city",
            "city_slug": {"$first": "$city_slug"},
            "count": {"$sum": 1},
            "sample_image": {"$first": {"$arrayElemAt": ["$images", 0]}},
            "min_price": {"$min": "$pricing.price_per_plate_veg"},
            "max_capacity": {"$max": "$capacity_max"},
        }},
        {"$sort": {"count": -1}},
    ]
    results = await db.venues.aggregate(pipeline).to_list(50)
    cities_data = await db.cities.find({}, {"_id": 0}).to_list(50)
    city_meta = {c["name"]: c for c in cities_data}

    out = []
    for r in results:
        city_name = r["_id"]
        meta = city_meta.get(city_name, {})
        out.append({
            "city": city_name,
            "slug": r.get("city_slug") or slugify(city_name),
            "state": meta.get("state", ""),
            "venue_count": r["count"],
            "sample_image": r.get("sample_image"),
            "min_price": r.get("min_price"),
            "max_capacity": r.get("max_capacity"),
            "areas": meta.get("areas", []),
        })
    return out


@router.get("/city/{city_slug}")
async def get_city_venues(
    city_slug: str,
    event_type: Optional[str] = None,
    sort_by: str = "popular",
    page: int = 1,
    limit: int = 20,
):
    """Public: Get all approved venues in a city by slug."""
    query = {"status": "approved", "city_slug": city_slug}
    if event_type:
        # Parse friendly names: "Birthday / Anniversary" → ["birthday", "anniversary"]
        parts = [p.strip().lower().split()[0] for p in event_type.split('/') if p.strip()]
        if parts:
            query["event_types"] = {"$in": parts}

    total = await db.venues.count_documents(query)
    skip = (page - 1) * limit
    venues = await db.venues.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)

    # Sort
    if sort_by == "price_low":
        venues.sort(key=lambda v: v.get("pricing", {}).get("price_per_plate_veg") or 999999)
    elif sort_by == "price_high":
        venues.sort(key=lambda v: v.get("pricing", {}).get("price_per_plate_veg") or 0, reverse=True)
    elif sort_by == "rating":
        venues.sort(key=lambda v: v.get("rating", 0), reverse=True)
    else:
        venues.sort(key=lambda v: (v.get("rating", 0) * v.get("review_count", 0)), reverse=True)

    # Get city info
    city_info = await db.cities.find_one(
        {"name": {"$regex": f"^{city_slug.replace('-', ' ')}$", "$options": "i"}},
        {"_id": 0}
    )
    city_name = venues[0]["city"] if venues else city_slug.replace("-", " ").title()

    return {
        "city": city_name,
        "city_slug": city_slug,
        "state": city_info.get("state", "") if city_info else "",
        "areas": city_info.get("areas", []) if city_info else [],
        "total": total,
        "page": page,
        "venues": venues,
    }


@router.get("/city/{city_slug}/{venue_slug}")
async def get_venue_by_slug(city_slug: str, venue_slug: str):
    """Public: Get venue by city+venue slug for SEO-friendly URLs."""
    # Try exact slug match first (uses compound index)
    venue = await db.venues.find_one(
        {"city_slug": city_slug, "slug": venue_slug, "status": "approved"},
        {"_id": 0}
    )
    # Fallback: try venue_id match
    if not venue:
        venue = await db.venues.find_one(
            {"venue_id": venue_slug, "status": "approved"},
            {"_id": 0}
        )
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    # Reviews
    reviews = await db.reviews.find(
        {"venue_id": venue["venue_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    venue["reviews"] = reviews

    # Related venues
    related = await db.venues.find(
        {"city_slug": city_slug, "status": "approved", "venue_id": {"$ne": venue["venue_id"]}},
        {"_id": 0}
    ).limit(4).to_list(4)
    venue["related_venues"] = related

    return venue


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
        # Parse friendly names: "Birthday / Anniversary" → ["birthday", "anniversary"]
        parts = [p.strip().lower().split()[0] for p in event_type.split('/') if p.strip()]
        if parts:
            query["event_types"] = {"$in": parts}
    
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


@router.post("/batch")
async def get_venues_batch(request: Request):
    """Get multiple venues by IDs."""
    body = await request.json()
    venue_ids = body.get("venue_ids", [])
    if not venue_ids or not isinstance(venue_ids, list):
        return []
    venues = await db.venues.find(
        {"venue_id": {"$in": venue_ids[:20]}},
        {"_id": 0, "venue_id": 1, "name": 1, "city": 1, "area": 1,
         "images": 1, "price_per_plate": 1, "pricing": 1, "rating": 1,
         "venue_type": 1, "capacity_min": 1, "capacity_max": 1, "review_count": 1}
    ).to_list(20)
    return venues


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
        "slug": slugify(venue_data.name),
        "city_slug": slugify(venue_data.city),
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


# ============== MY VENUES (OWNER DASHBOARD) ==============

@router.get("/owner/my-venues")
async def get_my_venues(user: dict = Depends(require_role("venue_owner", "admin"))):
    """Get venues owned by current user."""
    if user["role"] == "admin":
        venues = await db.venues.find({}, {"_id": 0}).to_list(1000)
    else:
        venues = await db.venues.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return venues
