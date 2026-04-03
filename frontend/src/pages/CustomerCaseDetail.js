import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Calendar, Users, Clock, FileText,
  CheckCircle2, MessageCircle, Phone, ChevronDown, ChevronUp,
  Download, Eye, Send, PhoneCall, HelpCircle, ThumbsUp,
  ThumbsDown, RotateCcw, X, Briefcase, Star, ExternalLink,
  CreditCard, Receipt, ShieldCheck, AlertCircle, Wallet,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const sans = { fontFamily: "'DM Sans', sans-serif" };
const display = { fontFamily: "'Cormorant Garamond', 'DM Sans', serif" };

/* ────── utilities ────── */
const STAGE_ORDER = [
  'enquiry_received', 'requirement_qualified', 'venues_shortlisted',
  'quote_requested', 'quote_received', 'site_visit_planned',
  'site_visit_completed', 'negotiation_in_progress', 'commercial_accepted',
  'booking_confirmation_pending', 'booking_confirmed',
];
const STAGE_LABELS = {
  enquiry_received: 'Enquiry Received', requirement_qualified: 'Requirements Confirmed',
  venues_shortlisted: 'Venues Shortlisted', quote_requested: 'Quote Requested',
  quote_received: 'Quote Received', site_visit_planned: 'Visit Planned',
  site_visit_completed: 'Visit Done', negotiation_in_progress: 'Negotiating',
  commercial_accepted: 'Deal Accepted', booking_confirmation_pending: 'Booking Pending',
  booking_confirmed: 'Confirmed',
};

function getStageIndex(stage) { const i = STAGE_ORDER.indexOf(stage); return i >= 0 ? i : 0; }
function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } }
function timeAgo(d) { if (!d) return ''; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const dy = Math.floor(h / 24); return dy < 7 ? `${dy}d ago` : formatDate(d); }
function timeStr(d) { if (!d) return ''; return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }

const SHARE_TYPE_LABELS = {
  shortlist: 'Venue Shortlist', proposal: 'Proposal', quote: 'Quotation',
  brochure: 'Brochure', menu: 'Menu', photo_gallery: 'Photo Gallery',
  comparison: 'Comparison', visit_details: 'Visit Details', note: 'Update', file: 'Document',
};
const RESPONSE_OPTIONS = [
  { id: 'interested', label: 'Interested', icon: ThumbsUp, color: 'bg-emerald-500' },
  { id: 'request_callback', label: 'Request Callback', icon: PhoneCall, color: 'bg-blue-500' },
  { id: 'request_visit', label: 'Request Visit', icon: MapPin, color: 'bg-purple-500' },
  { id: 'accept_quote', label: 'Accept Quote', icon: CheckCircle2, color: 'bg-emerald-600' },
  { id: 'need_more_options', label: 'More Options', icon: RotateCcw, color: 'bg-amber-500' },
  { id: 'have_question', label: 'Ask Question', icon: HelpCircle, color: 'bg-sky-500' },
  { id: 'maybe', label: 'Maybe Later', icon: Clock, color: 'bg-slate-400' },
  { id: 'not_for_me', label: 'Not for Me', icon: ThumbsDown, color: 'bg-red-400' },
];

/* ════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════ */
export default function CustomerCaseDetail() {
  const { caseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(searchParams.get('tab') || 'overview');
  const [respondModal, setRespondModal] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, unreadRes] = await Promise.all([
        api.get(`/case-portal/cases/${caseId}`),
        api.get(`/case-thread/${caseId}/unread`).catch(() => ({ data: { unread: 0 } })),
      ]);
      setCaseData(caseRes.data);
      setUnreadMessages(unreadRes.data?.unread || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load case');
    } finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveSection(tab);
  }, [searchParams]);
  useEffect(() => {
    if (activeSection === 'messages') setUnreadMessages(0);
  }, [activeSection]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F8F7F4] flex items-center justify-center" style={sans}>
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !caseData) {
    return (
      <div className="min-h-[100dvh] bg-[#F8F7F4] flex flex-col" style={sans}>
        <CaseHeader onBack={() => navigate('/my-cases')} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-red-500 mb-3">{error || 'Case not found'}</p>
            <button onClick={() => navigate('/my-cases')}
              className="h-10 px-5 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-full"
              data-testid="back-to-cases-btn">Back to My Cases</button>
          </div>
        </div>
      </div>
    );
  }

  const stage = caseData.stage || 'enquiry_received';
  const stageIdx = getStageIndex(stage);
  const shares = (caseData.shares || []).filter(s => s.lifecycle !== 'superseded' || s.share_type === 'proposal' || s.share_type === 'quote');
  const currentShares = shares.filter(s => s.is_current_version !== false);
  const supersededShares = shares.filter(s => s.is_current_version === false);

  const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'messages', label: 'Messages', badge: unreadMessages },
    { id: 'shared', label: 'Shared', badge: caseData.pending_count },
    { id: 'payments', label: 'Payments', badge: caseData.payment_pending_count },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#EDE9E1] flex flex-col overflow-x-hidden relative" style={sans}>
      {/* ═══ Premium ambient background ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1613128517587-08dc18819ebe?crop=entropy&cs=srgb&fm=jpg&w=900&q=40"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.28, filter: 'blur(8px) saturate(0.4) brightness(1.1)' }}
        />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(212,179,106,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, rgba(212,179,106,0.08) 0%, transparent 50%)',
        }} />
        <div className="absolute inset-0 venuloq-shimmer" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#EDE9E1]/30 via-transparent to-[#EDE9E1]/50" />
      </div>
      <style>{`
        .venuloq-shimmer {
          background: linear-gradient(105deg, transparent 0%, transparent 40%, rgba(212,179,106,0.06) 45%, rgba(212,179,106,0.12) 50%, rgba(212,179,106,0.06) 55%, transparent 60%, transparent 100%);
          background-size: 200% 100%;
          animation: venuloqShimmer 6s ease-in-out infinite;
        }
        @keyframes venuloqShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      {/* Header */}
      <CaseHeader
        title={(caseData.event_type || 'My Case').replace(/\b\w/g, c => c.toUpperCase())}
        onBack={() => navigate('/home')}
      />

      {/* Stage Progress Bar */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-[#0B0B0D]/[0.06] px-5 py-3.5 relative z-10" data-testid="stage-progress">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-[#0B0B0D]">
            {STAGE_LABELS[stage] || caseData.stage_label || stage}
          </span>
          <span className="text-[10px] text-black/35">{Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100)}%</span>
        </div>
        <div className="flex gap-[3px]">
          {STAGE_ORDER.map((s, i) => (
            <div key={s} className={cn(
              "h-[3px] flex-1 rounded-full transition-colors",
              i <= stageIdx ? 'bg-[#D4B36A] shadow-[0_0_6px_rgba(212,179,106,0.3)]' : 'bg-black/[0.08]'
            )} />
          ))}
        </div>
      </div>

      {/* Section Tabs — premium refined */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-[#0B0B0D]/[0.06] overflow-x-auto hide-scrollbar flex-shrink-0 relative z-10">
        <div className="flex min-w-max px-4 max-w-2xl mx-auto" data-testid="case-sections">
          {SECTIONS.map(sec => (
            <button key={sec.id} onClick={() => setActiveSection(sec.id)}
              className={cn(
                "px-4 py-3 text-[12px] border-b-[2.5px] transition-all whitespace-nowrap relative",
                activeSection === sec.id
                  ? 'border-[#D4B36A] text-[#0B0B0D] font-bold'
                  : 'border-transparent text-[#0B0B0D]/30 font-medium hover:text-[#0B0B0D]/50'
              )} data-testid={`section-${sec.id}`}
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em' }}>
              {sec.label}
              {sec.badge > 0 && (
                <span className="ml-1.5 text-[8px] bg-[#D4B36A] text-[#0B0B0D] w-[16px] h-[16px] inline-flex items-center justify-center rounded-full font-bold">{sec.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="px-5 py-5 max-w-2xl mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
          {activeSection === 'overview' && (
            <OverviewSection caseData={caseData} navigate={navigate} caseId={caseId}
              setActiveSection={setActiveSection} unreadMessages={unreadMessages} />
          )}
          {activeSection === 'messages' && <MessagesSection caseId={caseId} user={user} />}
          {activeSection === 'shared' && (
            <SharedSection shares={currentShares} superseded={supersededShares}
              caseId={caseId} onRefresh={fetchCase} setRespondModal={setRespondModal} />
          )}
          {activeSection === 'payments' && <PaymentsSection caseId={caseId} user={user} />}
          {activeSection === 'timeline' && <TimelineSection timeline={caseData.timeline || []} />}
        </div>
      </div>

      {/* Sticky bottom: Message RM */}
      {activeSection !== 'messages' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="bg-[#EDE9E1]/85 backdrop-blur-2xl border-t border-[#0B0B0D]/[0.06] px-5 py-3.5">
            <button onClick={() => setActiveSection('messages')}
              className="w-full h-11 bg-[#0B0B0D] text-[#F4F1EC] text-[13px] font-semibold rounded-full flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-[0_4px_16px_rgba(11,11,13,0.2)]"
              data-testid="sticky-message-rm-btn">
              <MessageCircle className="w-4 h-4" />
              Message Your RM
              {unreadMessages > 0 && (
                <span className="ml-1 text-[9px] bg-[#D4B36A] text-[#0B0B0D] w-5 h-5 inline-flex items-center justify-center rounded-full font-bold">{unreadMessages}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {respondModal && (
        <RespondModal share={respondModal} caseId={caseId}
          onClose={() => setRespondModal(null)} onRefresh={fetchCase} />
      )}
    </div>
  );
}

/* ── Case Header ── */
function CaseHeader({ title, onBack }) {
  return (
    <div className="bg-[#EDE9E1]/85 backdrop-blur-2xl sticky top-0 z-50 border-b border-black/[0.06] flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      data-testid="case-detail-header">
      <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/[0.04] active:bg-black/[0.08] transition-colors flex-shrink-0"
          data-testid="case-detail-back-btn">
          <ArrowLeft className="w-[18px] h-[18px] text-[#0B0B0D]" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[#D4B36A] uppercase tracking-[0.12em]">My Case</p>
          {title && <h1 className="text-[15px] font-semibold text-[#0B0B0D] truncate" data-testid="case-detail-title">{title}</h1>}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   OVERVIEW SECTION
   ════════════════════════════════════════════════ */
function OverviewSection({ caseData, navigate, caseId, setActiveSection, unreadMessages }) {
  return (
    <div className="space-y-6" data-testid="overview-section">
      {/* ═══ Event Hero Banner — commanding dark card like Home ═══ */}
      <div className="bg-[#0B0B0D] rounded-[20px] p-6 relative overflow-hidden border border-[#D4B36A]/[0.12] shadow-[0_16px_48px_rgba(11,11,13,0.3)]"
        data-testid="event-hero-banner">
        {/* Gold ambient glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#D4B36A]/[0.06] rounded-full blur-[70px]" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-[#D4B36A]/[0.04] rounded-full blur-[50px]" />

        <div className="relative z-10">
          <p className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-[0.2em] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Your Event</p>
          <h2 className="text-[26px] font-light text-[#F4F1EC] leading-tight tracking-tight mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {(caseData.event_type || 'Your Event').replace(/\b\w/g, c => c.toUpperCase())}
          </h2>

          {/* Info pills */}
          <div className="flex items-center gap-3 text-[10px] text-[#F4F1EC]/40 mb-4 flex-wrap">
            {caseData.city && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{caseData.city}</span>
            )}
            {caseData.event_date && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(caseData.event_date)}</span>
            )}
            {caseData.guest_count && (
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{caseData.guest_count} guests</span>
            )}
          </div>

          {/* Status message */}
          {caseData.status_message && (
            <p className="text-[12px] text-[#F4F1EC]/50 leading-relaxed border-t border-[#F4F1EC]/[0.06] pt-3">{caseData.status_message}</p>
          )}
        </div>
      </div>

      {/* RM Card — premium white surface with depth */}
      {caseData.rm_name && (
        <div className="bg-white/95 backdrop-blur-sm rounded-[18px] border border-[#0B0B0D]/[0.05] p-5 shadow-[0_6px_24px_rgba(11,11,13,0.06)]" data-testid="rm-overview-card">
          <p className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-[0.18em] mb-3.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Your Concierge</p>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] text-[15px] font-bold flex-shrink-0 shadow-[0_4px_12px_rgba(11,11,13,0.15)]">
              {caseData.rm_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[#0B0B0D]" data-testid="rm-name">{caseData.rm_name}</p>
              <p className="text-[10px] text-[#0B0B0D]/30 mt-0.5">Relationship Manager</p>
            </div>
            <button onClick={() => setActiveSection('messages')}
              className="w-10 h-10 rounded-full bg-[#0B0B0D]/[0.04] flex items-center justify-center relative hover:bg-[#0B0B0D]/[0.06] transition-colors"
              data-testid="rm-message-btn">
              <MessageCircle className="w-4 h-4 text-[#0B0B0D]/50" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#D4B36A] rounded-full flex items-center justify-center text-[8px] font-bold text-[#0B0B0D]">{unreadMessages}</span>
              )}
            </button>
          </div>
          {caseData.rm_phone && (
            <div className="flex gap-2.5 mt-4 pt-3.5 border-t border-[#0B0B0D]/[0.04]">
              <a href={`tel:${caseData.rm_phone}`} className="flex-1 h-10 bg-[#0B0B0D]/[0.03] rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#0B0B0D]/50 active:bg-[#0B0B0D]/[0.06] transition-colors" data-testid="call-rm-btn">
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
              <a href={`https://wa.me/${caseData.rm_phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 h-10 bg-[#0B0B0D]/[0.03] rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#0B0B0D]/50 active:bg-[#0B0B0D]/[0.06] transition-colors" data-testid="whatsapp-rm-btn">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action cards — premium panels */}
      {/* Removed: Shared/Payments/Messages/Timeline cards are redundant with section tabs above */}

      {/* Need something — concierge assistance */}
      <div className="pt-1">
        <p className="text-[9px] font-bold text-[#0B0B0D]/25 uppercase tracking-[0.15em] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Assistance</p>
        <div className="space-y-2.5">
          {/* Priority action — Request a Callback */}
          <ContactActionBtn action={{ id: 'request_callback', label: 'Request a Callback', sublabel: 'Your RM will call you back', icon: PhoneCall }} caseId={caseId} priority />
          <ContactActionBtn action={{ id: 'request_visit', label: 'Schedule Site Visit', sublabel: 'Visit venues with your RM', icon: MapPin }} caseId={caseId} />
          <ContactActionBtn action={{ id: 'have_question', label: 'Ask a Question', sublabel: 'We\'ll respond within minutes', icon: HelpCircle }} caseId={caseId} />
        </div>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, sublabel, badge, variant, onClick, testId }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 p-4 bg-white/70 backdrop-blur-sm rounded-[14px] border border-[#0B0B0D]/[0.04] shadow-[0_2px_12px_rgba(11,11,13,0.03)] active:bg-white/90 active:scale-[0.99] transition-all"
      data-testid={testId}>
      <div className="w-10 h-10 rounded-full bg-[#F4F1EC] flex items-center justify-center flex-shrink-0">
        <Icon className="w-[18px] h-[18px] text-[#0B0B0D]/35" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-semibold text-[#0B0B0D]">{label}</p>
        <p className="text-[10px] text-black/30 mt-0.5">{sublabel}</p>
      </div>
      {badge > 0 && (
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
          variant === 'urgent' ? 'bg-red-50 text-red-500' : 'bg-[#D4B36A]/10 text-[#D4B36A]'
        )}>{badge}</span>
      )}
      <ChevronRight className="w-4 h-4 text-black/15 flex-shrink-0" />
    </button>
  );
}

function ContactActionBtn({ action, caseId, priority }) {
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/case-portal/cases/${caseId}/respond`, { response: action.id });
      toast.success('Request sent to your RM');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };
  return (
    <button onClick={handleSubmit} disabled={submitting}
      className={cn(
        "w-full flex items-center gap-3.5 p-4 rounded-[14px] border active:scale-[0.99] transition-all disabled:opacity-50 text-left",
        priority
          ? 'bg-[#0B0B0D] border-[#D4B36A]/[0.12] shadow-[0_6px_24px_rgba(11,11,13,0.15)]'
          : 'bg-white/70 backdrop-blur-sm border-[#0B0B0D]/[0.04] shadow-[0_2px_12px_rgba(11,11,13,0.03)]'
      )}
      data-testid={`contact-action-${action.id}`}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
        priority ? 'bg-[#D4B36A]/15' : 'bg-[#D4B36A]/[0.06]'
      )}>
        <action.icon className={cn("w-[18px] h-[18px]", priority ? 'text-[#D4B36A]' : 'text-[#D4B36A]/60')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold", priority ? 'text-[#F4F1EC]' : 'text-[#0B0B0D]')}>{action.label}</p>
        {action.sublabel && <p className={cn("text-[10px] mt-0.5", priority ? 'text-[#F4F1EC]/35' : 'text-[#0B0B0D]/30')}>{action.sublabel}</p>}
      </div>
      <ChevronRight className={cn("w-4 h-4 flex-shrink-0", priority ? 'text-[#F4F1EC]/20' : 'text-black/15')} />
    </button>
  );
}

/* ════════════════════════════════════════════════
   MESSAGES SECTION
   ════════════════════════════════════════════════ */
function MessagesSection({ caseId, user }) {
  const [messages, setMessages] = useState([]);
  const [rmName, setRmName] = useState('');
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/case-thread/${caseId}/customer`);
      setMessages(res.data?.messages || []);
      setRmName(res.data?.rm_name || '');
    } catch {} finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api.post(`/case-thread/${caseId}/customer`, { text: t });
      setText('');
      await fetchMessages();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send'); }
    finally { setSending(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col min-h-[50vh]" data-testid="messages-section">
      {rmName && (
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-black/[0.04]">
          <div className="w-8 h-8 rounded-full bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] text-[11px] font-bold flex-shrink-0">
            {rmName.charAt(0)}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#0B0B0D]">{rmName}</p>
            <p className="text-[10px] text-black/35">Your Relationship Manager</p>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
          <MessageCircle className="w-10 h-10 text-black/10 mb-3" />
          <h4 className="text-[14px] font-semibold text-[#0B0B0D]/60 mb-1">Start a conversation</h4>
          <p className="text-[12px] text-black/30 max-w-[220px]">Send a message to your relationship manager.</p>
        </div>
      ) : (
        <div className="space-y-2.5 mb-4 flex-1">
          {messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const showDate = !prev || formatDate(msg.created_at) !== formatDate(prev.created_at);
            return (
              <React.Fragment key={msg.message_id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-black/[0.04]" />
                    <span className="text-[9px] text-black/25 font-medium">{formatDate(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-black/[0.04]" />
                  </div>
                )}
                <div className={cn("flex", msg.is_customer ? "justify-end" : "justify-start")} data-testid={`msg-${msg.message_id}`}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    msg.is_customer
                      ? "bg-[#0B0B0D] text-[#F4F1EC] rounded-br-md"
                      : "bg-white border border-black/[0.05] text-[#0B0B0D] rounded-bl-md"
                  )}>
                    {!msg.is_customer && (
                      <p className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-wider mb-1">{msg.role_label}</p>
                    )}
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className={cn("text-[9px] mt-1.5", msg.is_customer ? "text-white/30" : "text-black/25")}>{timeStr(msg.created_at)}</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      <div className="border-t border-black/[0.04] pt-3 mt-auto">
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 min-h-[42px] max-h-[100px] bg-white border border-black/[0.08] rounded-2xl px-4 py-2.5 text-[13px] text-[#0B0B0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/20 focus:border-[#D4B36A]/30 placeholder:text-black/25"
            data-testid="message-input" />
          <button onClick={handleSend} disabled={!text.trim() || sending}
            className="w-10 h-10 bg-[#0B0B0D] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-95 transition-transform"
            data-testid="send-message-btn">
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED ITEMS SECTION
   ════════════════════════════════════════════════ */
function SharedSection({ shares, superseded, caseId, onRefresh, setRespondModal }) {
  const [showOlder, setShowOlder] = useState(false);

  if (shares.length === 0 && superseded.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-shares">
        <FileText className="w-10 h-10 text-black/10 mx-auto mb-3" />
        <h3 className="text-[14px] font-semibold text-[#0B0B0D]/60 mb-1">Nothing shared yet</h3>
        <p className="text-[12px] text-black/30 max-w-[240px] mx-auto">Your RM will share proposals, quotes, and venue shortlists here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="shared-section">
      {shares.map(share => (
        <ShareCard key={share.share_id} share={share} caseId={caseId} onRefresh={onRefresh} setRespondModal={setRespondModal} />
      ))}
      {superseded.length > 0 && (
        <div className="pt-2">
          <button onClick={() => setShowOlder(!showOlder)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-black/30"
            data-testid="toggle-older-versions">
            {showOlder ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {superseded.length} older version{superseded.length > 1 ? 's' : ''}
          </button>
          {showOlder && (
            <div className="mt-2 space-y-2 opacity-50">
              {superseded.map(share => (
                <ShareCard key={share.share_id} share={share} caseId={caseId} onRefresh={onRefresh} setRespondModal={setRespondModal} isSuperseded />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShareCard({ share, caseId, onRefresh, setRespondModal, isSuperseded = false }) {
  const typeLabel = SHARE_TYPE_LABELS[share.share_type] || share.share_type;
  const isActionable = share.lifecycle === 'shared' && !share.customer_response;

  useEffect(() => {
    if (share.lifecycle === 'shared' && !share.viewed_at) {
      const t = setTimeout(async () => {
        try { await api.post(`/case-portal/cases/${caseId}/view/${share.share_id}`); onRefresh(); } catch {}
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [share.share_id, share.lifecycle, share.viewed_at, caseId, onRefresh]);

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4",
      isSuperseded ? 'border-amber-200/50' :
      isActionable ? 'border-[#D4B36A]/20' : 'border-black/[0.05]'
    )} data-testid={`share-card-${share.share_id}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-[13px] font-semibold text-[#0B0B0D] truncate">{share.title}</h4>
            {share.version > 1 && <span className="text-[9px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-1.5 py-0.5 rounded">v{share.version}</span>}
          </div>
          <p className="text-[10px] text-black/35">{typeLabel} {share.venue_name && `· ${share.venue_name}`} · {timeAgo(share.created_at)}</p>
        </div>
      </div>
      {(share.description || share.customer_note) && (
        <p className="text-[12px] text-black/50 mb-2 leading-relaxed">{share.customer_note || share.description}</p>
      )}
      {share.change_summary && share.version > 1 && (
        <div className="bg-blue-50/60 border border-blue-100/50 rounded-xl p-3 mb-2">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">What changed</p>
          <p className="text-[11px] text-blue-800">{share.change_summary}</p>
        </div>
      )}
      {share.share_type === 'shortlist' && share.content?.venues && (
        <div className="space-y-1.5 mb-2">
          {share.content.venues.slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-black/[0.02] rounded-lg p-2">
              <MapPin className="w-3 h-3 text-black/25 flex-shrink-0" />
              <span className="text-[11px] text-[#0B0B0D] font-medium truncate">{v.name || v.venue_name}</span>
            </div>
          ))}
        </div>
      )}
      {share.file_path && (
        <a href={share.file_path} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-black/[0.02] rounded-xl p-3 mb-2" data-testid={`download-${share.share_id}`}>
          <Download className="w-4 h-4 text-[#D4B36A]" />
          <span className="text-[11px] font-medium text-[#0B0B0D] flex-1 truncate">{share.file_name || 'Download file'}</span>
          <ExternalLink className="w-3 h-3 text-black/20" />
        </a>
      )}
      {share.customer_response && (
        <div className="bg-emerald-50/60 border border-emerald-100/50 rounded-xl p-3 mb-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Your Response</p>
          <p className="text-[11px] text-emerald-800 font-medium">{share.customer_response.replace(/_/g, ' ')}</p>
        </div>
      )}
      {!isSuperseded && !share.customer_response && (share.lifecycle === 'shared' || share.lifecycle === 'viewed') && (
        <button onClick={() => setRespondModal(share)}
          className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-full flex items-center justify-center gap-1.5 mt-2 active:scale-[0.97] transition-transform"
          data-testid={`respond-btn-${share.share_id}`}>
          <Send className="w-3.5 h-3.5" /> Respond
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PAYMENTS SECTION
   ════════════════════════════════════════════════ */
function PaymentsSection({ caseId, user }) {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/case-payments/${caseId}/customer-payments`);
      setPayments(res.data?.payments || []);
      setSummary(res.data?.summary || null);
    } catch {} finally { setLoading(false); }
  }, [caseId]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handlePayNow = async (payment) => {
    setPaying(payment.payment_request_id);
    try {
      const res = await api.post(`/case-payments/${payment.payment_request_id}/checkout`);
      const data = res.data;
      if (data.is_test_mode) {
        const simRes = await api.post(`/case-payments/${payment.payment_request_id}/simulate`);
        setPaymentSuccess(simRes.data);
        toast.success('Payment successful!');
        await fetchPayments();
      } else {
        await loadRazorpayScript();
        const rzp = new window.Razorpay({
          key: data.razorpay_key, amount: data.amount, currency: data.currency,
          name: data.name, description: data.description, order_id: data.order_id,
          prefill: data.prefill, theme: { color: '#0B0B0D' },
          handler: async (response) => {
            try {
              const v = await api.post(`/case-payments/${payment.payment_request_id}/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setPaymentSuccess(v.data); toast.success('Payment successful!'); await fetchPayments();
            } catch { toast.error('Verification failed. Contact support.'); }
          },
          modal: { ondismiss: () => { setPaying(null); fetchPayments(); } },
        });
        rzp.on('payment.failed', () => { toast.error('Payment failed. You can retry.'); fetchPayments(); });
        rzp.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not initiate payment');
    } finally { setPaying(null); }
  };

  if (loading) return <Spinner />;

  if (paymentSuccess) {
    return (
      <div data-testid="payment-success-view" className="py-4">
        <div className="bg-white rounded-2xl border border-emerald-200/50 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#0B0B0D] mb-1">Payment Successful</h3>
          <p className="text-[12px] text-black/40 mb-4">Your booking is progressing!</p>
          <div className="bg-[#F8F7F4] rounded-xl p-4 space-y-2.5 text-left">
            <div className="flex justify-between text-[12px]"><span className="text-black/40">Amount</span><span className="font-bold text-[#0B0B0D]">₹{paymentSuccess.amount?.toLocaleString('en-IN')}</span></div>
            {paymentSuccess.receipt_number && <div className="flex justify-between text-[12px]"><span className="text-black/40">Receipt</span><span className="font-mono text-[11px] text-[#0B0B0D]">{paymentSuccess.receipt_number}</span></div>}
            {paymentSuccess.paid_at && <div className="flex justify-between text-[12px]"><span className="text-black/40">Date</span><span className="text-[#0B0B0D]">{formatDate(paymentSuccess.paid_at)}</span></div>}
          </div>
          <button onClick={() => setPaymentSuccess(null)}
            className="mt-4 h-10 px-6 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-full active:scale-[0.97]"
            data-testid="payment-success-dismiss">Done</button>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-payments">
        <Wallet className="w-10 h-10 text-black/10 mx-auto mb-3" />
        <h3 className="text-[14px] font-semibold text-[#0B0B0D]/60 mb-1">No payments yet</h3>
        <p className="text-[12px] text-black/30 max-w-[220px] mx-auto">When a deposit is required, it will appear here.</p>
      </div>
    );
  }

  const pending = payments.filter(p => p.can_pay);
  const done = payments.filter(p => !p.can_pay);

  return (
    <div className="space-y-4" data-testid="payments-section">
      {summary && (summary.total_due > 0 || summary.total_paid > 0) && (
        <div className="flex gap-3">
          {summary.total_due > 0 && (
            <div className="flex-1 bg-white rounded-2xl border border-black/[0.05] p-4">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Due</p>
              <p className="text-[20px] font-bold text-[#0B0B0D] mt-0.5">₹{summary.total_due.toLocaleString('en-IN')}</p>
            </div>
          )}
          {summary.total_paid > 0 && (
            <div className="flex-1 bg-white rounded-2xl border border-black/[0.05] p-4">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Paid</p>
              <p className="text-[20px] font-bold text-[#0B0B0D] mt-0.5">₹{summary.total_paid.toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>
      )}
      {pending.map(p => (
        <div key={p.payment_request_id}
          className={cn("bg-white rounded-2xl border p-5",
            p.status === 'payment_failed' ? 'border-red-200/50' : 'border-[#D4B36A]/15'
          )} data-testid={`payment-due-${p.payment_request_id}`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0B0D] flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-[#D4B36A]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[14px] font-semibold text-[#0B0B0D]">{p.purpose_label}</h4>
              <p className="text-[11px] text-black/35 mt-0.5">{p.status_label}</p>
            </div>
            <p className="text-[17px] font-bold text-[#0B0B0D] flex-shrink-0">₹{p.amount?.toLocaleString('en-IN')}</p>
          </div>
          {p.customer_note && (
            <div className="bg-[#F8F7F4] rounded-lg p-2.5 mb-3"><p className="text-[11px] text-black/50 italic">"{p.customer_note}"</p></div>
          )}
          {p.status === 'payment_failed' && (
            <div className="flex items-center gap-2 bg-red-50/60 border border-red-100/50 rounded-xl p-3 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[11px] text-red-600">Payment failed. You can safely retry.</p>
            </div>
          )}
          <button onClick={() => handlePayNow(p)} disabled={paying === p.payment_request_id}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[13px] font-bold rounded-full flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50"
            data-testid={`pay-now-${p.payment_request_id}`}>
            {paying === p.payment_request_id
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><ShieldCheck className="w-4 h-4" /> {p.status === 'payment_failed' ? 'Retry Payment' : 'Pay Now'}</>}
          </button>
          <p className="text-center mt-2 text-[9px] text-black/25 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Secured by Razorpay</p>
        </div>
      ))}
      {done.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-black/25 uppercase tracking-wider mb-2">Payment History</p>
          {done.map(p => (
            <div key={p.payment_request_id}
              className="flex items-center gap-3 py-3.5 border-b border-black/[0.04] last:border-0"
              data-testid={`payment-history-${p.payment_request_id}`}>
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                p.status === 'payment_success' ? 'bg-emerald-50' : 'bg-black/[0.03]')}>
                {p.status === 'payment_success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Receipt className="w-4 h-4 text-black/25" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#0B0B0D] truncate">{p.purpose_label}</p>
                <p className="text-[10px] text-black/30 mt-0.5">{p.status_label}{p.paid_at && ` · ${formatDate(p.paid_at)}`}</p>
              </div>
              <p className="text-[14px] font-bold text-[#0B0B0D] flex-shrink-0">₹{p.amount?.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function loadRazorpayScript() {
  return new Promise(r => { if (window.Razorpay) return r(); const s = document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.onload=r; s.onerror=r; document.body.appendChild(s); });
}

/* ════════════════════════════════════════════════
   TIMELINE SECTION
   ════════════════════════════════════════════════ */
function TimelineSection({ timeline }) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-timeline">
        <Clock className="w-10 h-10 text-black/10 mx-auto mb-3" />
        <h3 className="text-[14px] font-semibold text-[#0B0B0D]/60">No timeline events yet</h3>
      </div>
    );
  }
  return (
    <div className="relative" data-testid="timeline-section">
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-black/[0.06]" />
      <div className="space-y-5">
        {timeline.map((ev, idx) => (
          <div key={idx} className="flex items-start gap-3.5 relative">
            <div className={cn(
              "w-[23px] h-[23px] rounded-full flex items-center justify-center flex-shrink-0 z-[1]",
              idx === 0 ? 'bg-[#D4B36A]' : 'bg-white border border-black/[0.08]'
            )}>
              {ev.type?.includes('payment') ? <CreditCard className={cn("w-3 h-3", idx === 0 ? 'text-[#0B0B0D]' : 'text-black/25')} /> :
               ev.type?.includes('stage') ? <CheckCircle2 className={cn("w-3 h-3", idx === 0 ? 'text-[#0B0B0D]' : 'text-black/25')} /> :
               <Clock className={cn("w-3 h-3", idx === 0 ? 'text-[#0B0B0D]' : 'text-black/25')} />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[12px] font-medium text-[#0B0B0D]/70">{ev.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {ev.timestamp && <span className="text-[10px] text-black/25">{formatDate(ev.timestamp)}</span>}
                {ev.by && <span className="text-[10px] text-black/25">· {ev.by}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   RESPOND MODAL
   ════════════════════════════════════════════════ */
function RespondModal({ share, caseId, onClose, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post(`/case-portal/cases/${caseId}/respond`, { response: selected, note: note.trim() || null, share_id: share.share_id });
      toast.success('Response recorded');
      onClose(); await onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" data-testid="respond-modal">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85dvh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="sticky top-0 bg-white border-b border-black/[0.05] px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h3 className="text-[14px] font-semibold text-[#0B0B0D]" data-testid="respond-modal-title">Respond</h3>
            <p className="text-[10px] text-black/35 mt-0.5">{share.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/[0.04]" data-testid="respond-modal-close">
            <X className="w-4 h-4 text-black/40" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {RESPONSE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setSelected(opt.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors",
                selected === opt.id ? 'border-[#D4B36A] bg-[#D4B36A]/[0.04]' : 'border-black/[0.05]'
              )} data-testid={`response-option-${opt.id}`}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0", opt.color)}>
                <opt.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[12px] font-medium text-[#0B0B0D] flex-1">{opt.label}</span>
              {selected === opt.id && <CheckCircle2 className="w-4 h-4 text-[#D4B36A]" />}
            </button>
          ))}
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..."
            className="w-full h-16 bg-[#F8F7F4] border border-black/[0.05] rounded-xl px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/20 mt-2 placeholder:text-black/25"
            data-testid="respond-note-input" />
        </div>
        <div className="px-5 py-3 border-t border-black/[0.05]">
          <button onClick={handleSubmit} disabled={!selected || submitting}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-full flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-30"
            data-testid="respond-submit-btn">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Send Response</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>;
}
