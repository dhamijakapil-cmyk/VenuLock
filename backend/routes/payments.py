"""
Payment routes for VenuLock API.
Handles Razorpay payment orders, verification, webhooks, and release.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timezone
import logging

from config import db, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from models import PaymentCreate, PaymentVerify, PaymentRelease
from utils import generate_id, require_role, create_audit_log, create_notification
from services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger(__name__)


@router.post("/create-order")
async def create_payment_order(
    payment_data: PaymentCreate, 
    request: Request, 
    user: dict = Depends(require_role("rm", "admin"))
):
    """Create a payment order for booking advance collection"""
    
    # Validate lead exists and is in appropriate stage
    lead = await db.leads.find_one({"lead_id": payment_data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("stage") not in ["negotiation", "booking_confirmed"]:
        raise HTTPException(status_code=400, detail="Lead must be in 'Negotiation' or 'Booking Confirmed' stage to create payment link")
    
    # Check for existing pending payment
    existing_payment = await db.payments.find_one({
        "lead_id": payment_data.lead_id,
        "status": {"$in": ["pending", "awaiting_advance"]}
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="A payment is already pending for this lead")
    
    deal_value = lead.get("deal_value", 0)
    if not deal_value:
        raise HTTPException(status_code=400, detail="Deal value must be set before creating payment order")
    
    # Get venue commission settings
    venue_id = lead.get("venue_ids", [None])[0] if lead.get("venue_ids") else None
    commission_settings = await payment_service.get_venue_commission_settings(venue_id)
    
    # Validate advance amount
    advance_percent = (payment_data.amount / deal_value) * 100
    min_advance = commission_settings["min_advance_percent"]
    max_advance = commission_settings["max_advance_percent"]
    
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
    
    amount_paise = int(payment_data.amount * 100)
    receipt = f"BMV_{payment_data.lead_id[:12]}"
    
    # Create Razorpay order
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        razorpay_order = payment_service.generate_mock_razorpay_order(amount_paise, receipt)
    else:
        try:
            import razorpay
            client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            razorpay_order = client.order.create({
                "amount": amount_paise,
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
    
    # Calculate payment breakdown
    breakdown = payment_service.calculate_payment_breakdown(
        deal_value, 
        payment_data.amount,
        commission_settings["commission_rate"],
        commission_settings.get("minimum_platform_fee")
    )
    
    now = datetime.now(timezone.utc).isoformat()
    payment_id = generate_id("pay_")
    
    # Generate payment link
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        payment_link = f"https://rzp.io/test/{razorpay_order['id']}"
    else:
        payment_link = f"https://rzp.io/i/{razorpay_order['id']}"
    
    payment_record = {
        "payment_id": payment_id,
        "lead_id": payment_data.lead_id,
        "order_id": razorpay_order["id"],
        "amount": payment_data.amount,
        "amount_paise": amount_paise,
        "currency": "INR",
        "status": "awaiting_advance",
        "payment_link": payment_link,
        "description": payment_data.description or f"Advance for {lead.get('event_type', 'Event')}",
        **breakdown,
        "created_at": now,
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    
    await db.payments.insert_one(payment_record)
    
    # Update lead with payment info
    await db.leads.update_one(
        {"lead_id": payment_data.lead_id},
        {"$set": {
            "payment_status": "awaiting_advance",
            "payment_details": {
                "payment_id": payment_id,
                "payment_link": payment_link,
                "amount": payment_data.amount,
                "created_at": now
            },
            "updated_at": now
        }}
    )
    
    # Send payment link to customer
    await payment_service.send_payment_link_notification(payment_record, lead)
    
    # Audit log
    await create_audit_log("payment", payment_id, "created", user, {
        "lead_id": payment_data.lead_id,
        "amount": payment_data.amount
    }, request)
    
    payment_record.pop("_id", None)
    return payment_record


@router.post("/verify")
async def verify_payment(payment_verify: PaymentVerify, request: Request):
    """Verify Razorpay payment signature and update status"""
    
    # Verify signature
    if not payment_service.verify_razorpay_signature(
        payment_verify.razorpay_order_id,
        payment_verify.razorpay_payment_id,
        payment_verify.razorpay_signature
    ):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    # Find payment
    payment = await db.payments.find_one({"order_id": payment_verify.razorpay_order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") in ["advance_paid", "payment_released"]:
        return {"message": "Payment already verified", "payment": payment}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment
    await db.payments.update_one(
        {"order_id": payment_verify.razorpay_order_id},
        {"$set": {
            "status": "advance_paid",
            "razorpay_payment_id": payment_verify.razorpay_payment_id,
            "paid_at": now
        }}
    )
    
    # Update lead
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    if lead:
        await db.leads.update_one(
            {"lead_id": payment["lead_id"]},
            {"$set": {
                "payment_status": "advance_paid",
                "stage": "booking_confirmed",
                "confirmed_at": now if not lead.get("confirmed_at") else lead["confirmed_at"],
                "updated_at": now
            }}
        )
        
        # Send confirmation
        await payment_service.send_payment_confirmation_notification(payment, lead)
        
        # Notify RM
        if lead.get("rm_id"):
            await create_notification(
                lead["rm_id"],
                "Payment Received!",
                f"Customer {lead.get('customer_name')} has paid ₹{payment.get('amount', 0):,.0f}",
                "payment",
                {"lead_id": payment["lead_id"], "payment_id": payment["payment_id"]}
            )
    
    payment["status"] = "advance_paid"
    payment["razorpay_payment_id"] = payment_verify.razorpay_payment_id
    payment["paid_at"] = now
    
    return {"message": "Payment verified successfully", "payment": payment}


@router.post("/webhook")
async def payment_webhook(request: Request):
    """Handle Razorpay webhook events"""
    try:
        body = await request.json()
        event = body.get("event")
        payload = body.get("payload", {}).get("payment", {}).get("entity", {})
        
        logger.info(f"Webhook received: {event}")
        
        if event == "payment.captured":
            order_id = payload.get("order_id")
            payment_id = payload.get("id")
            
            payment = await db.payments.find_one({"order_id": order_id}, {"_id": 0})
            if payment and payment.get("status") not in ["advance_paid", "payment_released"]:
                now = datetime.now(timezone.utc).isoformat()
                
                await db.payments.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "status": "advance_paid",
                        "razorpay_payment_id": payment_id,
                        "paid_at": now
                    }}
                )
                
                await db.leads.update_one(
                    {"lead_id": payment["lead_id"]},
                    {"$set": {
                        "payment_status": "advance_paid",
                        "stage": "booking_confirmed",
                        "updated_at": now
                    }}
                )
                
                logger.info(f"Payment {payment_id} marked as advance_paid via webhook")
        
        elif event == "payment.failed":
            order_id = payload.get("order_id")
            
            payment = await db.payments.find_one({"order_id": order_id}, {"_id": 0})
            if payment:
                await db.payments.update_one(
                    {"order_id": order_id},
                    {"$set": {"status": "payment_failed", "failed_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                await db.leads.update_one(
                    {"lead_id": payment["lead_id"]},
                    {"$set": {"payment_status": "payment_failed"}}
                )
                
                logger.info(f"Payment for order {order_id} marked as failed via webhook")
        
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.post("/{payment_id}/simulate-payment")
async def simulate_payment(payment_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    """[TEST MODE] Simulate a successful payment"""
    
    if RAZORPAY_KEY_ID != 'rzp_test_demo':
        raise HTTPException(status_code=400, detail="Simulation only available in test mode")
    
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") in ["advance_paid", "payment_released"]:
        raise HTTPException(status_code=400, detail="Payment already processed")
    
    now = datetime.now(timezone.utc).isoformat()
    mock_payment_id = f"pay_sim_{generate_id('')[:12]}"
    
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {
            "status": "advance_paid",
            "razorpay_payment_id": mock_payment_id,
            "paid_at": now,
            "simulated": True
        }}
    )
    
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    if lead:
        await db.leads.update_one(
            {"lead_id": payment["lead_id"]},
            {"$set": {
                "payment_status": "advance_paid",
                "stage": "booking_confirmed",
                "confirmed_at": now if not lead.get("confirmed_at") else lead["confirmed_at"],
                "updated_at": now
            }}
        )
        
        await payment_service.send_payment_confirmation_notification(payment, lead)
    
    await create_audit_log("payment", payment_id, "simulated", user, {"mock_payment_id": mock_payment_id}, request)
    
    return {
        "message": "Payment simulated successfully",
        "payment_id": payment_id,
        "status": "advance_paid",
        "mock_razorpay_payment_id": mock_payment_id
    }


@router.post("/{payment_id}/release")
async def release_payment_to_venue(
    payment_id: str, 
    release_data: PaymentRelease, 
    request: Request, 
    user: dict = Depends(require_role("admin"))
):
    """Release payment to venue (minus commission)"""
    
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "advance_paid":
        raise HTTPException(status_code=400, detail=f"Payment must be 'advance_paid' to release (current: {payment.get('status')})")
    
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    
    now = datetime.now(timezone.utc).isoformat()
    
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
    
    if lead:
        await db.leads.update_one(
            {"lead_id": payment["lead_id"]},
            {"$set": {
                "payment_status": "payment_released",
                "updated_at": now
            }}
        )
        
        # Get venue for notification
        shortlist = await db.venue_shortlist.find_one(
            {"lead_id": payment["lead_id"], "status": {"$in": ["confirmed", "booked"]}}, 
            {"_id": 0}
        )
        if shortlist:
            venue = await db.venues.find_one({"venue_id": shortlist["venue_id"]}, {"_id": 0})
            if venue:
                await payment_service.send_payment_released_notification(payment, lead, venue)
    
    await create_audit_log("payment", payment_id, "released", user, {
        "net_to_vendor": payment.get("net_amount_to_vendor"),
        "commission": payment.get("commission_amount")
    }, request)
    
    # Notify admins
    admins = await db.users.find({"role": "admin", "user_id": {"$ne": user["user_id"]}}, {"_id": 0}).to_list(10)
    for admin in admins:
        await create_notification(
            admin["user_id"],
            "Payment Released",
            f"₹{payment.get('net_amount_to_vendor', 0):,.0f} released to venue",
            "payment_release",
            {"payment_id": payment_id, "lead_id": payment["lead_id"]}
        )
    
    return {
        "message": "Payment released to venue",
        "payment_id": payment_id,
        "net_amount_to_vendor": payment.get("net_amount_to_vendor"),
        "commission_retained": payment.get("commission_amount"),
        "released_at": now
    }


@router.get("/stats/summary")
async def get_payment_stats(user: dict = Depends(require_role("admin"))):
    """Get payment statistics summary"""
    return await payment_service.get_payment_stats()


@router.get("/analytics")
async def get_payment_analytics(user: dict = Depends(require_role("admin"))):
    """Get comprehensive payment analytics"""
    return await payment_service.get_payment_analytics()
