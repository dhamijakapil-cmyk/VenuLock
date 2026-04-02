"""
VenuLoQ — Ranking Engine (Phase 9)
Deterministic, explainable, fit-first ranking with distance/location as a
major Customer Fit subfactor.  Runs in validation (shadow) mode by default.
"""
import math
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/ranking", tags=["ranking"])
logger = logging.getLogger("ranking")

ADMIN_ROLES = {"admin"}
INTERNAL_ROLES = {"admin", "venue_manager", "rm", "vam"}

CONFIG_COLLECTION = "ranking_config"
DEFAULT_CONFIG_ID = "global_ranking_v1"


# ─── Defaults ──────────────────────────────────────────────────────────────────

DEFAULT_WEIGHTS = {
    "customer_fit": 0.55,
    "supply_quality": 0.25,
    "freshness": 0.10,
    "engagement": 0.10,
}

DEFAULT_FIT_SUBFACTORS = {
    "distance_location": 0.25,
    "event_type": 0.20,
    "capacity": 0.20,
    "budget": 0.20,
    "style_vibe": 0.10,
    "amenity": 0.05,
}

TRAVEL_FLEXIBILITY_PRESETS = {
    "strictly_nearby":     {"distance_location": 0.40},
    "moderately_flexible": {"distance_location": 0.25},
    "city_wide":           {"distance_location": 0.15},
    "willing_to_travel":   {"distance_location": 0.08},
    "destination":         {"distance_location": 0.03},
}

DEFAULT_ENGINE = {
    "mode": "validation",
    "diversity_strength": 0.30,
    "freshness_boost_days": 30,
    "quality_threshold": 30,
    "verified_boost_points": 8,
}


# ─── NCR Zone mappings for locality proximity ─────────────────────────────────

ZONE_MAP = {
    "delhi_south": ["chattarpur", "greater kailash", "gk", "saket", "hauz khas",
                    "vasant kunj", "vasant vihar", "mehrauli", "friends colony",
                    "defence colony", "lajpat nagar", "safdarjung", "green park",
                    "malviya nagar", "dr zakir hussain marg", "diplomatic enclave"],
    "delhi_central": ["connaught place", "cp", "janpath", "chanakyapuri",
                      "india gate", "central delhi", "barakhamba", "mandi house",
                      "pragati maidan"],
    "delhi_north": ["chandni chowk", "civil lines", "old delhi", "karol bagh",
                    "paharganj", "rajouri garden"],
    "delhi_west": ["dwarka", "janakpuri", "punjabi bagh",
                   "palam", "aerocity"],
    "delhi_east": ["mayur vihar", "preet vihar", "ip extension", "noida border"],
    "gurgaon_core": ["cyber city", "cyber hub", "golf course road", "sohna road",
                     "mg road", "dlf phase 1", "dlf phase 2", "dlf phase 3",
                     "dlf phase 4", "dlf phase 5", "sector 29", "udyog vihar"],
    "gurgaon_ext": ["manesar", "new gurgaon", "dwarka expressway", "sector 56",
                    "sector 57", "sector 82", "pataudi road"],
    "noida_core": ["sector 18", "sector 15", "sector 16", "sector 62", "noida city center"],
    "noida_ext": ["greater noida", "pari chowk", "knowledge park", "sector 150",
                  "sector 137", "sector 128"],
    "faridabad": ["faridabad", "ballabgarh", "sector 15 faridabad"],
    "mumbai_south": ["colaba", "worli", "lower parel", "bkc", "bandra kurla complex",
                     "prabhadevi", "dadar", "mahalaxmi"],
    "mumbai_west": ["bandra", "juhu", "andheri", "versova", "goregaon",
                    "malad", "borivali", "santacruz", "khar"],
    "mumbai_central": ["churchgate", "fort", "nariman point", "marine drive",
                       "cst", "girgaon"],
    "bangalore_central": ["mg road", "brigade road", "ub city", "lavelle road",
                          "koramangala", "indiranagar"],
    "bangalore_east": ["whitefield", "marathahalli", "hal airport road", "old airport road"],
    "bangalore_north": ["hebbal", "yelahanka", "devanahalli", "thanisandra"],
    "hyderabad_core": ["hitec city", "hitech city", "gachibowli", "begumpet",
                       "jubilee hills", "banjara hills", "kukatpally"],
    "hyderabad_old": ["charminar", "falaknuma", "gandipet", "secunderabad"],
    "chennai_central": ["adyar", "anna salai", "nungambakkam", "t nagar",
                        "mylapore", "alwarpet"],
}

CITY_ZONE_GROUPS = {
    "delhi":  ["delhi_south", "delhi_central", "delhi_north", "delhi_west", "delhi_east"],
    "gurgaon": ["gurgaon_core", "gurgaon_ext"],
    "gurugram": ["gurgaon_core", "gurgaon_ext"],
    "noida": ["noida_core", "noida_ext"],
    "greater noida": ["noida_ext", "noida_core"],
    "faridabad": ["faridabad"],
    "mumbai": ["mumbai_south", "mumbai_west", "mumbai_central"],
    "bangalore": ["bangalore_central", "bangalore_east", "bangalore_north"],
    "bengaluru": ["bangalore_central", "bangalore_east", "bangalore_north"],
    "hyderabad": ["hyderabad_core", "hyderabad_old"],
    "chennai": ["chennai_central"],
}

ADJACENT_CITY_GROUPS = [
    {"delhi", "gurgaon", "gurugram", "noida", "greater noida", "faridabad", "ghaziabad"},
]


def _normalize_locality(loc: str) -> str:
    return (loc or "").lower().strip()


def _find_zone(locality: str) -> Optional[str]:
    norm = _normalize_locality(locality)
    for zone, locs in ZONE_MAP.items():
        if any(norm == loc or norm.startswith(loc) or loc.startswith(norm) for loc in locs):
            return zone
    return None


def _city_key(city: str) -> str:
    return (city or "").lower().strip()


def _are_adjacent_cities(c1: str, c2: str) -> bool:
    k1, k2 = _city_key(c1), _city_key(c2)
    for grp in ADJACENT_CITY_GROUPS:
        if k1 in grp and k2 in grp:
            return True
    return False


# ─── Haversine ────────────────────────────────────────────────────────────────

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


# ─── Scoring helpers ──────────────────────────────────────────────────────────

def score_distance(venue: dict, search: dict) -> dict:
    v_lat = venue.get("latitude") or 0
    v_lon = venue.get("longitude") or 0
    s_lat = search.get("latitude") or 0
    s_lon = search.get("longitude") or 0
    v_area = _normalize_locality(venue.get("area", ""))
    s_area = _normalize_locality(search.get("preferred_locality", ""))
    v_city = _city_key(venue.get("city", ""))
    s_city = _city_key(search.get("city", ""))

    method = "zone"
    distance_km = None

    if v_lat and v_lon and s_lat and s_lon:
        distance_km = haversine_km(v_lat, v_lon, s_lat, s_lon)
        method = "haversine"
        if distance_km < 5:
            score = 100
        elif distance_km < 10:
            score = 85
        elif distance_km < 20:
            score = 65
        elif distance_km < 35:
            score = 45
        elif distance_km < 50:
            score = 25
        else:
            score = 10
    else:
        if s_area and v_area == s_area:
            score = 100
        elif s_area:
            v_zone = _find_zone(v_area)
            s_zone = _find_zone(s_area)
            if v_zone and s_zone and v_zone == s_zone:
                score = 85
            elif v_zone and s_zone:
                v_city_zones = CITY_ZONE_GROUPS.get(v_city, [])
                s_city_zones = CITY_ZONE_GROUPS.get(s_city, [])
                if v_zone in s_city_zones or s_zone in v_city_zones:
                    score = 60
                elif _are_adjacent_cities(v_city, s_city):
                    score = 40
                else:
                    score = 15
            elif v_city == s_city:
                score = 55
            elif _are_adjacent_cities(v_city, s_city):
                score = 35
            else:
                score = 10
        elif v_city == s_city:
            score = 60
        elif _are_adjacent_cities(v_city, s_city):
            score = 35
        else:
            score = 10

    detail = f"{method}: "
    if distance_km is not None:
        detail += f"{distance_km:.1f}km"
    else:
        detail += f"venue={v_area or v_city}, search={s_area or s_city}"

    return {"score": score, "detail": detail, "distance_km": distance_km}


def score_event_type(venue: dict, search: dict) -> dict:
    v_types = set(t.lower() for t in (venue.get("event_types") or []))
    s_type = (search.get("event_type") or "").lower().strip()
    if not s_type:
        return {"score": 70, "detail": "No event type specified"}
    if s_type in v_types:
        return {"score": 100, "detail": f"Exact match: {s_type}"}
    if v_types:
        return {"score": 30, "detail": f"No match: want {s_type}, have {', '.join(sorted(v_types))}"}
    return {"score": 20, "detail": "Venue has no event types listed"}


def score_capacity(venue: dict, search: dict) -> dict:
    guests = search.get("guests") or 0
    v_min = venue.get("capacity_min") or 0
    v_max = venue.get("capacity_max") or 0
    if not guests:
        return {"score": 70, "detail": "No guest count specified"}
    if v_min <= guests <= v_max:
        return {"score": 100, "detail": f"Perfect fit: {guests} in {v_min}-{v_max}"}
    if guests < v_min:
        gap_pct = ((v_min - guests) / max(v_min, 1)) * 100
        s = max(20, 100 - gap_pct)
        return {"score": round(s), "detail": f"Under: {guests} < {v_min} min"}
    gap_pct = ((guests - v_max) / max(v_max, 1)) * 100
    s = max(10, 100 - gap_pct * 1.5)
    return {"score": round(s), "detail": f"Over: {guests} > {v_max} max"}


def score_budget(venue: dict, search: dict) -> dict:
    budget_max = search.get("budget_per_plate") or 0
    pricing = venue.get("pricing") or {}
    veg = pricing.get("price_per_plate_veg") or 0
    nonveg = pricing.get("price_per_plate_nonveg") or 0
    v_price = min(veg, nonveg) if veg and nonveg else (veg or nonveg)
    if not budget_max:
        return {"score": 70, "detail": "No budget specified"}
    if not v_price:
        return {"score": 50, "detail": "Venue has no pricing"}
    ratio = v_price / budget_max
    if ratio <= 0.7:
        return {"score": 95, "detail": f"Under budget: {v_price:,.0f} vs {budget_max:,.0f}"}
    if ratio <= 1.0:
        return {"score": 100, "detail": f"Within budget: {v_price:,.0f} vs {budget_max:,.0f}"}
    if ratio <= 1.2:
        return {"score": 70, "detail": f"Slightly over: {v_price:,.0f} vs {budget_max:,.0f}"}
    if ratio <= 1.5:
        return {"score": 40, "detail": f"Over budget: {v_price:,.0f} vs {budget_max:,.0f}"}
    return {"score": 15, "detail": f"Way over: {v_price:,.0f} vs {budget_max:,.0f}"}


def score_style_vibe(venue: dict, search: dict) -> dict:
    s_vibes = set(v.lower() for v in (search.get("vibes") or []))
    v_vibes = set(v.lower() for v in (venue.get("vibes") or []))
    s_type_pref = (search.get("venue_type_pref") or "").lower()
    v_type = (venue.get("venue_type") or "").lower()
    if not s_vibes and not s_type_pref:
        return {"score": 70, "detail": "No style preference"}
    score = 50
    matches = []
    if s_vibes and v_vibes:
        overlap = s_vibes & v_vibes
        if overlap:
            score += min(40, len(overlap) * 20)
            matches.append(f"vibes: {', '.join(overlap)}")
    if s_type_pref and v_type:
        if s_type_pref == v_type:
            score += 30
            matches.append(f"type: {v_type}")
        elif s_type_pref in v_type or v_type in s_type_pref:
            score += 15
    return {"score": min(100, score), "detail": f"Matches: {', '.join(matches)}" if matches else "No style overlap"}


def score_amenity(venue: dict, search: dict) -> dict:
    s_amenities = set(a.lower() for a in (search.get("amenities") or []))
    v_amenities = venue.get("amenities") or {}
    # Handle both dict and list formats for amenities
    if isinstance(v_amenities, dict):
        v_has = set(k.lower() for k, v in v_amenities.items() if v)
    elif isinstance(v_amenities, list):
        v_has = set(a.lower() for a in v_amenities if a)
    else:
        v_has = set()
    if not s_amenities:
        return {"score": 70, "detail": "No amenity preference"}
    matched = s_amenities & v_has
    ratio = len(matched) / len(s_amenities) if s_amenities else 0
    score = round(ratio * 100)
    return {"score": max(20, score), "detail": f"{len(matched)}/{len(s_amenities)} matched"}


def score_supply_quality(venue: dict, acq: dict = None, config: dict = None) -> dict:
    images = venue.get("images") or []
    desc = venue.get("description") or ""
    amenities = venue.get("amenities") or {}
    pricing = venue.get("pricing") or {}

    photo_score = min(100, len(images) * 20)
    desc_score = min(100, len(desc) * 0.5)
    # Handle both dict and list formats for amenities
    if isinstance(amenities, dict):
        amenity_score = min(100, sum(1 for v in amenities.values() if v) * 15)
    elif isinstance(amenities, list):
        amenity_score = min(100, len(amenities) * 15)
    else:
        amenity_score = 0
    pricing_score = 100 if (pricing.get("price_per_plate_veg") or 0) > 0 else 30

    base = (photo_score * 0.35 + desc_score * 0.25 +
            amenity_score * 0.20 + pricing_score * 0.20)

    verified_bonus = 0
    if acq:
        onboarding = acq.get("onboarding") or {}
        if onboarding.get("accepted_at"):
            boost = (config or {}).get("verified_boost_points", DEFAULT_ENGINE["verified_boost_points"])
            verified_bonus = boost

    total = min(100, base + verified_bonus)
    detail = f"photos:{photo_score:.0f} desc:{desc_score:.0f} amenity:{amenity_score:.0f} pricing:{pricing_score:.0f}"
    if verified_bonus:
        detail += f" +verified:{verified_bonus}"

    return {"score": round(total), "detail": detail, "verified": verified_bonus > 0}


def score_freshness(venue: dict, config: dict) -> dict:
    boost_days = config.get("freshness_boost_days", 30)
    created = venue.get("created_at") or ""
    if not created:
        return {"score": 40, "detail": "No creation date"}
    try:
        if isinstance(created, str):
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        else:
            created_dt = created
        age_days = (datetime.now(timezone.utc) - created_dt).days
    except Exception:
        return {"score": 40, "detail": "Invalid date"}

    if age_days <= 7:
        score = 100
    elif age_days <= boost_days:
        score = round(100 - (age_days / boost_days) * 50)
    elif age_days <= 90:
        score = round(50 - ((age_days - boost_days) / 60) * 20)
    else:
        score = max(20, round(30 - (age_days - 90) / 30))

    return {"score": max(10, min(100, score)), "detail": f"{age_days} days old"}


def score_engagement(venue: dict) -> dict:
    reviews = venue.get("review_count") or 0
    rating = venue.get("rating") or 0
    review_score = min(100, reviews * 10)
    rating_score = rating * 20 if rating else 30
    total = round(review_score * 0.5 + rating_score * 0.5)
    return {"score": min(100, max(10, total)), "detail": f"reviews:{reviews} rating:{rating}"}


# ─── Main engine ──────────────────────────────────────────────────────────────

def compute_venue_score(venue: dict, search: dict, config: dict, acq: dict = None) -> dict:
    weights = config.get("weights", DEFAULT_WEIGHTS)
    fit_sub = dict(config.get("fit_subfactors", DEFAULT_FIT_SUBFACTORS))

    travel = search.get("travel_flexibility", "moderately_flexible")
    if travel in TRAVEL_FLEXIBILITY_PRESETS:
        new_dist_w = TRAVEL_FLEXIBILITY_PRESETS[travel]["distance_location"]
        old_dist_w = fit_sub.get("distance_location", 0.25)
        fit_sub["distance_location"] = new_dist_w
        remaining = 1.0 - new_dist_w
        old_remaining = 1.0 - old_dist_w
        if old_remaining > 0:
            scale = remaining / old_remaining
            for k in fit_sub:
                if k != "distance_location":
                    fit_sub[k] = fit_sub[k] * scale

    dist = score_distance(venue, search)
    evt = score_event_type(venue, search)
    cap = score_capacity(venue, search)
    bud = score_budget(venue, search)
    sty = score_style_vibe(venue, search)
    amn = score_amenity(venue, search)

    fit_score = (
        dist["score"] * fit_sub.get("distance_location", 0.25) +
        evt["score"] * fit_sub.get("event_type", 0.20) +
        cap["score"] * fit_sub.get("capacity", 0.20) +
        bud["score"] * fit_sub.get("budget", 0.20) +
        sty["score"] * fit_sub.get("style_vibe", 0.10) +
        amn["score"] * fit_sub.get("amenity", 0.05)
    )

    sq = score_supply_quality(venue, acq, config)
    fr = score_freshness(venue, config)
    en = score_engagement(venue)

    total = (
        fit_score * weights.get("customer_fit", 0.55) +
        sq["score"] * weights.get("supply_quality", 0.25) +
        fr["score"] * weights.get("freshness", 0.10) +
        en["score"] * weights.get("engagement", 0.10)
    )

    return {
        "total_score": round(total, 1),
        "customer_fit": round(fit_score, 1),
        "customer_fit_breakdown": {
            "distance_location": {"score": dist["score"], "weight": round(fit_sub.get("distance_location", 0.25), 3), "detail": dist["detail"], "distance_km": dist.get("distance_km")},
            "event_type": {"score": evt["score"], "weight": round(fit_sub.get("event_type", 0.20), 3), "detail": evt["detail"]},
            "capacity": {"score": cap["score"], "weight": round(fit_sub.get("capacity", 0.20), 3), "detail": cap["detail"]},
            "budget": {"score": bud["score"], "weight": round(fit_sub.get("budget", 0.20), 3), "detail": bud["detail"]},
            "style_vibe": {"score": sty["score"], "weight": round(fit_sub.get("style_vibe", 0.10), 3), "detail": sty["detail"]},
            "amenity": {"score": amn["score"], "weight": round(fit_sub.get("amenity", 0.05), 3), "detail": amn["detail"]},
        },
        "supply_quality": {"score": sq["score"], "weight": weights.get("supply_quality", 0.25), "detail": sq["detail"], "verified": sq.get("verified", False)},
        "freshness": {"score": fr["score"], "weight": weights.get("freshness", 0.10), "detail": fr["detail"]},
        "engagement": {"score": en["score"], "weight": weights.get("engagement", 0.10), "detail": en["detail"]},
        "travel_flexibility": travel,
        "fit_weight": weights.get("customer_fit", 0.55),
    }


def bucket_results(scored_venues: list, search: dict) -> dict:
    if not scored_venues:
        return {"best_matches": [], "smart_alternatives": [], "expert_picks": []}

    sorted_all = sorted(scored_venues, key=lambda x: x["ranking"]["total_score"], reverse=True)

    best_matches = []
    smart_alternatives = []
    expert_picks = []
    seen_types = set()
    seen_areas = set()

    for item in sorted_all:
        v = item["venue"]
        r = item["ranking"]
        v_type = (v.get("venue_type") or "").lower()
        v_area = (v.get("area") or "").lower()
        fit = r.get("customer_fit", 0)
        quality = r.get("supply_quality", {}).get("score", 0)
        verified = r.get("supply_quality", {}).get("verified", False)

        if quality >= 70 and verified and fit < 65 and len(expert_picks) < 3:
            expert_picks.append(item)
            continue

        if len(best_matches) >= 3 and (v_type in seen_types or v_area in seen_areas) and fit >= 50:
            if len(smart_alternatives) < 5:
                smart_alternatives.append(item)
                continue

        if len(best_matches) < 8:
            best_matches.append(item)
            seen_types.add(v_type)
            seen_areas.add(v_area)
        elif len(smart_alternatives) < 5:
            smart_alternatives.append(item)

    return {
        "best_matches": best_matches,
        "smart_alternatives": smart_alternatives,
        "expert_picks": expert_picks,
    }


# ─── DB helpers ───────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_db(request: Request):
    from config import db as app_db
    return app_db


async def get_current_user(request: Request):
    from routes.acquisitions import get_current_user as _get
    return await _get(request)


async def get_config(db) -> dict:
    doc = await db[CONFIG_COLLECTION].find_one({"config_id": DEFAULT_CONFIG_ID}, {"_id": 0})
    if not doc:
        doc = {
            "config_id": DEFAULT_CONFIG_ID,
            "mode": DEFAULT_ENGINE["mode"],
            "weights": DEFAULT_WEIGHTS,
            "fit_subfactors": DEFAULT_FIT_SUBFACTORS,
            "diversity_strength": DEFAULT_ENGINE["diversity_strength"],
            "freshness_boost_days": DEFAULT_ENGINE["freshness_boost_days"],
            "quality_threshold": DEFAULT_ENGINE["quality_threshold"],
            "verified_boost_points": DEFAULT_ENGINE["verified_boost_points"],
            "audit": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db[CONFIG_COLLECTION].insert_one(doc)
        doc.pop("_id", None)
    return doc


async def get_eligible_venues(db, city: str = None, hard_locality: str = None) -> list:
    acq_query = {"status": "published_live", "ranking_eligibility": "eligible"}
    acqs = await db.venue_acquisitions.find(acq_query, {"_id": 0}).to_list(500)
    acq_map = {}
    for a in acqs:
        vid = (a.get("publish_meta") or {}).get("venue_id")
        if vid:
            acq_map[vid] = a

    venue_query = {"status": "approved"}
    if city:
        venue_query["$or"] = [
            {"city": {"$regex": city, "$options": "i"}},
            {"city_slug": {"$regex": _city_key(city), "$options": "i"}},
        ]
    if hard_locality:
        venue_query["area"] = {"$regex": hard_locality, "$options": "i"}

    venues = await db.venues.find(venue_query, {"_id": 0}).to_list(500)

    results = []
    for v in venues:
        vid = v.get("venue_id")
        acq = acq_map.get(vid)
        results.append({"venue": v, "acq": acq, "from_pipeline": acq is not None})

    return results


# ─── Models ───────────────────────────────────────────────────────────────────

class ConfigUpdate(BaseModel):
    weights: Optional[dict] = None
    fit_subfactors: Optional[dict] = None
    mode: Optional[str] = None
    diversity_strength: Optional[float] = None
    freshness_boost_days: Optional[int] = None
    quality_threshold: Optional[float] = None
    verified_boost_points: Optional[float] = None
    reason: Optional[str] = None


class SearchParams(BaseModel):
    city: Optional[str] = None
    preferred_locality: Optional[str] = None
    hard_locality: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_type: Optional[str] = None
    guests: Optional[int] = None
    budget_per_plate: Optional[float] = None
    venue_type_pref: Optional[str] = None
    vibes: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    travel_flexibility: Optional[str] = "moderately_flexible"


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/config")
async def get_ranking_config(request: Request):
    user = await get_current_user(request)
    if user.get("role") not in INTERNAL_ROLES:
        raise HTTPException(403, "Not authorized")
    db = get_db(request)
    return await get_config(db)


@router.post("/config")
async def update_ranking_config(request: Request, body: ConfigUpdate):
    user = await get_current_user(request)
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "Admin only")

    db = get_db(request)
    config = await get_config(db)

    updates = {}
    audit_changes = []

    if body.weights:
        total = sum(body.weights.values())
        if abs(total - 1.0) > 0.05:
            raise HTTPException(400, f"Weights must sum to ~1.0, got {total:.2f}")
        updates["weights"] = body.weights
        audit_changes.append(f"weights: {body.weights}")

    if body.fit_subfactors:
        total = sum(body.fit_subfactors.values())
        if abs(total - 1.0) > 0.05:
            raise HTTPException(400, f"Fit subfactors must sum to ~1.0, got {total:.2f}")
        updates["fit_subfactors"] = body.fit_subfactors
        audit_changes.append(f"fit_subfactors: {body.fit_subfactors}")

    if body.mode:
        if body.mode not in ("validation", "live"):
            raise HTTPException(400, "Mode must be 'validation' or 'live'")
        updates["mode"] = body.mode
        audit_changes.append(f"mode: {config.get('mode')} -> {body.mode}")

    for field in ["diversity_strength", "freshness_boost_days", "quality_threshold", "verified_boost_points"]:
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val
            audit_changes.append(f"{field}: {config.get(field)} -> {val}")

    if not updates:
        raise HTTPException(400, "No changes")

    updates["updated_at"] = now_iso()
    audit_entry = {
        "actor_name": user.get("name", user.get("email")),
        "actor_role": user.get("role"),
        "changes": audit_changes,
        "reason": body.reason,
        "timestamp": now_iso(),
    }

    await db[CONFIG_COLLECTION].update_one(
        {"config_id": DEFAULT_CONFIG_ID},
        {"$set": updates, "$push": {"audit": audit_entry}}
    )

    return {"message": "Config updated", "changes": audit_changes}


@router.post("/run")
async def run_ranking(request: Request, body: SearchParams):
    user = await get_current_user(request)
    if user.get("role") not in INTERNAL_ROLES:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    config = await get_config(db)
    search = body.dict()

    eligible = await get_eligible_venues(db, city=search.get("city"), hard_locality=search.get("hard_locality"))

    scored = []
    for item in eligible:
        ranking = compute_venue_score(item["venue"], search, config, item.get("acq"))
        if ranking["total_score"] >= config.get("quality_threshold", 30):
            scored.append({
                "venue": item["venue"],
                "ranking": ranking,
                "from_pipeline": item["from_pipeline"],
            })

    buckets = bucket_results(scored, search)

    return {
        "mode": config.get("mode"),
        "total_eligible": len(eligible),
        "total_scored": len(scored),
        "quality_threshold": config.get("quality_threshold"),
        "search_params": search,
        "buckets": buckets,
    }


@router.post("/shadow")
async def shadow_comparison(request: Request, body: SearchParams):
    user = await get_current_user(request)
    if user.get("role") not in INTERNAL_ROLES:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    config = await get_config(db)
    search = body.dict()

    venue_query = {"status": "approved"}
    if search.get("city"):
        venue_query["$or"] = [
            {"city": {"$regex": search["city"], "$options": "i"}},
            {"city_slug": {"$regex": _city_key(search["city"]), "$options": "i"}},
        ]
    current_order = await db.venues.find(venue_query, {"_id": 0}).to_list(50)

    eligible = await get_eligible_venues(db, city=search.get("city"), hard_locality=search.get("hard_locality"))
    engine_scored = []
    for item in eligible:
        ranking = compute_venue_score(item["venue"], search, config, item.get("acq"))
        engine_scored.append({"venue": item["venue"], "ranking": ranking, "from_pipeline": item["from_pipeline"]})
    engine_scored.sort(key=lambda x: x["ranking"]["total_score"], reverse=True)

    current_ids = [v.get("venue_id") for v in current_order]
    engine_ids = [v["venue"]["venue_id"] for v in engine_scored]
    all_ids = list(dict.fromkeys(current_ids + engine_ids))

    comparison = []
    for vid in all_ids:
        cur_pos = current_ids.index(vid) + 1 if vid in current_ids else None
        eng_pos = engine_ids.index(vid) + 1 if vid in engine_ids else None
        eng_item = next((e for e in engine_scored if e["venue"]["venue_id"] == vid), None)
        cur_venue = next((v for v in current_order if v.get("venue_id") == vid), None)
        venue = eng_item["venue"] if eng_item else cur_venue

        comparison.append({
            "venue_id": vid,
            "venue_name": (venue or {}).get("name", "Unknown"),
            "city": (venue or {}).get("city", ""),
            "area": (venue or {}).get("area", ""),
            "current_position": cur_pos,
            "engine_position": eng_pos,
            "position_change": (cur_pos - eng_pos) if cur_pos and eng_pos else None,
            "engine_score": eng_item["ranking"]["total_score"] if eng_item else None,
            "customer_fit": eng_item["ranking"]["customer_fit"] if eng_item else None,
            "from_pipeline": eng_item["from_pipeline"] if eng_item else False,
        })

    comparison.sort(key=lambda x: x.get("engine_position") or 999)

    return {
        "mode": config.get("mode"),
        "current_count": len(current_order),
        "engine_count": len(engine_scored),
        "comparison": comparison,
        "search_params": search,
    }


@router.get("/venue/{acq_id}/explain")
async def explain_venue_score(request: Request, acq_id: str,
                               city: str = Query(None),
                               preferred_locality: str = Query(None),
                               event_type: str = Query(None),
                               guests: int = Query(None),
                               budget_per_plate: float = Query(None),
                               travel_flexibility: str = Query("moderately_flexible")):
    user = await get_current_user(request)
    if user.get("role") not in INTERNAL_ROLES:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    config = await get_config(db)

    acq = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not acq:
        raise HTTPException(404, "Acquisition not found")

    venue_id = (acq.get("publish_meta") or {}).get("venue_id")
    venue = None
    if venue_id:
        venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})

    if not venue:
        raise HTTPException(404, "Public venue not found")

    search = {
        "city": city, "preferred_locality": preferred_locality,
        "event_type": event_type, "guests": guests,
        "budget_per_plate": budget_per_plate,
        "travel_flexibility": travel_flexibility,
    }

    ranking = compute_venue_score(venue, search, config, acq)

    is_eligible = acq.get("status") == "published_live" and acq.get("ranking_eligibility") == "eligible"
    blockers = []
    if acq.get("status") != "published_live":
        blockers.append(f"Status is {acq.get('status')}, not published_live")
    if acq.get("ranking_eligibility") != "eligible":
        blockers.append(f"Ranking posture is {acq.get('ranking_eligibility')}, not eligible")

    return {
        "acquisition_id": acq_id,
        "venue_id": venue_id,
        "venue_name": venue.get("name"),
        "city": venue.get("city"),
        "area": venue.get("area"),
        "is_eligible": is_eligible,
        "blockers": blockers,
        "ranking_posture": acq.get("ranking_eligibility", "not_eligible"),
        "status": acq.get("status"),
        "ranking": ranking,
        "search_context": search,
    }


@router.get("/eligible")
async def list_eligible(request: Request):
    user = await get_current_user(request)
    if user.get("role") not in INTERNAL_ROLES:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    config = await get_config(db)

    eligible = await get_eligible_venues(db)
    results = []
    for item in eligible:
        ranking = compute_venue_score(item["venue"], {}, config, item.get("acq"))
        results.append({
            "venue_id": item["venue"].get("venue_id"),
            "name": item["venue"].get("name"),
            "city": item["venue"].get("city"),
            "area": item["venue"].get("area"),
            "total_score": ranking["total_score"],
            "customer_fit": ranking["customer_fit"],
            "supply_quality": ranking["supply_quality"]["score"],
            "freshness": ranking["freshness"]["score"],
            "engagement": ranking["engagement"]["score"],
            "from_pipeline": item["from_pipeline"],
        })

    results.sort(key=lambda x: x["total_score"], reverse=True)
    return {"eligible_count": len(results), "venues": results, "mode": config.get("mode")}
