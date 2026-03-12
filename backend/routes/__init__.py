"""
Routes package for VenuLoQ API.
"""
from routes.auth import router as auth_router
from routes.venues import router as venues_router
from routes.availability import router as availability_router
from routes.comparison_sheets import router as comparison_sheets_router
from routes.leads import router as leads_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router

__all__ = ['auth_router', 'venues_router', 'availability_router', 'comparison_sheets_router', 'leads_router', 'admin_router', 'payments_router']
