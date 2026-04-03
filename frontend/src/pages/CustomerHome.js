import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import {
  ArrowRight, MessageCircle, CreditCard, FileText,
  MapPin, Users, ChevronRight, Search, Sparkles,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };
const display = { fontFamily: "'Cormorant Garamond', 'DM Sans', serif" };

const STAGE_LABELS = {
  enquiry_received: 'Enquiry Received',
  requirement_qualified: 'Requirements Confirmed',
  venues_shortlisted: 'Venues Shortlisted',
  quote_requested: 'Quote Requested',
  quote_received: 'Quote Received',
  site_visit_planned: 'Site Visit Planned',
  site_visit_completed: 'Visit Completed',
  negotiation_in_progress: 'Negotiation In Progress',
  commercial_accepted: 'Deal Accepted',
  booking_confirmation_pending: 'Booking Pending',
  booking_confirmed: 'Booking Confirmed',
};

const STAGE_ORDER = [
  'enquiry_received', 'requirement_qualified', 'venues_shortlisted',
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

function stageProgress(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? Math.round(((idx + 1) / STAGE_ORDER.length) * 100) : 5;
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
      <div className="min-h-[100dvh] bg-[#0B0B0D] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] flex flex-col" style={sans} data-testid="customer-home">
      {/* Top bar — minimal, blends with dark bg */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)' }}>
        <div>
          <p className="text-[10px] font-semibold text-[#D4B36A]/60 uppercase tracking-[0.15em]">VenuLoQ</p>
          <p className="text-[18px] font-light text-white/90 mt-0.5" style={display} data-testid="home-greeting">
            Hello, {firstName}
          </p>
        </div>
        {user && (
          <button onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50 text-[12px] font-bold"
            data-testid="home-profile-btn">
            {firstName.charAt(0)}
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeCase ? (
          <>
            {/* ═══ Active Case Card ═══ */}
            <div className="px-5 pt-4 pb-3">
              <button
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}`)}
                className="w-full text-left group active:scale-[0.99] transition-transform"
                data-testid="active-case-hero"
              >
                {/* Stage + progress */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold text-[#D4B36A] uppercase tracking-[0.12em]">
                    {STAGE_LABELS[activeCase.stage] || activeCase.stage_label || 'Active Case'}
                  </span>
                  <span className="text-[10px] text-white/20">{stageProgress(activeCase.stage)}%</span>
                </div>
                <div className="flex gap-[2px] mb-5">
                  {STAGE_ORDER.map((s, i) => (
                    <div key={s} className={`h-[2px] flex-1 rounded-full ${
                      i <= STAGE_ORDER.indexOf(activeCase.stage) ? 'bg-[#D4B36A]' : 'bg-white/[0.06]'
                    }`} />
                  ))}
                </div>

                {/* Event title */}
                <h2 className="text-[26px] font-light text-white leading-tight mb-1" style={display}>
                  {activeCase.event_type || 'Your Event'}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-white/25 mt-1">
                  {activeCase.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activeCase.city}</span>}
                  {activeCase.guest_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activeCase.guest_count} guests</span>}
                </div>

                {/* RM row */}
                {activeCase.rm_name && (
                  <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-white/[0.05]">
                    <div className="w-9 h-9 rounded-full bg-[#D4B36A]/15 flex items-center justify-center text-[#D4B36A] text-[11px] font-bold flex-shrink-0">
                      {activeCase.rm_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white/70 truncate">{activeCase.rm_name}</p>
                      <p className="text-[10px] text-white/25">Your Relationship Manager</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-[#D4B36A] transition-colors" />
                  </div>
                )}
              </button>
            </div>

            {/* ═══ Action row — minimal, not boxed ═══ */}
            <div className="px-5 py-4 flex gap-2.5">
              <ActionPill icon={MessageCircle} label="Messages" badge={unread}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=messages`)}
                testId="action-messages" />
              <ActionPill icon={CreditCard} label="Payments"
                badge={activeCase.payment_pending_count}
                variant="urgent"
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=payments`)}
                testId="action-payments" />
              <ActionPill icon={FileText} label="Shared"
                badge={activeCase.pending_count}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=shared`)}
                testId="action-shared" />
            </div>

            {/* ═══ Latest share preview ═══ */}
            {activeCase.latest_share && (
              <div className="px-5 pb-4">
                <button
                  onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=shared`)}
                  className="w-full text-left py-3.5 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.05] active:bg-white/[0.06] transition-colors"
                  data-testid="latest-share-card"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-[#D4B36A]/60" />
                    <span className="text-[9px] font-bold text-[#D4B36A]/50 uppercase tracking-[0.1em]">From your RM</span>
                    <span className="text-[9px] text-white/15 ml-auto">{timeAgo(activeCase.latest_share.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-white/60 line-clamp-1">{activeCase.latest_share.title}</p>
                </button>
              </div>
            )}

            {/* ═══ Secondary section — stays dark ═══ */}
            <div className="px-5 pt-6">
              {/* Explore CTA */}
              <button onClick={() => navigate('/venues/search')}
                className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] group active:scale-[0.99] transition-transform mb-4"
                data-testid="explore-cta">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Search className="w-4 h-4 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white/70">Explore venues</p>
                  <p className="text-[10px] text-white/25">Find and compare more options</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/15 group-hover:text-[#D4B36A] transition-colors" />
              </button>

              {/* Other cases if multiple */}
              {cases.length > 1 && (
                <div className="pb-4">
                  <p className="text-[9px] font-bold text-white/15 uppercase tracking-[0.12em] mb-2">Other cases</p>
                  {cases.filter(c => c.lead_id !== activeCase.lead_id).slice(0, 3).map(c => (
                    <button key={c.lead_id}
                      onClick={() => navigate(`/my-cases/${c.lead_id}`)}
                      className="w-full text-left flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0 active:bg-white/[0.02]"
                      data-testid={`other-case-${c.lead_id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-white/50 truncate">{c.event_type || 'Enquiry'}</p>
                        <p className="text-[10px] text-white/20">{STAGE_LABELS[c.stage] || c.stage}{c.city && ` · ${c.city}`}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/10" />
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom spacer for tab bar */}
              <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }} />
            </div>
          </>
        ) : (
          /* ═══ No active case — empty state ═══ */
          <div className="flex flex-col items-center justify-center px-8 pt-16">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-[#D4B36A]/50" />
            </div>
            <h3 className="text-[18px] font-light text-white/80 mb-2 text-center" style={display}>
              Start planning your event
            </h3>
            <p className="text-[12px] text-white/25 text-center max-w-[260px] leading-relaxed mb-6">
              Find the perfect venue and get a dedicated concierge to manage every detail.
            </p>
            <button onClick={() => navigate('/venues/search')}
              className="h-11 px-7 bg-[#D4B36A] text-[#0B0B0D] text-[12px] font-bold rounded-full inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
              data-testid="empty-explore-cta">
              <Search className="w-4 h-4" /> Explore Venues
            </button>
            <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionPill({ icon: Icon, label, badge, variant, onClick, testId }) {
  const hasBadge = badge > 0;
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full transition-colors active:scale-[0.96] ${
        hasBadge && variant === 'urgent'
          ? 'bg-red-500/10 text-red-400 border border-red-500/10'
          : hasBadge
          ? 'bg-[#D4B36A]/10 text-[#D4B36A] border border-[#D4B36A]/10'
          : 'bg-white/[0.04] text-white/40 border border-white/[0.04]'
      }`}
      data-testid={testId}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[10px] font-semibold">{label}</span>
      {hasBadge && (
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
          variant === 'urgent' ? 'bg-red-500 text-white' : 'bg-[#D4B36A] text-[#0B0B0D]'
        }`}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  );
}
