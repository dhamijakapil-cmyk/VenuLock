"""
Weekly Admin Conversion Intelligence Email Digest.
Sends executive summary to admins every Monday at 9 AM IST.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from config import db, logger
from utils import send_email_async, generate_id


def _fmt(amount):
    """Format currency in Indian style."""
    if not amount:
        return "₹0"
    if amount >= 10000000:
        return f"₹{amount / 10000000:.1f}Cr"
    if amount >= 100000:
        return f"₹{amount / 100000:.1f}L"
    if amount >= 1000:
        return f"₹{amount / 1000:.0f}K"
    return f"₹{amount:,.0f}"


def _pct(value, total):
    """Calculate percentage safely."""
    if not total:
        return 0
    return round((value / total) * 100, 1)


async def build_conversion_intelligence_digest() -> Optional[Dict]:
    """
    Compile all conversion intelligence data for the weekly admin digest.
    Returns None if no new data to report.
    """
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # ============ TOPLINE METRICS ============
    # Total leads this week
    week_leads = await db.leads.count_documents({"created_at": {"$gte": week_ago}})
    
    # Skip if no new activity (graceful skip)
    total_active = await db.leads.count_documents({
        "stage": {"$nin": ["booking_confirmed", "lost", "closed_not_proceeding"]}
    })
    if week_leads == 0 and total_active == 0:
        return None
    
    # All-time metrics for context
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(50000)
    total_leads = len(all_leads)
    
    # Confirmed this month
    confirmed_this_month = [
        lead for lead in all_leads
        if lead.get("stage") == "booking_confirmed"
        and lead.get("confirmed_at", "") >= month_start
    ]
    confirmed_count = len(confirmed_this_month)
    confirmed_gmv = sum(lead.get("deal_value", 0) or 0 for lead in confirmed_this_month)
    confirmed_commission = sum(
        (lead.get("venue_commission_calculated", 0) or 0) + 
        (lead.get("planner_commission_calculated", 0) or 0)
        for lead in confirmed_this_month
    )
    
    # Pipeline value
    active_leads = [
        lead for lead in all_leads
        if lead.get("stage") not in ("booking_confirmed", "lost", "closed_not_proceeding")
        and lead.get("deal_value")
    ]
    pipeline_value = sum(lead.get("deal_value", 0) for lead in active_leads)
    
    # Overall conversion rate
    all_confirmed = sum(1 for lead in all_leads if lead.get("stage") == "booking_confirmed")
    overall_conversion = _pct(all_confirmed, total_leads)
    
    # ============ FUNNEL SNAPSHOT ============
    pipeline_stages = ["new", "contacted", "requirement_understood", "shortlisted", 
                       "site_visit", "negotiation", "booking_confirmed"]
    stage_index = {s: i for i, s in enumerate(pipeline_stages)}
    
    reached = {s: 0 for s in pipeline_stages}
    for lead in all_leads:
        stage = lead.get("stage", "new")
        if stage in ("lost", "closed_not_proceeding"):
            if lead.get("first_contacted_at"):
                reached["new"] += 1
                reached["contacted"] += 1
            else:
                reached["new"] += 1
            continue
        idx = stage_index.get(stage, 0)
        for i in range(idx + 1):
            reached[pipeline_stages[i]] += 1
    
    # Find leak point (biggest drop-off)
    max_drop_pct = 0
    leak_point = None
    for i in range(len(pipeline_stages) - 1):
        from_stage = pipeline_stages[i]
        to_stage = pipeline_stages[i + 1]
        from_count = reached[from_stage]
        to_count = reached[to_stage]
        if from_count > 0:
            drop_pct = _pct(from_count - to_count, from_count)
            if drop_pct > max_drop_pct:
                max_drop_pct = drop_pct
                leak_point = {
                    "from": from_stage.replace("_", " ").title(),
                    "to": to_stage.replace("_", " ").title(),
                    "drop_pct": drop_pct,
                    "drop_count": from_count - to_count,
                }
    
    # ============ REVENUE FORECAST ============
    stage_weights = {
        "new": 0.05, "contacted": 0.10, "requirement_understood": 0.20,
        "shortlisted": 0.35, "site_visit": 0.50, "negotiation": 0.70,
    }
    
    weighted_gmv = 0
    weighted_commission = 0
    for lead in active_leads:
        stage = lead.get("stage", "new")
        weight = stage_weights.get(stage, 0)
        deal_value = lead.get("deal_value", 0) or 0
        weighted_gmv += deal_value * weight
        
        comm = (lead.get("venue_commission_calculated", 0) or 0) + \
               (lead.get("planner_commission_calculated", 0) or 0)
        if comm == 0 and deal_value:
            comm = deal_value * 0.12  # Default 12% estimate
        weighted_commission += comm * weight
    
    # ============ CHANNEL PERFORMANCE ============
    sources = ["Meta", "Google", "Organic", "Referral", "Planner", "Direct"]
    channel_data = []
    
    for source in sources:
        source_leads = [lead for lead in all_leads if (lead.get("source") or "Direct") == source]
        source_confirmed = [lead for lead in source_leads if lead.get("stage") == "booking_confirmed"]
        source_gmv = sum(lead.get("deal_value", 0) or 0 for lead in source_confirmed)
        
        if len(source_leads) > 0:
            channel_data.append({
                "source": source,
                "leads": len(source_leads),
                "confirmed": len(source_confirmed),
                "conversion": _pct(len(source_confirmed), len(source_leads)),
                "gmv": source_gmv,
            })
    
    # Sort by leads descending
    channel_data.sort(key=lambda x: x["leads"], reverse=True)
    
    # ============ RM LEADERBOARD ============
    rm_performance = {}
    for lead in all_leads:
        rm_id = lead.get("rm_id")
        rm_name = lead.get("rm_name", "Unassigned")
        if not rm_id:
            continue
        
        if rm_id not in rm_performance:
            rm_performance[rm_id] = {
                "name": rm_name,
                "total": 0,
                "confirmed": 0,
                "gmv": 0,
            }
        
        rm_performance[rm_id]["total"] += 1
        if lead.get("stage") == "booking_confirmed":
            rm_performance[rm_id]["confirmed"] += 1
            rm_performance[rm_id]["gmv"] += lead.get("deal_value", 0) or 0
    
    # Calculate conversion and sort by GMV
    rm_leaderboard = []
    for rm_id, data in rm_performance.items():
        data["conversion"] = _pct(data["confirmed"], data["total"])
        rm_leaderboard.append(data)
    
    rm_leaderboard.sort(key=lambda x: x["gmv"], reverse=True)
    top_rms = rm_leaderboard[:5]
    
    # ============ RISK ALERTS ============
    sla_thresholds = {
        "new": 24, "contacted": 72, "requirement_understood": 120,
        "shortlisted": 168, "site_visit": 168, "negotiation": 240,
    }
    
    sla_breaches = []
    payment_delays = []
    
    for lead in all_leads:
        stage = lead.get("stage", "new")
        if stage in ("booking_confirmed", "lost", "closed_not_proceeding"):
            continue
        
        # Check SLA
        threshold = sla_thresholds.get(stage)
        if threshold:
            updated_str = lead.get("updated_at") or lead.get("created_at")
            if updated_str:
                try:
                    updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
                    if updated.tzinfo is None:
                        updated = updated.replace(tzinfo=timezone.utc)
                    hours = (now - updated).total_seconds() / 3600
                    if hours > threshold:
                        sla_breaches.append({
                            "customer": lead.get("customer_name", "Unknown"),
                            "stage": stage.replace("_", " ").title(),
                            "hours": round(hours),
                            "threshold": threshold,
                            "rm": lead.get("rm_name", "Unassigned"),
                            "severity": "critical" if hours > threshold * 2 else "warning",
                        })
                except Exception:
                    pass
        
        # Check payment delays (booking confirmed but no payment)
        if stage == "negotiation" and lead.get("deal_value"):
            payment_status = lead.get("payment_status")
            if not payment_status or payment_status == "pending":
                payment_delays.append({
                    "customer": lead.get("customer_name", "Unknown"),
                    "deal_value": lead.get("deal_value", 0),
                    "rm": lead.get("rm_name", "Unassigned"),
                })
    
    # Sort by severity
    sla_breaches.sort(key=lambda x: (0 if x["severity"] == "critical" else 1, -x["hours"]))
    critical_count = sum(1 for b in sla_breaches if b["severity"] == "critical")
    warning_count = len(sla_breaches) - critical_count
    
    return {
        "generated_at": now,
        "period": {
            "week_start": week_ago,
            "month": now.strftime("%B %Y"),
        },
        "topline": {
            "week_leads": week_leads,
            "total_leads": total_leads,
            "pipeline_value": pipeline_value,
            "pipeline_count": len(active_leads),
            "confirmed_this_month": confirmed_count,
            "confirmed_gmv": confirmed_gmv,
            "confirmed_commission": confirmed_commission,
            "overall_conversion": overall_conversion,
        },
        "funnel": {
            "stages": reached,
            "leak_point": leak_point,
        },
        "forecast": {
            "weighted_gmv": round(weighted_gmv),
            "weighted_commission": round(weighted_commission),
        },
        "channels": channel_data[:6],  # Top 6 channels
        "rm_leaderboard": top_rms,
        "risks": {
            "sla_breaches": sla_breaches[:10],  # Top 10 most urgent
            "critical_count": critical_count,
            "warning_count": warning_count,
            "payment_delays": payment_delays[:5],
        },
    }


def _build_email_html(data: Dict) -> str:
    """Build investor-grade HTML email from digest data."""
    now = data["generated_at"]
    topline = data["topline"]
    funnel = data["funnel"]
    forecast = data["forecast"]
    channels = data["channels"]
    leaderboard = data["rm_leaderboard"]
    risks = data["risks"]
    
    # Funnel stages HTML
    stage_labels = {
        "new": "New", "contacted": "Contacted", "requirement_understood": "Req. Understood",
        "shortlisted": "Shortlisted", "site_visit": "Site Visit", 
        "negotiation": "Negotiation", "booking_confirmed": "Confirmed"
    }
    
    funnel_html = ""
    stages = funnel["stages"]
    stage_order = ["new", "contacted", "requirement_understood", "shortlisted", 
                   "site_visit", "negotiation", "booking_confirmed"]
    
    for i, stage in enumerate(stage_order):
        count = stages.get(stage, 0)
        pct = _pct(count, stages.get("new", 1))
        bg_color = "#16A34A" if stage == "booking_confirmed" else "#111111"
        funnel_html += f'''
        <td style="text-align:center;padding:12px 4px;vertical-align:top">
            <div style="font-size:20px;font-weight:700;color:{bg_color};font-family:monospace">{count}</div>
            <div style="font-size:10px;color:#64748B;margin-top:2px">{stage_labels.get(stage, stage)}</div>
            <div style="font-size:9px;color:#94A3B8">{pct}%</div>
        </td>'''
    
    # Leak point alert
    leak_html = ""
    if funnel.get("leak_point"):
        lp = funnel["leak_point"]
        leak_html = f'''
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;margin-top:16px">
            <div style="font-size:11px;color:#991B1B;font-weight:600;text-transform:uppercase;letter-spacing:1px">Leak Point Detected</div>
            <p style="font-size:13px;color:#7F1D1D;margin:8px 0 0">
                <strong>{lp["drop_pct"]}%</strong> drop-off between <strong>{lp["from"]}</strong> → <strong>{lp["to"]}</strong>
                ({lp["drop_count"]} leads lost)
            </p>
        </div>'''
    
    # Channel rows
    channel_rows = ""
    for ch in channels[:5]:
        conv_color = "#16A34A" if ch["conversion"] >= topline["overall_conversion"] else "#64748B"
        channel_rows += f'''
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111111;font-weight:500">{ch["source"]}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111111;text-align:center;font-family:monospace">{ch["leads"]}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:{conv_color};text-align:center;font-weight:600">{ch["conversion"]}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111111;text-align:right;font-family:monospace">{_fmt(ch["gmv"])}</td>
        </tr>'''
    
    if not channel_rows:
        channel_rows = '<tr><td colspan="4" style="padding:16px;text-align:center;color:#64748B;font-size:12px">No channel data available</td></tr>'
    
    # RM leaderboard rows
    rm_rows = ""
    for i, rm in enumerate(leaderboard[:5]):
        rank_style = "background:#F5C84C;color:#111111" if i == 0 else "background:#E2E8F0;color:#64748B"
        rm_rows += f'''
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0">
                <span style="{rank_style};font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">#{i+1}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111111;font-weight:500">{rm["name"]}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#64748B;text-align:center;font-family:monospace">{rm["confirmed"]}/{rm["total"]}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#16A34A;text-align:center;font-weight:600">{rm["conversion"]}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111111;text-align:right;font-family:monospace;font-weight:600">{_fmt(rm["gmv"])}</td>
        </tr>'''
    
    if not rm_rows:
        rm_rows = '<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748B;font-size:12px">No RM performance data</td></tr>'
    
    # Risk alerts
    risk_html = ""
    if risks["critical_count"] > 0 or risks["warning_count"] > 0:
        sla_items = ""
        for breach in risks["sla_breaches"][:5]:
            sev_color = "#DC2626" if breach["severity"] == "critical" else "#D97706"
            sla_items += f'''
            <div style="padding:8px 0;border-bottom:1px solid #FEE2E2">
                <span style="color:{sev_color};font-weight:600">{breach["customer"]}</span>
                <span style="color:#64748B;font-size:12px"> — {breach["stage"]} ({breach["hours"]}h / SLA: {breach["threshold"]}h)</span>
                <span style="color:#94A3B8;font-size:11px;display:block">RM: {breach["rm"]}</span>
            </div>'''
        
        risk_html = f'''
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-top:16px">
            <div style="font-size:11px;color:#991B1B;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
                ⚠️ SLA Alerts ({risks["critical_count"]} Critical, {risks["warning_count"]} Warnings)
            </div>
            {sla_items}
        </div>'''
    
    # Payment delays
    payment_html = ""
    if risks["payment_delays"]:
        delay_items = ""
        for delay in risks["payment_delays"][:3]:
            delay_items += f'''
            <div style="padding:6px 0;border-bottom:1px solid #E2E8F0">
                <span style="color:#111111;font-weight:500">{delay["customer"]}</span>
                <span style="color:#64748B;font-size:12px"> — {_fmt(delay["deal_value"])} pending</span>
                <span style="color:#94A3B8;font-size:11px;display:block">RM: {delay["rm"]}</span>
            </div>'''
        
        payment_html = f'''
        <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:8px;padding:16px;margin-top:12px">
            <div style="font-size:11px;color:#854D0E;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
                Payment Links Pending ({len(risks["payment_delays"])})
            </div>
            {delay_items}
        </div>'''
    
    # Build final HTML
    html = f'''
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;background:#F9F9F7">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#111111 0%,#1E3A5F 100%);padding:32px 24px;text-align:center">
            <p style="color:#F5C84C;font-size:11px;letter-spacing:3px;margin:0;font-weight:600">BOOKMYVENUE</p>
            <h1 style="color:white;font-size:24px;margin:8px 0 4px;font-weight:700">Conversion Intelligence</h1>
            <p style="color:#94A3B8;font-size:13px;margin:0">Weekly Executive Summary • {now.strftime("%d %B %Y")}</p>
        </div>
        
        <div style="padding:24px">
            <!-- Topline Metrics -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                <tr>
                    <td style="width:25%;padding:0 4px 0 0">
                        <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                            <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:1px">This Week</div>
                            <div style="font-size:28px;font-weight:700;color:#F5C84C;margin-top:4px;font-family:monospace">{topline["week_leads"]}</div>
                            <div style="font-size:10px;color:#94A3B8">new leads</div>
                        </div>
                    </td>
                    <td style="width:25%;padding:0 4px">
                        <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                            <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:1px">Pipeline</div>
                            <div style="font-size:28px;font-weight:700;color:#111111;margin-top:4px;font-family:monospace">{_fmt(topline["pipeline_value"])}</div>
                            <div style="font-size:10px;color:#94A3B8">{topline["pipeline_count"]} deals</div>
                        </div>
                    </td>
                    <td style="width:25%;padding:0 4px">
                        <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                            <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:1px">Confirmed GMV</div>
                            <div style="font-size:28px;font-weight:700;color:#16A34A;margin-top:4px;font-family:monospace">{_fmt(topline["confirmed_gmv"])}</div>
                            <div style="font-size:10px;color:#94A3B8">{topline["confirmed_this_month"]} this month</div>
                        </div>
                    </td>
                    <td style="width:25%;padding:0 0 0 4px">
                        <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center">
                            <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:1px">Conversion</div>
                            <div style="font-size:28px;font-weight:700;color:{'#16A34A' if topline['overall_conversion'] >= 10 else '#D97706'};margin-top:4px;font-family:monospace">{topline["overall_conversion"]}%</div>
                            <div style="font-size:10px;color:#94A3B8">all-time</div>
                        </div>
                    </td>
                </tr>
            </table>
            
            <!-- Funnel Snapshot -->
            <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px">
                <div style="background:#F8FAFC;padding:12px 16px;border-bottom:1px solid #E2E8F0">
                    <span style="font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px">Funnel Snapshot</span>
                </div>
                <div style="padding:16px">
                    <table style="width:100%;border-collapse:collapse">
                        <tr>{funnel_html}</tr>
                    </table>
                    {leak_html}
                </div>
            </div>
            
            <!-- Revenue Forecast -->
            <div style="background:linear-gradient(135deg,#111111 0%,#1E3A5F 100%);border-radius:8px;padding:20px;margin-bottom:24px;color:white">
                <div style="font-size:11px;color:#F5C84C;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Revenue Forecast (Weighted)</div>
                <table style="width:100%;border-collapse:collapse">
                    <tr>
                        <td style="width:50%;padding-right:12px">
                            <div style="font-size:10px;color:#94A3B8;text-transform:uppercase">Projected GMV</div>
                            <div style="font-size:32px;font-weight:700;color:#F5C84C;font-family:monospace">{_fmt(forecast["weighted_gmv"])}</div>
                        </td>
                        <td style="width:50%;padding-left:12px;border-left:1px solid rgba(255,255,255,0.2)">
                            <div style="font-size:10px;color:#94A3B8;text-transform:uppercase">Projected Commission</div>
                            <div style="font-size:32px;font-weight:700;color:white;font-family:monospace">{_fmt(forecast["weighted_commission"])}</div>
                        </td>
                    </tr>
                </table>
                <p style="font-size:10px;color:#64748B;margin:12px 0 0;font-style:italic">* Based on stage-weighted probability (New 5% → Negotiation 70%)</p>
            </div>
            
            <!-- Channel Performance -->
            <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px">
                <div style="background:#F8FAFC;padding:12px 16px;border-bottom:1px solid #E2E8F0">
                    <span style="font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px">Channel Performance</span>
                </div>
                <table style="width:100%;border-collapse:collapse">
                    <tr style="background:#F8FAFC">
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase">Source</td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;text-align:center">Leads</td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;text-align:center">Conv %</td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;text-align:right">GMV</td>
                    </tr>
                    {channel_rows}
                </table>
            </div>
            
            <!-- RM Leaderboard -->
            <div style="background:white;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px">
                <div style="background:#F8FAFC;padding:12px 16px;border-bottom:1px solid #E2E8F0">
                    <span style="font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:1px">RM Leaderboard</span>
                </div>
                <table style="width:100%;border-collapse:collapse">
                    <tr style="background:#F8FAFC">
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;width:40px"></td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase">Name</td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;text-align:center">Closed</td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;text-align:center">Conv %</td>
                        <td style="padding:8px 12px;font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;text-align:right">GMV</td>
                    </tr>
                    {rm_rows}
                </table>
            </div>
            
            <!-- Risk Alerts -->
            {risk_html}
            {payment_html}
            
            <!-- Footer -->
            <div style="text-align:center;padding:24px 0 8px;border-top:1px solid #E2E8F0;margin-top:24px">
                <p style="font-size:11px;color:#94A3B8;margin:0">
                    Sent by VenuLock Operations • {now.strftime("%d %b %Y, %H:%M")} UTC
                </p>
                <p style="font-size:10px;color:#CBD5E1;margin:8px 0 0">
                    This is an automated weekly digest. To adjust frequency, contact engineering.
                </p>
            </div>
        </div>
    </div>
    '''
    
    return html


async def send_admin_conversion_intelligence_digest() -> Dict:
    """
    Build and send the weekly conversion intelligence digest to all admins.
    Returns summary of emails sent.
    """
    # Build digest data
    data = await build_conversion_intelligence_digest()
    
    if data is None:
        logger.info("Skipping admin digest: no new data")
        return {"sent": 0, "reason": "no_new_data", "skipped": True}
    
    # Get all active admins
    admins = await db.users.find(
        {"role": "admin", "status": "active"},
        {"_id": 0, "email": 1, "name": 1, "user_id": 1}
    ).to_list(20)
    
    if not admins:
        return {"sent": 0, "reason": "no_admins", "skipped": True}
    
    # Build email HTML
    html = _build_email_html(data)
    
    # Build subject line
    topline = data["topline"]
    subject = f"Weekly Intel: {_fmt(topline['confirmed_gmv'])} GMV, {topline['overall_conversion']}% conversion"
    
    # Send to all admins
    sent = 0
    failed = 0
    for admin in admins:
        try:
            await send_email_async(admin["email"], subject, html)
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send digest to {admin['email']}: {e}")
            failed += 1
    
    # Log the digest
    now = datetime.now(timezone.utc)
    await db.admin_digest_log.insert_one({
        "log_id": generate_id("adigest_"),
        "type": "weekly_conversion_intelligence",
        "sent_at": now.isoformat(),
        "sent_to": [a["email"] for a in admins],
        "sent_count": sent,
        "failed_count": failed,
        "summary": {
            "week_leads": topline["week_leads"],
            "pipeline_value": topline["pipeline_value"],
            "confirmed_gmv": topline["confirmed_gmv"],
            "weighted_gmv": data["forecast"]["weighted_gmv"],
        },
    })
    
    logger.info(f"Admin conversion digest: {sent} sent, {failed} failed")
    
    return {
        "sent": sent,
        "failed": failed,
        "total_admins": len(admins),
        "skipped": False,
    }
