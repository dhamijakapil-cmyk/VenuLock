"""
Ven-Us Capacity Intelligence Service
Phase 17: Advisory workforce/capacity recommendations for leadership.

Monitors RM load, SLA slippage, queue growth, and generates
structured hiring/scaling recommendations visible to Admin/CEO/HR only.

IMPORTANT: Advisory only. Does NOT auto-create roles or change org structure.
"""
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("capacity_intelligence")

# Thresholds (configurable)
THRESHOLDS = {
    "rm_active_cases_warning": 15,
    "rm_active_cases_critical": 22,
    "rm_capacity_max": 25,
    "followup_overdue_warning_pct": 20,
    "followup_overdue_critical_pct": 40,
    "new_enquiries_per_rm_daily_warning": 8,
    "new_enquiries_per_rm_daily_critical": 15,
    "case_ageing_warning_days": 14,
    "case_ageing_critical_days": 30,
    "venue_approval_backlog_warning": 20,
    "venue_approval_backlog_critical": 50,
    "unread_messages_warning": 50,
    "settlement_backlog_warning": 10,
}


async def run_capacity_analysis(db):
    """Run full capacity analysis and generate recommendations."""
    now = datetime.now(timezone.utc)
    alerts = []

    # ── 1. RM Load Analysis ──
    rms = await db.users.find(
        {"role": "rm", "status": "active"}, {"_id": 0, "user_id": 1, "name": 1}
    ).to_list(100)

    rm_loads = []
    overloaded_rms = []
    for rm in rms:
        active = await db.leads.count_documents({
            "rm_id": rm["user_id"],
            "stage": {"$nin": ["lost", "closed_not_proceeding"]},
            "event_completed": {"$ne": True},
        })
        rm_loads.append({"rm_id": rm["user_id"], "name": rm["name"], "active_cases": active})
        if active >= THRESHOLDS["rm_active_cases_critical"]:
            overloaded_rms.append(rm["name"])

    avg_load = sum(r["active_cases"] for r in rm_loads) / max(len(rm_loads), 1)

    if len(overloaded_rms) > 0:
        alerts.append({
            "alert_type": "rm_overload",
            "severity": "critical",
            "category": "Relationship Team",
            "title": "RM team at capacity",
            "message": f"{len(overloaded_rms)} RM(s) at or near capacity ({', '.join(overloaded_rms)}). "
                       f"Average active case load: {avg_load:.1f} per RM. "
                       f"Threshold: {THRESHOLDS['rm_active_cases_critical']}.",
            "recommendation": "Hire additional Relationship Managers to maintain service quality.",
            "data": {"overloaded_rms": overloaded_rms, "avg_load": round(avg_load, 1), "total_rms": len(rms)},
        })
    elif avg_load >= THRESHOLDS["rm_active_cases_warning"]:
        alerts.append({
            "alert_type": "rm_load_warning",
            "severity": "warning",
            "category": "Relationship Team",
            "title": "RM team load rising",
            "message": f"Average active case load per RM is {avg_load:.1f}. "
                       f"Warning threshold: {THRESHOLDS['rm_active_cases_warning']}.",
            "recommendation": "Plan to add RM capacity within the next 2-4 weeks.",
            "data": {"avg_load": round(avg_load, 1), "total_rms": len(rms)},
        })

    # ── 2. Follow-up SLA Slippage ──
    total_followups = await db.follow_ups.count_documents({"status": {"$ne": "completed"}})
    overdue_followups = await db.follow_ups.count_documents({
        "status": {"$ne": "completed"},
        "scheduled_at": {"$lt": now.isoformat()},
    })
    overdue_pct = (overdue_followups / max(total_followups, 1)) * 100

    if overdue_pct >= THRESHOLDS["followup_overdue_critical_pct"]:
        alerts.append({
            "alert_type": "sla_slippage",
            "severity": "critical",
            "category": "Relationship Team",
            "title": "Follow-up SLA slippage critical",
            "message": f"{overdue_pct:.0f}% of pending follow-ups are overdue ({overdue_followups}/{total_followups}). "
                       f"This suggests insufficient Relationship Team Lead capacity to manage RM workload.",
            "recommendation": "Add additional Team Lead capacity to supervise follow-up discipline.",
            "data": {"overdue_pct": round(overdue_pct, 1), "overdue": overdue_followups, "total": total_followups},
        })
    elif overdue_pct >= THRESHOLDS["followup_overdue_warning_pct"]:
        alerts.append({
            "alert_type": "sla_slippage_warning",
            "severity": "warning",
            "category": "Relationship Team",
            "title": "Follow-up SLA slippage rising",
            "message": f"{overdue_pct:.0f}% of follow-ups are overdue.",
            "recommendation": "Review RM workload distribution and consider rebalancing.",
            "data": {"overdue_pct": round(overdue_pct, 1)},
        })

    # ── 3. Case Ageing ──
    ageing_cutoff = (now - timedelta(days=THRESHOLDS["case_ageing_critical_days"])).isoformat()
    aged_cases = await db.leads.count_documents({
        "stage": {"$nin": ["lost", "closed_not_proceeding"]},
        "event_completed": {"$ne": True},
        "created_at": {"$lt": ageing_cutoff},
    })
    if aged_cases > 5:
        alerts.append({
            "alert_type": "case_ageing",
            "severity": "warning",
            "category": "Operations",
            "title": "Stale cases accumulating",
            "message": f"{aged_cases} active cases are older than {THRESHOLDS['case_ageing_critical_days']} days "
                       f"without completion. This may indicate execution or operations bottleneck.",
            "recommendation": "Add operations/execution support or review stalled cases with team leads.",
            "data": {"aged_cases": aged_cases},
        })

    # ── 4. Venue Approval Backlog ──
    venue_backlog = await db.venue_onboarding.count_documents({"status": "submitted"})
    if venue_backlog >= THRESHOLDS["venue_approval_backlog_critical"]:
        alerts.append({
            "alert_type": "venue_backlog",
            "severity": "critical",
            "category": "Data Team",
            "title": "Venue approval backlog critical",
            "message": f"{venue_backlog} venues pending approval. "
                       f"Threshold: {THRESHOLDS['venue_approval_backlog_critical']}.",
            "recommendation": "Add Venue Manager / Data Team support to clear approval pipeline.",
            "data": {"backlog": venue_backlog},
        })
    elif venue_backlog >= THRESHOLDS["venue_approval_backlog_warning"]:
        alerts.append({
            "alert_type": "venue_backlog_warning",
            "severity": "warning",
            "category": "Data Team",
            "title": "Venue approval backlog growing",
            "message": f"{venue_backlog} venues pending approval.",
            "recommendation": "Monitor and plan Data Team capacity expansion.",
            "data": {"backlog": venue_backlog},
        })

    # ── 5. Unread Customer Messages (proxy check) ──
    customer_msg_count = await db.case_messages.count_documents({"sender_role": "customer"})
    # TODO: For exact unread counts, add read_by_internal tracking per-message

    # ── 6. Settlement Backlog ──
    settlement_pending = await db.settlements.count_documents({"status": {"$in": ["pending", "processing"]}})
    if settlement_pending >= THRESHOLDS["settlement_backlog_warning"]:
        alerts.append({
            "alert_type": "settlement_backlog",
            "severity": "warning",
            "category": "Finance",
            "title": "Settlement backlog growing",
            "message": f"{settlement_pending} settlements pending processing.",
            "recommendation": "Review finance team bandwidth or automate settlement approval.",
            "data": {"pending": settlement_pending},
        })

    # ── 7. Daily Enquiry Volume vs RM Capacity ──
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_enquiries = await db.leads.count_documents({"created_at": {"$gte": today_start}})
    enquiries_per_rm = today_enquiries / max(len(rms), 1)

    if enquiries_per_rm >= THRESHOLDS["new_enquiries_per_rm_daily_critical"]:
        alerts.append({
            "alert_type": "enquiry_surge",
            "severity": "critical",
            "category": "Relationship Team",
            "title": "Enquiry volume exceeding RM capacity",
            "message": f"{today_enquiries} enquiries today ({enquiries_per_rm:.1f} per RM). "
                       f"Critical threshold: {THRESHOLDS['new_enquiries_per_rm_daily_critical']} per RM.",
            "recommendation": "Hire more RMs urgently. Consider temporary overflow handling.",
            "data": {"today_enquiries": today_enquiries, "per_rm": round(enquiries_per_rm, 1)},
        })

    # ── Build summary ──
    summary = {
        "analyzed_at": now.isoformat(),
        "total_rms": len(rms),
        "avg_rm_load": round(avg_load, 1),
        "overdue_followups_pct": round(overdue_pct, 1),
        "aged_cases": aged_cases,
        "venue_backlog": venue_backlog,
        "settlement_pending": settlement_pending,
        "today_enquiries": today_enquiries,
        "alerts": alerts,
        "alert_count": {"critical": sum(1 for a in alerts if a["severity"] == "critical"),
                        "warning": sum(1 for a in alerts if a["severity"] == "warning")},
    }

    # Store snapshot
    await db.capacity_alerts.insert_one({
        **summary,
        "created_at": now.isoformat(),
    })

    return summary
