"""
OTP, Booking Requests, Partner Applications, and Venue Listing Applications for BookMyVenue.
"""
import random
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from config import db
from utils import generate_id, get_optional_user, create_audit_log, create_notification, send_email_async
from services import lead_service
from pymongo import ReturnDocument

router = APIRouter(tags=["booking"])

# ============== RMS AVAILABLE ==============

@router.get("/rms/available")
async def get_available_rms(city: Optional[str] = None, limit: int = 3):
    """Public: Get available Relationship Managers for RM selection step."""
    query = {"role": "rm", "status": "active"}
    rms_cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).limit(10)
    rms = await rms_cursor.to_list(10)

    if not rms:
        return []

    # Enrich each RM with their lead stats
    result = []
    for rm in rms:
        lead_count = await db.leads.count_documents({"rm_id": rm["user_id"], "stage": {"$ne": "lost"}})
        completed = await db.leads.count_documents({"rm_id": rm["user_id"], "event_completed": True})
        result.append({
            "user_id": rm["user_id"],
            "name": rm.get("name", "Venue Expert"),
            "email": rm.get("email", ""),
            "phone": rm.get("phone", ""),
            "picture": rm.get("picture"),
            "specialties": rm.get("specialties", ["Weddings", "Corporate Events", "Social Gatherings"]),
            "languages": rm.get("languages", ["English", "Hindi"]),
            "bio": rm.get("bio", "Experienced venue expert with deep knowledge of local venues and vendor relationships."),
            "rating": rm.get("rating", 4.8),
            "active_leads": lead_count,
            "completed_events": completed,
            "response_time": rm.get("response_time", "< 30 min"),
            "city_focus": rm.get("city_focus", city or "Pan India"),
        })

    # Sort by completed events (most experienced first)
    result.sort(key=lambda x: x["completed_events"], reverse=True)
    return result[:limit]


CITY_CODES = {
    "Delhi NCR": "DEL", "Delhi": "DEL", "New Delhi": "DEL",
    "Mumbai": "MUM", "Bangalore": "BLR", "Bengaluru": "BLR",
    "Hyderabad": "HYD", "Chennai": "CHE", "Pune": "PUN", "Kolkata": "KOL",
    "Jaipur": "JAI", "Goa": "GOA", "Udaipur": "UDR", "Lucknow": "LKO",
    "Chandigarh": "CHD", "Ahmedabad": "AMD", "Gurgaon": "GGN", "Gurugram": "GGN", "Noida": "NOI",
}


# ============== OTP ENDPOINTS ==============

class OTPSendRequest(BaseModel):
    phone: str

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str

@router.post("/otp/send")
async def send_otp(data: OTPSendRequest):
    phone = data.phone.strip().replace(" ", "").replace("-", "")
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.otp_codes.update_one(
        {"phone": phone},
        {"$set": {"otp": otp_code, "expires_at": expires_at.isoformat(), "verified": False}},
        upsert=True,
    )

    # In production, integrate SMS gateway (Twilio/MSG91).
    # For now, return success and log OTP for testing.
    import logging
    logging.getLogger(__name__).info(f"OTP for {phone}: {otp_code}")

    return {"message": "OTP sent successfully", "debug_otp": otp_code}


@router.post("/otp/verify")
async def verify_otp(data: OTPVerifyRequest):
    phone = data.phone.strip().replace(" ", "").replace("-", "")
    otp_record = await db.otp_codes.find_one({"phone": phone}, {"_id": 0})

    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

    if otp_record.get("otp") != data.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    expires_at = datetime.fromisoformat(otp_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    await db.otp_codes.update_one({"phone": phone}, {"$set": {"verified": True}})

    return {"message": "OTP verified successfully", "verified": True}


# ============== BOOKING REQUEST ==============

class BookingRequestCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    city: str
    event_type: str
    guest_count: Optional[int] = None
    guest_count_range: Optional[str] = None
    event_date: Optional[str] = None
    budget: Optional[float] = None
    investment_range: Optional[str] = None
    notes: Optional[str] = None
    venue_ids: List[str] = []
    area: Optional[str] = None
    planner_required: bool = False
    source: Optional[str] = "website"
    selected_rm_id: Optional[str] = None


async def generate_booking_id(city: str) -> str:
    code = CITY_CODES.get(city, "IND")
    counter = await db.counters.find_one_and_update(
        {"_id": f"booking_{code}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = counter["seq"] if counter else 1
    return f"BMV-{code}-{seq:06d}"


@router.post("/booking-requests")
async def create_booking_request(data: BookingRequestCreate, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    # Verify OTP was completed for this phone
    phone = data.customer_phone.strip().replace(" ", "").replace("-", "")
    otp_record = await db.otp_codes.find_one({"phone": phone}, {"_id": 0})
    if not otp_record or not otp_record.get("verified"):
        raise HTTPException(status_code=403, detail="Phone not verified. Please complete OTP verification first.")

    booking_id = await generate_booking_id(data.city)
    lead_id = generate_id("lead_")

    # Use selected RM if provided, otherwise auto-assign via round-robin
    if data.selected_rm_id:
        rm_user = await db.users.find_one({"user_id": data.selected_rm_id, "role": "rm"}, {"_id": 0})
        rm_id = data.selected_rm_id if rm_user else None
        rm_name = rm_user.get("name") if rm_user else None
        if not rm_id:
            rm_id, rm_name = await lead_service.assign_rm_round_robin(data.city)
    else:
        rm_id, rm_name = await lead_service.assign_rm_round_robin(data.city)

    lead = {
        "lead_id": lead_id,
        "booking_id": booking_id,
        "customer_name": data.customer_name,
        "customer_email": data.customer_email or "",
        "customer_phone": data.customer_phone,
        "customer_id": user["user_id"] if user else None,
        "event_type": data.event_type,
        "event_date": data.event_date,
        "guest_count": data.guest_count,
        "guest_count_range": data.guest_count_range,
        "budget": data.budget,
        "investment_range": data.investment_range,
        "preferences": data.notes or "",
        "venue_ids": data.venue_ids,
        "city": data.city,
        "area": data.area,
        "rm_id": rm_id,
        "rm_name": rm_name,
        "stage": "new",
        "source": data.source or "website",
        "campaign": None,
        "landing_page": None,
        "planner_required": data.planner_required,
        "assigned_planner_id": None,
        "assigned_planner_name": None,
        "requirement_summary": None,
        "deal_value": None,
        "venue_commission_type": "percentage",
        "venue_commission_rate": None,
        "venue_commission_flat": None,
        "venue_commission_calculated": None,
        "venue_commission_status": None,
        "venue_commission_confirmed_at": None,
        "planner_commission_type": "percentage",
        "planner_commission_rate": None,
        "planner_commission_flat": None,
        "planner_commission_calculated": None,
        "planner_commission_status": None,
        "planner_commission_confirmed_at": None,
        "contact_released": False,
        "event_completed": False,
        "event_completed_at": None,
        "event_completed_by": None,
        "shortlist_count": 0,
        "quote_count": 0,
        "planner_match_count": 0,
        "communication_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "first_contacted_at": None,
        "confirmed_at": None,
    }

    await db.leads.insert_one(lead)

    if user:
        await create_audit_log("lead", lead_id, "created", user, {"source": "booking_request", "booking_id": booking_id}, request)

    if rm_id:
        await create_notification(
            rm_id,
            "New Booking Request",
            f"New booking request {booking_id} from {data.customer_name} for {data.event_type} in {data.city}",
            "enquiry",
            {"lead_id": lead_id, "booking_id": booking_id},
        )

    if data.customer_email:
        await send_email_async(
            data.customer_email,
            f"Booking Request {booking_id} - BookMyVenue",
            f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0B1F3B;">Booking Request Confirmed</h1>
                <p>Dear {data.customer_name},</p>
                <p>Your booking request has been received and assigned to our expert team.</p>
                <p style="background: #F9F9F7; padding: 15px; border-left: 4px solid #C9A227;">
                    <strong>Booking Reference:</strong> {booking_id}<br>
                    <strong>Assigned RM:</strong> {rm_name or 'Being assigned'}<br>
                    <strong>Event:</strong> {data.event_type} in {data.city}
                </p>
                <p>Your Relationship Manager will contact you within 30 minutes during business hours.</p>
            </div>
            """,
        )

    # Clean OTP record
    await db.otp_codes.delete_one({"phone": phone})

    return {
        "booking_id": booking_id,
        "lead_id": lead_id,
        "rm_name": rm_name,
        "message": "Booking request created successfully",
        "status": "new",
    }



# ============== VENUE LISTING APPLICATION ==============

class VenueApplicationCreate(BaseModel):
    venue_name: str
    owner_name: str
    phone: str
    email: str
    city: str
    venue_type: Optional[str] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    description: Optional[str] = None
    website: Optional[str] = None

@router.post("/venue-applications")
async def submit_venue_application(data: VenueApplicationCreate):
    app_id = generate_id("vapp_")
    record = {
        "app_id": app_id,
        "venue_name": data.venue_name,
        "owner_name": data.owner_name,
        "phone": data.phone,
        "email": data.email,
        "city": data.city,
        "venue_type": data.venue_type,
        "capacity_min": data.capacity_min,
        "capacity_max": data.capacity_max,
        "description": data.description,
        "website": data.website,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.venue_applications.insert_one(record)

    # Notify admin
    await create_notification(
        user_id="admin",
        title="New Venue Application",
        message=f"New venue listing application: {data.venue_name} in {data.city} from {data.owner_name}",
        notif_type="venue_application",
    )

    # Confirmation email to applicant
    await send_email_async(
        to_email=data.email,
        subject="We received your venue listing application — BookMyVenue",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
            <h2 style="color:#0B1F3B">Hi {data.owner_name},</h2>
            <p>Thank you for submitting <strong>{data.venue_name}</strong> for listing on BookMyVenue.</p>
            <p>Our team will review your application and get back to you within <strong>2 business days</strong>.</p>
            <p style="color:#64748B;font-size:13px">Application ID: {app_id}</p>
        </div>
        """,
    )

    return {"app_id": app_id, "message": "Application submitted successfully"}


# ============== PARTNER APPLICATION (Event Management Companies) ==============

class PartnerApplicationCreate(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    email: str
    city: str
    service_area: Optional[str] = None
    team_size: Optional[str] = None
    events_per_year: Optional[str] = None
    services_offered: Optional[List[str]] = []
    description: Optional[str] = None
    website: Optional[str] = None

@router.post("/partner-applications")
async def submit_partner_application(data: PartnerApplicationCreate):
    app_id = generate_id("papp_")
    record = {
        "app_id": app_id,
        "company_name": data.company_name,
        "contact_name": data.contact_name,
        "phone": data.phone,
        "email": data.email,
        "city": data.city,
        "service_area": data.service_area,
        "team_size": data.team_size,
        "events_per_year": data.events_per_year,
        "services_offered": data.services_offered,
        "description": data.description,
        "website": data.website,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.partner_applications.insert_one(record)

    # Notify admin
    await create_notification(
        user_id="admin",
        title="New Partner Application",
        message=f"New partner application: {data.company_name} in {data.city} from {data.contact_name}",
        notif_type="partner_application",
    )

    # Confirmation email to applicant
    await send_email_async(
        to_email=data.email,
        subject="Partnership inquiry received — BookMyVenue",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
            <h2 style="color:#0B1F3B">Hi {data.contact_name},</h2>
            <p>Thank you for your interest in partnering with <strong>BookMyVenue</strong>.</p>
            <p>We'll review your application and reach out within <strong>2 business days</strong> to discuss how we can work together.</p>
            <p style="color:#64748B;font-size:13px">Reference ID: {app_id}</p>
        </div>
        """,
    )

    return {"app_id": app_id, "message": "Partner application submitted successfully"}
