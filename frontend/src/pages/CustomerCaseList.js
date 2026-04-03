import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import BottomTabBar from '@/components/BottomTabBar';
import {
  ArrowLeft, Briefcase, MapPin, Calendar, Users, ChevronRight,
  Clock, Sparkles, Search, MessageCircle,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };
const display = { fontFamily: "'Cormorant Garamond', 'DM Sans', serif" };

const STAGE_LABELS = {
  enquiry_received: 'Enquiry Received', requirement_qualified: 'Requirements Confirmed',
  venues_shortlisted: 'Venues Shortlisted', quote_requested: 'Quote Requested',
  quote_received: 'Quote Received', site_visit_planned: 'Visit Planned',
  site_visit_completed: 'Visit Done', negotiation_in_progress: 'Negotiating',
  commercial_accepted: 'Deal Accepted', booking_confirmation_pending: 'Booking Pending',
  booking_confirmed: 'Confirmed',
};

function timeAgo(d) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  return dy < 7 ? `${dy}d ago` : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function CustomerCaseList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    try {
      const res = await api.get('/case-portal/my-cases');
      setCases(res.data?.cases || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // If only 1 case, go directly to it
  useEffect(() => {
    if (!loading && cases.length === 1) {
      navigate(`/my-cases/${cases[0].lead_id}`, { replace: true });
    }
  }, [loading, cases, navigate]);

  const activeCases = cases.filter(c => c.stage !== 'lost' && c.stage !== 'closed_not_proceeding');
  const pastCases = cases.filter(c => c.stage === 'lost' || c.stage === 'closed_not_proceeding');

  return (
    <div className="min-h-[100dvh] bg-[#F8F7F4] flex flex-col" style={sans}>
      {/* Header */}
      <div className="bg-[#F8F7F4]/95 backdrop-blur-md sticky top-0 z-50 border-b border-black/[0.05]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} data-testid="case-list-header">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/home')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/[0.04] active:bg-black/[0.08] transition-colors"
            data-testid="case-list-back-btn">
            <ArrowLeft className="w-[18px] h-[18px] text-[#0B0B0D]" />
          </button>
          <h1 className="text-[16px] font-semibold text-[#0B0B0D] flex-1" data-testid="case-list-title">My Cases</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6" data-testid="no-cases-empty">
            <div className="w-16 h-16 rounded-2xl bg-[#D4B36A]/10 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-[#D4B36A]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#0B0B0D] mb-1 text-center">No cases yet</h3>
            <p className="text-[13px] text-black/40 text-center max-w-[260px] mb-5 leading-relaxed">
              Start by exploring venues and requesting a concierge to manage your booking.
            </p>
            <button onClick={() => navigate('/venues/search')}
              className="h-11 px-6 bg-[#0B0B0D] text-[#F4F1EC] text-[12px] font-semibold rounded-full inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
              data-testid="explore-cta">
              <Search className="w-4 h-4" /> Explore Venues
            </button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-6">
            {/* Active cases */}
            {activeCases.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[#D4B36A] uppercase tracking-[0.12em] mb-3">Active</p>
                <div className="space-y-3">
                  {activeCases.map(c => (
                    <CaseCard key={c.lead_id} caseItem={c} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}
            {/* Past cases */}
            {pastCases.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-black/25 uppercase tracking-[0.12em] mb-3">Past</p>
                <div className="space-y-2">
                  {pastCases.map(c => (
                    <CaseCard key={c.lead_id} caseItem={c} navigate={navigate} muted />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}

function CaseCard({ caseItem: c, navigate, muted = false }) {
  return (
    <button
      onClick={() => navigate(`/my-cases/${c.lead_id}`)}
      className={`w-full text-left bg-white rounded-2xl border border-black/[0.05] p-5 active:scale-[0.99] transition-transform group ${muted ? 'opacity-50' : ''}`}
      data-testid={`case-card-${c.lead_id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#0B0B0D] truncate" style={display}>
            {c.event_type || 'Venue Enquiry'}
          </h3>
          <p className="text-[11px] text-black/35 mt-0.5">
            {STAGE_LABELS[c.stage] || c.stage_label || c.stage}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-black/15 group-hover:text-[#D4B36A] transition-colors flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-black/35 mb-3 flex-wrap">
        {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
        {c.guest_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.guest_count} guests</span>}
        {c.updated_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(c.updated_at)}</span>}
      </div>

      {/* RM info */}
      {c.rm_name && (
        <div className="flex items-center gap-2 pt-3 border-t border-black/[0.04]">
          <div className="w-7 h-7 rounded-full bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] text-[10px] font-bold flex-shrink-0">
            {c.rm_name.charAt(0)}
          </div>
          <p className="text-[11px] font-medium text-black/50 truncate">{c.rm_name} · Your RM</p>
          {(c.unread_messages || 0) > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-[#D4B36A]">
              <MessageCircle className="w-3 h-3" /> {c.unread_messages}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
