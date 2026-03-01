"""
Background task scheduler for BookMyVenue.
Handles SLA monitoring, weekly digests, and admin conversion emails.
"""
import asyncio
import logging
from datetime import datetime

import pytz

from config import db

logger = logging.getLogger(__name__)


async def sla_monitor_loop():
    """Background loop: run SLA check every 15 minutes + escalation every hour."""
    from services import sla_monitor_service, email_digest_service
    
    await asyncio.sleep(10)
    cycle = 0
    while True:
        try:
            result = await sla_monitor_service.run_sla_check()
            logger.info(f"SLA monitor: {result['total_new_alerts']} alerts created")
            
            # Run escalation email every 4th cycle (~ every hour)
            cycle += 1
            if cycle % 4 == 0:
                esc = await email_digest_service.send_sla_escalation_emails()
                logger.info(f"SLA escalation: {esc['escalated']} emails sent")
        except Exception as e:
            logger.error(f"SLA monitor error: {e}")
        await asyncio.sleep(900)


async def weekly_digest_loop():
    """Background loop: send weekly digests every Monday at 9 AM IST."""
    from services import email_digest_service
    
    ist = pytz.timezone("Asia/Kolkata")
    while True:
        try:
            now_ist = datetime.now(ist)
            # Monday = 0, 9 AM IST
            if now_ist.weekday() == 0 and now_ist.hour == 9 and now_ist.minute < 15:
                # Check if already sent today
                today_start = now_ist.replace(hour=0, minute=0, second=0).isoformat()
                recent = await db.digest_log.find_one({"sent_at": {"$gte": today_start}})
                if not recent:
                    result = await email_digest_service.send_weekly_digests_all()
                    logger.info(f"Weekly digest: {result}")
        except Exception as e:
            logger.error(f"Weekly digest error: {e}")
        await asyncio.sleep(900)  # Check every 15 min


async def admin_conversion_email_loop():
    """Background loop: send admin conversion intelligence email every Monday at 9 AM IST."""
    from services import admin_conversion_email_service
    
    ist = pytz.timezone("Asia/Kolkata")
    await asyncio.sleep(30)  # Stagger startup
    while True:
        try:
            now_ist = datetime.now(ist)
            # Monday = 0, 9 AM IST
            if now_ist.weekday() == 0 and now_ist.hour == 9 and now_ist.minute < 15:
                result = await admin_conversion_email_service.send_admin_conversion_email(manual=False)
                if result.get("sent", 0) > 0:
                    logger.info(f"Admin conversion email: sent to {result['sent']} admins")
                elif result.get("skipped"):
                    logger.info(f"Admin conversion email skipped: {result.get('reason')}")
        except Exception as e:
            logger.error(f"Admin conversion email error: {e}")
        await asyncio.sleep(900)  # Check every 15 min


async def start_all_tasks():
    """Start all background tasks. Called from app startup."""
    return {
        "sla": asyncio.create_task(sla_monitor_loop()),
        "digest": asyncio.create_task(weekly_digest_loop()),
        "admin_email": asyncio.create_task(admin_conversion_email_loop()),
    }
