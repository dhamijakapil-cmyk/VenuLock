"""
Idempotency protection for VenuLoQ critical write operations.
Phase 17: Prevent duplicate submissions under burst/retry conditions.

Uses MongoDB TTL collection. Keys auto-expire after 1 hour.
"""
import logging
from datetime import datetime, timezone
from fastapi import Header, HTTPException
from typing import Optional

logger = logging.getLogger("idempotency")


async def check_idempotency(db, idempotency_key: Optional[str] = None):
    """Check if this request has already been processed.
    Returns True if this is a duplicate (should be rejected).
    Returns False if this is a new request (safe to proceed)."""
    if not idempotency_key:
        return False  # No key provided, allow through

    existing = await db.idempotency_keys.find_one({"key": idempotency_key})
    if existing:
        logger.warning(f"[IDEMPOTENCY] Duplicate request blocked: {idempotency_key}")
        return True

    # Record the key
    await db.idempotency_keys.insert_one({
        "key": idempotency_key,
        "created_at": datetime.now(timezone.utc),
    })
    return False
