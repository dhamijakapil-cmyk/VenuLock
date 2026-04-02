import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import BottomTabBar from '@/components/BottomTabBar';
import { cn } from '@/lib/utils';
import {
  Briefcase, MapPin, Calendar, Users, ChevronRight, Clock,
  FileText, Bell, RefreshCw, Inbox,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STAGE_COLORS = {
  enquiry_received: 'bg-slate-100 text-slate-600',
  requirement_qualified: 'bg-sky-50 text-sky-700',
  venues_shortlisted: 'bg-indigo-50 text-indigo-700',
  quote_requested: 'bg-amber-50 text-amber-700',
  quote_received: 'bg-emerald-50 text-emerald-700',
  site_visit_planned: 'bg-purple-50 text-purple-700',
  site_visit_completed: 'bg-purple-100 text-purple-800',
  negotiation_in_progress: 'bg-orange-50 text-orange-700',
  commercial_accepted: 'bg-teal-50 text-teal-700',
  booking_confirmation_pending: 'bg-blue-50 text-blue-700',
  booking_confirmed: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-50 text-red-600',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function CustomerCaseList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/case-portal/my-cases');
      setCases(res.data?.cases || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col" style={sans}>
      <Header />

      {/* Hero Header — safe-area aware */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-6 pb-8 safe-top">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold text-[#D4B36A] uppercase tracking-widest mb-1">My Cases</p>
          <h1 className="text-[22px] sm:text-[28px] font-bold leading-tight" data-testid="my-cases-title">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[13px] text-white/50 mt-1">
            Track your venue bookings and respond to proposals.
          </p>
        </div>
      </div>

      {/* Content — bottom padding for BottomTabBar */}
      <div className="flex-1 px-4 py-5 -mt-3 has-bottom-bar">
        <div className="max-w-2xl mx-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-[13px] text-red-500 mb-3">{error}</p>
              <button onClick={fetchCases} className="text-[12px] text-[#D4B36A] font-semibold flex items-center gap-1 mx-auto"
                data-testid="retry-btn">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-16" data-testid="no-cases">
              <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-[15px] font-bold text-slate-600 mb-1">No active cases</h3>
              <p className="text-[12px] text-slate-400">
                When you submit a venue enquiry, your cases will appear here.
              </p>
              <button onClick={() => navigate('/venues/search')}
                className="mt-4 h-10 px-6 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-lg"
                data-testid="explore-venues-btn">
                Explore Venues
              </button>
            </div>
          ) : (
            cases.map(c => (
              <CaseCard key={c.lead_id} caseData={c} onClick={() => navigate(`/my-cases/${c.lead_id}`)} />
            ))
          )}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}

function CaseCard({ caseData, onClick }) {
  const stage = caseData.stage || 'enquiry_received';
  const stageColor = STAGE_COLORS[stage] || 'bg-slate-100 text-slate-600';
  const pendingActions = caseData.pending_actions || 0;

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-black/[0.05] p-4 hover:border-[#D4B36A]/30 transition-all active:scale-[0.99] group"
      data-testid={`case-card-${caseData.lead_id}`}>
      {/* Top row: Event type + Stage badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate">
            {caseData.event_type || 'Venue Enquiry'}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
            {caseData.city && (
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{caseData.city}</span>
            )}
            {caseData.event_date && (
              <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(caseData.event_date)}</span>
            )}
            {caseData.guest_count && (
              <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{caseData.guest_count}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#D4B36A] transition-colors flex-shrink-0 mt-1" />
      </div>

      {/* Stage + RM */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full", stageColor)}
          data-testid={`case-stage-${caseData.lead_id}`}>
          {caseData.stage_label || stage}
        </span>
        {caseData.rm_name && (
          <span className="text-[10px] text-slate-400">RM: {caseData.rm_name}</span>
        )}
      </div>

      {/* Bottom row: Latest activity + Pending badge */}
      <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 min-w-0 flex-1">
          {caseData.latest_share ? (
            <>
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{caseData.latest_share.title}</span>
              <span className="flex-shrink-0">&middot; {timeAgo(caseData.latest_share.created_at)}</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{caseData.updated_at ? `Updated ${timeAgo(caseData.updated_at)}` : 'No updates yet'}</span>
            </>
          )}
        </div>
        {pendingActions > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
            data-testid={`pending-badge-${caseData.lead_id}`}>
            <Bell className="w-3 h-3" />
            {pendingActions} pending
          </span>
        )}
      </div>
    </button>
  );
}
