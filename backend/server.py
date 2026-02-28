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

# Lead Models
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

class LeadResponse(BaseModel):
    lead_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    event_type: str
    event_date: Optional[str] = None
    guest_count: Optional[int] = None
    budget: Optional[float] = None
    preferences: Optional[str] = None
    venue_ids: List[str]
    shortlisted_venues: List[str] = []
    city: str
    area: Optional[str] = None
    rm_id: Optional[str] = None
    rm_name: Optional[str] = None
    stage: str = "new"  # new, contacted, shortlisted, negotiation, site_visit, booking_confirmed, lost
    notes: List[Dict[str, Any]] = []
    follow_ups: List[Dict[str, Any]] = []
    booking_value: Optional[float] = None
    commission_percent: Optional[float] = None
    commission_amount: Optional[float] = None
    commission_status: str = "pending"  # pending, paid
    created_at: datetime
    updated_at: datetime
    customer_id: Optional[str] = None

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    rm_id: Optional[str] = None
    shortlisted_venues: Optional[List[str]] = None
    booking_value: Optional[float] = None
    commission_percent: Optional[float] = None
    commission_amount: Optional[float] = None
    commission_status: Optional[str] = None

class LeadNote(BaseModel):
    content: str

class LeadFollowUp(BaseModel):
    scheduled_at: str
    description: str

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
    except:
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
    
    # Venue type filter
    if venue_type:
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

# ============== LEAD ROUTES ==============

@api_router.post("/leads")
async def create_lead(lead_data: LeadCreate, user: Optional[dict] = Depends(get_optional_user)):
    """Create a new lead/enquiry"""
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
        "venue_ids": lead_data.venue_ids,
        "shortlisted_venues": [],
        "city": lead_data.city,
        "area": lead_data.area,
        "rm_id": rm_id,
        "rm_name": rm_name,
        "stage": "new",
        "notes": [],
        "follow_ups": [],
        "booking_value": None,
        "commission_percent": None,
        "commission_amount": None,
        "commission_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.insert_one(lead)
    
    # Notify RM
    if rm_id:
        await create_notification(
            rm_id,
            "New Lead Assigned",
            f"New enquiry from {lead_data.customer_name} for {lead_data.event_type}",
            "enquiry",
            {"lead_id": lead_id}
        )
    
    # Notify venue owners
    for venue_id in lead_data.venue_ids:
        venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
        if venue:
            await create_notification(
                venue["owner_id"],
                "New Enquiry",
                f"New enquiry for {venue['name']} from {lead_data.customer_name}",
                "enquiry",
                {"lead_id": lead_id, "venue_id": venue_id}
            )
    
    # Send email to customer
    await send_email_async(
        lead_data.customer_email,
        "Thank you for your enquiry - BookMyVenue",
        f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0B1F3B;">Thank you for your enquiry!</h1>
            <p>Dear {lead_data.customer_name},</p>
            <p>We have received your enquiry for a {lead_data.event_type} venue in {lead_data.city}.</p>
            <p>Our relationship manager will contact you shortly to help you find the perfect venue.</p>
            <p><strong>Enquiry Details:</strong></p>
            <ul>
                <li>Event Type: {lead_data.event_type}</li>
                <li>Expected Date: {lead_data.event_date or 'Not specified'}</li>
                <li>Guest Count: {lead_data.guest_count or 'Not specified'}</li>
            </ul>
            <p>Best regards,<br>BookMyVenue Team</p>
        </div>
        """
    )
    
    return {"lead_id": lead_id, "rm_assigned": rm_id is not None}

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
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check access
    if user["role"] not in ["admin", "rm"] and lead.get("customer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get venue details
    venues = []
    for venue_id in lead.get("venue_ids", []):
        venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
        if venue:
            venues.append(venue)
    lead["venues"] = venues
    
    # Get shortlisted venue details
    shortlisted = []
    for venue_id in lead.get("shortlisted_venues", []):
        venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
        if venue:
            shortlisted.append(venue)
    lead["shortlisted_venue_details"] = shortlisted
    
    return lead

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_data: LeadUpdate, user: dict = Depends(require_role("rm", "admin"))):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in lead_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate commission if booking value and percent are set
    if "booking_value" in update_data or "commission_percent" in update_data:
        bv = update_data.get("booking_value") or lead.get("booking_value")
        cp = update_data.get("commission_percent") or lead.get("commission_percent")
        if bv and cp:
            update_data["commission_amount"] = bv * (cp / 100)
    
    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    # Notify customer on stage change
    if "stage" in update_data and lead.get("customer_id"):
        await create_notification(
            lead["customer_id"],
            "Enquiry Update",
            f"Your enquiry status has been updated to: {update_data['stage'].replace('_', ' ').title()}",
            "lead_update",
            {"lead_id": lead_id}
        )
    
    return {"message": "Lead updated"}

@api_router.post("/leads/{lead_id}/notes")
async def add_lead_note(lead_id: str, note: LeadNote, user: dict = Depends(require_role("rm", "admin"))):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    note_entry = {
        "note_id": generate_id("note_"),
        "content": note.content,
        "added_by": user["user_id"],
        "added_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"notes": note_entry}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return note_entry

@api_router.post("/leads/{lead_id}/follow-ups")
async def add_follow_up(lead_id: str, follow_up: LeadFollowUp, user: dict = Depends(require_role("rm", "admin"))):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    follow_up_entry = {
        "follow_up_id": generate_id("fu_"),
        "scheduled_at": follow_up.scheduled_at,
        "description": follow_up.description,
        "added_by": user["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$push": {"follow_ups": follow_up_entry}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return follow_up_entry

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
        f"Your event planner profile has been approved!",
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
    
    # Commission stats
    commission_pipeline = [
        {"$match": {"commission_amount": {"$gt": 0}}},
        {"$group": {
            "_id": "$commission_status",
            "total": {"$sum": "$commission_amount"},
            "count": {"$sum": 1}
        }}
    ]
    commission_stats = await db.leads.aggregate(commission_pipeline).to_list(10)
    
    # Recent leads
    recent_leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_users": total_users,
        "total_venues": total_venues,
        "total_leads": total_leads,
        "leads_by_stage": {s["_id"]: s["count"] for s in stage_stats},
        "commission_stats": commission_stats,
        "recent_leads": recent_leads
    }

@api_router.get("/admin/rm-performance")
async def admin_rm_performance(user: dict = Depends(require_role("admin"))):
    """Get RM performance metrics"""
    rms = await db.users.find({"role": "rm"}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    performance = []
    for rm in rms:
        total_leads = await db.leads.count_documents({"rm_id": rm["user_id"]})
        converted = await db.leads.count_documents({"rm_id": rm["user_id"], "stage": "booking_confirmed"})
        
        # Calculate total commission
        pipeline = [
            {"$match": {"rm_id": rm["user_id"], "commission_amount": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]
        commission_result = await db.leads.aggregate(pipeline).to_list(1)
        total_commission = commission_result[0]["total"] if commission_result else 0
        
        performance.append({
            "rm": rm,
            "total_leads": total_leads,
            "converted": converted,
            "conversion_rate": (converted / total_leads * 100) if total_leads > 0 else 0,
            "total_commission": total_commission
        })
    
    return performance

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
