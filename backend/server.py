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
from routes.push import router as push_router
from routes.workflow import router as workflow_router
from routes.hr import router as hr_router
from routes.venue_onboarding import router as venue_onboarding_router
from routes.team import router as team_router
from routes.google_auth import router as google_auth_router
from routes.apple_auth import router as apple_auth_router


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
api_router.include_router(push_router)
api_router.include_router(workflow_router)
api_router.include_router(hr_router)
api_router.include_router(venue_onboarding_router)
api_router.include_router(team_router)
api_router.include_router(google_auth_router)
api_router.include_router(apple_auth_router)
app.include_router(api_router)

# ============== LIFECYCLE EVENTS ==============

background_tasks = {}


@app.on_event("startup")
async def startup():
    """Initialize background tasks and run migrations on app startup."""
    global background_tasks

    # Start scheduler (non-critical — don't block startup)
    try:
        from scheduler import start_all_tasks, is_scheduler_enabled
        background_tasks = await start_all_tasks()
        if is_scheduler_enabled():
            logger.info("Scheduler ENABLED - background tasks started")
        else:
            logger.info("Scheduler DISABLED")
    except Exception as e:
        logger.error(f"Scheduler startup error (non-fatal): {e}")
        background_tasks = {}

    # Run heavy data migrations in the background so the server
    # can start accepting requests immediately.  This prevents
    # Kubernetes liveness probes from timing out on remote Atlas.
    asyncio.create_task(_run_startup_migrations())


async def _run_startup_migrations():
    """Heavy data migrations that run as a background task after startup."""
    from config import db as app_db
    import re

    try:
        from utils import generate_id, hash_password

        # Create default users if they don't exist
        admin_exists = await app_db.users.find_one({"email": "admin@venuloq.in"})
        if not admin_exists:
            await app_db.users.insert_one({
                "user_id": generate_id("user_"), "email": "admin@venuloq.in",
                "password_hash": hash_password("admin123"), "name": "Admin User",
                "role": "admin", "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        for em, nm in [("rm1@venuloq.in", "Rahul Sharma"), ("rm2@venuloq.in", "Priya Singh"), ("rm3@venuloq.in", "Amit Kumar")]:
            if not await app_db.users.find_one({"email": em}):
                await app_db.users.insert_one({
                    "user_id": generate_id("user_"), "email": em,
                    "password_hash": hash_password("rm123"), "name": nm,
                    "role": "rm", "status": "active",
                    "verification_status": "verified", "profile_completed": True,
                    "must_change_password": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })

        # Create default HR user
        hr_exists = await app_db.users.find_one({"email": "hr@venuloq.in"})
        if not hr_exists:
            await app_db.users.insert_one({
                "user_id": generate_id("user_"), "email": "hr@venuloq.in",
                "password_hash": hash_password("hr123"), "name": "Meera Kapoor",
                "role": "hr", "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Create Venue Specialist user
        vs_exists = await app_db.users.find_one({"email": "specialist@venuloq.in"})
        if not vs_exists:
            await app_db.users.insert_one({
                "user_id": generate_id("user_"), "email": "specialist@venuloq.in",
                "password_hash": hash_password("spec123"), "name": "Arjun Mehta",
                "role": "venue_specialist", "status": "active",
                "verification_status": "verified", "profile_completed": True,
                "must_change_password": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Create Venue Acquisition Manager user
        vam_exists = await app_db.users.find_one({"email": "vam@venuloq.in"})
        if not vam_exists:
            await app_db.users.insert_one({
                "user_id": generate_id("user_"), "email": "vam@venuloq.in",
                "password_hash": hash_password("vam123"), "name": "Sneha Reddy",
                "role": "vam", "status": "active",
                "verification_status": "verified", "profile_completed": True,
                "must_change_password": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        owner = await app_db.users.find_one({"email": "venue@venuloq.in"})
        if not owner:
            owner_id = generate_id("user_")
            await app_db.users.insert_one({
                "user_id": owner_id, "email": "venue@venuloq.in",
                "password_hash": hash_password("venue123"), "name": "Venue Owner",
                "role": "venue_owner", "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            owner_id = owner["user_id"]

        # ============ COMPLETE VENUE SYNC ============
        import json
        seed_path = os.path.join(os.path.dirname(__file__), "all_venues_seed.json")
        if os.path.exists(seed_path):
            with open(seed_path, "r") as f:
                all_seed_venues = json.load(f)
            
            upserted = 0
            for v in all_seed_venues:
                slug = v.get("slug")
                if not slug:
                    continue
                v["owner_id"] = owner_id
                v.pop("_id", None)
                result = await app_db.venues.update_one(
                    {"slug": slug},
                    {"$set": v},
                    upsert=True,
                )
                if result.upserted_id or result.modified_count:
                    upserted += 1
            if upserted:
                logger.info(f"Venue upsert: {upserted} venues synced/updated from master seed")
        else:
            logger.warning("all_venues_seed.json not found — skipping venue sync")

        # Sync cities
        city_defs = [
            {"city_id": "city_delhi", "name": "Delhi", "state": "Delhi", "active": True, "areas": [{"area_id": "area_1", "name": "Connaught Place", "pincode": "110001"}]},
            {"city_id": "city_mumbai", "name": "Mumbai", "state": "Maharashtra", "active": True, "areas": [{"area_id": "area_m1", "name": "Colaba", "pincode": "400001"}]},
            {"city_id": "city_gurgaon", "name": "Gurgaon", "state": "Haryana", "active": True, "areas": [{"area_id": "area_g1", "name": "DLF Phase 1", "pincode": "122002"}]},
            {"city_id": "city_noida", "name": "Noida", "state": "Uttar Pradesh", "active": True, "areas": [{"area_id": "area_n1", "name": "Sector 18", "pincode": "201301"}]},
            {"city_id": "city_hyderabad", "name": "Hyderabad", "state": "Telangana", "active": True, "areas": [{"area_id": "area_hy1", "name": "HITEC City", "pincode": "500081"}]},
            {"city_id": "city_chennai", "name": "Chennai", "state": "Tamil Nadu", "active": True, "areas": [{"area_id": "area_ch1", "name": "MRC Nagar", "pincode": "600028"}]},
            {"city_id": "city_chandigarh", "name": "Chandigarh", "state": "Chandigarh", "active": True, "areas": [{"area_id": "area_cg1", "name": "New Chandigarh", "pincode": "140306"}]},
            {"city_id": "city_bangalore", "name": "Bangalore", "state": "Karnataka", "active": True, "areas": [{"area_id": "area_bl1", "name": "Residency Road", "pincode": "560025"}]},
            {"city_id": "city_greater_noida", "name": "Greater Noida", "state": "Uttar Pradesh", "active": True, "areas": [{"area_id": "area_gn1", "name": "Pari Chowk", "pincode": "201306"}]},
        ]
        for city in city_defs:
            if not await app_db.cities.find_one({"city_id": city["city_id"]}):
                await app_db.cities.insert_one(city)

        # Update any venues with fewer than 5 photos
        try:
            from add_premium_venues import BALLROOM_PHOTOS, BANQUET_PHOTOS, OUTDOOR_PHOTOS, HOTEL_PHOTOS, HERITAGE_PHOTOS
            photo_pool = BALLROOM_PHOTOS + BANQUET_PHOTOS + HOTEL_PHOTOS
            async for v in app_db.venues.find({"status": "approved"}, {"_id": 0, "venue_id": 1, "images": 1}):
                imgs = v.get("images", [])
                if len(imgs) < 5:
                    extra = [p for p in photo_pool if p not in imgs][:5 - len(imgs)]
                    await app_db.venues.update_one({"venue_id": v["venue_id"]}, {"$set": {"images": imgs + extra}})
        except ImportError:
            logger.warning("add_premium_venues not found — skipping photo fill")

        final_count = await app_db.venues.count_documents({"status": "approved"})
        logger.info(f"Venue sync complete. Total approved: {final_count}")

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
        logger.error(f"Startup migration error (non-fatal): {e}")


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
