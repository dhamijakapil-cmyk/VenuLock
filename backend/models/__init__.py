"""
Pydantic models for the VenuLoQ API.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime


# ============== USER MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None
    role: str = "customer"

class UserLogin(BaseModel):
    email: str  # Accepts both email and short username
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

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


# ============== RM ONBOARDING MODELS ==============

class RMCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class RMProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class RMVerificationAction(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None


# ============== VENUE MODELS ==============

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
    event_types: List[str] = []
    venue_type: str = "banquet_hall"
    indoor_outdoor: str = "indoor"
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
    status: str = "pending"
    created_at: datetime
    distance: Optional[float] = None
    slug: Optional[str] = None
    city_slug: Optional[str] = None

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


# ============== PAYMENT MODELS ==============

class PaymentCreate(BaseModel):
    lead_id: str
    amount: float
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

class VenueCommissionSettings(BaseModel):
    negotiated_commission_percent: Optional[float] = None
    minimum_platform_fee: Optional[float] = None
    min_advance_percent: Optional[float] = None
    max_advance_percent: Optional[float] = None


# ============== AVAILABILITY MODELS ==============

class AvailabilityEntry(BaseModel):
    date: str
    status: str = "available"
    time_slot: Optional[str] = None
    notes: Optional[str] = None

class AvailabilityBulkUpdate(BaseModel):
    dates: List[str]
    status: str
    time_slot: Optional[str] = None
    notes: Optional[str] = None

class DateHoldRequest(BaseModel):
    venue_id: str
    date: str
    lead_id: str
    time_slot: Optional[str] = "full_day"
    expiry_hours: int = 24

class DateHoldResponse(BaseModel):
    hold_id: str
    venue_id: str
    date: str
    lead_id: str
    status: str
    expires_at: str
    created_by: str

class DateHoldExtendRequest(BaseModel):
    extension_hours: int = 24

class AvailabilitySlot(BaseModel):
    date: str
    status: str = "available"
    event_type: Optional[str] = None
    notes: Optional[str] = None

class AvailabilityUpdate(BaseModel):
    slots: List[AvailabilitySlot]


# ============== LEAD MODELS ==============

class CommissionDetails(BaseModel):
    commission_type: str = "percentage"
    commission_rate: Optional[float] = None
    commission_flat_amount: Optional[float] = None
    commission_amount_calculated: Optional[float] = None
    commission_status: str = "projected"

class LeadCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    guest_count: Optional[int] = None
    guest_count_range: Optional[str] = None
    budget: Optional[float] = None
    preferences: Optional[str] = None
    venue_ids: List[str] = []
    city: str = ""
    area: Optional[str] = None
    planner_required: bool = False
    selected_rm_id: Optional[str] = None
    # Attribution fields
    source: Optional[str] = None
    campaign: Optional[str] = None
    landing_page: Optional[str] = None

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    rm_id: Optional[str] = None
    requirement_summary: Optional[str] = None
    event_date: Optional[str] = None
    deal_value: Optional[float] = None
    venue_commission_type: Optional[str] = None
    venue_commission_rate: Optional[float] = None
    venue_commission_flat: Optional[float] = None
    venue_commission_status: Optional[str] = None
    assigned_planner_id: Optional[str] = None
    planner_commission_type: Optional[str] = None
    planner_commission_rate: Optional[float] = None
    planner_commission_flat: Optional[float] = None
    planner_commission_status: Optional[str] = None
    contact_released: Optional[bool] = None
    venue_availability_confirmed: Optional[bool] = None
    venue_date_blocked: Optional[bool] = None

class LeadNote(BaseModel):
    content: str
    note_type: str = "general"

class LeadFollowUp(BaseModel):
    scheduled_at: str
    description: str
    follow_up_type: str = "call"

class CommunicationLogCreate(BaseModel):
    channel: str
    direction: str
    summary: str
    duration_minutes: Optional[int] = None
    attachments: List[str] = []

class VenueShortlistCreate(BaseModel):
    venue_id: str
    notes: Optional[str] = None
    proposed_price: Optional[float] = None
    status: str = "proposed"

class QuoteCreate(BaseModel):
    quote_type: str
    entity_id: str
    amount: float
    description: Optional[str] = None
    valid_until: Optional[str] = None
    pdf_url: Optional[str] = None
    items: List[Dict[str, Any]] = []

class PlannerMatchCreate(BaseModel):
    planner_id: str
    notes: Optional[str] = None
    budget_segment: Optional[str] = None
    status: str = "suggested"


# ============== AUDIT LOG MODELS ==============

class AuditLogEntry(BaseModel):
    entity_type: str
    entity_id: str
    action: str
    changes: Dict[str, Any] = {}
    performed_by: str
    performed_by_name: str
    performed_at: str
    ip_address: Optional[str] = None


# ============== CITY/AREA MODELS ==============

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


# ============== REVIEW MODELS ==============

class ReviewCreate(BaseModel):
    venue_id: str
    rating: int
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


# ============== PLANNER MODELS ==============

class PlannerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    services: List[str] = []
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
    status: str = "pending"
    created_at: datetime


# ============== NOTIFICATION MODELS ==============

class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool = False
    data: Optional[Dict[str, Any]] = None
    created_at: datetime
