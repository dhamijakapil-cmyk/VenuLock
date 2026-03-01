"""
Weekly RM Performance Digest Email + Critical SLA Escalation Email service.
"""
from datetime import datetime, timezone, timedelta
from config import db, logger
from utils import send_email_async, generate_id

SENDER_NAME = "BookMyVenue"


def _fmt_currency(amount):
    if not amount:
        return "₹0"
    if amount >= 10000000:
        return f"₹{amount / 10000000:.1f}Cr"
    if amount >= 100000:
        return f"₹{amount / 100000:.1f}L"
    if amount >= 1000:
        return f"₹{amount / 1000:.0f}K"
    return f"₹{amount:.0f}"


def _fmt_hours(hrs):
    if hrs is None:
        return "--"
    if hrs < 1:
        return f"{round(hrs * 60)}m"
    if hrs < 24:
        return f"{round(hrs)}h"
    return f"{hrs / 24:.1f}d"


async def send_weekly_digest_for_rm(rm_id: str, rm_email: str, rm_name: str) -> bool:
    """Build and send weekly performance digest for one RM."""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    # Leads this week
    week_leads = await db.leads.find(
        {"rm_id": rm_id, "created_at": {"$gte": week_ago}}, {"_id": 0}
    ).to_list(10000)

    # All leads for funnel
    all_leads = await db.leads.find({"rm_id": rm_id}, {"_id": 0}).to_list(10000)

    total = len(all_leads)
    contacted = sum(1 for l in all_leads if l.get("first_contacted_at"))
    site_visits = sum(1 for l in all_leads if l.get("stage") in ["site_visit", "negotiation", "booking_confirmed"])
    confirmed = sum(1 for l in all_leads if l.get("stage") == "booking_confirmed")
    conversion = round((confirmed / total * 100), 1) if total else 0

    confirmed_leads = [l for l in all_leads if l.get("stage") == "booking_confirmed" and l.get("deal_value")]
    total_gmv = sum(l.get("deal_value", 0) for l in confirmed_leads)
    avg_deal = round(total_gmv / len(confirmed_leads)) if confirmed_leads else 0

    # SLA status
    active = [l for l in all_leads if l.get("stage") not in ["booking_confirmed", "lost", "closed_not_proceeding"]]
    sla_breaches = 0
    for l in active:
        if l.get("stage") == "new" and not l.get("first_contacted_at"):
            created = l.get("created_at")
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if (now - dt).total_seconds() / 3600 > 24:
                        sla_breaches += 1
                except Exception:
                    pass

    # Top deals this week
    top_deals = sorted(
        [l for l in week_leads if l.get("deal_value")],
        key=lambda l: l.get("deal_value", 0), reverse=True
    )[:3]

    top_deals_html = ""
    for d in top_deals:
        top_deals_html += f"""
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#0B1F3B">{d.get('customer_name','—')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#0B1F3B;text-align:right;font-family:monospace">{_fmt_currency(d.get('deal_value'))}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#64748B;text-transform:capitalize">{d.get('stage','—').replace('_',' ')}</td>
        </tr>"""

    if not top_deals_html:
        top_deals_html = '<tr><td colspan="3" style="padding:12px;text-align:center;color:#64748B;font-size:13px">No new deals this week</td></tr>'

    sla_color = "#16A34A" if sla_breaches == 0 else "#DC2626"
    sla_label = "All Clear" if sla_breaches == 0 else f"{sla_breaches} Breach{'es' if sla_breaches != 1 else ''}"

    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#F9F9F7">
      <div style="background:#0B1F3B;padding:28px 24px;text-align:center">
        <p style="color:#C9A227;font-size:12px;letter-spacing:2px;margin:0">BOOKMYVENUE</p>
        <h1 style="color:white;font-size:22px;margin:8px 0 4px;font-weight:700">Weekly Performance Digest</h1>
        <p style="color:#94A3B8;font-size:13px;margin:0">Hi {rm_name}, here's your week at a glance</p>
      </div>

      <div style="padding:24px">
        <!-- Funnel -->
        <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:16px">
          <tr style="background:#F8FAFC">
            <td style="padding:12px;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px" colspan="4">Lead Funnel</td>
          </tr>
          <tr>
            <td style="padding:16px;text-align:center;border-right:1px solid #E2E8F0">
              <div style="font-size:28px;font-weight:700;color:#0B1F3B;font-family:monospace">{total}</div>
              <div style="font-size:11px;color:#64748B;margin-top:4px">Assigned</div>
            </td>
            <td style="padding:16px;text-align:center;border-right:1px solid #E2E8F0">
              <div style="font-size:28px;font-weight:700;color:#1E3A5F;font-family:monospace">{contacted}</div>
              <div style="font-size:11px;color:#64748B;margin-top:4px">Contacted</div>
            </td>
            <td style="padding:16px;text-align:center;border-right:1px solid #E2E8F0">
              <div style="font-size:28px;font-weight:700;color:#2D5F8A;font-family:monospace">{site_visits}</div>
              <div style="font-size:11px;color:#64748B;margin-top:4px">Site Visits</div>
            </td>
            <td style="padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#16A34A;font-family:monospace">{confirmed}</div>
              <div style="font-size:11px;color:#64748B;margin-top:4px">Confirmed</div>
            </td>
          </tr>
        </table>

        <!-- Key Metrics -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr>
            <td style="width:33%;padding:0 4px 0 0">
              <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px">Conversion</div>
                <div style="font-size:24px;font-weight:700;color:{'#16A34A' if conversion >= 15 else '#D97706' if conversion >= 5 else '#DC2626'};margin-top:4px;font-family:monospace">{conversion}%</div>
              </div>
            </td>
            <td style="width:33%;padding:0 4px">
              <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px">Total GMV</div>
                <div style="font-size:24px;font-weight:700;color:#0B1F3B;margin-top:4px;font-family:monospace">{_fmt_currency(total_gmv)}</div>
              </div>
            </td>
            <td style="width:33%;padding:0 0 0 4px">
              <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px">SLA Status</div>
                <div style="font-size:24px;font-weight:700;color:{sla_color};margin-top:4px">{sla_label}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Top Deals -->
        <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:16px">
          <tr style="background:#F8FAFC">
            <td style="padding:12px;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px" colspan="3">Top Deals This Week</td>
          </tr>
          <tr style="background:#F8FAFC">
            <td style="padding:6px 12px;font-size:11px;color:#64748B;font-weight:600">Customer</td>
            <td style="padding:6px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:right">Value</td>
            <td style="padding:6px 12px;font-size:11px;color:#64748B;font-weight:600">Stage</td>
          </tr>
          {top_deals_html}
        </table>

        <!-- New leads this week -->
        <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px">
          <span style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px">New Leads This Week</span>
          <div style="font-size:32px;font-weight:700;color:#C9A227;margin-top:4px;font-family:monospace">{len(week_leads)}</div>
        </div>

        <div style="text-align:center;padding:8px 0 16px">
          <p style="font-size:12px;color:#94A3B8;margin:0">Sent by BookMyVenue · {now.strftime('%d %b %Y')}</p>
        </div>
      </div>
    </div>
    """

    subject = f"Your Weekly Digest — {conversion}% conversion, {_fmt_currency(total_gmv)} GMV"
    await send_email_async(rm_email, subject, html)

    # Log
    await db.digest_log.insert_one({
        "log_id": generate_id("digest_"),
        "rm_id": rm_id,
        "type": "weekly_digest",
        "sent_at": now.isoformat(),
        "metrics": {"total": total, "confirmed": confirmed, "gmv": total_gmv, "conversion": conversion},
    })
    return True


async def send_weekly_digests_all() -> dict:
    """Send weekly digest to all active RMs."""
    rms = await db.users.find(
        {"role": "rm", "status": "active"}, {"_id": 0}
    ).to_list(100)

    sent = 0
    failed = 0
    for rm in rms:
        try:
            await send_weekly_digest_for_rm(rm["user_id"], rm["email"], rm.get("name", "RM"))
            sent += 1
        except Exception as e:
            logger.error(f"Failed digest for {rm['email']}: {e}")
            failed += 1

    return {"sent": sent, "failed": failed, "total_rms": len(rms)}


# ============== CRITICAL SLA ESCALATION EMAIL ==============

SLA_THRESHOLDS = {
    "new": 24, "contacted": 72, "requirement_understood": 120,
    "shortlisted": 168, "site_visit": 168, "negotiation": 240,
}
ESCALATION_COOLDOWN_HOURS = 24  # 1 email per lead per 24h


async def send_sla_escalation_emails() -> dict:
    """Send escalation emails for critical breaches (>2x threshold)."""
    now = datetime.now(timezone.utc)
    escalated = 0

    # Get admin emails
    admins = await db.users.find(
        {"role": "admin", "status": "active"}, {"_id": 0, "email": 1, "user_id": 1, "name": 1}
    ).to_list(20)
    if not admins:
        return {"escalated": 0, "reason": "no admins"}

    # Active leads
    active_leads = await db.leads.find(
        {"stage": {"$nin": ["booking_confirmed", "lost", "closed_not_proceeding"]}},
        {"_id": 0}
    ).to_list(10000)

    for lead in active_leads:
        stage = lead.get("stage", "new")
        threshold = SLA_THRESHOLDS.get(stage)
        if not threshold:
            continue

        # Check if >2x threshold
        updated_str = lead.get("updated_at") or lead.get("created_at")
        if not updated_str:
            continue
        try:
            updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
            if updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)
        except Exception:
            continue

        hours = (now - updated).total_seconds() / 3600
        if hours <= threshold * 2:
            continue  # Not critical enough for escalation

        lead_id = lead.get("lead_id")

        # Cooldown: check if we already emailed for this lead in last 24h
        cutoff = (now - timedelta(hours=ESCALATION_COOLDOWN_HOURS)).isoformat()
        recent = await db.escalation_log.find_one(
            {"lead_id": lead_id, "sent_at": {"$gte": cutoff}}, {"_id": 0}
        )
        if recent:
            continue

        # Build email
        customer = lead.get("customer_name", "Unknown")
        rm_name = lead.get("rm_name", "Unassigned")
        stage_label = stage.replace("_", " ").title()
        city = lead.get("city", "")
        deal_value = lead.get("deal_value", 0)

        html = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#DC2626;padding:20px 24px;text-align:center">
            <p style="color:white;font-size:12px;letter-spacing:2px;margin:0">BOOKMYVENUE — CRITICAL SLA ESCALATION</p>
          </div>
          <div style="padding:24px;background:white;border:1px solid #FCA5A5;border-top:none">
            <h2 style="color:#DC2626;font-size:18px;margin:0 0 16px">Lead Requires Immediate Intervention</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#64748B;width:140px">Customer</td><td style="padding:8px 0;font-weight:600;color:#0B1F3B">{customer}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B">RM Assigned</td><td style="padding:8px 0;color:#0B1F3B">{rm_name}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B">Current Stage</td><td style="padding:8px 0;color:#DC2626;font-weight:600">{stage_label}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B">Time in Stage</td><td style="padding:8px 0;color:#DC2626;font-weight:700;font-family:monospace">{round(hours)}h (SLA: {threshold}h, 2x: {threshold * 2}h)</td></tr>
              <tr><td style="padding:8px 0;color:#64748B">City</td><td style="padding:8px 0;color:#0B1F3B">{city}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B">Deal Value</td><td style="padding:8px 0;color:#0B1F3B;font-family:monospace">{_fmt_currency(deal_value)}</td></tr>
            </table>
            <div style="margin-top:20px;padding:12px;background:#FEF2F2;border-radius:8px;border:1px solid #FECACA">
              <p style="margin:0;font-size:13px;color:#991B1B">This lead has exceeded 2x the SLA threshold. It requires admin review or reassignment.</p>
            </div>
            <p style="font-size:11px;color:#94A3B8;margin-top:20px;text-align:center">BookMyVenue SLA Monitor · {now.strftime('%d %b %Y %H:%M UTC')}</p>
          </div>
        </div>
        """

        subject = f"[CRITICAL] SLA Breach: {customer} — {stage_label} ({round(hours)}h)"

        for admin in admins:
            await send_email_async(admin["email"], subject, html)

        # Log escalation
        await db.escalation_log.insert_one({
            "log_id": generate_id("esc_"),
            "lead_id": lead_id,
            "rm_id": lead.get("rm_id"),
            "stage": stage,
            "hours_in_stage": round(hours, 1),
            "threshold": threshold,
            "sent_to": [a["email"] for a in admins],
            "sent_at": now.isoformat(),
        })

        escalated += 1

    logger.info(f"SLA escalation: {escalated} emails sent")
    return {"escalated": escalated, "checked_at": now.isoformat()}
