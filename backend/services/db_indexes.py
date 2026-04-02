"""
Database Index Management for VenuLoQ
Phase 17: Scalability & Reliability

Indexes derived from actual query patterns across all route files.
Run on startup to ensure indexes exist (create_index is idempotent).
"""
import logging
from pymongo import ASCENDING, DESCENDING

logger = logging.getLogger("db_indexes")


async def ensure_indexes(db):
    """Create all required indexes. Safe to call on every startup."""
    logger.info("Ensuring database indexes...")

    # ── leads (HOTTEST collection — RM dashboard, case portal, admin, analytics) ──
    await db.leads.create_index([("lead_id", ASCENDING)], unique=True, background=True)
    await db.leads.create_index([("rm_id", ASCENDING), ("stage", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.leads.create_index([("rm_id", ASCENDING), ("event_completed", ASCENDING)], background=True)
    await db.leads.create_index([("customer_id", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.leads.create_index([("customer_email", ASCENDING)], background=True)
    await db.leads.create_index([("city", ASCENDING), ("stage", ASCENDING)], background=True)
    await db.leads.create_index([("stage", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.leads.create_index([("booking_id", ASCENDING)], unique=True, sparse=True, background=True)
    await db.leads.create_index([("created_at", DESCENDING)], background=True)

    # ── users (auth, RM lookup, team queries) ──
    await db.users.create_index([("user_id", ASCENDING)], unique=True, background=True)
    await db.users.create_index([("email", ASCENDING)], unique=True, background=True)
    await db.users.create_index([("role", ASCENDING), ("status", ASCENDING)], background=True)

    # ── venues (search, public pages, admin) ──
    await db.venues.create_index([("venue_id", ASCENDING)], unique=True, background=True)
    await db.venues.create_index([("slug", ASCENDING)], unique=True, sparse=True, background=True)
    await db.venues.create_index([("city", ASCENDING), ("status", ASCENDING)], background=True)
    await db.venues.create_index([("owner_id", ASCENDING)], background=True)
    await db.venues.create_index([("status", ASCENDING), ("created_at", DESCENDING)], background=True)

    # ── notifications (per-user feed, read/unread) ──
    await db.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.notifications.create_index([("user_id", ASCENDING), ("read", ASCENDING)], background=True)

    # ── case_shares (customer portal, RM sharing) ──
    await db.case_shares.create_index([("lead_id", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.case_shares.create_index([("share_id", ASCENDING)], unique=True, background=True)
    await db.case_shares.create_index([("lead_id", ASCENDING), ("share_type", ASCENDING), ("status", ASCENDING)], background=True)

    # ── case_messages (conversation threads) ──
    await db.case_messages.create_index([("lead_id", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.case_messages.create_index([("lead_id", ASCENDING), ("read_by", ASCENDING)], background=True)

    # ── case_payments (payment flow) ──
    await db.case_payments.create_index([("lead_id", ASCENDING), ("created_at", DESCENDING)], background=True)
    await db.case_payments.create_index([("payment_request_id", ASCENDING)], unique=True, background=True)
    await db.case_payments.create_index([("razorpay_order_id", ASCENDING)], sparse=True, background=True)

    # ── communications (RM conversation log per lead) ──
    await db.communications.create_index([("lead_id", ASCENDING), ("logged_at", DESCENDING)], background=True)

    # ── lead_notes (RM notes per lead) ──
    await db.lead_notes.create_index([("lead_id", ASCENDING), ("created_at", DESCENDING)], background=True)

    # ── follow_ups (RM scheduling per lead) ──
    await db.follow_ups.create_index([("lead_id", ASCENDING), ("scheduled_at", ASCENDING)], background=True)
    await db.follow_ups.create_index([("rm_id", ASCENDING), ("status", ASCENDING), ("scheduled_at", ASCENDING)], background=True)

    # ── venue_shortlist (lead shortlisting) ──
    await db.venue_shortlist.create_index([("lead_id", ASCENDING), ("venue_id", ASCENDING)], unique=True, background=True)

    # ── quotes (per lead) ──
    await db.quotes.create_index([("lead_id", ASCENDING), ("created_at", DESCENDING)], background=True)

    # ── payments (legacy/general payments) ──
    await db.payments.create_index([("lead_id", ASCENDING)], background=True)
    await db.payments.create_index([("payment_id", ASCENDING)], unique=True, sparse=True, background=True)

    # ── audit_logs (compliance, traceability) ──
    await db.audit_logs.create_index([("entity_id", ASCENDING), ("entity_type", ASCENDING)], background=True)
    await db.audit_logs.create_index([("performed_at", DESCENDING)], background=True)

    # ── auth / OTP / tokens (login, verification) ──
    await db.email_otps.create_index([("email", ASCENDING)], background=True)
    await db.otp_codes.create_index([("phone", ASCENDING)], background=True)
    await db.verification_tokens.create_index([("token", ASCENDING)], unique=True, background=True)

    # ── rm_assignments (round-robin tracking) ──
    await db.rm_assignments.create_index([("city", ASCENDING), ("assigned_at", DESCENDING)], background=True)

    # ── reviews (venue pages) ──
    await db.reviews.create_index([("venue_id", ASCENDING), ("created_at", DESCENDING)], background=True)

    # ── cities (hub pages) ──
    await db.cities.create_index([("slug", ASCENDING)], unique=True, sparse=True, background=True)

    # ── favorites (customer saved venues) ──
    await db.favorites.create_index([("user_id", ASCENDING), ("venue_id", ASCENDING)], unique=True, background=True)

    # ── planner_matches (per lead) ──
    await db.planner_matches.create_index([("lead_id", ASCENDING)], background=True)

    # ── planners ──
    await db.planners.create_index([("planner_id", ASCENDING)], unique=True, sparse=True, background=True)

    # ── execution (Phase 12) ──
    await db.execution_checklists.create_index([("lead_id", ASCENDING)], background=True)

    # ── settlement (Phase 13) ──
    await db.settlements.create_index([("lead_id", ASCENDING)], background=True)
    await db.settlements.create_index([("status", ASCENDING), ("created_at", DESCENDING)], background=True)

    # ── venue_onboarding (acquisition pipeline) ──
    await db.venue_onboarding.create_index([("status", ASCENDING), ("created_at", DESCENDING)], background=True)

    # ── team_announcements ──
    await db.team_announcements.create_index([("announcement_id", ASCENDING)], unique=True, background=True)
    await db.team_announcements.create_index([("created_at", DESCENDING)], background=True)

    # ── idempotency keys (Phase 17) ──
    await db.idempotency_keys.create_index([("key", ASCENDING)], unique=True, background=True)
    await db.idempotency_keys.create_index([("created_at", ASCENDING)], expireAfterSeconds=3600, background=True)

    # ── capacity_alerts (Ven-Us intelligence — Phase 17) ──
    await db.capacity_alerts.create_index([("created_at", DESCENDING)], background=True)
    await db.capacity_alerts.create_index([("alert_type", ASCENDING), ("status", ASCENDING)], background=True)

    # ── file_metadata (Phase 17 — file storage abstraction) ──
    await db.file_metadata.create_index([("file_id", ASCENDING)], unique=True, background=True)
    await db.file_metadata.create_index([("context_type", ASCENDING), ("context_id", ASCENDING)], background=True)

    logger.info("Database indexes ensured successfully")
