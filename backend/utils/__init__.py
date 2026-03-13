"""
Utility functions and helpers for VenuLoQ API.
"""
import uuid
import math
import bcrypt
import jwt
import asyncio
import logging
import resend
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends

from config import (
    db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, 
    SENDER_EMAIL, LEAD_STAGES
)

logger = logging.getLogger(__name__)


# ============== ID GENERATION ==============

def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


# ============== PASSWORD HASHING ==============

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        return False


# ============== JWT TOKEN MANAGEMENT ==============

def create_token(user_id: str, role: str, hours: int = None) -> str:
    """Create a JWT token for a user."""
    exp_hours = hours if hours is not None else JWT_EXPIRATION_HOURS
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=exp_hours),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== AUTH DEPENDENCIES ==============

async def get_current_user(request: Request) -> dict:
    """Get the current authenticated user from request."""
    # Check cookie first
    token = request.cookies.get('session_token')
    
    # Then check Authorization header
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (from Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Otherwise decode JWT
    payload = decode_token(token)
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(request: Request) -> Optional[dict]:
    """Get the current user if authenticated, None otherwise."""
    try:
        return await get_current_user(request)
    except Exception:
        return None

def require_role(*roles):
    """Dependency that requires user to have one of the specified roles."""
    async def dependency(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency


# ============== GEOGRAPHY FUNCTIONS ==============

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers."""
    R = 6371  # Earth's radius in km
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


# ============== FORMATTING FUNCTIONS ==============

def format_indian_currency(amount: float) -> str:
    """Format number in Indian numbering system."""
    if amount < 1000:
        return f"₹ {int(amount)}"
    elif amount < 100000:
        return f"₹ {amount/1000:.1f}K"
    elif amount < 10000000:
        return f"₹ {amount/100000:.1f}L"
    else:
        return f"₹ {amount/10000000:.1f}Cr"


# ============== EMAIL FUNCTIONS ==============

async def send_email_async(to: str, subject: str, html: str):
    """Send email using Resend (non-blocking)."""
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email")
        return
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")


# ============== NOTIFICATION FUNCTIONS ==============

async def create_notification(user_id: str, title: str, message: str, notif_type: str, data: dict = None):
    """Create in-app notification."""
    notification = {
        "notification_id": generate_id("notif_"),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "read": False,
        "data": data or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)


# ============== RM ASSIGNMENT ==============

async def assign_rm_round_robin(city: str) -> Optional[str]:
    """Assign RM using round-robin for a city."""
    # Get all active RMs for the city
    rms = await db.users.find(
        {"role": "rm", "status": "active", "$or": [{"cities": city}, {"cities": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(100)
    
    if not rms:
        # Fallback: get any active RM
        rms = await db.users.find({"role": "rm", "status": "active"}, {"_id": 0}).to_list(100)
    
    if not rms:
        return None
    
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
    
    return assigned_rm["user_id"]


# ============== AUDIT LOGGING ==============

async def create_audit_log(
    entity_type: str,
    entity_id: str,
    action: str,
    user: dict,
    changes: dict = None,
    request: Request = None
):
    """Create an audit log entry for tracking all actions."""
    log_entry = {
        "log_id": generate_id("log_"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "changes": changes or {},
        "performed_by": user["user_id"],
        "performed_by_name": user["name"],
        "performed_by_role": user["role"],
        "performed_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": request.client.host if request else None
    }
    await db.audit_logs.insert_one(log_entry)
    return log_entry


# ============== COMMISSION CALCULATIONS ==============

def calculate_commission(deal_value: float, commission_type: str, rate: float = None, flat_amount: float = None) -> float:
    """Calculate commission based on type."""
    if commission_type == "percentage" and rate:
        return deal_value * (rate / 100)
    elif commission_type == "flat" and flat_amount:
        return flat_amount
    return 0

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

def get_commission_status_for_deal_value(current_status: str, has_deal_value: bool) -> str:
    """Determine commission status when deal value is set."""
    if not has_deal_value:
        return current_status
    if not current_status or current_status == "pending":
        return "projected"
    return current_status

def get_commission_status_for_booking_confirmed(current_status: str) -> str:
    """Move commission to confirmed status when booking is confirmed."""
    if current_status in [None, "", "pending", "projected"]:
        return "confirmed"
    return current_status


# ============== STAGE VALIDATION ==============

def can_release_contact(stage: str) -> bool:
    """Check if customer contact can be released to venue/planner based on stage."""
    release_stages = ["site_visit", "negotiation", "booking_confirmed"]
    return stage in release_stages

def validate_booking_confirmation(lead: dict) -> tuple[bool, str]:
    """Validate if lead can be marked as booking_confirmed."""
    if not lead.get("deal_value"):
        return False, "Deal value is required to confirm booking"
    
    has_venue_commission = (
        lead.get("venue_commission_rate") or 
        lead.get("venue_commission_flat")
    )
    has_planner_commission = (
        lead.get("planner_commission_rate") or 
        lead.get("planner_commission_flat")
    )
    
    if not has_venue_commission and not has_planner_commission:
        return False, "At least one commission (venue or planner) must be set"
    
    return True, ""

async def validate_stage_transition_async(lead: dict, new_stage: str, db_ref, update_data: dict = None, user: dict = None) -> tuple[bool, str, list]:
    """
    Validate if lead can transition to the new stage (async version).
    Returns (is_valid, error_message, missing_requirements)
    """
    current_stage = lead.get("stage", "new")
    missing = []
    is_admin = user and user.get("role") == "admin"
    payment_status = lead.get("payment_status")
    
    # Merge lead with update_data for checking values that might be set in same request
    check_lead = {**lead, **(update_data or {})}
    
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
    lead_id = lead.get("lead_id")
    shortlist = await db_ref.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
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
        has_active_hold = await db_ref.date_holds.count_documents({
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

def validate_stage_transition(lead: dict, new_stage: str) -> tuple[bool, str, list]:
    """Synchronous stub for compatibility - actual validation happens in async version."""
    return True, "", []

def validate_event_completion(lead: dict) -> tuple[bool, str]:
    """Validate if event can be marked as completed."""
    if lead.get("stage") != "booking_confirmed":
        return False, "Only confirmed bookings can be marked as completed"
    if not lead.get("event_date"):
        return False, "Event date is required"
    try:
        event_date = datetime.fromisoformat(lead["event_date"].replace('Z', '+00:00'))
        if event_date.date() > datetime.now(timezone.utc).date():
            return False, "Event date has not passed yet"
    except Exception:
        pass
    return True, ""
