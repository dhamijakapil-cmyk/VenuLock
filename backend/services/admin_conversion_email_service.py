"""
Weekly Admin Conversion Intelligence Email service for VenuLock.
Sends executive summary email to admins every Monday at 9 AM IST.
Includes: Topline metrics, funnel snapshot + leak point, revenue forecast,
channel performance, RM leaderboard, and risk alerts.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from config import db, logger
from utils import send_email_async, generate_id

# ============== FORMATTING HELPERS ==============

def _fmt_currency(amount: float) -> str:
    """Format currency in Indian numbering system."""
    if not amount:
        return "₹0"
    if amount >= 10000000:
        return f"₹{amount / 10000000:.2f}Cr"
    if amount >= 100000:
        return f"₹{amount / 100000:.1f}L"
    if amount >= 1000:
        return f"₹{amount / 1000:.0f}K"
    return f"₹{int(amount)}"


def _fmt_pct(value: float) -> str:
    """Format percentage."""
    if value is None:
        return "--"
    return f"{value:.1f}%"


def _fmt_hours(hrs: float) -> str:
    """Format hours to readable string."""
    if hrs is None:
        return "--"
    if hrs < 1:
        return f"{int(hrs * 60)}m"
    if hrs < 24:
        return f"{hrs:.1f}h"
    return f"{hrs / 24:.1f}d"


def _parse_dt(s: str) -> Optional[datetime]:
    """Parse ISO date string to datetime."""
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _get_trend_indicator(current: float, previous: float) -> str:
    """Get trend indicator with color."""
    if previous == 0:
        return ""
    change = ((current - previous) / previous) * 100
    if change > 5:
        return f'<span style="color:#16A34A;font-size:12px">▲ {change:.1f}%</span>'
    elif change < -5:
        return f'<span style="color:#DC2626;font-size:12px">▼ {abs(change):.1f}%</span>'
    else:
        return f'<span style="color:#64748B;font-size:12px">● {change:.1f}%</span>'


# ============== DATA AGGREGATION ==============

async def _get_topline_metrics(week_start: str, prev_week_start: str, prev_week_end: str) -> Dict:
    """Get topline metrics for current and previous week."""
    # Current week leads
    current_leads = await db.leads.find(
        {"created_at": {"$gte": week_start}}, {"_id": 0}
    ).to_list(50000)
    
    # Previous week leads
    prev_leads = await db.leads.find(
        {"created_at": {"$gte": prev_week_start, "$lt": prev_week_end}}, {"_id": 0}
    ).to_list(50000)
    
    # Current metrics
    total_leads = len(current_leads)
    confirmed = [ld for ld in current_leads if ld.get("stage") == "booking_confirmed"]
    total_confirmed = len(confirmed)
    total_gmv = sum(ld.get("deal_value", 0) for ld in confirmed if ld.get("deal_value"))
    
    # Commission
    total_commission = sum(
        (ld.get("venue_commission_calculated", 0) or 0) + (ld.get("planner_commission_calculated", 0) or 0)
        for ld in confirmed
    )
    
    # Previous week metrics
    prev_confirmed = [ld for ld in prev_leads if ld.get("stage") == "booking_confirmed"]
    prev_gmv = sum(ld.get("deal_value", 0) for ld in prev_confirmed if ld.get("deal_value"))
    prev_commission = sum(
        (ld.get("venue_commission_calculated", 0) or 0) + (ld.get("planner_commission_calculated", 0) or 0)
        for ld in prev_confirmed
    )
    
    # Conversion rate
    conversion = (total_confirmed / total_leads * 100) if total_leads > 0 else 0
    prev_conversion = (len(prev_confirmed) / len(prev_leads) * 100) if prev_leads else 0
    
    return {
        "total_leads": total_leads,
        "prev_leads": len(prev_leads),
        "total_confirmed": total_confirmed,
        "prev_confirmed": len(prev_confirmed),
        "total_gmv": total_gmv,
        "prev_gmv": prev_gmv,
        "total_commission": total_commission,
        "prev_commission": prev_commission,
        "conversion": conversion,
        "prev_conversion": prev_conversion,
    }


async def _get_funnel_snapshot() -> Dict:
    """Get funnel snapshot with leak point analysis."""
    pipeline_stages = ["new", "contacted", "requirement_understood", "shortlisted", 
                       "site_visit", "negotiation", "booking_confirmed"]
    
    all_leads = await db.leads.find({}, {"_id": 0, "stage": 1}).to_list(50000)
    
    # Count leads that reached each stage
    stage_index = {s: i for i, s in enumerate(pipeline_stages)}
    reached = {s: 0 for s in pipeline_stages}
    
    for lead in all_leads:
        stage = lead.get("stage", "new")
        if stage in ("lost", "closed_not_proceeding"):
            reached["new"] += 1
            continue
        idx = stage_index.get(stage, 0)
        for i in range(idx + 1):
            reached[pipeline_stages[i]] += 1
    
    # Calculate transitions and find leak point
    transitions = []
    max_drop_idx = -1
    max_drop_pct = 0
    
    for i in range(len(pipeline_stages) - 1):
        from_stage = pipeline_stages[i]
        to_stage = pipeline_stages[i + 1]
        from_count = reached[from_stage]
        to_count = reached[to_stage]
        
        drop_off = from_count - to_count
        drop_pct = (drop_off / from_count * 100) if from_count > 0 else 0
        conv_rate = (to_count / from_count * 100) if from_count > 0 else 0
        
        if drop_pct > max_drop_pct and from_count > 0:
            max_drop_pct = drop_pct
            max_drop_idx = i
        
        transitions.append({
            "from_stage": from_stage,
            "to_stage": to_stage,
            "from_count": from_count,
            "to_count": to_count,
            "conv_rate": conv_rate,
            "drop_off": drop_off,
            "drop_pct": drop_pct,
        })
    
    leak_point = None
    if max_drop_idx >= 0:
        t = transitions[max_drop_idx]
        leak_point = {
            "from_stage": t["from_stage"].replace("_", " ").title(),
            "to_stage": t["to_stage"].replace("_", " ").title(),
            "drop_off": t["drop_off"],
            "drop_pct": t["drop_pct"],
        }
    
    overall_conversion = (reached["booking_confirmed"] / reached["new"] * 100) if reached["new"] > 0 else 0
    
    return {
        "reached": reached,
        "transitions": transitions,
        "leak_point": leak_point,
        "overall_conversion": overall_conversion,
        "total_leads": reached["new"],
    }


async def _get_revenue_forecast() -> Dict:
    """Get weighted revenue forecast for current month."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    stage_weights = {
        "new": 0.05,
        "contacted": 0.10,
        "requirement_understood": 0.20,
        "shortlisted": 0.35,
        "site_visit": 0.50,
        "negotiation": 0.70,
        "booking_confirmed": 1.0,
    }
    
    # Active pipeline leads
    active_leads = await db.leads.find(
        {"stage": {"$nin": ["booking_confirmed", "lost", "closed_not_proceeding"]}},
        {"_id": 0}
    ).to_list(50000)
    
    pipeline_value = sum(ld.get("deal_value", 0) or 0 for ld in active_leads if ld.get("deal_value"))
    
    # Calculate weighted GMV
    weighted_gmv = 0
    weighted_commission = 0
    stage_breakdown = []
    
    for stage, weight in stage_weights.items():
        if stage == "booking_confirmed":
            continue
        leads_in_stage = [ld for ld in active_leads if ld.get("stage") == stage and ld.get("deal_value")]
        stage_value = sum(ld.get("deal_value", 0) for ld in leads_in_stage)
        weighted_value = stage_value * weight
        weighted_gmv += weighted_value
        
        # Estimate commission at 12% if not set
        for ld in leads_in_stage:
            comm = (ld.get("venue_commission_calculated", 0) or 0) + (ld.get("planner_commission_calculated", 0) or 0)
            if comm == 0:
                comm = (ld.get("deal_value", 0) or 0) * 0.12
            weighted_commission += comm * weight
        
        if leads_in_stage:
            stage_breakdown.append({
                "stage": stage.replace("_", " ").title(),
                "count": len(leads_in_stage),
                "value": stage_value,
                "weight": f"{int(weight * 100)}%",
                "weighted": weighted_value,
            })
    
    # Confirmed this month
    confirmed_this_month = await db.leads.find(
        {"stage": "booking_confirmed", "confirmed_at": {"$gte": month_start}},
        {"_id": 0}
    ).to_list(10000)
    
    confirmed_gmv = sum(ld.get("deal_value", 0) for ld in confirmed_this_month if ld.get("deal_value"))
    confirmed_commission = sum(
        (ld.get("venue_commission_calculated", 0) or 0) + (ld.get("planner_commission_calculated", 0) or 0)
        for ld in confirmed_this_month
    )
    
    return {
        "pipeline_value": pipeline_value,
        "pipeline_count": len(active_leads),
        "weighted_gmv": weighted_gmv,
        "weighted_commission": weighted_commission,
        "confirmed_gmv": confirmed_gmv,
        "confirmed_commission": confirmed_commission,
        "projected_gmv": confirmed_gmv + weighted_gmv,
        "projected_commission": confirmed_commission + weighted_commission,
        "stage_breakdown": stage_breakdown,
    }


async def _get_channel_performance(week_start: str) -> List[Dict]:
    """Get channel/source performance summary."""
    leads = await db.leads.find(
        {"created_at": {"$gte": week_start}},
        {"_id": 0}
    ).to_list(50000)
    
    sources = {}
    for lead in leads:
        source = lead.get("source") or "Direct"
        if source not in sources:
            sources[source] = {"total": 0, "confirmed": 0, "gmv": 0}
        sources[source]["total"] += 1
        if lead.get("stage") == "booking_confirmed":
            sources[source]["confirmed"] += 1
            sources[source]["gmv"] += lead.get("deal_value", 0) or 0
    
    result = []
    for source, data in sources.items():
        conv_rate = (data["confirmed"] / data["total"] * 100) if data["total"] > 0 else 0
        result.append({
            "source": source,
            "leads": data["total"],
            "confirmed": data["confirmed"],
            "gmv": data["gmv"],
            "conversion": conv_rate,
        })
    
    # Sort by leads descending
    result.sort(key=lambda x: x["leads"], reverse=True)
    return result[:5]  # Top 5 channels


async def _get_rm_leaderboard(week_start: str) -> List[Dict]:
    """Get RM leaderboard for the week."""
    rms = await db.users.find(
        {"role": "rm", "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1}
    ).to_list(100)
    
    leaderboard = []
    for rm in rms:
        rm_id = rm["user_id"]
        rm_name = rm.get("name", "Unknown")
        
        # Leads for this RM this week
        leads = await db.leads.find(
            {"rm_id": rm_id, "created_at": {"$gte": week_start}},
            {"_id": 0}
        ).to_list(10000)
        
        total = len(leads)
        confirmed = [ld for ld in leads if ld.get("stage") == "booking_confirmed"]
        gmv = sum(ld.get("deal_value", 0) for ld in confirmed if ld.get("deal_value"))
        conversion = (len(confirmed) / total * 100) if total > 0 else 0
        
        # Time to first contact
        contact_times = []
        for ld in leads:
            if ld.get("first_contacted_at") and ld.get("created_at"):
                created = _parse_dt(ld["created_at"])
                contacted = _parse_dt(ld["first_contacted_at"])
                if created and contacted:
                    hours = (contacted - created).total_seconds() / 3600
                    contact_times.append(hours)
        
        avg_contact = sum(contact_times) / len(contact_times) if contact_times else None
        
        leaderboard.append({
            "rm_name": rm_name,
            "leads": total,
            "confirmed": len(confirmed),
            "gmv": gmv,
            "conversion": conversion,
            "avg_contact_hrs": avg_contact,
        })
    
    # Sort by GMV descending
    leaderboard.sort(key=lambda x: x["gmv"], reverse=True)
    return leaderboard[:5]  # Top 5 RMs


async def _get_risk_alerts() -> Dict:
    """Get risk alerts: SLA breaches, payment delays, expiring holds."""
    now = datetime.now(timezone.utc)
    
    # SLA Breaches - leads with no contact > 24h
    sla_breaches = []
    new_leads = await db.leads.find(
        {"stage": "new", "first_contacted_at": {"$exists": False}},
        {"_id": 0}
    ).to_list(10000)
    
    for lead in new_leads:
        created = _parse_dt(lead.get("created_at"))
        if created:
            hours = (now - created).total_seconds() / 3600
            if hours > 24:
                sla_breaches.append({
                    "lead_id": lead.get("lead_id"),
                    "customer": lead.get("customer_name", "Unknown"),
                    "rm_name": lead.get("rm_name", "Unassigned"),
                    "hours": hours,
                    "severity": "critical" if hours > 48 else "warning",
                })
    
    sla_breaches.sort(key=lambda x: x["hours"], reverse=True)
    
    # Payment Delays - pending payments > 24h
    payment_delays = []
    pending_leads = await db.leads.find(
        {"payment_status": {"$in": ["awaiting_advance", "pending"]}},
        {"_id": 0}
    ).to_list(5000)
    
    for lead in pending_leads:
        payments = await db.payments.find(
            {"lead_id": lead.get("lead_id"), "status": "pending"},
            {"_id": 0}
        ).to_list(10)
        for pmt in payments:
            created = _parse_dt(pmt.get("created_at"))
            if created:
                hours = (now - created).total_seconds() / 3600
                if hours > 24:
                    payment_delays.append({
                        "customer": lead.get("customer_name", "Unknown"),
                        "amount": pmt.get("amount", 0),
                        "hours": hours,
                        "severity": "critical" if hours > 72 else "warning",
                    })
    
    payment_delays.sort(key=lambda x: x["hours"], reverse=True)
    
    # Expiring Holds - holds expiring in < 12h
    expiring_holds = []
    active_holds = await db.date_holds.find(
        {"status": "active"}, {"_id": 0}
    ).to_list(5000)
    
    for hold in active_holds:
        expires = _parse_dt(hold.get("expires_at"))
        if expires:
            remaining = (expires - now).total_seconds() / 3600
            if 0 < remaining < 12:
                venue = await db.venues.find_one(
                    {"venue_id": hold.get("venue_id")},
                    {"_id": 0, "name": 1}
                )
                expiring_holds.append({
                    "venue": venue.get("name") if venue else "Unknown",
                    "date": hold.get("date"),
                    "remaining_hrs": remaining,
                    "severity": "critical" if remaining < 3 else "warning",
                })
    
    expiring_holds.sort(key=lambda x: x["remaining_hrs"])
    
    return {
        "sla_breaches": sla_breaches[:5],
        "payment_delays": payment_delays[:5],
        "expiring_holds": expiring_holds[:5],
        "total_critical": (
            sum(1 for s in sla_breaches if s["severity"] == "critical") +
            sum(1 for p in payment_delays if p["severity"] == "critical") +
            sum(1 for h in expiring_holds if h["severity"] == "critical")
        ),
        "total_warnings": (
            sum(1 for s in sla_breaches if s["severity"] == "warning") +
            sum(1 for p in payment_delays if p["severity"] == "warning") +
            sum(1 for h in expiring_holds if h["severity"] == "warning")
        ),
    }


# ============== EMAIL BUILDER ==============

def _build_email_html(
    topline: Dict,
    funnel: Dict,
    forecast: Dict,
    channels: List[Dict],
    leaderboard: List[Dict],
    risks: Dict,
    generated_at: str,
) -> str:
    """Build the HTML email content."""
    
    # Topline metrics section
    topline_html = f"""
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td colspan="4" style="padding:16px;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E2E8F0">
          This Week's Performance
        </td>
      </tr>
      <tr>
        <td style="padding:20px;text-align:center;border-right:1px solid #E2E8F0">
          <div style="font-size:32px;font-weight:700;color:#111111;font-family:'Georgia',serif">{topline['total_leads']}</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px">New Leads</div>
          <div style="margin-top:4px">{_get_trend_indicator(topline['total_leads'], topline['prev_leads'])}</div>
        </td>
        <td style="padding:20px;text-align:center;border-right:1px solid #E2E8F0">
          <div style="font-size:32px;font-weight:700;color:#16A34A;font-family:'Georgia',serif">{topline['total_confirmed']}</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px">Bookings</div>
          <div style="margin-top:4px">{_get_trend_indicator(topline['total_confirmed'], topline['prev_confirmed'])}</div>
        </td>
        <td style="padding:20px;text-align:center;border-right:1px solid #E2E8F0">
          <div style="font-size:32px;font-weight:700;color:#F5C84C;font-family:'Georgia',serif">{_fmt_currency(topline['total_gmv'])}</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px">GMV</div>
          <div style="margin-top:4px">{_get_trend_indicator(topline['total_gmv'], topline['prev_gmv'])}</div>
        </td>
        <td style="padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#111111;font-family:'Georgia',serif">{_fmt_pct(topline['conversion'])}</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px">Conversion</div>
          <div style="margin-top:4px">{_get_trend_indicator(topline['conversion'], topline['prev_conversion'])}</div>
        </td>
      </tr>
    </table>
    """
    
    # Funnel + Leak Point section
    leak_point_html = ""
    if funnel.get("leak_point"):
        lp = funnel["leak_point"]
        leak_point_html = f"""
        <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:16px;margin-top:16px">
          <div style="font-size:12px;color:#92400E;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
            ⚠️ Biggest Leak Point
          </div>
          <div style="font-size:15px;color:#78350F">
            <strong>{lp['from_stage']}</strong> → <strong>{lp['to_stage']}</strong>: 
            {lp['drop_off']} leads dropped ({_fmt_pct(lp['drop_pct'])} drop-off)
          </div>
        </div>
        """
    
    funnel_html = f"""
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td colspan="7" style="padding:16px;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E2E8F0">
          Conversion Funnel (All Time)
        </td>
      </tr>
      <tr style="text-align:center">
        <td style="padding:16px;border-right:1px solid #E2E8F0">
          <div style="font-size:24px;font-weight:700;color:#111111">{funnel['reached']['new']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">NEW</div>
        </td>
        <td style="padding:16px;border-right:1px solid #E2E8F0">
          <div style="font-size:24px;font-weight:700;color:#1E3A5F">{funnel['reached']['contacted']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">CONTACTED</div>
        </td>
        <td style="padding:16px;border-right:1px solid #E2E8F0">
          <div style="font-size:24px;font-weight:700;color:#2D5F8A">{funnel['reached']['requirement_understood']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">REQ UNDERSTOOD</div>
        </td>
        <td style="padding:16px;border-right:1px solid #E2E8F0">
          <div style="font-size:24px;font-weight:700;color:#3D7EA8">{funnel['reached']['shortlisted']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">SHORTLISTED</div>
        </td>
        <td style="padding:16px;border-right:1px solid #E2E8F0">
          <div style="font-size:24px;font-weight:700;color:#4A9CC6">{funnel['reached']['site_visit']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">SITE VISIT</div>
        </td>
        <td style="padding:16px;border-right:1px solid #E2E8F0">
          <div style="font-size:24px;font-weight:700;color:#5BB0D4">{funnel['reached']['negotiation']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">NEGOTIATION</div>
        </td>
        <td style="padding:16px">
          <div style="font-size:24px;font-weight:700;color:#16A34A">{funnel['reached']['booking_confirmed']}</div>
          <div style="font-size:10px;color:#64748B;margin-top:4px">CONFIRMED</div>
        </td>
      </tr>
      <tr>
        <td colspan="7" style="padding:0 16px 16px">
          <div style="text-align:center;font-size:14px;color:#111111;font-weight:600">
            Overall Conversion: <span style="color:#F5C84C">{_fmt_pct(funnel['overall_conversion'])}</span>
          </div>
          {leak_point_html}
        </td>
      </tr>
    </table>
    """
    
    # Revenue Forecast section
    forecast_html = f"""
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td colspan="2" style="padding:16px;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E2E8F0">
          Revenue Forecast (This Month)
        </td>
      </tr>
      <tr>
        <td style="padding:20px;border-right:1px solid #E2E8F0">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748B">Pipeline Value</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#111111;font-family:monospace">{_fmt_currency(forecast['pipeline_value'])}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748B">Active Deals</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#111111">{forecast['pipeline_count']}</td>
            </tr>
            <tr style="border-top:1px solid #E2E8F0">
              <td style="padding:8px 0;font-size:13px;color:#64748B">Weighted GMV</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;color:#F5C84C;font-family:monospace">{_fmt_currency(forecast['weighted_gmv'])}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748B">Weighted Commission</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;color:#F5C84C;font-family:monospace">{_fmt_currency(forecast['weighted_commission'])}</td>
            </tr>
          </table>
        </td>
        <td style="padding:20px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748B">Confirmed GMV</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#16A34A;font-family:monospace">{_fmt_currency(forecast['confirmed_gmv'])}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748B">Confirmed Commission</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#16A34A;font-family:monospace">{_fmt_currency(forecast['confirmed_commission'])}</td>
            </tr>
            <tr style="border-top:2px solid #111111">
              <td style="padding:12px 0;font-size:14px;color:#111111;font-weight:700">Projected Total GMV</td>
              <td style="padding:12px 0;text-align:right;font-size:20px;font-weight:700;color:#111111;font-family:'Georgia',serif">{_fmt_currency(forecast['projected_gmv'])}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#111111;font-weight:700">Projected Commission</td>
              <td style="padding:8px 0;text-align:right;font-size:20px;font-weight:700;color:#F5C84C;font-family:'Georgia',serif">{_fmt_currency(forecast['projected_commission'])}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    """
    
    # Channel Performance section
    channels_rows = ""
    for ch in channels:
        channels_rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#111111">{ch['source']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#111111;text-align:center">{ch['leads']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#16A34A;text-align:center">{ch['confirmed']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#F5C84C;text-align:right;font-family:monospace">{_fmt_currency(ch['gmv'])}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#111111;text-align:right">{_fmt_pct(ch['conversion'])}</td>
        </tr>
        """
    
    channels_html = f"""
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td colspan="5" style="padding:16px;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E2E8F0">
          Channel Performance (This Week)
        </td>
      </tr>
      <tr style="background:#F8FAFC">
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600">Source</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:center">Leads</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:center">Confirmed</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:right">GMV</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:right">Conv %</td>
      </tr>
      {channels_rows if channels_rows else '<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748B">No channel data this week</td></tr>'}
    </table>
    """
    
    # RM Leaderboard section
    leaderboard_rows = ""
    for i, rm in enumerate(leaderboard):
        medal = ["🥇", "🥈", "🥉"][i] if i < 3 else f"#{i+1}"
        contact_display = _fmt_hours(rm['avg_contact_hrs']) if rm['avg_contact_hrs'] else "--"
        leaderboard_rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#111111">{medal} {rm['rm_name']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#111111;text-align:center">{rm['leads']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#16A34A;text-align:center">{rm['confirmed']}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#F5C84C;text-align:right;font-family:monospace">{_fmt_currency(rm['gmv'])}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#111111;text-align:right">{_fmt_pct(rm['conversion'])}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#64748B;text-align:right">{contact_display}</td>
        </tr>
        """
    
    leaderboard_html = f"""
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td colspan="6" style="padding:16px;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E2E8F0">
          RM Leaderboard (This Week)
        </td>
      </tr>
      <tr style="background:#F8FAFC">
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600">RM</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:center">Leads</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:center">Confirmed</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:right">GMV</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:right">Conv %</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:right">Avg Contact</td>
      </tr>
      {leaderboard_rows if leaderboard_rows else '<tr><td colspan="6" style="padding:16px;text-align:center;color:#64748B">No RM data this week</td></tr>'}
    </table>
    """
    
    # Risk Alerts section
    alerts_content = ""
    
    if risks["sla_breaches"]:
        alerts_content += '<div style="margin-bottom:16px"><div style="font-size:12px;color:#DC2626;font-weight:600;margin-bottom:8px">SLA BREACHES</div>'
        for breach in risks["sla_breaches"]:
            severity_color = "#DC2626" if breach["severity"] == "critical" else "#F59E0B"
            alerts_content += f'<div style="padding:8px;background:#FEF2F2;border-radius:4px;margin-bottom:4px;font-size:13px"><span style="color:{severity_color}">●</span> {breach["customer"]} — {breach["rm_name"]} — {round(breach["hours"])}h no contact</div>'
        alerts_content += '</div>'
    
    if risks["payment_delays"]:
        alerts_content += '<div style="margin-bottom:16px"><div style="font-size:12px;color:#D97706;font-weight:600;margin-bottom:8px">PAYMENT DELAYS</div>'
        for delay in risks["payment_delays"]:
            severity_color = "#DC2626" if delay["severity"] == "critical" else "#F59E0B"
            alerts_content += f'<div style="padding:8px;background:#FFFBEB;border-radius:4px;margin-bottom:4px;font-size:13px"><span style="color:{severity_color}">●</span> {delay["customer"]} — {_fmt_currency(delay["amount"])} pending {round(delay["hours"])}h</div>'
        alerts_content += '</div>'
    
    if risks["expiring_holds"]:
        alerts_content += '<div style="margin-bottom:16px"><div style="font-size:12px;color:#7C3AED;font-weight:600;margin-bottom:8px">EXPIRING HOLDS</div>'
        for hold in risks["expiring_holds"]:
            severity_color = "#DC2626" if hold["severity"] == "critical" else "#F59E0B"
            alerts_content += f'<div style="padding:8px;background:#F5F3FF;border-radius:4px;margin-bottom:4px;font-size:13px"><span style="color:{severity_color}">●</span> {hold["venue"]} — {hold["date"]} — expires in {_fmt_hours(hold["remaining_hrs"])}</div>'
        alerts_content += '</div>'
    
    if not alerts_content:
        alerts_content = '<div style="text-align:center;padding:20px;color:#16A34A;font-size:14px">✓ No critical alerts this week</div>'
    
    alert_badge = f'<span style="background:#DC2626;color:white;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:8px">{risks["total_critical"]} critical</span>' if risks["total_critical"] > 0 else ''
    
    alerts_html = f"""
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td style="padding:16px;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E2E8F0">
          Risk Alerts {alert_badge}
        </td>
      </tr>
      <tr>
        <td style="padding:16px">
          {alerts_content}
        </td>
      </tr>
    </table>
    """
    
    # Full email
    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;background:#F9F9F7">
      <!-- Header -->
      <div style="background:#111111;padding:32px 24px;text-align:center">
        <p style="color:#F5C84C;font-size:12px;letter-spacing:3px;margin:0;font-weight:600">BOOKMYVENUE</p>
        <h1 style="color:white;font-size:24px;margin:12px 0 4px;font-family:'Georgia',serif;font-weight:400">Weekly Intelligence Report</h1>
        <p style="color:#94A3B8;font-size:13px;margin:0">{generated_at}</p>
      </div>
      
      <!-- Content -->
      <div style="padding:24px">
        {topline_html}
        {funnel_html}
        {forecast_html}
        {channels_html}
        {leaderboard_html}
        {alerts_html}
        
        <!-- Footer -->
        <div style="text-align:center;padding:24px 0 8px;border-top:1px solid #E2E8F0">
          <p style="font-size:12px;color:#94A3B8;margin:0">
            This report was auto-generated by VenuLock Intelligence System
          </p>
          <p style="font-size:11px;color:#94A3B8;margin:8px 0 0">
            © {datetime.now().year} VenuLock — WE TALK. YOU LOCK.
          </p>
        </div>
      </div>
    </div>
    """
    
    return html


# ============== MAIN SERVICE FUNCTIONS ==============

async def generate_admin_conversion_email() -> Dict:
    """
    Generate the complete admin conversion intelligence email data.
    Returns data dict with all sections + HTML.
    """
    now = datetime.now(timezone.utc)
    
    # Calculate date ranges
    week_start = (now - timedelta(days=7)).isoformat()
    prev_week_start = (now - timedelta(days=14)).isoformat()
    prev_week_end = week_start
    
    # Aggregate all data
    topline = await _get_topline_metrics(week_start, prev_week_start, prev_week_end)
    funnel = await _get_funnel_snapshot()
    forecast = await _get_revenue_forecast()
    channels = await _get_channel_performance(week_start)
    leaderboard = await _get_rm_leaderboard(week_start)
    risks = await _get_risk_alerts()
    
    generated_at = now.strftime("%A, %d %B %Y at %I:%M %p IST")
    
    # Check if there's meaningful data
    has_meaningful_data = (
        topline["total_leads"] > 0 or 
        topline["total_gmv"] > 0 or 
        funnel["total_leads"] > 0 or
        risks["total_critical"] > 0
    )
    
    if not has_meaningful_data:
        logger.info("No meaningful data for admin conversion email, skipping")
        return {
            "skipped": True,
            "reason": "No meaningful data",
            "generated_at": now.isoformat(),
        }
    
    # Build email HTML
    html = _build_email_html(
        topline, funnel, forecast, channels, leaderboard, risks, generated_at
    )
    
    return {
        "topline": topline,
        "funnel": funnel,
        "forecast": forecast,
        "channels": channels,
        "leaderboard": leaderboard,
        "risks": risks,
        "html": html,
        "generated_at": now.isoformat(),
        "skipped": False,
    }


async def send_admin_conversion_email(manual: bool = False) -> Dict:
    """
    Generate and send the admin conversion intelligence email.
    
    Args:
        manual: If True, this is a manual trigger (for testing)
    
    Returns:
        Dict with send status and metrics
    """
    now = datetime.now(timezone.utc)
    
    # Get all admin emails
    admins = await db.users.find(
        {"role": "admin", "status": "active"},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    ).to_list(20)
    
    if not admins:
        logger.warning("No active admins found, skipping conversion email")
        return {"sent": 0, "reason": "No admins", "generated_at": now.isoformat()}
    
    # Check if already sent today (skip check for manual trigger)
    if not manual:
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        recent = await db.admin_conversion_email_log.find_one(
            {"sent_at": {"$gte": today_start}, "manual": False}
        )
        if recent:
            logger.info("Admin conversion email already sent today, skipping")
            return {"sent": 0, "reason": "Already sent today", "generated_at": now.isoformat()}
    
    # Generate email
    email_data = await generate_admin_conversion_email()
    
    if email_data.get("skipped"):
        return email_data
    
    html = email_data["html"]
    topline = email_data["topline"]
    risks = email_data["risks"]
    
    # Build subject line
    alert_prefix = f"[{risks['total_critical']} ALERTS] " if risks["total_critical"] > 0 else ""
    subject = f"{alert_prefix}Weekly Intelligence: {_fmt_currency(topline['total_gmv'])} GMV, {topline['total_confirmed']} Bookings"
    
    # Send to all admins
    sent_count = 0
    failed = []
    
    for admin in admins:
        try:
            await send_email_async(admin["email"], subject, html)
            sent_count += 1
            logger.info(f"Admin conversion email sent to {admin['email']}")
        except Exception as e:
            logger.error(f"Failed to send admin conversion email to {admin['email']}: {e}")
            failed.append(admin["email"])
    
    # Log the send
    await db.admin_conversion_email_log.insert_one({
        "log_id": generate_id("ace_"),
        "sent_at": now.isoformat(),
        "manual": manual,
        "recipients": [a["email"] for a in admins],
        "sent_count": sent_count,
        "failed": failed,
        "metrics": {
            "total_leads": topline["total_leads"],
            "total_confirmed": topline["total_confirmed"],
            "total_gmv": topline["total_gmv"],
            "conversion": topline["conversion"],
            "critical_alerts": risks["total_critical"],
        },
    })
    
    return {
        "sent": sent_count,
        "failed": len(failed),
        "recipients": [a["email"] for a in admins],
        "metrics": {
            "gmv": topline["total_gmv"],
            "bookings": topline["total_confirmed"],
            "alerts": risks["total_critical"],
        },
        "generated_at": now.isoformat(),
        "manual": manual,
    }
