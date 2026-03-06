"""
Admin analytics service for VenuLock API.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dateutil.relativedelta import relativedelta
from config import db


async def get_control_room_metrics() -> Dict:
    """Get comprehensive pipeline and revenue intelligence for admin control room."""
    now = datetime.now(timezone.utc)
    current_month_str = now.strftime("%Y-%m")
    
    # METRIC 1: Total Deal Value in Pipeline
    pipeline_leads = await db.leads.find({
        "stage": {"$nin": ["lost", "closed_not_proceeding"]},
        "deal_value": {"$gt": 0}
    }, {"deal_value": 1, "_id": 0}).to_list(10000)
    total_pipeline_value = sum(lead.get("deal_value", 0) for lead in pipeline_leads)
    
    # METRIC 2: Confirmed GMV (Current Month)
    confirmed_pipeline = [
        {"$match": {"stage": "booking_confirmed", "deal_value": {"$gt": 0}}},
        {"$addFields": {"updated_month": {"$substr": [{"$ifNull": ["$updated_at", "$created_at"]}, 0, 7]}}},
        {"$match": {"updated_month": current_month_str}},
        {"$group": {"_id": None, "total_gmv": {"$sum": "$deal_value"}, "count": {"$sum": 1}}}
    ]
    gmv_result = await db.leads.aggregate(confirmed_pipeline).to_list(1)
    confirmed_gmv = gmv_result[0]["total_gmv"] if gmv_result else 0
    confirmed_count = gmv_result[0]["count"] if gmv_result else 0
    
    # METRIC 3: VL Commission (Current Month)
    commission_pipeline = [
        {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
        {"$addFields": {"paid_month": {"$substr": [{"$ifNull": ["$paid_at", "$created_at"]}, 0, 7]}}},
        {"$match": {"paid_month": current_month_str}},
        {"$group": {"_id": None, "total_commission": {"$sum": "$commission_amount"}, "total_collected": {"$sum": "$amount"}}}
    ]
    commission_result = await db.payments.aggregate(commission_pipeline).to_list(1)
    current_month_commission = commission_result[0]["total_commission"] if commission_result else 0
    current_month_collected = commission_result[0]["total_collected"] if commission_result else 0
    
    # METRIC 4: Active Tentative Holds
    active_holds = await db.date_holds.count_documents({"status": "active"})
    
    # METRIC 5: Payment Conversion Rate
    total_payment_links = await db.payments.count_documents({})
    paid_payments = await db.payments.count_documents({"status": {"$in": ["advance_paid", "payment_released"]}})
    payment_conversion_rate = round((paid_payments / total_payment_links * 100), 1) if total_payment_links > 0 else 0
    
    # CHART: Monthly GMV Trend (Last 6 Months)
    monthly_gmv_trend = []
    for i in range(5, -1, -1):
        month_date = now - relativedelta(months=i)
        month_str = month_date.strftime("%Y-%m")
        month_label = month_date.strftime("%b")
        
        gmv_pipeline = [
            {"$match": {"stage": "booking_confirmed", "deal_value": {"$gt": 0}}},
            {"$addFields": {"month": {"$substr": [{"$ifNull": ["$updated_at", "$created_at"]}, 0, 7]}}},
            {"$match": {"month": month_str}},
            {"$group": {"_id": None, "gmv": {"$sum": "$deal_value"}, "bookings": {"$sum": 1}}}
        ]
        gmv_res = await db.leads.aggregate(gmv_pipeline).to_list(1)
        
        comm_pipeline = [
            {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}}},
            {"$addFields": {"month": {"$substr": [{"$ifNull": ["$paid_at", "$created_at"]}, 0, 7]}}},
            {"$match": {"month": month_str}},
            {"$group": {"_id": None, "commission": {"$sum": "$commission_amount"}}}
        ]
        comm_res = await db.payments.aggregate(comm_pipeline).to_list(1)
        
        monthly_gmv_trend.append({
            "month": month_label,
            "month_full": month_date.strftime("%b %Y"),
            "gmv": gmv_res[0]["gmv"] if gmv_res else 0,
            "bookings": gmv_res[0]["bookings"] if gmv_res else 0,
            "commission": comm_res[0]["commission"] if comm_res else 0
        })
    
    # TABLE: Top 10 Venues by VL Commission
    venue_commission_pipeline = [
        {"$match": {"status": {"$in": ["advance_paid", "payment_released"]}, "commission_amount": {"$gt": 0}}},
        {"$lookup": {"from": "leads", "localField": "lead_id", "foreignField": "lead_id", "as": "lead"}},
        {"$unwind": {"path": "$lead", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "venue_shortlist", "localField": "lead_id", "foreignField": "lead_id", "as": "shortlist"}},
        {"$unwind": {"path": "$shortlist", "preserveNullAndEmptyArrays": True}},
        {"$match": {"shortlist.status": {"$in": ["confirmed", "booked"]}}},
        {"$group": {
            "_id": "$shortlist.venue_id",
            "venue_name": {"$first": "$shortlist.venue_name"},
            "total_commission": {"$sum": "$commission_amount"},
            "booking_count": {"$sum": 1}
        }},
        {"$sort": {"total_commission": -1}},
        {"$limit": 10}
    ]
    top_venues = await db.payments.aggregate(venue_commission_pipeline).to_list(10)
    
    # TABLE: Top 10 Venues by GMV
    venue_gmv_pipeline = [
        {"$match": {"stage": "booking_confirmed", "deal_value": {"$gt": 0}}},
        {"$lookup": {"from": "venue_shortlist", "localField": "lead_id", "foreignField": "lead_id", "as": "shortlist"}},
        {"$unwind": {"path": "$shortlist", "preserveNullAndEmptyArrays": True}},
        {"$match": {"shortlist.status": {"$in": ["confirmed", "booked"]}}},
        {"$group": {
            "_id": "$shortlist.venue_id",
            "venue_name": {"$first": "$shortlist.venue_name"},
            "total_gmv": {"$sum": "$deal_value"},
            "booking_count": {"$sum": 1},
            "avg_deal": {"$avg": "$deal_value"}
        }},
        {"$sort": {"total_gmv": -1}},
        {"$limit": 10}
    ]
    top_venues_by_gmv = await db.payments.aggregate(venue_gmv_pipeline).to_list(10)
    
    # Pipeline Stage Distribution
    stage_pipeline = [
        {"$match": {"stage": {"$nin": ["lost"]}}},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}, "value": {"$sum": {"$ifNull": ["$deal_value", 0]}}}}
    ]
    stage_dist = await db.leads.aggregate(stage_pipeline).to_list(20)
    stage_distribution = {item["_id"]: {"count": item["count"], "value": item["value"]} for item in stage_dist}
    
    return {
        "metrics": {
            "total_pipeline_value": total_pipeline_value,
            "confirmed_gmv_current_month": confirmed_gmv,
            "confirmed_bookings_current_month": confirmed_count,
            "bmv_commission_current_month": current_month_commission,
            "advances_collected_current_month": current_month_collected,
            "active_holds": active_holds,
            "payment_conversion_rate": payment_conversion_rate
        },
        "charts": {
            "monthly_gmv_trend": monthly_gmv_trend,
            "stage_distribution": stage_distribution
        },
        "tables": {
            "top_venues_by_commission": top_venues,
            "top_venues_by_gmv": top_venues_by_gmv
        },
        "current_month": now.strftime("%B %Y"),
        "generated_at": now.isoformat()
    }


async def get_admin_stats() -> Dict:
    """Get admin dashboard statistics."""
    total_venues = await db.venues.count_documents({"status": "approved"})
    total_users = await db.users.count_documents({})
    total_leads = await db.leads.count_documents({})
    total_bookings = await db.leads.count_documents({"stage": "booking_confirmed"})
    total_revenue = 0
    
    revenue_pipeline = [
        {"$match": {"stage": "booking_confirmed", "deal_value": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$deal_value"}}}
    ]
    revenue_result = await db.leads.aggregate(revenue_pipeline).to_list(1)
    if revenue_result:
        total_revenue = revenue_result[0]["total"]
    
    pending_venues = await db.venues.count_documents({"status": "pending"})
    pending_planners = await db.planners.count_documents({"status": "pending"})
    
    return {
        "total_venues": total_venues,
        "total_users": total_users,
        "total_leads": total_leads,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue,
        "pending_approvals": pending_venues + pending_planners
    }


async def get_rm_performance(time_period: str = "month") -> List[Dict]:
    """Get RM performance metrics."""
    from dateutil.relativedelta import relativedelta
    now = datetime.now(timezone.utc)
    
    if time_period == "week":
        start_date = (now - relativedelta(days=7)).isoformat()
    elif time_period == "quarter":
        start_date = (now - relativedelta(months=3)).isoformat()
    elif time_period == "year":
        start_date = (now - relativedelta(years=1)).isoformat()
    else:
        start_date = (now - relativedelta(months=1)).isoformat()
    
    # Get all RMs
    rms = await db.users.find({"role": "rm", "status": "active"}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    performance = []
    for rm in rms:
        rm_id = rm["user_id"]
        
        # Leads assigned
        leads_assigned = await db.leads.count_documents({"rm_id": rm_id, "created_at": {"$gte": start_date}})
        
        # Leads converted
        leads_converted = await db.leads.count_documents({
            "rm_id": rm_id,
            "stage": "booking_confirmed",
            "confirmed_at": {"$gte": start_date}
        })
        
        # Total GMV
        gmv_pipeline = [
            {"$match": {"rm_id": rm_id, "stage": "booking_confirmed", "confirmed_at": {"$gte": start_date}}},
            {"$group": {"_id": None, "total": {"$sum": "$deal_value"}}}
        ]
        gmv_result = await db.leads.aggregate(gmv_pipeline).to_list(1)
        total_gmv = gmv_result[0]["total"] if gmv_result else 0
        
        # Conversion rate
        conversion_rate = round((leads_converted / leads_assigned * 100), 1) if leads_assigned > 0 else 0
        
        # Avg deal value
        avg_deal = round(total_gmv / leads_converted) if leads_converted > 0 else 0
        
        performance.append({
            "rm_id": rm_id,
            "rm_name": rm["name"],
            "leads_assigned": leads_assigned,
            "leads_converted": leads_converted,
            "conversion_rate": conversion_rate,
            "total_gmv": total_gmv,
            "avg_deal_value": avg_deal
        })
    
    # Sort by total GMV
    performance.sort(key=lambda x: x["total_gmv"], reverse=True)
    
    return performance


async def get_commission_report(status: Optional[str], start_date: Optional[str], end_date: Optional[str]) -> Dict:
    """Get commission report filtered by status and date range."""
    query = {"stage": "booking_confirmed"}
    
    if status:
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"venue_commission_status": status},
                {"planner_commission_status": status}
            ]
        })
    
    if start_date:
        query["confirmed_at"] = query.get("confirmed_at", {})
        query["confirmed_at"]["$gte"] = start_date
    if end_date:
        query["confirmed_at"] = query.get("confirmed_at", {})
        query["confirmed_at"]["$lte"] = end_date
    
    leads = await db.leads.find(query, {"_id": 0}).sort("confirmed_at", -1).to_list(200)
    
    # Calculate totals
    total_venue_commission = sum(lead.get("venue_commission_calculated", 0) or 0 for lead in leads)
    total_planner_commission = sum(lead.get("planner_commission_calculated", 0) or 0 for lead in leads)
    total_deal_value = sum(lead.get("deal_value", 0) or 0 for lead in leads)
    
    return {
        "leads": leads,
        "summary": {
            "total_leads": len(leads),
            "total_deal_value": total_deal_value,
            "total_venue_commission": total_venue_commission,
            "total_planner_commission": total_planner_commission,
            "total_commission": total_venue_commission + total_planner_commission
        }
    }
