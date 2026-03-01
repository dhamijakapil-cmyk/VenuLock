"""
BookMyVenue API - Main Application Entry Point

This is the main FastAPI application file that:
- Creates the FastAPI app instance
- Includes all route modules
- Configures CORS middleware
- Manages startup/shutdown events
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import os
import asyncio
import logging

from config import client

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="BookMyVenue API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import modular routes
from routes.health import router as health_router
from routes.seed import router as seed_router
from routes.auth import router as auth_router
from routes.venues import router as venues_router
from routes.availability import router as availability_router
from routes.comparison_sheets import router as comparison_sheets_router
from routes.leads import router as leads_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router
from routes.notifications import router as notifications_router

# Include all routers
api_router.include_router(health_router)
api_router.include_router(seed_router)
api_router.include_router(auth_router)
api_router.include_router(venues_router)
api_router.include_router(availability_router)
api_router.include_router(comparison_sheets_router)
api_router.include_router(leads_router)
api_router.include_router(admin_router)
api_router.include_router(payments_router)
api_router.include_router(notifications_router)

# Include the API router
app.include_router(api_router)

# Background tasks
background_tasks = {}


@app.on_event("startup")
async def startup():
    """Start background tasks on app startup."""
    from scheduler import start_all_tasks
    global background_tasks
    background_tasks = await start_all_tasks()
    logger.info("Background tasks started")


@app.on_event("shutdown")
async def shutdown():
    """Clean up on app shutdown."""
    # Cancel background tasks
    for name, task in background_tasks.items():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    # Close MongoDB connection
    client.close()
    logger.info("Shutdown complete")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

