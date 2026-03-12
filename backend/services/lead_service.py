"""
Lead service for VenuLoQ API.
Handles lead/client case business logic.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from config import db, LEAD_STAGES


async def assign_rm_round_robin(city: str) -> Tuple[Optional[str], Optional[str]]:
    """Assign RM using round-robin for a city. Returns (rm_id, rm_name)."""
    # Get all active RMs for the city
    rms = await db.users.find(
        {"role": "rm", "status": "active", "$or": [{"cities": city}, {"cities": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(100)
    
    if not rms:
        # Fallback: get any active RM
        rms = await db.users.find({"role": "rm", "status": "active"}, {"_id": 0}).to_list(100)
    
    if not rms:
        return None, None
    
    # Get last assigned RM for this city
    last_assignment = await db.rm_assignments.find_one(
        {"city": city},
        {"_id": 0},
        sort=[("assigned_at", -1)]
    )
    
    last_rm_index = -1
    if last_assignment:
        for i, rm in enumerate(rms):
            if rm["user_id"] == last_assignment.get("rm_id"):
                last_rm_index = i
                break
    
    # Assign next RM
    next_rm_index = (last_rm_index + 1) % len(rms)
    assigned_rm = rms[next_rm_index]
    
    # Record assignment
    await db.rm_assignments.insert_one({
        "city": city,
        "rm_id": assigned_rm["user_id"],
        "assigned_at": datetime.now(timezone.utc).isoformat()
    })
    
    return assigned_rm["user_id"], assigned_rm["name"]


def calculate_commission_age(confirmed_at: str) -> int:
    """Calculate days since commission was confirmed."""
    if not confirmed_at:
        return 0
    try:
        confirmed_date = datetime.fromisoformat(confirmed_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        return (now - confirmed_date).days
    except Exception:
        return 0


def calculate_commission(deal_value: float, commission_type: str, rate: float = None, flat_amount: float = None) -> float:
    """Calculate commission based on type."""
    if commission_type == "percentage" and rate:
        return deal_value * (rate / 100)
    elif commission_type == "flat" and flat_amount:
        return flat_amount
    return 0


async def validate_stage_transition(
    lead: dict, 
    new_stage: str, 
    update_data: dict = None, 
    user: dict = None
) -> Tuple[bool, str, List[str]]:
    """
    Validate if lead can transition to the new stage.
    Returns (is_valid, error_message, missing_requirements)
    """
    current_stage = lead.get("stage", "new")
    missing = []
    is_admin = user and user.get("role") == "admin"
    payment_status = lead.get("payment_status")
    
    # Merge lead with update_data for checking values that might be set in same request
    check_lead = {**lead, **(update_data or {})}
    lead_id = lead.get("lead_id")
    
    # PAYMENT-STATE PROTECTION RULE 3: If payment_released, stage is locked (except for admin)
    if payment_status == "payment_released" and not is_admin:
        return False, "Lead is locked (payment released). Only Admin can modify.", ["Payment has been released - lead stage is read-only"]
    
    # PAYMENT-STATE PROTECTION RULE 1: If advance_paid and at booking_confirmed, cannot move backwards (except admin)
    if payment_status == "advance_paid" and current_stage == "booking_confirmed":
        stage_order = ["new", "contacted", "requirement_understood", "shortlisted", "site_visit", "negotiation", "booking_confirmed"]
        try:
            current_idx = stage_order.index(current_stage)
            new_idx = stage_order.index(new_stage) if new_stage in stage_order else 0
            
            if new_idx < current_idx and new_stage not in ["lost", "closed_not_proceeding"]:
                if not is_admin:
                    return False, "Cannot revert stage after payment received. Admin override required.", [
                        "Advance payment has been received",
                        "Stage cannot be moved backwards",
                        "Contact Admin to revert stage"
                    ]
        except ValueError:
            pass
    
    # Allow moving to "lost" (with payment protection warning logged)
    stage_order = ["new", "contacted", "requirement_understood", "shortlisted", "site_visit", "negotiation", "booking_confirmed"]
    if new_stage == "lost" or new_stage == "closed_not_proceeding":
        return True, "", []
    
    # Check if moving backwards (always allowed)
    try:
        current_idx = stage_order.index(current_stage) if current_stage in stage_order else 0
        new_idx = stage_order.index(new_stage) if new_stage in stage_order else 0
        if new_idx <= current_idx:
            return True, "", []
    except ValueError:
        pass
    
    # Fetch shortlist from database
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    shortlist_count = len(shortlist) if shortlist else (lead.get("shortlist_count") or 0)
    
    # RULE 1: Cannot move to "site_visit" unless requirements met
    if new_stage == "site_visit":
        requirement_summary = check_lead.get("requirement_summary") or check_lead.get("additional_requirements")
        if not requirement_summary or len(str(requirement_summary).strip()) < 10:
            missing.append("Requirement summary must be filled (minimum 10 characters)")
        
        if shortlist_count < 1:
            missing.append("At least 1 venue must be shortlisted")
    
    # RULE 2: Cannot move to "negotiation" unless venue availability confirmed
    if new_stage == "negotiation":
        requirement_summary = check_lead.get("requirement_summary") or check_lead.get("additional_requirements")
        if not requirement_summary or len(str(requirement_summary).strip()) < 10:
            missing.append("Requirement summary must be filled")
        
        if shortlist_count < 1:
            missing.append("At least 1 venue must be shortlisted")
        
        availability_confirmed = check_lead.get("venue_availability_confirmed", False)
        has_active_hold = await db.date_holds.count_documents({
            "lead_id": lead_id,
            "status": "active"
        }) > 0
        
        if not availability_confirmed and not has_active_hold:
            missing.append("Venue availability must be confirmed (place a date hold or mark availability confirmed)")
    
    # RULE 3: Cannot move to "booking_confirmed" - full validation
    if new_stage == "booking_confirmed":
        if not check_lead.get("deal_value"):
            missing.append("Deal value is required")
        
        has_venue_commission = check_lead.get("venue_commission_rate") or check_lead.get("venue_commission_flat")
        has_planner_commission = check_lead.get("planner_commission_rate") or check_lead.get("planner_commission_flat")
        if not has_venue_commission and not has_planner_commission:
            missing.append("At least one commission (venue or planner) must be set")
        
        payment_status = check_lead.get("payment_status")
        payment_details = check_lead.get("payment_details") or {}
        if not payment_status or payment_status not in ["awaiting_advance", "advance_paid", "payment_released"]:
            if not payment_details.get("payment_link"):
                missing.append("Advance payment link must be generated")
        
        venue_date_blocked = check_lead.get("venue_date_blocked", False)
        shortlist_blocked = any(item.get("date_blocked") or item.get("status") == "confirmed" for item in shortlist)
        
        if not venue_date_blocked and not shortlist_blocked:
            missing.append("Venue date must be marked as blocked/confirmed")
    
    if missing:
        return False, f"Cannot move to '{new_stage.replace('_', ' ').title()}'. Missing requirements:", missing
    
    return True, "", []


async def get_lead_with_enriched_data(lead_id: str) -> Optional[Dict]:
    """Get lead with all related data (shortlist, RM, venues, commission age)."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        return None
    
    # Get RM info
    if lead.get("rm_id"):
        rm = await db.users.find_one({"user_id": lead["rm_id"]}, {"_id": 0, "password_hash": 0})
        if rm:
            lead["rm"] = rm
    
    # Get shortlist with venue details
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    for item in shortlist:
        venue = await db.venues.find_one({"venue_id": item["venue_id"]}, {"_id": 0})
        item["venue"] = venue
    lead["shortlist"] = shortlist
    lead["shortlist_count"] = len(shortlist)
    
    # Get initial venues
    venues = []
    for venue_id in lead.get("venue_ids", []):
        venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
        if venue:
            venues.append(venue)
    lead["initial_venues"] = venues
    
    # Calculate commission age
    lead["venue_commission_age_days"] = calculate_commission_age(lead.get("venue_commission_confirmed_at"))
    lead["planner_commission_age_days"] = calculate_commission_age(lead.get("planner_commission_confirmed_at"))
    
    return lead


async def get_stage_requirements(lead: dict, user: dict) -> Dict:
    """Get stage transition requirements for a lead."""
    lead_id = lead.get("lead_id")
    stages_to_check = ["site_visit", "negotiation", "booking_confirmed"]
    requirements = {}
    
    for target_stage in stages_to_check:
        is_valid, error_msg, missing = await validate_stage_transition(lead, target_stage, None, user)
        requirements[target_stage] = {
            "can_transition": is_valid,
            "missing_requirements": missing,
            "error_message": error_msg if not is_valid else None
        }
    
    # Current lead status summary for frontend
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    shortlist_count = len(shortlist) if shortlist else (lead.get("shortlist_count") or 0)
    has_hold = await db.date_holds.count_documents({"lead_id": lead_id, "status": "active"}) > 0
    
    # Payment protection status
    payment_status = lead.get("payment_status")
    is_admin = user.get("role") == "admin"
    
    payment_protection = {
        "is_locked": payment_status == "payment_released" and not is_admin,
        "is_stage_protected": payment_status == "advance_paid" and lead.get("stage") == "booking_confirmed",
        "can_block_venue_date": payment_status in ["advance_paid", "payment_released"],
        "payment_status": payment_status,
        "lock_reason": None
    }
    
    if payment_protection["is_locked"]:
        payment_protection["lock_reason"] = "Payment has been released to venue. Only Admin can modify this lead."
    elif payment_protection["is_stage_protected"] and not is_admin:
        payment_protection["lock_reason"] = "Advance payment received. Stage cannot be reverted without Admin approval."
    
    return {
        "lead_id": lead_id,
        "current_stage": lead.get("stage"),
        "stage_requirements": requirements,
        "payment_protection": payment_protection,
        "current_status": {
            "has_requirement_summary": bool(lead.get("requirement_summary") or lead.get("additional_requirements")),
            "shortlist_count": shortlist_count,
            "has_active_hold": has_hold,
            "venue_availability_confirmed": lead.get("venue_availability_confirmed", False),
            "has_deal_value": bool(lead.get("deal_value")),
            "has_commission": bool(lead.get("venue_commission_rate") or lead.get("venue_commission_flat") or lead.get("planner_commission_rate") or lead.get("planner_commission_flat")),
            "has_payment_link": payment_status in ["awaiting_advance", "advance_paid", "payment_released"],
            "venue_date_blocked": lead.get("venue_date_blocked", False),
            "advance_paid": payment_status in ["advance_paid", "payment_released"]
        }
    }


async def get_lead_activity(lead_id: str) -> List[Dict]:
    """Get activity/audit log for a lead."""
    activities = await db.audit_logs.find(
        {"entity_id": lead_id, "entity_type": "lead"},
        {"_id": 0}
    ).sort("performed_at", -1).limit(50).to_list(50)
    return activities


async def get_commission_summary(lead: dict) -> Dict:
    """Get commission summary for a lead."""
    deal_value = lead.get("deal_value") or 0
    
    # Calculate venue commission
    venue_commission = 0
    if lead.get("venue_commission_type") == "percentage" and lead.get("venue_commission_rate"):
        venue_commission = deal_value * (lead["venue_commission_rate"] / 100)
    elif lead.get("venue_commission_type") == "flat" and lead.get("venue_commission_flat"):
        venue_commission = lead["venue_commission_flat"]
    
    # Calculate planner commission
    planner_commission = 0
    if lead.get("planner_commission_type") == "percentage" and lead.get("planner_commission_rate"):
        planner_commission = deal_value * (lead["planner_commission_rate"] / 100)
    elif lead.get("planner_commission_type") == "flat" and lead.get("planner_commission_flat"):
        planner_commission = lead["planner_commission_flat"]
    
    total_commission = venue_commission + planner_commission
    
    return {
        "lead_id": lead.get("lead_id"),
        "deal_value": deal_value,
        "venue_commission": {
            "type": lead.get("venue_commission_type"),
            "rate": lead.get("venue_commission_rate"),
            "flat": lead.get("venue_commission_flat"),
            "amount": venue_commission,
            "status": lead.get("venue_commission_status"),
            "confirmed_at": lead.get("venue_commission_confirmed_at"),
            "age_days": calculate_commission_age(lead.get("venue_commission_confirmed_at"))
        },
        "planner_commission": {
            "type": lead.get("planner_commission_type"),
            "rate": lead.get("planner_commission_rate"),
            "flat": lead.get("planner_commission_flat"),
            "amount": planner_commission,
            "status": lead.get("planner_commission_status"),
            "confirmed_at": lead.get("planner_commission_confirmed_at"),
            "age_days": calculate_commission_age(lead.get("planner_commission_confirmed_at"))
        },
        "total_commission": total_commission,
        "payment_status": lead.get("payment_status"),
        "event_completed": lead.get("event_completed", False)
    }
