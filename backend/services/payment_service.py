"""
Payment service for BookMyVenue API.
Handles Razorpay integration, payment creation, verification, and release.
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from dateutil.relativedelta import relativedelta

from config import (
    db, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
    DEFAULT_COMMISSION_RATE, DEFAULT_MIN_ADVANCE_PERCENT, MAX_ADVANCE_PERCENT_CAP
)
from utils import generate_id, send_email_async

logger = logging.getLogger(__name__)


def generate_mock_razorpay_order(amount_paise: int, receipt: str) -> Dict:
    """Generate mock Razorpay order for testing."""
    import uuid
    return {
        "id": f"order_{uuid.uuid4().hex[:16]}",
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "status": "created"
    }


def calculate_payment_breakdown(deal_value: float, advance_amount: float, commission_rate: float, minimum_fee: float = None) -> Dict:
    """Calculate payment breakdown: commission, platform fee, net to vendor."""
    commission_amount = deal_value * (commission_rate / 100)
    
    if minimum_fee and commission_amount < minimum_fee:
        commission_amount = minimum_fee
    
    # Net to vendor = advance minus commission
    net_to_vendor = advance_amount - commission_amount
    
    return {
        "deal_value": deal_value,
        "advance_amount": advance_amount,
        "advance_percent": round((advance_amount / deal_value) * 100, 2) if deal_value else 0,
        "commission_rate": commission_rate,
        "commission_amount": round(commission_amount, 2),
        "net_to_vendor": round(net_to_vendor, 2),
        "bmv_holds": round(commission_amount, 2),
        "vendor_receives": round(net_to_vendor, 2)
    }


async def get_venue_commission_settings(venue_id: str) -> Dict:
    """Get commission settings for a venue, with defaults."""
    defaults = {
        "commission_rate": DEFAULT_COMMISSION_RATE,
        "minimum_platform_fee": None,
        "min_advance_percent": DEFAULT_MIN_ADVANCE_PERCENT,
        "max_advance_percent": MAX_ADVANCE_PERCENT_CAP
    }
    
    if not venue_id:
        return defaults
    
    venue = await db.venues.find_one({"venue_id": venue_id}, {"_id": 0})
    if not venue:
        return defaults
    
    return {
        "commission_rate": venue.get("negotiated_commission_percent", DEFAULT_COMMISSION_RATE),
        "minimum_platform_fee": venue.get("minimum_platform_fee"),
        "min_advance_percent": venue.get("min_advance_percent", DEFAULT_MIN_ADVANCE_PERCENT),
        "max_advance_percent": venue.get("max_advance_percent", MAX_ADVANCE_PERCENT_CAP)
    }


async def send_payment_link_notification(payment: Dict, lead: Dict):
    """Send payment link email to customer."""
    try:
        customer_email = lead.get("customer_email")
        customer_name = lead.get("customer_name", "Customer")
        
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px;">
            <h1 style="color: #0B1F3B; margin-bottom: 20px;">Payment Required - BookMyVenue</h1>
            <p>Dear {customer_name},</p>
            <p>Your booking is almost confirmed! Please complete the advance payment to secure your venue.</p>
            <div style="background: #F9F9F7; padding: 20px; border-left: 4px solid #C9A227; margin: 20px 0;">
                <p style="margin: 0;"><strong>Event:</strong> {lead.get('event_type', 'Event')}</p>
                <p style="margin: 8px 0;"><strong>Amount:</strong> ₹{payment.get('amount', 0):,.0f}</p>
                <p style="margin: 0;"><strong>Reference:</strong> {payment.get('payment_id', '')}</p>
            </div>
            <a href="{payment.get('payment_link', '#')}" style="display: inline-block; background: #C9A227; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                Pay Now
            </a>
            <p style="color: #666; font-size: 14px;">This payment link is valid for 24 hours.</p>
            <p>Thank you for choosing BookMyVenue!</p>
        </div>
        """
        
        await send_email_async(
            customer_email,
            f"Complete Your Booking - Payment of ₹{payment.get('amount', 0):,.0f}",
            email_html
        )
        logger.info(f"Payment link email sent to {customer_email}")
    except Exception as e:
        logger.warning(f"Failed to send payment link email: {str(e)}")


async def send_payment_confirmation_notification(payment: Dict, lead: Dict):
    """Send payment confirmation email."""
    try:
        customer_email = lead.get("customer_email")
        customer_name = lead.get("customer_name", "Customer")
        
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px;">
            <h1 style="color: #0B1F3B;">Payment Confirmed!</h1>
            <p>Dear {customer_name},</p>
            <p>We have received your payment of <strong>₹{payment.get('amount', 0):,.0f}</strong>.</p>
            <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;"><strong>Status:</strong> Advance Paid</p>
                <p style="margin: 8px 0; color: #155724;"><strong>Transaction ID:</strong> {payment.get('razorpay_payment_id', 'N/A')}</p>
            </div>
            <p>Your booking is now confirmed. Our team will be in touch with next steps.</p>
            <p>Thank you for choosing BookMyVenue!</p>
        </div>
        """
        
        await send_email_async(customer_email, "Payment Confirmed - BookMyVenue", email_html)
        logger.info(f"Payment confirmation email sent to {customer_email}")
    except Exception as e:
        logger.warning(f"Failed to send payment confirmation email: {str(e)}")


async def send_payment_released_notification(payment: Dict, lead: Dict, venue: Dict):
    """Send payment release notification to venue owner."""
    try:
        owner_id = venue.get("owner_id")
        owner = await db.users.find_one({"user_id": owner_id}, {"_id": 0})
        
        if owner and owner.get("email"):
            email_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
                <h1 style="color: #0B1F3B;">Payment Released!</h1>
                <p>Dear {owner.get('name', 'Venue Owner')},</p>
                <p>The booking payment has been released to your account.</p>
                <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Amount:</strong> ₹{payment.get('net_amount_to_vendor', 0):,.0f}</p>
                    <p style="margin: 8px 0;"><strong>Event:</strong> {lead.get('event_type', 'Event')}</p>
                    <p style="margin: 0;"><strong>Customer:</strong> {lead.get('customer_name', 'Customer')}</p>
                </div>
                <p>Thank you for partnering with BookMyVenue!</p>
            </div>
            """
            
            await send_email_async(
                owner["email"],
                f"Payment Released - ₹{payment.get('net_amount_to_vendor', 0):,.0f}",
                email_html
            )
            logger.info(f"Payment released email sent to venue owner {owner['email']}")
    except Exception as e:
        logger.warning(f"Failed to send payment released email: {str(e)}")


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature."""
    if RAZORPAY_KEY_ID == 'rzp_test_demo':
        return True  # Skip verification in test mode
    
    message = f"{order_id}|{payment_id}"
    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


async def get_payment_stats() -> Dict:
    """Get payment statistics summary."""
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    
    # Total collected this month
    month_pipeline = [
        {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
        {"$addFields": {"month": {"$substr": [{"$ifNull": ["$paid_at", "$created_at"]}, 0, 7]}}},
        {"$match": {"month": current_month}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}, "commission": {"$sum": "$commission_amount"}}}
    ]
    month_result = await db.payments.aggregate(month_pipeline).to_list(1)
    
    # Total all time
    total_pipeline = [
        {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}, "commission": {"$sum": "$commission_amount"}}}
    ]
    total_result = await db.payments.aggregate(total_pipeline).to_list(1)
    
    # Pending payments
    pending = await db.payments.count_documents({"status": {"$in": ["pending", "awaiting_advance"]}})
    
    # Released to vendors
    released_pipeline = [
        {"$match": {"status": "payment_released"}},
        {"$group": {"_id": None, "total": {"$sum": "$net_amount_to_vendor"}, "count": {"$sum": 1}}}
    ]
    released_result = await db.payments.aggregate(released_pipeline).to_list(1)
    
    return {
        "current_month": {
            "collected": month_result[0]["total"] if month_result else 0,
            "count": month_result[0]["count"] if month_result else 0,
            "commission": month_result[0]["commission"] if month_result else 0
        },
        "all_time": {
            "collected": total_result[0]["total"] if total_result else 0,
            "count": total_result[0]["count"] if total_result else 0,
            "commission": total_result[0]["commission"] if total_result else 0
        },
        "pending_payments": pending,
        "released_to_vendors": {
            "amount": released_result[0]["total"] if released_result else 0,
            "count": released_result[0]["count"] if released_result else 0
        }
    }


async def get_payment_analytics() -> Dict:
    """Get comprehensive payment analytics."""
    now = datetime.now(timezone.utc)
    
    # Monthly trend (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_date = now - relativedelta(months=i)
        month_str = month_date.strftime("%Y-%m")
        month_label = month_date.strftime("%b")
        
        pipeline = [
            {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
            {"$addFields": {"month": {"$substr": [{"$ifNull": ["$paid_at", "$created_at"]}, 0, 7]}}},
            {"$match": {"month": month_str}},
            {"$group": {
                "_id": None, 
                "collected": {"$sum": "$amount"}, 
                "count": {"$sum": 1}, 
                "commission": {"$sum": "$commission_amount"},
                "released": {"$sum": {"$cond": [{"$eq": ["$status", "payment_released"]}, "$net_amount_to_vendor", 0]}}
            }}
        ]
        result = await db.payments.aggregate(pipeline).to_list(1)
        
        monthly_data.append({
            "month": month_label,
            "collected": result[0]["collected"] if result else 0,
            "count": result[0]["count"] if result else 0,
            "commission": result[0]["commission"] if result else 0,
            "released": result[0]["released"] if result else 0
        })
    
    # Payment funnel
    total_created = await db.payments.count_documents({})
    awaiting = await db.payments.count_documents({"status": "awaiting_advance"})
    paid = await db.payments.count_documents({"status": "advance_paid"})
    released = await db.payments.count_documents({"status": "payment_released"})
    failed = await db.payments.count_documents({"status": "payment_failed"})
    
    funnel = {
        "created": total_created,
        "awaiting_advance": awaiting,
        "advance_paid": paid,
        "released": released,
        "failed": failed,
        "conversion_rate": round((paid + released) / total_created * 100, 1) if total_created > 0 else 0
    }
    
    # Top venues by commission
    venue_pipeline = [
        {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
        {"$lookup": {"from": "leads", "localField": "lead_id", "foreignField": "lead_id", "as": "lead"}},
        {"$unwind": "$lead"},
        {"$lookup": {"from": "venue_shortlist", "localField": "lead_id", "foreignField": "lead_id", "as": "shortlist"}},
        {"$unwind": {"path": "$shortlist", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$shortlist.venue_id",
            "venue_name": {"$first": "$shortlist.venue_name"},
            "total_commission": {"$sum": "$commission_amount"},
            "total_collected": {"$sum": "$amount"},
            "payment_count": {"$sum": 1}
        }},
        {"$sort": {"total_commission": -1}},
        {"$limit": 10}
    ]
    venue_results = await db.payments.aggregate(venue_pipeline).to_list(10)
    
    # Enrich with venue details
    top_venues = []
    for v in venue_results:
        if v["_id"]:
            venue = await db.venues.find_one({"venue_id": v["_id"]}, {"_id": 0})
            if venue:
                tier = "premium" if v["total_commission"] > 100000 else "standard" if v["total_commission"] > 50000 else "basic"
                top_venues.append({
                    "venue_id": v["_id"],
                    "venue_name": v["venue_name"] or venue.get("name"),
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
