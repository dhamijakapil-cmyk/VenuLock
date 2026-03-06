"""
RM Performance Analytics service for VenuLock API.
Computes per-RM metrics: funnel, conversion, GMV, time-to-contact, time-to-close,
revenue/commission attributed, and lead aging / SLA breach detection.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dateutil.relativedelta import relativedelta
from config import db, LEAD_STAGES

# SLA Configuration (hours)
SLA_FIRST_CONTACT_HOURS = 24
SLA_FOLLOW_UP_HOURS = 48
AGING_THRESHOLDS = {
    "new": 24,           # Must be contacted within 24h
    "contacted": 72,     # Must progress within 3 days
    "requirement_understood": 120,  # 5 days
    "shortlisted": 168,  # 7 days
    "site_visit": 168,   # 7 days
    "negotiation": 240,  # 10 days
}


def _parse_date(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _hours_between(start_str: str, end_str: str) -> Optional[float]:
    s = _parse_date(start_str)
    e = _parse_date(end_str)
    if s and e:
        return (e - s).total_seconds() / 3600
    return None


def _get_period_start(time_period: str) -> str:
    now = datetime.now(timezone.utc)
    if time_period == "week":
        start = now - relativedelta(days=7)
    elif time_period == "quarter":
        start = now - relativedelta(months=3)
    elif time_period == "year":
        start = now - relativedelta(years=1)
    elif time_period == "all":
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
    else:
        start = now - relativedelta(months=1)
    return start.isoformat()


async def get_rm_detailed_analytics(time_period: str = "month") -> Dict:
    """Return comprehensive RM analytics for Admin dashboard."""
    start_date = _get_period_start(time_period)
    now = datetime.now(timezone.utc)

    rms = await db.users.find(
        {"role": "rm", "status": "active"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)

    rm_analytics = []

    for rm in rms:
        rm_id = rm["user_id"]
        rm_name = rm.get("name", "Unknown")

        # All leads for this RM in period
        all_leads = await db.leads.find(
            {"rm_id": rm_id, "created_at": {"$gte": start_date}},
            {"_id": 0}
        ).to_list(10000)

        total_assigned = len(all_leads)

        # Stage funnel counts
        contacted = sum(1 for l in all_leads if l.get("first_contacted_at"))
        site_visits = sum(1 for l in all_leads if l.get("stage") in ["site_visit", "negotiation", "booking_confirmed"])
        confirmed = sum(1 for l in all_leads if l.get("stage") == "booking_confirmed")
        lost = sum(1 for l in all_leads if l.get("stage") in ["lost", "closed_not_proceeding"])

        # Deal values
        confirmed_leads = [l for l in all_leads if l.get("stage") == "booking_confirmed" and l.get("deal_value")]
        total_gmv = sum(l.get("deal_value", 0) for l in confirmed_leads)
        avg_deal_size = round(total_gmv / len(confirmed_leads)) if confirmed_leads else 0

        # Conversion rates
        assign_to_contact = round((contacted / total_assigned * 100), 1) if total_assigned else 0
        contact_to_visit = round((site_visits / contacted * 100), 1) if contacted else 0
        visit_to_confirm = round((confirmed / site_visits * 100), 1) if site_visits else 0
        overall_conversion = round((confirmed / total_assigned * 100), 1) if total_assigned else 0

        # Time metrics
        contact_times = []
        close_times = []
        for l in all_leads:
            t = _hours_between(l.get("created_at"), l.get("first_contacted_at"))
            if t is not None:
                contact_times.append(t)
            t2 = _hours_between(l.get("created_at"), l.get("confirmed_at"))
            if t2 is not None:
                close_times.append(t2)

        avg_time_to_contact = round(sum(contact_times) / len(contact_times), 1) if contact_times else None
        avg_time_to_close = round(sum(close_times) / len(close_times), 1) if close_times else None

        # Revenue / Commission attributed
        commission_pipeline = [
            {"$match": {"rm_id": rm_id, "stage": "booking_confirmed", "created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": None,
                "total_venue_commission": {"$sum": {"$ifNull": ["$venue_commission_calculated", 0]}},
                "total_planner_commission": {"$sum": {"$ifNull": ["$planner_commission_calculated", 0]}}
            }}
        ]
        comm_result = await db.leads.aggregate(commission_pipeline).to_list(1)
        total_venue_commission = comm_result[0]["total_venue_commission"] if comm_result else 0
        total_planner_commission = comm_result[0]["total_planner_commission"] if comm_result else 0
        total_commission = total_venue_commission + total_planner_commission

        rm_analytics.append({
            "rm_id": rm_id,
            "rm_name": rm_name,
            "email": rm.get("email"),
            "funnel": {
                "assigned": total_assigned,
                "contacted": contacted,
                "site_visits": site_visits,
                "confirmed": confirmed,
                "lost": lost,
            },
            "conversion_rates": {
                "overall": overall_conversion,
                "assign_to_contact": assign_to_contact,
                "contact_to_visit": contact_to_visit,
                "visit_to_confirm": visit_to_confirm,
            },
            "financials": {
                "total_gmv": total_gmv,
                "avg_deal_size": avg_deal_size,
                "total_commission": total_commission,
                "venue_commission": total_venue_commission,
                "planner_commission": total_planner_commission,
            },
            "time_metrics": {
                "avg_time_to_first_contact_hrs": avg_time_to_contact,
                "avg_time_to_close_hrs": avg_time_to_close,
            },
        })

    # Sort by total GMV descending
    rm_analytics.sort(key=lambda x: x["financials"]["total_gmv"], reverse=True)

    # Aggregate totals
    total_leads = sum(r["funnel"]["assigned"] for r in rm_analytics)
    total_gmv_all = sum(r["financials"]["total_gmv"] for r in rm_analytics)
    total_confirmed = sum(r["funnel"]["confirmed"] for r in rm_analytics)
    total_commission_all = sum(r["financials"]["total_commission"] for r in rm_analytics)

    return {
        "rms": rm_analytics,
        "summary": {
            "total_rms": len(rm_analytics),
            "total_leads": total_leads,
            "total_confirmed": total_confirmed,
            "total_gmv": total_gmv_all,
            "total_commission": total_commission_all,
            "overall_conversion": round((total_confirmed / total_leads * 100), 1) if total_leads else 0,
        },
        "time_period": time_period,
        "generated_at": now.isoformat(),
    }


async def get_aging_leads_and_sla_breaches() -> Dict:
    """Detect leads that are aging beyond SLA thresholds."""
    now = datetime.now(timezone.utc)

    # Active leads (not confirmed/lost)
    active_leads = await db.leads.find(
        {"stage": {"$nin": ["booking_confirmed", "lost", "closed_not_proceeding"]}},
        {"_id": 0}
    ).to_list(10000)

    aging_leads = []
    sla_breaches = []

    for lead in active_leads:
        stage = lead.get("stage", "new")
        created_at = _parse_date(lead.get("created_at"))
        updated_at = _parse_date(lead.get("updated_at"))
        first_contacted = _parse_date(lead.get("first_contacted_at"))

        if not created_at:
            continue

        # SLA: First Contact
        if stage == "new" and not first_contacted:
            hours_since_creation = (now - created_at).total_seconds() / 3600
            if hours_since_creation > SLA_FIRST_CONTACT_HOURS:
                sla_breaches.append({
                    "lead_id": lead.get("lead_id"),
                    "customer_name": lead.get("customer_name"),
                    "rm_id": lead.get("rm_id"),
                    "rm_name": lead.get("rm_name"),
                    "breach_type": "first_contact_sla",
                    "breach_description": f"No first contact in {round(hours_since_creation)}h (SLA: {SLA_FIRST_CONTACT_HOURS}h)",
                    "hours_overdue": round(hours_since_creation - SLA_FIRST_CONTACT_HOURS, 1),
                    "severity": "critical" if hours_since_creation > SLA_FIRST_CONTACT_HOURS * 2 else "warning",
                    "stage": stage,
                    "created_at": lead.get("created_at"),
                    "city": lead.get("city"),
                    "event_type": lead.get("event_type"),
                })

        # Lead Aging: stuck in a stage too long
        threshold_hours = AGING_THRESHOLDS.get(stage)
        if threshold_hours and updated_at:
            hours_in_stage = (now - updated_at).total_seconds() / 3600
            if hours_in_stage > threshold_hours:
                entry = {
                    "lead_id": lead.get("lead_id"),
                    "customer_name": lead.get("customer_name"),
                    "rm_id": lead.get("rm_id"),
                    "rm_name": lead.get("rm_name"),
                    "stage": stage,
                    "hours_in_stage": round(hours_in_stage, 1),
                    "threshold_hours": threshold_hours,
                    "hours_overdue": round(hours_in_stage - threshold_hours, 1),
                    "severity": "critical" if hours_in_stage > threshold_hours * 2 else "warning",
                    "created_at": lead.get("created_at"),
                    "updated_at": lead.get("updated_at"),
                    "city": lead.get("city"),
                    "event_type": lead.get("event_type"),
                    "deal_value": lead.get("deal_value"),
                }
                aging_leads.append(entry)

                # Also add as SLA breach
                sla_breaches.append({
                    **entry,
                    "breach_type": "stage_aging_sla",
                    "breach_description": f"Stuck in '{stage}' for {round(hours_in_stage)}h (SLA: {threshold_hours}h)",
                })

    # Sort by severity (critical first) then hours overdue
    severity_order = {"critical": 0, "warning": 1}
    aging_leads.sort(key=lambda x: (severity_order.get(x["severity"], 2), -x["hours_overdue"]))
    sla_breaches.sort(key=lambda x: (severity_order.get(x["severity"], 2), -x["hours_overdue"]))

    # Summary by RM
    rm_breach_summary = {}
    for breach in sla_breaches:
        rm_id = breach.get("rm_id") or "unassigned"
        if rm_id not in rm_breach_summary:
            rm_breach_summary[rm_id] = {
                "rm_name": breach.get("rm_name", "Unassigned"),
                "critical": 0,
                "warning": 0,
                "total": 0,
            }
        rm_breach_summary[rm_id][breach["severity"]] += 1
        rm_breach_summary[rm_id]["total"] += 1

    return {
        "aging_leads": aging_leads,
        "sla_breaches": sla_breaches,
        "summary": {
            "total_aging": len(aging_leads),
            "total_breaches": len(sla_breaches),
            "critical_breaches": sum(1 for b in sla_breaches if b["severity"] == "critical"),
            "warning_breaches": sum(1 for b in sla_breaches if b["severity"] == "warning"),
        },
        "rm_breach_summary": list(rm_breach_summary.values()),
        "sla_config": {
            "first_contact_hours": SLA_FIRST_CONTACT_HOURS,
            "aging_thresholds": AGING_THRESHOLDS,
        },
        "generated_at": now.isoformat(),
    }


async def get_my_performance(rm_id: str) -> Dict:
    """Return personal performance for one RM plus team averages for comparison."""
    now = datetime.now(timezone.utc)

    all_leads = await db.leads.find({"rm_id": rm_id}, {"_id": 0}).to_list(10000)

    total_assigned = len(all_leads)
    contacted = sum(1 for l in all_leads if l.get("first_contacted_at"))
    site_visits = sum(1 for l in all_leads if l.get("stage") in ["site_visit", "negotiation", "booking_confirmed"])
    confirmed = sum(1 for l in all_leads if l.get("stage") == "booking_confirmed")
    lost = sum(1 for l in all_leads if l.get("stage") in ["lost", "closed_not_proceeding"])

    confirmed_leads = [l for l in all_leads if l.get("stage") == "booking_confirmed" and l.get("deal_value")]
    total_gmv = sum(l.get("deal_value", 0) for l in confirmed_leads)
    avg_deal_size = round(total_gmv / len(confirmed_leads)) if confirmed_leads else 0

    overall_conversion = round((confirmed / total_assigned * 100), 1) if total_assigned else 0
    contacted_pct = round((contacted / total_assigned * 100), 1) if total_assigned else 0
    visit_pct = round((site_visits / total_assigned * 100), 1) if total_assigned else 0
    confirm_pct = round((confirmed / total_assigned * 100), 1) if total_assigned else 0

    contact_times = []
    close_times = []
    for l in all_leads:
        t = _hours_between(l.get("created_at"), l.get("first_contacted_at"))
        if t is not None:
            contact_times.append(t)
        t2 = _hours_between(l.get("created_at"), l.get("confirmed_at"))
        if t2 is not None:
            close_times.append(t2)

    avg_first_contact = round(sum(contact_times) / len(contact_times), 1) if contact_times else None
    avg_close = round(sum(close_times) / len(close_times), 1) if close_times else None

    comm_pipeline = [
        {"$match": {"rm_id": rm_id, "stage": "booking_confirmed"}},
        {"$group": {
            "_id": None,
            "venue_commission": {"$sum": {"$ifNull": ["$venue_commission_calculated", 0]}},
            "planner_commission": {"$sum": {"$ifNull": ["$planner_commission_calculated", 0]}},
        }}
    ]
    comm_result = await db.leads.aggregate(comm_pipeline).to_list(1)
    total_commission = (comm_result[0]["venue_commission"] + comm_result[0]["planner_commission"]) if comm_result else 0

    # Team averages
    all_rms = await db.users.find({"role": "rm", "status": "active"}, {"_id": 0}).to_list(100)
    team_size = max(len(all_rms), 1)

    team_pipeline = [
        {"$match": {"rm_id": {"$in": [r["user_id"] for r in all_rms]}}},
        {"$group": {
            "_id": None,
            "total_leads": {"$sum": 1},
            "total_confirmed": {"$sum": {"$cond": [{"$eq": ["$stage", "booking_confirmed"]}, 1, 0]}},
            "total_gmv": {"$sum": {"$cond": [{"$eq": ["$stage", "booking_confirmed"]}, {"$ifNull": ["$deal_value", 0]}, 0]}},
        }}
    ]
    team_result = await db.leads.aggregate(team_pipeline).to_list(1)
    tr = team_result[0] if team_result else {}

    team_avg_leads = round(tr.get("total_leads", 0) / team_size)
    team_avg_confirmed = round(tr.get("total_confirmed", 0) / team_size, 1)
    team_avg_gmv = round(tr.get("total_gmv", 0) / team_size)
    team_total_leads = tr.get("total_leads", 0)
    team_total_confirmed = tr.get("total_confirmed", 0)
    team_avg_conversion = round((team_total_confirmed / team_total_leads * 100), 1) if team_total_leads else 0

    return {
        "funnel": {
            "assigned": total_assigned,
            "contacted": contacted,
            "contacted_pct": contacted_pct,
            "site_visits": site_visits,
            "site_visit_pct": visit_pct,
            "confirmed": confirmed,
            "confirmed_pct": confirm_pct,
            "lost": lost,
            "conversion_rate": overall_conversion,
        },
        "financials": {
            "total_gmv": total_gmv,
            "avg_deal_size": avg_deal_size,
            "total_commission": total_commission,
        },
        "time_metrics": {
            "avg_first_contact_hrs": avg_first_contact,
            "avg_close_hrs": avg_close,
        },
        "team_averages": {
            "avg_leads_per_rm": team_avg_leads,
            "avg_confirmed_per_rm": team_avg_confirmed,
            "avg_gmv_per_rm": team_avg_gmv,
            "avg_conversion_rate": team_avg_conversion,
            "team_size": team_size,
        },
        "generated_at": now.isoformat(),
    }


async def get_my_sla_alerts(rm_id: str) -> Dict:
    """Return SLA alerts specific to one RM: aging leads, expiring holds, stale payment links."""
    now = datetime.now(timezone.utc)

    # 1) Aging leads
    active_leads = await db.leads.find(
        {"rm_id": rm_id, "stage": {"$nin": ["booking_confirmed", "lost", "closed_not_proceeding"]}},
        {"_id": 0}
    ).to_list(10000)

    aging_leads = []
    for lead in active_leads:
        stage = lead.get("stage", "new")
        created_at = _parse_date(lead.get("created_at"))
        updated_at = _parse_date(lead.get("updated_at"))
        first_contacted = _parse_date(lead.get("first_contacted_at"))
        if not created_at:
            continue

        if stage == "new" and not first_contacted:
            hrs = (now - created_at).total_seconds() / 3600
            if hrs > SLA_FIRST_CONTACT_HOURS:
                aging_leads.append({
                    "lead_id": lead.get("lead_id"),
                    "customer_name": lead.get("customer_name"),
                    "city": lead.get("city"),
                    "event_type": lead.get("event_type"),
                    "alert_type": "no_first_contact",
                    "description": f"No contact in {round(hrs)}h (SLA: {SLA_FIRST_CONTACT_HOURS}h)",
                    "hours_overdue": round(hrs - SLA_FIRST_CONTACT_HOURS, 1),
                    "severity": "critical" if hrs > SLA_FIRST_CONTACT_HOURS * 2 else "warning",
                })

        threshold = AGING_THRESHOLDS.get(stage)
        if threshold and updated_at:
            hrs = (now - updated_at).total_seconds() / 3600
            if hrs > threshold:
                aging_leads.append({
                    "lead_id": lead.get("lead_id"),
                    "customer_name": lead.get("customer_name"),
                    "city": lead.get("city"),
                    "event_type": lead.get("event_type"),
                    "stage": stage,
                    "alert_type": "stage_aging",
                    "description": f"In '{stage.replace('_',' ')}' for {round(hrs)}h (SLA: {threshold}h)",
                    "hours_overdue": round(hrs - threshold, 1),
                    "severity": "critical" if hrs > threshold * 2 else "warning",
                })

    # 2) Holds expiring soon (< 12h)
    expiring_holds = []
    holds = await db.date_holds.find(
        {"created_by": rm_id, "status": "active"}, {"_id": 0}
    ).to_list(500)
    for hold in holds:
        expires_at = _parse_date(hold.get("expires_at"))
        if expires_at:
            remaining_hrs = (expires_at - now).total_seconds() / 3600
            if remaining_hrs < 12:
                venue = await db.venues.find_one({"venue_id": hold.get("venue_id")}, {"_id": 0, "name": 1})
                expiring_holds.append({
                    "hold_id": hold.get("hold_id"),
                    "venue_name": venue.get("name") if venue else hold.get("venue_id"),
                    "date": hold.get("date"),
                    "lead_id": hold.get("lead_id"),
                    "hours_remaining": round(max(remaining_hrs, 0), 1),
                    "severity": "critical" if remaining_hrs < 3 else "warning",
                })

    # 3) Pending payment links > 24h
    pending_payments = []
    rm_leads = await db.leads.find(
        {"rm_id": rm_id, "payment_status": {"$in": ["awaiting_advance", "pending"]}},
        {"_id": 0}
    ).to_list(500)
    for lead in rm_leads:
        payments = await db.payments.find(
            {"lead_id": lead.get("lead_id"), "status": "pending"}, {"_id": 0}
        ).to_list(10)
        for pmt in payments:
            created = _parse_date(pmt.get("created_at"))
            if created:
                age_hrs = (now - created).total_seconds() / 3600
                if age_hrs > 24:
                    pending_payments.append({
                        "payment_id": pmt.get("payment_id"),
                        "lead_id": lead.get("lead_id"),
                        "customer_name": lead.get("customer_name"),
                        "amount": pmt.get("amount"),
                        "hours_pending": round(age_hrs, 1),
                        "severity": "critical" if age_hrs > 72 else "warning",
                    })

    severity_order = {"critical": 0, "warning": 1}
    aging_leads.sort(key=lambda x: (severity_order.get(x["severity"], 2), -x.get("hours_overdue", 0)))
    expiring_holds.sort(key=lambda x: x.get("hours_remaining", 999))
    pending_payments.sort(key=lambda x: -x.get("hours_pending", 0))

    total_critical = (
        sum(1 for a in aging_leads if a["severity"] == "critical") +
        sum(1 for h in expiring_holds if h["severity"] == "critical") +
        sum(1 for p in pending_payments if p["severity"] == "critical")
    )
    total_warnings = (
        sum(1 for a in aging_leads if a["severity"] == "warning") +
        sum(1 for h in expiring_holds if h["severity"] == "warning") +
        sum(1 for p in pending_payments if p["severity"] == "warning")
    )

    return {
        "aging_leads": aging_leads,
        "expiring_holds": expiring_holds,
        "pending_payments": pending_payments,
        "summary": {
            "total_alerts": len(aging_leads) + len(expiring_holds) + len(pending_payments),
            "critical": total_critical,
            "warnings": total_warnings,
        },
        "generated_at": now.isoformat(),
    }
