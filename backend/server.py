from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import math
import asyncio
import httpx
import jwt
import bcrypt
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'bookmyvenue-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 168  # 7 days

# Create the main app
app = FastAPI(title="BookMyVenue API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import modular routes (migrated from this file)
from routes.auth import router as auth_router
from routes.venues import router as venues_router
from routes.availability import router as availability_router
from routes.comparison_sheets import router as comparison_sheets_router
from routes.leads import router as leads_router
from routes.admin import router as admin_router

# Include modular routers
api_router.include_router(auth_router)
api_router.include_router(venues_router)
api_router.include_router(availability_router)
api_router.include_router(comparison_sheets_router)
api_router.include_router(leads_router)
api_router.include_router(admin_router)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== PYDANTIC MODELS ==============

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: str = "customer"  # customer, rm, venue_owner, event_planner, admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    picture: Optional[str] = None
    status: str = "active"
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

# Venue Models
class VenuePricing(BaseModel):
    price_per_plate_veg: Optional[float] = None
    price_per_plate_nonveg: Optional[float] = None
    min_spend: Optional[float] = None
    packages: Optional[List[Dict[str, Any]]] = []

class VenueAmenities(BaseModel):
    parking: bool = False
    valet: bool = False
    alcohol_allowed: bool = False
    rooms_available: int = 0
    ac: bool = False
    catering_inhouse: bool = False
    catering_outside_allowed: bool = False
    decor_inhouse: bool = False
    sound_system: bool = False
    dj_allowed: bool = False
    wifi: bool = False
    generator_backup: bool = False

class VenueCreate(BaseModel):
    name: str
    description: Optional[str] = None
    city: str
    area: str
    address: str
    pincode: str
    latitude: float
    longitude: float
    event_types: List[str] = []  # wedding, corporate, birthday, etc.
    venue_type: str = "banquet_hall"  # banquet_hall, hotel, farmhouse, resort, etc.
    indoor_outdoor: str = "indoor"  # indoor, outdoor, both
    capacity_min: int = 50
    capacity_max: int = 500
    pricing: VenuePricing
    amenities: VenueAmenities
    images: List[str] = []
    policies: Optional[str] = None

class VenueResponse(BaseModel):
    venue_id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    city: str
    area: str
    address: str
    pincode: str
    latitude: float
    longitude: float
    event_types: List[str]
    venue_type: str
    indoor_outdoor: str
    capacity_min: int
    capacity_max: int
    pricing: VenuePricing
    amenities: VenueAmenities
    images: List[str]
    policies: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime
    distance: Optional[float] = None  # For search results

class VenueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_types: Optional[List[str]] = None
    venue_type: Optional[str] = None
    indoor_outdoor: Optional[str] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    pricing: Optional[VenuePricing] = None
    amenities: Optional[VenueAmenities] = None
    images: Optional[List[str]] = None
    policies: Optional[str] = None
    status: Optional[str] = None

# ============== MANAGED CONCIERGE PLATFORM MODELS ==============

# Lead Pipeline Stages
LEAD_STAGES = [
    "new",
    "contacted",
    "requirement_understood",
    "shortlisted",
    "site_visit",
    "negotiation",
    "booking_confirmed",
    "lost"
]

# Commission Status Lifecycle
# projected -> confirmed -> earned -> collected
COMMISSION_STATUSES = [
    "projected",   # When deal value entered
    "confirmed",   # When booking confirmed
    "earned",      # After event marked completed
    "collected"    # When payment received
]

# ============== PAYMENT MEDIATION SYSTEM ==============

# Payment Status Lifecycle
PAYMENT_STATUSES = [
    "pending",              # Initial state
    "awaiting_advance",     # Payment link generated, waiting for customer
    "advance_paid",         # Customer has paid advance
    "payment_released",     # Admin released payment to venue
    "payment_failed",       # Payment attempt failed
    "refunded"              # Payment was refunded
]

# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_demo')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'demo_secret')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', 'webhook_secret')

# Default BMV Commission Rate (fallback when venue doesn't have negotiated rate)
DEFAULT_COMMISSION_RATE = float(os.environ.get('DEFAULT_COMMISSION_RATE', '10'))

# Advance Payment Guardrails
DEFAULT_MIN_ADVANCE_PERCENT = float(os.environ.get('DEFAULT_MIN_ADVANCE_PERCENT', '10'))
MAX_ADVANCE_PERCENT_CAP = float(os.environ.get('MAX_ADVANCE_PERCENT_CAP', '50'))

# Payment Models
class PaymentCreate(BaseModel):
    lead_id: str
    amount: float  # Advance amount in INR
    description: Optional[str] = None

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentRelease(BaseModel):
    payment_id: str
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    payment_id: str
    lead_id: str
    order_id: str
    amount: float
    currency: str = "INR"
    status: str
    payment_link: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    deal_value: float
    advance_paid: float
    commission_amount: float
    net_amount_to_vendor: float
    created_at: str
    paid_at: Optional[str] = None
    released_at: Optional[str] = None

# Venue Commission Settings (Admin-only configurable per venue)
class VenueCommissionSettings(BaseModel):
    negotiated_commission_percent: Optional[float] = None  # Private negotiated rate per venue
    minimum_platform_fee: Optional[float] = None  # Minimum fee in INR (floor)
    min_advance_percent: Optional[float] = None  # Minimum advance % for this venue
    max_advance_percent: Optional[float] = None  # Maximum advance % for this venue

# ============== VENUE AVAILABILITY CALENDAR ==============

# Availability Status
AVAILABILITY_STATUSES = [
    "available",     # Open for booking
    "tentative",     # Held but not confirmed
    "blocked",       # Not available
    "booked"         # Confirmed booking
]

class AvailabilityEntry(BaseModel):
    date: str  # YYYY-MM-DD format
    status: str = "available"  # available, tentative, blocked, booked
    time_slot: Optional[str] = None  # morning, afternoon, evening, full_day (optional)
    notes: Optional[str] = None
    
class AvailabilityBulkUpdate(BaseModel):
    dates: List[str]  # List of dates in YYYY-MM-DD format
    status: str
    time_slot: Optional[str] = None
    notes: Optional[str] = None

class DateHoldRequest(BaseModel):
    venue_id: str
    date: str  # YYYY-MM-DD
    lead_id: str
    time_slot: Optional[str] = "full_day"
    expiry_hours: int = 24  # Default 24 hour hold

class DateHoldResponse(BaseModel):
    hold_id: str
    venue_id: str
    date: str
    lead_id: str
    status: str
    expires_at: str
    created_by: str

class DateHoldExtendRequest(BaseModel):
    extension_hours: int = 24  # Default 24 hour extension

# Commission Models
class CommissionDetails(BaseModel):
    commission_type: str = "percentage"  # percentage or flat
    commission_rate: Optional[float] = None  # percentage rate (e.g., 10 for 10%)
    commission_flat_amount: Optional[float] = None  # flat amount if type is flat
    commission_amount_calculated: Optional[float] = None  # auto-calculated amount
    commission_status: str = "projected"  # projected, confirmed, earned, collected

# Lead Models (Enhanced for Managed Platform)
class LeadCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    event_type: str
    event_date: Optional[str] = None
    guest_count: Optional[int] = None
    budget: Optional[float] = None
    preferences: Optional[str] = None
    venue_ids: List[str] = []
    city: str
    area: Optional[str] = None
    planner_required: bool = False  # Event planning assistance flag

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    rm_id: Optional[str] = None
    requirement_summary: Optional[str] = None
    event_date: Optional[str] = None  # Event date field
    # Deal tracking
    deal_value: Optional[float] = None
    # Venue commission
    venue_commission_type: Optional[str] = None  # percentage, flat
    venue_commission_rate: Optional[float] = None
    venue_commission_flat: Optional[float] = None
    venue_commission_status: Optional[str] = None  # projected, confirmed, earned, collected
    # Planner assignment (RM assigns after venue booking confirmed)
    assigned_planner_id: Optional[str] = None
    # Planner commission
    planner_commission_type: Optional[str] = None
    planner_commission_rate: Optional[float] = None
    planner_commission_flat: Optional[float] = None
    planner_commission_status: Optional[str] = None  # projected, confirmed, earned, collected
    # Contact visibility
    contact_released: Optional[bool] = None
    # Stage validation fields
    venue_availability_confirmed: Optional[bool] = None
    venue_date_blocked: Optional[bool] = None

class LeadNote(BaseModel):
    content: str
    note_type: str = "general"  # general, negotiation, requirement, internal

class LeadFollowUp(BaseModel):
    scheduled_at: str
    description: str
    follow_up_type: str = "call"  # call, email, meeting, site_visit

# Communication Log
class CommunicationLogCreate(BaseModel):
    channel: str  # call, email, whatsapp, in_person
    direction: str  # inbound, outbound
    summary: str
    duration_minutes: Optional[int] = None
    attachments: List[str] = []

# Venue Shortlist
class VenueShortlistCreate(BaseModel):
    venue_id: str
    notes: Optional[str] = None
    proposed_price: Optional[float] = None
    status: str = "proposed"  # proposed, customer_approved, rejected

# Quote Models
class QuoteCreate(BaseModel):
    quote_type: str  # venue, planner
    entity_id: str  # venue_id or planner_id
    amount: float
    description: Optional[str] = None
    valid_until: Optional[str] = None
    pdf_url: Optional[str] = None
    items: List[Dict[str, Any]] = []

# Planner Match
class PlannerMatchCreate(BaseModel):
    planner_id: str
    notes: Optional[str] = None
    budget_segment: Optional[str] = None  # budget, premium, luxury
    status: str = "suggested"  # suggested, customer_approved, assigned, rejected

# Audit Log (for tracking all actions)
class AuditLogEntry(BaseModel):
    entity_type: str  # lead, venue, quote, etc.
    entity_id: str
    action: str  # created, updated, stage_changed, etc.
    changes: Dict[str, Any] = {}
    performed_by: str
    performed_by_name: str
    performed_at: str
    ip_address: Optional[str] = None

# City/Area Models
class AreaModel(BaseModel):
    area_id: str
    name: str
    pincode: Optional[str] = None

class CityCreate(BaseModel):
    name: str
    state: str
    areas: List[AreaModel] = []

class CityResponse(BaseModel):
    city_id: str
    name: str
    state: str
    areas: List[AreaModel]
    active: bool = True

# Review Models
class ReviewCreate(BaseModel):
    venue_id: str
    rating: int  # 1-5
    title: Optional[str] = None
    content: str

class ReviewResponse(BaseModel):
    review_id: str
    venue_id: str
    user_id: str
    user_name: str
    rating: int
    title: Optional[str] = None
    content: str
    created_at: datetime

# Event Planner Models
class PlannerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    services: List[str] = []  # wedding, corporate, etc.
    price_range_min: Optional[float] = None
    price_range_max: Optional[float] = None
    cities: List[str] = []
    portfolio_images: List[str] = []
    phone: Optional[str] = None

class PlannerResponse(BaseModel):
    planner_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    services: List[str]
    price_range_min: Optional[float] = None
    price_range_max: Optional[float] = None
    cities: List[str]
    portfolio_images: List[str]
    phone: Optional[str] = None
    rating: float = 0.0
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime

# Notification Models
class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str  # enquiry, lead_update, approval, etc.
    read: bool = False
    data: Optional[Dict[str, Any]] = None
    created_at: datetime

# Availability Models
class AvailabilitySlot(BaseModel):
    date: str
    status: str = "available"  # available, booked, blocked
    event_type: Optional[str] = None
    notes: Optional[str] = None

class AvailabilityUpdate(BaseModel):
    slots: List[AvailabilitySlot]

# ============== HELPER FUNCTIONS ==============

def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> dict:
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
    try:
        return await get_current_user(request)
    except Exception:
        return None

def require_role(*roles):
    async def dependency(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in km
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def format_indian_currency(amount: float) -> str:
    """Format number in Indian numbering system"""
    if amount < 1000:
        return f"₹ {int(amount)}"
    elif amount < 100000:
        return f"₹ {amount/1000:.1f}K"
    elif amount < 10000000:
        return f"₹ {amount/100000:.1f}L"
    else:
        return f"₹ {amount/10000000:.1f}Cr"

async def send_email_async(to: str, subject: str, html: str):
    """Send email using Resend (non-blocking)"""
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

async def create_notification(user_id: str, title: str, message: str, notif_type: str, data: dict = None):
    """Create in-app notification"""
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

async def assign_rm_round_robin(city: str) -> Optional[str]:
    """Assign RM using round-robin for a city"""
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

async def create_audit_log(
    entity_type: str,
    entity_id: str,
    action: str,
    user: dict,
    changes: dict = None,
    request: Request = None
):
    """Create an audit log entry for tracking all actions"""
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

def calculate_commission(deal_value: float, commission_type: str, rate: float = None, flat_amount: float = None) -> float:
    """Calculate commission based on type"""
    if commission_type == "percentage" and rate:
        return deal_value * (rate / 100)
    elif commission_type == "flat" and flat_amount:
        return flat_amount
    return 0

def can_release_contact(stage: str) -> bool:
    """Check if customer contact can be released to venue/planner based on stage"""
    release_stages = ["site_visit", "negotiation", "booking_confirmed"]
    return stage in release_stages

def validate_booking_confirmation(lead: dict) -> tuple[bool, str]:
    """Validate if lead can be marked as booking_confirmed"""
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
    
    Args:
        lead: The original lead data from database
        new_stage: Target stage to transition to
        db_ref: Database reference
        update_data: Optional dict of fields being updated (for checking new values)
        user: Current user for role-based checks
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
            
            # Check if moving backwards
            if new_idx < current_idx and new_stage not in ["lost", "closed_not_proceeding"]:
                if not is_admin:
                    return False, "Cannot revert stage after payment received. Admin override required.", [
                        "Advance payment has been received",
                        "Stage cannot be moved backwards",
                        "Contact Admin to revert stage"
                    ]
                # Admin can override - log will be created separately
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
        # Check requirement summary (use merged data in case it's being set now)
        requirement_summary = check_lead.get("requirement_summary") or check_lead.get("additional_requirements")
        if not requirement_summary or len(str(requirement_summary).strip()) < 10:
            missing.append("Requirement summary must be filled (minimum 10 characters)")
        
        # Check at least 1 venue shortlisted
        if shortlist_count < 1:
            missing.append("At least 1 venue must be shortlisted")
    
    # RULE 2: Cannot move to "negotiation" unless venue availability confirmed
    if new_stage == "negotiation":
        # Inherit site_visit requirements
        requirement_summary = check_lead.get("requirement_summary") or check_lead.get("additional_requirements")
        if not requirement_summary or len(str(requirement_summary).strip()) < 10:
            missing.append("Requirement summary must be filled")
        
        if shortlist_count < 1:
            missing.append("At least 1 venue must be shortlisted")
        
        # Check venue availability confirmed (via holds or explicit flag)
        availability_confirmed = check_lead.get("venue_availability_confirmed", False)
        has_active_hold = await db_ref.date_holds.count_documents({
            "lead_id": lead_id,
            "status": "active"
        }) > 0
        
        if not availability_confirmed and not has_active_hold:
            missing.append("Venue availability must be confirmed (place a date hold or mark availability confirmed)")
    
    # RULE 3: Cannot move to "booking_confirmed" - full validation
    if new_stage == "booking_confirmed":
        # Check deal value
        if not check_lead.get("deal_value"):
            missing.append("Deal value is required")
        
        # Check commission
        has_venue_commission = check_lead.get("venue_commission_rate") or check_lead.get("venue_commission_flat")
        has_planner_commission = check_lead.get("planner_commission_rate") or check_lead.get("planner_commission_flat")
        if not has_venue_commission and not has_planner_commission:
            missing.append("At least one commission (venue or planner) must be set")
        
        # Check advance payment link generated
        payment_status = check_lead.get("payment_status")
        payment_details = check_lead.get("payment_details") or {}
        if not payment_status or payment_status not in ["awaiting_advance", "advance_paid", "payment_released"]:
            if not payment_details.get("payment_link"):
                missing.append("Advance payment link must be generated")
        
        # Check venue date is blocked
        venue_date_blocked = check_lead.get("venue_date_blocked", False)
        # Also check if any shortlist item has date_blocked
        shortlist_blocked = any(item.get("date_blocked") or item.get("status") == "confirmed" for item in shortlist)
        
        if not venue_date_blocked and not shortlist_blocked:
            missing.append("Venue date must be marked as blocked/confirmed")
    
    if missing:
        return False, f"Cannot move to '{new_stage.replace('_', ' ').title()}'. Missing requirements:", missing
    
    return True, "", []

def validate_stage_transition(lead: dict, new_stage: str) -> tuple[bool, str, list]:
    """
    Synchronous stub for compatibility - actual validation happens in async version
    """
    # For backwards compatibility, return valid for non-strict validations
    return True, "", []

def calculate_commission_age(confirmed_at: str) -> int:
    """Calculate days since commission was confirmed"""
    if not confirmed_at:
        return 0
    try:
        confirmed_date = datetime.fromisoformat(confirmed_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        return (now - confirmed_date).days
    except Exception:
        return 0

def get_commission_status_for_deal_value(current_status: str, has_deal_value: bool) -> str:
    """Determine commission status when deal value is set"""
    if not has_deal_value:
        return current_status
    # If no status or was empty, set to projected
    if not current_status or current_status == "pending":
        return "projected"
    return current_status

def get_commission_status_for_booking_confirmed(current_status: str) -> str:
    """Move commission to confirmed status when booking is confirmed"""
    # Only move from projected to confirmed
    if current_status in [None, "", "pending", "projected"]:
        return "confirmed"
    return current_status

def validate_event_completion(lead: dict) -> tuple[bool, str]:
    """Validate if event can be marked as completed"""
    if lead.get("stage") != "booking_confirmed":
        return False, "Only confirmed bookings can be marked as completed"
    if not lead.get("event_date"):
        return False, "Event date is required"
    # Check if event date has passed
    try:
        event_date = datetime.fromisoformat(lead["event_date"].replace('Z', '+00:00'))
        if event_date.date() > datetime.now(timezone.utc).date():
            return False, "Event date has not passed yet"
    except Exception:
        pass  # If date parsing fails, allow completion
    return True, ""

# ============== AUTH ROUTES (MIGRATED TO routes/auth.py) ==============
# The routes below are now handled by the modular routes/auth.py file
# They are kept here commented out for reference during migration

@api_router.get("/my-venues")
async def get_my_venues(user: dict = Depends(require_role("venue_owner", "admin"))):
    """Get venues owned by current user"""
    if user["role"] == "admin":
        venues = await db.venues.find({}, {"_id": 0}).to_list(1000)
    else:
        venues = await db.venues.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return venues

# ============== PAYMENT MEDIATION SYSTEM ==============

def calculate_payment_breakdown(deal_value: float, advance_amount: float, commission_rate: float, minimum_platform_fee: float = None):
    """Calculate payment breakdown with venue's negotiated commission or default"""
    # Calculate commission based on percentage
    commission_amount = advance_amount * (commission_rate / 100)
    
    # Apply minimum platform fee floor if set
    if minimum_platform_fee and commission_amount < minimum_platform_fee:
        commission_amount = minimum_platform_fee
    
    net_amount_to_vendor = advance_amount - commission_amount
    
    return {
        "deal_value": deal_value,
        "advance_paid": advance_amount,
        "commission_rate": commission_rate,
        "commission_amount": round(commission_amount, 2),
        "net_amount_to_vendor": round(net_amount_to_vendor, 2),
        "minimum_platform_fee_applied": minimum_platform_fee if (minimum_platform_fee and commission_amount == minimum_platform_fee) else None
    }

async def get_venue_commission_settings(venue_id: str):
    """Get venue's negotiated commission settings or return defaults"""
    if not venue_id:
        return {
            "commission_rate": DEFAULT_COMMISSION_RATE,
            "minimum_platform_fee": None,
            "min_advance_percent": DEFAULT_MIN_ADVANCE_PERCENT,
            "max_advance_percent": MAX_ADVANCE_PERCENT_CAP
        }
    
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        return {
            "commission_rate": DEFAULT_COMMISSION_RATE,
            "minimum_platform_fee": None,
            "min_advance_percent": DEFAULT_MIN_ADVANCE_PERCENT,
            "max_advance_percent": MAX_ADVANCE_PERCENT_CAP
        }
    
    # Use venue's negotiated rates if available, otherwise fallback to defaults
    return {
        "commission_rate": venue.get("negotiated_commission_percent", DEFAULT_COMMISSION_RATE),
        "minimum_platform_fee": venue.get("minimum_platform_fee"),
        "min_advance_percent": venue.get("min_advance_percent", DEFAULT_MIN_ADVANCE_PERCENT),
        "max_advance_percent": venue.get("max_advance_percent", MAX_ADVANCE_PERCENT_CAP)
    }

def generate_mock_razorpay_order(amount: int, receipt: str):
    """Generate a mock Razorpay order for test mode"""
    order_id = f"order_{uuid.uuid4().hex[:16]}"
    return {
        "id": order_id,
        "entity": "order",
        "amount": amount,
        "amount_paid": 0,
        "amount_due": amount,
        "currency": "INR",
        "receipt": receipt[:40],  # Max 40 chars
        "status": "created",
        "notes": {}
    }

async def send_payment_link_notification(payment: dict, lead: dict):
    """Send notification to customer when payment link is generated"""
    customer_email = lead.get("customer_email")
    customer_name = lead.get("customer_name", "Customer")
    payment_link = payment.get("payment_link")
    amount = payment.get("amount", 0)
    event_type = lead.get("event_type", "event").replace("_", " ").title()
    
    # In-app notification (if customer has account)
    # Note: In MVP, we create notification for audit trail even if no user account
    await db.notifications.insert_one({
        "notification_id": generate_id("notif_"),
        "type": "payment_link_generated",
        "recipient_email": customer_email,
        "recipient_name": customer_name,
        "title": "Payment Link Ready",
        "message": f"Your advance payment link of ₹{amount:,.0f} for {event_type} is ready.",
        "data": {
            "payment_link": payment_link,
            "amount": amount,
            "lead_id": lead.get("lead_id")
        },
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "channel": "email",
        "status": "pending"
    })
    
    # Send email via Resend if configured
    resend_key = os.environ.get('RESEND_API_KEY')
    if resend_key and customer_email:
        try:
            import resend
            resend.api_key = resend_key
            
            resend.Emails.send({
                "from": "BookMyVenue <noreply@bookmyvenue.in>",
                "to": [customer_email],
                "subject": f"Complete Your Booking - Advance Payment Link",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0B1F3B; padding: 24px; text-align: center;">
                        <h1 style="color: #C9A227; margin: 0;">BookMyVenue</h1>
                    </div>
                    <div style="padding: 32px; background: #ffffff;">
                        <p style="font-size: 16px;">Dear {customer_name},</p>
                        <p style="font-size: 16px; line-height: 1.6;">
                            Your booking is almost confirmed! Please complete your advance payment to secure your venue.
                        </p>
                        <div style="background: #F9F9F7; padding: 20px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0 0 8px 0; color: #64748B; font-size: 14px;">Amount to Pay</p>
                            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #0B1F3B;">₹{amount:,.0f}</p>
                        </div>
                        <a href="{payment_link}" style="display: inline-block; background: #C9A227; color: #0B1F3B; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">
                            Pay Now
                        </a>
                        <p style="font-size: 14px; color: #64748B; margin-top: 24px;">
                            <strong>Protected Payment via BookMyVenue</strong><br/>
                            Your payment is secure and protected.
                        </p>
                    </div>
                    <div style="background: #F9F9F7; padding: 16px; text-align: center; font-size: 12px; color: #64748B;">
                        BookMyVenue - India's Managed Venue Booking Network
                    </div>
                </div>
                """
            })
            
            # Update notification status
            await db.notifications.update_one(
                {"recipient_email": customer_email, "type": "payment_link_generated"},
                {"$set": {"status": "sent"}}
            )
            logger.info(f"Payment link email sent to {customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send payment link email: {str(e)}")

async def send_payment_released_notification(payment: dict, lead: dict, venue: dict):
    """Send notification to venue owner when payment is released"""
    if not venue:
        return
    
    owner_id = venue.get("owner_id")
    venue_name = venue.get("name", "Your Venue")
    net_amount = payment.get("net_amount_to_vendor", 0)
    
    # Create in-app notification for venue owner
    if owner_id:
        await create_notification(
            owner_id,
            "Payment Released",
            f"₹{net_amount:,.0f} has been released for booking at {venue_name}",
            "payment",
            {"payment_id": payment.get("payment_id"), "lead_id": lead.get("lead_id")}
        )
    
    # Send email to venue owner
    owner = await db.users.find_one({"user_id": owner_id}, {"_id": 0}) if owner_id else None
    if owner and owner.get("email"):
        resend_key = os.environ.get('RESEND_API_KEY')
        if resend_key:
            try:
                import resend
                resend.api_key = resend_key
                
                resend.Emails.send({
                    "from": "BookMyVenue <noreply@bookmyvenue.in>",
                    "to": [owner["email"]],
                    "subject": f"Payment Released - ₹{net_amount:,.0f} for {venue_name}",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #0B1F3B; padding: 24px; text-align: center;">
                            <h1 style="color: #C9A227; margin: 0;">BookMyVenue</h1>
                        </div>
                        <div style="padding: 32px; background: #ffffff;">
                            <p style="font-size: 16px;">Dear Partner,</p>
                            <p style="font-size: 16px; line-height: 1.6;">
                                Great news! A payment has been released for your venue <strong>{venue_name}</strong>.
                            </p>
                            <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10B981;">
                                <p style="margin: 0 0 8px 0; color: #065F46; font-size: 14px;">Amount Released</p>
                                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #065F46;">₹{net_amount:,.0f}</p>
                            </div>
                            <p style="font-size: 14px; color: #64748B;">
                                This amount will be transferred to your registered bank account.
                            </p>
                        </div>
                        <div style="background: #F9F9F7; padding: 16px; text-align: center; font-size: 12px; color: #64748B;">
                            BookMyVenue Partner Program
                        </div>
                    </div>
                    """
                })
                logger.info(f"Payment released email sent to venue owner {owner['email']}")
            except Exception as e:
                logger.warning(f"Failed to send payment released email: {str(e)}")

@api_router.post("/payments/create-order")
async def create_payment_order(payment_data: PaymentCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Create a payment order for booking advance collection"""
    
    # Validate lead exists and is in negotiation or booking_confirmed stage
    lead = await db.leads.find_one({"lead_id": payment_data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Payment can be created in 'negotiation' stage (to generate link before booking confirmed)
    # or in 'booking_confirmed' stage (for additional payments)
    if lead.get("stage") not in ["negotiation", "booking_confirmed"]:
        raise HTTPException(status_code=400, detail="Lead must be in 'Negotiation' or 'Booking Confirmed' stage to create payment link")
    
    # Check for existing pending payment
    existing_payment = await db.payments.find_one({
        "lead_id": payment_data.lead_id,
        "status": {"$in": ["pending", "awaiting_advance"]}
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="A payment is already pending for this lead")
    
    # Get deal value from lead
    deal_value = lead.get("deal_value", 0)
    if not deal_value:
        raise HTTPException(status_code=400, detail="Deal value must be set before creating payment order")
    
    # Get venue commission settings
    venue_id = lead.get("venue_ids", [None])[0] if lead.get("venue_ids") else None
    commission_settings = await get_venue_commission_settings(venue_id)
    
    # Validate advance amount against guardrails
    advance_percent = (payment_data.amount / deal_value) * 100
    min_advance = commission_settings.get("min_advance_percent", DEFAULT_MIN_ADVANCE_PERCENT)
    max_advance = commission_settings.get("max_advance_percent", MAX_ADVANCE_PERCENT_CAP)
    
    if advance_percent < min_advance:
        raise HTTPException(
            status_code=400, 
            detail=f"Advance amount must be at least {min_advance}% of deal value (₹{deal_value * min_advance / 100:,.0f})"
        )
    
    if advance_percent > max_advance:
        raise HTTPException(
            status_code=400, 
            detail=f"Advance amount cannot exceed {max_advance}% of deal value (₹{deal_value * max_advance / 100:,.0f})"
        )
    
    amount_in_paise = int(payment_data.amount * 100)
    receipt = f"BMV_{payment_data.lead_id[:12]}"
    
    # In test mode, generate mock order
    # In production, this would call Razorpay API
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        razorpay_order = generate_mock_razorpay_order(amount_in_paise, receipt)
    else:
        # Production Razorpay integration
        try:
            import razorpay
            client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            razorpay_order = client.order.create({
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
                "notes": {
                    "lead_id": payment_data.lead_id,
                    "customer_name": lead.get("customer_name", ""),
                    "event_type": lead.get("event_type", "")
                }
            })
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Payment order creation failed")
    
    # Calculate payment breakdown using venue's negotiated rate
    breakdown = calculate_payment_breakdown(
        deal_value, 
        payment_data.amount,
        commission_settings["commission_rate"],
        commission_settings.get("minimum_platform_fee")
    )
    
    now = datetime.now(timezone.utc).isoformat()
    payment_id = generate_id("pay_")
    
    # Generate payment link (in test mode, this is a mock link)
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        payment_link = f"https://rzp.io/test/{razorpay_order['id']}"
    else:
        payment_link = f"https://rzp.io/i/{razorpay_order['id']}"
    
    payment_record = {
        "payment_id": payment_id,
        "lead_id": payment_data.lead_id,
        "order_id": razorpay_order["id"],
        "amount": payment_data.amount,
        "amount_paise": amount_in_paise,
        "currency": "INR",
        "status": "awaiting_advance",
        "description": payment_data.description or f"Advance payment for {lead.get('event_type', 'event')} booking",
        "payment_link": payment_link,
        # Payment breakdown
        "deal_value": breakdown["deal_value"],
        "advance_paid": 0,  # Will be updated on payment success
        "advance_percent": round(advance_percent, 2),
        "commission_rate": breakdown["commission_rate"],
        "commission_amount": breakdown["commission_amount"],
        "minimum_platform_fee_applied": breakdown.get("minimum_platform_fee_applied"),
        "net_amount_to_vendor": breakdown["net_amount_to_vendor"],
        # Metadata
        "customer_name": lead.get("customer_name"),
        "customer_email": lead.get("customer_email"),
        "customer_phone": lead.get("customer_phone"),
        "venue_id": venue_id,
        # Timestamps
        "created_at": now,
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "paid_at": None,
        "released_at": None,
        "released_by": None
    }
    
    await db.payments.insert_one(payment_record)
    
    # Update lead with payment status
    await db.leads.update_one(
        {"lead_id": payment_data.lead_id},
        {"$set": {
            "payment_status": "awaiting_advance",
            "payment_id": payment_id,
            "updated_at": now
        }}
    )
    
    # Create audit log
    await create_audit_log("payment", payment_id, "order_created", user, {
        "lead_id": payment_data.lead_id,
        "amount": payment_data.amount,
        "advance_percent": round(advance_percent, 2),
        "commission_rate": breakdown["commission_rate"],
        "order_id": razorpay_order["id"]
    }, request)
    
    # Send notification to customer
    await send_payment_link_notification(payment_record, lead)
    
    payment_record.pop("_id", None)
    return {
        "payment_id": payment_id,
        "order_id": razorpay_order["id"],
        "amount": payment_data.amount,
        "payment_link": payment_link,
        "status": "awaiting_advance",
        "breakdown": breakdown,
        "razorpay_key": RAZORPAY_KEY_ID if RAZORPAY_KEY_ID != 'rzp_test_demo' else None,
        "is_test_mode": RAZORPAY_KEY_ID == 'rzp_test_demo'
    }

@api_router.post("/payments/verify")
async def verify_payment(payment_verify: PaymentVerify, request: Request):
    """Verify payment after Razorpay checkout completion"""
    
    # Find the payment record
    payment = await db.payments.find_one({"order_id": payment_verify.razorpay_order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")
    
    if payment["status"] not in ["pending", "awaiting_advance"]:
        raise HTTPException(status_code=400, detail=f"Payment is already in status: {payment['status']}")
    
    # Verify signature (in test mode, we skip verification)
    if RAZORPAY_KEY_ID != 'rzp_test_demo':
        try:
            import razorpay
            import hmac
            import hashlib
            
            # Verify signature
            message = f"{payment_verify.razorpay_order_id}|{payment_verify.razorpay_payment_id}"
            expected_signature = hmac.new(
                RAZORPAY_KEY_SECRET.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if expected_signature != payment_verify.razorpay_signature:
                raise HTTPException(status_code=400, detail="Payment verification failed - invalid signature")
        except ImportError:
            logger.warning("Razorpay SDK not installed, skipping signature verification")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment record
    await db.payments.update_one(
        {"order_id": payment_verify.razorpay_order_id},
        {"$set": {
            "status": "advance_paid",
            "razorpay_payment_id": payment_verify.razorpay_payment_id,
            "razorpay_signature": payment_verify.razorpay_signature,
            "advance_paid": payment["amount"],
            "paid_at": now
        }}
    )
    
    # Update lead payment status
    await db.leads.update_one(
        {"lead_id": payment["lead_id"]},
        {"$set": {
            "payment_status": "advance_paid",
            "advance_paid_at": now,
            "updated_at": now
        }}
    )
    
    # Create audit log (no user context in webhook, use system)
    await db.audit_logs.insert_one({
        "log_id": generate_id("log_"),
        "entity_type": "payment",
        "entity_id": payment["payment_id"],
        "action": "payment_verified",
        "changes": {
            "razorpay_payment_id": payment_verify.razorpay_payment_id,
            "amount": payment["amount"]
        },
        "performed_by": "system",
        "performed_by_name": "Payment Gateway",
        "performed_at": now,
        "ip_address": request.client.host if request.client else None
    })
    
    # Notify RM
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    if lead and lead.get("rm_id"):
        await create_notification(
            lead["rm_id"],
            "Advance Payment Received",
            f"₹{payment['amount']:,.0f} advance received from {payment['customer_name']}",
            "payment",
            {"payment_id": payment["payment_id"], "lead_id": payment["lead_id"]}
        )
    
    return {
        "success": True,
        "message": "Payment verified successfully",
        "payment_id": payment["payment_id"],
        "status": "advance_paid"
    }

@api_router.post("/payments/webhook")
async def payment_webhook(request: Request):
    """Handle Razorpay webhook events"""
    try:
        payload = await request.body()
        signature = request.headers.get('X-Razorpay-Signature', '')
        
        # In test mode, process directly
        if RAZORPAY_KEY_ID == 'rzp_test_demo':
            data = await request.json()
        else:
            # Verify webhook signature
            import hmac
            import hashlib
            expected_signature = hmac.new(
                RAZORPAY_WEBHOOK_SECRET.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            if expected_signature != signature:
                logger.warning("Invalid webhook signature")
                raise HTTPException(status_code=400, detail="Invalid signature")
            
            import json
            data = json.loads(payload)
        
        event = data.get("event", "")
        payment_entity = data.get("payload", {}).get("payment", {}).get("entity", {})
        
        if event == "payment.captured":
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            
            if order_id:
                now = datetime.now(timezone.utc).isoformat()
                payment = await db.payments.find_one({"order_id": order_id}, {"_id": 0})
                
                if payment and payment["status"] == "awaiting_advance":
                    await db.payments.update_one(
                        {"order_id": order_id},
                        {"$set": {
                            "status": "advance_paid",
                            "razorpay_payment_id": payment_id,
                            "advance_paid": payment["amount"],
                            "paid_at": now
                        }}
                    )
                    
                    await db.leads.update_one(
                        {"lead_id": payment["lead_id"]},
                        {"$set": {
                            "payment_status": "advance_paid",
                            "advance_paid_at": now,
                            "updated_at": now
                        }}
                    )
                    
                    logger.info(f"Webhook: Payment {payment_id} captured for order {order_id}")
        
        elif event == "payment.failed":
            order_id = payment_entity.get("order_id")
            
            if order_id:
                await db.payments.update_one(
                    {"order_id": order_id},
                    {"$set": {"status": "payment_failed"}}
                )
                
                payment = await db.payments.find_one({"order_id": order_id}, {"_id": 0})
                if payment:
                    await db.leads.update_one(
                        {"lead_id": payment["lead_id"]},
                        {"$set": {"payment_status": "payment_failed"}}
                    )
        
        return {"status": "processed"}
    
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.post("/payments/{payment_id}/simulate-payment")
async def simulate_payment(payment_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    """Simulate payment completion in test mode (Admin only)"""
    
    if RAZORPAY_KEY_ID != 'rzp_test_demo':
        raise HTTPException(status_code=400, detail="Simulation only available in test mode")
    
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != "awaiting_advance":
        raise HTTPException(status_code=400, detail=f"Cannot simulate payment in status: {payment['status']}")
    
    now = datetime.now(timezone.utc).isoformat()
    simulated_payment_id = f"pay_sim_{uuid.uuid4().hex[:12]}"
    
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {
            "status": "advance_paid",
            "razorpay_payment_id": simulated_payment_id,
            "advance_paid": payment["amount"],
            "paid_at": now
        }}
    )
    
    await db.leads.update_one(
        {"lead_id": payment["lead_id"]},
        {"$set": {
            "payment_status": "advance_paid",
            "advance_paid_at": now,
            "updated_at": now
        }}
    )
    
    # Create audit log
    await create_audit_log("payment", payment_id, "payment_simulated", user, {
        "simulated_payment_id": simulated_payment_id,
        "amount": payment["amount"]
    }, request)
    
    # Notify RM
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    if lead and lead.get("rm_id"):
        await create_notification(
            lead["rm_id"],
            "Advance Payment Received (Test)",
            f"₹{payment['amount']:,.0f} test payment received from {payment['customer_name']}",
            "payment",
            {"payment_id": payment_id, "lead_id": payment["lead_id"]}
        )
    
    return {
        "success": True,
        "message": "Payment simulated successfully",
        "payment_id": payment_id,
        "status": "advance_paid"
    }

@api_router.post("/payments/{payment_id}/release")
async def release_payment_to_venue(payment_id: str, release_data: PaymentRelease, request: Request, user: dict = Depends(require_role("admin"))):
    """Release payment to venue - Admin only. For MVP, this simulates payout."""
    
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != "advance_paid":
        raise HTTPException(status_code=400, detail=f"Cannot release payment in status: {payment['status']}. Payment must be in 'advance_paid' status.")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment record
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {
            "status": "payment_released",
            "released_at": now,
            "released_by": user["user_id"],
            "released_by_name": user["name"],
            "release_notes": release_data.notes
        }}
    )
    
    # Update lead payment status
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    await db.leads.update_one(
        {"lead_id": payment["lead_id"]},
        {"$set": {
            "payment_status": "payment_released",
            "payment_released_at": now,
            "updated_at": now
        }}
    )
    
    # Create audit log
    await create_audit_log("payment", payment_id, "payment_released", user, {
        "net_amount_to_vendor": payment["net_amount_to_vendor"],
        "commission_retained": payment["commission_amount"],
        "notes": release_data.notes
    }, request)
    
    # Send notification to Venue Owner (in-app + email)
    venue_id = payment.get("venue_id")
    venue = None
    if venue_id:
        venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    
    # Send comprehensive notification
    await send_payment_released_notification(payment, lead, venue)
    
    return {
        "success": True,
        "message": "Payment released to venue",
        "payment_id": payment_id,
        "net_amount_released": payment["net_amount_to_vendor"],
        "commission_retained": payment["commission_amount"],
        "status": "payment_released"
    }

@api_router.get("/payments/stats/summary")
async def get_payment_stats(user: dict = Depends(require_role("admin"))):
    """Get payment statistics for admin dashboard"""
    
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"},
            "total_commission": {"$sum": "$commission_amount"},
            "total_net": {"$sum": "$net_amount_to_vendor"}
        }}
    ]
    
    stats_by_status = await db.payments.aggregate(pipeline).to_list(10)
    
    # Calculate totals
    total_collected = sum(s["total_amount"] for s in stats_by_status if s["_id"] in ["advance_paid", "payment_released"])
    total_commission = sum(s["total_commission"] for s in stats_by_status if s["_id"] in ["advance_paid", "payment_released"])
    total_released = sum(s["total_net"] for s in stats_by_status if s["_id"] == "payment_released")
    pending_release = sum(s["total_net"] for s in stats_by_status if s["_id"] == "advance_paid")
    
    return {
        "by_status": {s["_id"]: s for s in stats_by_status},
        "summary": {
            "total_collected": total_collected,
            "total_commission_earned": total_commission,
            "total_released_to_venues": total_released,
            "pending_release": pending_release,
            "awaiting_payment": sum(s["total_amount"] for s in stats_by_status if s["_id"] == "awaiting_advance")
        }
    }

@api_router.get("/payments/analytics")
async def get_payment_analytics(user: dict = Depends(require_role("admin"))):
    """Get comprehensive payment analytics for investor-ready dashboard"""
    from dateutil.relativedelta import relativedelta
    
    now = datetime.now(timezone.utc)
    
    # ============== MONTHLY TREND (Last 7 months including current) ==============
    monthly_data = []
    for i in range(6, -1, -1):  # 6 months ago to current
        month_start = (now - relativedelta(months=i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            month_end = (now - relativedelta(months=i-1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            month_end = now + relativedelta(days=1)  # Include today
        
        # Query payments for this month using string comparison
        month_start_str = month_start.strftime("%Y-%m")
        
        pipeline = [
            {"$match": {
                "status": {"$in": ["advance_paid", "payment_released"]}
            }},
            {"$addFields": {
                "created_month": {"$substr": ["$created_at", 0, 7]}
            }},
            {"$match": {
                "created_month": month_start_str
            }},
            {"$group": {
                "_id": None,
                "total_collected": {"$sum": "$amount"},
                "bmv_revenue": {"$sum": "$commission_amount"},
                "pending_release": {"$sum": {
                    "$cond": [{"$eq": ["$status", "advance_paid"]}, "$net_amount_to_vendor", 0]
                }},
                "count": {"$sum": 1}
            }}
        ]
        
        result = await db.payments.aggregate(pipeline).to_list(1)
        month_stats = result[0] if result else {"total_collected": 0, "bmv_revenue": 0, "pending_release": 0, "count": 0}
        
        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "month_short": month_start.strftime("%b"),
            "total_collected": month_stats.get("total_collected", 0),
            "bmv_revenue": month_stats.get("bmv_revenue", 0),
            "pending_release": month_stats.get("pending_release", 0),
            "payment_count": month_stats.get("count", 0)
        })
    
    # ============== PAYMENT FUNNEL ==============
    # Total links generated
    total_links = await db.payments.count_documents({})
    
    # Paid (advance_paid or payment_released)
    total_paid = await db.payments.count_documents({"status": {"$in": ["advance_paid", "payment_released"]}})
    
    # Conversion rate
    conversion_rate = (total_paid / total_links * 100) if total_links > 0 else 0
    
    # Average time to pay (from created_at to paid_at)
    time_pipeline = [
        {"$match": {
            "paid_at": {"$ne": None},
            "status": {"$in": ["advance_paid", "payment_released"]}
        }},
        {"$project": {
            "time_to_pay_hours": {
                "$divide": [
                    {"$subtract": [
                        {"$dateFromString": {"dateString": "$paid_at"}},
                        {"$dateFromString": {"dateString": "$created_at"}}
                    ]},
                    3600000  # milliseconds to hours
                ]
            }
        }},
        {"$group": {
            "_id": None,
            "avg_hours": {"$avg": "$time_to_pay_hours"}
        }}
    ]
    
    time_result = await db.payments.aggregate(time_pipeline).to_list(1)
    avg_time_to_pay = time_result[0]["avg_hours"] if time_result else 0
    
    funnel = {
        "links_generated": total_links,
        "payments_completed": total_paid,
        "conversion_rate": round(conversion_rate, 1),
        "avg_time_to_pay_hours": round(avg_time_to_pay, 1),
        "pending": await db.payments.count_documents({"status": "awaiting_advance"}),
        "failed": await db.payments.count_documents({"status": "payment_failed"})
    }
    
    # ============== TOP 10 VENUES BY BMV COMMISSION ==============
    venue_pipeline = [
        {"$match": {
            "status": {"$in": ["advance_paid", "payment_released"]},
            "venue_id": {"$ne": None}
        }},
        {"$group": {
            "_id": "$venue_id",
            "total_commission": {"$sum": "$commission_amount"},
            "total_collected": {"$sum": "$amount"},
            "payment_count": {"$sum": 1}
        }},
        {"$sort": {"total_commission": -1}},
        {"$limit": 10}
    ]
    
    top_venues_raw = await db.payments.aggregate(venue_pipeline).to_list(10)
    
    # Enrich with venue details
    top_venues = []
    for v in top_venues_raw:
        venue = await db.venues.find_one({"venue_id": v["_id"]}, {"_id": 0, "name": 1, "city": 1, "venue_type": 1, "price_per_plate": 1})
        if venue:
            # Determine tier based on price
            price = venue.get("price_per_plate", 0)
            tier = "Premium" if price >= 2000 else "Standard" if price >= 1000 else "Budget"
            
            top_venues.append({
                "venue_id": v["_id"],
                "venue_name": venue.get("name", "Unknown"),
                "city": venue.get("city", "Unknown"),
                "venue_type": venue.get("venue_type", "Unknown"),
                "tier": tier,
                "total_commission": v["total_commission"],
                "total_collected": v["total_collected"],
                "payment_count": v["payment_count"]
            })
    
    return {
        "monthly_trend": monthly_data,
        "funnel": funnel,
        "top_venues": top_venues,
        "generated_at": now.isoformat()
    }

@api_router.get("/admin/control-room")
async def get_control_room_analytics(user: dict = Depends(require_role("admin"))):
    """Get comprehensive pipeline and revenue intelligence for admin control room"""
    from dateutil.relativedelta import relativedelta
    
    now = datetime.now(timezone.utc)
    current_month_str = now.strftime("%Y-%m")
    
    # ============== METRIC 1: Total Deal Value in Pipeline ==============
    # All confirmed bookings that are not closed/lost
    pipeline_leads = await db.leads.find({
        "stage": {"$nin": ["lost", "closed_not_proceeding"]},
        "deal_value": {"$gt": 0}
    }, {"deal_value": 1, "_id": 0}).to_list(10000)
    total_pipeline_value = sum(lead.get("deal_value", 0) for lead in pipeline_leads)
    
    # ============== METRIC 2: Confirmed GMV (Current Month) ==============
    # Leads that reached booking_confirmed this month
    confirmed_pipeline = [
        {"$match": {
            "stage": "booking_confirmed",
            "deal_value": {"$gt": 0}
        }},
        {"$addFields": {
            "updated_month": {"$substr": [{"$ifNull": ["$updated_at", "$created_at"]}, 0, 7]}
        }},
        {"$match": {
            "updated_month": current_month_str
        }},
        {"$group": {
            "_id": None,
            "total_gmv": {"$sum": "$deal_value"},
            "count": {"$sum": 1}
        }}
    ]
    gmv_result = await db.leads.aggregate(confirmed_pipeline).to_list(1)
    confirmed_gmv = gmv_result[0]["total_gmv"] if gmv_result else 0
    confirmed_count = gmv_result[0]["count"] if gmv_result else 0
    
    # ============== METRIC 3: BMV Commission (Current Month) ==============
    commission_pipeline = [
        {"$match": {
            "status": {"$in": ["advance_paid", "payment_released"]}
        }},
        {"$addFields": {
            "paid_month": {"$substr": [{"$ifNull": ["$paid_at", "$created_at"]}, 0, 7]}
        }},
        {"$match": {
            "paid_month": current_month_str
        }},
        {"$group": {
            "_id": None,
            "total_commission": {"$sum": "$commission_amount"},
            "total_collected": {"$sum": "$amount"}
        }}
    ]
    commission_result = await db.payments.aggregate(commission_pipeline).to_list(1)
    current_month_commission = commission_result[0]["total_commission"] if commission_result else 0
    current_month_collected = commission_result[0]["total_collected"] if commission_result else 0
    
    # ============== METRIC 4: Active Tentative Holds ==============
    active_holds = await db.date_holds.count_documents({
        "status": "active"
    })
    
    # ============== METRIC 5: Payment Conversion Rate ==============
    total_payment_links = await db.payments.count_documents({})
    paid_payments = await db.payments.count_documents({"status": {"$in": ["advance_paid", "payment_released"]}})
    payment_conversion_rate = round((paid_payments / total_payment_links * 100), 1) if total_payment_links > 0 else 0
    
    # ============== CHART: Monthly GMV Trend (Last 6 Months) ==============
    monthly_gmv_trend = []
    for i in range(5, -1, -1):  # 5 months ago to current
        month_date = now - relativedelta(months=i)
        month_str = month_date.strftime("%Y-%m")
        month_label = month_date.strftime("%b")
        
        # GMV from confirmed bookings
        gmv_pipeline = [
            {"$match": {
                "stage": "booking_confirmed",
                "deal_value": {"$gt": 0}
            }},
            {"$addFields": {
                "month": {"$substr": [{"$ifNull": ["$updated_at", "$created_at"]}, 0, 7]}
            }},
            {"$match": {"month": month_str}},
            {"$group": {
                "_id": None,
                "gmv": {"$sum": "$deal_value"},
                "bookings": {"$sum": 1}
            }}
        ]
        gmv_res = await db.leads.aggregate(gmv_pipeline).to_list(1)
        
        # Commission from payments
        comm_pipeline = [
            {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
            {"$addFields": {
                "month": {"$substr": [{"$ifNull": ["$paid_at", "$created_at"]}, 0, 7]}
            }},
            {"$match": {"month": month_str}},
            {"$group": {
                "_id": None,
                "commission": {"$sum": "$commission_amount"}
            }}
        ]
        comm_res = await db.payments.aggregate(comm_pipeline).to_list(1)
        
        monthly_gmv_trend.append({
            "month": month_label,
            "month_full": month_date.strftime("%b %Y"),
            "gmv": gmv_res[0]["gmv"] if gmv_res else 0,
            "bookings": gmv_res[0]["bookings"] if gmv_res else 0,
            "commission": comm_res[0]["commission"] if comm_res else 0
        })
    
    # ============== TABLE: Top 10 Venues by BMV Commission ==============
    venue_commission_pipeline = [
        {"$match": {
            "status": {"$in": ["advance_paid", "payment_released"]},
            "commission_amount": {"$gt": 0}
        }},
        {"$group": {
            "_id": "$venue_id",
            "total_commission": {"$sum": "$commission_amount"},
            "total_revenue": {"$sum": "$amount"},
            "payment_count": {"$sum": 1}
        }},
        {"$sort": {"total_commission": -1}},
        {"$limit": 10}
    ]
    venue_commissions = await db.payments.aggregate(venue_commission_pipeline).to_list(10)
    
    top_venues = []
    for vc in venue_commissions:
        venue = await db.venues.find_one({"venue_id": vc["_id"]}, {"_id": 0, "name": 1, "city": 1, "venue_type": 1, "pricing": 1})
        if venue:
            # Determine tier based on pricing
            price_per_plate = venue.get("pricing", {}).get("price_per_plate_veg", 0)
            if price_per_plate >= 2000:
                tier = "Premium"
            elif price_per_plate >= 1000:
                tier = "Standard"
            else:
                tier = "Budget"
            
            top_venues.append({
                "venue_id": vc["_id"],
                "venue_name": venue.get("name", "Unknown"),
                "city": venue.get("city", "Unknown"),
                "tier": tier,
                "total_revenue": vc["total_revenue"],
                "total_commission": vc["total_commission"],
                "payment_count": vc["payment_count"]
            })
    
    # ============== SUMMARY STATS ==============
    total_active_leads = await db.leads.count_documents({
        "stage": {"$nin": ["lost", "closed_not_proceeding", "booking_confirmed"]}
    })
    
    return {
        "metrics": {
            "total_pipeline_value": total_pipeline_value,
            "confirmed_gmv_current_month": confirmed_gmv,
            "confirmed_bookings_current_month": confirmed_count,
            "bmv_commission_current_month": current_month_commission,
            "total_collected_current_month": current_month_collected,
            "active_tentative_holds": active_holds,
            "payment_conversion_rate": payment_conversion_rate,
            "total_active_leads": total_active_leads
        },
        "monthly_gmv_trend": monthly_gmv_trend,
        "top_venues_by_commission": top_venues,
        "current_month": now.strftime("%B %Y"),
        "generated_at": now.isoformat()
    }

@api_router.get("/payments/list")
async def list_payments(
    status: Optional[str] = None,
    lead_id: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    skip: int = 0,
    user: dict = Depends(require_role("rm", "admin"))
):
    """List payments with optional filters"""
    
    query = {}
    if status:
        query["status"] = status
    if lead_id:
        query["lead_id"] = lead_id
    
    # RMs can only see payments for their leads
    if user["role"] == "rm":
        rm_leads = await db.leads.find({"rm_id": user["user_id"]}, {"lead_id": 1}).to_list(1000)
        lead_ids = [l["lead_id"] for l in rm_leads]
        query["lead_id"] = {"$in": lead_ids}
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.payments.count_documents(query)
    
    return {
        "payments": payments,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/payments/{payment_id}")
async def get_payment_details(payment_id: str, user: dict = Depends(get_current_user)):
    """Get payment details"""
    
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Access control
    if user["role"] not in ["admin", "rm"]:
        lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Customers can only see their own payments
        if user["role"] == "customer" and lead.get("customer_email") != user.get("email"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Venue owners can only see payments for their venues
        if user["role"] == "venue_owner":
            venue = await db.venues.find_one({"venue_id": payment.get("venue_id")}, {"_id": 0})
            if not venue or venue.get("owner_id") != user["user_id"]:
                raise HTTPException(status_code=403, detail="Access denied")
    
    return payment

@api_router.get("/venue-enquiries/{venue_id}")
async def get_venue_enquiries(venue_id: str, user: dict = Depends(require_role("venue_owner", "admin"))):
    """Get enquiries for a venue"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if user["role"] != "admin" and venue["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    leads = await db.leads.find({"venue_ids": venue_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return leads

# ============== CITY ROUTES ==============

@api_router.get("/cities")
async def get_cities():
    cities = await db.cities.find({"active": True}, {"_id": 0}).to_list(100)
    return cities

@api_router.post("/cities")
async def create_city(city_data: CityCreate, user: dict = Depends(require_role("admin"))):
    city_id = generate_id("city_")
    city = {
        "city_id": city_id,
        **city_data.model_dump(),
        "active": True
    }
    await db.cities.insert_one(city)
    return {"city_id": city_id}

@api_router.put("/cities/{city_id}")
async def update_city(city_id: str, city_data: CityCreate, user: dict = Depends(require_role("admin"))):
    await db.cities.update_one({"city_id": city_id}, {"$set": city_data.model_dump()})
    return {"message": "City updated"}

# ============== REVIEW ROUTES ==============

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if venue exists
    venue = await db.venues.find_one({"venue_id": review_data.venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    review_id = generate_id("review_")
    review = {
        "review_id": review_id,
        "venue_id": review_data.venue_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "rating": min(5, max(1, review_data.rating)),
        "title": review_data.title,
        "content": review_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review)
    
    # Update venue rating
    all_reviews = await db.reviews.find({"venue_id": review_data.venue_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.venues.update_one(
        {"venue_id": review_data.venue_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(all_reviews)}}
    )
    
    return {"review_id": review_id}

@api_router.get("/reviews/{venue_id}")
async def get_venue_reviews(venue_id: str, page: int = 1, limit: int = 10):
    skip = (page - 1) * limit
    reviews = await db.reviews.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reviews.count_documents({"venue_id": venue_id})
    return {"reviews": reviews, "total": total}

# ============== EVENT PLANNER ROUTES ==============

@api_router.post("/planners")
async def create_planner(planner_data: PlannerCreate, user: dict = Depends(require_role("event_planner", "admin"))):
    planner_id = generate_id("planner_")
    planner = {
        "planner_id": planner_id,
        "user_id": user["user_id"],
        **planner_data.model_dump(),
        "rating": 0.0,
        "status": "pending" if user["role"] != "admin" else "approved",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.planners.insert_one(planner)
    return {"planner_id": planner_id}

@api_router.get("/planners")
async def get_planners(city: Optional[str] = None, service: Optional[str] = None):
    query = {"status": "approved"}
    if city:
        query["cities"] = {"$in": [city]}
    if service:
        query["services"] = {"$in": [service]}
    
    planners = await db.planners.find(query, {"_id": 0}).to_list(100)
    return planners

@api_router.get("/planners/{planner_id}")
async def get_planner(planner_id: str):
    planner = await db.planners.find_one({"planner_id": planner_id}, {"_id": 0})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    return planner

@api_router.get("/my-planner-profile")
async def get_my_planner_profile(user: dict = Depends(require_role("event_planner"))):
    planner = await db.planners.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return planner

# ============== NOTIFICATION ROUTES ==============

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user), unread_only: bool = False):
    query = {"user_id": user["user_id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All marked as read"}

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/users")
async def admin_get_users(
    user: dict = Depends(require_role("admin")),
    role: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if role:
        query["role"] = role
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total}

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, user_data: UserUpdate, admin: dict = Depends(require_role("admin"))):
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    return {"message": "User updated"}

@api_router.put("/admin/venues/{venue_id}/approve")
async def admin_approve_venue(venue_id: str, user: dict = Depends(require_role("admin"))):
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "approved"}})
    
    # Notify owner
    await create_notification(
        venue["owner_id"],
        "Venue Approved",
        f"Your venue '{venue['name']}' has been approved and is now live!",
        "approval",
        {"venue_id": venue_id}
    )
    
    return {"message": "Venue approved"}

@api_router.put("/admin/venues/{venue_id}/reject")
async def admin_reject_venue(venue_id: str, user: dict = Depends(require_role("admin"))):
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await db.venues.update_one({"venue_id": venue_id}, {"$set": {"status": "rejected"}})
    
    await create_notification(
        venue["owner_id"],
        "Venue Rejected",
        f"Your venue '{venue['name']}' submission has been rejected. Please contact support for details.",
        "approval",
        {"venue_id": venue_id}
    )
    
    return {"message": "Venue rejected"}

@api_router.put("/admin/venues/{venue_id}/commission-settings")
async def update_venue_commission_settings(
    venue_id: str, 
    settings: VenueCommissionSettings,
    request: Request,
    user: dict = Depends(require_role("admin"))
):
    """Update venue's private negotiated commission settings - Admin only"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    update_data = {}
    if settings.negotiated_commission_percent is not None:
        if settings.negotiated_commission_percent < 0 or settings.negotiated_commission_percent > 50:
            raise HTTPException(status_code=400, detail="Commission percent must be between 0 and 50")
        update_data["negotiated_commission_percent"] = settings.negotiated_commission_percent
    
    if settings.minimum_platform_fee is not None:
        if settings.minimum_platform_fee < 0:
            raise HTTPException(status_code=400, detail="Minimum platform fee cannot be negative")
        update_data["minimum_platform_fee"] = settings.minimum_platform_fee
    
    if settings.min_advance_percent is not None:
        if settings.min_advance_percent < 0 or settings.min_advance_percent > 50:
            raise HTTPException(status_code=400, detail="Min advance percent must be between 0 and 50")
        update_data["min_advance_percent"] = settings.min_advance_percent
    
    if settings.max_advance_percent is not None:
        if settings.max_advance_percent < 10 or settings.max_advance_percent > 100:
            raise HTTPException(status_code=400, detail="Max advance percent must be between 10 and 100")
        update_data["max_advance_percent"] = settings.max_advance_percent
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No settings provided to update")
    
    update_data["commission_settings_updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["commission_settings_updated_by"] = user["user_id"]
    
    await db.venues.update_one({"venue_id": venue_id}, {"$set": update_data})
    
    await create_audit_log("venue", venue_id, "commission_settings_updated", user, update_data, request)
    
    return {
        "message": "Venue commission settings updated",
        "venue_id": venue_id,
        "settings": update_data
    }

@api_router.get("/admin/venues/{venue_id}/commission-settings")
async def get_venue_commission_settings_admin(venue_id: str, user: dict = Depends(require_role("admin"))):
    """Get venue's commission settings - Admin only"""
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    return {
        "venue_id": venue_id,
        "venue_name": venue.get("name"),
        "negotiated_commission_percent": venue.get("negotiated_commission_percent", DEFAULT_COMMISSION_RATE),
        "minimum_platform_fee": venue.get("minimum_platform_fee"),
        "min_advance_percent": venue.get("min_advance_percent", DEFAULT_MIN_ADVANCE_PERCENT),
        "max_advance_percent": venue.get("max_advance_percent", MAX_ADVANCE_PERCENT_CAP),
        "defaults": {
            "commission_rate": DEFAULT_COMMISSION_RATE,
            "min_advance_percent": DEFAULT_MIN_ADVANCE_PERCENT,
            "max_advance_percent": MAX_ADVANCE_PERCENT_CAP
        }
    }

@api_router.put("/admin/planners/{planner_id}/approve")
async def admin_approve_planner(planner_id: str, user: dict = Depends(require_role("admin"))):
    planner = await db.planners.find_one({"planner_id": planner_id}, {"_id": 0})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    await db.planners.update_one({"planner_id": planner_id}, {"$set": {"status": "approved"}})
    
    await create_notification(
        planner["user_id"],
        "Profile Approved",
        "Your event planner profile has been approved!",
        "approval",
        {"planner_id": planner_id}
    )
    
    return {"message": "Planner approved"}

@api_router.get("/admin/pending-approvals")
async def admin_get_pending(user: dict = Depends(require_role("admin"))):
    pending_venues = await db.venues.find({"status": "pending"}, {"_id": 0}).to_list(100)
    pending_planners = await db.planners.find({"status": "pending"}, {"_id": 0}).to_list(100)
    
    return {
        "venues": pending_venues,
        "planners": pending_planners,
        "total_venues": len(pending_venues),
        "total_planners": len(pending_planners)
    }

@api_router.get("/admin/stats")
async def admin_get_stats(user: dict = Depends(require_role("admin"))):
    total_users = await db.users.count_documents({})
    total_venues = await db.venues.count_documents({"status": "approved"})
    total_leads = await db.leads.count_documents({})
    
    # Leads by stage
    pipeline = [
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}}
    ]
    stage_stats = await db.leads.aggregate(pipeline).to_list(10)
    
    # Commission stats - Venue
    venue_commission_pipeline = [
        {"$match": {"venue_commission_calculated": {"$gt": 0}}},
        {"$group": {
            "_id": "$venue_commission_status",
            "total": {"$sum": "$venue_commission_calculated"},
            "count": {"$sum": 1}
        }}
    ]
    venue_commission_stats = await db.leads.aggregate(venue_commission_pipeline).to_list(10)
    
    # Commission stats - Planner
    planner_commission_pipeline = [
        {"$match": {"planner_commission_calculated": {"$gt": 0}}},
        {"$group": {
            "_id": "$planner_commission_status",
            "total": {"$sum": "$planner_commission_calculated"},
            "count": {"$sum": 1}
        }}
    ]
    planner_commission_stats = await db.leads.aggregate(planner_commission_pipeline).to_list(10)
    
    # Total deal value
    deal_pipeline = [
        {"$match": {"deal_value": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$deal_value"}, "count": {"$sum": 1}}}
    ]
    deal_stats = await db.leads.aggregate(deal_pipeline).to_list(1)
    
    # Recent leads
    recent_leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_users": total_users,
        "total_venues": total_venues,
        "total_leads": total_leads,
        "leads_by_stage": {s["_id"]: s["count"] for s in stage_stats},
        "venue_commission_stats": venue_commission_stats,
        "planner_commission_stats": planner_commission_stats,
        "total_deal_value": deal_stats[0]["total"] if deal_stats else 0,
        "total_confirmed_deals": deal_stats[0]["count"] if deal_stats else 0,
        "recent_leads": recent_leads
    }

@api_router.get("/admin/rm-performance")
async def admin_rm_performance(user: dict = Depends(require_role("admin"))):
    """Get RM performance metrics with enhanced analytics"""
    rms = await db.users.find({"role": "rm"}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    performance = []
    for rm in rms:
        total_leads = await db.leads.count_documents({"rm_id": rm["user_id"]})
        converted = await db.leads.count_documents({"rm_id": rm["user_id"], "stage": "booking_confirmed"})
        in_progress = await db.leads.count_documents({
            "rm_id": rm["user_id"],
            "stage": {"$nin": ["booking_confirmed", "lost"]}
        })
        lost = await db.leads.count_documents({"rm_id": rm["user_id"], "stage": "lost"})
        
        # Total deal value and commission
        pipeline = [
            {"$match": {"rm_id": rm["user_id"], "deal_value": {"$gt": 0}}},
            {"$group": {
                "_id": None,
                "total_deal_value": {"$sum": "$deal_value"},
                "total_venue_commission": {"$sum": "$venue_commission_calculated"},
                "total_planner_commission": {"$sum": "$planner_commission_calculated"}
            }}
        ]
        value_result = await db.leads.aggregate(pipeline).to_list(1)
        
        # Average response time (time from new to contacted)
        response_pipeline = [
            {"$match": {"rm_id": rm["user_id"], "first_contacted_at": {"$exists": True, "$ne": None}}},
            {"$project": {
                "response_hours": {
                    "$divide": [
                        {"$subtract": [{"$toDate": "$first_contacted_at"}, {"$toDate": "$created_at"}]},
                        3600000  # Convert ms to hours
                    ]
                }
            }},
            {"$group": {"_id": None, "avg_response_hours": {"$avg": "$response_hours"}}}
        ]
        response_result = await db.leads.aggregate(response_pipeline).to_list(1)
        
        performance.append({
            "rm": rm,
            "total_leads": total_leads,
            "converted": converted,
            "in_progress": in_progress,
            "lost": lost,
            "conversion_rate": round((converted / total_leads * 100), 1) if total_leads > 0 else 0,
            "total_deal_value": value_result[0]["total_deal_value"] if value_result else 0,
            "total_venue_commission": value_result[0]["total_venue_commission"] if value_result else 0,
            "total_planner_commission": value_result[0]["total_planner_commission"] if value_result else 0,
            "avg_response_hours": round(response_result[0]["avg_response_hours"], 1) if response_result else None,
            "avg_deal_size": round(value_result[0]["total_deal_value"] / converted, 0) if value_result and converted > 0 else 0
        })
    
    return performance

@api_router.get("/admin/commission-report")
async def admin_commission_report(
    user: dict = Depends(require_role("admin")),
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get detailed commission report"""
    query = {"$or": [
        {"venue_commission_calculated": {"$gt": 0}},
        {"planner_commission_calculated": {"$gt": 0}}
    ]}
    
    if status:
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"venue_commission_status": status},
                {"planner_commission_status": status}
            ]
        })
    
    if start_date:
        query["confirmed_at"] = query.get("confirmed_at", {})
        query["confirmed_at"]["$gte"] = start_date
    if end_date:
        query["confirmed_at"] = query.get("confirmed_at", {})
        query["confirmed_at"]["$lte"] = end_date
    
    leads = await db.leads.find(query, {"_id": 0}).sort("confirmed_at", -1).to_list(200)
    
    # Calculate totals
    total_venue_commission = sum(lead.get("venue_commission_calculated", 0) or 0 for lead in leads)
    total_planner_commission = sum(lead.get("planner_commission_calculated", 0) or 0 for lead in leads)
    total_deal_value = sum(lead.get("deal_value", 0) or 0 for lead in leads)
    
    return {
        "leads": leads,
        "summary": {
            "total_leads": len(leads),
            "total_deal_value": total_deal_value,
            "total_venue_commission": total_venue_commission,
            "total_planner_commission": total_planner_commission,
            "total_commission": total_venue_commission + total_planner_commission
        }
    }

# ============== SEED DATA ROUTE (Development) ==============

@api_router.post("/seed-data")
async def seed_data():
    """Seed initial data for development"""
    
    # Check if data already exists
    existing_venues = await db.venues.count_documents({})
    if existing_venues > 0:
        return {"message": "Data already seeded"}
    
    # Create admin user
    admin_id = generate_id("user_")
    admin = {
        "user_id": admin_id,
        "email": "admin@bookmyvenue.in",
        "password_hash": hash_password("admin123"),
        "name": "Admin User",
        "role": "admin",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    
    # Create RM users
    rm_ids = []
    for i, name in enumerate(["Rahul Sharma", "Priya Singh", "Amit Kumar"]):
        rm_id = generate_id("user_")
        rm_ids.append(rm_id)
        rm = {
            "user_id": rm_id,
            "email": f"rm{i+1}@bookmyvenue.in",
            "password_hash": hash_password("rm123"),
            "name": name,
            "role": "rm",
            "status": "active",
            "cities": ["Delhi", "Gurgaon", "Noida"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(rm)
    
    # Create venue owner
    owner_id = generate_id("user_")
    owner = {
        "user_id": owner_id,
        "email": "venue@bookmyvenue.in",
        "password_hash": hash_password("venue123"),
        "name": "Venue Owner Demo",
        "role": "venue_owner",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(owner)
    
    # Seed cities
    cities_data = [
        {"city_id": "city_delhi", "name": "Delhi", "state": "Delhi", "areas": [
            {"area_id": "area_1", "name": "Connaught Place", "pincode": "110001"},
            {"area_id": "area_2", "name": "Dwarka", "pincode": "110075"},
            {"area_id": "area_3", "name": "Rohini", "pincode": "110085"},
            {"area_id": "area_4", "name": "Karol Bagh", "pincode": "110005"},
            {"area_id": "area_5", "name": "Pitampura", "pincode": "110034"}
        ], "active": True},
        {"city_id": "city_gurgaon", "name": "Gurgaon", "state": "Haryana", "areas": [
            {"area_id": "area_6", "name": "DLF Phase 1", "pincode": "122002"},
            {"area_id": "area_7", "name": "Golf Course Road", "pincode": "122018"},
            {"area_id": "area_8", "name": "Cyber City", "pincode": "122002"},
            {"area_id": "area_9", "name": "Sohna Road", "pincode": "122001"}
        ], "active": True},
        {"city_id": "city_noida", "name": "Noida", "state": "Uttar Pradesh", "areas": [
            {"area_id": "area_10", "name": "Sector 18", "pincode": "201301"},
            {"area_id": "area_11", "name": "Sector 62", "pincode": "201309"},
            {"area_id": "area_12", "name": "Greater Noida", "pincode": "201310"}
        ], "active": True}
    ]
    await db.cities.insert_many(cities_data)
    
    # Seed venues
    venues_data = [
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Grand Imperial",
            "description": "A majestic venue for grand celebrations with stunning architecture and world-class amenities.",
            "city": "Delhi",
            "area": "Connaught Place",
            "address": "123 Kasturba Gandhi Marg, Connaught Place",
            "pincode": "110001",
            "latitude": 28.6315,
            "longitude": 77.2167,
            "event_types": ["wedding", "reception", "corporate", "birthday"],
            "venue_type": "banquet_hall",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 1000,
            "pricing": {
                "price_per_plate_veg": 1800,
                "price_per_plate_nonveg": 2200,
                "min_spend": 500000,
                "packages": [
                    {"name": "Silver", "price": 500000, "guests": 300},
                    {"name": "Gold", "price": 800000, "guests": 500},
                    {"name": "Platinum", "price": 1200000, "guests": 800}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 50, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800",
                "https://images.unsplash.com/photo-1571983371651-221e6c0b910a?w=800",
                "https://images.unsplash.com/photo-1728024181315-8c7f5815bf00?w=800"
            ],
            "policies": "Booking requires 50% advance. Cancellation charges apply.",
            "rating": 4.8,
            "review_count": 156,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Royal Gardens Farmhouse",
            "description": "Sprawling outdoor venue perfect for grand weddings with lush green lawns and rustic charm.",
            "city": "Gurgaon",
            "area": "Sohna Road",
            "address": "KM 15, Sohna Road, Near Golf Course Extension",
            "pincode": "122001",
            "latitude": 28.4089,
            "longitude": 77.0436,
            "event_types": ["wedding", "mehendi", "sangeet", "reception"],
            "venue_type": "farmhouse",
            "indoor_outdoor": "outdoor",
            "capacity_min": 200,
            "capacity_max": 2000,
            "pricing": {
                "price_per_plate_veg": 1200,
                "price_per_plate_nonveg": 1500,
                "min_spend": 300000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 10, "ac": False, "catering_inhouse": False,
                "catering_outside_allowed": True, "decor_inhouse": False,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1745573673416-66e829644ae9?w=800",
                "https://images.unsplash.com/photo-1677232519517-9dca7bacdfd3?w=800"
            ],
            "policies": "Outside caterers allowed. Decor must be approved.",
            "rating": 4.5,
            "review_count": 89,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Sapphire Convention Centre",
            "description": "Modern convention centre ideal for corporate events, conferences, and exhibitions.",
            "city": "Noida",
            "area": "Sector 18",
            "address": "Plot 12, Sector 18, Near Atta Market",
            "pincode": "201301",
            "latitude": 28.5700,
            "longitude": 77.3219,
            "event_types": ["corporate", "conference", "exhibition", "product_launch"],
            "venue_type": "convention_center",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 500,
            "pricing": {
                "price_per_plate_veg": 800,
                "price_per_plate_nonveg": 1000,
                "min_spend": 100000,
                "packages": [
                    {"name": "Half Day", "price": 75000, "hours": 4},
                    {"name": "Full Day", "price": 120000, "hours": 8}
                ]
            },
            "amenities": {
                "parking": True, "valet": False, "alcohol_allowed": False,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": False, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1759065662057-0c008c001d8d?w=800"
            ],
            "policies": "Corporate booking requires company details.",
            "rating": 4.2,
            "review_count": 45,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Heritage Palace Hotel",
            "description": "Luxurious 5-star hotel venue combining traditional elegance with modern amenities.",
            "city": "Delhi",
            "area": "Karol Bagh",
            "address": "15-A, Pusa Road, Karol Bagh",
            "pincode": "110005",
            "latitude": 28.6448,
            "longitude": 77.1900,
            "event_types": ["wedding", "reception", "engagement", "birthday", "anniversary"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 400,
            "pricing": {
                "price_per_plate_veg": 2500,
                "price_per_plate_nonveg": 3000,
                "min_spend": 400000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 120, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1708748144709-651ebdab3f96?w=800"
            ],
            "policies": "Room booking mandatory for events over 200 guests.",
            "rating": 4.7,
            "review_count": 234,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Sunset Terrace",
            "description": "Stunning rooftop venue with panoramic city views, perfect for intimate gatherings.",
            "city": "Gurgaon",
            "area": "Golf Course Road",
            "address": "Tower B, Golf Course Road, DLF Phase 5",
            "pincode": "122018",
            "latitude": 28.4595,
            "longitude": 77.1025,
            "event_types": ["cocktail", "birthday", "corporate", "engagement"],
            "venue_type": "rooftop",
            "indoor_outdoor": "outdoor",
            "capacity_min": 30,
            "capacity_max": 150,
            "pricing": {
                "price_per_plate_veg": 1500,
                "price_per_plate_nonveg": 2000,
                "min_spend": 150000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": False, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1677232519517-9dca7bacdfd3?w=800"
            ],
            "policies": "Weather-dependent venue. Backup indoor space available.",
            "rating": 4.6,
            "review_count": 67,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.venues.insert_many(venues_data)
    
    # Seed sample reviews
    reviews_data = [
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[0]["venue_id"],
            "user_id": "sample_user_1",
            "user_name": "Ananya Gupta",
            "rating": 5,
            "title": "Perfect wedding venue!",
            "content": "We had our wedding here and it was absolutely magical. The staff was incredibly helpful and the venue looked stunning.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "review_id": generate_id("review_"),
            "venue_id": venues_data[0]["venue_id"],
            "user_id": "sample_user_2",
            "user_name": "Vikram Malhotra",
            "rating": 4,
            "title": "Great venue, minor issues",
            "content": "Beautiful venue with excellent service. Only issue was parking during peak hours.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.reviews.insert_many(reviews_data)
    
    return {
        "message": "Data seeded successfully",
        "credentials": {
            "admin": {"email": "admin@bookmyvenue.in", "password": "admin123"},
            "rm": {"email": "rm1@bookmyvenue.in", "password": "rm123"},
            "venue_owner": {"email": "venue@bookmyvenue.in", "password": "venue123"}
        }
    }

# ============== HEALTH CHECK ==============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
