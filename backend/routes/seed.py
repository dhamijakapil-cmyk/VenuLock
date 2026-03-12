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
DEV_TOKEN = os.environ.get("DEV_SEED_TOKEN", "venuloq-dev-seed-2024")


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
        "email": "admin@venuloq.in",
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
        "email": "testadmin@venuloq.com",
        "password_hash": hash_password("admin123"),
        "name": "Test Admin",
        "role": "admin",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(test_admin)
    
    # Create RM users with professional profiles
    rm_data = [
        {
            "name": "Rahul Sharma",
            "email": "rm1@venuloq.in",
            "specialties": ["Luxury Weddings", "5-Star Hotels", "Celebrity Events"],
            "bio": "With over 8 years of experience managing high-profile weddings at Delhi's finest venues, Rahul has orchestrated celebrations for industry leaders and Bollywood celebrities. His attention to detail and vendor relationships ensure flawless execution.",
            "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            "cities": ["Delhi", "Gurgaon"],
            "rating": 4.9,
            "response_time": "15 mins"
        },
        {
            "name": "Priya Singh", 
            "email": "rm2@venuloq.in",
            "specialties": ["Destination Weddings", "Heritage Venues", "Intimate Celebrations"],
            "bio": "Priya specializes in creating magical destination weddings and intimate celebrations. Her 6 years at VenuLoQ have been marked by innovative concepts and personalized service that makes every couple feel special.",
            "picture": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400",
            "cities": ["Delhi", "Noida", "Gurgaon"],
            "rating": 4.8,
            "response_time": "20 mins"
        },
        {
            "name": "Amit Kumar",
            "email": "rm3@venuloq.in", 
            "specialties": ["Corporate Events", "Product Launches", "Large-Scale Celebrations"],
            "bio": "Amit brings 10 years of corporate event management expertise to the team. Having managed events for Fortune 500 companies and major product launches, he excels at precision planning and vendor coordination.",
            "picture": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
            "cities": ["Delhi", "Noida"],
            "rating": 4.7,
            "response_time": "30 mins"
        },
        {
            "name": "Neha Verma",
            "email": "rm4@venuloq.in",
            "specialties": ["Budget Weddings", "Farmhouse Events", "Traditional Ceremonies"],
            "bio": "Neha's strength lies in maximizing value without compromising on quality. She has helped over 200 families celebrate their special moments within budget, earning her the title of 'Budget Wedding Queen'.",
            "picture": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
            "cities": ["Gurgaon", "Noida"],
            "rating": 4.8,
            "response_time": "25 mins"
        },
        {
            "name": "Vikram Malhotra",
            "email": "rm5@venuloq.in",
            "specialties": ["Royal Weddings", "Palace Venues", "Multi-Day Functions"],
            "bio": "Vikram is our specialist for grand, multi-day wedding celebrations. With connections to the finest palace venues and heritage properties, he crafts experiences fit for royalty.",
            "picture": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400",
            "cities": ["Delhi", "Gurgaon"],
            "rating": 4.9,
            "response_time": "20 mins"
        }
    ]
    
    rm_ids = []
    for rm_info in rm_data:
        rm_id = generate_id("user_")
        rm_ids.append(rm_id)
        rm = {
            "user_id": rm_id,
            "email": rm_info["email"],
            "password_hash": hash_password("rm123"),
            "name": rm_info["name"],
            "role": "rm",
            "status": "active",
            "cities": rm_info["cities"],
            "specialties": rm_info["specialties"],
            "bio": rm_info["bio"],
            "picture": rm_info["picture"],
            "rating": rm_info["rating"],
            "response_time": rm_info["response_time"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(rm)
    
    # Create venue owner
    owner_id = generate_id("user_")
    owner = {
        "user_id": owner_id,
        "email": "venue@venuloq.in",
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
    
    # Seed premium venues (20+ high-class Delhi NCR venues)
    venues_data = get_premium_venues(owner_id)
    await db.venues.insert_many(venues_data)
    
    # Seed sample reviews for multiple venues
    reviews_data = [
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[0]["venue_id"],
            "user_id": "sample_user_1",
            "user_name": "Ananya Gupta",
            "rating": 5,
            "title": "Perfect wedding venue!",
            "content": "We had our wedding here and it was absolutely magical. The staff was incredibly helpful and the venue looked stunning. The Imperial Ballroom lived up to its reputation.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[0]["venue_id"],
            "user_id": "sample_user_2",
            "user_name": "Vikram Malhotra",
            "rating": 5,
            "title": "Royalty experience",
            "content": "The service was impeccable. From the moment we arrived, we were treated like royalty. The chandeliers, the marble floors - everything screamed luxury.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[2]["venue_id"],
            "user_id": "sample_user_3",
            "user_name": "Ravi Kapoor",
            "rating": 5,
            "title": "Taj never disappoints",
            "content": "Hosted my daughter's wedding here. The Taj team went above and beyond. Multiple venues, seamless coordination, and world-class food. Worth every rupee.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[5]["venue_id"],
            "user_id": "sample_user_4",
            "user_name": "Sonia Mehta",
            "rating": 4,
            "title": "Beautiful outdoor setting",
            "content": "The Roseate Gardens offered a magical setting for our mehendi. The lawns were pristine and the poolside setup was gorgeous. Only minor issue was parking.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[7]["venue_id"],
            "user_id": "sample_user_5",
            "user_name": "Aditya Jain",
            "rating": 5,
            "title": "Stunning views!",
            "content": "Had my engagement party at Sky Lounge. The city skyline at sunset was breathtaking. The cocktails, the ambiance - everything was perfect for our intimate celebration.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.reviews.insert_many(reviews_data)
    
    return {
        "message": "Data seeded successfully",
        "env": ENV,
        "credentials": {
            "admin": {"email": "admin@venuloq.in", "password": "admin123"},
            "rm": {"email": "rm1@venuloq.in", "password": "rm123"},
            "venue_owner": {"email": "venue@venuloq.in", "password": "venue123"}
        }
    }
