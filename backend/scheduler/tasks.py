"""
Background task scheduler for VenuLock.

Handles SLA monitoring, weekly digests, and admin conversion emails.

Safety Features:
- Only starts when ENABLE_SCHEDULER=true (default: false)
- Uses MongoDB-based distributed lock to prevent duplicate execution
- Safe for multi-worker deployments (Gunicorn, Kubernetes replicas)
"""
import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

import pytz

from config import db

logger = logging.getLogger(__name__)

# Configuration
ENABLE_SCHEDULER = os.environ.get("ENABLE_SCHEDULER", "false").lower() == "true"
SCHEDULER_LOCK_TTL = 60  # Lock expires after 60 seconds


async def _acquire_scheduler_lock(lock_name: str) -> bool:
    """
    Acquire a distributed lock using MongoDB.
    Returns True if lock acquired, False if another worker holds it.
    
    This prevents duplicate scheduler execution in multi-worker deployments.
    """
    now = datetime.now(timezone.utc)
    lock_id = f"scheduler_lock_{lock_name}"
    
    try:
        # Try to acquire lock (upsert with TTL check)
        result = await db.scheduler_locks.update_one(
            {
                "_id": lock_id,
                "$or": [
                    {"expires_at": {"$lt": now}},  # Lock expired
                    {"expires_at": {"$exists": False}}  # No lock
                ]
            },
            {
                "$set": {
                    "_id": lock_id,
                    "acquired_at": now.isoformat(),
                    "expires_at": now + timedelta(seconds=SCHEDULER_LOCK_TTL),
                    "worker_id": os.environ.get("HOSTNAME", "unknown"),
                }
            },
            upsert=True
        )
        return result.modified_count > 0 or result.upserted_id is not None
    except Exception as e:
        # If duplicate key error, another worker has the lock
        if "duplicate key" in str(e).lower():
            return False
        logger.error(f"Error acquiring scheduler lock: {e}")
        return False


async def _release_scheduler_lock(lock_name: str):
    """Release a distributed lock."""
    lock_id = f"scheduler_lock_{lock_name}"
    try:
        await db.scheduler_locks.delete_one({"_id": lock_id})
    except Exception as e:
        logger.error(f"Error releasing scheduler lock: {e}")


async def _refresh_lock(lock_name: str):
    """Refresh lock TTL to prevent expiration during long operations."""
    lock_id = f"scheduler_lock_{lock_name}"
    now = datetime.now(timezone.utc)
    try:
        await db.scheduler_locks.update_one(
            {"_id": lock_id},
            {"$set": {"expires_at": now + timedelta(seconds=SCHEDULER_LOCK_TTL)}}
        )
    except Exception:
        pass


async def sla_monitor_loop():
    """Background loop: run SLA check every 15 minutes + escalation every hour."""
    from services import sla_monitor_service, email_digest_service
    
    await asyncio.sleep(10)
    cycle = 0
    
    while True:
        try:
            # Try to acquire lock
            if await _acquire_scheduler_lock("sla_monitor"):
                try:
                    result = await sla_monitor_service.run_sla_check()
                    logger.info(f"SLA monitor: {result['total_new_alerts']} alerts created")
                    
                    # Run escalation email every 4th cycle (~ every hour)
                    cycle += 1
                    if cycle % 4 == 0:
                        esc = await email_digest_service.send_sla_escalation_emails()
                        logger.info(f"SLA escalation: {esc['escalated']} emails sent")
                finally:
                    await _release_scheduler_lock("sla_monitor")
            else:
                logger.debug("SLA monitor: skipped (another worker is running)")
        except Exception as e:
            logger.error(f"SLA monitor error: {e}")
        
        await asyncio.sleep(900)  # 15 minutes


async def weekly_digest_loop():
    """Background loop: send weekly digests every Monday at 9 AM IST."""
    from services import email_digest_service
    
    ist = pytz.timezone("Asia/Kolkata")
    
    while True:
        try:
            now_ist = datetime.now(ist)
            # Monday = 0, 9 AM IST
            if now_ist.weekday() == 0 and now_ist.hour == 9 and now_ist.minute < 15:
                if await _acquire_scheduler_lock("weekly_digest"):
                    try:
                        # Check if already sent today
                        today_start = now_ist.replace(hour=0, minute=0, second=0).isoformat()
                        recent = await db.digest_log.find_one({"sent_at": {"$gte": today_start}})
                        if not recent:
                            result = await email_digest_service.send_weekly_digests_all()
                            logger.info(f"Weekly digest: {result}")
                    finally:
                        await _release_scheduler_lock("weekly_digest")
        except Exception as e:
            logger.error(f"Weekly digest error: {e}")
        
        await asyncio.sleep(900)  # 15 minutes


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
                if await _acquire_scheduler_lock("admin_conversion_email"):
                    try:
                        result = await admin_conversion_email_service.send_admin_conversion_email(manual=False)
                        if result.get("sent", 0) > 0:
                            logger.info(f"Admin conversion email: sent to {result['sent']} admins")
                        elif result.get("skipped"):
                            logger.info(f"Admin conversion email skipped: {result.get('reason')}")
                    finally:
                        await _release_scheduler_lock("admin_conversion_email")
        except Exception as e:
            logger.error(f"Admin conversion email error: {e}")
        
        await asyncio.sleep(900)  # 15 minutes


async def start_all_tasks() -> Dict[str, Optional[asyncio.Task]]:
    """
    Start all background tasks if scheduler is enabled.
    
    Returns dict of task names to Task objects (or None if disabled).
    """
    if not ENABLE_SCHEDULER:
        logger.warning("Scheduler DISABLED (set ENABLE_SCHEDULER=true to enable)")
        return {"sla": None, "digest": None, "admin_email": None}
    
    logger.info("Scheduler ENABLED - starting background tasks")
    
    # Create index for scheduler locks (idempotent)
    try:
        await db.scheduler_locks.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass  # Index might already exist
    
    return {
        "sla": asyncio.create_task(sla_monitor_loop()),
        "digest": asyncio.create_task(weekly_digest_loop()),
        "admin_email": asyncio.create_task(admin_conversion_email_loop()),
    }


def is_scheduler_enabled() -> bool:
    """Check if scheduler is enabled."""
    return ENABLE_SCHEDULER
