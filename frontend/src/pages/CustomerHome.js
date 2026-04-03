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
      <div className="min-h-[100dvh] bg-[#F4F1EC] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#EDE9E1] relative" style={sans} data-testid="customer-home">
      {/* ═══ Premium ambient background — living golden warmth ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1613128517587-08dc18819ebe?crop=entropy&cs=srgb&fm=jpg&w=900&q=40"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.28, filter: 'blur(8px) saturate(0.4) brightness(1.1)' }}
        />
        {/* Warm golden radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(212,179,106,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, rgba(212,179,106,0.08) 0%, transparent 50%)',
        }} />
        {/* Animated shimmer sweep */}
        <div className="absolute inset-0 venuloq-shimmer" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#EDE9E1]/30 via-transparent to-[#EDE9E1]/50" />
      </div>

      {/* Shimmer animation CSS */}
      <style>{`
        .venuloq-shimmer {
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 40%,
            rgba(212,179,106,0.06) 45%,
            rgba(212,179,106,0.12) 50%,
            rgba(212,179,106,0.06) 55%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: venuloqShimmer 6s ease-in-out infinite;
        }
        @keyframes venuloqShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ═══ Top bar — dark premium brand bar ═══ */}
      <div
        className="sticky top-0 z-40 bg-[#0B0B0D]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 4px)' }}
      >
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-1.5" data-testid="home-brand-logo">
            <span className="text-[18px] font-semibold text-[#F4F1EC] tracking-[0.03em]" style={serif}>
              Venu<span className="text-[#D4B36A]">Lo</span>Q
            </span>
          </div>
          <button onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-[#D4B36A]/15 flex items-center justify-center text-[#D4B36A] text-[11px] font-bold border border-[#D4B36A]/20"
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
        <div className="px-6 pt-2 pb-0.5">
          <h1 className="text-[26px] font-light text-[#0B0B0D] leading-[1.15] tracking-tight" style={serif} data-testid="home-greeting">
            Welcome back, {firstName}
          </h1>
        </div>

        {activeCase ? (
          <div className="px-6 pt-2.5 space-y-4">
            {/* ═══ Active Case Hero — dark accent on warm canvas ═══ */}
            <button
              onClick={() => navigate(`/my-cases/${activeCase.lead_id}`)}
              className="w-full text-left bg-[#0B0B0D] rounded-[20px] p-4 relative overflow-hidden group active:scale-[0.99] transition-transform shadow-[0_12px_40px_rgba(11,11,13,0.25)] border border-[#D4B36A]/[0.12]"
              style={{ height: '160px' }}
              data-testid="active-case-hero"
            >
              {/* Subtle gold glow — elevated */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4B36A]/[0.07] rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4B36A]/[0.05] rounded-full blur-[50px]" />

              <div className="relative h-full flex flex-col justify-between">
                {/* Top: Event info */}
                <div>
                  <p className="text-[8px] font-bold text-[#D4B36A] uppercase tracking-[0.2em] mb-1.5">Active Booking</p>
                  <h2 className="text-[22px] font-light text-[#F4F1EC] leading-tight tracking-tight" style={serif}>
                    {(activeCase.event_type || 'Your Event').replace(/\b\w/g, c => c.toUpperCase())}
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-[#F4F1EC]/50 mt-1">
                    {activeCase.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activeCase.city}</span>}
                    {activeCase.guest_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activeCase.guest_count} guests</span>}
                  </div>
                </div>

                {/* Bottom: Stage + RM inline */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-[#F4F1EC]/60">
                      {STAGE_LABELS[activeCase.stage] || activeCase.stage_label || activeCase.stage}
                    </span>
                  </div>
                  <div className="flex gap-[3px] mb-3">
                    {STAGES.map((s, i) => (
                      <div key={s} className={`h-[2px] flex-1 rounded-full ${
                        i <= STAGES.indexOf(activeCase.stage) ? 'bg-[#D4B36A]' : 'bg-[#F4F1EC]/[0.12]'
                      }`} />
                    ))}
                  </div>
                  {activeCase.rm_name && (
                    <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#F4F1EC]/[0.06]">
                      <div className="w-7 h-7 rounded-full bg-[#D4B36A]/15 flex items-center justify-center text-[#D4B36A] text-[9px] font-bold flex-shrink-0">
                        {activeCase.rm_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-[#F4F1EC]/85 truncate">{activeCase.rm_name}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-[#F4F1EC]/45">
                        <span>View case</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
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
                className="w-full text-left bg-white rounded-[16px] border border-[#0B0B0D]/[0.06] p-5 shadow-[0_4px_20px_rgba(11,11,13,0.04)] active:scale-[0.99] transition-transform group"
                data-testid="latest-share-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-[#D4B36A]" />
                  <span className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-[0.15em]">From your concierge</span>
                  <span className="text-[9px] text-[#0B0B0D]/40 ml-auto">{timeAgo(activeCase.latest_share.created_at)}</span>
                </div>
                <p className="text-[13px] font-medium text-[#0B0B0D] line-clamp-1">{activeCase.latest_share.title}</p>
              </button>
            )}

            {/* ═══ Explore venues banner — image-backed premium CTA ═══ */}
            <button
              onClick={() => navigate('/venues/search')}
              className="w-full relative rounded-[20px] overflow-hidden group active:scale-[0.99] transition-transform shadow-[0_8px_28px_rgba(11,11,13,0.1)]"
              style={{ height: '160px' }}
              data-testid="explore-cta"
            >
              <img
                src="https://images.unsplash.com/photo-1760888563092-17d79ae2703b?crop=entropy&cs=srgb&fm=jpg&w=800&q=60"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D]/85 via-[#0B0B0D]/55 to-[#0B0B0D]/20" />
              <div className="relative h-full flex items-end px-6 pb-5">
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-[#D4B36A] uppercase tracking-[0.2em] mb-1.5" style={sans}>Discover</p>
                  <p className="text-[22px] font-light text-[#F4F1EC] leading-tight" style={serif}>
                    Explore Venues
                  </p>
                  <p className="text-[10px] text-[#F4F1EC]/55 mt-1.5">Premium spaces for your event</p>
                </div>
                <div className="w-11 h-11 rounded-full bg-[#D4B36A]/20 flex items-center justify-center group-hover:bg-[#D4B36A]/30 transition-colors backdrop-blur-sm border border-[#D4B36A]/15 mb-1">
                  <ArrowRight className="w-5 h-5 text-[#D4B36A]" />
                </div>
              </div>
            </button>

            {/* ═══ Other cases ═══ */}
            {cases.length > 1 && (
              <div className="pt-2">
                <p className="text-[9px] font-bold text-[#0B0B0D]/45 uppercase tracking-[0.15em] mb-3.5" style={sans}>Other bookings</p>
                <div className="bg-white rounded-[16px] border border-[#0B0B0D]/[0.06] overflow-hidden shadow-[0_2px_12px_rgba(11,11,13,0.03)]">
                  {cases.filter(c => c.lead_id !== activeCase.lead_id).slice(0, 3).map((c, idx, arr) => (
                    <button key={c.lead_id}
                      onClick={() => navigate(`/my-cases/${c.lead_id}`)}
                      className={`w-full text-left flex items-center gap-3 px-5 py-4 active:bg-[#0B0B0D]/[0.02] transition-colors ${
                        idx < arr.length - 1 ? 'border-b border-[#0B0B0D]/[0.04]' : ''
                      }`}
                      data-testid={`other-case-${c.lead_id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0B0B0D] truncate">{c.event_type || 'Enquiry'}</p>
                        <p className="text-[10px] text-[#0B0B0D]/45 mt-0.5">{STAGE_LABELS[c.stage] || c.stage}{c.city && ` · ${c.city}`}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#0B0B0D]/25 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ═══ Empty state ═══ */
          <div className="flex flex-col items-center justify-center px-8 pt-20">
            <div className="w-16 h-16 rounded-full bg-[#D4B36A]/10 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-[#D4B36A]" />
            </div>
            <h3 className="text-[22px] font-light text-[#0B0B0D] mb-2 text-center" style={serif}>
              Start planning your event
            </h3>
            <p className="text-[12px] text-[#0B0B0D]/50 text-center max-w-[260px] leading-relaxed mb-6">
              Find the perfect venue and get a dedicated concierge to manage every detail.
            </p>
            <button onClick={() => navigate('/venues/search')}
              className="h-12 px-8 bg-[#0B0B0D] text-[#F4F1EC] text-[12px] font-bold rounded-full inline-flex items-center gap-2.5 active:scale-[0.97] transition-transform shadow-[0_4px_16px_rgba(11,11,13,0.2)]"
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
          ? 'border-[#D4B36A]/20 bg-[#D4B36A]/[0.06] text-[#0B0B0D]'
          : 'border-[#0B0B0D]/[0.08] bg-white text-[#0B0B0D]/70'
      } shadow-[0_2px_8px_rgba(11,11,13,0.03)]`}
      data-testid={testId}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[10px] font-semibold">{label}</span>
      {hasBadge && (
        <span className={`text-[8px] font-bold min-w-[16px] h-[16px] flex items-center justify-center px-1 rounded-full ${
          urgent ? 'bg-red-500 text-white' : 'bg-[#D4B36A] text-[#0B0B0D]'
        }`}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  );
}
