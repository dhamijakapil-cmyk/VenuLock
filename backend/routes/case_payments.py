"""
Phase 16 — Case-linked Deposit Payment Layer.
Handles deposit requests, customer checkout, payment verification,
and settlement posture updates — all tied to a specific case/lead.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging

from config import db, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from utils import generate_id, require_role, get_current_user, create_audit_log, create_notification

router = APIRouter(prefix="/case-payments", tags=["case-payments"])
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class DepositRequest(BaseModel):
    amount: float
    purpose: str = "booking_deposit"
    description: Optional[str] = None
    customer_note: Optional[str] = None
    due_date: Optional[str] = None
    venue_id: Optional[str] = None
    venue_name: Optional[str] = None

class PaymentCheckout(BaseModel):
    pass  # no body needed — just triggers order creation

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class ReminderRequest(BaseModel):
    note: Optional[str] = None

# ──────────────────────────────────────────────
# Customer-friendly labels
# ──────────────────────────────────────────────

PURPOSE_LABELS = {
    "booking_deposit": "Booking Deposit",
    "site_visit_booking": "Site Visit Booking",
    "partial_milestone": "Milestone Payment",
    "final_payment": "Final Payment",
}

STATUS_LABELS = {
    "payment_requested": "Payment Requested",
    "payment_due": "Payment Due",
    "payment_in_progress": "Payment In Progress",
    "payment_success": "Payment Successful",
    "payment_failed": "Payment Failed — Retry Available",
    "payment_expired": "Payment Expired",
    "payment_cancelled": "Payment Cancelled",
    "payment_refunded": "Payment Refunded",
}

CUSTOMER_STATUS_MESSAGES = {
    "payment_requested": "Your relationship manager has requested a payment for your booking.",
    "payment_due": "A payment is due. Tap 'Pay Now' to proceed securely.",
    "payment_in_progress": "Your payment is being processed.",
    "payment_success": "Payment received! Your booking is progressing.",
    "payment_failed": "Payment could not be processed. You can retry below.",
    "payment_expired": "This payment request has expired. Contact your RM for a new one.",
    "payment_cancelled": "This payment request was cancelled.",
    "payment_refunded": "This payment has been refunded.",
}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc).isoformat()


def _sanitize_for_customer(payment: dict) -> dict:
    """Strip internal fields before sending to customer."""
    safe = {
        "payment_request_id": payment.get("payment_request_id"),
        "amount": payment.get("amount"),
        "purpose": payment.get("purpose"),
        "purpose_label": PURPOSE_LABELS.get(payment.get("purpose"), payment.get("purpose", "")),
        "description": payment.get("description"),
        "customer_note": payment.get("customer_note"),
        "due_date": payment.get("due_date"),
        "status": payment.get("status"),
        "status_label": STATUS_LABELS.get(payment.get("status"), payment.get("status", "")),
        "status_message": CUSTOMER_STATUS_MESSAGES.get(payment.get("status"), ""),
        "venue_name": payment.get("venue_name"),
        "created_at": payment.get("created_at"),
        "paid_at": payment.get("paid_at"),
        "razorpay_payment_id": payment.get("razorpay_payment_id"),
        "receipt_number": payment.get("receipt_number"),
        "can_pay": payment.get("status") in ("payment_requested", "payment_due", "payment_failed"),
        "reminders_count": len(payment.get("reminders", [])),
    }
    return safe


async def _verify_customer_case_access(lead_id: str, user: dict) -> dict:
    """Ensure customer can access this case."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Case not found")
    uid = user.get("user_id", "")
    email = user.get("email", "")
    cuid = lead.get("customer_user_id", "")
    cemail = lead.get("customer_email", "")
    if uid == cuid or email == cemail:
        return lead
    raise HTTPException(status_code=403, detail="You do not have access to this case")


async def _verify_internal_case_access(lead_id: str, user: dict) -> dict:
    """Ensure internal user can access this case."""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    role = user.get("role", "")
    if role in ("admin", "finance", "team_lead"):
        return lead
    if role == "rm" and lead.get("rm_id") == user.get("user_id"):
        return lead
    raise HTTPException(status_code=403, detail="Unauthorized")


async def _add_timeline_event(lead_id: str, event_type: str, label: str, by: str = None, internal_only: bool = False):
    """Append to case_timeline collection."""
    await db.case_timeline.insert_one({
        "timeline_id": generate_id("tl_"),
        "lead_id": lead_id,
        "type": event_type,
        "label": label,
        "by": by,
        "internal_only": internal_only,
        "timestamp": _now(),
    })


async def _create_razorpay_order(amount_paise: int, receipt: str, notes: dict) -> dict:
    """Create Razorpay order (mock in test mode)."""
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        import uuid
        return {
            "id": f"order_{uuid.uuid4().hex[:16]}",
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
        }
    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        return client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": notes,
        })
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment order creation failed")


def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature."""
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        return True
    import hmac
    import hashlib
    msg = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ═══════════════════════════════════════════════
# 1) RM / Internal — Create Deposit Request
# ═══════════════════════════════════════════════

@router.post("/{lead_id}/request")
async def create_deposit_request(
    lead_id: str,
    body: DepositRequest,
    request: Request,
    user: dict = Depends(require_role("rm", "admin", "team_lead")),
):
    """RM creates a deposit/payment request linked to the case."""
    lead = await _verify_internal_case_access(lead_id, user)

    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Check for duplicate pending request with same purpose
    existing = await db.case_payments.find_one({
        "lead_id": lead_id,
        "purpose": body.purpose,
        "status": {"$in": ["payment_requested", "payment_due", "payment_in_progress"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"A pending {PURPOSE_LABELS.get(body.purpose, body.purpose)} request already exists for this case")

    now = _now()
    payment_request_id = generate_id("cpr_")
    receipt_number = f"VLQ-{lead_id[-6:].upper()}-{payment_request_id[-4:].upper()}"

    record = {
        "payment_request_id": payment_request_id,
        "lead_id": lead_id,
        "amount": body.amount,
        "purpose": body.purpose,
        "description": body.description or f"{PURPOSE_LABELS.get(body.purpose, 'Payment')} for {lead.get('event_type', 'Event')}",
        "customer_note": body.customer_note,
        "due_date": body.due_date,
        "venue_id": body.venue_id,
        "venue_name": body.venue_name,
        "status": "payment_requested",
        "receipt_number": receipt_number,
        "razorpay_order_id": None,
        "razorpay_payment_id": None,
        "created_by": user["user_id"],
        "created_by_name": user.get("name", ""),
        "created_at": now,
        "paid_at": None,
        "reminders": [],
        "status_history": [{"status": "payment_requested", "timestamp": now, "by": user["user_id"]}],
    }
    await db.case_payments.insert_one(record)

    # Share to customer portal as well
    share_id = generate_id("share_")
    await db.case_shares.insert_one({
        "share_id": share_id,
        "lead_id": lead_id,
        "share_type": "payment",
        "title": f"{PURPOSE_LABELS.get(body.purpose, 'Payment')} — ₹{body.amount:,.0f}",
        "description": body.description,
        "customer_note": body.customer_note or f"Please complete the deposit of ₹{body.amount:,.0f} to secure your booking.",
        "content": {"payment_request_id": payment_request_id, "amount": body.amount, "purpose": body.purpose},
        "lifecycle": "shared",
        "version": 1,
        "is_current_version": True,
        "shared_by": user["user_id"],
        "shared_by_name": user.get("name", ""),
        "created_at": now,
    })

    # Timeline events
    await _add_timeline_event(lead_id, "payment_request", f"Deposit of ₹{body.amount:,.0f} requested", by=user.get("name"))
    await _add_timeline_event(lead_id, "payment_request_internal", f"Deposit request created by {user.get('name')}", by=user.get("name"), internal_only=True)

    # Notify customer if they have a user_id
    customer_uid = lead.get("customer_user_id")
    if customer_uid:
        await create_notification(
            customer_uid,
            f"Payment Requested — ₹{body.amount:,.0f}",
            body.customer_note or f"Your RM has requested a {PURPOSE_LABELS.get(body.purpose, 'deposit')}.",
            "payment_request",
            {"lead_id": lead_id, "payment_request_id": payment_request_id},
        )

    await create_audit_log("case_payment", payment_request_id, "created", user, {
        "lead_id": lead_id, "amount": body.amount, "purpose": body.purpose
    }, request)

    record.pop("_id", None)
    return {"message": "Deposit request created", "payment_request_id": payment_request_id, "receipt_number": receipt_number}


# ═══════════════════════════════════════════════
# 2) Customer — View Payments for Case
# ═══════════════════════════════════════════════

@router.get("/{lead_id}/customer-payments")
async def get_customer_payments(lead_id: str, user: dict = Depends(get_current_user)):
    """Customer retrieves all payment requests/history for their case."""
    await _verify_customer_case_access(lead_id, user)

    payments = await db.case_payments.find(
        {"lead_id": lead_id, "status": {"$ne": "payment_cancelled"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    customer_payments = [_sanitize_for_customer(p) for p in payments]

    # Summary
    total_due = sum(p["amount"] for p in payments if p["status"] in ("payment_requested", "payment_due", "payment_failed"))
    total_paid = sum(p["amount"] for p in payments if p["status"] == "payment_success")

    return {
        "payments": customer_payments,
        "summary": {
            "total_due": total_due,
            "total_paid": total_paid,
            "pending_count": sum(1 for p in customer_payments if p.get("can_pay")),
        },
    }


# ═══════════════════════════════════════════════
# 3) Customer — Initiate Checkout
# ═══════════════════════════════════════════════

@router.post("/{payment_request_id}/checkout")
async def initiate_checkout(payment_request_id: str, user: dict = Depends(get_current_user)):
    """Customer triggers Razorpay order creation for a deposit request."""
    payment = await db.case_payments.find_one({"payment_request_id": payment_request_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    await _verify_customer_case_access(payment["lead_id"], user)

    if payment["status"] not in ("payment_requested", "payment_due", "payment_failed"):
        raise HTTPException(status_code=400, detail=f"Cannot pay — current status: {STATUS_LABELS.get(payment['status'], payment['status'])}")

    # Reuse existing Razorpay order if it exists and hasn't expired
    if payment.get("razorpay_order_id") and payment["status"] == "payment_failed":
        # Create a fresh order for retries
        pass
    elif payment.get("razorpay_order_id"):
        # Reuse existing order
        return {
            "razorpay_key": RAZORPAY_KEY_ID,
            "order_id": payment["razorpay_order_id"],
            "amount": int(payment["amount"] * 100),
            "currency": "INR",
            "name": "VenuLoQ",
            "description": payment.get("description", "Booking Deposit"),
            "prefill": {
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "contact": user.get("phone", ""),
            },
            "payment_request_id": payment_request_id,
            "is_test_mode": RAZORPAY_KEY_ID == 'rzp_test_demo',
        }

    amount_paise = int(payment["amount"] * 100)
    receipt = f"VLQ_{payment_request_id[-10:]}"
    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})

    order = await _create_razorpay_order(amount_paise, receipt, {
        "lead_id": payment["lead_id"],
        "payment_request_id": payment_request_id,
        "customer_name": lead.get("customer_name", "") if lead else "",
        "purpose": payment.get("purpose", ""),
    })

    now = _now()
    await db.case_payments.update_one(
        {"payment_request_id": payment_request_id},
        {"$set": {
            "razorpay_order_id": order["id"],
            "status": "payment_in_progress",
            "updated_at": now,
        }, "$push": {
            "status_history": {"status": "payment_in_progress", "timestamp": now, "by": user["user_id"]},
        }},
    )

    await _add_timeline_event(payment["lead_id"], "payment_initiated", "Payment initiated by customer", by=user.get("name"))

    return {
        "razorpay_key": RAZORPAY_KEY_ID,
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "name": "VenuLoQ",
        "description": payment.get("description", "Booking Deposit"),
        "prefill": {
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "contact": user.get("phone", ""),
        },
        "payment_request_id": payment_request_id,
        "is_test_mode": RAZORPAY_KEY_ID == 'rzp_test_demo',
    }


# ═══════════════════════════════════════════════
# 4) Customer — Verify Payment
# ═══════════════════════════════════════════════

@router.post("/{payment_request_id}/verify")
async def verify_payment(payment_request_id: str, body: PaymentVerifyRequest, user: dict = Depends(get_current_user)):
    """Customer verifies Razorpay payment after checkout callback."""
    payment = await db.case_payments.find_one({"payment_request_id": payment_request_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    await _verify_customer_case_access(payment["lead_id"], user)

    if payment["status"] == "payment_success":
        return {"message": "Payment already verified", "status": "payment_success", "receipt_number": payment.get("receipt_number")}

    # Verify signature
    if not _verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")

    now = _now()

    # Update payment record
    await db.case_payments.update_one(
        {"payment_request_id": payment_request_id},
        {"$set": {
            "status": "payment_success",
            "razorpay_payment_id": body.razorpay_payment_id,
            "paid_at": now,
            "updated_at": now,
        }, "$push": {
            "status_history": {"status": "payment_success", "timestamp": now, "by": user["user_id"]},
        }},
    )

    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})

    # Update lead with collection milestone
    collection_update = {
        "payment_status": "advance_paid",
        "updated_at": now,
        "collection_milestones": lead.get("collection_milestones", []) if lead else [],
    }
    collection_update["collection_milestones"].append({
        "type": payment.get("purpose", "booking_deposit"),
        "amount": payment["amount"],
        "payment_request_id": payment_request_id,
        "razorpay_payment_id": body.razorpay_payment_id,
        "paid_at": now,
        "receipt_number": payment.get("receipt_number"),
    })

    # Calculate total collected
    all_paid = await db.case_payments.find(
        {"lead_id": payment["lead_id"], "status": "payment_success"},
        {"_id": 0, "amount": 1}
    ).to_list(50)
    total_collected = sum(p.get("amount", 0) for p in all_paid) + payment["amount"]

    collection_update["total_collected"] = total_collected
    collection_update["collection_posture"] = "deposit_received"

    await db.leads.update_one({"lead_id": payment["lead_id"]}, {"$set": collection_update})

    # Update the case_share if it exists
    await db.case_shares.update_many(
        {"lead_id": payment["lead_id"], "share_type": "payment", "content.payment_request_id": payment_request_id},
        {"$set": {"lifecycle": "responded", "customer_response": "payment_success", "responded_at": now}},
    )

    # Timeline events
    await _add_timeline_event(payment["lead_id"], "payment_success", f"Payment of ₹{payment['amount']:,.0f} received", by=user.get("name"))
    await _add_timeline_event(payment["lead_id"], "payment_success_internal",
        f"₹{payment['amount']:,.0f} collected. Razorpay ID: {body.razorpay_payment_id}. Receipt: {payment.get('receipt_number')}",
        by="System", internal_only=True)

    # Notify RM
    if lead and lead.get("rm_id"):
        await create_notification(
            lead["rm_id"],
            f"Payment Received — ₹{payment['amount']:,.0f}",
            f"{lead.get('customer_name', 'Customer')} has paid the {PURPOSE_LABELS.get(payment.get('purpose'), 'deposit')}.",
            "payment_success",
            {"lead_id": payment["lead_id"], "payment_request_id": payment_request_id},
        )

    await create_audit_log("case_payment", payment_request_id, "payment_success", user, {
        "amount": payment["amount"], "razorpay_payment_id": body.razorpay_payment_id
    }, None)

    return {
        "message": "Payment verified successfully",
        "status": "payment_success",
        "receipt_number": payment.get("receipt_number"),
        "amount": payment["amount"],
        "paid_at": now,
    }


# ═══════════════════════════════════════════════
# 5) Customer — Simulate Payment (TEST MODE)
# ═══════════════════════════════════════════════

@router.post("/{payment_request_id}/simulate")
async def simulate_payment(payment_request_id: str, user: dict = Depends(get_current_user)):
    """Test mode: simulate successful payment without Razorpay."""
    if RAZORPAY_KEY_ID != 'rzp_test_demo':
        raise HTTPException(status_code=400, detail="Simulation only available in test mode")

    payment = await db.case_payments.find_one({"payment_request_id": payment_request_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    await _verify_customer_case_access(payment["lead_id"], user)

    if payment["status"] == "payment_success":
        return {"message": "Already paid", "status": "payment_success", "receipt_number": payment.get("receipt_number")}

    now = _now()
    mock_payment_id = f"pay_sim_{generate_id('')[:10]}"

    await db.case_payments.update_one(
        {"payment_request_id": payment_request_id},
        {"$set": {
            "status": "payment_success",
            "razorpay_payment_id": mock_payment_id,
            "paid_at": now,
            "simulated": True,
            "updated_at": now,
        }, "$push": {
            "status_history": {"status": "payment_success", "timestamp": now, "by": "simulation"},
        }},
    )

    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    collection_milestones = lead.get("collection_milestones", []) if lead else []
    collection_milestones.append({
        "type": payment.get("purpose", "booking_deposit"),
        "amount": payment["amount"],
        "payment_request_id": payment_request_id,
        "razorpay_payment_id": mock_payment_id,
        "paid_at": now,
        "receipt_number": payment.get("receipt_number"),
        "simulated": True,
    })

    all_paid = await db.case_payments.find(
        {"lead_id": payment["lead_id"], "status": "payment_success"},
        {"_id": 0, "amount": 1}
    ).to_list(50)
    total_collected = sum(p.get("amount", 0) for p in all_paid)

    await db.leads.update_one({"lead_id": payment["lead_id"]}, {"$set": {
        "payment_status": "advance_paid",
        "collection_milestones": collection_milestones,
        "total_collected": total_collected,
        "collection_posture": "deposit_received",
        "updated_at": now,
    }})

    await db.case_shares.update_many(
        {"lead_id": payment["lead_id"], "share_type": "payment", "content.payment_request_id": payment_request_id},
        {"$set": {"lifecycle": "responded", "customer_response": "payment_success", "responded_at": now}},
    )

    await _add_timeline_event(payment["lead_id"], "payment_success", f"Payment of ₹{payment['amount']:,.0f} received (simulated)", by="System")
    await _add_timeline_event(payment["lead_id"], "payment_success_internal",
        f"₹{payment['amount']:,.0f} simulated. Mock ID: {mock_payment_id}", by="System", internal_only=True)

    if lead and lead.get("rm_id"):
        await create_notification(lead["rm_id"], f"Payment Received — ₹{payment['amount']:,.0f}",
            f"{lead.get('customer_name', 'Customer')} deposit collected (test simulation).",
            "payment_success", {"lead_id": payment["lead_id"]})

    return {
        "message": "Payment simulated successfully",
        "status": "payment_success",
        "receipt_number": payment.get("receipt_number"),
        "amount": payment["amount"],
        "paid_at": now,
        "simulated": True,
    }


# ═══════════════════════════════════════════════
# 6) RM / Internal — View Case Payments
# ═══════════════════════════════════════════════

@router.get("/{lead_id}/internal-payments")
async def get_internal_payments(lead_id: str, user: dict = Depends(require_role("rm", "admin", "team_lead", "finance"))):
    """Internal view of all payment requests/history for a case."""
    await _verify_internal_case_access(lead_id, user)

    payments = await db.case_payments.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)

    total_requested = sum(p["amount"] for p in payments if p["status"] not in ("payment_cancelled",))
    total_collected = sum(p["amount"] for p in payments if p["status"] == "payment_success")
    total_pending = sum(p["amount"] for p in payments if p["status"] in ("payment_requested", "payment_due", "payment_in_progress", "payment_failed"))

    return {
        "payments": payments,
        "summary": {
            "total_requested": total_requested,
            "total_collected": total_collected,
            "total_pending": total_pending,
            "count": len(payments),
            "success_count": sum(1 for p in payments if p["status"] == "payment_success"),
            "pending_count": sum(1 for p in payments if p["status"] in ("payment_requested", "payment_due", "payment_in_progress", "payment_failed")),
        },
    }


# ═══════════════════════════════════════════════
# 7) RM — Send Reminder
# ═══════════════════════════════════════════════

@router.post("/{payment_request_id}/remind")
async def send_reminder(
    payment_request_id: str,
    body: ReminderRequest,
    request: Request,
    user: dict = Depends(require_role("rm", "admin", "team_lead")),
):
    """RM sends payment reminder to customer."""
    payment = await db.case_payments.find_one({"payment_request_id": payment_request_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    await _verify_internal_case_access(payment["lead_id"], user)

    if payment["status"] not in ("payment_requested", "payment_due", "payment_failed"):
        raise HTTPException(status_code=400, detail="Cannot remind — payment is not in a pending state")

    now = _now()
    await db.case_payments.update_one(
        {"payment_request_id": payment_request_id},
        {"$push": {"reminders": {"sent_at": now, "sent_by": user["user_id"], "note": body.note}},
         "$set": {"status": "payment_due", "updated_at": now}},
    )

    if payment["status"] == "payment_requested":
        await db.case_payments.update_one(
            {"payment_request_id": payment_request_id},
            {"$push": {"status_history": {"status": "payment_due", "timestamp": now, "by": user["user_id"]}}},
        )

    lead = await db.leads.find_one({"lead_id": payment["lead_id"]}, {"_id": 0})
    customer_uid = lead.get("customer_user_id") if lead else None
    if customer_uid:
        await create_notification(
            customer_uid,
            f"Payment Reminder — ₹{payment['amount']:,.0f}",
            body.note or f"Friendly reminder: your {PURPOSE_LABELS.get(payment.get('purpose'), 'deposit')} is awaiting payment.",
            "payment_reminder",
            {"lead_id": payment["lead_id"], "payment_request_id": payment_request_id},
        )

    await _add_timeline_event(payment["lead_id"], "payment_reminder", "Payment reminder sent", by=user.get("name"))
    await _add_timeline_event(payment["lead_id"], "payment_reminder_internal",
        f"Reminder #{len(payment.get('reminders', [])) + 1} sent by {user.get('name')}", by=user.get("name"), internal_only=True)

    await create_audit_log("case_payment", payment_request_id, "reminder_sent", user, {
        "reminder_count": len(payment.get("reminders", [])) + 1
    }, request)

    return {"message": "Reminder sent"}


# ═══════════════════════════════════════════════
# 8) RM — Cancel Payment Request
# ═══════════════════════════════════════════════

@router.post("/{payment_request_id}/cancel")
async def cancel_payment_request(
    payment_request_id: str,
    request: Request,
    user: dict = Depends(require_role("rm", "admin")),
):
    """RM/Admin cancels a pending payment request."""
    payment = await db.case_payments.find_one({"payment_request_id": payment_request_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    await _verify_internal_case_access(payment["lead_id"], user)

    if payment["status"] == "payment_success":
        raise HTTPException(status_code=400, detail="Cannot cancel — payment already succeeded")
    if payment["status"] == "payment_cancelled":
        return {"message": "Already cancelled"}

    now = _now()
    await db.case_payments.update_one(
        {"payment_request_id": payment_request_id},
        {"$set": {"status": "payment_cancelled", "cancelled_by": user["user_id"], "cancelled_at": now, "updated_at": now},
         "$push": {"status_history": {"status": "payment_cancelled", "timestamp": now, "by": user["user_id"]}}},
    )

    # Update case_share
    await db.case_shares.update_many(
        {"lead_id": payment["lead_id"], "share_type": "payment", "content.payment_request_id": payment_request_id},
        {"$set": {"lifecycle": "revoked"}},
    )

    await _add_timeline_event(payment["lead_id"], "payment_cancelled", "Payment request cancelled", by=user.get("name"))
    await create_audit_log("case_payment", payment_request_id, "cancelled", user, {"lead_id": payment["lead_id"]}, request)

    return {"message": "Payment request cancelled"}


# ═══════════════════════════════════════════════
# 9) Razorpay Key (for frontend checkout)
# ═══════════════════════════════════════════════

@router.get("/razorpay-config")
async def get_razorpay_config(user: dict = Depends(get_current_user)):
    """Return Razorpay public key for frontend checkout."""
    return {
        "key_id": RAZORPAY_KEY_ID,
        "is_test_mode": RAZORPAY_KEY_ID == 'rzp_test_demo',
    }
