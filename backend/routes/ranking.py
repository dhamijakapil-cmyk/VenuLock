"""
VenuLoQ Ranking Engine — API Routes
Shadow/validation mode by default. No live customer impact.
"""
import os
import copy
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Body
from pydantic import BaseModel

from ranking.config import DEFAULT_CONFIG, VALID_ROLLOUT_MODES, ENGINE_VERSION
from ranking.engine import run_ranking_pipeline

router = APIRouter(prefix="/ranking", tags=["ranking"])


# ─── Helpers ───

def get_db(request: Request):
    from config import db
    return db


async def get_config(db) -> dict:
    """Load config from DB, or seed default."""
    cfg = await db.ranking_config.find_one({"_type": "active"}, {"_id": 0})
    if not cfg:
        seed = copy.deepcopy(DEFAULT_CONFIG)
        seed["_type"] = "active"
        seed["updated_at"] = datetime.now(timezone.utc).isoformat()
        seed["updated_by"] = "system"
        await db.ranking_config.insert_one(seed)
        cfg = await db.ranking_config.find_one({"_type": "active"}, {"_id": 0})
    return cfg


async def log_audit(db, entry: dict):
    """Store an audit log entry for ranking decisions."""
    entry["timestamp"] = datetime.now(timezone.utc).isoformat()
    entry["engine_version"] = ENGINE_VERSION
    await db.ranking_audit.insert_one(entry)


# ─── Models ───

class SearchInput(BaseModel):
    city: Optional[str] = None
    area: Optional[str] = None
    guest_count: Optional[int] = None
    budget_per_plate: Optional[float] = None
    event_type: Optional[str] = None
    venue_type: Optional[str] = None
    indoor_outdoor: Optional[str] = None
    vibe: Optional[str] = None
    required_amenities: Optional[List[str]] = None


class OverrideInput(BaseModel):
    venue_id: str
    action: str  # pin, demote, exclude
    reason: str  # mandatory
    context: Optional[str] = None  # related lead/enquiry


class ConfigUpdateInput(BaseModel):
    weights: Optional[dict] = None
    customer_fit_sub: Optional[dict] = None
    quality_trust_sub: Optional[dict] = None
    freshness_sub: Optional[dict] = None
    penalties: Optional[dict] = None
    boosts: Optional[dict] = None
    diversity: Optional[dict] = None
    buckets: Optional[dict] = None
    eligibility: Optional[dict] = None
    neutral_scores: Optional[dict] = None
    rollout_mode: Optional[str] = None


# ─── Routes ───

@router.get("/config")
async def get_ranking_config(request: Request):
    """Get current ranking engine configuration."""
    db = get_db(request)
    cfg = await get_config(db)
    cfg.pop("_type", None)
    return {"config": cfg}


@router.put("/config")
async def update_ranking_config(request: Request, body: ConfigUpdateInput):
    """Update ranking configuration. Admin only. Increments config_version."""
    db = get_db(request)
    cfg = await get_config(db)

    # Validate rollout mode
    if body.rollout_mode and body.rollout_mode not in VALID_ROLLOUT_MODES:
        raise HTTPException(400, f"Invalid rollout_mode. Must be one of {VALID_ROLLOUT_MODES}")

    # Build update dict from non-None fields
    updates = {}
    for field in ["weights", "customer_fit_sub", "quality_trust_sub", "freshness_sub",
                  "penalties", "boosts", "diversity", "buckets", "eligibility", "neutral_scores",
                  "rollout_mode"]:
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    if not updates:
        raise HTTPException(400, "No fields to update")

    # Validate top-level weights sum to ~1.0
    if "weights" in updates:
        total = sum(updates["weights"].values())
        if abs(total - 1.0) > 0.01:
            raise HTTPException(400, f"Top-level weights must sum to 1.0 (got {total:.3f})")

    updates["config_version"] = cfg.get("config_version", 1) + 1
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = "admin"

    # Archive current config before updating
    archive = copy.deepcopy(cfg)
    archive["_type"] = "archived"
    archive["archived_at"] = updates["updated_at"]
    await db.ranking_config.insert_one(archive)

    # Apply update
    await db.ranking_config.update_one({"_type": "active"}, {"$set": updates})

    # Audit log
    await log_audit(db, {
        "action": "config_update",
        "changes": {k: v for k, v in updates.items() if k not in ["updated_at", "updated_by"]},
        "previous_version": cfg.get("config_version", 1),
        "new_version": updates["config_version"],
    })

    return {"message": "Config updated", "config_version": updates["config_version"]}


@router.post("/calculate")
async def calculate_ranking(request: Request, search: SearchInput):
    """
    Run the full ranking pipeline for given search params.
    Returns scored + bucketed results with full audit trail.
    Available in shadow/internal_preview/live modes.
    """
    db = get_db(request)
    cfg = await get_config(db)

    if cfg.get("rollout_mode") == "off":
        raise HTTPException(403, "Ranking engine is currently OFF")

    # Build search dict
    search_dict = search.dict(exclude_none=True)

    # Fetch all venues (eligibility filter will narrow down)
    venues = await db.venues.find({}, {"_id": 0}).to_list(length=5000)

    # Fetch active overrides
    overrides = await db.ranking_overrides.find(
        {"active": True}, {"_id": 0}
    ).to_list(length=500)

    # Run pipeline
    result = run_ranking_pipeline(venues, search_dict, cfg, overrides)

    # Store audit record
    await log_audit(db, {
        "action": "ranking_run",
        "search_input": search_dict,
        "config_version": cfg.get("config_version", 1),
        "total_venues": result["total_venues_considered"],
        "total_eligible": result["total_eligible"],
        "total_ineligible": result["total_ineligible"],
        "top_5_venue_ids": [v["venue_id"] for v in result["full_ranked_list"][:5]],
        "bucket_sizes": {
            "best_matches": len(result["buckets"]["best_matches"]),
            "smart_alternatives": len(result["buckets"]["smart_alternatives"]),
            "expert_picks": len(result["buckets"]["expert_picks"]),
        },
    })

    return result


@router.post("/shadow")
async def shadow_compare(request: Request, search: SearchInput):
    """
    Shadow mode: compare current customer ordering vs engine ranking.
    Shows both side-by-side for validation.
    """
    db = get_db(request)
    cfg = await get_config(db)

    search_dict = search.dict(exclude_none=True)

    # Get current customer-visible ordering (existing search logic)
    query = {}
    if search.city:
        query["city"] = {"$regex": f"^{search.city}$", "$options": "i"}
    if search.venue_type:
        query["venue_type"] = {"$regex": f"^{search.venue_type}$", "$options": "i"}
    if search.event_type:
        query["event_types"] = {"$regex": search.event_type, "$options": "i"}

    current_order = await db.venues.find(query, {"_id": 0}).sort("rating", -1).limit(30).to_list(length=30)
    current_ids = [v.get("venue_id") for v in current_order]
    current_names = [v.get("name") for v in current_order]

    # Get engine ranking
    all_venues = await db.venues.find({}, {"_id": 0}).to_list(length=5000)
    overrides = await db.ranking_overrides.find({"active": True}, {"_id": 0}).to_list(length=500)
    engine_result = run_ranking_pipeline(all_venues, search_dict, cfg, overrides)

    engine_ids = [v["venue_id"] for v in engine_result["full_ranked_list"]]
    engine_names = [v["venue_name"] for v in engine_result["full_ranked_list"]]

    # Compute rank differences
    diffs = []
    for i, vid in enumerate(engine_ids[:15]):
        current_pos = current_ids.index(vid) + 1 if vid in current_ids else None
        engine_pos = i + 1
        diff = (current_pos - engine_pos) if current_pos else None
        v_data = next((v for v in engine_result["full_ranked_list"] if v["venue_id"] == vid), {})
        diffs.append({
            "venue_id": vid,
            "venue_name": v_data.get("venue_name", ""),
            "current_position": current_pos,
            "engine_position": engine_pos,
            "position_change": diff,
            "engine_score": v_data.get("scoring", {}).get("final_score", 0),
        })

    return {
        "search_input": search_dict,
        "config_version": cfg.get("config_version", 1),
        "rollout_mode": cfg.get("rollout_mode", "shadow"),
        "current_order": {
            "source": "existing_sort_by_rating",
            "venue_ids": current_ids[:15],
            "venue_names": current_names[:15],
        },
        "engine_order": {
            "source": "ranking_engine_v" + ENGINE_VERSION,
            "venue_ids": engine_ids[:15],
            "venue_names": engine_names[:15],
            "buckets": {
                "best_matches": len(engine_result["buckets"]["best_matches"]),
                "smart_alternatives": len(engine_result["buckets"]["smart_alternatives"]),
                "expert_picks": len(engine_result["buckets"]["expert_picks"]),
            },
        },
        "rank_differences": diffs,
        "full_engine_result": engine_result,
    }


@router.post("/override")
async def create_override(request: Request, body: OverrideInput):
    """Create a manual venue override (pin/demote/exclude). Reason mandatory."""
    db = get_db(request)

    if body.action not in ["pin", "demote", "exclude"]:
        raise HTTPException(400, "Action must be pin, demote, or exclude")

    if not body.reason or len(body.reason.strip()) < 5:
        raise HTTPException(400, "Override reason is mandatory (min 5 characters)")

    # Check venue exists
    venue = await db.venues.find_one({"venue_id": body.venue_id}, {"_id": 0, "name": 1})
    if not venue:
        raise HTTPException(404, "Venue not found")

    override = {
        "venue_id": body.venue_id,
        "venue_name": venue.get("name", ""),
        "action": body.action,
        "reason": body.reason.strip(),
        "context": body.context,
        "created_by": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }

    # Deactivate previous overrides for this venue
    await db.ranking_overrides.update_many(
        {"venue_id": body.venue_id, "active": True},
        {"$set": {"active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await db.ranking_overrides.insert_one(override)

    # Audit log
    await log_audit(db, {
        "action": "override_created",
        "venue_id": body.venue_id,
        "override_action": body.action,
        "reason": body.reason,
        "context": body.context,
    })

    return {"message": f"Override '{body.action}' applied to {venue.get('name', body.venue_id)}"}


@router.delete("/override/{venue_id}")
async def remove_override(request: Request, venue_id: str):
    """Remove active override for a venue."""
    db = get_db(request)
    result = await db.ranking_overrides.update_many(
        {"venue_id": venue_id, "active": True},
        {"$set": {"active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await log_audit(db, {"action": "override_removed", "venue_id": venue_id})

    return {"message": f"Override removed", "modified": result.modified_count}


@router.get("/overrides")
async def list_overrides(request: Request, active_only: bool = True):
    """List all overrides."""
    db = get_db(request)
    query = {"active": True} if active_only else {}
    overrides = await db.ranking_overrides.find(query, {"_id": 0}).to_list(length=500)
    return {"overrides": overrides, "count": len(overrides)}


@router.get("/audit")
async def get_audit_trail(request: Request, limit: int = 50, action: Optional[str] = None):
    """Retrieve ranking audit trail."""
    db = get_db(request)
    query = {}
    if action:
        query["action"] = action
    entries = await db.ranking_audit.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return {"entries": entries, "count": len(entries)}


@router.get("/config/history")
async def get_config_history(request: Request, limit: int = 20):
    """Get archived config versions."""
    db = get_db(request)
    configs = await db.ranking_config.find({"_type": "archived"}, {"_id": 0}).sort("archived_at", -1).limit(limit).to_list(length=limit)
    return {"configs": configs, "count": len(configs)}


@router.post("/benchmark")
async def run_benchmark(request: Request):
    """
    Run all 9 benchmark scenarios and return results for validation.
    """
    db = get_db(request)
    cfg = await get_config(db)

    scenarios = [
        {"name": "Low-budget birthday (Delhi)", "city": "Delhi", "budget_per_plate": 1500, "guest_count": 75, "event_type": "birthday"},
        {"name": "Mid-budget wedding (Delhi)", "city": "Delhi", "budget_per_plate": 3000, "guest_count": 350, "event_type": "wedding", "indoor_outdoor": "outdoor"},
        {"name": "Premium wedding (Delhi)", "city": "Delhi", "budget_per_plate": 5000, "guest_count": 500, "event_type": "wedding", "required_amenities": ["valet", "ac"]},
        {"name": "Corporate event (Gurgaon)", "city": "Gurgaon", "budget_per_plate": 2500, "guest_count": 200, "event_type": "corporate", "required_amenities": ["ac", "wifi"]},
        {"name": "Small private party (Mumbai)", "city": "Mumbai", "budget_per_plate": 2000, "guest_count": 50, "event_type": "party", "required_amenities": ["dj_allowed"]},
        {"name": "Large guest count (Delhi)", "city": "Delhi", "guest_count": 1500, "required_amenities": ["parking"]},
        {"name": "Tight capacity (Bangalore)", "city": "Bangalore", "budget_per_plate": 2000, "guest_count": 50},
        {"name": "Style-driven Royal (Delhi)", "city": "Delhi", "guest_count": 250, "vibe": "Royal"},
        {"name": "Mandatory amenity (Chennai)", "city": "Chennai", "guest_count": 200, "required_amenities": ["alcohol_allowed", "parking"]},
    ]

    all_venues = await db.venues.find({}, {"_id": 0}).to_list(length=5000)
    overrides = await db.ranking_overrides.find({"active": True}, {"_id": 0}).to_list(length=500)

    results = []
    for scenario in scenarios:
        name = scenario.pop("name")
        result = run_ranking_pipeline(all_venues, scenario, cfg, overrides)
        top5 = result["full_ranked_list"][:5]
        results.append({
            "scenario": name,
            "search_input": scenario,
            "total_eligible": result["total_eligible"],
            "total_ineligible": result["total_ineligible"],
            "top_5": [{
                "venue_name": v["venue_name"],
                "venue_type": v["venue_type"],
                "score": v["scoring"]["final_score"],
                "capacity": v["capacity"],
                "price_veg": v["price_veg"],
                "bucket": v["bucket"],
            } for v in top5],
            "bucket_sizes": {
                "best_matches": len(result["buckets"]["best_matches"]),
                "smart_alternatives": len(result["buckets"]["smart_alternatives"]),
                "expert_picks": len(result["buckets"]["expert_picks"]),
            },
        })

    await log_audit(db, {"action": "benchmark_run", "scenarios_count": len(results)})
    return {"benchmark_results": results, "config_version": cfg.get("config_version", 1)}
