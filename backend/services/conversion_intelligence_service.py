"""
Conversion Intelligence service for BookMyVenue Admin.
Stage drop-off, deal velocity, and revenue forecasting.
"""
from datetime import datetime, timezone
from typing import Dict, Optional
from config import db

# Ordered pipeline stages
PIPELINE_STAGES = [
    "new", "contacted", "requirement_understood", "shortlisted",
    "site_visit", "negotiation", "booking_confirmed",
]

# Stage-weighted probability for revenue forecast
STAGE_WEIGHTS = {
    "new": 0.05,
    "contacted": 0.10,
    "requirement_understood": 0.20,
    "shortlisted": 0.35,
    "site_visit": 0.50,
    "negotiation": 0.70,
    "booking_confirmed": 1.0,
}


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


def _days_between(start_str: str, end_str: str) -> Optional[float]:
    s = _parse_dt(start_str)
    e = _parse_dt(end_str)
    if s and e and e > s:
        return (e - s).total_seconds() / 86400
    return None


async def get_conversion_intelligence() -> Dict:
    """Compute full conversion intelligence: drop-off, velocity, forecast."""
    now = datetime.now(timezone.utc)
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(50000)

    # ============ 1. STAGE DROP-OFF ANALYSIS ============
    stage_counts = {s: 0 for s in PIPELINE_STAGES}
    stage_counts["lost"] = 0
    for lead in all_leads:
        stage = lead.get("stage", "new")
        if stage in stage_counts:
            stage_counts[stage] += 1
        elif stage in ("closed_not_proceeding",):
            stage_counts["lost"] += 1

    # "Reached" counts: leads that progressed to or past each stage
    stage_index = {s: i for i, s in enumerate(PIPELINE_STAGES)}
    reached = {s: 0 for s in PIPELINE_STAGES}
    for lead in all_leads:
        stage = lead.get("stage", "new")
        if stage in ("lost", "closed_not_proceeding"):
            # Count lost leads at the stage they were last in
            # Use first_contacted_at to infer they at least reached "contacted"
            if lead.get("first_contacted_at"):
                reached["new"] += 1
                reached["contacted"] += 1
            else:
                reached["new"] += 1
            continue

        idx = stage_index.get(stage, 0)
        for i in range(idx + 1):
            reached[PIPELINE_STAGES[i]] += 1

    # Conversion between consecutive stages
    transitions = []
    for i in range(len(PIPELINE_STAGES) - 1):
        from_stage = PIPELINE_STAGES[i]
        to_stage = PIPELINE_STAGES[i + 1]
        from_count = reached[from_stage]
        to_count = reached[to_stage]
        rate = round((to_count / from_count * 100), 1) if from_count > 0 else 0
        drop_off = from_count - to_count
        transitions.append({
            "from_stage": from_stage,
            "to_stage": to_stage,
            "from_count": from_count,
            "to_count": to_count,
            "conversion_rate": rate,
            "drop_off": drop_off,
            "drop_off_pct": round((drop_off / from_count * 100), 1) if from_count > 0 else 0,
        })

    funnel_data = []
    for stage in PIPELINE_STAGES:
        funnel_data.append({
            "stage": stage,
            "count": reached[stage],
            "pct_of_total": round((reached[stage] / max(reached["new"], 1) * 100), 1),
        })

    overall_conversion = round(
        (reached["booking_confirmed"] / max(reached["new"], 1) * 100), 1
    )

    # ============ 2. DEAL VELOCITY METRICS ============
    # Avg days per stage (from leads that have progressed past each stage)
    stage_durations = {s: [] for s in PIPELINE_STAGES}

    # Time to first contact
    ttfc_list = []
    # Time from created to confirmed
    ttclose_list = []
    # Time from advance_paid_at to confirmed_at
    payment_to_confirm_list = []

    for lead in all_leads:
        created = lead.get("created_at")
        first_contact = lead.get("first_contacted_at")
        confirmed = lead.get("confirmed_at")
        advance_paid = lead.get("advance_paid_at")

        # Time to first contact
        d = _days_between(created, first_contact)
        if d is not None:
            ttfc_list.append(d)

        # Time to close (created -> confirmed)
        d = _days_between(created, confirmed)
        if d is not None:
            ttclose_list.append(d)

        # Payment to confirmation
        d = _days_between(advance_paid, confirmed)
        if d is not None:
            payment_to_confirm_list.append(d)

    # Stage-level durations: approximate from timestamps we have
    # new -> contacted: time from created_at to first_contacted_at
    for lead in all_leads:
        d = _days_between(lead.get("created_at"), lead.get("first_contacted_at"))
        if d is not None:
            stage_durations["new"].append(d)

    # For stages without specific timestamps, estimate from activity logs
    # We'll compute overall velocity from created -> confirmed
    avg_ttfc = round(sum(ttfc_list) / len(ttfc_list), 1) if ttfc_list else None
    avg_ttclose = round(sum(ttclose_list) / len(ttclose_list), 1) if ttclose_list else None
    avg_payment_to_confirm = round(sum(payment_to_confirm_list) / len(payment_to_confirm_list), 1) if payment_to_confirm_list else None

    # Avg days in "new" stage
    avg_new_duration = round(sum(stage_durations["new"]) / len(stage_durations["new"]), 1) if stage_durations["new"] else None

    # Estimate avg days per stage for confirmed deals
    confirmed_leads = [l for l in all_leads if l.get("stage") == "booking_confirmed" and l.get("confirmed_at") and l.get("created_at")]
    if confirmed_leads and avg_ttclose:
        # Distribute evenly across stages (approximation)
        n_stages = len(PIPELINE_STAGES) - 1  # exclude booking_confirmed
        avg_per_stage = round(avg_ttclose / max(n_stages, 1), 1)
    else:
        avg_per_stage = None

    velocity = {
        "avg_time_to_first_contact_days": avg_ttfc,
        "avg_time_to_close_days": avg_ttclose,
        "avg_payment_to_confirmation_days": avg_payment_to_confirm,
        "avg_days_in_new_stage": avg_new_duration,
        "avg_days_per_stage_estimate": avg_per_stage,
        "sample_sizes": {
            "first_contact": len(ttfc_list),
            "close": len(ttclose_list),
            "payment_to_confirm": len(payment_to_confirm_list),
        },
    }

    # ============ 3. REVENUE FORECAST ============
    # Current month filter
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Pipeline value: total deal_value of all active (non-lost/confirmed) leads
    active_leads = [
        l for l in all_leads
        if l.get("stage") not in ("booking_confirmed", "lost", "closed_not_proceeding")
        and l.get("deal_value")
    ]
    pipeline_value = sum(l.get("deal_value", 0) for l in active_leads)

    # Stage-weighted projected GMV
    weighted_gmv = 0
    stage_pipeline = []
    for stage in PIPELINE_STAGES:
        if stage == "booking_confirmed":
            continue
        leads_in_stage = [l for l in active_leads if l.get("stage") == stage]
        stage_value = sum(l.get("deal_value", 0) for l in leads_in_stage)
        weight = STAGE_WEIGHTS.get(stage, 0)
        weighted = round(stage_value * weight)
        weighted_gmv += weighted
        stage_pipeline.append({
            "stage": stage,
            "lead_count": len(leads_in_stage),
            "total_value": stage_value,
            "weight": weight,
            "weighted_value": weighted,
        })

    # Already confirmed this month
    confirmed_this_month = [
        l for l in all_leads
        if l.get("stage") == "booking_confirmed"
        and l.get("confirmed_at", "") >= month_start
        and l.get("deal_value")
    ]
    confirmed_gmv = sum(l.get("deal_value", 0) for l in confirmed_this_month)

    # Projected total GMV for current month
    projected_gmv = confirmed_gmv + weighted_gmv

    # Commission projection (avg commission rate from confirmed deals)
    commission_leads = [
        l for l in all_leads
        if l.get("stage") == "booking_confirmed"
        and l.get("venue_commission_calculated")
        and l.get("deal_value")
    ]
    if commission_leads:
        total_comm = sum(l.get("venue_commission_calculated", 0) + l.get("planner_commission_calculated", 0) for l in commission_leads)
        total_deal = sum(l.get("deal_value", 0) for l in commission_leads)
        avg_commission_rate = total_comm / total_deal if total_deal else 0
    else:
        avg_commission_rate = 0.12  # Default 12%

    projected_commission = round(projected_gmv * avg_commission_rate)

    forecast = {
        "pipeline_value": pipeline_value,
        "pipeline_lead_count": len(active_leads),
        "weighted_projected_gmv": weighted_gmv,
        "confirmed_gmv_this_month": confirmed_gmv,
        "projected_total_gmv": projected_gmv,
        "avg_commission_rate": round(avg_commission_rate * 100, 1),
        "projected_commission": projected_commission,
        "stage_pipeline": stage_pipeline,
    }

    return {
        "drop_off": {
            "transitions": transitions,
            "funnel": funnel_data,
            "overall_conversion": overall_conversion,
            "total_leads": len(all_leads),
            "total_lost": stage_counts.get("lost", 0),
        },
        "velocity": velocity,
        "forecast": forecast,
        "generated_at": now.isoformat(),
    }
