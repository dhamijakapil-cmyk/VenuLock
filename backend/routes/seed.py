"""
Seed data route for development ONLY.

Security:
- Only works when ENV=dev (returns 404 in production)
- Requires X-DEV-TOKEN header with correct token
"""
import os
from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timezone
from typing import Optional

from config import db
from utils import generate_id, hash_password
from routes.seed_premium_venues import get_premium_venues

router = APIRouter(tags=["dev"])

# Environment check
ENV = os.environ.get("ENV", "production").lower()
DEV_TOKEN = os.environ.get("DEV_SEED_TOKEN", "bookmyvenue-dev-seed-2024")


def _check_dev_access(x_dev_token: Optional[str] = Header(None, alias="X-DEV-TOKEN")):
    """Verify development environment and token."""
    # Block in production
    if ENV not in ("dev", "development", "local", "test"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Verify token
    if not x_dev_token or x_dev_token != DEV_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid or missing dev token")
    
    return True


@router.post("/seed-data")
async def seed_data(x_dev_token: Optional[str] = Header(None, alias="X-DEV-TOKEN")):
    """
    Seed initial data for development.
    
    Security:
    - Only works in dev environment (ENV=dev)
    - Requires header: X-DEV-TOKEN: <token>
    - Returns 404 in production
    - Returns 403 if token missing/invalid
    """
    # Security check
    _check_dev_access(x_dev_token)
    
    # Check if data already exists
    existing_venues = await db.venues.count_documents({})
    if existing_venues > 0:
        return {"message": "Data already seeded", "env": ENV}
    
    # Create admin user
    admin_id = generate_id("user_")
    admin = {
        "user_id": admin_id,
        "email": "admin@bookmyvenue.in",
        "password_hash": hash_password("admin123"),
        "name": "Admin User",
        "role": "admin",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    
    # Create test admin
    test_admin_id = generate_id("user_")
    test_admin = {
        "user_id": test_admin_id,
        "email": "testadmin@bookmyvenue.com",
        "password_hash": hash_password("admin123"),
        "name": "Test Admin",
        "role": "admin",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(test_admin)
    
    # Create RM users
    rm_ids = []
    for i, name in enumerate(["Rahul Sharma", "Priya Singh", "Amit Kumar", "Neha Verma"]):
        rm_id = generate_id("user_")
        rm_ids.append(rm_id)
        rm = {
            "user_id": rm_id,
            "email": f"rm{i+1}@bookmyvenue.in",
            "password_hash": hash_password("rm123"),
            "name": name,
            "role": "rm",
            "status": "active",
            "cities": ["Delhi", "Gurgaon", "Noida"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(rm)
    
    # Create venue owner
    owner_id = generate_id("user_")
    owner = {
        "user_id": owner_id,
        "email": "venue@bookmyvenue.in",
        "password_hash": hash_password("venue123"),
        "name": "Venue Owner Demo",
        "role": "venue_owner",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(owner)
    
    # Seed cities
    cities_data = [
        {"city_id": "city_delhi", "name": "Delhi", "state": "Delhi", "areas": [
            {"area_id": "area_1", "name": "Connaught Place", "pincode": "110001"},
            {"area_id": "area_2", "name": "Dwarka", "pincode": "110075"},
            {"area_id": "area_3", "name": "Rohini", "pincode": "110085"},
            {"area_id": "area_4", "name": "Karol Bagh", "pincode": "110005"},
            {"area_id": "area_5", "name": "Pitampura", "pincode": "110034"}
        ], "active": True},
        {"city_id": "city_gurgaon", "name": "Gurgaon", "state": "Haryana", "areas": [
            {"area_id": "area_6", "name": "DLF Phase 1", "pincode": "122002"},
            {"area_id": "area_7", "name": "Golf Course Road", "pincode": "122018"},
            {"area_id": "area_8", "name": "Cyber City", "pincode": "122002"},
            {"area_id": "area_9", "name": "Sohna Road", "pincode": "122001"}
        ], "active": True},
        {"city_id": "city_noida", "name": "Noida", "state": "Uttar Pradesh", "areas": [
            {"area_id": "area_10", "name": "Sector 18", "pincode": "201301"},
            {"area_id": "area_11", "name": "Sector 62", "pincode": "201309"},
            {"area_id": "area_12", "name": "Greater Noida", "pincode": "201310"}
        ], "active": True}
    ]
    await db.cities.insert_many(cities_data)
    
    # Seed venues
    venues_data = [
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Grand Imperial",
            "description": "A majestic venue for grand celebrations with stunning architecture and world-class amenities.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Connaught Place",
            "address": "123 Kasturba Gandhi Marg, Connaught Place",
            "pincode": "110001",
            "latitude": 28.6315,
            "longitude": 77.2167,
            "slug": "the-grand-imperial",
            "event_types": ["wedding", "reception", "corporate", "birthday"],
            "venue_type": "banquet_hall",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 1000,
            "pricing": {
                "price_per_plate_veg": 1800,
                "price_per_plate_nonveg": 2200,
                "min_spend": 500000,
                "packages": [
                    {"name": "Silver", "price": 500000, "guests": 300},
                    {"name": "Gold", "price": 800000, "guests": 500},
                    {"name": "Platinum", "price": 1200000, "guests": 800}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 50, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800",
                "https://images.unsplash.com/photo-1571983371651-221e6c0b910a?w=800",
                "https://images.unsplash.com/photo-1728024181315-8c7f5815bf00?w=800"
            ],
            "policies": "Booking requires 50% advance. Cancellation charges apply.",
            "rating": 4.8,
            "review_count": 156,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Royal Gardens Farmhouse",
            "description": "Sprawling outdoor venue perfect for grand weddings with lush green lawns and rustic charm.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "Sohna Road",
            "address": "KM 15, Sohna Road, Near Golf Course Extension",
            "pincode": "122001",
            "latitude": 28.4089,
            "longitude": 77.0436,
            "slug": "royal-gardens-farmhouse",
            "event_types": ["wedding", "mehendi", "sangeet", "reception"],
            "venue_type": "farmhouse",
            "indoor_outdoor": "outdoor",
            "capacity_min": 200,
            "capacity_max": 2000,
            "pricing": {
                "price_per_plate_veg": 1200,
                "price_per_plate_nonveg": 1500,
                "min_spend": 300000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 10, "ac": False, "catering_inhouse": False,
                "catering_outside_allowed": True, "decor_inhouse": False,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1745573673416-66e829644ae9?w=800",
                "https://images.unsplash.com/photo-1677232519517-9dca7baadfd3?w=800"
            ],
            "policies": "Outside caterers allowed. Decor must be approved.",
            "rating": 4.5,
            "review_count": 89,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Sapphire Convention Centre",
            "description": "Modern convention centre ideal for corporate events, conferences, and exhibitions.",
            "city": "Noida",
            "city_slug": "noida",
            "area": "Sector 18",
            "address": "Plot 12, Sector 18, Near Atta Market",
            "pincode": "201301",
            "latitude": 28.5700,
            "longitude": 77.3219,
            "slug": "sapphire-convention-centre",
            "event_types": ["corporate", "conference", "exhibition", "product_launch"],
            "venue_type": "convention_center",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 500,
            "pricing": {
                "price_per_plate_veg": 800,
                "price_per_plate_nonveg": 1000,
                "min_spend": 100000,
                "packages": [
                    {"name": "Half Day", "price": 75000, "hours": 4},
                    {"name": "Full Day", "price": 120000, "hours": 8}
                ]
            },
            "amenities": {
                "parking": True, "valet": False, "alcohol_allowed": False,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": False, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1759065662057-0c008c001d8d?w=800"
            ],
            "policies": "Corporate booking requires company details.",
            "rating": 4.2,
            "review_count": 45,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Heritage Palace Hotel",
            "description": "Luxurious 5-star hotel venue combining traditional elegance with modern amenities.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Karol Bagh",
            "address": "15-A, Pusa Road, Karol Bagh",
            "pincode": "110005",
            "latitude": 28.6448,
            "longitude": 77.1900,
            "slug": "heritage-palace-hotel",
            "event_types": ["wedding", "reception", "engagement", "birthday", "anniversary"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 400,
            "pricing": {
                "price_per_plate_veg": 2500,
                "price_per_plate_nonveg": 3000,
                "min_spend": 400000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 120, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1708748144709-651ebdab3f96?w=800"
            ],
            "policies": "Room booking mandatory for events over 200 guests.",
            "rating": 4.7,
            "review_count": 234,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Sunset Terrace",
            "description": "Stunning rooftop venue with panoramic city views, perfect for intimate gatherings.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "Golf Course Road",
            "address": "Tower B, Golf Course Road, DLF Phase 5",
            "pincode": "122018",
            "latitude": 28.4595,
            "longitude": 77.1025,
            "slug": "sunset-terrace",
            "event_types": ["cocktail", "birthday", "corporate", "engagement"],
            "venue_type": "rooftop",
            "indoor_outdoor": "outdoor",
            "capacity_min": 30,
            "capacity_max": 150,
            "pricing": {
                "price_per_plate_veg": 1500,
                "price_per_plate_nonveg": 2000,
                "min_spend": 150000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": False, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1677232519517-9dca7baadfd3?w=800"
            ],
            "policies": "Weather-dependent venue. Backup indoor space available.",
            "rating": 4.6,
            "review_count": 67,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.venues.insert_many(venues_data)
    
    # Seed sample reviews
    reviews_data = [
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[0]["venue_id"],
            "user_id": "sample_user_1",
            "user_name": "Ananya Gupta",
            "rating": 5,
            "title": "Perfect wedding venue!",
            "content": "We had our wedding here and it was absolutely magical. The staff was incredibly helpful and the venue looked stunning.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[0]["venue_id"],
            "user_id": "sample_user_2",
            "user_name": "Vikram Malhotra",
            "rating": 4,
            "title": "Great venue, minor issues",
            "content": "Beautiful venue with excellent service. Only issue was parking during peak hours.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.reviews.insert_many(reviews_data)
    
    return {
        "message": "Data seeded successfully",
        "env": ENV,
        "credentials": {
            "admin": {"email": "admin@bookmyvenue.in", "password": "admin123"},
            "rm": {"email": "rm1@bookmyvenue.in", "password": "rm123"},
            "venue_owner": {"email": "venue@bookmyvenue.in", "password": "venue123"}
        }
    }
