import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Calendar, Users, Clock, FileText,
  CheckCircle2, MessageCircle, Phone, ChevronDown, ChevronUp,
  Download, Eye, Send, PhoneCall, HelpCircle, ThumbsUp,
  ThumbsDown, RotateCcw, X, Briefcase, Star, ExternalLink,
  CreditCard, Receipt, ShieldCheck, AlertCircle, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

const sans = { fontFamily: "'DM Sans', sans-serif" };

/* ────── constants ────── */

const SHARE_TYPE_ICONS = {
  shortlist: Briefcase, proposal: FileText, quote: FileText,
  brochure: FileText, menu: FileText, photo_gallery: Star,
  comparison: FileText, visit_details: MapPin, note: MessageCircle, file: Download,
};
const SHARE_TYPE_LABELS = {
  shortlist: 'Venue Shortlist', proposal: 'Proposal', quote: 'Quotation',
  brochure: 'Brochure', menu: 'Menu', photo_gallery: 'Photo Gallery',
  comparison: 'Comparison', visit_details: 'Visit Details', note: 'Update', file: 'Document',
};
const LIFECYCLE_COLORS = {
  shared: 'bg-blue-50 text-blue-700', viewed: 'bg-slate-100 text-slate-600',
  responded: 'bg-emerald-50 text-emerald-700', superseded: 'bg-amber-50 text-amber-600',
};
const RESPONSE_OPTIONS = [
  { id: 'interested', label: 'Interested', icon: ThumbsUp, color: 'bg-emerald-500 hover:bg-emerald-600' },
  { id: 'request_callback', label: 'Request Callback', icon: PhoneCall, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'request_visit', label: 'Request Site Visit', icon: MapPin, color: 'bg-purple-500 hover:bg-purple-600' },
  { id: 'accept_quote', label: 'Accept Quote', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { id: 'need_more_options', label: 'Need More Options', icon: RotateCcw, color: 'bg-amber-500 hover:bg-amber-600' },
  { id: 'have_question', label: 'Ask a Question', icon: HelpCircle, color: 'bg-sky-500 hover:bg-sky-600' },
  { id: 'maybe', label: 'Maybe Later', icon: Clock, color: 'bg-slate-400 hover:bg-slate-500' },
  { id: 'not_for_me', label: 'Not for Me', icon: ThumbsDown, color: 'bg-red-400 hover:bg-red-500' },
];

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function timeAgo(d) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  return dy < 7 ? `${dy}d ago` : formatDate(d);
}
function timeStr(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const TABS = [
  { id: 'shared', label: 'Shared' },
  { id: 'payments', label: 'Payments' },
  { id: 'messages', label: 'Messages' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contact', label: 'Contact' },
];

/* ════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════ */
export default function CustomerCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('shared');
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
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  // When messages tab is visited, clear unread badge
  useEffect(() => {
    if (activeTab === 'messages') setUnreadMessages(0);
  }, [activeTab]);

  /* ── Loading / Error shells ── */
  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#F8F7F4] flex items-center justify-center" style={sans}>
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !caseData) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#F8F7F4] flex flex-col" style={sans}>
        <PortalHeader onBack={() => navigate('/my-cases')} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-red-500 mb-3">{error || 'Case not found'}</p>
            <button onClick={() => navigate('/my-cases')}
              className="h-10 px-5 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-xl"
              data-testid="back-to-cases-btn">
              Back to My Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stage = caseData.stage || 'enquiry_received';
  const shares = (caseData.shares || []).filter(s => s.lifecycle !== 'superseded' || s.share_type === 'proposal' || s.share_type === 'quote');
  const currentShares = shares.filter(s => s.is_current_version !== false);
  const supersededShares = shares.filter(s => s.is_current_version === false);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F8F7F4] flex flex-col overflow-x-hidden" style={sans}>
      {/* ── Fixed Header ── */}
      <PortalHeader
        title={caseData.event_type || 'My Case'}
        subtitle={[caseData.city, caseData.event_date && formatDate(caseData.event_date), caseData.guest_count && `${caseData.guest_count} guests`].filter(Boolean).join(' · ')}
        onBack={() => navigate('/my-cases')}
      />

      {/* ── Status Banner ── */}
      <div className="bg-[#D4B36A]/[0.06] border-b border-[#D4B36A]/10 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0",
            stage === 'booking_confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#D4B36A]/20 text-[#8B7A3E]'
          )} data-testid="case-detail-stage">
            {caseData.stage_label}
          </span>
          <p className="text-[11px] text-[#5A5347] truncate">{caseData.status_message}</p>
        </div>
      </div>

      {/* ── Scrollable Tab Bar ── */}
      <div className="bg-white border-b border-black/[0.05] overflow-x-auto hide-scrollbar flex-shrink-0">
        <div className="flex min-w-max px-2 max-w-2xl mx-auto" data-testid="case-detail-tabs">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400'
              )} data-testid={`case-tab-${tab.id}`}>
              {tab.label}
              {tab.id === 'shared' && caseData.pending_count > 0 && (
                <span className="ml-1.5 text-[9px] bg-[#D4B36A] text-white w-4 h-4 inline-flex items-center justify-center rounded-full">{caseData.pending_count}</span>
              )}
              {tab.id === 'payments' && caseData.payment_pending_count > 0 && (
                <span className="ml-1.5 text-[9px] bg-red-500 text-white w-4 h-4 inline-flex items-center justify-center rounded-full">{caseData.payment_pending_count}</span>
              )}
              {tab.id === 'messages' && unreadMessages > 0 && (
                <span className="ml-1.5 text-[9px] bg-blue-500 text-white w-4 h-4 inline-flex items-center justify-center rounded-full">{unreadMessages}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content — isolated scroll ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <div className="px-4 py-4 max-w-2xl mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
          {activeTab === 'shared' && (
            <SharedItemsTab shares={currentShares} superseded={supersededShares}
              caseId={caseId} onRefresh={fetchCase} setRespondModal={setRespondModal} />
          )}
          {activeTab === 'payments' && <PaymentsTab caseId={caseId} user={user} />}
          {activeTab === 'messages' && <MessagesTab caseId={caseId} user={user} />}
          {activeTab === 'timeline' && <TimelineTab timeline={caseData.timeline || []} />}
          {activeTab === 'contact' && (
            <ContactRMTab caseData={caseData} caseId={caseId} onRefresh={fetchCase} />
          )}
        </div>
      </div>

      {respondModal && (
        <RespondModal share={respondModal} caseId={caseId}
          onClose={() => setRespondModal(null)} onRefresh={fetchCase} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PORTAL HEADER — consistent across all portal pages
   ════════════════════════════════════════════════ */
function PortalHeader({ title, subtitle, onBack }) {
  return (
    <div className="bg-[#0B0B0D] text-white px-4 pb-3 flex-shrink-0"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      data-testid="case-detail-header">
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.08] active:bg-white/[0.15] transition-colors flex-shrink-0"
          data-testid="case-detail-back-btn">
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <div className="flex-1 min-w-0">
          {title ? (
            <>
              <h1 className="text-[15px] font-bold truncate" data-testid="case-detail-title">{title}</h1>
              {subtitle && <p className="text-[10px] text-white/50 truncate mt-0.5">{subtitle}</p>}
            </>
          ) : (
            <h1 className="text-[15px] font-bold">My Cases</h1>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED ITEMS TAB
   ════════════════════════════════════════════════ */
function SharedItemsTab({ shares, superseded, caseId, onRefresh, setRespondModal }) {
  const [showOlder, setShowOlder] = useState(false);

  if (shares.length === 0 && superseded.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-shares">
        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <h3 className="text-[14px] font-bold text-slate-500 mb-1">Nothing shared yet</h3>
        <p className="text-[12px] text-slate-400 max-w-[240px] mx-auto">Your RM will share proposals, quotes, and venue shortlists here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="shared-items-tab">
      {shares.map(share => (
        <ShareCard key={share.share_id} share={share} caseId={caseId} onRefresh={onRefresh} setRespondModal={setRespondModal} />
      ))}
      {superseded.length > 0 && (
        <div className="pt-2">
          <button onClick={() => setShowOlder(!showOlder)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"
            data-testid="toggle-older-versions">
            {showOlder ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {superseded.length} older version{superseded.length > 1 ? 's' : ''}
          </button>
          {showOlder && (
            <div className="mt-2 space-y-2 opacity-60">
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
  const Icon = SHARE_TYPE_ICONS[share.share_type] || FileText;
  const typeLabel = SHARE_TYPE_LABELS[share.share_type] || share.share_type;
  const lifecycleColor = LIFECYCLE_COLORS[share.lifecycle] || 'bg-slate-100 text-slate-600';
  const isActionable = share.lifecycle === 'shared' && !share.customer_response;

  useEffect(() => {
    if (share.lifecycle === 'shared' && !share.viewed_at) {
      const t = setTimeout(async () => {
        try { await api.post(`/case-portal/cases/${caseId}/view/${share.share_id}`); onRefresh(); } catch {}
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [share.share_id, share.lifecycle]);

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4",
      isSuperseded ? 'border-amber-200/50 bg-amber-50/20' :
      isActionable ? 'border-[#D4B36A]/30 shadow-sm' : 'border-black/[0.05]'
    )} data-testid={`share-card-${share.share_id}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          isActionable ? 'bg-[#D4B36A]/10' : 'bg-slate-50')}>
          <Icon className={cn("w-4 h-4", isActionable ? 'text-[#D4B36A]' : 'text-slate-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-bold text-[#0B0B0D] truncate">{share.title}</h4>
            {share.version > 1 && <span className="text-[9px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-1.5 py-0.5 rounded">v{share.version}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400">{typeLabel}</span>
            {share.venue_name && <span className="text-[10px] text-slate-400">&middot; {share.venue_name}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", lifecycleColor)}>
            {isSuperseded ? 'superseded' : share.lifecycle}
          </span>
          <span className="text-[9px] text-slate-400">{timeAgo(share.created_at)}</span>
        </div>
      </div>
      {(share.description || share.customer_note) && (
        <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">{share.customer_note || share.description}</p>
      )}
      {share.change_summary && share.version > 1 && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 mb-2">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">What changed</p>
          <p className="text-[11px] text-blue-800">{share.change_summary}</p>
        </div>
      )}
      {share.share_type === 'shortlist' && share.content?.venues && (
        <div className="space-y-1.5 mb-2">
          {share.content.venues.slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-[#0B0B0D] font-medium truncate">{v.name || v.venue_name}</span>
            </div>
          ))}
          {share.content.venues.length > 3 && (
            <p className="text-[10px] text-[#D4B36A] font-semibold">+{share.content.venues.length - 3} more</p>
          )}
        </div>
      )}
      {share.file_path && (
        <a href={share.file_path} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 mb-2"
          data-testid={`download-${share.share_id}`}>
          <Download className="w-4 h-4 text-[#D4B36A]" />
          <span className="text-[11px] font-medium text-[#0B0B0D] flex-1 truncate">{share.file_name || 'Download file'}</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      )}
      {share.customer_response && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 mb-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Your Response</p>
          <p className="text-[11px] text-emerald-800 font-medium">{share.customer_response.replace(/_/g, ' ')}</p>
          {share.customer_response_note && <p className="text-[10px] text-emerald-700 mt-0.5">{share.customer_response_note}</p>}
        </div>
      )}
      {!isSuperseded && !share.customer_response && (share.lifecycle === 'shared' || share.lifecycle === 'viewed') && (
        <button onClick={() => setRespondModal(share)}
          className="w-full h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 mt-2 active:scale-[0.98]"
          data-testid={`respond-btn-${share.share_id}`}>
          <Send className="w-3.5 h-3.5" /> Respond
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PAYMENTS TAB
   ════════════════════════════════════════════════ */
function PaymentsTab({ caseId, user }) {
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
      <div data-testid="payment-success-view">
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-[17px] font-bold text-[#0B0B0D] mb-1">Payment Successful</h3>
          <p className="text-[12px] text-slate-500 mb-4">Your booking is progressing!</p>
          <div className="bg-[#F8F7F4] rounded-xl p-4 space-y-2.5 text-left">
            <Row label="Amount" value={`₹${paymentSuccess.amount?.toLocaleString('en-IN')}`} bold />
            {paymentSuccess.receipt_number && <Row label="Receipt" value={paymentSuccess.receipt_number} mono />}
            {paymentSuccess.paid_at && <Row label="Date" value={formatDate(paymentSuccess.paid_at)} />}
          </div>
          <button onClick={() => setPaymentSuccess(null)}
            className="mt-4 h-10 px-6 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-xl active:scale-[0.97]"
            data-testid="payment-success-dismiss">Done</button>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-payments">
        <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <h3 className="text-[14px] font-bold text-slate-500 mb-1">No payments yet</h3>
        <p className="text-[12px] text-slate-400 max-w-[220px] mx-auto">When a deposit is required, it will appear here.</p>
      </div>
    );
  }

  const pending = payments.filter(p => p.can_pay);
  const done = payments.filter(p => !p.can_pay);

  return (
    <div className="space-y-4" data-testid="payments-tab">
      {summary && (summary.total_due > 0 || summary.total_paid > 0) && (
        <div className="bg-white rounded-xl border border-black/[0.05] p-4">
          <div className="grid grid-cols-2 gap-3">
            {summary.total_due > 0 && <SummaryCell label="Due" amount={summary.total_due} color="text-amber-500" />}
            {summary.total_paid > 0 && <SummaryCell label="Paid" amount={summary.total_paid} color="text-emerald-500" />}
          </div>
        </div>
      )}
      {pending.map(p => (
        <div key={p.payment_request_id}
          className={cn("bg-white rounded-xl border p-4",
            p.status === 'payment_failed' ? 'border-red-200 bg-red-50/20' : 'border-[#D4B36A]/20'
          )} data-testid={`payment-due-${p.payment_request_id}`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0B0D] flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-[#D4B36A]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[14px] font-bold text-[#0B0B0D]">{p.purpose_label}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{p.status_label}</p>
            </div>
            <p className="text-[17px] font-bold text-[#0B0B0D] flex-shrink-0">₹{p.amount?.toLocaleString('en-IN')}</p>
          </div>
          {p.status_message && <p className="text-[12px] text-slate-500 mb-3">{p.status_message}</p>}
          {p.customer_note && (
            <div className="bg-[#F8F7F4] rounded-lg p-2.5 mb-3">
              <p className="text-[11px] text-[#5A5347] italic">"{p.customer_note}"</p>
            </div>
          )}
          {p.venue_name && <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-3"><MapPin className="w-3 h-3" />{p.venue_name}</p>}
          {p.status === 'payment_failed' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[11px] text-red-600">Payment could not be processed. You can safely retry.</p>
            </div>
          )}
          <button onClick={() => handlePayNow(p)} disabled={paying === p.payment_request_id}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
            data-testid={`pay-now-${p.payment_request_id}`}>
            {paying === p.payment_request_id
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><ShieldCheck className="w-4 h-4" /> {p.status === 'payment_failed' ? 'Retry Payment' : 'Pay Now'}</>}
          </button>
          <p className="text-center mt-2 text-[9px] text-slate-400 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Secured by Razorpay</p>
        </div>
      ))}
      {done.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Payment History</h4>
          <div className="space-y-2">
            {done.map(p => (
              <div key={p.payment_request_id}
                className="bg-white rounded-xl border border-black/[0.05] p-3 flex items-center gap-3"
                data-testid={`payment-history-${p.payment_request_id}`}>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  p.status === 'payment_success' ? 'bg-emerald-50' : 'bg-slate-50')}>
                  {p.status === 'payment_success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Receipt className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#0B0B0D] truncate">{p.purpose_label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.status_label}{p.paid_at && ` · ${formatDate(p.paid_at)}`}</p>
                  {p.receipt_number && <p className="text-[9px] text-slate-400 font-mono">{p.receipt_number}</p>}
                </div>
                <p className="text-[14px] font-bold text-[#0B0B0D] flex-shrink-0">₹{p.amount?.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, amount, color }) {
  return (
    <div>
      <p className={cn("text-[10px] font-bold uppercase tracking-wider", color)}>{label}</p>
      <p className="text-[20px] font-bold text-[#0B0B0D]">₹{amount.toLocaleString('en-IN')}</p>
    </div>
  );
}
function Row({ label, value, bold, mono }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-slate-400">{label}</span>
      <span className={cn("text-[#0B0B0D]", bold && 'font-bold', mono && 'font-mono text-[11px]')}>{value}</span>
    </div>
  );
}
function loadRazorpayScript() {
  return new Promise(r => { if (window.Razorpay) return r(); const s = document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.onload=r; s.onerror=r; document.body.appendChild(s); });
}

/* ════════════════════════════════════════════════
   MESSAGES TAB — no sticky compose, uses padding
   ════════════════════════════════════════════════ */
function MessagesTab({ caseId, user }) {
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
    <div className="flex flex-col" data-testid="messages-tab">
      {rmName && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[#0B0B0D] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {rmName.charAt(0)}
          </div>
          <p className="text-[11px] text-slate-400">Chat with <span className="font-semibold text-slate-600">{rmName}</span></p>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <h4 className="text-[13px] font-bold text-slate-500 mb-1">Start a conversation</h4>
          <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">Send a message to your relationship manager.</p>
        </div>
      ) : (
        <div className="space-y-2.5 mb-4">
          {messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const showDate = !prev || formatDate(msg.created_at) !== formatDate(prev.created_at);
            return (
              <React.Fragment key={msg.message_id}>
                {showDate && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] text-slate-400 font-semibold">{formatDate(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                )}
                <div className={cn("flex", msg.is_customer ? "justify-end" : "justify-start")} data-testid={`msg-${msg.message_id}`}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5",
                    msg.is_customer ? "bg-[#0B0B0D] text-white rounded-br-md" : "bg-white border border-black/[0.05] text-[#0B0B0D] rounded-bl-md"
                  )}>
                    {!msg.is_customer && <p className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-wider mb-0.5">{msg.role_label}</p>}
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className={cn("text-[9px] mt-1", msg.is_customer ? "text-white/40" : "text-slate-400")}>{timeStr(msg.created_at)}</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose — NOT sticky, lives at bottom of scroll flow */}
      <div className="border-t border-black/[0.05] pt-3 mt-auto">
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 min-h-[40px] max-h-[100px] bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-[#0B0B0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
            data-testid="message-input" />
          <button onClick={handleSend} disabled={!text.trim() || sending}
            className="w-10 h-10 bg-[#0B0B0D] rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95"
            data-testid="send-message-btn">
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TIMELINE TAB
   ════════════════════════════════════════════════ */
function TimelineTab({ timeline }) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-timeline">
        <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <h3 className="text-[14px] font-bold text-slate-500">No timeline events yet</h3>
      </div>
    );
  }
  return (
    <div className="relative" data-testid="timeline-tab">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
      <div className="space-y-4">
        {timeline.map((ev, idx) => (
          <div key={idx} className="flex items-start gap-3 relative">
            <div className={cn(
              "w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0 z-[1]",
              idx === 0 ? 'bg-[#D4B36A] text-white' : 'bg-white border-2 border-slate-200 text-slate-400'
            )}>
              {ev.type?.includes('share') || ev.type?.includes('file') ? <FileText className="w-3.5 h-3.5" /> :
               ev.type?.includes('visit') ? <MapPin className="w-3.5 h-3.5" /> :
               ev.type?.includes('stage') ? <CheckCircle2 className="w-3.5 h-3.5" /> :
               ev.type?.includes('payment') ? <CreditCard className="w-3.5 h-3.5" /> :
               <Clock className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[12px] text-[#0B0B0D] font-medium">{ev.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {ev.timestamp && <span className="text-[10px] text-slate-400">{formatDate(ev.timestamp)}</span>}
                {ev.by && <span className="text-[10px] text-slate-400">&middot; {ev.by}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CONTACT RM TAB
   ════════════════════════════════════════════════ */
function ContactRMTab({ caseData, caseId, onRefresh }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ACTIONS = [
    { id: 'request_callback', label: 'Request a Callback', desc: 'Ask your RM to call you', icon: PhoneCall, color: 'text-blue-600 bg-blue-50' },
    { id: 'need_more_options', label: 'Request More Info', desc: 'Need more details or options', icon: HelpCircle, color: 'text-sky-600 bg-sky-50' },
    { id: 'request_visit', label: 'Request Site Visit', desc: 'Schedule a venue visit', icon: MapPin, color: 'text-purple-600 bg-purple-50' },
    { id: 'accept_quote', label: 'Accept Quote & Proceed', desc: 'Ready to move forward', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'have_question', label: 'Ask a Question', desc: 'Raise a concern or question', icon: MessageCircle, color: 'text-amber-600 bg-amber-50' },
  ];

  const submit = async () => {
    if (!selectedAction) return;
    setSubmitting(true);
    try {
      await api.post(`/case-portal/cases/${caseId}/respond`, { response: selectedAction, note: note.trim() || null });
      toast.success('Request sent to your relationship manager');
      setSelectedAction(null); setNote(''); await onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4" data-testid="contact-rm-tab">
      {caseData.rm_name && (
        <div className="bg-white rounded-xl border border-black/[0.05] p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your Relationship Manager</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0D] flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0">
              {caseData.rm_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#0B0B0D]" data-testid="rm-name">{caseData.rm_name}</p>
              <p className="text-[11px] text-slate-400">VenuLoQ Relationship Manager</p>
            </div>
            {caseData.rm_phone && (
              <a href={`tel:${caseData.rm_phone}`} className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center" data-testid="call-rm-btn">
                <Phone className="w-4 h-4 text-emerald-600" />
              </a>
            )}
          </div>
        </div>
      )}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">What would you like to do?</p>
        <div className="space-y-2">
          {ACTIONS.map(a => (
            <button key={a.id} onClick={() => setSelectedAction(selectedAction === a.id ? null : a.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors",
                selectedAction === a.id ? 'border-[#D4B36A] bg-[#D4B36A]/[0.04]' : 'border-black/[0.05] bg-white'
              )} data-testid={`action-${a.id}`}>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", a.color)}>
                <a.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#0B0B0D]">{a.label}</p>
                <p className="text-[10px] text-slate-400">{a.desc}</p>
              </div>
              {selectedAction === a.id && <CheckCircle2 className="w-5 h-5 text-[#D4B36A] flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
      {selectedAction && (
        <div className="space-y-3">
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="w-full h-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
            data-testid="action-note-input" />
          <button onClick={submit} disabled={submitting}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
            data-testid="submit-action-btn">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Send Request</>}
          </button>
        </div>
      )}
      {caseData.rm_phone && (
        <div className="pt-3 border-t border-black/[0.04]">
          <p className="text-[10px] text-slate-400 mb-2">Or reach out directly:</p>
          <div className="flex gap-2">
            <a href={`tel:${caseData.rm_phone}`} className="flex-1 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600" data-testid="direct-call-btn">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a href={`https://wa.me/${caseData.rm_phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600" data-testid="direct-wa-btn">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   RESPOND MODAL — proper z-index, touch-safe
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Sheet */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[85dvh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="sticky top-0 bg-white border-b border-black/[0.05] px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-[14px] font-bold text-[#0B0B0D]" data-testid="respond-modal-title">Respond to: {share.title}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{SHARE_TYPE_LABELS[share.share_type] || share.share_type}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100" data-testid="respond-modal-close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-2">
          {RESPONSE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setSelected(opt.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border text-left",
                selected === opt.id ? 'border-[#D4B36A] bg-[#D4B36A]/[0.04]' : 'border-black/[0.05]'
              )} data-testid={`response-option-${opt.id}`}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0", opt.color)}>
                <opt.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[12px] font-medium text-[#0B0B0D]">{opt.label}</span>
              {selected === opt.id && <CheckCircle2 className="w-4 h-4 text-[#D4B36A] ml-auto" />}
            </button>
          ))}
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..."
            className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 mt-2"
            data-testid="respond-note-input" />
        </div>
        <div className="px-4 py-3 border-t border-black/[0.05]">
          <button onClick={handleSubmit} disabled={!selected || submitting}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:opacity-40"
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
