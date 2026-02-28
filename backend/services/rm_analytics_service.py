"""
RM Performance Analytics service for BookMyVenue API.
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
