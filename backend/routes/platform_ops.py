"""
Platform Operations API — Phase 17
Admin-only endpoints for monitoring, capacity intelligence, and performance visibility.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from config import db
from utils import get_current_user
from services.capacity_intelligence import run_capacity_analysis
from services.perf_monitor import get_performance_stats, reset_performance_stats

router = APIRouter(prefix="/platform-ops", tags=["Platform Operations"])


def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Ven-Us Capacity Intelligence ──

@router.get("/capacity/analysis")
async def get_capacity_analysis(user: dict = Depends(require_admin)):
    """Run live capacity analysis and return workforce recommendations."""
    result = await run_capacity_analysis(db)
    result.pop("_id", None)
    return result


@router.get("/capacity/history")
async def get_capacity_history(limit: int = 20, user: dict = Depends(require_admin)):
    """Get historical capacity snapshots."""
    snapshots = await db.capacity_alerts.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"snapshots": snapshots}


# ── Performance Monitoring ──

@router.get("/performance/stats")
async def get_perf_stats(user: dict = Depends(require_admin)):
    """Get current endpoint performance statistics."""
    stats = get_performance_stats()
    return {
        "stats": stats,
        "total_endpoints": len(stats),
        "slow_endpoints": [s for s in stats if s["slow_count"] > 0],
        "error_endpoints": [s for s in stats if s["error_count"] > 0],
    }


@router.post("/performance/reset")
async def reset_perf_stats(user: dict = Depends(require_admin)):
    """Reset performance counters."""
    reset_performance_stats()
    return {"message": "Performance stats reset"}


# ── System Health ──

@router.get("/health/db")
async def check_db_health(user: dict = Depends(require_admin)):
    """Check database health and collection stats."""
    collections = await db.list_collection_names()
    stats = {}
    for c in sorted(collections):
        count = await db[c].estimated_document_count()
        indexes = await db[c].index_information()
        stats[c] = {
            "documents": count,
            "indexes": len(indexes),
            "index_names": list(indexes.keys()),
        }
    return {
        "status": "healthy",
        "collections": len(collections),
        "details": stats,
    }
