"""
Routes package for BookMyVenue API.
"""
from routes.auth import router as auth_router
from routes.venues import router as venues_router
from routes.availability import router as availability_router
from routes.comparison_sheets import router as comparison_sheets_router

__all__ = ['auth_router', 'venues_router', 'availability_router', 'comparison_sheets_router']
