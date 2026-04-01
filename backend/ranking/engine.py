"""
VenuLoQ Ranking Engine — Core 5-Stage Pipeline
Deterministic: same input + same config = same output.
"""
import math
from datetime import datetime, timezone
from .config import (
    COMPLETENESS_FIELDS, VENUE_TYPE_NORMALIZE, ENGINE_VERSION,
)


def compute_listing_completeness(venue: dict) -> float:
    """Count how many expected fields are populated."""
    filled = 0
    for f in COMPLETENESS_FIELDS:
        val = venue.get(f)
        if val is None or val == "" or val == [] or val == {}:
            continue
        filled += 1
    return filled / len(COMPLETENESS_FIELDS)


def compute_pricing_completeness(venue: dict) -> float:
    """Check if veg, nonveg, min_spend are all present and > 0."""
    pricing = venue.get("pricing", {})
    if not pricing:
        return 0.0
    fields = ["price_per_plate_veg", "price_per_plate_nonveg", "min_spend"]
    filled = sum(1 for f in fields if pricing.get(f) and pricing[f] > 0)
    return filled / len(fields)


def normalize_venue_type(vtype: str) -> str:
    if not vtype:
        return ""
    return VENUE_TYPE_NORMALIZE.get(vtype, vtype.lower().replace(" ", "_"))


# ─── Stage 1: Hard Eligibility Filter ───

def check_eligibility(venue: dict, search: dict, config: dict) -> dict:
    """
    Returns {"eligible": bool, "reasons": [str]}
    Every fail reason is logged for auditability.
    """
    elig = config.get("eligibility", {})
    reasons = []

    # 1. Active status
    if elig.get("require_active_status", True):
        if venue.get("status") != "approved":
            reasons.append(f"status={venue.get('status')} (not approved)")

    # 2. City match
    if elig.get("require_city_match", True) and search.get("city"):
        if venue.get("city", "").lower() != search["city"].lower():
            reasons.append(f"city={venue.get('city')} != search.city={search['city']}")

    # 3. Capacity compatibility
    if search.get("guest_count"):
        guest = int(search["guest_count"])
        cap_min = venue.get("capacity_min", 0) or 0
        cap_max = venue.get("capacity_max", 99999) or 99999
        tolerance = elig.get("capacity_tolerance_pct", 0.20)
        effective_min = cap_min * (1 - tolerance)
        effective_max = cap_max * (1 + tolerance)
        if guest < effective_min or guest > effective_max:
            reasons.append(f"capacity [{cap_min}-{cap_max}] vs guests={guest}")

    # 4. Budget compatibility
    if search.get("budget_per_plate"):
        budget = float(search["budget_per_plate"])
        veg_price = venue.get("pricing", {}).get("price_per_plate_veg", 0) or 0
        if veg_price > 0:
            tolerance = elig.get("budget_tolerance_pct", 0.25)
            if budget < veg_price * (1 - tolerance):
                reasons.append(f"budget={budget} < veg_price={veg_price}")

    # 5. Event type support
    if search.get("event_type"):
        supported = [e.lower() for e in (venue.get("event_types") or [])]
        if search["event_type"].lower() not in supported:
            reasons.append(f"event_type={search['event_type']} not in {supported}")

    # 6. Listing completeness threshold
    completeness = compute_listing_completeness(venue)
    min_completeness = elig.get("min_listing_completeness", 0.3)
    if completeness < min_completeness:
        reasons.append(f"completeness={completeness:.2f} < threshold={min_completeness}")

    return {
        "eligible": len(reasons) == 0,
        "reasons": reasons,
        "completeness": completeness,
    }


# ─── Stage 2: Weighted Scoring ───

def score_customer_fit(venue: dict, search: dict, sub_w: dict) -> dict:
    """Score how well venue matches customer's search criteria."""
    scores = {}

    # Capacity match (0-1): closer to ideal = higher score
    if search.get("guest_count"):
        guest = int(search["guest_count"])
        cap_min = venue.get("capacity_min", 0) or 0
        cap_max = venue.get("capacity_max", 99999) or 99999
        mid = (cap_min + cap_max) / 2
        if cap_min <= guest <= cap_max:
            scores["capacity_match"] = 1.0
        else:
            distance = min(abs(guest - cap_min), abs(guest - cap_max))
            scores["capacity_match"] = max(0, 1.0 - (distance / max(mid, 1)) * 2)
    else:
        scores["capacity_match"] = 0.5  # neutral if no guest count specified

    # Budget match
    if search.get("budget_per_plate"):
        budget = float(search["budget_per_plate"])
        veg_price = venue.get("pricing", {}).get("price_per_plate_veg", 0) or 0
        if veg_price > 0:
            ratio = budget / veg_price
            if 0.8 <= ratio <= 1.5:
                scores["budget_match"] = 1.0
            elif ratio > 1.5:
                scores["budget_match"] = max(0.3, 1.0 - (ratio - 1.5) * 0.5)
            else:
                scores["budget_match"] = max(0, ratio / 0.8)
        else:
            scores["budget_match"] = 0.5
    else:
        scores["budget_match"] = 0.5

    # Event type match
    if search.get("event_type"):
        supported = [e.lower() for e in (venue.get("event_types") or [])]
        scores["event_type_match"] = 1.0 if search["event_type"].lower() in supported else 0.0
    else:
        scores["event_type_match"] = 0.5

    # Venue type match
    if search.get("venue_type"):
        v_type = normalize_venue_type(venue.get("venue_type", ""))
        s_type = normalize_venue_type(search["venue_type"])
        scores["venue_type_match"] = 1.0 if v_type == s_type else 0.2
    else:
        scores["venue_type_match"] = 0.5

    # Indoor/outdoor match
    if search.get("indoor_outdoor"):
        v_setting = (venue.get("indoor_outdoor") or "").lower()
        s_setting = search["indoor_outdoor"].lower()
        if v_setting == s_setting or v_setting == "both":
            scores["indoor_outdoor_match"] = 1.0
        else:
            scores["indoor_outdoor_match"] = 0.2
    else:
        scores["indoor_outdoor_match"] = 0.5

    # Amenity match
    if search.get("required_amenities"):
        req = search["required_amenities"]
        venue_amenities = venue.get("amenities", {})
        matched = sum(1 for a in req if venue_amenities.get(a))
        scores["amenity_match"] = matched / len(req) if req else 0.5
    else:
        scores["amenity_match"] = 0.5

    # Vibe match
    if search.get("vibe"):
        venue_vibes = [v.lower() for v in (venue.get("vibes") or [])]
        scores["vibe_match"] = 1.0 if search["vibe"].lower() in venue_vibes else 0.2
    else:
        scores["vibe_match"] = 0.5

    # Weighted total
    total = sum(scores.get(k, 0.5) * sub_w.get(k, 0) for k in sub_w)
    return {"total": round(total, 4), "breakdown": scores}


def score_quality_trust(venue: dict, sub_w: dict, neutral: dict) -> dict:
    """Score quality and trustworthiness from available data."""
    scores = {}

    # Rating (normalize 0-5 to 0-1)
    rating = venue.get("rating", 0) or 0
    if rating > 0:
        scores["rating_score"] = min(1.0, rating / 5.0)
    else:
        scores["rating_score"] = neutral.get("missing_rating", 0.5)

    # Review volume (log scale, cap at 500)
    review_count = venue.get("review_count", 0) or 0
    if review_count > 0:
        scores["review_volume"] = min(1.0, math.log1p(review_count) / math.log1p(500))
    else:
        scores["review_volume"] = neutral.get("missing_review_count", 0.5)

    # Image count (more images = better, cap at 10)
    images = venue.get("images", []) or []
    scores["image_count"] = min(1.0, len(images) / 10.0)

    # Listing completeness
    scores["listing_completeness"] = compute_listing_completeness(venue)

    # Pricing completeness
    scores["pricing_completeness"] = compute_pricing_completeness(venue)

    total = sum(scores.get(k, 0.5) * sub_w.get(k, 0) for k in sub_w)
    return {"total": round(total, 4), "breakdown": scores}


def score_operational_readiness(venue: dict, neutral: dict) -> dict:
    """
    V1: NEUTRAL for all venues — no operational data exists.
    Returns flat neutral score. Will activate when data matures.
    """
    base = neutral.get("operational_readiness", 0.50)
    return {
        "total": base,
        "breakdown": {
            "response_sla": base,
            "quote_speed": base,
            "partner_status": base,
            "readiness_status": base,
        },
        "note": "V1_NEUTRAL — no operational data available"
    }


def score_conversion_confidence(venue: dict, neutral: dict) -> dict:
    """
    V1: NEUTRAL for all venues — no conversion data exists.
    Returns flat neutral score. Will activate when data matures.
    """
    base = neutral.get("conversion_confidence", 0.50)
    return {
        "total": base,
        "breakdown": {
            "booking_conversion_rate": base,
            "cancellation_rate": base,
            "complaint_score": base,
        },
        "note": "V1_NEUTRAL — no conversion data available"
    }


def score_freshness(venue: dict, sub_w: dict) -> dict:
    """Freshness from created_at. Newer venues score higher."""
    scores = {}

    created_str = venue.get("created_at", "")
    if created_str:
        try:
            if isinstance(created_str, datetime):
                created = created_str
            else:
                created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            days_old = (datetime.now(timezone.utc) - created).days
            # Decay: 1.0 at day 0, 0.5 at 180 days, ~0.2 at 365 days
            scores["freshness_days"] = max(0.1, 1.0 / (1.0 + days_old / 180.0))
        except (ValueError, TypeError):
            scores["freshness_days"] = 0.5
    else:
        scores["freshness_days"] = 0.5

    # Diversity bonus — assigned in Stage 4
    scores["diversity_bonus"] = 0.5

    total = sum(scores.get(k, 0.5) * sub_w.get(k, 0) for k in sub_w)
    return {"total": round(total, 4), "breakdown": scores}


# ─── Stage 3: Penalties & Boosts ───

def apply_penalties_boosts(venue: dict, base_score: float, config: dict) -> dict:
    """Apply additive penalties and boosts. Returns adjustment + reasons."""
    penalties_cfg = config.get("penalties", {})
    boosts_cfg = config.get("boosts", {})
    adjustments = []
    total_adj = 0.0

    # Stale listing penalty
    created_str = venue.get("created_at", "")
    if created_str:
        try:
            if isinstance(created_str, datetime):
                created = created_str
            else:
                created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            days_old = (datetime.now(timezone.utc) - created).days
            stale_days = penalties_cfg.get("stale_listing_days", 180)
            if days_old > stale_days:
                pen = penalties_cfg.get("stale_listing_penalty", -0.05)
                total_adj += pen
                adjustments.append({"type": "penalty", "reason": f"stale_listing ({days_old} days)", "value": pen})
        except (ValueError, TypeError):
            pass

    # Incomplete pricing penalty
    pricing_completeness = compute_pricing_completeness(venue)
    if pricing_completeness < 1.0:
        pen = penalties_cfg.get("incomplete_pricing_penalty", -0.03)
        total_adj += pen
        adjustments.append({"type": "penalty", "reason": f"incomplete_pricing ({pricing_completeness:.0%})", "value": pen})

    # Zero images penalty
    if len(venue.get("images", [])) == 0:
        pen = penalties_cfg.get("zero_images_penalty", -0.10)
        total_adj += pen
        adjustments.append({"type": "penalty", "reason": "zero_images", "value": pen})

    # Low completeness penalty
    completeness = compute_listing_completeness(venue)
    if completeness < 0.5:
        pen = penalties_cfg.get("low_completeness_penalty", -0.05)
        total_adj += pen
        adjustments.append({"type": "penalty", "reason": f"low_completeness ({completeness:.0%})", "value": pen})

    # New venue boost
    if created_str:
        try:
            if isinstance(created_str, datetime):
                created = created_str
            else:
                created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            days_old = (datetime.now(timezone.utc) - created).days
            new_days = boosts_cfg.get("new_venue_days", 30)
            if days_old <= new_days:
                boost = boosts_cfg.get("new_venue_boost", 0.03)
                total_adj += boost
                adjustments.append({"type": "boost", "reason": f"new_venue ({days_old} days)", "value": boost})
        except (ValueError, TypeError):
            pass

    # High quality boost
    rating = venue.get("rating", 0) or 0
    review_count = venue.get("review_count", 0) or 0
    if rating >= 4.8 and review_count >= 50:
        boost = boosts_cfg.get("high_quality_boost", 0.05)
        total_adj += boost
        adjustments.append({"type": "boost", "reason": f"high_quality (rating={rating}, reviews={review_count})", "value": boost})

    # Verified boost (NEUTRAL in V1 — no data)
    if venue.get("verified_status"):
        boost = boosts_cfg.get("verified_boost", 0.0)
        if boost > 0:
            total_adj += boost
            adjustments.append({"type": "boost", "reason": "verified_venue", "value": boost})

    final_score = max(0.0, min(1.0, base_score + total_adj))
    return {
        "base_score": round(base_score, 4),
        "adjustment": round(total_adj, 4),
        "final_score": round(final_score, 4),
        "adjustments": adjustments,
    }


# ─── Stage 4: Diversity Re-ranking ───

def apply_diversity(ranked_venues: list, config: dict) -> list:
    """
    Re-rank to avoid monotonous top results.
    Gently pushes down over-represented types/areas in top positions.
    """
    diversity_cfg = config.get("diversity", {})
    strength = diversity_cfg.get("diversity_strength", 0.5)
    max_type_top5 = diversity_cfg.get("max_same_type_in_top5", 3)
    max_area_top5 = diversity_cfg.get("max_same_area_in_top5", 2)

    if strength == 0 or len(ranked_venues) <= 5:
        return ranked_venues

    result = []
    type_counts = {}
    area_counts = {}

    for v in ranked_venues:
        vtype = normalize_venue_type(v["venue"].get("venue_type", ""))
        area = (v["venue"].get("area") or "").lower()

        # Check if adding this would exceed diversity limits in top 5
        if len(result) < 5:
            type_count = type_counts.get(vtype, 0)
            area_count = area_counts.get(area, 0)

            if type_count >= max_type_top5 or area_count >= max_area_top5:
                # Apply diversity penalty to score
                penalty = strength * 0.05
                v["diversity_penalty"] = round(penalty, 4)
                v["scoring"]["final_score"] = round(
                    max(0, v["scoring"]["final_score"] - penalty), 4
                )
            else:
                v["diversity_penalty"] = 0.0

            type_counts[vtype] = type_count + 1
            area_counts[area] = area_count + 1

        result.append(v)

    # Re-sort by final_score after diversity adjustments
    result.sort(key=lambda x: x["scoring"]["final_score"], reverse=True)
    return result


# ─── Stage 5: Output Buckets ───

def assign_buckets(ranked_venues: list, config: dict) -> dict:
    """Split ranked list into Best Matches, Smart Alternatives, Expert Picks."""
    bucket_cfg = config.get("buckets", {})
    best_n = bucket_cfg.get("best_matches", 6)
    alt_n = bucket_cfg.get("smart_alternatives", 6)
    expert_n = bucket_cfg.get("expert_picks", 3)

    best_matches = ranked_venues[:best_n]
    remaining = ranked_venues[best_n:]

    # Smart Alternatives: different type/area from Best Matches
    best_types = {normalize_venue_type(v["venue"].get("venue_type", "")) for v in best_matches}
    best_areas = {(v["venue"].get("area") or "").lower() for v in best_matches}

    smart_alts = []
    leftover = []
    for v in remaining:
        vtype = normalize_venue_type(v["venue"].get("venue_type", ""))
        area = (v["venue"].get("area") or "").lower()
        if len(smart_alts) < alt_n and (vtype not in best_types or area not in best_areas):
            smart_alts.append(v)
        else:
            leftover.append(v)

    # Fill smart alternatives if not enough diverse options
    while len(smart_alts) < alt_n and leftover:
        smart_alts.append(leftover.pop(0))

    # Expert Picks: highest quality from leftover
    expert_picks = sorted(leftover, key=lambda x: x["scoring"]["quality_trust"], reverse=True)[:expert_n]

    # Tag bucket assignment
    for v in best_matches:
        v["bucket"] = "best_matches"
    for v in smart_alts:
        v["bucket"] = "smart_alternatives"
    for v in expert_picks:
        v["bucket"] = "expert_picks"

    return {
        "best_matches": best_matches,
        "smart_alternatives": smart_alts,
        "expert_picks": expert_picks,
        "total_eligible": len(ranked_venues),
    }


# ─── Main Pipeline ───

def run_ranking_pipeline(venues: list, search: dict, config: dict, overrides: list = None) -> dict:
    """
    Execute the full 5-stage ranking pipeline.
    Returns scored, bucketed results with full audit trail.
    """
    weights = config.get("weights", {})
    neutral = config.get("neutral_scores", {})
    overrides = overrides or []
    override_map = {o["venue_id"]: o for o in overrides if o.get("venue_id")}

    # Stage 1: Eligibility
    eligible = []
    ineligible = []

    for venue in venues:
        vid = venue.get("venue_id", "")
        elig_result = check_eligibility(venue, search, config)

        # Check manual override: excluded venues
        if vid in override_map and override_map[vid].get("action") == "exclude":
            ineligible.append({
                "venue_id": vid,
                "venue_name": venue.get("name", ""),
                "eligible": False,
                "reasons": [f"manually excluded: {override_map[vid].get('reason', '')}"],
            })
            continue

        if elig_result["eligible"]:
            eligible.append({"venue": venue, "eligibility": elig_result})
        else:
            ineligible.append({
                "venue_id": vid,
                "venue_name": venue.get("name", ""),
                "eligible": False,
                "reasons": elig_result["reasons"],
            })

    # Stage 2: Scoring
    for item in eligible:
        venue = item["venue"]
        vid = venue.get("venue_id", "")

        fit = score_customer_fit(venue, search, config.get("customer_fit_sub", {}))
        quality = score_quality_trust(venue, config.get("quality_trust_sub", {}), neutral)
        ops = score_operational_readiness(venue, neutral)
        conv = score_conversion_confidence(venue, neutral)
        fresh = score_freshness(venue, config.get("freshness_sub", {}))

        weighted_score = (
            fit["total"] * weights.get("customer_fit", 0.45) +
            quality["total"] * weights.get("quality_trust", 0.30) +
            ops["total"] * weights.get("operational_readiness", 0.10) +
            conv["total"] * weights.get("conversion_confidence", 0.05) +
            fresh["total"] * weights.get("freshness_diversity", 0.10)
        )

        item["scoring"] = {
            "customer_fit": fit["total"],
            "customer_fit_breakdown": fit["breakdown"],
            "quality_trust": quality["total"],
            "quality_trust_breakdown": quality["breakdown"],
            "operational_readiness": ops["total"],
            "operational_readiness_note": ops.get("note", ""),
            "conversion_confidence": conv["total"],
            "conversion_confidence_note": conv.get("note", ""),
            "freshness_diversity": fresh["total"],
            "freshness_breakdown": fresh["breakdown"],
            "weighted_score": round(weighted_score, 4),
        }

        # Stage 3: Penalties & Boosts
        pb = apply_penalties_boosts(venue, weighted_score, config)
        item["scoring"]["penalties_boosts"] = pb["adjustments"]
        item["scoring"]["base_score"] = pb["base_score"]
        item["scoring"]["final_score"] = pb["final_score"]

        # Manual overrides: pin/demote
        if vid in override_map:
            ov = override_map[vid]
            if ov.get("action") == "pin":
                item["scoring"]["final_score"] = 1.0  # force to top
                item["scoring"]["penalties_boosts"].append({
                    "type": "override", "reason": f"pinned: {ov.get('reason', '')}", "value": "→ 1.0"
                })
            elif ov.get("action") == "demote":
                item["scoring"]["final_score"] = max(0, item["scoring"]["final_score"] - 0.30)
                item["scoring"]["penalties_boosts"].append({
                    "type": "override", "reason": f"demoted: {ov.get('reason', '')}", "value": -0.30
                })

    # Sort by final score descending
    eligible.sort(key=lambda x: x["scoring"]["final_score"], reverse=True)

    # Stage 4: Diversity
    eligible = apply_diversity(eligible, config)

    # Stage 5: Buckets
    buckets = assign_buckets(eligible, config)

    return {
        "engine_version": ENGINE_VERSION,
        "config_version": config.get("config_version", 1),
        "search_input": search,
        "total_venues_considered": len(venues),
        "total_eligible": len(eligible),
        "total_ineligible": len(ineligible),
        "ineligible_venues": ineligible,
        "buckets": {
            "best_matches": _strip_venue_internals(buckets["best_matches"]),
            "smart_alternatives": _strip_venue_internals(buckets["smart_alternatives"]),
            "expert_picks": _strip_venue_internals(buckets["expert_picks"]),
        },
        "full_ranked_list": _strip_venue_internals(eligible),
    }


def _strip_venue_internals(items: list) -> list:
    """Remove raw venue dict from output, keep only venue_id + name + scoring."""
    result = []
    for item in items:
        venue = item.get("venue", {})
        entry = {
            "venue_id": venue.get("venue_id", ""),
            "venue_name": venue.get("name", ""),
            "venue_city": venue.get("city", ""),
            "venue_area": venue.get("area", ""),
            "venue_type": venue.get("venue_type", ""),
            "capacity": f"{venue.get('capacity_min', 0)}-{venue.get('capacity_max', 0)}",
            "price_veg": venue.get("pricing", {}).get("price_per_plate_veg", 0),
            "rating": venue.get("rating", 0),
            "image_count": len(venue.get("images", [])),
            "scoring": item.get("scoring", {}),
            "eligibility": item.get("eligibility", {}),
            "bucket": item.get("bucket", ""),
            "diversity_penalty": item.get("diversity_penalty", 0),
        }
        result.append(entry)
    return result
