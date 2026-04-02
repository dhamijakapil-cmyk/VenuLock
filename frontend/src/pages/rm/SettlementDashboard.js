import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Search, ChevronRight, MapPin,
  Calendar, AlertTriangle, IndianRupee, Clock,
  CheckCircle2, ShieldAlert, Lock, Hourglass,
  Ban, CircleAlert, ShieldCheck, FileCheck,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_CONFIG = {
  closure_ready:                   { label: 'Closure Ready',     color: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-50',   icon: Lock },
  settlement_pending:              { label: 'Pending',           color: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50',    icon: Hourglass },
  collection_verification_pending: { label: 'Collection Check',  color: 'bg-cyan-500',    text: 'text-cyan-700',    bg: 'bg-cyan-50',    icon: IndianRupee },
  payable_commitments_pending:     { label: 'Payables Due',      color: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   icon: FileCheck },
  settlement_under_review:         { label: 'Under Review',      color: 'bg-purple-500',  text: 'text-purple-700',  bg: 'bg-purple-50',  icon: ShieldAlert },
  settlement_ready:                { label: 'Ready',             color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: ShieldCheck },
  settlement_blocked:              { label: 'Blocked',           color: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     icon: Ban },
  financial_closure_completed:     { label: 'Closed',            color: 'bg-green-600',   text: 'text-green-700',   bg: 'bg-green-100',  icon: CheckCircle2 },
};

const PAYOUT_BADGE = {
  payout_ready:                            { label: 'Payout Ready', bg: 'bg-emerald-100 text-emerald-700' },
  payout_not_ready:                        { label: 'Not Ready',    bg: 'bg-slate-100 text-slate-500' },
  payout_readiness_unclear:                { label: 'Unclear',      bg: 'bg-amber-100 text-amber-700' },
  payout_blocked_by_dispute_or_hold:       { label: 'Disputed',     bg: 'bg-red-100 text-red-700' },
  payout_readiness_pending_verification:   { label: 'Verifying',    bg: 'bg-cyan-100 text-cyan-700' },
};

const formatCurrency = (v) => {
  if (!v && v !== 0) return '--';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

export default function SettlementDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/settlement/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch settlement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    let list = data.items;
    if (statusFilter !== 'all') {
      list = list.filter(i => i.settlement_status === statusFilter);
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
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="settlement-dashboard-page">
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/team/rm/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08]" data-testid="settlement-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold leading-tight" data-testid="settlement-title">Settlement</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{summary.total || 0} cases</p>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-1.5" data-testid="settlement-summary-strip">
          <SummaryPill label="Pending" count={summary.settlement_pending || 0}
            active={(summary.settlement_pending || 0) > 0} color="bg-blue-500/20 text-blue-300" />
          <SummaryPill label="Review" count={summary.under_review || 0}
            active={(summary.under_review || 0) > 0} color="bg-purple-500/20 text-purple-300" />
          <SummaryPill label="Blocked" count={summary.blocked || 0}
            active={(summary.blocked || 0) > 0} color="bg-red-500/20 text-red-300" />
          <SummaryPill label="Done" count={summary.completed || 0}
            active={(summary.completed || 0) > 0} color="bg-emerald-500/20 text-emerald-300" />
        </div>

        {(summary.disputes || 0) > 0 && (
          <div className="mt-2 px-3 py-1.5 bg-red-500/20 rounded-lg flex items-center gap-2" data-testid="settlement-dispute-alert">
            <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
            <span className="text-[11px] text-red-200 font-semibold">{summary.disputes} case{summary.disputes > 1 ? 's' : ''} with disputes/holds</span>
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
            data-testid="settlement-search-input" />
        </div>
      </div>

      {/* Status Filter */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" data-testid="settlement-status-filters">
          {['all', 'closure_ready', 'settlement_pending', 'settlement_under_review', 'settlement_ready', 'settlement_blocked', 'financial_closure_completed'].map(s => {
            const isActive = statusFilter === s;
            const config = s === 'all' ? null : STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-7 text-[10px] font-semibold whitespace-nowrap border rounded-full transition-all flex-shrink-0",
                  isActive ? "bg-[#0B0B0D] text-white border-[#0B0B0D]" : "bg-white text-slate-500 border-slate-200"
                )} data-testid={`settlement-filter-${s}`}>
                {config && <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />}
                {s === 'all' ? 'All' : config?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settlement List */}
      <div className="px-4 space-y-2 pb-24" data-testid="settlement-list">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <IndianRupee className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-slate-400">No settlement cases found</p>
            <p className="text-[11px] text-slate-300 mt-0.5">Cases appear here after event closure</p>
          </div>
        ) : (
          items.map(item => <SettlementCard key={item.lead_id} item={item} onTap={() => navigate(`/team/rm/settlement/${item.lead_id}`)} />)
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, count, active, color }) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 py-2 rounded-xl", active ? color : 'bg-white/[0.06] text-white/30')}>
      <span className="text-[16px] font-bold leading-none">{count}</span>
      <span className="text-[8px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function SettlementCard({ item, onTap }) {
  const config = STATUS_CONFIG[item.settlement_status] || STATUS_CONFIG.closure_ready;
  const StatusIcon = config.icon;
  const payoutBadge = PAYOUT_BADGE[item.payout_readiness] || PAYOUT_BADGE.payout_not_ready;

  return (
    <button onClick={onTap} className={cn(
      "w-full bg-white rounded-xl border p-3.5 text-left transition-all",
      item.settlement_status === 'settlement_blocked' ? 'border-red-200 bg-red-50/20' :
      item.dispute_hold ? 'border-orange-200 bg-orange-50/10' :
      item.settlement_status === 'financial_closure_completed' ? 'border-green-200 bg-green-50/20' :
      'border-black/[0.05]'
    )} data-testid={`settlement-card-${item.lead_id}`}>
      <div className="flex items-start gap-2.5">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          item.settlement_status === 'settlement_blocked' ? 'bg-red-600' :
          item.settlement_status === 'financial_closure_completed' ? 'bg-green-600' : 'bg-[#0B0B0D]'
        )}>
          <StatusIcon className={cn("w-4 h-4",
            ['settlement_blocked', 'financial_closure_completed'].includes(item.settlement_status) ? 'text-white' : 'text-[#D4B36A]'
          )} />
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
        {item.settlement_owner && (
          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> {item.settlement_owner}
          </span>
        )}
        <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", payoutBadge.bg)}>
          {payoutBadge.label}
        </span>
        {item.dispute_hold && (
          <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" data-testid="dispute-badge">
            <CircleAlert className="w-2.5 h-2.5" /> Dispute
          </span>
        )}
        {item.collection_blocker && (
          <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" /> Blocker
          </span>
        )}
        {item.final_amount && (
          <span className="text-[9px] text-slate-500 font-semibold ml-auto flex items-center gap-0.5">
            <IndianRupee className="w-2.5 h-2.5" />{formatCurrency(item.final_amount)}
          </span>
        )}
      </div>
    </button>
  );
}
