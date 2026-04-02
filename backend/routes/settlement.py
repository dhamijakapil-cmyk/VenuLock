"""
VenuLoQ — Financial Closure Handoff + Settlement Governance (Phase 13)
Operates on: leads (settlement field)
Extends from closure_ready → financial_closure_completed
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from config import db
from utils import generate_id, get_current_user, require_role, create_audit_log

router = APIRouter(prefix="/settlement", tags=["settlement"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Constants ─────────────────────────────────────────────────────────────────

SETTLEMENT_STATUSES = [
    "closure_ready", "settlement_pending", "collection_verification_pending",
    "payable_commitments_pending", "settlement_under_review", "settlement_ready",
    "settlement_blocked", "financial_closure_completed",
]

COLLECTION_STATUSES = ["pending", "partial", "received", "verification_pending", "verified"]

PAYABLE_COMPLETENESS = ["complete", "partial", "missing_data"]

PAYOUT_READINESS = [
    "payout_ready", "payout_not_ready", "payout_readiness_unclear",
    "payout_blocked_by_dispute_or_hold", "payout_readiness_pending_verification",
]

FINANCIAL_CLOSURE_CHECKS = [
    {"id": "event_closure_complete", "label": "Event closure readiness complete"},
    {"id": "collection_verified", "label": "Collection verified or formally recorded"},
    {"id": "payable_commitments_captured", "label": "Payable commitments captured"},
    {"id": "blockers_resolved", "label": "Blockers resolved or logged"},
    {"id": "settlement_note_complete", "label": "Settlement note complete"},
]


# ── Models ────────────────────────────────────────────────────────────────────

class SettlementHandoffCreate(BaseModel):
    settlement_note: Optional[str] = None

class SettlementStatusUpdate(BaseModel):
    status: str
    waiting_reason: Optional[str] = None
    escalation_note: Optional[str] = None

class SettlementAssign(BaseModel):
    owner_id: str
    owner_name: str

class CollectionUpdate(BaseModel):
    expected_amount: Optional[float] = None
    received_amount: Optional[float] = None
    status: Optional[str] = None
    verification_note: Optional[str] = None
    blocker: Optional[str] = None

class PayablesUpdate(BaseModel):
    venue_payable: Optional[float] = None
    vendor_payable: Optional[float] = None
    completeness: Optional[str] = None
    dispute_hold: Optional[bool] = None
    dispute_note: Optional[str] = None
    missing_data_warning: Optional[str] = None

class PayoutReadinessUpdate(BaseModel):
    posture: str

class FinancialClosureUpdate(BaseModel):
    event_closure_complete: Optional[bool] = None
    collection_verified: Optional[bool] = None
    payable_commitments_captured: Optional[bool] = None
    blockers_resolved: Optional[bool] = None
    settlement_note_complete: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _default_settlement():
    return {
        "settlement_status": "closure_ready",
        "owner_id": None, "owner_name": None, "assigned_at": None,
        "waiting_reason": None, "escalation_note": None,
        "collection": {
            "expected_amount": None, "received_amount": None,
            "status": "pending", "verification_note": None, "blocker": None,
        },
        "payables": {
            "venue_payable": None, "vendor_payable": None,
            "completeness": "missing_data", "dispute_hold": False,
            "dispute_note": None, "missing_data_warnings": [],
        },
        "payout_readiness": "payout_not_ready",
        "settlement_note": None,
        "financial_closure": {
            "event_closure_complete": False, "collection_verified": False,
            "payable_commitments_captured": False, "blockers_resolved": False,
            "settlement_note_complete": False,
        },
        "closed_at": None, "closed_by": None,
    }


async def _get_lead(lead_id: str, user: dict):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Case not found")
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(403, "Not your case")
    return lead


# ── Settlement Handoff ────────────────────────────────────────────────────────

@router.post("/{lead_id}/handoff")
async def create_settlement_handoff(lead_id: str, body: SettlementHandoffCreate, request: Request,
                                     user: dict = Depends(require_role("rm", "admin"))):
    """Generate a settlement handoff package from a closure_ready event."""
    lead = await _get_lead(lead_id, user)
    execution = lead.get("execution") or {}
    exec_status = execution.get("execution_status", "")

    if exec_status != "closure_ready" and user.get("role") != "admin":
        raise HTTPException(400, f"Settlement handoff requires closure_ready status (current: {exec_status})")

    if lead.get("settlement", {}).get("settlement_status") not in (None, "closure_ready"):
        raise HTTPException(400, "Settlement already initiated")

    snapshot = lead.get("booking_snapshot") or {}
    closure = lead.get("closure") or {}
    event_day = lead.get("event_day") or {}
    booking_readiness = lead.get("booking_readiness") or {}

    # Gather addenda
    addenda = await db.commitment_addenda.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)

    # Gather incidents with closure impact
    incidents = await db.event_incidents.find(
        {"lead_id": lead_id, "severity": {"$in": ["high", "critical"]}}, {"_id": 0}
    ).to_list(20)

    # Compute final commercial position
    base_amount = snapshot.get("final_amount")
    addenda_adjustments = []
    for a in addenda:
        if a.get("change_type") == "commercial_change":
            addenda_adjustments.append({
                "version": a.get("version"),
                "field": a.get("field_changed"),
                "from": a.get("original_value"),
                "to": a.get("new_value"),
                "reason": a.get("reason"),
            })

    now = now_iso()
    settlement = _default_settlement()
    settlement["settlement_status"] = "settlement_pending"
    settlement["settlement_note"] = body.settlement_note

    # Auto-check event_closure_complete
    settlement["financial_closure"]["event_closure_complete"] = True

    # Build handoff summary (stored for reference, not editable)
    settlement["handoff_summary"] = {
        "generated_at": now,
        "generated_by": user.get("name", ""),
        "booking_snapshot_venue": snapshot.get("venue_name"),
        "booking_snapshot_amount": base_amount,
        "booking_snapshot_per_plate": snapshot.get("amount_per_plate"),
        "event_date": snapshot.get("event_date"),
        "event_type": snapshot.get("event_type"),
        "guest_count": snapshot.get("guest_count"),
        "addenda_count": len(addenda),
        "commercial_adjustments": addenda_adjustments,
        "completion_note": event_day.get("completion_note"),
        "major_issue": event_day.get("major_issue", False),
        "closure_note": closure.get("closure_note"),
        "major_incidents_count": len(incidents),
        "payment_deposit_recorded": booking_readiness.get("payment_milestone_recorded", False),
    }

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {
        "settlement": settlement, "updated_at": now,
    }})

    await create_audit_log("lead", lead_id, "settlement_handoff_created", user, {
        "base_amount": base_amount, "addenda_count": len(addenda),
    }, request)

    return {"message": "Settlement handoff created", "settlement_status": "settlement_pending"}


# ── Get Settlement ────────────────────────────────────────────────────────────

@router.get("/{lead_id}")
async def get_settlement(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get full settlement data."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    snapshot = lead.get("booking_snapshot") or {}

    return {
        "lead_id": lead_id,
        "customer_name": lead.get("customer_name"),
        "customer_phone": lead.get("customer_phone"),
        "event_type": lead.get("event_type"),
        "event_date": lead.get("event_date"),
        "city": lead.get("city"),
        "venue_name": snapshot.get("venue_name"),
        "final_amount": snapshot.get("final_amount"),
        "rm_name": lead.get("rm_name"),
        "confirmed_at": lead.get("confirmed_at"),
        "settlement": settlement,
    }


# ── Status ────────────────────────────────────────────────────────────────────

@router.post("/{lead_id}/status")
async def update_settlement_status(lead_id: str, body: SettlementStatusUpdate, request: Request,
                                    user: dict = Depends(require_role("rm", "admin"))):
    """Update settlement status."""
    if body.status not in SETTLEMENT_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {SETTLEMENT_STATUSES}")

    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    old = settlement.get("settlement_status", "closure_ready")
    now = now_iso()

    settlement["settlement_status"] = body.status
    if body.waiting_reason is not None:
        settlement["waiting_reason"] = body.waiting_reason
    if body.escalation_note is not None:
        settlement["escalation_note"] = body.escalation_note

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "settlement_status_change", user, {
        "from": old, "to": body.status,
        "waiting_reason": body.waiting_reason, "escalation_note": body.escalation_note,
    }, request)

    return {"message": f"Settlement status: {old} → {body.status}"}


# ── Assignment ────────────────────────────────────────────────────────────────

@router.post("/{lead_id}/assign")
async def assign_settlement_owner(lead_id: str, body: SettlementAssign, request: Request,
                                   user: dict = Depends(require_role("rm", "admin"))):
    """Assign settlement owner."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    old_owner = settlement.get("owner_name")
    now = now_iso()

    settlement["owner_id"] = body.owner_id
    settlement["owner_name"] = body.owner_name
    settlement["assigned_at"] = now

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "settlement_owner_assigned", user, {
        "owner_id": body.owner_id, "owner_name": body.owner_name, "old_owner": old_owner,
    }, request)

    return {"message": f"Settlement owner: {body.owner_name}"}


# ── Collection Verification ───────────────────────────────────────────────────

@router.post("/{lead_id}/collection")
async def update_collection(lead_id: str, body: CollectionUpdate, request: Request,
                             user: dict = Depends(require_role("rm", "admin"))):
    """Update collection verification posture."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    collection = settlement.get("collection") or {}
    changes = {}

    if body.expected_amount is not None:
        collection["expected_amount"] = body.expected_amount
        changes["expected_amount"] = body.expected_amount
    if body.received_amount is not None:
        collection["received_amount"] = body.received_amount
        changes["received_amount"] = body.received_amount
    if body.status is not None:
        if body.status not in COLLECTION_STATUSES:
            raise HTTPException(400, f"Invalid status. Use: {COLLECTION_STATUSES}")
        collection["status"] = body.status
        changes["status"] = body.status
    if body.verification_note is not None:
        collection["verification_note"] = body.verification_note
        changes["verification_note"] = body.verification_note
    if body.blocker is not None:
        collection["blocker"] = body.blocker
        changes["blocker"] = body.blocker

    now = now_iso()
    settlement["collection"] = collection
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "collection_updated", user, {"changes": changes}, request)

    return {"message": "Collection updated", "collection": collection}


# ── Payable Commitments ───────────────────────────────────────────────────────

@router.post("/{lead_id}/payables")
async def update_payables(lead_id: str, body: PayablesUpdate, request: Request,
                           user: dict = Depends(require_role("rm", "admin"))):
    """Update payable commitment posture."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    payables = settlement.get("payables") or {}
    changes = {}

    if body.venue_payable is not None:
        payables["venue_payable"] = body.venue_payable
        changes["venue_payable"] = body.venue_payable
    if body.vendor_payable is not None:
        payables["vendor_payable"] = body.vendor_payable
        changes["vendor_payable"] = body.vendor_payable
    if body.completeness is not None:
        if body.completeness not in PAYABLE_COMPLETENESS:
            raise HTTPException(400, f"Invalid completeness. Use: {PAYABLE_COMPLETENESS}")
        payables["completeness"] = body.completeness
        changes["completeness"] = body.completeness
    if body.dispute_hold is not None:
        payables["dispute_hold"] = body.dispute_hold
        changes["dispute_hold"] = body.dispute_hold
    if body.dispute_note is not None:
        payables["dispute_note"] = body.dispute_note
        changes["dispute_note"] = body.dispute_note
    if body.missing_data_warning is not None:
        warnings = payables.get("missing_data_warnings") or []
        warnings.append({"warning": body.missing_data_warning, "logged_at": now_iso(), "by": user.get("name", "")})
        payables["missing_data_warnings"] = warnings
        changes["missing_data_warning"] = body.missing_data_warning

    now = now_iso()
    settlement["payables"] = payables
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "payables_updated", user, {"changes": changes}, request)

    return {"message": "Payables updated", "payables": payables}


# ── Payout Readiness ──────────────────────────────────────────────────────────

@router.post("/{lead_id}/payout-readiness")
async def update_payout_readiness(lead_id: str, body: PayoutReadinessUpdate, request: Request,
                                   user: dict = Depends(require_role("rm", "admin"))):
    """Update payout readiness advisory posture."""
    if body.posture not in PAYOUT_READINESS:
        raise HTTPException(400, f"Invalid posture. Use: {PAYOUT_READINESS}")

    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    old = settlement.get("payout_readiness", "payout_not_ready")
    now = now_iso()

    settlement["payout_readiness"] = body.posture
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "payout_readiness_changed", user, {
        "from": old, "to": body.posture,
    }, request)

    return {"message": f"Payout readiness: {old} → {body.posture}"}


# ── Financial Closure Gate ────────────────────────────────────────────────────

@router.get("/{lead_id}/financial-closure")
async def get_financial_closure(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get financial closure gate state."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    fc = settlement.get("financial_closure") or {}

    checks = []
    for c in FINANCIAL_CLOSURE_CHECKS:
        if c["id"] == "settlement_note_complete":
            passed = bool(settlement.get("settlement_note"))
        else:
            passed = bool(fc.get(c["id"]))
        checks.append({"id": c["id"], "label": c["label"], "passed": passed})

    passed_count = len([c for c in checks if c["passed"]])
    all_ready = passed_count == len(FINANCIAL_CLOSURE_CHECKS)

    return {
        "lead_id": lead_id,
        "settlement_status": settlement.get("settlement_status"),
        "checks": checks,
        "passed_count": passed_count,
        "total_count": len(FINANCIAL_CLOSURE_CHECKS),
        "all_ready": all_ready,
        "settlement_note": settlement.get("settlement_note"),
        "payout_readiness": settlement.get("payout_readiness"),
    }


@router.post("/{lead_id}/financial-closure")
async def update_financial_closure(lead_id: str, body: FinancialClosureUpdate, request: Request,
                                    user: dict = Depends(require_role("rm", "admin"))):
    """Update financial closure checks."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    fc = settlement.get("financial_closure") or {}
    changes = {}

    for field in ["event_closure_complete", "collection_verified", "payable_commitments_captured", "blockers_resolved"]:
        val = getattr(body, field, None)
        if val is not None:
            fc[field] = val
            changes[field] = val

    if body.settlement_note_complete is not None:
        fc["settlement_note_complete"] = body.settlement_note_complete
        changes["settlement_note_complete"] = body.settlement_note_complete

    now = now_iso()
    settlement["financial_closure"] = fc
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "financial_closure_updated", user, {"changes": changes}, request)

    return {"message": "Financial closure updated"}


@router.post("/{lead_id}/complete")
async def complete_financial_closure(lead_id: str, request: Request,
                                      user: dict = Depends(require_role("rm", "admin"))):
    """Complete financial closure — requires all 5 checks."""
    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    fc = settlement.get("financial_closure") or {}

    failing = []
    for c in FINANCIAL_CLOSURE_CHECKS:
        if c["id"] == "settlement_note_complete":
            if not settlement.get("settlement_note"):
                failing.append(c["id"])
        else:
            if not fc.get(c["id"]):
                failing.append(c["id"])

    if failing:
        raise HTTPException(400, f"Financial closure not ready: {', '.join(failing)}")

    now = now_iso()
    settlement["settlement_status"] = "financial_closure_completed"
    settlement["closed_at"] = now
    settlement["closed_by"] = user["user_id"]
    settlement["closed_by_name"] = user.get("name", "")

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "financial_closure_completed", user, {
        "closure_checks_passed": len(FINANCIAL_CLOSURE_CHECKS),
    }, request)

    return {"message": "Financial closure completed", "settlement_status": "financial_closure_completed"}


# ── Settlement Note ───────────────────────────────────────────────────────────

@router.post("/{lead_id}/note")
async def update_settlement_note(lead_id: str, request: Request,
                                  user: dict = Depends(require_role("rm", "admin"))):
    """Update settlement note."""
    body = await request.json()
    note = body.get("note")
    if not note:
        raise HTTPException(400, "Note is required")

    lead = await _get_lead(lead_id, user)
    settlement = lead.get("settlement") or _default_settlement()
    now = now_iso()
    settlement["settlement_note"] = note

    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"settlement": settlement, "updated_at": now}})

    await create_audit_log("lead", lead_id, "settlement_note_updated", user, {"note": note[:100]}, request)

    return {"message": "Settlement note updated"}


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def settlement_dashboard(user: dict = Depends(require_role("rm", "admin"))):
    """Settlement dashboard: events with settlement data."""
    # Find leads that are closure_ready or have settlement data
    query = {"$or": [
        {"execution.execution_status": "closure_ready"},
        {"settlement.settlement_status": {"$exists": True}},
    ]}
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]

    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)

    items = []
    for lead in leads:
        settlement = lead.get("settlement") or {}
        snapshot = lead.get("booking_snapshot") or {}
        status = settlement.get("settlement_status", "closure_ready")
        collection = settlement.get("collection") or {}
        payables = settlement.get("payables") or {}

        items.append({
            "lead_id": lead["lead_id"],
            "customer_name": lead.get("customer_name"),
            "event_type": lead.get("event_type"),
            "event_date": lead.get("event_date"),
            "city": lead.get("city"),
            "venue_name": snapshot.get("venue_name"),
            "final_amount": snapshot.get("final_amount"),
            "rm_name": lead.get("rm_name"),
            "settlement_status": status,
            "settlement_owner": settlement.get("owner_name"),
            "collection_status": collection.get("status", "pending"),
            "collection_expected": collection.get("expected_amount"),
            "collection_received": collection.get("received_amount"),
            "collection_blocker": collection.get("blocker"),
            "payable_completeness": payables.get("completeness", "missing_data"),
            "dispute_hold": payables.get("dispute_hold", False),
            "payout_readiness": settlement.get("payout_readiness", "payout_not_ready"),
            "waiting_reason": settlement.get("waiting_reason"),
            "escalation_note": settlement.get("escalation_note"),
        })

    # Sort: blocked first, then pending, then by status
    status_order = {s: i for i, s in enumerate(SETTLEMENT_STATUSES)}
    items.sort(key=lambda x: (
        0 if x["settlement_status"] == "settlement_blocked" else 1,
        0 if x.get("dispute_hold") else 1,
        0 if x.get("collection_blocker") else 1,
        status_order.get(x["settlement_status"], 99),
    ))

    summary = {
        "total": len(items),
        "closure_ready": len([i for i in items if i["settlement_status"] == "closure_ready"]),
        "settlement_pending": len([i for i in items if i["settlement_status"] == "settlement_pending"]),
        "under_review": len([i for i in items if i["settlement_status"] == "settlement_under_review"]),
        "settlement_ready": len([i for i in items if i["settlement_status"] == "settlement_ready"]),
        "blocked": len([i for i in items if i["settlement_status"] == "settlement_blocked"]),
        "completed": len([i for i in items if i["settlement_status"] == "financial_closure_completed"]),
        "disputes": len([i for i in items if i.get("dispute_hold")]),
    }

    return {"items": items, "summary": summary}
