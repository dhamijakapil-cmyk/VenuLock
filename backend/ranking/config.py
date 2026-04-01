"""
VenuLoQ Ranking Engine — Configuration & Constants
Stores default weights, thresholds, and rollout state.
Persisted in MongoDB `ranking_config` collection.
"""

# Engine version — increment on logic changes
ENGINE_VERSION = "1.0.0"

# Rollout modes
ROLLOUT_OFF = "off"
ROLLOUT_SHADOW = "shadow"
ROLLOUT_INTERNAL_PREVIEW = "internal_preview"
ROLLOUT_LIVE = "live"
VALID_ROLLOUT_MODES = [ROLLOUT_OFF, ROLLOUT_SHADOW, ROLLOUT_INTERNAL_PREVIEW, ROLLOUT_LIVE]

# Default config — used if no config exists in DB yet
DEFAULT_CONFIG = {
    "config_version": 1,
    "engine_version": ENGINE_VERSION,
    "rollout_mode": ROLLOUT_SHADOW,  # NEVER defaults to live

    # ── Stage 1: Eligibility thresholds ──
    "eligibility": {
        "require_active_status": True,
        "require_city_match": True,
        "min_listing_completeness": 0.3,  # 30% fields must be filled
        "capacity_tolerance_pct": 0.20,   # allow 20% outside range
        "budget_tolerance_pct": 0.25,     # allow 25% outside budget
    },

    # ── Stage 2: Top-level scoring weights (must sum to 1.0) ──
    "weights": {
        "customer_fit": 0.45,
        "quality_trust": 0.30,
        "operational_readiness": 0.10,  # NEUTRAL in V1
        "conversion_confidence": 0.05,  # NEUTRAL in V1
        "freshness_diversity": 0.10,
    },

    # ── Sub-weights for Customer Fit ──
    "customer_fit_sub": {
        "capacity_match": 0.25,
        "budget_match": 0.25,
        "event_type_match": 0.15,
        "venue_type_match": 0.10,
        "indoor_outdoor_match": 0.10,
        "amenity_match": 0.10,
        "vibe_match": 0.05,
    },

    # ── Sub-weights for Quality & Trust ──
    "quality_trust_sub": {
        "rating_score": 0.25,
        "review_volume": 0.20,
        "image_count": 0.20,
        "listing_completeness": 0.25,
        "pricing_completeness": 0.10,
    },

    # ── Sub-weights for Freshness/Diversity ──
    "freshness_sub": {
        "freshness_days": 0.60,
        "diversity_bonus": 0.40,
    },

    # ── Stage 3: Penalties & Boosts ──
    "penalties": {
        "stale_listing_days": 180,
        "stale_listing_penalty": -0.05,
        "incomplete_pricing_penalty": -0.03,
        "zero_images_penalty": -0.10,
        "low_completeness_penalty": -0.05,  # below 50% completeness
    },
    "boosts": {
        "verified_boost": 0.00,       # NEUTRAL — no verified_status data
        "new_venue_days": 30,
        "new_venue_boost": 0.03,
        "high_quality_boost": 0.05,   # rating >= 4.8 AND review_count >= 50
    },

    # ── Stage 4: Diversity controls ──
    "diversity": {
        "max_same_type_in_top5": 3,
        "max_same_area_in_top5": 2,
        "diversity_strength": 0.5,  # 0 = no diversity, 1 = max diversity
    },

    # ── Stage 5: Bucket sizes ──
    "buckets": {
        "best_matches": 6,
        "smart_alternatives": 6,
        "expert_picks": 3,
    },

    # ── Neutral component defaults (used when data is missing) ──
    "neutral_scores": {
        "operational_readiness": 0.50,   # midpoint — no penalty, no boost
        "conversion_confidence": 0.50,
        "missing_rating": 0.50,
        "missing_review_count": 0.50,
    },
}

# Fields used to compute listing completeness
COMPLETENESS_FIELDS = [
    "description", "images", "pricing", "amenities", "event_types",
    "vibes", "area", "indoor_outdoor", "capacity_min", "capacity_max",
    "latitude", "longitude", "pincode",
]

# Venue type normalization map
VENUE_TYPE_NORMALIZE = {
    "hotel": "hotel",
    "Hotel": "hotel",
    "banquet_hall": "banquet_hall",
    "Banquet Hall": "banquet_hall",
    "convention_center": "convention_center",
    "Convention Centre": "convention_center",
    "Palace": "palace",
    "palace": "palace",
}
