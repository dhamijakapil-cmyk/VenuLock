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

# BMV Commission Rate (default 10%)
BMV_COMMISSION_RATE = float(os.environ.get('BMV_COMMISSION_RATE', '10'))

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

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id("user_")
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in ["customer", "venue_owner", "event_planner"] else "customer",
        "picture": None,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id, user["role"])
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user["phone"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is not active")
    
    token = create_token(user["user_id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user.get("phone"),
            "picture": user.get("picture")
        }
    }

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google-session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Get session data from Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    auth_data = auth_response.json()
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        user_id = user["user_id"]
        role = user["role"]
    else:
        # Create new user
        user_id = generate_id("user_")
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "customer",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        role = "customer"
    
    # Store session
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "phone": user.get("phone"),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get('session_token')
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== VENUE ROUTES ==============

@api_router.get("/venues", response_model=List[VenueResponse])
async def search_venues(
    request: Request,
    city: Optional[str] = None,
    area: Optional[str] = None,
    pincode: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,  # in km
    event_type: Optional[str] = None,
    date: Optional[str] = None,
    guest_min: Optional[int] = None,
    guest_max: Optional[int] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    rating_min: Optional[float] = None,
    venue_type: Optional[str] = None,
    venue_types: Optional[str] = None,  # Comma-separated list for multi-select
    indoor_outdoor: Optional[str] = None,
    parking: Optional[bool] = None,
    valet: Optional[bool] = None,
    alcohol: Optional[bool] = None,
    rooms: Optional[bool] = None,
    ac: Optional[bool] = None,
    catering_inhouse: Optional[bool] = None,
    catering_outside: Optional[bool] = None,
    decor: Optional[bool] = None,
    sound: Optional[bool] = None,
    sort_by: Optional[str] = "popular",  # price_low, price_high, distance, rating, popular, newest
    page: int = 1,
    limit: int = 20
):
    """Search venues with advanced filters"""
    query = {"status": "approved"}
    
    # Location filters
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    if pincode:
        query["pincode"] = pincode
    
    # Event type filter
    if event_type:
        query["event_types"] = {"$in": [event_type]}
    
    # Guest count filter
    if guest_min:
        query["capacity_max"] = {"$gte": guest_min}
    if guest_max:
        query["capacity_min"] = {"$lte": guest_max}
    
    # Price per plate filter
    if price_min:
        query["$or"] = [
            {"pricing.price_per_plate_veg": {"$gte": price_min}},
            {"pricing.price_per_plate_nonveg": {"$gte": price_min}}
        ]
    if price_max:
        query["$or"] = query.get("$or", []) + [
            {"pricing.price_per_plate_veg": {"$lte": price_max}},
            {"pricing.price_per_plate_nonveg": {"$lte": price_max}}
        ]
    
    # Rating filter
    if rating_min:
        query["rating"] = {"$gte": rating_min}
    
    # Venue type filter (single or multi-select)
    if venue_types:
        # Multi-select: comma-separated list
        types_list = [t.strip() for t in venue_types.split(',') if t.strip()]
        if types_list:
            query["venue_type"] = {"$in": types_list}
    elif venue_type:
        query["venue_type"] = venue_type
    if indoor_outdoor:
        query["indoor_outdoor"] = indoor_outdoor
    
    # Amenities filters
    amenity_filters = {}
    if parking:
        amenity_filters["amenities.parking"] = True
    if valet:
        amenity_filters["amenities.valet"] = True
    if alcohol:
        amenity_filters["amenities.alcohol_allowed"] = True
    if rooms:
        amenity_filters["amenities.rooms_available"] = {"$gt": 0}
    if ac:
        amenity_filters["amenities.ac"] = True
    if catering_inhouse:
        amenity_filters["amenities.catering_inhouse"] = True
    if catering_outside:
        amenity_filters["amenities.catering_outside_allowed"] = True
    if decor:
        amenity_filters["amenities.decor_inhouse"] = True
    if sound:
        amenity_filters["amenities.sound_system"] = True
    
    query.update(amenity_filters)
    
    # Get venues
    skip = (page - 1) * limit
    venues = await db.venues.find(query, {"_id": 0}).skip(skip).limit(limit * 3).to_list(limit * 3)
    
    # Calculate distances if coordinates provided
    if lat and lng:
        for venue in venues:
            venue["distance"] = haversine_distance(lat, lng, venue["latitude"], venue["longitude"])
        
        # Filter by radius
        if radius:
            venues = [v for v in venues if v["distance"] <= radius]
    
    # Sorting
    if sort_by == "price_low":
        venues.sort(key=lambda v: v.get("pricing", {}).get("price_per_plate_veg") or 999999)
    elif sort_by == "price_high":
        venues.sort(key=lambda v: v.get("pricing", {}).get("price_per_plate_veg") or 0, reverse=True)
    elif sort_by == "distance" and lat and lng:
        venues.sort(key=lambda v: v.get("distance", 999999))
    elif sort_by == "rating":
        venues.sort(key=lambda v: v.get("rating", 0), reverse=True)
    elif sort_by == "newest":
        venues.sort(key=lambda v: v.get("created_at", ""), reverse=True)
    else:  # popular
        venues.sort(key=lambda v: (v.get("rating", 0) * v.get("review_count", 0)), reverse=True)
    
    return venues[:limit]

@api_router.get("/venues/{venue_id}")
async def get_venue(venue_id: str, lat: Optional[float] = None, lng: Optional[float] = None):
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if lat and lng:
        venue["distance"] = haversine_distance(lat, lng, venue["latitude"], venue["longitude"])
    
    # Get reviews
    reviews = await db.reviews.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    venue["reviews"] = reviews
    
    return venue

@api_router.post("/venues")
async def create_venue(venue_data: VenueCreate, user: dict = Depends(require_role("venue_owner", "admin"))):
    venue_id = generate_id("venue_")
    venue = {
        "venue_id": venue_id,
        "owner_id": user["user_id"],
        **venue_data.model_dump(),
        "rating": 0.0,
        "review_count": 0,
        "status": "pending" if user["role"] != "admin" else "approved",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.venues.insert_one(venue)
    
    # Notify admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(100)
    for admin in admins:
        await create_notification(
            admin["user_id"],
            "New Venue Submission",
            f"New venue '{venue_data.name}' submitted for approval",
            "approval",
            {"venue_id": venue_id}
        )
    
    return {"venue_id": venue_id, "status": venue["status"]}

@api_router.put("/venues/{venue_id}")
async def update_venue(venue_id: str, venue_data: VenueUpdate, user: dict = Depends(require_role("venue_owner", "admin"))):
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if user["role"] != "admin" and venue["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in venue_data.model_dump().items() if v is not None}
    if update_data:
        await db.venues.update_one({"venue_id": venue_id}, {"$set": update_data})
    
    return {"message": "Venue updated"}

@api_router.get("/venues/{venue_id}/availability")
async def get_venue_availability(venue_id: str, month: Optional[str] = None):
    """Get venue availability for a month"""
    query = {"venue_id": venue_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    slots = await db.venue_availability.find(query, {"_id": 0}).to_list(100)
    return {"venue_id": venue_id, "slots": slots}

@api_router.put("/venues/{venue_id}/availability")
async def update_venue_availability(
    venue_id: str,
    availability: AvailabilityUpdate,
    user: dict = Depends(require_role("venue_owner", "admin"))
):
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if user["role"] != "admin" and venue["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for slot in availability.slots:
        await db.venue_availability.update_one(
            {"venue_id": venue_id, "date": slot.date},
            {"$set": {
                "venue_id": venue_id,
                "date": slot.date,
                "status": slot.status,
                "event_type": slot.event_type,
                "notes": slot.notes
            }},
            upsert=True
        )
    
    return {"message": "Availability updated"}

@api_router.get("/my-venues")
async def get_my_venues(user: dict = Depends(require_role("venue_owner", "admin"))):
    """Get venues owned by current user"""
    if user["role"] == "admin":
        venues = await db.venues.find({}, {"_id": 0}).to_list(1000)
    else:
        venues = await db.venues.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return venues

# ============== LEAD ROUTES (MANAGED CONCIERGE PLATFORM) ==============

@api_router.post("/leads")
async def create_lead(lead_data: LeadCreate, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    """Create a new lead/enquiry - Managed by BookMyVenue Experts"""
    lead_id = generate_id("lead_")
    
    # Auto-assign RM
    rm_id = await assign_rm_round_robin(lead_data.city)
    rm_name = None
    if rm_id:
        rm = await db.users.find_one({"user_id": rm_id}, {"_id": 0})
        rm_name = rm["name"] if rm else None
    
    lead = {
        "lead_id": lead_id,
        "customer_name": lead_data.customer_name,
        "customer_email": lead_data.customer_email,
        "customer_phone": lead_data.customer_phone,
        "customer_id": user["user_id"] if user else None,
        "event_type": lead_data.event_type,
        "event_date": lead_data.event_date,
        "guest_count": lead_data.guest_count,
        "budget": lead_data.budget,
        "preferences": lead_data.preferences,
        "venue_ids": lead_data.venue_ids,  # Initial venues customer inquired about
        "city": lead_data.city,
        "area": lead_data.area,
        "rm_id": rm_id,
        "rm_name": rm_name,
        "stage": "new",
        # Event planning requirement
        "planner_required": lead_data.planner_required,
        "assigned_planner_id": None,
        "assigned_planner_name": None,
        # Enhanced fields for managed platform
        "requirement_summary": None,
        "deal_value": None,
        # Venue commission (with lifecycle status)
        "venue_commission_type": "percentage",
        "venue_commission_rate": None,
        "venue_commission_flat": None,
        "venue_commission_calculated": None,
        "venue_commission_status": None,  # projected -> confirmed -> earned -> collected
        "venue_commission_confirmed_at": None,  # For commission age calculation
        # Planner commission (with lifecycle status)
        "planner_commission_type": "percentage",
        "planner_commission_rate": None,
        "planner_commission_flat": None,
        "planner_commission_calculated": None,
        "planner_commission_status": None,  # projected -> confirmed -> earned -> collected
        "planner_commission_confirmed_at": None,  # For commission age calculation
        # Contact visibility control
        "contact_released": False,
        # Event completion (admin only)
        "event_completed": False,
        "event_completed_at": None,
        "event_completed_by": None,
        # Collections stored separately but referenced here
        "shortlist_count": 0,
        "quote_count": 0,
        "planner_match_count": 0,
        "communication_count": 0,
        # Timestamps
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "first_contacted_at": None,
        "confirmed_at": None
    }
    
    await db.leads.insert_one(lead)
    
    # Create audit log
    if user:
        await create_audit_log("lead", lead_id, "created", user if user else {"user_id": "guest", "name": "Guest", "role": "customer"}, {"source": "website_enquiry"}, request)
    
    # Notify RM
    if rm_id:
        planner_tag = " [PLANNER REQUIRED]" if lead_data.planner_required else ""
        await create_notification(
            rm_id,
            f"New Client Case Assigned{planner_tag}",
            f"New enquiry from {lead_data.customer_name} for {lead_data.event_type} in {lead_data.city}",
            "enquiry",
            {"lead_id": lead_id, "planner_required": lead_data.planner_required}
        )
    
    # Send email to customer (managed platform messaging)
    await send_email_async(
        lead_data.customer_email,
        "Your enquiry has been received - BookMyVenue",
        f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0B1F3B;">Thank you for your enquiry!</h1>
            <p>Dear {lead_data.customer_name},</p>
            <p>We have received your enquiry for a {lead_data.event_type} venue in {lead_data.city}.</p>
            <p style="background: #F9F9F7; padding: 15px; border-left: 4px solid #C9A227;">
                <strong>Managed by BookMyVenue Experts</strong><br>
                Our dedicated Relationship Manager will contact you within 24 hours to understand your requirements and help you find the perfect venue.
            </p>
            <p><strong>What happens next?</strong></p>
            <ol>
                <li>Our RM will call you to discuss your requirements</li>
                <li>We'll shortlist the best venues matching your needs</li>
                <li>We'll negotiate the best deals on your behalf</li>
                <li>We'll coordinate site visits and handle all paperwork</li>
            </ol>
            <p><strong>Enquiry Details:</strong></p>
            <ul>
                <li>Event Type: {lead_data.event_type}</li>
                <li>Expected Date: {lead_data.event_date or 'Not specified'}</li>
                <li>Guest Count: {lead_data.guest_count or 'Not specified'}</li>
                <li>Budget: {'₹' + str(lead_data.budget) if lead_data.budget else 'Not specified'}</li>
            </ul>
            <p style="color: #64748B; font-size: 12px;">
                Note: For the best experience, all venue communications go through your dedicated BookMyVenue expert.
            </p>
            <p>Best regards,<br>BookMyVenue Team</p>
        </div>
        """
    )
    
    return {"lead_id": lead_id, "rm_assigned": rm_id is not None, "message": "Your enquiry is now being managed by BookMyVenue experts"}

@api_router.get("/leads")
async def get_leads(
    user: dict = Depends(require_role("rm", "admin")),
    stage: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get leads (for RM and Admin)"""
    query = {}
    
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]
    elif rm_id:
        query["rm_id"] = rm_id
    
    if stage:
        query["stage"] = stage
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    skip = (page - 1) * limit
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.leads.count_documents(query)
    
    return {"leads": leads, "total": total, "page": page, "limit": limit}

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    """Get full lead details including shortlists, quotes, communication logs"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check access
    if user["role"] not in ["admin", "rm"] and lead.get("customer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get venue shortlist
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    for item in shortlist:
        venue = await db.venues.find_one({"venue_id": item["venue_id"]}, {"_id": 0})
        item["venue"] = venue
    lead["shortlist"] = shortlist
    
    # Get quotes
    quotes = await db.quotes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    lead["quotes"] = quotes
    
    # Get planner matches
    planner_matches = await db.planner_matches.find({"lead_id": lead_id}, {"_id": 0}).to_list(20)
    for match in planner_matches:
        planner = await db.planners.find_one({"planner_id": match["planner_id"]}, {"_id": 0})
        match["planner"] = planner
    lead["planner_matches"] = planner_matches
    
    # Get communication logs
    communications = await db.communication_logs.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    lead["communications"] = communications
    
    # Get follow-ups
    follow_ups = await db.follow_ups.find({"lead_id": lead_id}, {"_id": 0}).sort("scheduled_at", 1).to_list(50)
    lead["follow_ups"] = follow_ups
    
    # Get notes
    notes = await db.lead_notes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    lead["notes"] = notes
    
    # Get audit log (activity timeline)
    audit_logs = await db.audit_logs.find({"entity_id": lead_id}, {"_id": 0}).sort("performed_at", -1).to_list(50)
    lead["activity_timeline"] = audit_logs
    
    # Get initial venue details
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

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_data: LeadUpdate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Update lead with validation rules for managed platform"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in lead_data.model_dump().items() if v is not None}
    changes = {}
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate booking confirmation
    new_stage = update_data.get("stage")
    if new_stage == "booking_confirmed":
        # Merge with existing data to validate
        check_lead = {**lead, **update_data}
        is_valid, error_msg = validate_booking_confirmation(check_lead)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        update_data["confirmed_at"] = now
        
        # Move commission status from projected -> confirmed
        if lead.get("venue_commission_status") in [None, "", "pending", "projected"]:
            if lead.get("venue_commission_rate") or lead.get("venue_commission_flat") or update_data.get("venue_commission_rate") or update_data.get("venue_commission_flat"):
                update_data["venue_commission_status"] = "confirmed"
                update_data["venue_commission_confirmed_at"] = now
        
        if lead.get("planner_commission_status") in [None, "", "pending", "projected"]:
            if lead.get("planner_commission_rate") or lead.get("planner_commission_flat") or update_data.get("planner_commission_rate") or update_data.get("planner_commission_flat"):
                update_data["planner_commission_status"] = "confirmed"
                update_data["planner_commission_confirmed_at"] = now
    
    # Track stage change
    if new_stage and new_stage != lead.get("stage"):
        changes["stage"] = {"from": lead.get("stage"), "to": new_stage}
        if new_stage == "contacted" and not lead.get("first_contacted_at"):
            update_data["first_contacted_at"] = now
        # Auto-release contact at site_visit stage
        if can_release_contact(new_stage):
            update_data["contact_released"] = True
    
    # Calculate venue commission and handle status lifecycle
    deal_value = update_data.get("deal_value") or lead.get("deal_value")
    has_new_deal_value = "deal_value" in update_data and update_data["deal_value"]
    
    # Handle planner assignment (RM assigns planner)
    if update_data.get("assigned_planner_id"):
        planner = await db.users.find_one({"user_id": update_data["assigned_planner_id"], "role": "event_planner"}, {"_id": 0})
        if planner:
            update_data["assigned_planner_name"] = planner["name"]
            changes["planner_assigned"] = {"planner_id": planner["user_id"], "planner_name": planner["name"]}
            # Notify planner of assignment
            await create_notification(
                planner["user_id"],
                "New Client Case Assignment",
                f"You've been assigned to {lead.get('customer_name')}'s {lead.get('event_type')} event in {lead.get('city')}",
                "planner_assignment",
                {"lead_id": lead_id}
            )
    
    if deal_value:
        venue_comm_type = update_data.get("venue_commission_type") or lead.get("venue_commission_type")
        venue_rate = update_data.get("venue_commission_rate") or lead.get("venue_commission_rate")
        venue_flat = update_data.get("venue_commission_flat") or lead.get("venue_commission_flat")
        if venue_comm_type and (venue_rate or venue_flat):
            update_data["venue_commission_calculated"] = calculate_commission(deal_value, venue_comm_type, venue_rate, venue_flat)
            # Set to projected if no status yet and deal value is being set
            if has_new_deal_value and not lead.get("venue_commission_status"):
                update_data["venue_commission_status"] = "projected"
        
        # Calculate planner commission
        planner_comm_type = update_data.get("planner_commission_type") or lead.get("planner_commission_type")
        planner_rate = update_data.get("planner_commission_rate") or lead.get("planner_commission_rate")
        planner_flat = update_data.get("planner_commission_flat") or lead.get("planner_commission_flat")
        if planner_comm_type and (planner_rate or planner_flat):
            update_data["planner_commission_calculated"] = calculate_commission(deal_value, planner_comm_type, planner_rate, planner_flat)
            # Set to projected if no status yet and deal value is being set
            if has_new_deal_value and not lead.get("planner_commission_status"):
                update_data["planner_commission_status"] = "projected"
    
    update_data["updated_at"] = now
    
    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    # Create audit log
    await create_audit_log("lead", lead_id, "updated", user, changes, request)
    
    # Notify customer on stage change
    if "stage" in changes and lead.get("customer_id"):
        stage_messages = {
            "contacted": "Our expert has reviewed your enquiry and will contact you shortly.",
            "requirement_understood": "We've understood your requirements and are shortlisting venues for you.",
            "shortlisted": "We've curated a list of perfect venues for your event!",
            "site_visit": "Site visits have been scheduled. Check your email for details.",
            "negotiation": "We're negotiating the best deals for you.",
            "booking_confirmed": "Congratulations! Your booking has been confirmed!"
        }
        await create_notification(
            lead["customer_id"],
            "Enquiry Update",
            stage_messages.get(new_stage, f"Your enquiry status: {new_stage.replace('_', ' ').title()}"),
            "lead_update",
            {"lead_id": lead_id, "stage": new_stage}
        )
    
    return {"message": "Lead updated", "changes": changes}

# ============== LEAD NOTES ==============

@api_router.post("/leads/{lead_id}/notes")
async def add_lead_note(lead_id: str, note: LeadNote, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Add a note to a lead (negotiation notes, requirement notes, etc.)"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    note_entry = {
        "note_id": generate_id("note_"),
        "lead_id": lead_id,
        "content": note.content,
        "note_type": note.note_type,
        "added_by": user["user_id"],
        "added_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lead_notes.insert_one(note_entry)
    await db.leads.update_one({"lead_id": lead_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    
    # Create audit log
    await create_audit_log("lead", lead_id, "note_added", user, {"note_type": note.note_type}, request)
    
    # Remove MongoDB _id before returning
    note_entry.pop("_id", None)
    return note_entry

@api_router.get("/leads/{lead_id}/notes")
async def get_lead_notes(lead_id: str, note_type: Optional[str] = None, user: dict = Depends(require_role("rm", "admin"))):
    """Get all notes for a lead"""
    query = {"lead_id": lead_id}
    if note_type:
        query["note_type"] = note_type
    
    notes = await db.lead_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes

# ============== FOLLOW-UPS ==============

@api_router.post("/leads/{lead_id}/follow-ups")
async def add_follow_up(lead_id: str, follow_up: LeadFollowUp, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Schedule a follow-up for a lead"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    follow_up_entry = {
        "follow_up_id": generate_id("fu_"),
        "lead_id": lead_id,
        "scheduled_at": follow_up.scheduled_at,
        "description": follow_up.description,
        "follow_up_type": follow_up.follow_up_type,
        "added_by": user["user_id"],
        "added_by_name": user["name"],
        "status": "pending",  # pending, completed, cancelled
        "completed_at": None,
        "outcome": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.follow_ups.insert_one(follow_up_entry)
    
    # Create audit log
    await create_audit_log("lead", lead_id, "follow_up_scheduled", user, {"scheduled_at": follow_up.scheduled_at, "type": follow_up.follow_up_type}, request)
    
    # Remove MongoDB _id before returning
    follow_up_entry.pop("_id", None)
    return follow_up_entry

@api_router.put("/leads/{lead_id}/follow-ups/{follow_up_id}")
async def update_follow_up(lead_id: str, follow_up_id: str, status: str, outcome: Optional[str] = None, user: dict = Depends(require_role("rm", "admin"))):
    """Update follow-up status"""
    update_data = {"status": status}
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["outcome"] = outcome
    
    await db.follow_ups.update_one({"follow_up_id": follow_up_id, "lead_id": lead_id}, {"$set": update_data})
    return {"message": "Follow-up updated"}

@api_router.get("/leads/{lead_id}/follow-ups")
async def get_follow_ups(lead_id: str, status: Optional[str] = None, user: dict = Depends(require_role("rm", "admin"))):
    """Get follow-ups for a lead"""
    query = {"lead_id": lead_id}
    if status:
        query["status"] = status
    
    follow_ups = await db.follow_ups.find(query, {"_id": 0}).sort("scheduled_at", 1).to_list(100)
    return follow_ups

# ============== COMMUNICATION LOGS ==============

@api_router.post("/leads/{lead_id}/communications")
async def add_communication_log(lead_id: str, comm: CommunicationLogCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Log a communication with customer/venue/planner"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    comm_entry = {
        "comm_id": generate_id("comm_"),
        "lead_id": lead_id,
        "channel": comm.channel,
        "direction": comm.direction,
        "summary": comm.summary,
        "duration_minutes": comm.duration_minutes,
        "attachments": comm.attachments,
        "logged_by": user["user_id"],
        "logged_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.communication_logs.insert_one(comm_entry)
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"communication_count": 1}}
    )
    
    # Create audit log
    await create_audit_log("lead", lead_id, "communication_logged", user, {"channel": comm.channel, "direction": comm.direction}, request)
    
    # Remove MongoDB _id before returning
    comm_entry.pop("_id", None)
    return comm_entry

@api_router.get("/leads/{lead_id}/communications")
async def get_communications(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get communication logs for a lead"""
    communications = await db.communication_logs.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return communications

# ============== VENUE SHORTLIST ==============

@api_router.post("/leads/{lead_id}/shortlist")
async def add_to_shortlist(lead_id: str, shortlist: VenueShortlistCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Add a venue to lead's shortlist"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    venue = await db.venues.find_one({"venue_id": shortlist.venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Check if already in shortlist
    existing = await db.venue_shortlist.find_one({"lead_id": lead_id, "venue_id": shortlist.venue_id})
    if existing:
        raise HTTPException(status_code=400, detail="Venue already in shortlist")
    
    shortlist_entry = {
        "shortlist_id": generate_id("sl_"),
        "lead_id": lead_id,
        "venue_id": shortlist.venue_id,
        "venue_name": venue["name"],
        "notes": shortlist.notes,
        "proposed_price": shortlist.proposed_price,
        "status": shortlist.status,
        "added_by": user["user_id"],
        "added_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.venue_shortlist.insert_one(shortlist_entry)
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"shortlist_count": 1}}
    )
    
    # Create audit log
    await create_audit_log("lead", lead_id, "venue_shortlisted", user, {"venue_id": shortlist.venue_id, "venue_name": venue["name"]}, request)
    
    # Remove MongoDB _id before returning
    shortlist_entry.pop("_id", None)
    return shortlist_entry

@api_router.put("/leads/{lead_id}/shortlist/{shortlist_id}")
async def update_shortlist_item(lead_id: str, shortlist_id: str, status: str, notes: Optional[str] = None, user: dict = Depends(require_role("rm", "admin"))):
    """Update shortlist item status"""
    update_data = {"status": status}
    if notes:
        update_data["notes"] = notes
    
    await db.venue_shortlist.update_one({"shortlist_id": shortlist_id, "lead_id": lead_id}, {"$set": update_data})
    return {"message": "Shortlist updated"}

@api_router.delete("/leads/{lead_id}/shortlist/{shortlist_id}")
async def remove_from_shortlist(lead_id: str, shortlist_id: str, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Remove venue from shortlist"""
    item = await db.venue_shortlist.find_one({"shortlist_id": shortlist_id, "lead_id": lead_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")
    
    await db.venue_shortlist.delete_one({"shortlist_id": shortlist_id})
    await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"shortlist_count": -1}})
    
    # Create audit log
    await create_audit_log("lead", lead_id, "venue_removed_from_shortlist", user, {"venue_id": item["venue_id"]}, request)
    
    return {"message": "Removed from shortlist"}

@api_router.get("/leads/{lead_id}/shortlist")
async def get_shortlist(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get venue shortlist for a lead"""
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    
    # Enrich with venue details
    for item in shortlist:
        venue = await db.venues.find_one({"venue_id": item["venue_id"]}, {"_id": 0})
        item["venue"] = venue
    
    return shortlist

# ============== QUOTES ==============

@api_router.post("/leads/{lead_id}/quotes")
async def create_quote(lead_id: str, quote_data: QuoteCreate, request: Request, user: dict = Depends(require_role("rm", "admin", "venue_owner", "event_planner"))):
    """Create a quote (RM can create structured, venue/planner can upload PDF)"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Venue owners can only quote for their venues
    if user["role"] == "venue_owner":
        venue = await db.venues.find_one({"venue_id": quote_data.entity_id, "owner_id": user["user_id"]}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=403, detail="Not authorized to quote for this venue")
    
    # Planners can only quote for their profile
    if user["role"] == "event_planner":
        planner = await db.planners.find_one({"planner_id": quote_data.entity_id, "user_id": user["user_id"]}, {"_id": 0})
        if not planner:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    quote = {
        "quote_id": generate_id("quote_"),
        "lead_id": lead_id,
        "quote_type": quote_data.quote_type,
        "entity_id": quote_data.entity_id,
        "amount": quote_data.amount,
        "description": quote_data.description,
        "valid_until": quote_data.valid_until,
        "pdf_url": quote_data.pdf_url,
        "items": quote_data.items,
        "status": "submitted",  # submitted, accepted, rejected, expired
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_by_role": user["role"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotes.insert_one(quote)
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"quote_count": 1}}
    )
    
    # Create audit log
    await create_audit_log("lead", lead_id, "quote_created", user, {"quote_type": quote_data.quote_type, "amount": quote_data.amount}, request)
    
    # Remove MongoDB _id before returning
    quote.pop("_id", None)
    return quote

@api_router.get("/leads/{lead_id}/quotes")
async def get_quotes(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get all quotes for a lead"""
    quotes = await db.quotes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return quotes

@api_router.put("/leads/{lead_id}/quotes/{quote_id}")
async def update_quote_status(lead_id: str, quote_id: str, status: str, user: dict = Depends(require_role("rm", "admin"))):
    """Update quote status (accept/reject)"""
    await db.quotes.update_one({"quote_id": quote_id, "lead_id": lead_id}, {"$set": {"status": status}})
    return {"message": "Quote status updated"}

# ============== PLANNER MATCHES ==============

@api_router.post("/leads/{lead_id}/planner-matches")
async def add_planner_match(lead_id: str, match_data: PlannerMatchCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Match a planner to a lead"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    planner = await db.planners.find_one({"planner_id": match_data.planner_id}, {"_id": 0})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    match = {
        "match_id": generate_id("pm_"),
        "lead_id": lead_id,
        "planner_id": match_data.planner_id,
        "planner_name": planner["name"],
        "notes": match_data.notes,
        "budget_segment": match_data.budget_segment,
        "status": match_data.status,
        "matched_by": user["user_id"],
        "matched_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.planner_matches.insert_one(match)
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"planner_match_count": 1}}
    )
    
    # Notify planner
    await create_notification(
        planner["user_id"],
        "New Lead Match",
        f"You've been matched to a lead for {lead['event_type']} in {lead['city']}",
        "lead_match",
        {"lead_id": lead_id}
    )
    
    # Create audit log
    await create_audit_log("lead", lead_id, "planner_matched", user, {"planner_id": match_data.planner_id, "planner_name": planner["name"]}, request)
    
    # Remove MongoDB _id before returning
    match.pop("_id", None)
    return match

@api_router.get("/leads/{lead_id}/planner-matches")
async def get_planner_matches(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get planner matches for a lead"""
    matches = await db.planner_matches.find({"lead_id": lead_id}, {"_id": 0}).to_list(20)
    
    for match in matches:
        planner = await db.planners.find_one({"planner_id": match["planner_id"]}, {"_id": 0})
        match["planner"] = planner
    
    return matches

# ============== LEAD REASSIGNMENT ==============

@api_router.put("/leads/{lead_id}/reassign")
async def reassign_lead(lead_id: str, new_rm_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    """Reassign lead to different RM (admin only)"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_rm = await db.users.find_one({"user_id": new_rm_id, "role": "rm"}, {"_id": 0})
    if not new_rm:
        raise HTTPException(status_code=404, detail="RM not found")
    
    old_rm_id = lead.get("rm_id")
    
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {
            "rm_id": new_rm_id,
            "rm_name": new_rm["name"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify old RM
    if old_rm_id:
        await create_notification(
            old_rm_id,
            "Lead Reassigned",
            f"Lead {lead_id} has been reassigned to {new_rm['name']}",
            "lead_update",
            {"lead_id": lead_id}
        )
    
    # Notify new RM
    await create_notification(
        new_rm_id,
        "New Lead Assigned",
        f"Lead from {lead['customer_name']} has been assigned to you",
        "enquiry",
        {"lead_id": lead_id}
    )
    
    # Create audit log
    await create_audit_log("lead", lead_id, "reassigned", user, {"from_rm": old_rm_id, "to_rm": new_rm_id}, request)
    
    return {"message": "Lead reassigned", "new_rm": new_rm["name"]}

# ============== EVENT COMPLETION & COMMISSION LIFECYCLE ==============

@api_router.put("/leads/{lead_id}/complete-event")
async def mark_event_completed(lead_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    """Mark event as completed - Admin only. Moves commission from Confirmed to Earned."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Validate event can be completed
    is_valid, error_msg = validate_event_completion(lead)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    if lead.get("event_completed"):
        raise HTTPException(status_code=400, detail="Event already marked as completed")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "event_completed": True,
        "event_completed_at": now,
        "event_completed_by": user["user_id"],
        "updated_at": now
    }
    
    # Move commission status from Confirmed -> Earned
    if lead.get("venue_commission_status") == "confirmed":
        update_data["venue_commission_status"] = "earned"
    if lead.get("planner_commission_status") == "confirmed":
        update_data["planner_commission_status"] = "earned"
    
    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    # Create audit log
    await create_audit_log("lead", lead_id, "event_completed", user, {
        "venue_commission_status": update_data.get("venue_commission_status"),
        "planner_commission_status": update_data.get("planner_commission_status")
    }, request)
    
    return {"message": "Event marked as completed, commission status moved to Earned"}

@api_router.put("/leads/{lead_id}/commission-collected")
async def mark_commission_collected(
    lead_id: str, 
    commission_type: str,  # "venue" or "planner"
    request: Request, 
    user: dict = Depends(require_role("admin"))
):
    """Mark commission as collected - Admin/Finance only. Moves from Earned to Collected."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if commission_type not in ["venue", "planner"]:
        raise HTTPException(status_code=400, detail="commission_type must be 'venue' or 'planner'")
    
    status_field = f"{commission_type}_commission_status"
    current_status = lead.get(status_field)
    
    if current_status != "earned":
        raise HTTPException(
            status_code=400, 
            detail=f"Commission must be in 'earned' status to mark as collected. Current: {current_status}"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        status_field: "collected",
        f"{commission_type}_commission_collected_at": now,
        "updated_at": now
    }
    
    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    # Create audit log
    await create_audit_log("lead", lead_id, f"{commission_type}_commission_collected", user, {
        "amount": lead.get(f"{commission_type}_commission_calculated")
    }, request)
    
    return {"message": f"{commission_type.title()} commission marked as collected"}

@api_router.get("/leads/{lead_id}/commission-summary")
async def get_commission_summary(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get commission summary with lifecycle status and age"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Calculate commission age (days since confirmed)
    venue_age = calculate_commission_age(lead.get("venue_commission_confirmed_at"))
    planner_age = calculate_commission_age(lead.get("planner_commission_confirmed_at"))
    
    return {
        "lead_id": lead_id,
        "deal_value": lead.get("deal_value"),
        "event_date": lead.get("event_date"),
        "event_completed": lead.get("event_completed", False),
        "event_completed_at": lead.get("event_completed_at"),
        "venue_commission": {
            "type": lead.get("venue_commission_type"),
            "rate": lead.get("venue_commission_rate"),
            "flat": lead.get("venue_commission_flat"),
            "calculated": lead.get("venue_commission_calculated"),
            "status": lead.get("venue_commission_status"),
            "confirmed_at": lead.get("venue_commission_confirmed_at"),
            "collected_at": lead.get("venue_commission_collected_at"),
            "age_days": venue_age
        },
        "planner_commission": {
            "type": lead.get("planner_commission_type"),
            "rate": lead.get("planner_commission_rate"),
            "flat": lead.get("planner_commission_flat"),
            "calculated": lead.get("planner_commission_calculated"),
            "status": lead.get("planner_commission_status"),
            "confirmed_at": lead.get("planner_commission_confirmed_at"),
            "collected_at": lead.get("planner_commission_collected_at"),
            "age_days": planner_age
        },
        "total_commission": (lead.get("venue_commission_calculated") or 0) + (lead.get("planner_commission_calculated") or 0)
    }

# ============== ACTIVITY TIMELINE ==============

@api_router.get("/leads/{lead_id}/activity")
async def get_lead_activity(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get activity timeline for a lead"""
    activities = await db.audit_logs.find({"entity_id": lead_id}, {"_id": 0}).sort("performed_at", -1).to_list(100)
    return activities

@api_router.get("/my-enquiries")
async def get_my_enquiries(user: dict = Depends(get_current_user)):
    """Get enquiries for logged-in customer"""
    leads = await db.leads.find(
        {"$or": [{"customer_id": user["user_id"]}, {"customer_email": user["email"]}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return leads

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
