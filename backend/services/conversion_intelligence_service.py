"""
Conversion Intelligence service for VenuLock Admin.
Stage drop-off, deal velocity, and revenue forecasting with filters.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List
from statistics import median
from config import db

# Ordered pipeline stages
PIPELINE_STAGES = [
    "new", "contacted", "requirement_understood", "shortlisted",
    "site_visit", "negotiation", "booking_confirmed",
]

# Stage-weighted probability for revenue forecast (configurable)
DEFAULT_STAGE_WEIGHTS = {
    "new": 0.05,
    "contacted": 0.10,
    "requirement_understood": 0.20,
    "shortlisted": 0.35,
    "site_visit": 0.50,
    "negotiation": 0.70,
    "booking_confirmed": 1.0,
}

# SLA thresholds (hours) for flagging slow stages
STAGE_SLA_THRESHOLDS = {
    "new": 24,  # Should contact within 24h
    "contacted": 72,  # Move to requirement understood within 3 days
    "requirement_understood": 72,
    "shortlisted": 120,  # 5 days
    "site_visit": 168,  # 7 days
    "negotiation": 336,  # 14 days
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


def _hours_between(start_str: str, end_str: str) -> Optional[float]:
    s = _parse_dt(start_str)
    e = _parse_dt(end_str)
    if s and e and e > s:
        return (e - s).total_seconds() / 3600
    return None


def _calc_median(values: List[float]) -> Optional[float]:
    """Calculate median, return None if empty."""
    if not values:
        return None
    return round(median(values), 2)


def _calc_avg(values: List[float]) -> Optional[float]:
    """Calculate average, return None if empty."""
    if not values:
        return None
    return round(sum(values) / len(values), 2)


async def get_conversion_intelligence(
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
    source: Optional[str] = None,
    stage_weights: Optional[Dict[str, float]] = None
) -> Dict:
    """
    Compute full conversion intelligence: drop-off, velocity, forecast.
    
    Args:
        date_range: Preset filter - "7", "30", "90" days or None for all
        start_date: Custom start date (ISO format) - overrides date_range
        end_date: Custom end date (ISO format)
        city: Filter by city
        rm_id: Filter by assigned RM
        source: Filter by lead source (Meta, Google, Organic, etc.)
        stage_weights: Custom stage weights for forecast (optional)
    """
    now = datetime.now(timezone.utc)
    weights = stage_weights or DEFAULT_STAGE_WEIGHTS
    
    # Build MongoDB query for filters
    query = {}
    
    # Date filtering
    if start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    elif date_range:
        days = int(date_range)
        cutoff = (now - timedelta(days=days)).isoformat()
        query["created_at"] = {"$gte": cutoff}
    
    # City filter
    if city:
        query["city"] = city
    
    # RM filter
    if rm_id:
        query["rm_id"] = rm_id
    
    # Source filter
    if source:
        query["source"] = source
    
    all_leads = await db.leads.find(query, {"_id": 0}).to_list(50000)

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

    # Conversion between consecutive stages with leak point detection
    transitions = []
    max_drop_off_idx = -1
    max_drop_off_pct = 0
    
    for i in range(len(PIPELINE_STAGES) - 1):
        from_stage = PIPELINE_STAGES[i]
        to_stage = PIPELINE_STAGES[i + 1]
        from_count = reached[from_stage]
        to_count = reached[to_stage]
        rate = round((to_count / from_count * 100), 1) if from_count > 0 else 0
        drop_off = from_count - to_count
        drop_off_pct = round((drop_off / from_count * 100), 1) if from_count > 0 else 0
        
        # Track biggest leak point
        if drop_off_pct > max_drop_off_pct and from_count > 0:
            max_drop_off_pct = drop_off_pct
            max_drop_off_idx = i
        
        transitions.append({
            "from_stage": from_stage,
            "to_stage": to_stage,
            "from_count": from_count,
            "to_count": to_count,
            "conversion_rate": rate,
            "drop_off": drop_off,
            "drop_off_pct": drop_off_pct,
            "is_leak_point": False,  # Will be set below
        })
    
    # Mark the biggest leak point
    if max_drop_off_idx >= 0:
        transitions[max_drop_off_idx]["is_leak_point"] = True

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
    
    # Leak point summary
    leak_point = None
    if max_drop_off_idx >= 0:
        leak_point = {
            "from_stage": transitions[max_drop_off_idx]["from_stage"],
            "to_stage": transitions[max_drop_off_idx]["to_stage"],
            "drop_off_count": transitions[max_drop_off_idx]["drop_off"],
            "drop_off_pct": transitions[max_drop_off_idx]["drop_off_pct"],
        }

    # ============ 2. DEAL VELOCITY METRICS ============
    # Collect time durations for each stage
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

        # Time to first contact (in hours for SLA)
        d = _hours_between(created, first_contact)
        if d is not None:
            ttfc_list.append(d)
            stage_durations["new"].append(d)

        # Time to close (created -> confirmed) in days
        d = _days_between(created, confirmed)
        if d is not None:
            ttclose_list.append(d)

        # Payment to confirmation
        d = _days_between(advance_paid, confirmed)
        if d is not None:
            payment_to_confirm_list.append(d)
    
    # Calculate per-stage velocity from activity logs or stage_history if available
    # For now, estimate from timestamps and stage progression
    stage_velocity = []
    for stage in PIPELINE_STAGES:
        durations = stage_durations.get(stage, [])
        avg_hrs = _calc_avg(durations)
        median_hrs = _calc_median(durations)
        sla_threshold = STAGE_SLA_THRESHOLDS.get(stage)
        exceeds_sla = avg_hrs is not None and sla_threshold and avg_hrs > sla_threshold
        
        stage_velocity.append({
            "stage": stage,
            "avg_hours": avg_hrs,
            "median_hours": median_hrs,
            "sample_size": len(durations),
            "sla_threshold_hours": sla_threshold,
            "exceeds_sla": exceeds_sla,
        })

    # Summary velocity metrics
    avg_ttfc_hrs = _calc_avg(ttfc_list)
    median_ttfc_hrs = _calc_median(ttfc_list)
    avg_ttclose_days = _calc_avg(ttclose_list)
    median_ttclose_days = _calc_median(ttclose_list)
    avg_payment_to_confirm = _calc_avg(payment_to_confirm_list)

    velocity = {
        "avg_time_to_first_contact_hrs": avg_ttfc_hrs,
        "median_time_to_first_contact_hrs": median_ttfc_hrs,
        "avg_time_to_close_days": avg_ttclose_days,
        "median_time_to_close_days": median_ttclose_days,
        "avg_payment_to_confirmation_days": avg_payment_to_confirm,
        "stage_velocity": stage_velocity,
        "sample_sizes": {
            "first_contact": len(ttfc_list),
            "close": len(ttclose_list),
            "payment_to_confirm": len(payment_to_confirm_list),
        },
        "sla_config": STAGE_SLA_THRESHOLDS,
    }

    # ============ 3. REVENUE FORECAST ============
    # Current month filter
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Pipeline value: total deal_value of all active (non-lost/confirmed) leads
    active_leads = [
        lead for lead in all_leads
        if lead.get("stage") not in ("booking_confirmed", "lost", "closed_not_proceeding")
        and lead.get("deal_value")
    ]
    pipeline_value = sum(lead.get("deal_value", 0) for lead in active_leads)

    # Stage-weighted projected GMV with configurable weights
    weighted_gmv = 0
    weighted_commission = 0
    stage_pipeline = []
    
    for stage in PIPELINE_STAGES:
        if stage == "booking_confirmed":
            continue
        leads_in_stage = [lead for lead in active_leads if lead.get("stage") == stage]
        stage_value = sum(lead.get("deal_value", 0) for lead in leads_in_stage)
        weight = weights.get(stage, 0)
        weighted = round(stage_value * weight)
        weighted_gmv += weighted
        
        # Calculate weighted commission for this stage
        stage_comm = 0
        for lead in leads_in_stage:
            comm = lead.get("venue_commission_calculated", 0) or 0
            comm += lead.get("planner_commission_calculated", 0) or 0
            if comm == 0 and lead.get("deal_value"):
                # Estimate commission at 12%
                comm = lead.get("deal_value", 0) * 0.12
            stage_comm += comm * weight
        weighted_commission += stage_comm
        
        stage_pipeline.append({
            "stage": stage,
            "lead_count": len(leads_in_stage),
            "total_value": stage_value,
            "weight": weight,
            "weight_pct": int(weight * 100),
            "weighted_value": weighted,
        })

    # Already confirmed this month (from all leads, not filtered)
    all_leads_unfiltered = await db.leads.find({}, {"_id": 0}).to_list(50000) if query else all_leads
    confirmed_this_month = [
        lead for lead in all_leads_unfiltered
        if lead.get("stage") == "booking_confirmed"
        and lead.get("confirmed_at", "") >= month_start
        and lead.get("deal_value")
    ]
    confirmed_gmv = sum(lead.get("deal_value", 0) for lead in confirmed_this_month)
    confirmed_commission = sum(
        (lead.get("venue_commission_calculated", 0) or 0) + (lead.get("planner_commission_calculated", 0) or 0)
        for lead in confirmed_this_month
    )

    # Projected total GMV for current month
    projected_gmv = confirmed_gmv + weighted_gmv

    # Commission projection
    projected_commission = round(confirmed_commission + weighted_commission)

    forecast = {
        "pipeline_value": pipeline_value,
        "pipeline_lead_count": len(active_leads),
        "weighted_projected_gmv": weighted_gmv,
        "weighted_projected_commission": round(weighted_commission),
        "confirmed_gmv_this_month": confirmed_gmv,
        "confirmed_commission_this_month": round(confirmed_commission),
        "projected_total_gmv": projected_gmv,
        "projected_total_commission": projected_commission,
        "stage_pipeline": stage_pipeline,
        "stage_weights": weights,
    }

    # Build filter summary for response
    filters_applied = {
        "date_range": date_range,
        "start_date": start_date,
        "end_date": end_date,
        "city": city,
        "rm_id": rm_id,
        "source": source,
    }

    return {
        "drop_off": {
            "transitions": transitions,
            "funnel": funnel_data,
            "overall_conversion": overall_conversion,
            "total_leads": len(all_leads),
            "total_lost": stage_counts.get("lost", 0),
            "leak_point": leak_point,
        },
        "velocity": velocity,
        "forecast": forecast,
        "filters_applied": filters_applied,
        "generated_at": now.isoformat(),
    }


async def get_filter_options() -> Dict:
    """Get available filter options for cities, RMs, and sources."""
    # Get distinct cities from leads
    cities = await db.leads.distinct("city")
    cities = [c for c in cities if c]  # Filter out None/empty
    
    # Get distinct sources
    sources = await db.leads.distinct("source")
    sources = [s for s in sources if s]
    # Add default sources if not present
    default_sources = ["Meta", "Google", "Organic", "Referral", "Planner", "Direct"]
    all_sources = list(set(sources + default_sources))
    
    # Get active RMs
    rms = await db.users.find(
        {"role": "rm", "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    ).to_list(100)
    
    return {
        "cities": sorted(cities),
        "sources": sorted(all_sources),
        "rms": rms,
    }


async def export_conversion_data(
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
    source: Optional[str] = None,
) -> List[Dict]:
    """
    Export lead data for CSV generation.
    Returns flattened lead data suitable for CSV export.
    """
    now = datetime.now(timezone.utc)
    
    # Build query
    query = {}
    if start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    elif date_range:
        days = int(date_range)
        cutoff = (now - timedelta(days=days)).isoformat()
        query["created_at"] = {"$gte": cutoff}
    if city:
        query["city"] = city
    if rm_id:
        query["rm_id"] = rm_id
    if source:
        query["source"] = source
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(50000)
    
    # Flatten for CSV
    export_data = []
    for lead in leads:
        export_data.append({
            "lead_id": lead.get("lead_id", ""),
            "customer_name": lead.get("customer_name", ""),
            "customer_email": lead.get("customer_email", ""),
            "customer_phone": lead.get("customer_phone", ""),
            "city": lead.get("city", ""),
            "source": lead.get("source", "Direct"),
            "campaign": lead.get("campaign", ""),
            "event_type": lead.get("event_type", ""),
            "event_date": lead.get("event_date", ""),
            "guest_count": lead.get("guest_count", ""),
            "stage": lead.get("stage", ""),
            "deal_value": lead.get("deal_value", 0) or 0,
            "venue_commission": lead.get("venue_commission_calculated", 0) or 0,
            "planner_commission": lead.get("planner_commission_calculated", 0) or 0,
            "rm_id": lead.get("rm_id", ""),
            "created_at": lead.get("created_at", ""),
            "first_contacted_at": lead.get("first_contacted_at", ""),
            "confirmed_at": lead.get("confirmed_at", ""),
        })
    
    return export_data
