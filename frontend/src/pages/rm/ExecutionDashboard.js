import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Search, ChevronRight, Phone, MapPin,
  Calendar, Users, AlertTriangle, Clock, Package,
  CheckCircle2, UserCheck, Hourglass, ShieldCheck,
  Zap, FileWarning, Briefcase,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_CONFIG = {
  no_handoff:      { label: 'No Handoff',    color: 'bg-slate-400',   text: 'text-slate-600',  bg: 'bg-slate-50',   icon: Package },
  pending:         { label: 'Pending',        color: 'bg-amber-500',   text: 'text-amber-700',  bg: 'bg-amber-50',   icon: Hourglass },
  assigned:        { label: 'Assigned',       color: 'bg-blue-500',    text: 'text-blue-700',   bg: 'bg-blue-50',    icon: UserCheck },
  acknowledged:    { label: 'Acknowledged',   color: 'bg-violet-500',  text: 'text-violet-700', bg: 'bg-violet-50',  icon: CheckCircle2 },
  in_preparation:  { label: 'In Prep',        color: 'bg-cyan-500',    text: 'text-cyan-700',   bg: 'bg-cyan-50',    icon: Zap },
  ready:           { label: 'Ready',          color: 'bg-emerald-500', text: 'text-emerald-700',bg: 'bg-emerald-50', icon: ShieldCheck },
};

const READINESS_COLORS = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-600',
  blocked:     'bg-red-100 text-red-600',
  ready:       'bg-emerald-100 text-emerald-600',
};

export default function ExecutionDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/execution/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch execution dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    let list = data.items;
    if (statusFilter !== 'all') {
      list = list.filter(i => i.handoff_status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.customer_name?.toLowerCase().includes(q) ||
        i.venue_name?.toLowerCase().includes(q) ||
        i.city?.toLowerCase().includes(q) ||
        i.event_type?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, statusFilter, searchQuery]);

  const summary = data?.summary || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="execution-dashboard-page">
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/team/rm/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08]" data-testid="exec-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold leading-tight" data-testid="exec-title">Event Execution</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{summary.total || 0} confirmed bookings</p>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-1.5" data-testid="exec-summary-strip">
          <SummaryPill label="No Handoff" count={summary.no_handoff || 0}
            active={summary.no_handoff > 0} color="bg-red-500/20 text-red-300" inactiveColor="bg-white/[0.06] text-white/30" />
          <SummaryPill label="Pending" count={summary.pending_handoff || 0}
            active={summary.pending_handoff > 0} color="bg-amber-500/20 text-amber-300" inactiveColor="bg-white/[0.06] text-white/30" />
          <SummaryPill label="Blocked" count={summary.blocked || 0}
            active={summary.blocked > 0} color="bg-orange-500/20 text-orange-300" inactiveColor="bg-white/[0.06] text-white/30" />
          <SummaryPill label="Ready" count={summary.ready || 0}
            active={summary.ready > 0} color="bg-emerald-500/20 text-emerald-300" inactiveColor="bg-white/[0.06] text-white/30" />
        </div>

        {summary.approaching_soon > 0 && (
          <div className="mt-2 px-3 py-1.5 bg-red-500/20 rounded-lg flex items-center gap-2" data-testid="exec-approaching-alert">
            <Clock className="w-3.5 h-3.5 text-red-300" />
            <span className="text-[11px] text-red-200 font-semibold">{summary.approaching_soon} event{summary.approaching_soon > 1 ? 's' : ''} within 7 days</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customer, venue, city..."
            className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-[13px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
            data-testid="exec-search-input" />
        </div>
      </div>

      {/* Status Filter */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" data-testid="exec-status-filters">
          {['all', 'no_handoff', 'pending', 'assigned', 'acknowledged', 'in_preparation', 'ready'].map(s => {
            const isActive = statusFilter === s;
            const config = s === 'all' ? null : STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-7 text-[10px] font-semibold whitespace-nowrap border rounded-full transition-all flex-shrink-0",
                  isActive ? "bg-[#0B0B0D] text-white border-[#0B0B0D]" : "bg-white text-slate-500 border-slate-200"
                )} data-testid={`exec-filter-${s}`}>
                {config && <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />}
                {s === 'all' ? 'All' : config?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event List */}
      <div className="px-4 space-y-2 pb-24" data-testid="exec-event-list">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-slate-400">No confirmed bookings</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting filters' : 'Confirmed bookings will appear here'}
            </p>
          </div>
        ) : (
          items.map(item => <EventCard key={item.lead_id} item={item} onTap={() => navigate(`/team/rm/execution/${item.lead_id}`)} />)
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, count, active, color, inactiveColor }) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 py-2 rounded-xl", active ? color : inactiveColor)}>
      <span className="text-[16px] font-bold leading-none">{count}</span>
      <span className="text-[8px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function EventCard({ item, onTap }) {
  const config = STATUS_CONFIG[item.handoff_status] || STATUS_CONFIG.no_handoff;
  const StatusIcon = config.icon;

  return (
    <button onClick={onTap} className={cn(
      "w-full bg-white rounded-xl border p-3.5 text-left transition-all",
      item.approaching_soon ? 'border-red-200 bg-red-50/20' :
      item.readiness_posture === 'blocked' ? 'border-orange-200 bg-orange-50/20' :
      item.handoff_status === 'no_handoff' ? 'border-amber-200 bg-amber-50/10' : 'border-black/[0.05]'
    )} data-testid={`exec-card-${item.lead_id}`}>
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#0B0B0D] flex items-center justify-center flex-shrink-0">
          <StatusIcon className="w-4 h-4 text-[#D4B36A]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-[13px] font-bold text-[#0B0B0D] truncate">{item.customer_name}</h3>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.venue_name && <span className="text-[10px] text-slate-500 truncate max-w-[40%]">{item.venue_name}</span>}
            {item.event_type && <span className="text-[10px] text-slate-400">{item.event_type}</span>}
            {item.city && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{item.city}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={cn("flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full", config.bg, config.text)}>
          <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
          {config.label}
        </span>
        {item.execution_owner && (
          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
            <UserCheck className="w-2.5 h-2.5" /> {item.execution_owner}
          </span>
        )}
        <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", READINESS_COLORS[item.readiness_posture] || 'bg-slate-100 text-slate-500')}>
          {item.readiness_done}/{item.readiness_total} ready
        </span>
        {item.open_change_requests > 0 && (
          <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" data-testid="cr-count">
            <FileWarning className="w-2.5 h-2.5" /> {item.open_change_requests} CR
          </span>
        )}
        {item.approaching_soon && (
          <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ml-auto" data-testid="approaching-badge">
            <Clock className="w-2.5 h-2.5" /> {item.days_until_event}d away
          </span>
        )}
        {!item.approaching_soon && item.event_date && (
          <span className="text-[9px] text-slate-400 flex items-center gap-0.5 ml-auto">
            <Calendar className="w-2.5 h-2.5" />{formatShort(item.event_date)}
          </span>
        )}
      </div>
    </button>
  );
}

function formatShort(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}
