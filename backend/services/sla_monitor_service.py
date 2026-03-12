"""
SLA Monitor Service for VenuLoQ.
Checks leads for SLA breaches & aging, creates notifications + audit logs.
Deduplicates to avoid notification spam.
"""
from datetime import datetime, timezone
from typing import Optional

from config import db, logger
from utils import generate_id

# SLA thresholds (hours)
SLA_FIRST_CONTACT_HOURS = 24
SLA_FOLLOW_UP_HOURS = 48
HOLD_EXPIRY_WARNING_HOURS = 3
PAYMENT_PENDING_HOURS = 24

AGING_THRESHOLDS = {
    "new": 24,
    "contacted": 72,
    "requirement_understood": 120,
    "shortlisted": 168,
    "site_visit": 168,
    "negotiation": 240,
}

DEDUP_WINDOW_HOURS = 6  # Don't re-alert for the same breach within this window


def _parse_dt(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


async def _was_recently_alerted(breach_key: str) -> bool:
    """Check if we already sent an alert for this key within dedup window."""
    cutoff = datetime.now(timezone.utc).isoformat()
    # Look for recent notification with matching dedup key
    recent = await db.sla_alerts_log.find_one(
        {"breach_key": breach_key, "created_at": {"$gte": _hours_ago(DEDUP_WINDOW_HOURS)}},
        {"_id": 0}
    )
    return recent is not None


def _hours_ago(hours: float) -> str:
    from datetime import timedelta
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


async def _create_sla_notification(
    user_id: str,
    title: str,
    message: str,
    severity: str,
    lead_id: str,
    breach_key: str,
    breach_type: str,
):
    """Create a notification and log the SLA breach."""
    now = datetime.now(timezone.utc).isoformat()

    # Create in-app notification
    notif = {
        "notification_id": generate_id("notif_"),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": "sla_breach",
        "read": False,
        "data": {
            "lead_id": lead_id,
            "severity": severity,
            "breach_type": breach_type,
        },
        "created_at": now,
    }
    await db.notifications.insert_one(notif)

    # Log to dedup table
    await db.sla_alerts_log.insert_one({
        "log_id": generate_id("sla_"),
        "breach_key": breach_key,
        "user_id": user_id,
        "severity": severity,
        "breach_type": breach_type,
        "lead_id": lead_id,
        "message": message,
        "created_at": now,
    })

    # Audit log
    await db.audit_logs.insert_one({
        "log_id": generate_id("log_"),
        "entity_type": "lead",
        "entity_id": lead_id,
        "action": f"sla_breach_{breach_type}",
        "changes": {"severity": severity, "message": message},
        "performed_by": "system",
        "performed_by_name": "SLA Monitor",
        "performed_by_role": "system",
        "performed_at": now,
        "ip_address": None,
    })


async def run_sla_check() -> dict:
    """
    Main SLA check routine. Scans all active leads and holds.
    Returns summary of alerts created.
    """
    now = datetime.now(timezone.utc)
    alerts_created = {"first_contact": 0, "stage_aging": 0, "hold_expiry": 0, "payment_pending": 0}

    # Get all admins for admin notifications
    admins = await db.users.find(
        {"role": "admin", "status": "active"}, {"_id": 0, "user_id": 1}
    ).to_list(20)
    admin_ids = [a["user_id"] for a in admins]

    # ========= 1. First Contact SLA =========
    new_leads = await db.leads.find(
        {"stage": "new", "first_contacted_at": {"$exists": False}},
        {"_id": 0}
    ).to_list(10000)

    for lead in new_leads:
        created = _parse_dt(lead.get("created_at"))
        if not created:
            continue
        hours = (now - created).total_seconds() / 3600
        if hours <= SLA_FIRST_CONTACT_HOURS:
            continue

        severity = "critical" if hours > SLA_FIRST_CONTACT_HOURS * 2 else "warning"
        breach_key = f"first_contact:{lead['lead_id']}"

        if await _was_recently_alerted(breach_key):
            continue

        rm_id = lead.get("rm_id")
        customer = lead.get("customer_name", "Unknown")
        hrs_display = f"{round(hours)}h"
        msg = f"{customer} — no contact in {hrs_display} (SLA: {SLA_FIRST_CONTACT_HOURS}h)"

        # Notify RM
        if rm_id:
            await _create_sla_notification(
                rm_id,
                f"SLA Breach: First Contact Overdue" if severity == "critical" else "SLA Warning: Contact Needed",
                msg, severity, lead["lead_id"], breach_key, "first_contact",
            )

        # Notify admins
        for aid in admin_ids:
            await _create_sla_notification(
                aid,
                f"SLA Breach: {lead.get('rm_name', 'RM')} — First Contact",
                msg, severity, lead["lead_id"], f"{breach_key}:admin:{aid}", "first_contact",
            )

        alerts_created["first_contact"] += 1

    # ========= 2. Stage Aging =========
    active_leads = await db.leads.find(
        {"stage": {"$nin": ["new", "booking_confirmed", "lost", "closed_not_proceeding"]}},
        {"_id": 0}
    ).to_list(10000)

    for lead in active_leads:
        stage = lead.get("stage", "")
        threshold = AGING_THRESHOLDS.get(stage)
        if not threshold:
            continue

        updated = _parse_dt(lead.get("updated_at"))
        if not updated:
            continue

        hours = (now - updated).total_seconds() / 3600
        if hours <= threshold:
            continue

        severity = "critical" if hours > threshold * 2 else "warning"
        breach_key = f"aging:{lead['lead_id']}:{stage}"

        if await _was_recently_alerted(breach_key):
            continue

        customer = lead.get("customer_name", "Unknown")
        stage_label = stage.replace("_", " ").title()
        msg = f"{customer} — stuck in '{stage_label}' for {round(hours)}h (SLA: {threshold}h)"

        rm_id = lead.get("rm_id")
        if rm_id:
            await _create_sla_notification(
                rm_id,
                f"SLA Breach: Lead Aging" if severity == "critical" else "SLA Warning: Lead Aging",
                msg, severity, lead["lead_id"], breach_key, "stage_aging",
            )

        for aid in admin_ids:
            await _create_sla_notification(
                aid,
                f"Lead Aging: {lead.get('rm_name', 'RM')} — {stage_label}",
                msg, severity, lead["lead_id"], f"{breach_key}:admin:{aid}", "stage_aging",
            )

        alerts_created["stage_aging"] += 1

    # ========= 3. Holds Expiring Soon (< 3h) =========
    active_holds = await db.date_holds.find(
        {"status": "active"}, {"_id": 0}
    ).to_list(5000)

    for hold in active_holds:
        expires = _parse_dt(hold.get("expires_at"))
        if not expires:
            continue
        remaining_hrs = (expires - now).total_seconds() / 3600
        if remaining_hrs > HOLD_EXPIRY_WARNING_HOURS or remaining_hrs < 0:
            continue

        severity = "critical" if remaining_hrs < 1 else "warning"
        breach_key = f"hold_expiry:{hold.get('hold_id')}"

        if await _was_recently_alerted(breach_key):
            continue

        venue = await db.venues.find_one({"venue_id": hold.get("venue_id")}, {"_id": 0, "name": 1})
        venue_name = venue.get("name") if venue else hold.get("venue_id")
        remaining_display = f"{round(remaining_hrs * 60)}min" if remaining_hrs < 1 else f"{round(remaining_hrs, 1)}h"
        msg = f"Hold on {venue_name} (date: {hold.get('date')}) expires in {remaining_display}"

        rm_id = hold.get("created_by")
        if rm_id:
            await _create_sla_notification(
                rm_id,
                "Hold Expiring Soon" if severity == "warning" else "Hold Expiring Immediately",
                msg, severity, hold.get("lead_id", ""), breach_key, "hold_expiry",
            )

        for aid in admin_ids:
            await _create_sla_notification(
                aid,
                f"Hold Expiring: {venue_name}",
                msg, severity, hold.get("lead_id", ""), f"{breach_key}:admin:{aid}", "hold_expiry",
            )

        alerts_created["hold_expiry"] += 1

    # ========= 4. Payment Links Pending > 24h =========
    pending_payment_leads = await db.leads.find(
        {"payment_status": {"$in": ["awaiting_advance", "pending"]}},
        {"_id": 0}
    ).to_list(5000)

    for lead in pending_payment_leads:
        payments = await db.payments.find(
            {"lead_id": lead.get("lead_id"), "status": "pending"},
            {"_id": 0}
        ).to_list(10)

        for pmt in payments:
            created = _parse_dt(pmt.get("created_at"))
            if not created:
                continue
            hours = (now - created).total_seconds() / 3600
            if hours <= PAYMENT_PENDING_HOURS:
                continue

            severity = "critical" if hours > 72 else "warning"
            breach_key = f"payment_pending:{pmt.get('payment_id')}"

            if await _was_recently_alerted(breach_key):
                continue

            customer = lead.get("customer_name", "Unknown")
            msg = f"{customer} — payment of {pmt.get('amount')} pending for {round(hours)}h"

            rm_id = lead.get("rm_id")
            if rm_id:
                await _create_sla_notification(
                    rm_id,
                    "Payment Link Stale" if severity == "warning" else "Payment Link Critical",
                    msg, severity, lead["lead_id"], breach_key, "payment_pending",
                )

            for aid in admin_ids:
                await _create_sla_notification(
                    aid,
                    f"Stale Payment: {customer}",
                    msg, severity, lead["lead_id"], f"{breach_key}:admin:{aid}", "payment_pending",
                )

            alerts_created["payment_pending"] += 1

    total = sum(alerts_created.values())
    logger.info(f"SLA check complete: {total} new alerts created - {alerts_created}")

    return {
        "alerts_created": alerts_created,
        "total_new_alerts": total,
        "checked_at": now.isoformat(),
    }
