"""
Channel Performance Analytics service for VenuLoQ.
Provides lead source attribution and channel performance metrics.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from config import db

# Valid lead sources
LEAD_SOURCES = ["Meta", "Google", "Organic", "Referral", "Planner", "Direct"]


async def get_channel_performance(
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: Optional[str] = None,
    rm_id: Optional[str] = None,
) -> Dict:
    """
    Get channel/source performance metrics.
    
    Returns leads, GMV, commission, and conversion rate per source.
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
    
    # Get all leads matching filters
    all_leads = await db.leads.find(query, {"_id": 0}).to_list(50000)
    
    # Initialize source metrics
    source_metrics = {}
    for source in LEAD_SOURCES:
        source_metrics[source] = {
            "source": source,
            "total_leads": 0,
            "confirmed_leads": 0,
            "total_gmv": 0,
            "total_commission": 0,
            "conversion_rate": 0,
            "avg_deal_value": 0,
            "leads_by_stage": {},
        }
    
    # Process each lead
    for lead in all_leads:
        source = lead.get("source") or "Direct"
        if source not in source_metrics:
            source = "Direct"  # Fallback for unknown sources
        
        metrics = source_metrics[source]
        metrics["total_leads"] += 1
        
        # Track by stage
        stage = lead.get("stage", "new")
        metrics["leads_by_stage"][stage] = metrics["leads_by_stage"].get(stage, 0) + 1
        
        # Track confirmed
        if stage == "booking_confirmed":
            metrics["confirmed_leads"] += 1
            deal_value = lead.get("deal_value") or 0
            metrics["total_gmv"] += deal_value
            
            venue_comm = lead.get("venue_commission_calculated") or 0
            planner_comm = lead.get("planner_commission_calculated") or 0
            metrics["total_commission"] += venue_comm + planner_comm
    
    # Calculate rates and averages
    for source, metrics in source_metrics.items():
        if metrics["total_leads"] > 0:
            metrics["conversion_rate"] = round(
                (metrics["confirmed_leads"] / metrics["total_leads"]) * 100, 1
            )
        if metrics["confirmed_leads"] > 0:
            metrics["avg_deal_value"] = round(
                metrics["total_gmv"] / metrics["confirmed_leads"]
            )
    
    # Sort by total leads (descending)
    sorted_sources = sorted(
        source_metrics.values(),
        key=lambda x: x["total_leads"],
        reverse=True
    )
    
    # Calculate totals
    total_leads = sum(s["total_leads"] for s in sorted_sources)
    total_confirmed = sum(s["confirmed_leads"] for s in sorted_sources)
    total_gmv = sum(s["total_gmv"] for s in sorted_sources)
    total_commission = sum(s["total_commission"] for s in sorted_sources)
    
    return {
        "sources": sorted_sources,
        "summary": {
            "total_leads": total_leads,
            "total_confirmed": total_confirmed,
            "total_gmv": total_gmv,
            "total_commission": total_commission,
            "overall_conversion_rate": round(
                (total_confirmed / total_leads * 100), 1
            ) if total_leads > 0 else 0,
        },
        "filters_applied": {
            "date_range": date_range,
            "start_date": start_date,
            "end_date": end_date,
            "city": city,
            "rm_id": rm_id,
        },
        "generated_at": now.isoformat(),
    }


async def get_source_filter_options() -> Dict:
    """Get available source values from existing leads."""
    # Get distinct sources
    sources = await db.leads.distinct("source")
    # Filter out None/empty and add all valid sources
    existing_sources = [s for s in sources if s]
    all_sources = list(set(existing_sources + LEAD_SOURCES))
    
    return {
        "sources": sorted(all_sources),
    }


async def backfill_lead_sources():
    """
    Utility: Backfill existing leads with 'Direct' source if missing.
    Returns count of updated leads.
    """
    result = await db.leads.update_many(
        {"$or": [{"source": None}, {"source": {"$exists": False}}]},
        {"$set": {"source": "Direct", "campaign": None, "landing_page": None}}
    )
    return {"updated_count": result.modified_count}
