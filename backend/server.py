"""
VenuLoQ API - Main Application Entry Point

This is the main FastAPI application file that:
- Creates the FastAPI app instance
- Includes all route modules
- Configures CORS middleware
- Manages startup/shutdown events

NO BUSINESS LOGIC SHOULD BE IN THIS FILE.
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import os
import asyncio
import logging

from config import client

# Logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== APP SETUP ==============

app = FastAPI(
    title="VenuLoQ API", 
    version="1.0.0",
    description="Managed Event Venue Booking Platform API"
)

api_router = APIRouter(prefix="/api")

# ============== ROUTE MODULES ==============

from routes.health import router as health_router
from routes.seed import router as seed_router
from routes.auth import router as auth_router
from routes.booking import router as booking_router
from routes.venues import router as venues_router
from routes.availability import router as availability_router
from routes.comparison_sheets import router as comparison_sheets_router
from routes.leads import router as leads_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router
from routes.notifications import router as notifications_router
from routes.legacy import router as legacy_router
from routes.favorites import router as favorites_router
from routes.chatbot import router as chatbot_router
from routes.top_performers import router as top_performers_router
from routes.shared_comparisons import router as shared_comparisons_router

# Include all routers
api_router.include_router(health_router)
api_router.include_router(seed_router)
api_router.include_router(auth_router)
api_router.include_router(booking_router)
api_router.include_router(venues_router)
api_router.include_router(availability_router)
api_router.include_router(comparison_sheets_router)
api_router.include_router(leads_router)
api_router.include_router(admin_router)
api_router.include_router(payments_router)
api_router.include_router(notifications_router)
api_router.include_router(legacy_router)
api_router.include_router(favorites_router)
api_router.include_router(chatbot_router)
api_router.include_router(top_performers_router)
api_router.include_router(shared_comparisons_router)

app.include_router(api_router)

# ============== LIFECYCLE EVENTS ==============

background_tasks = {}


@app.on_event("startup")
async def startup():
    """Initialize background tasks and run migrations on app startup."""
    from scheduler import start_all_tasks, is_scheduler_enabled
    from config import db as app_db
    import re
    global background_tasks
    background_tasks = await start_all_tasks()
    
    if is_scheduler_enabled():
        logger.info("Scheduler ENABLED - background tasks started")
    else:
        logger.info("Scheduler DISABLED")
    
    # Migration: generate city_slug and slug for venues that don't have them
    try:
        # Auto-seed if database is empty (first production deploy)
        venue_count = await app_db.venues.count_documents({})
        if venue_count == 0:
            logger.info("Empty database detected — auto-seeding venue data...")
            from routes.seed_premium_venues import get_premium_venues
            from utils import generate_id, hash_password
            
            # Create admin user
            admin_id = generate_id("user_")
            admin_exists = await app_db.users.find_one({"email": "admin@venuloq.in"})
            if not admin_exists:
                await app_db.users.insert_one({
                    "user_id": admin_id, "email": "admin@venuloq.in",
                    "password_hash": hash_password("admin123"), "name": "Admin User",
                    "role": "admin", "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            # Create RM users
            rm_emails = [
                ("rm1@venuloq.in", "Rahul Sharma"),
                ("rm2@venuloq.in", "Priya Singh"),
                ("rm3@venuloq.in", "Amit Kumar"),
            ]
            owner_id = generate_id("user_")
            for em, nm in rm_emails:
                rm_exists = await app_db.users.find_one({"email": em})
                if not rm_exists:
                    await app_db.users.insert_one({
                        "user_id": generate_id("user_"), "email": em,
                        "password_hash": hash_password("rm123"), "name": nm,
                        "role": "rm", "status": "active",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
            
            # Create venue owner
            owner_exists = await app_db.users.find_one({"email": "venue@venuloq.in"})
            if not owner_exists:
                await app_db.users.insert_one({
                    "user_id": owner_id, "email": "venue@venuloq.in",
                    "password_hash": hash_password("venue123"), "name": "Venue Owner",
                    "role": "venue_owner", "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            # Seed venues
            venues_data = get_premium_venues(owner_id)
            if venues_data:
                await app_db.venues.insert_many(venues_data)
                logger.info(f"Auto-seeded {len(venues_data)} venues")
            
            # Seed additional premium venues
            try:
                from add_premium_venues import NEW_VENUES, make_venue
                extra = [make_venue(*args, owner_id=owner_id) for args in NEW_VENUES]
                if extra:
                    await app_db.venues.insert_many(extra)
                    logger.info(f"Auto-seeded {len(extra)} additional premium venues")
            except Exception as e:
                logger.warning(f"Could not seed extra venues: {e}")
            
            # Seed cities
            city_count = await app_db.cities.count_documents({})
            if city_count == 0:
                cities_data = [
                    {"city_id": "city_delhi", "name": "Delhi", "state": "Delhi", "areas": [
                        {"area_id": "area_1", "name": "Connaught Place", "pincode": "110001"},
                        {"area_id": "area_2", "name": "Dwarka", "pincode": "110075"},
                        {"area_id": "area_3", "name": "Lodhi Road", "pincode": "110003"},
                        {"area_id": "area_4", "name": "Aerocity", "pincode": "110037"},
                    ], "active": True},
                    {"city_id": "city_gurgaon", "name": "Gurgaon", "state": "Haryana", "areas": [
                        {"area_id": "area_6", "name": "DLF Phase 1", "pincode": "122002"},
                    ], "active": True},
                    {"city_id": "city_noida", "name": "Noida", "state": "Uttar Pradesh", "areas": [
                        {"area_id": "area_10", "name": "Sector 18", "pincode": "201301"},
                    ], "active": True},
                    {"city_id": "city_mumbai", "name": "Mumbai", "state": "Maharashtra", "areas": [
                        {"area_id": "area_13", "name": "Colaba", "pincode": "400001"},
                        {"area_id": "area_m2", "name": "Worli", "pincode": "400018"},
                    ], "active": True},
                    {"city_id": "city_bengaluru", "name": "Bengaluru", "state": "Karnataka", "areas": [
                        {"area_id": "area_16", "name": "Indiranagar", "pincode": "560038"},
                    ], "active": True},
                    {"city_id": "city_hyderabad", "name": "Hyderabad", "state": "Telangana", "areas": [
                        {"area_id": "area_hy1", "name": "HITEC City", "pincode": "500081"},
                    ], "active": True},
                    {"city_id": "city_chennai", "name": "Chennai", "state": "Tamil Nadu", "areas": [
                        {"area_id": "area_ch1", "name": "MRC Nagar", "pincode": "600028"},
                    ], "active": True},
                    {"city_id": "city_chandigarh", "name": "Chandigarh", "state": "Chandigarh", "areas": [
                        {"area_id": "area_cg1", "name": "New Chandigarh", "pincode": "140306"},
                    ], "active": True},
                    {"city_id": "city_greater_noida", "name": "Greater Noida", "state": "Uttar Pradesh", "areas": [
                        {"area_id": "area_gn1", "name": "Pari Chowk", "pincode": "201306"},
                    ], "active": True},
                ]
                await app_db.cities.insert_many(cities_data)
                logger.info("Auto-seeded cities")

        venues_missing_slugs = await app_db.venues.count_documents(
            {"$or": [{"slug": {"$exists": False}}, {"slug": None}, {"slug": ""}, 
                     {"city_slug": {"$exists": False}}, {"city_slug": None}, {"city_slug": ""}]}
        )
        if venues_missing_slugs > 0:
            logger.info(f"Migrating slugs for {venues_missing_slugs} venues...")
            cursor = app_db.venues.find(
                {"$or": [{"slug": {"$exists": False}}, {"slug": None}, {"slug": ""},
                         {"city_slug": {"$exists": False}}, {"city_slug": None}, {"city_slug": ""}]}
            )
            async for venue in cursor:
                name = venue.get("name", "")
                city = venue.get("city", "")
                slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') if name else venue.get("venue_id", "")
                city_slug = re.sub(r'[^a-z0-9]+', '-', city.lower()).strip('-') if city else "india"
                await app_db.venues.update_one(
                    {"_id": venue["_id"]}, 
                    {"$set": {"slug": slug, "city_slug": city_slug}}
                )
            logger.info("Slug migration complete")
        else:
            logger.info("All venues already have slugs")
        
        # Ensure compound index for fast slug lookups
        await app_db.venues.create_index(
            [("city_slug", 1), ("slug", 1), ("status", 1)],
            name="city_venue_slug_idx",
            background=True
        )
    except Exception as e:
        logger.error(f"Slug migration error: {e}")


@app.on_event("shutdown")
async def shutdown():
    """Clean up resources on app shutdown."""
    # Cancel background tasks
    for name, task in background_tasks.items():
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    # Close MongoDB connection
    client.close()
    logger.info("Shutdown complete")


# ============== MIDDLEWARE ==============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
