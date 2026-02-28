"""
BookMyVenue API - Main Entry Point

This file uses the strangler pattern to gradually migrate routes from server.py
to modular route files. During migration, both old (server.py) and new (routes/)
endpoints coexist.

Migration Status:
- [x] auth - migrated to routes/auth.py
- [x] venues - migrated to routes/venues.py
- [ ] availability + holds
- [ ] comparison sheets
- [ ] leads/client cases + CRM
- [ ] payments + commissions
- [ ] admin analytics/control room
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from config import client, logger

# Import modular routers (migrated routes)
from routes.auth import router as auth_router
from routes.venues import router as venues_router

# Import legacy router (routes still in server.py)
from server import api_router as legacy_router

# Create the main app
app = FastAPI(title="BookMyVenue API", version="2.0.0")

# Include migrated routers (these take precedence)
app.include_router(auth_router, prefix="/api")
app.include_router(venues_router, prefix="/api")

# Include legacy router (all remaining routes from server.py)
app.include_router(legacy_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    from datetime import datetime, timezone
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
