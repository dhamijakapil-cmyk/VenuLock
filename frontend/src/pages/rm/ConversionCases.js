import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Search, Clock, ChevronRight, Phone, MessageCircle,
  MapPin, AlertTriangle, Users, ArrowLeft, Zap,
  CheckCircle2, Calendar, FileText, Eye,
  Briefcase, Plus, Filter,
} from 'lucide-react';

const STAGE_CONFIG = {
  enquiry_received:            { label: 'Enquiry',        color: 'bg-blue-500',    text: 'text-blue-600',    bg: 'bg-blue-50' },
  new:                         { label: 'Enquiry',        color: 'bg-blue-500',    text: 'text-blue-600',    bg: 'bg-blue-50' },
  requirement_qualified:       { label: 'Qualified',      color: 'bg-sky-500',     text: 'text-sky-600',     bg: 'bg-sky-50' },
  contacted:                   { label: 'Qualified',      color: 'bg-sky-500',     text: 'text-sky-600',     bg: 'bg-sky-50' },
  venues_shortlisted:          { label: 'Shortlisted',    color: 'bg-violet-500',  text: 'text-violet-600',  bg: 'bg-violet-50' },
  shortlisted:                 { label: 'Shortlisted',    color: 'bg-violet-500',  text: 'text-violet-600',  bg: 'bg-violet-50' },
  quote_requested:             { label: 'Quote Req',      color: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50' },
  quote_received:              { label: 'Quote In',       color: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50' },
  site_visit_planned:          { label: 'Visit Plan',     color: 'bg-purple-500',  text: 'text-purple-600',  bg: 'bg-purple-50' },
  site_visit:                  { label: 'Visit Plan',     color: 'bg-purple-500',  text: 'text-purple-600',  bg: 'bg-purple-50' },
  site_visit_completed:        { label: 'Visit Done',     color: 'bg-purple-600',  text: 'text-purple-700',  bg: 'bg-purple-50' },
  negotiation_in_progress:     { label: 'Negotiation',    color: 'bg-orange-500',  text: 'text-orange-600',  bg: 'bg-orange-50' },
  negotiation:                 { label: 'Negotiation',    color: 'bg-orange-500',  text: 'text-orange-600',  bg: 'bg-orange-50' },
  commercial_accepted:         { label: 'Accepted',       color: 'bg-teal-500',    text: 'text-teal-600',    bg: 'bg-teal-50' },
  booking_confirmation_pending:{ label: 'Booking Pending', color: 'bg-cyan-500',   text: 'text-cyan-600',    bg: 'bg-cyan-50' },
  booking_confirmed:           { label: 'Confirmed',      color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  lost:                        { label: 'Lost',           color: 'bg-red-500',     text: 'text-red-600',     bg: 'bg-red-50' },
};

const sans = { fontFamily: "'DM Sans', sans-serif" };

export default function ConversionCases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const fetchCases = useCallback(async () => {
    try {
      const res = await api.get('/conversion/cases');
      setCases(res.data?.cases || []);
    } catch (err) {
      console.error('Failed to fetch conversion cases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // Urgency counts
  const urgency = useMemo(() => {
    let overdue = 0, blocked = 0, active = 0, high = 0;
    cases.forEach(c => {
      if (c.is_overdue) overdue++;
      if (c.is_blocked) blocked++;
      if (c.urgency === 'high' || c.urgency === 'critical') high++;
      if (!['booking_confirmed', 'lost'].includes(c.normalized_stage)) active++;
    });
    return { overdue, blocked, high, active };
  }, [cases]);

  const filteredCases = useMemo(() => {
    let list = cases;
    if (stageFilter !== 'all') {
      list = list.filter(c => c.stage === stageFilter || c.normalized_stage === stageFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.customer_name?.toLowerCase().includes(q) ||
        c.customer_phone?.includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.event_type?.toLowerCase().includes(q) ||
        c.lead_id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cases, stageFilter, searchQuery]);

  const stageCounts = useMemo(() => {
    const counts = { all: cases.length };
    cases.forEach(c => {
      const s = c.normalized_stage || c.stage;
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [cases]);

  const activeStages = ['all', ...Object.keys(STAGE_CONFIG).filter(s => stageCounts[s] > 0 && !['new', 'contacted', 'shortlisted', 'site_visit', 'negotiation'].includes(s))];

  const openWhatsApp = (phone, name) => {
    if (!phone) return;
    const p = phone.replace(/\D/g, '');
    const msg = `Hi ${name?.split(' ')[0] || ''}! This is ${user?.name} from VenuLoQ.`;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="conversion-cases-page">
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/team/rm/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15]" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold leading-tight" data-testid="conversion-title">Conversion Pipeline</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{cases.length} cases</p>
          </div>
        </div>

        {/* Urgency Strip */}
        <div className="flex gap-2" data-testid="conv-urgency-strip">
          <UrgencyPill icon={<Clock className="w-3 h-3" />} label="Overdue" count={urgency.overdue}
            color={urgency.overdue ? 'bg-red-500/20 text-red-300' : 'bg-white/[0.06] text-white/30'} />
          <UrgencyPill icon={<AlertTriangle className="w-3 h-3" />} label="Blocked" count={urgency.blocked}
            color={urgency.blocked ? 'bg-orange-500/20 text-orange-300' : 'bg-white/[0.06] text-white/30'} />
          <UrgencyPill icon={<Zap className="w-3 h-3" />} label="Urgent" count={urgency.high}
            color={urgency.high ? 'bg-amber-500/20 text-amber-300' : 'bg-white/[0.06] text-white/30'} />
          <UrgencyPill icon={<Users className="w-3 h-3" />} label="Active" count={urgency.active}
            color="bg-[#D4B36A]/20 text-[#D4B36A]" />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, city, event..."
            className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-[13px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
            data-testid="conv-search-input" />
        </div>
      </div>

      {/* Stage Filter Chips */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" data-testid="conv-stage-filters">
          {activeStages.map(stage => {
            const isActive = stageFilter === stage;
            const config = stage === 'all' ? null : STAGE_CONFIG[stage];
            const count = stageCounts[stage] || 0;
            return (
              <button key={stage} onClick={() => setStageFilter(stage)}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-7 text-[10px] font-semibold whitespace-nowrap border rounded-full transition-all flex-shrink-0",
                  isActive ? "bg-[#0B0B0D] text-white border-[#0B0B0D]" : "bg-white text-slate-500 border-slate-200"
                )} data-testid={`conv-filter-${stage}`}>
                {config && <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />}
                {stage === 'all' ? 'All' : config?.label}
                <span className={cn("text-[9px]", isActive ? "text-white/50" : "text-slate-400")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Case List */}
      <div className="px-4 space-y-2 pb-24" data-testid="conv-case-list">
        {filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-slate-400">No conversion cases found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery || stageFilter !== 'all' ? 'Try adjusting filters' : 'Cases will appear here from enquiries'}
            </p>
          </div>
        ) : (
          filteredCases.map(c => (
            <ConversionCard key={c.lead_id} c={c}
              onWhatsApp={() => openWhatsApp(c.customer_phone, c.customer_name)}
              onCall={() => c.customer_phone && window.open(`tel:${c.customer_phone}`, '_self')}
              onTap={() => navigate(`/team/rm/conversion/${c.lead_id}`)} />
          ))
        )}
      </div>
    </div>
  );
}

function UrgencyPill({ icon, label, count, color }) {
  return (
    <div className={cn("flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl", color)}
      data-testid={`conv-urgency-${label.toLowerCase()}`}>
      {icon}
      <span className="text-[16px] font-bold leading-none">{count}</span>
      <span className="text-[8px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function ConversionCard({ c, onWhatsApp, onCall, onTap }) {
  const config = STAGE_CONFIG[c.stage] || STAGE_CONFIG[c.normalized_stage] || STAGE_CONFIG.enquiry_received;

  return (
    <div className={cn(
      "bg-white rounded-xl border p-3.5 transition-all",
      c.is_blocked ? 'border-orange-200 bg-orange-50/30' :
      c.is_overdue ? 'border-red-200 bg-red-50/20' : 'border-black/[0.05]'
    )} data-testid={`conv-card-${c.lead_id}`}>
      <button onClick={onTap} className="w-full text-left" data-testid={`conv-tap-${c.lead_id}`}>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-[13px] flex-shrink-0">
            {c.customer_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-[13px] font-bold text-[#0B0B0D] truncate">{c.customer_name}</h3>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {c.event_type && <span className="text-[10px] text-slate-500 truncate">{c.event_type}</span>}
              {(c.city || c.area) && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                  <MapPin className="w-2.5 h-2.5" strokeWidth={1.5} />{c.area || c.city}
                </span>
              )}
              {c.guest_count && <span className="text-[10px] text-slate-400">{c.guest_count} pax</span>}
            </div>
          </div>
        </div>

        {/* Status + Flags */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className={cn("flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full", config.bg, config.text)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
            {c.stage_label || config.label}
          </span>
          {c.is_blocked && (
            <span className="flex items-center gap-0.5 text-[8px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full" data-testid="blocked-flag">
              <AlertTriangle className="w-2.5 h-2.5" /> BLOCKED
            </span>
          )}
          {c.is_overdue && !c.is_blocked && (
            <span className="flex items-center gap-0.5 text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full" data-testid="overdue-flag">
              <Clock className="w-2.5 h-2.5" /> OVERDUE
            </span>
          )}
          {c.shortlist_count > 0 && (
            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />{c.shortlist_count} venues
            </span>
          )}
          {c.quote_count > 0 && (
            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
              <FileText className="w-2.5 h-2.5" />{c.quote_count} quotes
            </span>
          )}
          {c.event_date && (
            <span className="flex items-center gap-0.5 text-[9px] text-slate-400 ml-auto">
              <Calendar className="w-2.5 h-2.5" />{formatShortDate(c.event_date)}
            </span>
          )}
        </div>

        {/* Next action */}
        {c.next_action && (
          <div className="mt-2 px-2.5 py-1.5 bg-[#D4B36A]/[0.06] rounded-lg">
            <p className="text-[10px] text-[#8B7A3E] font-medium truncate">Next: {c.next_action}</p>
          </div>
        )}
      </button>

      {/* Quick Actions */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-black/[0.04]">
        <button onClick={e => { e.stopPropagation(); onCall(); }}
          className="flex items-center gap-1 px-2.5 h-7 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-semibold active:scale-[0.97] transition-transform"
          data-testid={`conv-call-${c.lead_id}`}>
          <Phone className="w-3 h-3" /> Call
        </button>
        <button onClick={e => { e.stopPropagation(); onWhatsApp(); }}
          className="flex items-center gap-1 px-2.5 h-7 bg-green-50 text-green-700 rounded-lg text-[10px] font-semibold active:scale-[0.97] transition-transform"
          data-testid={`conv-wa-${c.lead_id}`}>
          <MessageCircle className="w-3 h-3" /> WhatsApp
        </button>
        <button onClick={onTap}
          className="flex items-center gap-1 px-2.5 h-7 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-semibold active:scale-[0.97] transition-transform ml-auto"
          data-testid={`conv-open-${c.lead_id}`}>
          <ChevronRight className="w-3 h-3" /> Open
        </button>
      </div>
    </div>
  );
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}
