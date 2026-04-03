import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import BottomTabBar from '@/components/BottomTabBar';
import {
  ArrowRight, MessageCircle, CreditCard, FileText, Clock,
  MapPin, Calendar, Users, ChevronRight, Bell, Search,
  Briefcase, Star, Sparkles,
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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
  const pendingPayments = activeCase?.payment_pending_count || 0;
  const pendingActions = activeCase?.pending_actions || 0;
  const unreadMessages = activeCase?.unread_messages || 0;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col" style={sans} data-testid="customer-home">
      <Header />

      <div className="flex-1 overflow-y-auto has-bottom-bar">
        {/* Greeting */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-[11px] font-semibold text-[#D4B36A] uppercase tracking-[0.15em] mb-1">Welcome back</p>
          <h1 className="text-[28px] font-light text-[#0B0B0D] leading-tight" style={display} data-testid="home-greeting">
            Hello, {firstName}
          </h1>
        </div>

        {/* Active Case Hero */}
        {loading ? (
          <div className="px-5 py-8">
            <div className="bg-[#0B0B0D] rounded-3xl h-48 animate-pulse" />
          </div>
        ) : activeCase ? (
          <div className="px-5 pt-4 pb-2">
            <button
              onClick={() => navigate(`/my-cases/${activeCase.lead_id}`)}
              className="w-full text-left bg-[#0B0B0D] rounded-3xl p-6 relative overflow-hidden group active:scale-[0.99] transition-transform"
              data-testid="active-case-hero"
            >
              {/* Subtle gold gradient accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4B36A]/[0.06] rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-[#D4B36A] uppercase tracking-[0.15em]">Active Case</span>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#D4B36A] transition-colors" />
                </div>
                <h2 className="text-[20px] font-normal text-[#F4F1EC] leading-tight mb-1" style={display}>
                  {activeCase.event_type || 'Your Venue Booking'}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-white/40 mb-5">
                  {activeCase.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activeCase.city}</span>}
                  {activeCase.guest_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activeCase.guest_count} guests</span>}
                </div>

                {/* Stage progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-white/60">
                      {STAGE_LABELS[activeCase.stage] || activeCase.stage_label || activeCase.stage}
                    </span>
                    <span className="text-[10px] text-white/30">{activeCase.updated_at ? timeAgo(activeCase.updated_at) : ''}</span>
                  </div>
                  <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4B36A] rounded-full transition-all duration-700"
                      style={{ width: `${getStageProgress(activeCase.stage)}%` }} />
                  </div>
                </div>

                {/* RM info */}
                {activeCase.rm_name && (
                  <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
                    <div className="w-8 h-8 rounded-full bg-[#D4B36A]/20 flex items-center justify-center text-[#D4B36A] text-[11px] font-bold flex-shrink-0">
                      {activeCase.rm_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white/80 truncate">{activeCase.rm_name}</p>
                      <p className="text-[10px] text-white/30">Your Relationship Manager</p>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>
        ) : (
          /* No active case — explore CTA */
          <div className="px-5 pt-4 pb-2">
            <div className="bg-white rounded-3xl border border-black/[0.05] p-6 text-center" data-testid="no-case-prompt">
              <div className="w-14 h-14 rounded-2xl bg-[#D4B36A]/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-[#D4B36A]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#0B0B0D] mb-1" style={sans}>Start planning your event</h3>
              <p className="text-[13px] text-black/40 mb-4 max-w-[260px] mx-auto leading-relaxed">
                Find the perfect venue and get a dedicated relationship manager.
              </p>
              <button onClick={() => navigate('/venues/search')}
                className="h-11 px-6 bg-[#0B0B0D] text-[#F4F1EC] text-[12px] font-semibold rounded-full inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
                data-testid="explore-venues-cta">
                <Search className="w-4 h-4" /> Explore Venues
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions — horizontal scroll */}
        {activeCase && (
          <div className="px-5 py-4">
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-1 px-1">
              <QuickAction
                icon={MessageCircle}
                label="Messages"
                badge={unreadMessages}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=messages`)}
                testId="quick-messages"
              />
              <QuickAction
                icon={CreditCard}
                label="Payments"
                badge={pendingPayments}
                variant="warning"
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=payments`)}
                testId="quick-payments"
              />
              <QuickAction
                icon={FileText}
                label="Proposals"
                badge={pendingActions}
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=shared`)}
                testId="quick-proposals"
              />
              <QuickAction
                icon={Clock}
                label="Timeline"
                onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=timeline`)}
                testId="quick-timeline"
              />
            </div>
          </div>
        )}

        {/* Latest RM Message preview */}
        {activeCase?.latest_share && (
          <div className="px-5 pb-3">
            <button
              onClick={() => navigate(`/my-cases/${activeCase.lead_id}?tab=shared`)}
              className="w-full bg-white rounded-2xl border border-black/[0.05] p-4 text-left group active:scale-[0.99] transition-transform"
              data-testid="latest-share-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-[#D4B36A]" />
                <span className="text-[10px] font-bold text-[#D4B36A] uppercase tracking-[0.1em]">Latest from your RM</span>
              </div>
              <p className="text-[13px] font-medium text-[#0B0B0D] mb-1 line-clamp-1">{activeCase.latest_share.title}</p>
              <p className="text-[11px] text-black/40">{timeAgo(activeCase.latest_share.created_at)}</p>
            </button>
          </div>
        )}

        {/* Multiple cases — show secondary */}
        {cases.length > 1 && (
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-black/40 uppercase tracking-[0.1em]">All Cases</p>
              <Link to="/my-cases" className="text-[11px] font-semibold text-[#D4B36A] flex items-center gap-0.5" data-testid="view-all-cases">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {cases.slice(0, 3).map(c => (
              <button key={c.lead_id}
                onClick={() => navigate(`/my-cases/${c.lead_id}`)}
                className="w-full text-left flex items-center gap-3 py-3 border-b border-black/[0.04] last:border-0 active:bg-black/[0.02] transition-colors"
                data-testid={`case-row-${c.lead_id}`}>
                <div className="w-9 h-9 rounded-xl bg-[#0B0B0D]/[0.04] flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-black/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#0B0B0D] truncate">{c.event_type || 'Venue Enquiry'}</p>
                  <p className="text-[10px] text-black/35">{c.stage_label || c.stage} {c.city && `· ${c.city}`}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-black/20 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Explore venues CTA (always show when has case) */}
        {activeCase && (
          <div className="px-5 pb-8 pt-2">
            <button onClick={() => navigate('/venues/search')}
              className="w-full bg-white rounded-2xl border border-black/[0.05] p-4 flex items-center gap-3 group active:scale-[0.99] transition-transform"
              data-testid="explore-more-cta">
              <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] flex items-center justify-center flex-shrink-0">
                <Search className="w-4.5 h-4.5 text-black/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#0B0B0D]">Explore more venues</p>
                <p className="text-[10px] text-black/35">Find and compare venues for your event</p>
              </div>
              <ArrowRight className="w-4 h-4 text-black/20 group-hover:text-[#D4B36A] transition-colors flex-shrink-0" />
            </button>
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}

function QuickAction({ icon: Icon, label, badge, variant, onClick, testId }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[72px] py-3 px-3 bg-white rounded-2xl border border-black/[0.05] active:scale-[0.96] transition-transform flex-shrink-0"
      data-testid={testId}>
      <div className="relative">
        <Icon className="w-5 h-5 text-[#0B0B0D]/60" />
        {badge > 0 && (
          <span className={`absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[4px] flex items-center justify-center rounded-full text-[8px] font-bold ${
            variant === 'warning' ? 'bg-red-500 text-white' : 'bg-[#D4B36A] text-[#0B0B0D]'
          }`}>{badge > 9 ? '9+' : badge}</span>
        )}
      </div>
      <span className="text-[10px] font-medium text-black/50">{label}</span>
    </button>
  );
}

function getStageProgress(stage) {
  const stages = [
    'enquiry_received', 'requirement_qualified', 'venues_shortlisted',
    'quote_requested', 'quote_received', 'site_visit_planned',
    'site_visit_completed', 'negotiation_in_progress', 'commercial_accepted',
    'booking_confirmation_pending', 'booking_confirmed',
  ];
  const idx = stages.indexOf(stage);
  if (idx < 0) return 5;
  return Math.round(((idx + 1) / stages.length) * 100);
}
