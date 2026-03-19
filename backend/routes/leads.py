"""
Lead/Client Case routes for VenuLoQ API.
Handles the complete lead lifecycle including shortlist, quotes, communications, etc.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone

from config import db
from models import (
    LeadCreate, LeadUpdate, LeadNote, LeadFollowUp, 
    CommunicationLogCreate, VenueShortlistCreate, QuoteCreate, PlannerMatchCreate
)
from utils import (
    generate_id, get_current_user, get_optional_user, require_role,
    create_audit_log, create_notification, send_email_async
)
from services import lead_service
from services import rm_analytics_service
from routes.push import send_push_to_user

router = APIRouter(tags=["leads"])


# ============== RM SELF-SERVICE PERFORMANCE ==============

@router.get("/rm/my-performance")
async def get_my_performance(user: dict = Depends(require_role("rm", "admin"))):
    """Get the logged-in RM's personal performance metrics + team averages"""
    rm_id = user["user_id"]
    return await rm_analytics_service.get_my_performance(rm_id)


@router.get("/rm/my-sla-alerts")
async def get_my_sla_alerts(user: dict = Depends(require_role("rm", "admin"))):
    """Get SLA alerts specific to the logged-in RM"""
    rm_id = user["user_id"]
    return await rm_analytics_service.get_my_sla_alerts(rm_id)


# ============== CUSTOMER MY-ENQUIRIES ==============

@router.get("/my-enquiries")
async def get_my_enquiries(user: dict = Depends(get_current_user)):
    """Get enquiries for the logged-in customer"""
    if user["role"] not in ["customer", "admin"]:
        raise HTTPException(status_code=403, detail="Only customers can access their enquiries")
    
    # Find leads by customer_id or customer_email
    query = {
        "$or": [
            {"customer_id": user["user_id"]},
            {"customer_email": user.get("email")}
        ]
    }
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return leads



# ============== LEAD CRUD ==============

@router.post("/leads")
async def create_lead(lead_data: LeadCreate, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    """Create a new lead/enquiry - Managed by VenuLoQ Experts"""
    lead_id = generate_id("lead_")
    
    # Auto-assign RM
    rm_id, rm_name = await lead_service.assign_rm_round_robin(lead_data.city)
    
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
        "city": lead_data.city,
        "area": lead_data.area,
        "rm_id": rm_id,
        "rm_name": rm_name,
        "stage": "new",
        # Attribution fields
        "source": lead_data.source or "Direct",
        "campaign": lead_data.campaign,
        "landing_page": lead_data.landing_page,
        # Rest of fields
        "planner_required": lead_data.planner_required,
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
        "confirmed_at": None
    }
    
    await db.leads.insert_one(lead)
    
    # Create audit log
    if user:
        await create_audit_log("lead", lead_id, "created", user, {"source": "website_enquiry"}, request)
    
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
    
    # Send email to customer
    await send_email_async(
        lead_data.customer_email,
        "Your enquiry has been received - VenuLoQ",
        f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #111111;">Thank you for your enquiry!</h1>
            <p>Dear {lead_data.customer_name},</p>
            <p>We have received your enquiry for a {lead_data.event_type} venue in {lead_data.city}.</p>
            <p style="background: #F9F9F7; padding: 15px; border-left: 4px solid #C8A960;">
                <strong>Managed by VenuLoQ Experts</strong><br>
                Our dedicated Relationship Manager will contact you within 24 hours.
            </p>
            <p>Your Reference: <strong>{lead_id}</strong></p>
        </div>
        """
    )
    
    lead.pop("_id", None)
    return {"lead_id": lead_id, "message": "Your enquiry has been received", "rm_name": rm_name}



@router.post("/callback-request")
async def create_callback_request(request: Request):
    """Quick callback request — just name + phone + venue. Auto-assigns RM."""
    body = await request.json()
    name = body.get("name", "").strip()
    phone = body.get("phone", "").strip()
    venue_id = body.get("venue_id", "")
    venue_name = body.get("venue_name", "")
    venue_city = body.get("venue_city", "")

    if not name or not phone:
        raise HTTPException(status_code=400, detail="Name and phone are required")

    # Auto-assign RM
    rm_id, rm_name = await lead_service.assign_rm_round_robin(venue_city)

    callback_id = generate_id("cb_")
    callback = {
        "callback_id": callback_id,
        "customer_name": name,
        "customer_phone": phone,
        "venue_id": venue_id,
        "venue_name": venue_name,
        "venue_city": venue_city,
        "rm_id": rm_id,
        "rm_name": rm_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.callback_requests.insert_one(callback)

    # Notify RM
    if rm_id:
        await create_notification(
            rm_id,
            "Callback Request",
            f"{name} requested a callback for {venue_name} ({phone})",
            "callback",
            {"callback_id": callback_id, "venue_id": venue_id}
        )

    return {"callback_id": callback_id, "message": "We'll call you within 30 minutes", "rm_name": rm_name}



@router.get("/leads")
async def list_leads(
    request: Request,
    stage: Optional[str] = None,
    rm_id: Optional[str] = None,
    city: Optional[str] = None,
    event_type: Optional[str] = None,
    source: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(require_role("rm", "admin"))
):
    """List leads with filters (RM sees their own, Admin sees all)"""
    query = {}
    
    if user["role"] == "rm":
        query["rm_id"] = user["user_id"]
    elif rm_id:
        query["rm_id"] = rm_id
    
    if stage:
        query["stage"] = stage
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if event_type:
        query["event_type"] = event_type
    if source:
        query["source"] = source
    if from_date:
        query["created_at"] = {"$gte": from_date}
    if to_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = to_date
        else:
            query["created_at"] = {"$lte": to_date}
    
    skip = (page - 1) * limit
    sort_direction = -1 if sort_order == "desc" else 1
    
    leads = await db.leads.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    total = await db.leads.count_documents(query)
    
    return {"leads": leads, "total": total, "page": page, "limit": limit}


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get lead details with all related data"""
    lead = await lead_service.get_lead_with_enriched_data(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "rm" and lead.get("rm_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return lead


@router.put("/leads/{lead_id}")
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
    is_admin = user.get("role") == "admin"
    payment_status = lead.get("payment_status")
    
    # PAYMENT-STATE PROTECTION: Check if lead is locked
    if payment_status == "payment_released" and not is_admin:
        await create_audit_log("lead", lead_id, "update_blocked", user, {
            "reason": "payment_released_lock",
            "attempted_changes": list(update_data.keys())
        }, request)
        raise HTTPException(
            status_code=403, 
            detail={
                "message": "Lead is locked (payment released)",
                "missing_requirements": ["Payment has been released to venue", "Only Admin can modify this lead"],
                "is_locked": True
            }
        )
    
    # PAYMENT-STATE PROTECTION RULE 2: venue_date_blocked requires advance_paid
    if update_data.get("venue_date_blocked") is True:
        if payment_status not in ["advance_paid", "payment_released"]:
            await create_audit_log("lead", lead_id, "venue_block_denied", user, {
                "reason": "advance_not_paid",
                "payment_status": payment_status
            }, request)
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Cannot mark venue date as blocked",
                    "missing_requirements": [
                        "Advance payment must be received before blocking venue date",
                        f"Current payment status: {payment_status or 'no payment'}"
                    ],
                    "requires_payment": True
                }
            )
    
    # STAGE TRANSITION VALIDATION
    new_stage = update_data.get("stage")
    if new_stage and new_stage != lead.get("stage"):
        is_valid, error_msg, missing_requirements = await lead_service.validate_stage_transition(lead, new_stage, update_data, user)
        
        if is_admin and payment_status in ["advance_paid", "payment_released"]:
            await create_audit_log("lead", lead_id, "admin_stage_override", user, {
                "from_stage": lead.get("stage"),
                "to_stage": new_stage,
                "payment_status": payment_status
            }, request)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail={
                "message": error_msg,
                "missing_requirements": missing_requirements,
                "current_stage": lead.get("stage"),
                "target_stage": new_stage
            })
        
        if new_stage == "booking_confirmed":
            update_data["confirmed_at"] = now
            if lead.get("venue_commission_status") in [None, "", "pending", "projected"]:
                if lead.get("venue_commission_rate") or lead.get("venue_commission_flat"):
                    update_data["venue_commission_status"] = "confirmed"
                    update_data["venue_commission_confirmed_at"] = now
            if lead.get("planner_commission_status") in [None, "", "pending", "projected"]:
                if lead.get("planner_commission_rate") or lead.get("planner_commission_flat"):
                    update_data["planner_commission_status"] = "confirmed"
                    update_data["planner_commission_confirmed_at"] = now
        
        if new_stage == "contacted" and not lead.get("first_contacted_at"):
            update_data["first_contacted_at"] = now
        
        changes["stage"] = {"from": lead.get("stage"), "to": new_stage}
    
    # Track other changes
    for key, value in update_data.items():
        if key != "stage" and lead.get(key) != value:
            changes[key] = {"from": lead.get(key), "to": value}
    
    # Recalculate commissions if deal value changed
    deal_value = update_data.get("deal_value") or lead.get("deal_value")
    if deal_value:
        venue_rate = update_data.get("venue_commission_rate") or lead.get("venue_commission_rate")
        venue_flat = update_data.get("venue_commission_flat") or lead.get("venue_commission_flat")
        planner_rate = update_data.get("planner_commission_rate") or lead.get("planner_commission_rate")
        planner_flat = update_data.get("planner_commission_flat") or lead.get("planner_commission_flat")
        
        if venue_rate:
            update_data["venue_commission_calculated"] = deal_value * (venue_rate / 100)
        elif venue_flat:
            update_data["venue_commission_calculated"] = venue_flat
        
        if planner_rate:
            update_data["planner_commission_calculated"] = deal_value * (planner_rate / 100)
        elif planner_flat:
            update_data["planner_commission_calculated"] = planner_flat
        
        # Set commission status to projected if not already set
        if not lead.get("venue_commission_status") and (venue_rate or venue_flat):
            update_data["venue_commission_status"] = "projected"
        if not lead.get("planner_commission_status") and (planner_rate or planner_flat):
            update_data["planner_commission_status"] = "projected"
    
    update_data["updated_at"] = now
    
    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    # Create audit log
    await create_audit_log("lead", lead_id, "updated", user, changes, request)
    
    # Notify customer of stage change
    if new_stage and lead.get("customer_id"):
        stage_messages = {
            "contacted": "Our RM has started working on your enquiry",
            "shortlisted": "We have shortlisted venues for you",
            "site_visit": "Site visits have been scheduled",
            "negotiation": "We are negotiating the best deal for you",
            "booking_confirmed": "Congratulations! Your booking is confirmed"
        }
        if new_stage in stage_messages:
            await create_notification(
                lead["customer_id"],
                "Enquiry Update",
                stage_messages[new_stage],
                "lead_update",
                {"lead_id": lead_id, "stage": new_stage}
            )
            # Send push notification
            venue_name = lead.get("venue_name") or "your venue"
            await send_push_to_user(
                user_id=lead["customer_id"],
                title="VenuLoQ — Enquiry Update",
                body=f"{venue_name}: {stage_messages[new_stage]}",
                url="/my-enquiries",
            )
    
    return {"message": "Lead updated", "changes": changes}


@router.get("/leads/{lead_id}/stage-requirements")
async def get_lead_stage_requirements(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get stage transition requirements for a lead"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return await lead_service.get_stage_requirements(lead, user)


# ============== LEAD NOTES ==============

@router.post("/leads/{lead_id}/notes")
async def add_lead_note(lead_id: str, note: LeadNote, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Add a note to a lead"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    note_entry = {
        "note_id": generate_id("note_"),
        "lead_id": lead_id,
        "content": note.content,
        "note_type": note.note_type,
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lead_notes.insert_one(note_entry)
    
    await create_audit_log("lead", lead_id, "note_added", user, {"note_type": note.note_type}, request)
    
    note_entry.pop("_id", None)
    return note_entry


@router.get("/leads/{lead_id}/notes")
async def get_lead_notes(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get all notes for a lead"""
    notes = await db.lead_notes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes


# ============== FOLLOW-UPS ==============

@router.post("/leads/{lead_id}/follow-ups")
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
        "status": "pending",
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follow_ups.insert_one(follow_up_entry)
    
    # Notify RM
    await create_notification(
        lead.get("rm_id") or user["user_id"],
        "Follow-up Scheduled",
        f"Follow-up for {lead.get('customer_name')}: {follow_up.description}",
        "follow_up",
        {"lead_id": lead_id, "follow_up_id": follow_up_entry["follow_up_id"]}
    )
    
    follow_up_entry.pop("_id", None)
    return follow_up_entry


@router.put("/leads/{lead_id}/follow-ups/{follow_up_id}")
async def update_follow_up(lead_id: str, follow_up_id: str, status: str, user: dict = Depends(require_role("rm", "admin"))):
    """Update follow-up status"""
    await db.follow_ups.update_one(
        {"follow_up_id": follow_up_id, "lead_id": lead_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Follow-up updated"}


@router.get("/leads/{lead_id}/follow-ups")
async def get_follow_ups(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get all follow-ups for a lead"""
    follow_ups = await db.follow_ups.find({"lead_id": lead_id}, {"_id": 0}).sort("scheduled_at", 1).to_list(100)
    return follow_ups


# ============== COMMUNICATIONS ==============

@router.post("/leads/{lead_id}/communications")
async def log_communication(lead_id: str, comm: CommunicationLogCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Log a communication (call, email, etc.)"""
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
        "logged_at": datetime.now(timezone.utc).isoformat()
    }
    await db.communications.insert_one(comm_entry)
    
    # Update communication count
    await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"communication_count": 1}})
    
    await create_audit_log("lead", lead_id, "communication_logged", user, {"channel": comm.channel}, request)
    
    comm_entry.pop("_id", None)
    return comm_entry


@router.get("/leads/{lead_id}/communications")
async def get_communications(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get all communications for a lead"""
    comms = await db.communications.find({"lead_id": lead_id}, {"_id": 0}).sort("logged_at", -1).to_list(100)
    return comms


# ============== SHORTLIST ==============

@router.post("/leads/{lead_id}/shortlist")
async def add_to_shortlist(lead_id: str, shortlist_data: VenueShortlistCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Add venue to lead shortlist"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    venue = await db.venues.find_one({"venue_id": shortlist_data.venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Check if already in shortlist
    existing = await db.venue_shortlist.find_one({"lead_id": lead_id, "venue_id": shortlist_data.venue_id})
    if existing:
        raise HTTPException(status_code=400, detail="Venue already in shortlist")
    
    shortlist_entry = {
        "shortlist_id": generate_id("sl_"),
        "lead_id": lead_id,
        "venue_id": shortlist_data.venue_id,
        "venue_name": venue.get("name"),
        "notes": shortlist_data.notes,
        "proposed_price": shortlist_data.proposed_price,
        "status": shortlist_data.status,
        "added_by": user["user_id"],
        "added_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.venue_shortlist.insert_one(shortlist_entry)
    
    # Update shortlist count
    await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"shortlist_count": 1}})
    
    await create_audit_log("lead", lead_id, "venue_shortlisted", user, {"venue_id": shortlist_data.venue_id}, request)
    
    shortlist_entry.pop("_id", None)
    return shortlist_entry


@router.put("/leads/{lead_id}/shortlist/{shortlist_id}")
async def update_shortlist_item(lead_id: str, shortlist_id: str, status: Optional[str] = None, notes: Optional[str] = None, proposed_price: Optional[float] = None, user: dict = Depends(require_role("rm", "admin"))):
    """Update shortlist item"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if status:
        update_data["status"] = status
    if notes:
        update_data["notes"] = notes
    if proposed_price:
        update_data["proposed_price"] = proposed_price
    
    await db.venue_shortlist.update_one({"shortlist_id": shortlist_id, "lead_id": lead_id}, {"$set": update_data})
    return {"message": "Shortlist item updated"}


@router.delete("/leads/{lead_id}/shortlist/{shortlist_id}")
async def remove_from_shortlist(lead_id: str, shortlist_id: str, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Remove venue from shortlist"""
    result = await db.venue_shortlist.delete_one({"shortlist_id": shortlist_id, "lead_id": lead_id})
    if result.deleted_count:
        await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"shortlist_count": -1}})
        await create_audit_log("lead", lead_id, "venue_removed_from_shortlist", user, {"shortlist_id": shortlist_id}, request)
    return {"message": "Removed from shortlist"}


@router.get("/leads/{lead_id}/shortlist")
async def get_shortlist(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get lead shortlist with venue details"""
    shortlist = await db.venue_shortlist.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    venue_ids = [item["venue_id"] for item in shortlist]
    venues = await db.venues.find({"venue_id": {"$in": venue_ids}}, {"_id": 0}).to_list(50)
    venue_map = {v["venue_id"]: v for v in venues}
    for item in shortlist:
        item["venue"] = venue_map.get(item["venue_id"])
    return shortlist


# ============== QUOTES ==============

@router.post("/leads/{lead_id}/quotes")
async def create_quote(lead_id: str, quote_data: QuoteCreate, request: Request, user: dict = Depends(require_role("rm", "admin", "venue_owner", "event_planner"))):
    """Create a quote"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
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
        "status": "draft",
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_by_role": user["role"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quotes.insert_one(quote)
    
    # Update quote count
    await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"quote_count": 1}})
    
    await create_audit_log("lead", lead_id, "quote_created", user, {"quote_type": quote_data.quote_type, "amount": quote_data.amount}, request)
    
    quote.pop("_id", None)
    return quote


@router.get("/leads/{lead_id}/quotes")
async def get_quotes(lead_id: str, user: dict = Depends(require_role("rm", "admin", "venue_owner", "event_planner"))):
    """Get all quotes for a lead"""
    quotes = await db.quotes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return quotes


@router.put("/leads/{lead_id}/quotes/{quote_id}")
async def update_quote(lead_id: str, quote_id: str, status: str, user: dict = Depends(require_role("rm", "admin"))):
    """Update quote status"""
    await db.quotes.update_one(
        {"quote_id": quote_id, "lead_id": lead_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Quote updated"}


# ============== PLANNER MATCHES ==============

@router.post("/leads/{lead_id}/planner-matches")
async def add_planner_match(lead_id: str, match_data: PlannerMatchCreate, request: Request, user: dict = Depends(require_role("rm", "admin"))):
    """Match planner to lead"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    planner = await db.planners.find_one({"planner_id": match_data.planner_id}, {"_id": 0})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    match_entry = {
        "match_id": generate_id("match_"),
        "lead_id": lead_id,
        "planner_id": match_data.planner_id,
        "planner_name": planner.get("name"),
        "notes": match_data.notes,
        "budget_segment": match_data.budget_segment,
        "status": match_data.status,
        "matched_by": user["user_id"],
        "matched_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.planner_matches.insert_one(match_entry)
    
    # Update match count
    await db.leads.update_one({"lead_id": lead_id}, {"$inc": {"planner_match_count": 1}})
    
    # Notify planner
    planner_user = await db.users.find_one({"user_id": planner.get("user_id")}, {"_id": 0})
    if planner_user:
        await create_notification(
            planner_user["user_id"],
            "New Client Match",
            f"You have been matched with {lead.get('customer_name')} for {lead.get('event_type')}",
            "planner_match",
            {"lead_id": lead_id, "match_id": match_entry["match_id"]}
        )
    
    await create_audit_log("lead", lead_id, "planner_matched", user, {"planner_id": match_data.planner_id}, request)
    
    match_entry.pop("_id", None)
    return match_entry


@router.get("/leads/{lead_id}/planner-matches")
async def get_planner_matches(lead_id: str, user: dict = Depends(require_role("rm", "admin", "event_planner"))):
    """Get planner matches for a lead"""
    matches = await db.planner_matches.find({"lead_id": lead_id}, {"_id": 0}).to_list(20)
    planner_ids = [m["planner_id"] for m in matches]
    planners = await db.planners.find({"planner_id": {"$in": planner_ids}}, {"_id": 0}).to_list(20)
    planner_map = {p["planner_id"]: p for p in planners}
    for match in matches:
        match["planner"] = planner_map.get(match["planner_id"])
    return matches


# ============== REASSIGNMENT ==============

@router.put("/leads/{lead_id}/reassign")
async def reassign_lead(lead_id: str, new_rm_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    """Admin: Reassign lead to different RM"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_rm = await db.users.find_one({"user_id": new_rm_id, "role": "rm"}, {"_id": 0})
    if not new_rm:
        raise HTTPException(status_code=404, detail="RM not found")
    
    old_rm_id = lead.get("rm_id")
    
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"rm_id": new_rm_id, "rm_name": new_rm["name"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify new RM
    await create_notification(
        new_rm_id,
        "Lead Reassigned to You",
        f"Client case for {lead.get('customer_name')} has been assigned to you",
        "lead_reassign",
        {"lead_id": lead_id}
    )
    
    await create_audit_log("lead", lead_id, "reassigned", user, {"old_rm_id": old_rm_id, "new_rm_id": new_rm_id}, request)
    
    return {"message": "Lead reassigned", "new_rm": new_rm["name"]}


# ============== COMMISSION & EVENT COMPLETION ==============

@router.put("/leads/{lead_id}/complete-event")
async def complete_event(lead_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    """Admin: Mark event as completed (triggers commission to earned)"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("stage") != "booking_confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be completed")
    
    if lead.get("event_completed"):
        raise HTTPException(status_code=400, detail="Event already completed")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "event_completed": True,
        "event_completed_at": now,
        "event_completed_by": user["user_id"]
    }
    
    # Move commission status from confirmed -> earned
    if lead.get("venue_commission_status") == "confirmed":
        update_data["venue_commission_status"] = "earned"
    if lead.get("planner_commission_status") == "confirmed":
        update_data["planner_commission_status"] = "earned"
    
    await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    await create_audit_log("lead", lead_id, "event_completed", user, {
        "venue_commission_status": update_data.get("venue_commission_status"),
        "planner_commission_status": update_data.get("planner_commission_status")
    }, request)
    
    return {"message": "Event marked as completed, commissions marked as earned"}


@router.put("/leads/{lead_id}/commission-collected")
async def mark_commission_collected(lead_id: str, commission_type: str, request: Request, user: dict = Depends(require_role("admin"))):
    """Admin: Mark commission as collected"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if commission_type not in ["venue", "planner"]:
        raise HTTPException(status_code=400, detail="commission_type must be 'venue' or 'planner'")
    
    status_field = f"{commission_type}_commission_status"
    current_status = lead.get(status_field)
    
    if current_status != "earned":
        raise HTTPException(status_code=400, detail=f"Commission must be 'earned' before marking as collected (current: {current_status})")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {status_field: "collected", f"{commission_type}_commission_collected_at": now}}
    )
    
    await create_audit_log("lead", lead_id, "commission_collected", user, {
        "commission_type": commission_type,
        "collected_at": now
    }, request)
    
    return {"message": f"{commission_type.title()} commission marked as collected"}


@router.get("/leads/{lead_id}/commission-summary")
async def get_commission_summary(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get commission summary for a lead"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return await lead_service.get_commission_summary(lead)


@router.get("/leads/{lead_id}/activity")
async def get_lead_activity(lead_id: str, user: dict = Depends(require_role("rm", "admin"))):
    """Get activity log for a lead"""
    activities = await lead_service.get_lead_activity(lead_id)
    return {"lead_id": lead_id, "activities": activities}
