import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Search, Users, Clock, ChevronRight, Phone, MessageCircle,
  Calendar, MapPin, Filter, AlertTriangle, Bell, ArrowRight,
  Zap, CheckCircle2, XCircle, StickyNote, RotateCcw, Briefcase,
} from 'lucide-react';

const STAGE_CONFIG = {
  new:              { label: 'New',         color: 'bg-blue-500',   text: 'text-blue-600',  bg: 'bg-blue-50' },
  contacted:        { label: 'Contacted',   color: 'bg-amber-500',  text: 'text-amber-600', bg: 'bg-amber-50' },
  site_visit:       { label: 'Site Visit',  color: 'bg-purple-500', text: 'text-purple-600',bg: 'bg-purple-50' },
  negotiation:      { label: 'Negotiation', color: 'bg-orange-500', text: 'text-orange-600',bg: 'bg-orange-50' },
  booked:           { label: 'Booked',      color: 'bg-emerald-500',text: 'text-emerald-600',bg: 'bg-emerald-50' },
  deposit_paid:     { label: 'Deposit',     color: 'bg-teal-500',   text: 'text-teal-600',  bg: 'bg-teal-50' },
  event_done:       { label: 'Event Done',  color: 'bg-indigo-500', text: 'text-indigo-600',bg: 'bg-indigo-50' },
  full_payment:     { label: 'Payment',     color: 'bg-cyan-500',   text: 'text-cyan-600',  bg: 'bg-cyan-50' },
  payment_released: { label: 'Released',    color: 'bg-green-600',  text: 'text-green-600', bg: 'bg-green-50' },
  lost:             { label: 'Lost',        color: 'bg-red-500',    text: 'text-red-600',   bg: 'bg-red-50' },
};

const sans = { fontFamily: "'DM Sans', sans-serif" };

const RMDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [viewMode, setViewMode] = useState('attention'); // 'attention' | 'all'

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, summaryRes, alertsRes] = await Promise.all([
        api.get('/workflow/my-leads'),
        api.get('/workflow/rm/action-summary'),
        api.get('/workflow/rm/alerts'),
      ]);
      setLeads(leadsRes.data || []);
      setSummary(summaryRes.data || null);
      setAlerts(alertsRes.data?.alerts || []);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const needsAttention = useMemo(() => {
    if (!summary) return [];
    const items = [];
    (summary.overdue || []).forEach(fu => items.push({ type: 'overdue', ...fu }));
    (summary.todays_follow_ups || []).forEach(fu => items.push({ type: 'today', ...fu }));
    (summary.blocked || []).forEach(b => items.push({ type: 'blocked', ...b }));
    return items;
  }, [summary]);

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (stageFilter !== 'all') list = list.filter(l => l.stage === stageFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l =>
        l.customer_name?.toLowerCase().includes(q) ||
        l.venue_name?.toLowerCase().includes(q) ||
        l.customer_phone?.includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.event_type?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, stageFilter, searchQuery]);

  const stageCounts = useMemo(() => {
    const counts = { all: leads.length };
    leads.forEach(l => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
    return counts;
  }, [leads]);

  const activeStages = ['all', ...Object.keys(STAGE_CONFIG).filter(s => stageCounts[s] > 0)];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Morning' : greetingHour < 17 ? 'Afternoon' : 'Evening';

  const openWhatsApp = (phone, name) => {
    if (!phone) return;
    const p = phone.replace(/\D/g, '');
    const msg = `Hi ${name?.split(' ')[0] || ''}! This is ${user?.name} from VenuLoQ.`;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const callCustomer = (phone) => { if (phone) window.open(`tel:${phone}`, '_self'); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans}>
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-4 relative" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Good {greeting}</p>
            <h1 className="text-[20px] font-bold leading-tight" data-testid="rm-dashboard-title">
              {user?.name?.split(' ')[0] || 'RM'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAlerts(!showAlerts)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors relative"
              data-testid="rm-alerts-btn">
              <Bell className="w-4 h-4 text-white/70" />
              {alerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]"
                  data-testid="alert-badge">{alerts.length > 9 ? '9+' : alerts.length}</span>
              )}
            </button>
            <Link to="/team/rm/my-performance"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors"
              data-testid="rm-performance-link">
              <Zap className="w-4 h-4 text-[#D4B36A]" />
            </Link>
            <Link to="/team/rm/conversion"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors"
              data-testid="rm-conversion-link">
              <Briefcase className="w-4 h-4 text-[#D4B36A]" />
            </Link>
          </div>
        </div>

        {/* Urgency Strip */}
        <div className="flex gap-2" data-testid="urgency-strip">
          <UrgencyPill
            icon={<Clock className="w-3 h-3" />}
            label="Overdue"
            count={summary?.overdue_count || 0}
            color={summary?.overdue_count ? 'bg-red-500/20 text-red-300' : 'bg-white/[0.06] text-white/30'}
            active={summary?.overdue_count > 0}
            onClick={() => setViewMode('attention')}
          />
          <UrgencyPill
            icon={<Bell className="w-3 h-3" />}
            label="Today"
            count={summary?.todays_follow_ups_count || 0}
            color={summary?.todays_follow_ups_count ? 'bg-amber-500/20 text-amber-300' : 'bg-white/[0.06] text-white/30'}
            active={summary?.todays_follow_ups_count > 0}
            onClick={() => setViewMode('attention')}
          />
          <UrgencyPill
            icon={<AlertTriangle className="w-3 h-3" />}
            label="Blocked"
            count={summary?.blocked_count || 0}
            color={summary?.blocked_count ? 'bg-orange-500/20 text-orange-300' : 'bg-white/[0.06] text-white/30'}
            active={summary?.blocked_count > 0}
            onClick={() => setViewMode('attention')}
          />
          <UrgencyPill
            icon={<Users className="w-3 h-3" />}
            label="Active"
            count={summary?.active_leads || 0}
            color="bg-[#D4B36A]/20 text-[#D4B36A]"
            active
            onClick={() => { setViewMode('all'); setStageFilter('all'); }}
          />
        </div>
      </div>

      {/* Alerts Dropdown */}
      {showAlerts && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-black/[0.06] shadow-lg z-30 max-h-80 overflow-y-auto" data-testid="alerts-panel">
          <div className="px-4 py-2.5 border-b border-black/[0.04] flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#0B0B0D]" style={sans}>Alerts ({alerts.length})</h3>
            <button onClick={() => setShowAlerts(false)} className="text-[11px] text-slate-400 font-medium">Close</button>
          </div>
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-1" />
              <p className="text-[12px] text-slate-400">No alerts right now</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {alerts.map((alert, i) => (
                <button key={i} onClick={() => { navigate(`/team/rm/leads/${alert.lead_id}`); setShowAlerts(false); }}
                  className="w-full px-4 py-3 flex items-start gap-2.5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  data-testid={`alert-${alert.type}-${i}`}>
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    alert.priority === 'high' ? 'bg-red-500' : alert.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#0B0B0D]">{alert.title}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{alert.description}</p>
                  </div>
                  <span className="text-[8px] text-slate-400 flex-shrink-0 mt-0.5">{formatRelative(alert.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Toggle */}
      <div className="px-4 py-2.5 bg-white border-b border-black/[0.04]">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5" data-testid="view-toggle">
          <button onClick={() => setViewMode('attention')}
            className={cn("flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all",
              viewMode === 'attention' ? 'bg-white text-[#0B0B0D] shadow-sm' : 'text-slate-400')}>
            Needs Attention
          </button>
          <button onClick={() => setViewMode('all')}
            className={cn("flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all",
              viewMode === 'all' ? 'bg-white text-[#0B0B0D] shadow-sm' : 'text-slate-400')}>
            All Cases ({leads.length})
          </button>
        </div>
      </div>

      {viewMode === 'attention' ? (
        /* ===== ATTENTION VIEW ===== */
        <div className="px-4 py-3 pb-24 space-y-4">
          {needsAttention.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-[14px] font-semibold text-slate-500">You're all caught up</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No overdue, follow-ups, or blockers</p>
            </div>
          ) : (
            <>
              {/* Overdue Section */}
              {(summary?.overdue || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Overdue ({summary.overdue.length})
                  </h3>
                  <div className="space-y-2">
                    {summary.overdue.map(fu => (
                      <ActionItem key={fu.follow_up_id} type="overdue"
                        title={fu.customer_name} subtitle={fu.description}
                        meta={formatRelative(fu.scheduled_at)}
                        onTap={() => navigate(`/team/rm/leads/${fu.lead_id}`)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Today's Follow-ups */}
              {(summary?.todays_follow_ups || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Today's Follow-ups ({summary.todays_follow_ups.length})
                  </h3>
                  <div className="space-y-2">
                    {summary.todays_follow_ups.map(fu => (
                      <ActionItem key={fu.follow_up_id} type="today"
                        title={fu.customer_name} subtitle={fu.description}
                        meta={formatTime(fu.scheduled_at)}
                        onTap={() => navigate(`/team/rm/leads/${fu.lead_id}`)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Blocked */}
              {(summary?.blocked || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Blocked ({summary.blocked.length})
                  </h3>
                  <div className="space-y-2">
                    {summary.blocked.map(b => (
                      <ActionItem key={b.lead_id} type="blocked"
                        title={b.customer_name} subtitle={b.blocker?.reason || 'Blocker flagged'}
                        meta={b.blocker?.severity?.toUpperCase()}
                        onTap={() => navigate(`/team/rm/leads/${b.lead_id}`)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Activity */}
              {(summary?.recent_activity || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Recent Activity
                  </h3>
                  <div className="space-y-1.5">
                    {summary.recent_activity.slice(0, 5).map((a, i) => (
                      <button key={a.activity_id || i} onClick={() => navigate(`/team/rm/leads/${a.lead_id}`)}
                        className="w-full flex items-center gap-2 p-2.5 bg-white rounded-lg border border-black/[0.04] text-left active:bg-slate-50">
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                          a.action === 'stage_change' ? 'bg-[#D4B36A]' : a.action === 'message_sent' ? 'bg-blue-400' : 'bg-slate-300')} />
                        <p className="text-[11px] text-slate-600 flex-1 truncate">{a.detail}</p>
                        <span className="text-[9px] text-slate-400 flex-shrink-0">{formatRelative(a.created_at)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      ) : (
        /* ===== ALL CASES VIEW ===== */
        <div className="pb-24">
          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, venue, phone, city..."
                className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-[13px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
                data-testid="rm-search-input"
              />
            </div>
          </div>

          {/* Stage filter chips */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" data-testid="rm-stage-filters">
              {activeStages.map(stage => {
                const isActive = stageFilter === stage;
                const config = stage === 'all' ? null : STAGE_CONFIG[stage];
                const count = stageCounts[stage] || 0;
                return (
                  <button key={stage} onClick={() => setStageFilter(stage)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 h-7 text-[10px] font-semibold whitespace-nowrap border rounded-full transition-all flex-shrink-0",
                      isActive ? "bg-[#0B0B0D] text-white border-[#0B0B0D]" : "bg-white text-slate-500 border-slate-200"
                    )} data-testid={`rm-filter-${stage}`}>
                    {config && <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />}
                    {stage === 'all' ? 'All' : config?.label}
                    <span className={cn("text-[9px]", isActive ? "text-white/50" : "text-slate-400")}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Case List */}
          <div className="px-4 space-y-2">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[13px] text-slate-400">No cases found</p>
              </div>
            ) : (
              filteredLeads.map(lead => (
                <CaseCard key={lead.lead_id} lead={lead}
                  onCall={() => callCustomer(lead.customer_phone)}
                  onWhatsApp={() => openWhatsApp(lead.customer_phone, lead.customer_name)}
                  onTap={() => navigate(`/team/rm/leads/${lead.lead_id}`)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---- Sub-Components ---- */

function UrgencyPill({ icon, label, count, color, active, onClick }) {
  return (
    <button onClick={onClick}
      className={cn("flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all", color, active && 'active:scale-[0.97]')}
      data-testid={`urgency-${label.toLowerCase()}`}>
      {icon}
      <span className="text-[16px] font-bold leading-none">{count}</span>
      <span className="text-[8px] uppercase tracking-wider opacity-70">{label}</span>
    </button>
  );
}

function ActionItem({ type, title, subtitle, meta, onTap }) {
  const borderColor = type === 'overdue' ? 'border-l-red-500' : type === 'today' ? 'border-l-amber-500' : 'border-l-orange-500';
  return (
    <button onClick={onTap}
      className={cn("w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-black/[0.04] border-l-[3px] text-left active:bg-slate-50 transition-colors", borderColor)}
      data-testid={`action-item-${type}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#0B0B0D] truncate">{title}</p>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {meta && <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
          type === 'overdue' ? 'bg-red-50 text-red-500' : type === 'today' ? 'bg-amber-50 text-amber-600' : 'bg-orange-50 text-orange-600'
        )}>{meta}</span>}
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      </div>
    </button>
  );
}

function CaseCard({ lead, onCall, onWhatsApp, onTap }) {
  const config = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.new;
  const hasBlocker = lead.blocker?.active;
  const isOverdue = lead.is_overdue;

  return (
    <div className={cn(
      "bg-white rounded-xl border p-3.5 transition-all",
      hasBlocker ? 'border-orange-200 bg-orange-50/30' :
      isOverdue ? 'border-red-200 bg-red-50/20' : 'border-black/[0.05]'
    )} data-testid={`rm-lead-card-${lead.lead_id}`}>
      <button onClick={onTap} className="w-full text-left" data-testid={`case-tap-${lead.lead_id}`}>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-[13px] flex-shrink-0">
            {lead.customer_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-[13px] font-bold text-[#0B0B0D] truncate" style={sans}>{lead.customer_name}</h3>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {lead.event_type && (
                <span className="text-[10px] text-slate-500 truncate">{lead.event_type}</span>
              )}
              {(lead.city || lead.area) && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                  <MapPin className="w-2.5 h-2.5" strokeWidth={1.5} />{lead.area || lead.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status + Meta Row */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={cn("flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full", config.bg, config.text)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
            {config.label}
          </span>
          {hasBlocker && (
            <span className="flex items-center gap-0.5 text-[8px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-2.5 h-2.5" /> BLOCKED
            </span>
          )}
          {isOverdue && !hasBlocker && (
            <span className="flex items-center gap-0.5 text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" /> OVERDUE
            </span>
          )}
          {lead.follow_up_date && !isOverdue && (
            <span className="text-[9px] text-slate-400">
              Follow-up: {formatShortDate(lead.follow_up_date)}
            </span>
          )}
          {lead.event_date && (
            <span className="flex items-center gap-0.5 text-[9px] text-slate-400 ml-auto">
              <Calendar className="w-2.5 h-2.5" />
              {formatShortDate(lead.event_date)}
            </span>
          )}
        </div>
      </button>

      {/* Quick Actions Row */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-black/[0.04]">
        <button onClick={(e) => { e.stopPropagation(); onCall(); }}
          className="flex items-center gap-1 px-2.5 h-7 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-semibold active:scale-[0.97] transition-transform"
          data-testid={`quick-call-${lead.lead_id}`}>
          <Phone className="w-3 h-3" /> Call
        </button>
        <button onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
          className="flex items-center gap-1 px-2.5 h-7 bg-green-50 text-green-700 rounded-lg text-[10px] font-semibold active:scale-[0.97] transition-transform"
          data-testid={`quick-wa-${lead.lead_id}`}>
          <MessageCircle className="w-3 h-3" /> WhatsApp
        </button>
        <button onClick={onTap}
          className="flex items-center gap-1 px-2.5 h-7 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-semibold active:scale-[0.97] transition-transform ml-auto"
          data-testid={`quick-note-${lead.lead_id}`}>
          <StickyNote className="w-3 h-3" /> Details
        </button>
      </div>
    </div>
  );
}

/* ---- Helpers ---- */

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffHrs = Math.floor(Math.abs(diffMs) / 3600000);
  if (diffMs < 0) {
    // Future
    if (diffHrs < 1) return 'In <1h';
    if (diffHrs < 24) return `In ${diffHrs}h`;
    return `In ${Math.floor(diffHrs / 24)}d`;
  }
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}

export default RMDashboard;
