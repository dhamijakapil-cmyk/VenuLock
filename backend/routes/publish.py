"""
VenuLoQ — Publish Governance API (Phase 8)
Supply activation: readiness gate, visibility controls, version discipline,
audit trail, ranking eligibility posture.
"""
import re
import uuid
import copy
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/publish", tags=["publish"])
logger = logging.getLogger("publish")

# ── Role permissions ──
ROLE_CAN_PUBLISH = {"venue_manager", "admin"}
ROLE_CAN_UNPUBLISH = {"venue_manager", "admin"}
ROLE_CAN_HIDE = {"venue_manager", "admin"}
ROLE_CAN_ARCHIVE = {"admin"}
ROLE_CAN_RANKING = {"venue_manager", "admin"}

# ── Publish statuses ──
PUBLISH_STATUSES = [
    "owner_onboarding_completed",
    "publish_ready",
    "published_live",
    "hidden_from_public",
    "unpublished",
    "archived",
]

RANKING_VALUES = ["not_eligible", "eligible", "blocked_quality", "hidden"]

# ── Required identity/location fields for publish ──
PUBLISH_REQUIRED_FIELDS = [
    "venue_name", "city", "locality", "venue_type", "capacity_min", "capacity_max",
]

MIN_PHOTOS_DEFAULT = 3


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_db(request: Request):
    from config import db as app_db
    return app_db


async def get_current_user(request: Request):
    from routes.acquisitions import get_current_user as _get
    return await _get(request)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return re.sub(r'-+', '-', text).strip('-')


# ── Models ──

class PublishAction(BaseModel):
    reason: Optional[str] = None

class PublishOverride(BaseModel):
    reason: Optional[str] = None
    override_media_min: Optional[bool] = False  # manager can override 3-photo rule

class UnpublishAction(BaseModel):
    reason: str

class HideAction(BaseModel):
    reason: str

class UnhideAction(BaseModel):
    reason: Optional[str] = None

class ArchiveAction(BaseModel):
    reason: str

class SaveDraft(BaseModel):
    venue_name: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    address: Optional[str] = None
    venue_type: Optional[str] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    indoor_outdoor: Optional[str] = None
    pricing_band_min: Optional[float] = None
    pricing_band_max: Optional[float] = None
    event_types: Optional[List[str]] = None
    amenity_tags: Optional[List[str]] = None
    vibe_tags: Optional[List[str]] = None
    publishable_summary: Optional[str] = None

class PromoteDraft(BaseModel):
    reason: Optional[str] = None
    confirm: bool = False

class RankingUpdate(BaseModel):
    ranking_eligibility: str
    reason: Optional[str] = None


# ── Readiness checks ──

def run_publish_readiness(doc: dict) -> dict:
    """7-point publish readiness gate."""
    checks = []

    # 1. Owner onboarding completed
    onboarding_ok = doc.get("status") in (
        "owner_onboarding_completed", "publish_ready", "published_live",
        "hidden_from_public", "unpublished",
    )
    onboarding_data = doc.get("onboarding", {})
    checks.append({
        "id": "owner_onboarding",
        "label": "Owner onboarding completed",
        "passed": onboarding_ok,
        "detail": f"Accepted by {onboarding_data.get('signer_name', 'N/A')}" if onboarding_ok else "Owner has not completed onboarding",
        "required": True,
    })

    # 2. Required identity/location fields
    missing_fields = []
    for f in PUBLISH_REQUIRED_FIELDS:
        val = doc.get(f)
        if val is None or val == "" or val == 0:
            missing_fields.append(f.replace("_", " ").title())
    identity_ok = len(missing_fields) == 0
    checks.append({
        "id": "identity_fields",
        "label": "Venue identity & location complete",
        "passed": identity_ok,
        "detail": f"Missing: {', '.join(missing_fields)}" if missing_fields else "All required fields present",
        "required": True,
    })

    # 3. Minimum usable media
    photos = doc.get("photos", [])
    photo_count = len(photos)
    media_ok = photo_count >= MIN_PHOTOS_DEFAULT
    checks.append({
        "id": "media_minimum",
        "label": f"Minimum {MIN_PHOTOS_DEFAULT} usable photos",
        "passed": media_ok,
        "detail": f"{photo_count} photo(s) available" + ("" if media_ok else f" — need {MIN_PHOTOS_DEFAULT - photo_count} more"),
        "overridable": True,
        "required": True,
    })

    # 4. Pricing posture present
    price_min = doc.get("pricing_band_min") or 0
    price_max = doc.get("pricing_band_max") or 0
    pricing_ok = price_min > 0 or price_max > 0
    checks.append({
        "id": "pricing_posture",
        "label": "Pricing data present",
        "passed": pricing_ok,
        "detail": f"Range: ₹{int(price_min):,}–₹{int(price_max):,}/plate" if pricing_ok else "No pricing information",
        "required": True,
    })

    # 5. Publishable summary
    summary = (doc.get("publishable_summary") or "").strip()
    summary_ok = len(summary) >= 20
    checks.append({
        "id": "publishable_summary",
        "label": "Publishable summary ready",
        "passed": summary_ok,
        "detail": f"{len(summary)} chars" if summary else "No summary written",
        "required": True,
    })

    # 6. No unresolved risk/blocker flags
    from routes.acquisitions import run_venus_assist
    venus = run_venus_assist(doc)
    blocker_count = venus["summary"]["blocker_count"]
    risk_ok = blocker_count == 0
    checks.append({
        "id": "no_risk_flags",
        "label": "No unresolved risk/blocker flags",
        "passed": risk_ok,
        "detail": f"{blocker_count} blocker(s) remain" if not risk_ok else "No blockers",
        "required": True,
    })

    # 7. Venue active/displayable internally
    non_displayable = {"rejected", "archived", "draft"}
    active_ok = doc.get("status") not in non_displayable
    checks.append({
        "id": "venue_active",
        "label": "Venue is active / displayable internally",
        "passed": active_ok,
        "detail": f"Current status: {doc.get('status', 'unknown')}",
        "required": True,
    })

    # Overall readiness
    required_checks = [c for c in checks if c.get("required")]
    hard_fails = [c for c in required_checks if not c["passed"] and not c.get("overridable")]
    overridable_fails = [c for c in required_checks if not c["passed"] and c.get("overridable")]
    all_passed = all(c["passed"] for c in required_checks)

    if all_passed:
        overall = "ready"
    elif not hard_fails and overridable_fails:
        overall = "ready_with_override"
    else:
        overall = "not_ready"

    return {
        "overall": overall,
        "checks": checks,
        "passed_count": sum(1 for c in checks if c["passed"]),
        "total_count": len(checks),
        "hard_fails": len(hard_fails),
        "overridable_fails": len(overridable_fails),
    }


# ── Snapshot helpers ──

def build_venue_snapshot(doc: dict) -> dict:
    """Build a venue snapshot dict from acquisition data for versioning."""
    return {
        "venue_name": doc.get("venue_name"),
        "city": doc.get("city"),
        "locality": doc.get("locality"),
        "address": doc.get("address"),
        "venue_type": doc.get("venue_type"),
        "capacity_min": doc.get("capacity_min"),
        "capacity_max": doc.get("capacity_max"),
        "indoor_outdoor": doc.get("indoor_outdoor"),
        "pricing_band_min": doc.get("pricing_band_min"),
        "pricing_band_max": doc.get("pricing_band_max"),
        "event_types": doc.get("event_types") or [],
        "amenity_tags": doc.get("amenity_tags") or [],
        "vibe_tags": doc.get("vibe_tags") or [],
        "publishable_summary": doc.get("publishable_summary"),
        "photos": doc.get("photos") or [],
        "latitude": doc.get("latitude"),
        "longitude": doc.get("longitude"),
        "owner_name": doc.get("owner_name"),
        "owner_phone": doc.get("owner_phone"),
        "owner_email": doc.get("owner_email"),
        "snapshot_at": now_iso(),
    }


def map_to_public_venue(doc: dict, venue_id: str = None) -> dict:
    """Map acquisition data to the public venues collection schema."""
    name = doc.get("venue_name", "")
    city = doc.get("city", "")
    price_min = doc.get("pricing_band_min") or 0
    price_max = doc.get("pricing_band_max") or 0

    photos = doc.get("photos") or []
    images = [p.get("url") for p in photos if p.get("url")]

    return {
        "venue_id": venue_id or f"venue_{uuid.uuid4().hex[:12]}",
        "name": name,
        "slug": slugify(name),
        "city": city,
        "city_slug": slugify(city),
        "area": doc.get("locality", ""),
        "address": doc.get("address", ""),
        "venue_type": doc.get("venue_type", ""),
        "indoor_outdoor": doc.get("indoor_outdoor", ""),
        "capacity_min": doc.get("capacity_min") or 0,
        "capacity_max": doc.get("capacity_max") or 0,
        "pricing": {
            "price_per_plate_veg": int(price_min) if price_min else 0,
            "price_per_plate_nonveg": int(price_max) if price_max else 0,
            "min_spend": 0,
        },
        "description": doc.get("publishable_summary", ""),
        "images": images,
        "event_types": doc.get("event_types") or [],
        "amenities": _map_amenity_tags(doc.get("amenity_tags") or []),
        "vibes": doc.get("vibe_tags") or [],
        "latitude": doc.get("latitude") or 0,
        "longitude": doc.get("longitude") or 0,
        "rating": 0.0,
        "review_count": 0,
        "status": "approved",
        "created_at": now_iso(),
    }


def _map_amenity_tags(tags: list) -> dict:
    """Map simple string tags to the amenities dict format used by venues."""
    amenities = {}
    tag_map = {
        "parking": "parking", "valet": "valet", "ac": "ac",
        "alcohol": "alcohol_allowed", "rooms": "rooms_available",
        "catering_inhouse": "catering_inhouse", "catering_outside": "catering_outside_allowed",
        "decor": "decor_inhouse", "sound": "sound_system", "dj": "dj",
        "wifi": "wifi", "generator": "generator_backup",
    }
    for tag in tags:
        key = tag.lower().strip().replace(" ", "_")
        if key in tag_map:
            amenities[tag_map[key]] = True
    return amenities


def add_audit(doc: dict, action: str, user: dict, reason: str = None, extra: dict = None) -> dict:
    """Build a publish audit entry."""
    entry = {
        "action": action,
        "actor_id": user.get("user_id"),
        "actor_name": user.get("name", user.get("email", "")),
        "actor_role": user.get("role"),
        "reason": reason,
        "timestamp": now_iso(),
    }
    if extra:
        entry.update(extra)
    return entry


# ── Routes ──

@router.get("/queue")
async def publish_queue(request: Request, tab: Optional[str] = None):
    """List venues by publish stage. Tabs: ready, live, hidden, unpublished, archived."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)

    tab_statuses = {
        "ready": ["owner_onboarding_completed", "publish_ready"],
        "live": ["published_live"],
        "hidden": ["hidden_from_public"],
        "unpublished": ["unpublished"],
        "archived": ["archived"],
    }

    if tab and tab in tab_statuses:
        statuses = tab_statuses[tab]
    else:
        statuses = PUBLISH_STATUSES

    query = {"status": {"$in": statuses}}
    items = await db.venue_acquisitions.find(
        query, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)

    # Add readiness posture for each, then strip heavy fields
    for item in items:
        readiness = run_publish_readiness(item)
        item["publish_readiness"] = readiness["overall"]
        item["readiness_score"] = f"{readiness['passed_count']}/{readiness['total_count']}"
        photo_count = len(item.get("photos") or [])
        item["photo_count"] = photo_count
        # Strip heavy fields for list view
        for key in ["photos", "onboarding", "history", "live_version", "draft_version",
                     "last_approved_version", "publish_audit", "completeness",
                     "voice_notes", "documents"]:
            item.pop(key, None)

    # Stats
    all_items = await db.venue_acquisitions.aggregate([
        {"$match": {"status": {"$in": PUBLISH_STATUSES}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(20)
    stats = {r["_id"]: r["count"] for r in all_items}

    return {
        "items": items,
        "count": len(items),
        "stats": stats,
    }


@router.get("/{acq_id}/readiness")
async def get_readiness(request: Request, acq_id: str):
    """Run the 7-point publish readiness gate."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    return run_publish_readiness(doc)


@router.get("/{acq_id}/preview")
async def get_preview(request: Request, acq_id: str):
    """Return how the venue card would look on the public platform."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    # Use draft_version if exists, else current doc
    source = doc.get("draft_version") or doc
    if isinstance(source, dict) and "venue_name" not in source:
        source = doc

    preview = map_to_public_venue(source if source != doc else doc)
    preview["_preview"] = True
    preview["acquisition_id"] = acq_id
    preview["current_status"] = doc.get("status")
    preview["ranking_eligibility"] = doc.get("ranking_eligibility", "not_eligible")

    return preview


@router.post("/{acq_id}/publish")
async def publish_venue(request: Request, acq_id: str, body: PublishOverride):
    """Publish a venue — creates/updates public venue record."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    if doc["status"] not in ("owner_onboarding_completed", "publish_ready", "unpublished", "hidden_from_public"):
        raise HTTPException(400, f"Cannot publish from status '{doc['status']}'")

    # Run readiness gate
    readiness = run_publish_readiness(doc)
    if readiness["overall"] == "not_ready":
        failing = [c["label"] for c in readiness["checks"] if not c["passed"] and not c.get("overridable")]
        raise HTTPException(400, f"Publish blocked: {'; '.join(failing)}")

    if readiness["overall"] == "ready_with_override" and not body.override_media_min:
        overridable = [c["label"] for c in readiness["checks"] if not c["passed"] and c.get("overridable")]
        raise HTTPException(400, f"Override required for: {'; '.join(overridable)}. Set override_media_min=true with reason.")

    if body.override_media_min and not body.reason:
        raise HTTPException(400, "Reason required when overriding media minimum")

    # Build live version snapshot
    source_data = doc.get("draft_version") if doc.get("draft_version") and doc.get("status") in ("published_live", "hidden_from_public", "unpublish") else doc
    if not isinstance(source_data, dict) or "venue_name" not in source_data:
        source_data = doc

    live_snapshot = build_venue_snapshot(source_data)

    # Create/update public venue record
    publish_meta = doc.get("publish_meta", {})
    existing_venue_id = publish_meta.get("venue_id")

    public_venue = map_to_public_venue(source_data, venue_id=existing_venue_id)

    if existing_venue_id:
        await db.venues.update_one(
            {"venue_id": existing_venue_id},
            {"$set": {**public_venue, "status": "approved", "updated_at": now_iso()}}
        )
    else:
        existing_venue_id = public_venue["venue_id"]
        public_venue["created_at"] = now_iso()
        await db.venues.insert_one(public_venue)

    # Audit entry
    audit_entry = add_audit(doc, "published", user, body.reason, {
        "venue_id": existing_venue_id,
        "override_media_min": body.override_media_min,
        "readiness_at_publish": readiness["overall"],
    })

    # Update acquisition
    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {
                "status": "published_live",
                "live_version": live_snapshot,
                "draft_version": None,
                "publish_meta.venue_id": existing_venue_id,
                "publish_meta.first_published_at": publish_meta.get("first_published_at") or now_iso(),
                "publish_meta.last_published_at": now_iso(),
                "publish_meta.published_by": user.get("name"),
                "ranking_eligibility": doc.get("ranking_eligibility", "not_eligible"),
                "updated_at": now_iso(),
            },
            "$push": {
                "history": {
                    "action": f"status_change:{doc['status']}→published_live",
                    "status": "published_live",
                    "by_user_id": user["user_id"],
                    "by_name": user.get("name", ""),
                    "by_role": user.get("role"),
                    "reason": body.reason,
                    "timestamp": now_iso(),
                },
                "publish_audit": audit_entry,
            },
        }
    )

    return {
        "message": "Venue published successfully",
        "venue_id": existing_venue_id,
        "status": "published_live",
    }


@router.post("/{acq_id}/unpublish")
async def unpublish_venue(request: Request, acq_id: str, body: UnpublishAction):
    """Remove venue from public visibility."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_UNPUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    if doc["status"] not in ("published_live", "hidden_from_public"):
        raise HTTPException(400, f"Cannot unpublish from status '{doc['status']}'")

    # Mark public venue as unpublished
    venue_id = (doc.get("publish_meta") or {}).get("venue_id")
    if venue_id:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "unpublished"}})

    audit_entry = add_audit(doc, "unpublished", user, body.reason)

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {"status": "unpublished", "updated_at": now_iso()},
            "$push": {
                "history": {
                    "action": f"status_change:{doc['status']}→unpublished",
                    "status": "unpublished",
                    "by_user_id": user["user_id"],
                    "by_name": user.get("name", ""),
                    "by_role": user.get("role"),
                    "reason": body.reason,
                    "timestamp": now_iso(),
                },
                "publish_audit": audit_entry,
            },
        }
    )

    return {"message": "Venue unpublished", "status": "unpublished"}


@router.post("/{acq_id}/hide")
async def hide_venue(request: Request, acq_id: str, body: HideAction):
    """Temporarily hide from public without full unpublish."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_HIDE:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    if doc["status"] not in ("published_live",):
        raise HTTPException(400, f"Can only hide live venues, current: '{doc['status']}'")

    venue_id = (doc.get("publish_meta") or {}).get("venue_id")
    if venue_id:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "hidden"}})

    audit_entry = add_audit(doc, "hidden", user, body.reason)

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {"status": "hidden_from_public", "updated_at": now_iso()},
            "$push": {
                "history": {
                    "action": "status_change:published_live→hidden_from_public",
                    "status": "hidden_from_public",
                    "by_user_id": user["user_id"],
                    "by_name": user.get("name", ""),
                    "by_role": user.get("role"),
                    "reason": body.reason,
                    "timestamp": now_iso(),
                },
                "publish_audit": audit_entry,
            },
        }
    )

    return {"message": "Venue hidden from public", "status": "hidden_from_public"}


@router.post("/{acq_id}/unhide")
async def unhide_venue(request: Request, acq_id: str, body: UnhideAction):
    """Restore a hidden venue back to live."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_HIDE:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    if doc["status"] != "hidden_from_public":
        raise HTTPException(400, f"Can only unhide hidden venues, current: '{doc['status']}'")

    venue_id = (doc.get("publish_meta") or {}).get("venue_id")
    if venue_id:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "approved"}})

    audit_entry = add_audit(doc, "unhidden", user, body.reason)

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {"status": "published_live", "updated_at": now_iso()},
            "$push": {
                "history": {
                    "action": "status_change:hidden_from_public→published_live",
                    "status": "published_live",
                    "by_user_id": user["user_id"],
                    "by_name": user.get("name", ""),
                    "by_role": user.get("role"),
                    "reason": body.reason,
                    "timestamp": now_iso(),
                },
                "publish_audit": audit_entry,
            },
        }
    )

    return {"message": "Venue restored to live", "status": "published_live"}


@router.post("/{acq_id}/archive")
async def archive_venue(request: Request, acq_id: str, body: ArchiveAction):
    """Terminal archive — admin only."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_ARCHIVE:
        raise HTTPException(403, "Only admin can archive")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    if doc["status"] in ("archived",):
        raise HTTPException(400, "Already archived")

    venue_id = (doc.get("publish_meta") or {}).get("venue_id")
    if venue_id:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "archived"}})

    audit_entry = add_audit(doc, "archived", user, body.reason)

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {"status": "archived", "updated_at": now_iso()},
            "$push": {
                "history": {
                    "action": f"status_change:{doc['status']}→archived",
                    "status": "archived",
                    "by_user_id": user["user_id"],
                    "by_name": user.get("name", ""),
                    "by_role": user.get("role"),
                    "reason": body.reason,
                    "timestamp": now_iso(),
                },
                "publish_audit": audit_entry,
            },
        }
    )

    return {"message": "Venue archived", "status": "archived"}


@router.get("/{acq_id}/versions")
async def get_versions(request: Request, acq_id: str):
    """Return live_version, draft_version, last_approved_version for comparison."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one(
        {"acquisition_id": acq_id},
        {"_id": 0, "live_version": 1, "draft_version": 1, "last_approved_version": 1,
         "status": 1, "venue_name": 1, "publish_meta": 1}
    )
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    live = doc.get("live_version")
    draft = doc.get("draft_version")
    approved = doc.get("last_approved_version")

    # Compute diff between live and draft if both exist
    diff = None
    if live and draft:
        diff = []
        compare_fields = [
            "venue_name", "city", "locality", "address", "venue_type",
            "capacity_min", "capacity_max", "indoor_outdoor",
            "pricing_band_min", "pricing_band_max", "publishable_summary",
        ]
        for field in compare_fields:
            live_val = live.get(field)
            draft_val = draft.get(field)
            if live_val != draft_val:
                diff.append({
                    "field": field.replace("_", " ").title(),
                    "live": live_val,
                    "draft": draft_val,
                })
        # Compare arrays
        for arr_field in ["event_types", "amenity_tags", "vibe_tags"]:
            live_arr = sorted(live.get(arr_field) or [])
            draft_arr = sorted(draft.get(arr_field) or [])
            if live_arr != draft_arr:
                diff.append({"field": arr_field.replace("_", " ").title(), "live": live_arr, "draft": draft_arr})
        # Photo count diff
        live_photos = len(live.get("photos") or [])
        draft_photos = len(draft.get("photos") or [])
        if live_photos != draft_photos:
            diff.append({"field": "Photos", "live": f"{live_photos} photos", "draft": f"{draft_photos} photos"})

    return {
        "acquisition_id": acq_id,
        "status": doc.get("status"),
        "has_live": live is not None,
        "has_draft": draft is not None,
        "has_approved": approved is not None,
        "live_version": live,
        "draft_version": draft,
        "last_approved_version": approved,
        "diff": diff,
    }


@router.post("/{acq_id}/save-draft")
async def save_draft(request: Request, acq_id: str, body: SaveDraft):
    """Save draft edits without affecting the live version."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    # Start from existing draft or current doc
    existing_draft = doc.get("draft_version") or build_venue_snapshot(doc)
    updates = body.dict(exclude_none=True)
    for k, v in updates.items():
        existing_draft[k] = v
    existing_draft["last_edited_at"] = now_iso()
    existing_draft["last_edited_by"] = user.get("name", user.get("email"))

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {"$set": {"draft_version": existing_draft, "updated_at": now_iso()}}
    )

    return {"message": "Draft saved", "draft_version": existing_draft}


@router.post("/{acq_id}/promote-draft")
async def promote_draft(request: Request, acq_id: str, body: PromoteDraft):
    """Push draft → live. Requires explicit confirm flag."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    if not body.confirm:
        raise HTTPException(400, "Explicit confirmation required. Set confirm=true.")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    draft = doc.get("draft_version")
    if not draft:
        raise HTTPException(400, "No draft version to promote")

    if doc["status"] not in ("published_live", "hidden_from_public"):
        raise HTTPException(400, f"Can only promote draft for live/hidden venues, current: '{doc['status']}'")

    # Update public venue
    venue_id = (doc.get("publish_meta") or {}).get("venue_id")
    if venue_id:
        public_update = map_to_public_venue(draft, venue_id=venue_id)
        await db.venues.update_one(
            {"venue_id": venue_id},
            {"$set": {**public_update, "updated_at": now_iso()}}
        )

    # Also update the main acquisition fields from draft
    acq_field_updates = {}
    for field in ["venue_name", "city", "locality", "address", "venue_type",
                   "capacity_min", "capacity_max", "indoor_outdoor",
                   "pricing_band_min", "pricing_band_max", "event_types",
                   "amenity_tags", "vibe_tags", "publishable_summary"]:
        if field in draft and draft[field] is not None:
            acq_field_updates[field] = draft[field]

    audit_entry = add_audit(doc, "draft_promoted", user, body.reason, {
        "previous_live_snapshot_at": (doc.get("live_version") or {}).get("snapshot_at"),
    })

    new_live = build_venue_snapshot(draft)

    update_set = {
        "live_version": new_live,
        "draft_version": None,
        "publish_meta.last_published_at": now_iso(),
        "publish_meta.published_by": user.get("name"),
        "updated_at": now_iso(),
        **acq_field_updates,
    }

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": update_set,
            "$push": {
                "history": {
                    "action": "draft_promoted_to_live",
                    "status": doc["status"],
                    "by_user_id": user["user_id"],
                    "by_name": user.get("name", ""),
                    "by_role": user.get("role"),
                    "reason": body.reason,
                    "timestamp": now_iso(),
                },
                "publish_audit": audit_entry,
            },
        }
    )

    return {"message": "Draft promoted to live", "venue_id": venue_id}


@router.get("/{acq_id}/audit")
async def get_audit_trail(request: Request, acq_id: str):
    """Return the full publish/visibility audit trail."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_PUBLISH:
        raise HTTPException(403, "Not authorized")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one(
        {"acquisition_id": acq_id},
        {"_id": 0, "publish_audit": 1, "venue_name": 1, "status": 1}
    )
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    return {
        "acquisition_id": acq_id,
        "venue_name": doc.get("venue_name"),
        "status": doc.get("status"),
        "audit": doc.get("publish_audit") or [],
    }


@router.post("/{acq_id}/ranking")
async def update_ranking(request: Request, acq_id: str, body: RankingUpdate):
    """Set ranking eligibility posture."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_RANKING:
        raise HTTPException(403, "Not authorized")

    if body.ranking_eligibility not in RANKING_VALUES:
        raise HTTPException(400, f"Invalid ranking value. Use: {RANKING_VALUES}")

    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    old_ranking = doc.get("ranking_eligibility", "not_eligible")
    audit_entry = add_audit(doc, "ranking_changed", user, body.reason, {
        "old_value": old_ranking,
        "new_value": body.ranking_eligibility,
    })

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": {
                "ranking_eligibility": body.ranking_eligibility,
                "updated_at": now_iso(),
            },
            "$push": {"publish_audit": audit_entry},
        }
    )

    return {
        "message": f"Ranking updated: {old_ranking} → {body.ranking_eligibility}",
        "ranking_eligibility": body.ranking_eligibility,
    }
