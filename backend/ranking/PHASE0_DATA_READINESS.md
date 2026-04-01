# VenuLoQ Ranking Engine — Phase 0: Data Readiness Report

## Date: 2026-04-01
## Dataset: 82 venues across 9 cities (all status: approved)

---

## 1. Existing Field Population (96–100% populated)

| Field | Population | Status |
|-------|-----------|--------|
| city | 82/82 (100%) | OK |
| area | 79/82 (96%) | OK |
| pincode | 79/82 (96%) | OK |
| status | 82/82 (100%) | OK |
| venue_type | 82/82 (100%) | OK — but has case inconsistencies |
| indoor_outdoor | 79/82 (96%) | OK |
| capacity_min | 82/82 (100%) | OK |
| capacity_max | 82/82 (100%) | OK |
| event_types | 79/82 (96%) | OK |
| images | 82/82 (100%) | OK |
| vibes | 81/82 (99%) | OK |
| rating | 82/82 (100%) | OK — but compressed (78/82 are 4.5+) |
| review_count | 79/82 (96%) | OK |
| description | 81/82 (99%) | OK |
| amenities | 82/82 (100%) | OK (10 sub-fields) |
| pricing.price_per_plate_veg | 79/82 (96%) | OK |
| pricing.price_per_plate_nonveg | 78/82 (95%) | OK |
| pricing.min_spend | 81/82 (99%) | OK |
| latitude/longitude | 79/82 (96%) | OK |
| created_at | 82/82 (100%) | OK |

## 2. Missing Scoring Fields (0/82 — do NOT exist in any document)

| Field | Status | V1 Treatment |
|-------|--------|--------------|
| verified_status | MISSING | **NEUTRAL** |
| listing_completeness_score | MISSING | **COMPUTE** from existing fields |
| image_quality_score | MISSING | **NEUTRAL** |
| pricing_completeness_score | MISSING | **COMPUTE** from pricing sub-fields |
| partner_status | MISSING | **NEUTRAL** |
| readiness_status | MISSING | **NEUTRAL** |
| response_sla_score | MISSING | **NEUTRAL** |
| quote_speed_score | MISSING | **NEUTRAL** |
| dispute_flag | MISSING | **NEUTRAL** |
| booking_conversion_rate | MISSING | **NEUTRAL** |
| cancellation_rate | MISSING | **NEUTRAL** |
| complaint_score | MISSING | **NEUTRAL** |
| exposure_score | MISSING | **NEUTRAL** |
| freshness_score | MISSING | **COMPUTE** from created_at |
| ideal_capacity_min/max | MISSING | **NEUTRAL** — use capacity_min/max |
| budget_per_plate_min/max | MISSING | **NEUTRAL** — use pricing fields |
| rental_min/max | MISSING | **NEUTRAL** |
| mood_vibe_tags | MISSING | Use existing `vibes` array |

## 3. Data Quality Issues

1. **venue_type inconsistency**: "hotel" (27) vs "Hotel" (19), "banquet_hall" (7) vs "Banquet Hall" (2), "convention_center" (1) vs "Convention Centre" (1). Engine must normalize to lowercase before matching.
2. **Rating compression**: 78/82 venues rated 4.5–5.0. Rating alone is a weak differentiator. Engine should weight review_count alongside rating.
3. **3 venues have 0 rating**: These should not be penalized — treat as neutral (no reviews yet).
4. **Sparse shortlist data**: Only 6 venues have any shortlist counts (1 venue has 45, rest have 1-3). Not enough for reliable conversion signals.
5. **Favorites**: All 6 favorites have `venue_id: None` — not usable.

## 4. Scoring Component Readiness for V1

| Component | V1 Status | Data Basis |
|-----------|----------|------------|
| **Customer Fit Score** | **ACTIVE** | city, capacity, pricing, event_types, indoor_outdoor, amenities, vibes — all well populated |
| **Quality & Trust Score** | **PARTIAL** | rating (compressed), review_count, image count (from images[]), computed listing completeness. Verified status → NEUTRAL |
| **Operational/Commercial Readiness** | **NEUTRAL** | No response_sla, quote_speed, partner_status, readiness data exists. Default to neutral score for all venues |
| **Conversion Confidence** | **NEUTRAL** | No booking_conversion_rate, cancellation_rate, complaint data. Shortlist data too sparse. Default to neutral |
| **Freshness/Diversity** | **PARTIAL** | created_at available for freshness calculation. Exposure → NEUTRAL (no impression tracking yet) |

## 5. Computable Fields for V1

These can be derived from existing data without new inputs:

1. **listing_completeness_score**: Count populated fields (description, images, pricing, amenities, event_types, vibes, area, indoor_outdoor) / total expected fields
2. **pricing_completeness_score**: Check if veg_price, nonveg_price, min_spend all present and > 0
3. **image_count**: len(venue.images)
4. **freshness_days**: (now - created_at).days
5. **venue_type_normalized**: lowercase + underscore normalization

## 6. Available Signals from Related Collections

| Collection | Count | Usable Signal |
|-----------|-------|--------------|
| venue_shortlist | 55 | Shortlist popularity (sparse — only 6 venues) |
| reviews | 7 | Review quality (too few for V1) |
| venue_availability | 23 | Date blocking (can use for availability filter) |
| leads | 170 | Lead volume per venue (venue_ids often empty) |

## 7. Safe V1 Defaults

### Active scoring weights (supported by data):
- Customer Fit: **0.45** (strongest — best data coverage)
- Quality & Trust: **0.30** (partial — rating compressed, but image/completeness help)
- Freshness/Diversity: **0.10** (created_at only)

### Neutral scoring weights (insufficient data — contribute flat score):
- Operational Readiness: **0.10** → all venues get same base score
- Conversion Confidence: **0.05** → all venues get same base score

### Penalty/Boost defaults:
- Stale listing penalty: -5% if created > 180 days ago with no updates
- Incomplete pricing penalty: -3% if missing any pricing sub-field
- Verified boost: +0% (no verified_status data exists)
- New venue boost: +3% if created within 30 days

## 8. Benchmark Scenarios to Validate

| # | Scenario | City | Budget/plate | Guests | Type | Key Filter |
|---|----------|------|-------------|--------|------|-----------|
| 1 | Low-budget birthday | Delhi | ≤1500 | 50-100 | Any | — |
| 2 | Mid-budget wedding | Delhi | 2000-4000 | 200-500 | Any | Outdoor |
| 3 | Premium wedding | Delhi | 4000+ | 300-800 | Hotel/Resort | Valet, AC |
| 4 | Corporate event | Gurgaon | 2000-3000 | 100-300 | Hotel/Convention | AC, WiFi |
| 5 | Small private party | Mumbai | ≤2000 | 20-80 | Rooftop/Villa | DJ allowed |
| 6 | Large guest count | Delhi | Any | 800-2500 | Any | Parking |
| 7 | Tight capacity | Bangalore | 1500-3000 | 40-60 | Any | — |
| 8 | Style-driven | Delhi | Any | 100-400 | Any | Vibe: Royal |
| 9 | Mandatory amenity | Chennai | Any | 100-300 | Any | Alcohol, Parking |

---

## Conclusion

V1 engine can meaningfully rank on **Customer Fit** and partially on **Quality/Trust** and **Freshness**. Operational Readiness and Conversion Confidence must be neutral until real operational data accumulates. The engine design must make it trivial to activate these components later by simply populating the venue fields and adjusting weights.
