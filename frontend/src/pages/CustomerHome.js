import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import {
  ArrowRight, MessageCircle, CreditCard, FileText,
  MapPin, Users, ChevronRight, Search, Sparkles, Phone,
} from 'lucide-react';

const serif = { fontFamily: "'Cormorant Garamond', serif" };
const sans = { fontFamily: "'DM Sans', sans-serif" };

const STAGE_LABELS = {
  new: 'Enquiry Received',
  enquiry_received: 'Enquiry Received',
  requirement_qualified: 'Requirements Confirmed',
  venues_shortlisted: 'Venues Shortlisted',
  quote_requested: 'Quote Requested',
  quote_received: 'Quote Received',
  site_visit_planned: 'Site Visit Planned',
  site_visit_completed: 'Visit Completed',
  negotiation_in_progress: 'Negotiation',
  commercial_accepted: 'Deal Accepted',
  booking_confirmation_pending: 'Booking Pending',
  booking_confirmed: 'Confirmed',
};

const STAGES = [
  'new', 'enquiry_received', 'requirement_qualified', 'venues_shortlisted',
  'quote_requested', 'quote_received', 'site_visit_planned',
  'site_visit_completed', 'negotiation_in_progress', 'commercial_accepted',
  'booking_confirmation_pending', 'booking_confirmed',
];

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

export default function CustomerHome() {
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

  const activeCase = cases.find(c => c.stage !== 'lost' && c.stage !== 'closed_not_proceeding') || cases[0];
  const unread = activeCase?.unread_messages || 0;
  const firstName = user?.name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F6F4F0] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#C4A76C]/30 border-t-[#C4A76C] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F6F4F0] relative" style={sans} data-testid="customer-home">

      {/* ═══ Top bar — warm light product header ═══ */}
      <div
        className="sticky top-0 z-40 bg-[#F6F4F0]/95 backdrop-blur-lg border-b border-[#1A1A1A]/[0.06]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 4px)' }}
      >
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-1.5" data-testid="home-brand-logo">
            <span className="text-[18px] font-semibold text-[#1A1A1A] tracking-[0.03em]" style={serif}>
              Venu<span className="text-[#C4A76C]">Lo</span>Q
            </span>
          </div>
          <button onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#F6F4F0] text-[11px] font-bold"
            data-testid="home-profile-btn">
            {firstName.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div
        className="overflow-y-auto relative z-10"
        style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}
      >
        {/* Greeting */}
        <div className="px-6 pt-5 pb-1">
          <h1 className="text-[26px] font-light text-[#1A1A1A] leading-[1.15] tracking-tight" style={serif} data-testid="home-greeting">
            Welcome back, {firstName}
          </h1>
        </div>

        {activeCase ? (
          <div className="px-6 pt-3 space-y-3.5">
            {/* ═══ Active Case Card — clean white with gold accent bar ═══ */}
            <button
              onClick={() => navigate(`/my-cases/${activeCase.lead_id}`)}
              className="w-full text-left bg-white rounded-[18px] p-5 relative overflow-hidden group active:scale-[0.99] transition-transform border border-[#1A1A1A]/[0.06] shadow-[0_2px_12px_rgba(11,11,13,0.04)]"
              data-testid="active-case-hero"
            >
              {/* Left gold accent bar */}
              <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#C4A76C]" />

              <div className="pl-3">
                {/* Top: Event info */}
                <div className="mb-4">
                  <p className="text-[9px] font-bold text-[#C4A76C] uppercase tracking-[0.18em] mb-1.5">Active Booking</p>
                  <h2 className="text-[22px] font-light text-[#1A1A1A] leading-tight tracking-tight" style={serif}>
                    {(activeCase.event_type || 'Your Event').replace(/\b\w/g, c => c.toUpperCase())}
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-[#1A1A1A]/45 mt-1.5">
                    {activeCase.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activeCase.city}</span>}
                    {activeCase.guest_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activeCase.guest_count} guests</span>}
                  </div>
                </div>

                {/* Stage progress */}
                <div className="mb-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-[#1A1A1A]/50">
                      {STAGE_LABELS[activeCase.stage] || activeCase.stage_label || activeCase.stage}
                    </span>
                  </div>
                  <div className="flex gap-[3px]">
                    {STAGES.map((s, i) => (
                      <div key={s} className={`h-[2px] flex-1 rounded-full ${
                        i <= STAGES.indexOf(activeCase.stage) ? 'bg-[#C4A76C]' : 'bg-[#1A1A1A]/[0.08]'
                      }`} />
                    ))}
                  </div>
                </div>

                {/* RM row */}
                {activeCase.rm_name && (
                  <div className="flex items-center gap-2.5 pt-3 border-t border-[#1A1A1A]/[0.05]">
                    <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#F6F4F0] text-[9px] font-bold flex-shrink-0">
                      {activeCase.rm_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[#1A1A1A]/80 truncate">{activeCase.rm_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-[#1A1A1A]/40">
                      <span>View case</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            </button>

            {/* ═══ Quick actions — equal-width pill row ═══ */}
            <div className="flex gap-2.5">
              <ActionPill icon={MessageCircle} label="Messages" badge={unread}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=messages`)}
                testId="action-messages" />
              <ActionPill icon={CreditCard} label="Payments"
                badge={activeCase.payment_pending_count}
                urgent={activeCase.payment_pending_count > 0}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=payments`)}
                testId="action-payments" />
              <ActionPill icon={FileText} label="Shared"
                badge={activeCase.pending_count}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=shared`)}
                testId="action-shared" />
            </div>

            {/* ═══ Latest RM update ═══ */}
            {activeCase.latest_share && (
              <button
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=shared`)}
                className="w-full text-left bg-white rounded-[16px] border border-[#1A1A1A]/[0.06] p-4 shadow-[0_2px_8px_rgba(11,11,13,0.03)] active:scale-[0.99] transition-transform group"
                data-testid="latest-share-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-[#C4A76C]" />
                  <span className="text-[9px] font-bold text-[#C4A76C] uppercase tracking-[0.15em]">From your concierge</span>
                  <span className="text-[9px] text-[#1A1A1A]/35 ml-auto">{timeAgo(activeCase.latest_share.created_at)}</span>
                </div>
                <p className="text-[13px] font-medium text-[#1A1A1A] line-clamp-1">{activeCase.latest_share.title}</p>
              </button>
            )}

            {/* ═══ Explore venues — clean structured CTA ═══ */}
            <button
              onClick={() => navigate('/venues/search')}
              className="w-full bg-[#1A1A1A] rounded-[18px] p-5 active:scale-[0.99] transition-transform group"
              data-testid="explore-cta"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-[#C4A76C] uppercase tracking-[0.18em] mb-1.5">Discover</p>
                  <p className="text-[20px] font-light text-[#F6F4F0] leading-tight" style={serif}>
                    Explore Venues
                  </p>
                  <p className="text-[10px] text-[#F6F4F0]/45 mt-1">500+ premium spaces across India</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
                  <ArrowRight className="w-4.5 h-4.5 text-[#C4A76C]" />
                </div>
              </div>
            </button>

            {/* ═══ Other cases ═══ */}
            {cases.length > 1 && (
              <div className="pt-1">
                <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-[0.15em] mb-3" style={sans}>Other bookings</p>
                <div className="bg-white rounded-[16px] border border-[#1A1A1A]/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(11,11,13,0.03)]">
                  {cases.filter(c => c.lead_id !== activeCase.lead_id).slice(0, 3).map((c, idx, arr) => (
                    <button key={c.lead_id}
                      onClick={() => navigate(`/my-cases/${c.lead_id}`)}
                      className={`w-full text-left flex items-center gap-3 px-5 py-3.5 active:bg-[#1A1A1A]/[0.02] transition-colors ${
                        idx < arr.length - 1 ? 'border-b border-[#1A1A1A]/[0.04]' : ''
                      }`}
                      data-testid={`other-case-${c.lead_id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{c.event_type || 'Enquiry'}</p>
                        <p className="text-[10px] text-[#1A1A1A]/40 mt-0.5">{STAGE_LABELS[c.stage] || c.stage}{c.city && ` · ${c.city}`}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#1A1A1A]/20 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ═══ Empty state ═══ */
          <div className="flex flex-col items-center justify-center px-8 pt-20">
            <div className="w-16 h-16 rounded-full bg-[#C4A76C]/10 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-[#C4A76C]" />
            </div>
            <h3 className="text-[22px] font-light text-[#1A1A1A] mb-2 text-center" style={serif}>
              Start planning your event
            </h3>
            <p className="text-[12px] text-[#1A1A1A]/45 text-center max-w-[260px] leading-relaxed mb-6">
              Find the perfect venue and get a dedicated concierge to manage every detail.
            </p>
            <button onClick={() => navigate('/venues/search')}
              className="h-12 px-8 bg-[#1A1A1A] text-[#F6F4F0] text-[12px] font-bold rounded-full inline-flex items-center gap-2.5 active:scale-[0.97] transition-transform shadow-[0_4px_16px_rgba(26,26,26,0.15)]"
              data-testid="empty-explore-cta">
              <Search className="w-4 h-4" /> Explore Venues
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Action Pill ── */
function ActionPill({ icon: Icon, label, badge, urgent, onClick, testId }) {
  const hasBadge = badge > 0;
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 h-11 rounded-full border transition-colors active:scale-[0.96] ${
        hasBadge && urgent
          ? 'border-red-400/20 bg-red-50/80 text-red-600'
          : hasBadge
          ? 'border-[#C4A76C]/20 bg-[#C4A76C]/[0.06] text-[#1A1A1A]'
          : 'border-[#1A1A1A]/[0.08] bg-white text-[#1A1A1A]/60'
      } shadow-[0_1px_4px_rgba(11,11,13,0.02)]`}
      data-testid={testId}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[10px] font-semibold">{label}</span>
      {hasBadge && (
        <span className={`text-[8px] font-bold min-w-[16px] h-[16px] flex items-center justify-center px-1 rounded-full ${
          urgent ? 'bg-red-500 text-white' : 'bg-[#C4A76C] text-[#1A1A1A]'
        }`}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  );
}
