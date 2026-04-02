"""
VenuLoQ — Venue Acquisitions API
Field capture → Review → Refinement → Approval → Owner Onboarding pipeline.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

router = APIRouter(prefix="/acquisitions", tags=["acquisitions"])

# ── Status pipeline ──
VALID_STATUSES = [
    "draft", "submitted_for_review", "sent_back_to_specialist",
    "under_data_refinement", "awaiting_manager_approval",
    "approved", "rejected",
    "owner_onboarding_pending", "owner_onboarding_sent",
    "owner_onboarding_viewed", "owner_onboarding_completed",
    "owner_onboarding_declined", "owner_onboarding_expired",
    "publish_ready", "published_live",
    "hidden_from_public", "unpublished", "archived",
]

# ── Role permissions ──
ROLE_CAN_CREATE = {"venue_specialist", "admin"}
ROLE_CAN_SUBMIT = {"venue_specialist", "admin"}
ROLE_CAN_REVIEW = {"vam", "admin"}  # vam = venue team lead
ROLE_CAN_REFINE = {"data_team", "admin"}
ROLE_CAN_APPROVE = {"venue_manager", "admin"}
ROLE_CAN_VIEW_ALL = {"vam", "venue_manager", "data_team", "admin"}

# Completeness fields
MANDATORY_FIELDS = ["venue_name", "owner_name", "owner_phone", "city", "locality", "venue_type", "capacity_min", "capacity_max"]
MEDIA_FIELDS = ["photos"]
COMMERCIAL_FIELDS = ["owner_interest", "pricing_band_min"]
FOLLOWUP_FIELDS = ["meeting_outcome", "next_followup_date"]

# Ven-Us Assist: deterministic rule checks
CITY_NORMALIZATIONS = {
    "delhi": "Delhi", "new delhi": "New Delhi", "gurgaon": "Gurugram",
    "noida": "Noida", "faridabad": "Faridabad", "ghaziabad": "Ghaziabad",
    "greater noida": "Greater Noida", "gurugram": "Gurugram",
}

VENUE_TYPE_LABELS = {
    "banquet_hall": "Banquet Hall", "hotel": "Hotel", "farmhouse": "Farmhouse",
    "resort": "Resort", "villa": "Villa", "rooftop": "Rooftop",
    "garden": "Garden", "temple": "Temple", "palace": "Palace",
    "club": "Club", "convention_center": "Convention Center",
    "restaurant": "Restaurant", "other": "Other",
}


def run_venus_assist(doc: dict) -> dict:
    """Deterministic rule-based quality checks for venue data."""
    issues = []
    suggestions = []
    blockers = []

    # 1. Missing required fields
    for f in MANDATORY_FIELDS:
        val = doc.get(f)
        if val is None or val == "" or val == 0:
            blockers.append({"field": f, "type": "missing_required", "message": f"Required field '{f.replace('_', ' ')}' is missing"})

    # 2. Weak naming — too short, all-caps, or no proper casing
    name = doc.get("venue_name", "")
    if name:
        if len(name) < 5:
            issues.append({"field": "venue_name", "type": "weak_name", "severity": "medium", "message": "Name too short — may need expansion"})
        if name == name.upper() and len(name) > 3:
            normalized_name = name.title()
            suggestions.append({"field": "venue_name", "type": "naming_format", "message": f"Convert from ALL-CAPS → '{normalized_name}'", "suggested_value": normalized_name})
        if name == name.lower():
            normalized_name = name.title()
            suggestions.append({"field": "venue_name", "type": "naming_format", "message": f"Capitalize properly → '{normalized_name}'", "suggested_value": normalized_name})

    # 3. City normalization
    city = (doc.get("city") or "").strip().lower()
    if city and city in CITY_NORMALIZATIONS:
        proper = CITY_NORMALIZATIONS[city]
        if doc.get("city", "").strip() != proper:
            suggestions.append({"field": "city", "type": "normalization", "message": f"Normalize to '{proper}'", "suggested_value": proper})

    # 4. Locality normalization — check non-empty
    locality = (doc.get("locality") or "").strip()
    if locality and locality == locality.upper() and len(locality) > 3:
        suggestions.append({"field": "locality", "type": "normalization", "message": f"Convert from ALL-CAPS → '{locality.title()}'", "suggested_value": locality.title()})
    if not locality:
        issues.append({"field": "locality", "type": "missing_location", "severity": "high", "message": "Locality is empty — needed for search"})

    # 5. Capacity inconsistency
    cap_min = doc.get("capacity_min") or 0
    cap_max = doc.get("capacity_max") or 0
    if cap_min and cap_max and cap_min > cap_max:
        issues.append({"field": "capacity", "type": "inconsistent_capacity", "severity": "high", "message": f"Min capacity ({cap_min}) > Max capacity ({cap_max})"})
    if cap_max and cap_max < 10:
        issues.append({"field": "capacity_max", "type": "suspicious_value", "severity": "medium", "message": f"Max capacity {cap_max} seems unusually low"})

    # 6. Pricing structure
    price_min = doc.get("pricing_band_min") or 0
    price_max = doc.get("pricing_band_max") or 0
    if price_min and price_max and price_min > price_max:
        issues.append({"field": "pricing", "type": "inconsistent_pricing", "severity": "high", "message": f"Min price (₹{price_min}) > Max price (₹{price_max})"})
    if not price_min and not price_max:
        issues.append({"field": "pricing", "type": "missing_pricing", "severity": "medium", "message": "No pricing info — needed for premium listing"})
    if price_min and price_min < 100:
        issues.append({"field": "pricing_band_min", "type": "suspicious_value", "severity": "low", "message": f"Price ₹{price_min}/plate seems unusually low"})

    # 7. Media posture
    photos = doc.get("photos", [])
    if len(photos) == 0:
        blockers.append({"field": "photos", "type": "missing_media", "message": "No photos — at least 3 needed for premium listing"})
    elif len(photos) < 3:
        issues.append({"field": "photos", "type": "weak_media", "severity": "medium", "message": f"Only {len(photos)} photo(s) — need 3+ for premium listing"})

    # 8. Venue type validation
    vtype = doc.get("venue_type", "")
    if vtype and vtype not in VENUE_TYPE_LABELS:
        suggestions.append({"field": "venue_type", "type": "unknown_type", "message": f"Unknown venue type '{vtype}' — consider standardizing"})

    # 9. Tags / amenities
    amenities = doc.get("amenity_tags") or []
    if not amenities:
        issues.append({"field": "amenity_tags", "type": "missing_tags", "severity": "low", "message": "No amenity tags — helps discovery"})

    # 10. Notes quality
    notes = (doc.get("notes") or "").strip()
    if not notes:
        issues.append({"field": "notes", "type": "missing_notes", "severity": "low", "message": "No specialist notes — harder to write listing copy"})
    elif len(notes) < 30:
        issues.append({"field": "notes", "type": "thin_notes", "severity": "low", "message": f"Notes only {len(notes)} chars — may be too thin for premium card"})

    # 11. Commercial summary
    if not doc.get("owner_interest"):
        issues.append({"field": "owner_interest", "type": "missing_commercial", "severity": "medium", "message": "No owner interest level recorded"})
    if not doc.get("meeting_outcome"):
        issues.append({"field": "meeting_outcome", "type": "missing_commercial", "severity": "medium", "message": "No meeting outcome — commercial posture unclear"})

    # Readiness posture
    blocker_count = len(blockers)
    high_issues = len([i for i in issues if i.get("severity") == "high"])
    med_issues = len([i for i in issues if i.get("severity") == "medium"])
    low_issues = len([i for i in issues if i.get("severity") == "low"])

    if blocker_count > 0:
        readiness = "not_ready"
    elif high_issues > 0:
        readiness = "needs_fixes"
    elif med_issues > 0:
        readiness = "almost_ready"
    else:
        readiness = "ready"

    return {
        "readiness": readiness,
        "blockers": blockers,
        "issues": issues,
        "suggestions": suggestions,
        "summary": {
            "blocker_count": blocker_count,
            "high_count": high_issues,
            "medium_count": med_issues,
            "low_count": low_issues,
            "suggestion_count": len(suggestions),
        },
    }

UPLOAD_DIR = "/app/backend/uploads/acquisitions"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_db(request: Request):
    from config import db
    return db


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def compute_completeness(doc: dict) -> dict:
    """Compute field completeness posture."""
    def filled(fields):
        count = 0
        for f in fields:
            val = doc.get(f)
            if val is not None and val != "" and val != [] and val != 0:
                count += 1
        return count, len(fields)

    mand_filled, mand_total = filled(MANDATORY_FIELDS)
    media_filled = len(doc.get("photos", []))
    comm_filled, comm_total = filled(COMMERCIAL_FIELDS)
    fu_filled, fu_total = filled(FOLLOWUP_FIELDS)

    return {
        "mandatory": {"filled": mand_filled, "total": mand_total, "complete": mand_filled == mand_total},
        "media": {"count": media_filled, "complete": media_filled >= 3},
        "commercial": {"filled": comm_filled, "total": comm_total, "complete": comm_filled == comm_total},
        "followup": {"filled": fu_filled, "total": fu_total, "complete": fu_filled == fu_total},
        "overall_pct": round(
            (mand_filled + min(media_filled, 3) + comm_filled + fu_filled) /
            (mand_total + 3 + comm_total + fu_total) * 100
        ),
    }


# ── Models ──

class AcquisitionCreate(BaseModel):
    venue_name: str
    capture_mode: Optional[str] = "full"  # "quick" or "full"
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    venue_type: Optional[str] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    indoor_outdoor: Optional[str] = None
    pricing_band_min: Optional[float] = None
    pricing_band_max: Optional[float] = None
    event_types: Optional[List[str]] = None
    amenity_tags: Optional[List[str]] = None
    vibe_tags: Optional[List[str]] = None
    notes: Optional[str] = None
    meeting_outcome: Optional[str] = None
    owner_interest: Optional[str] = None  # hot, warm, cold, not_interested
    next_followup_date: Optional[str] = None
    is_decision_maker: Optional[bool] = None
    negotiation_flexibility: Optional[str] = None
    commercial_model_open: Optional[bool] = None


class DuplicateCheck(BaseModel):
    venue_name: str
    owner_phone: Optional[str] = None
    locality: Optional[str] = None


class AcquisitionUpdate(BaseModel):
    venue_name: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    venue_type: Optional[str] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    indoor_outdoor: Optional[str] = None
    pricing_band_min: Optional[float] = None
    pricing_band_max: Optional[float] = None
    event_types: Optional[List[str]] = None
    amenity_tags: Optional[List[str]] = None
    vibe_tags: Optional[List[str]] = None
    notes: Optional[str] = None
    meeting_outcome: Optional[str] = None
    owner_interest: Optional[str] = None
    next_followup_date: Optional[str] = None
    is_decision_maker: Optional[bool] = None
    negotiation_flexibility: Optional[str] = None
    commercial_model_open: Optional[bool] = None
    publishable_summary: Optional[str] = None


class StatusTransition(BaseModel):
    new_status: str
    reason: Optional[str] = None
    notes: Optional[str] = None


# ── Helper: extract user from token ──

async def get_current_user(request: Request):
    """Extract user from auth header."""
    from utils import decode_token
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    db = get_db(request)
    user = await db.users.find_one({"user_id": payload.get("user_id")}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ── Routes ──

@router.post("/check-duplicate")
async def check_duplicate(request: Request, body: DuplicateCheck):
    """Lightweight duplicate check before save."""
    user = await get_current_user(request)
    db = get_db(request)

    name_pattern = body.venue_name.strip()
    if len(name_pattern) < 3:
        return {"duplicates": []}

    import re
    regex = re.compile(re.escape(name_pattern), re.IGNORECASE)
    or_conditions = [{"venue_name": {"$regex": regex}}]

    if body.owner_phone:
        or_conditions.append({"owner_phone": body.owner_phone.strip()})

    candidates = await db.venue_acquisitions.find(
        {"$or": or_conditions},
        {"_id": 0, "acquisition_id": 1, "venue_name": 1, "owner_phone": 1,
         "locality": 1, "city": 1, "status": 1, "capture_mode": 1}
    ).sort("updated_at", -1).to_list(length=10)

    matches = []
    for c in candidates:
        reason = []
        if c.get("venue_name", "").lower().strip() == name_pattern.lower():
            reason.append("same_name")
        if body.owner_phone and c.get("owner_phone") == body.owner_phone.strip():
            reason.append("same_phone")
        if body.locality and c.get("locality", "").lower().strip() == body.locality.lower().strip():
            reason.append("same_locality")
        if reason:
            c["match_reasons"] = reason
            matches.append(c)

    return {"duplicates": matches}


@router.post("/")
async def create_acquisition(request: Request, body: AcquisitionCreate):
    """Create a new venue acquisition draft."""
    user = await get_current_user(request)
    if user.get("role") not in ROLE_CAN_CREATE:
        raise HTTPException(403, "Not authorized to create acquisitions")

    db = get_db(request)
    acq_id = f"acq_{uuid.uuid4().hex[:12]}"

    doc = {
        "acquisition_id": acq_id,
        "status": "draft",
        **body.dict(exclude_none=True),
        "photos": [],
        "voice_notes": [],
        "documents": [],
        "completeness": {},
        "history": [{
            "action": "created",
            "status": "draft",
            "by_user_id": user["user_id"],
            "by_name": user.get("name", ""),
            "by_role": user.get("role", ""),
            "timestamp": now_iso(),
        }],
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    doc["completeness"] = compute_completeness(doc)
    await db.venue_acquisitions.insert_one(doc)

    return {"acquisition_id": acq_id, "status": "draft", "completeness": doc["completeness"]}


@router.get("/")
async def list_acquisitions(request: Request, status: Optional[str] = None, my_only: bool = False):
    """List acquisitions. Specialists see own; leads/managers see all."""
    user = await get_current_user(request)
    db = get_db(request)

    query = {}
    if my_only or user.get("role") == "venue_specialist":
        query["created_by"] = user["user_id"]
    elif user.get("role") not in ROLE_CAN_VIEW_ALL:
        query["created_by"] = user["user_id"]

    if status:
        if "," in status:
            query["status"] = {"$in": [s.strip() for s in status.split(",")]}
        else:
            query["status"] = status

    cursor = db.venue_acquisitions.find(query, {"_id": 0}).sort("updated_at", -1)
    items = await cursor.to_list(length=200)
    return {"acquisitions": items, "count": len(items)}


@router.get("/stats/summary")
async def acquisition_stats(request: Request):
    """Summary stats for dashboard."""
    user = await get_current_user(request)
    db = get_db(request)

    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    results = await db.venue_acquisitions.aggregate(pipeline).to_list(length=50)
    status_counts = {r["_id"]: r["count"] for r in results}
    total = sum(status_counts.values())

    return {"total": total, "by_status": status_counts}


@router.get("/venus-assist/{acq_id}")
async def venus_assist(request: Request, acq_id: str):
    """Run deterministic Ven-Us quality checks on an acquisition."""
    user = await get_current_user(request)
    if user.get("role") not in {"data_team", "admin", "vam", "venue_manager"}:
        raise HTTPException(403, "Not authorized")
    db = get_db(request)
    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")
    return run_venus_assist(doc)


@router.get("/{acq_id}")
async def get_acquisition(request: Request, acq_id: str):
    """Get a single acquisition by ID."""
    user = await get_current_user(request)
    db = get_db(request)

    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    # Role check: specialists can only see their own
    if user.get("role") == "venue_specialist" and doc.get("created_by") != user["user_id"]:
        raise HTTPException(403, "Not authorized")

    doc["completeness"] = compute_completeness(doc)
    return doc


@router.put("/{acq_id}")
async def update_acquisition(request: Request, acq_id: str, body: AcquisitionUpdate):
    """Update acquisition fields. Only allowed in draft/sent_back states."""
    user = await get_current_user(request)
    db = get_db(request)

    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    # Specialists can only edit own drafts/sent-back
    editable_statuses = ["draft", "sent_back_to_specialist"]
    if user.get("role") == "venue_specialist":
        if doc.get("created_by") != user["user_id"]:
            raise HTTPException(403, "Not authorized")
        if doc.get("status") not in editable_statuses:
            raise HTTPException(400, f"Cannot edit in status '{doc['status']}'")
    elif user.get("role") == "data_team":
        if doc.get("status") != "under_data_refinement":
            raise HTTPException(400, "Data team can only edit during refinement")
    elif user.get("role") not in {"admin", "vam", "venue_manager"}:
        raise HTTPException(403, "Not authorized")

    updates = {k: v for k, v in body.dict(exclude_none=True).items()}
    updates["updated_at"] = now_iso()

    # Track field changes for audit (data_team refinement)
    changed_fields = []
    for k, v in updates.items():
        if k == "updated_at":
            continue
        old_val = doc.get(k)
        if old_val != v:
            changed_fields.append({"field": k, "old": str(old_val) if old_val is not None else None, "new": str(v)})

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {"$set": updates}
    )

    # Log refinement audit entry
    if changed_fields and user.get("role") in {"data_team", "admin"}:
        audit_entry = {
            "action": "refinement_edit",
            "by_user": user.get("user_id"),
            "by_name": user.get("name", user.get("email", "")),
            "by_role": user.get("role"),
            "timestamp": now_iso(),
            "changes": changed_fields,
        }
        await db.venue_acquisitions.update_one(
            {"acquisition_id": acq_id},
            {"$push": {"history": audit_entry}}
        )

    # Recompute completeness
    updated_doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    completeness = compute_completeness(updated_doc)
    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {"$set": {"completeness": completeness}}
    )

    return {"message": "Updated", "completeness": completeness}


@router.post("/{acq_id}/status")
async def transition_status(request: Request, acq_id: str, body: StatusTransition):
    """Transition acquisition status. Role-gated."""
    user = await get_current_user(request)
    db = get_db(request)
    role = user.get("role", "")

    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    current = doc.get("status")
    new = body.new_status

    # Validate transitions per role
    allowed = _get_allowed_transitions(current, role)
    if new not in allowed:
        raise HTTPException(400, f"Cannot transition from '{current}' to '{new}' as {role}. Allowed: {allowed}")

    # Send-back and reject require reason
    if new in ["sent_back_to_specialist", "under_data_refinement", "rejected"] and not body.reason:
        raise HTTPException(400, "Reason is required when sending back or rejecting")

    # Submission requires minimum completeness
    if new == "submitted_for_review":
        completeness = compute_completeness(doc)
        if not completeness["mandatory"]["complete"]:
            missing = MANDATORY_FIELDS.copy()
            filled = [f for f in missing if doc.get(f)]
            unfilled = [f for f in missing if f not in filled]
            raise HTTPException(400, f"Cannot submit: missing mandatory fields: {unfilled}")

    # Manager approval guardrail: hard blockers prevent approval
    venus_snapshot = None
    if new == "approved" and role == "venue_manager":
        venus_snapshot = run_venus_assist(doc)
        if venus_snapshot["readiness"] == "not_ready":
            blocker_msgs = [b["message"] for b in venus_snapshot["blockers"]]
            raise HTTPException(400, f"Cannot approve: hard blockers remain — {'; '.join(blocker_msgs)}")

    history_entry = {
        "action": f"status_change:{current}→{new}",
        "status": new,
        "by_user_id": user["user_id"],
        "by_name": user.get("name", ""),
        "by_role": role,
        "reason": body.reason,
        "notes": body.notes,
        "timestamp": now_iso(),
    }

    # Log Ven-Us posture at decision time for audit
    if venus_snapshot and new == "approved":
        history_entry["venus_posture_at_decision"] = {
            "readiness": venus_snapshot["readiness"],
            "blocker_count": venus_snapshot["summary"]["blocker_count"],
            "issue_count": venus_snapshot["summary"]["high_count"] + venus_snapshot["summary"]["medium_count"],
            "warning_count": venus_snapshot["summary"]["low_count"],
        }

    update_ops = {"status": new, "updated_at": now_iso()}

    # Snapshot last_approved_version when manager approves
    if new == "approved" and role in ("venue_manager", "admin"):
        from routes.publish import build_venue_snapshot
        update_ops["last_approved_version"] = build_venue_snapshot(doc)

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {
            "$set": update_ops,
            "$push": {"history": history_entry},
        }
    )

    return {"message": f"Status changed to '{new}'", "acquisition_id": acq_id}


@router.post("/{acq_id}/photos")
async def upload_photos(request: Request, acq_id: str, files: List[UploadFile] = File(...)):
    """Upload photos to an acquisition."""
    user = await get_current_user(request)
    db = get_db(request)

    doc = await db.venue_acquisitions.find_one({"acquisition_id": acq_id})
    if not doc:
        raise HTTPException(404, "Acquisition not found")

    acq_dir = os.path.join(UPLOAD_DIR, acq_id)
    os.makedirs(acq_dir, exist_ok=True)

    uploaded = []
    for f in files:
        ext = f.filename.split(".")[-1] if "." in f.filename else "jpg"
        fname = f"photo_{uuid.uuid4().hex[:8]}.{ext}"
        fpath = os.path.join(acq_dir, fname)
        content = await f.read()
        with open(fpath, "wb") as fp:
            fp.write(content)
        url = f"/api/acquisitions/{acq_id}/media/{fname}"
        uploaded.append({"filename": fname, "url": url, "uploaded_at": now_iso(), "uploaded_by": user.get("name", "")})

    await db.venue_acquisitions.update_one(
        {"acquisition_id": acq_id},
        {"$push": {"photos": {"$each": uploaded}}, "$set": {"updated_at": now_iso()}}
    )

    return {"uploaded": len(uploaded), "photos": uploaded}


@router.get("/{acq_id}/media/{filename}")
async def serve_media(request: Request, acq_id: str, filename: str):
    """Serve uploaded media file."""
    from fastapi.responses import FileResponse
    fpath = os.path.join(UPLOAD_DIR, acq_id, filename)
    if not os.path.exists(fpath):
        raise HTTPException(404, "File not found")
    return FileResponse(fpath)


# ── Transition rules ──

def _get_allowed_transitions(current: str, role: str) -> list:
    """Role-gated status transitions."""
    if role == "admin":
        # Admin can do anything
        return VALID_STATUSES

    rules = {
        "venue_specialist": {
            "draft": ["submitted_for_review"],
            "sent_back_to_specialist": ["submitted_for_review", "draft"],
        },
        "vam": {  # team lead
            "submitted_for_review": ["sent_back_to_specialist", "under_data_refinement", "rejected"],
        },
        "data_team": {
            "under_data_refinement": ["awaiting_manager_approval", "sent_back_to_specialist"],
        },
        "venue_manager": {
            "awaiting_manager_approval": ["approved", "under_data_refinement", "sent_back_to_specialist", "rejected"],
            "approved": ["owner_onboarding_pending"],
            "owner_onboarding_pending": ["owner_onboarding_sent"],
            "owner_onboarding_completed": ["publish_ready"],
            "publish_ready": ["published_live", "hidden_from_public"],
            "published_live": ["hidden_from_public", "unpublished"],
            "hidden_from_public": ["published_live", "unpublished"],
            "unpublished": ["publish_ready"],
        },
    }

    return rules.get(role, {}).get(current, [])
