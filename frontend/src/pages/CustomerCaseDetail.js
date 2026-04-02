import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
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

const SHARE_TYPE_ICONS = {
  shortlist: Briefcase,
  proposal: FileText,
  quote: FileText,
  brochure: FileText,
  menu: FileText,
  photo_gallery: Star,
  comparison: FileText,
  visit_details: MapPin,
  note: MessageCircle,
  file: Download,
};

const SHARE_TYPE_LABELS = {
  shortlist: 'Venue Shortlist',
  proposal: 'Proposal',
  quote: 'Quotation',
  brochure: 'Brochure',
  menu: 'Menu',
  photo_gallery: 'Photo Gallery',
  comparison: 'Comparison',
  visit_details: 'Visit Details',
  note: 'Update',
  file: 'Document',
};

const LIFECYCLE_COLORS = {
  shared: 'bg-blue-50 text-blue-700',
  viewed: 'bg-slate-100 text-slate-600',
  responded: 'bg-emerald-50 text-emerald-700',
  superseded: 'bg-amber-50 text-amber-600',
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

const TABS = [
  { id: 'shared', label: 'Shared Items' },
  { id: 'payments', label: 'Payments' },
  { id: 'messages', label: 'Messages' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contact', label: 'Contact RM' },
];

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex flex-col" style={sans}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-[14px] font-semibold text-red-500 mb-2">{error}</p>
            <button onClick={() => navigate('/my-cases')} className="text-[12px] text-[#D4B36A] font-semibold">
              Back to My Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const stage = caseData.stage || 'enquiry_received';
  const shares = (caseData.shares || []).filter(s => s.lifecycle !== 'superseded' || s.share_type === 'proposal' || s.share_type === 'quote');
  const currentShares = shares.filter(s => s.is_current_version !== false);
  const supersededShares = shares.filter(s => s.is_current_version === false);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col" style={sans}>
      {/* Sticky Header — safe-area aware */}
      <div className="sticky top-0 z-20 bg-[#0B0B0D] text-white px-4 pb-3 safe-top"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        data-testid="case-detail-header">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate('/my-cases')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08] active:bg-white/[0.15] transition-colors"
            data-testid="case-detail-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold truncate" data-testid="case-detail-title">
              {caseData.event_type || 'My Case'}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              {caseData.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{caseData.city}</span>}
              {caseData.event_date && <span>{formatDate(caseData.event_date)}</span>}
              {caseData.guest_count && <span>{caseData.guest_count} guests</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-[#D4B36A]/[0.08] border-b border-[#D4B36A]/10 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full",
              stage === 'booking_confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#D4B36A]/20 text-[#8B7A3E]'
            )} data-testid="case-detail-stage">
              {caseData.stage_label}
            </span>
            {caseData.pending_count > 0 && (
              <span className="text-[10px] font-bold text-[#D4B36A]">
                {caseData.pending_count} item{caseData.pending_count > 1 ? 's' : ''} need your attention
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#5A5347]">{caseData.status_message}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white border-b border-black/[0.05] px-2">
        <div className="flex max-w-2xl mx-auto" data-testid="case-detail-tabs">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 px-3 py-2.5 text-[12px] font-semibold border-b-2 transition-all text-center",
                activeTab === tab.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400'
              )} data-testid={`case-tab-${tab.id}`}>
              {tab.label}
              {tab.id === 'shared' && caseData.pending_count > 0 && (
                <span className="ml-1 text-[9px] bg-[#D4B36A] text-white px-1.5 rounded-full">{caseData.pending_count}</span>
              )}
              {tab.id === 'payments' && caseData.payment_pending_count > 0 && (
                <span className="ml-1 text-[9px] bg-red-500 text-white px-1.5 rounded-full">{caseData.payment_pending_count}</span>
              )}
              {tab.id === 'messages' && unreadMessages > 0 && (
                <span className="ml-1 text-[9px] bg-blue-500 text-white px-1.5 rounded-full">{unreadMessages}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content — safe bottom for iOS */}
      <div className="flex-1 px-4 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div className="max-w-2xl mx-auto">
          {activeTab === 'shared' && (
            <SharedItemsTab
              shares={currentShares}
              superseded={supersededShares}
              caseId={caseId}
              onRefresh={fetchCase}
              setRespondModal={setRespondModal}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsTab caseId={caseId} user={user} />
          )}
          {activeTab === 'messages' && (
            <MessagesTab caseId={caseId} user={user} />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab timeline={caseData.timeline || []} />
          )}
          {activeTab === 'contact' && (
            <ContactRMTab
              caseData={caseData}
              caseId={caseId}
              onRefresh={fetchCase}
            />
          )}
        </div>
      </div>

      {/* Respond Modal */}
      {respondModal && (
        <RespondModal
          share={respondModal}
          caseId={caseId}
          onClose={() => setRespondModal(null)}
          onRefresh={fetchCase}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SHARED ITEMS TAB
   ════════════════════════════════════════════════════════════ */
function SharedItemsTab({ shares, superseded, caseId, onRefresh, setRespondModal }) {
  const [showOlder, setShowOlder] = useState(false);

  if (shares.length === 0 && superseded.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-shares">
        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <h3 className="text-[14px] font-bold text-slate-500 mb-1">Nothing shared yet</h3>
        <p className="text-[12px] text-slate-400">Your relationship manager will share proposals, quotes, and venue shortlists here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="shared-items-tab">
      {shares.map(share => (
        <ShareCard key={share.share_id} share={share} caseId={caseId} onRefresh={onRefresh} setRespondModal={setRespondModal} />
      ))}

      {/* Older/Superseded Versions */}
      {superseded.length > 0 && (
        <div className="pt-2">
          <button onClick={() => setShowOlder(!showOlder)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
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
  const [marking, setMarking] = useState(false);
  const Icon = SHARE_TYPE_ICONS[share.share_type] || FileText;
  const typeLabel = SHARE_TYPE_LABELS[share.share_type] || share.share_type;
  const lifecycleColor = LIFECYCLE_COLORS[share.lifecycle] || 'bg-slate-100 text-slate-600';
  const isActionable = share.lifecycle === 'shared' && !share.customer_response;
  const isViewed = share.lifecycle === 'viewed' || share.viewed_at;

  const markViewed = async () => {
    if (share.lifecycle !== 'shared') return;
    setMarking(true);
    try {
      await api.post(`/case-portal/cases/${caseId}/view/${share.share_id}`);
      await onRefresh();
    } catch { /* silent */ }
    finally { setMarking(false); }
  };

  // Auto-mark as viewed when card renders and is in 'shared' state
  useEffect(() => {
    if (share.lifecycle === 'shared' && !share.viewed_at) {
      const timer = setTimeout(() => markViewed(), 1500);
      return () => clearTimeout(timer);
    }
  }, [share.share_id, share.lifecycle]);

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 transition-all",
      isSuperseded ? 'border-amber-200/50 bg-amber-50/20' :
      isActionable ? 'border-[#D4B36A]/30 shadow-sm' : 'border-black/[0.05]'
    )} data-testid={`share-card-${share.share_id}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          isActionable ? 'bg-[#D4B36A]/10' : 'bg-slate-50'
        )}>
          <Icon className={cn("w-4 h-4", isActionable ? 'text-[#D4B36A]' : 'text-slate-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-bold text-[#0B0B0D] truncate">{share.title}</h4>
            {share.version > 1 && (
              <span className="text-[9px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-1.5 py-0.5 rounded">
                v{share.version}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400">{typeLabel}</span>
            {share.venue_name && (
              <span className="text-[10px] text-slate-400">&middot; {share.venue_name}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", lifecycleColor)}>
            {isSuperseded ? 'superseded' : share.lifecycle}
          </span>
          <span className="text-[9px] text-slate-400">{timeAgo(share.created_at)}</span>
        </div>
      </div>

      {/* Description / Customer Note */}
      {(share.description || share.customer_note) && (
        <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">
          {share.customer_note || share.description}
        </p>
      )}

      {/* Change Summary (for versioned items) */}
      {share.change_summary && share.version > 1 && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 mb-2">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">What changed</p>
          <p className="text-[11px] text-blue-800">{share.change_summary}</p>
        </div>
      )}

      {/* Content preview for shortlists */}
      {share.share_type === 'shortlist' && share.content?.venues && (
        <div className="space-y-1.5 mb-2">
          {share.content.venues.slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-[#0B0B0D] font-medium truncate">{v.name || v.venue_name}</span>
              {v.city && <span className="text-[10px] text-slate-400 flex-shrink-0">{v.city}</span>}
            </div>
          ))}
          {share.content.venues.length > 3 && (
            <p className="text-[10px] text-[#D4B36A] font-semibold">+{share.content.venues.length - 3} more venues</p>
          )}
        </div>
      )}

      {/* File download */}
      {share.file_path && (
        <a href={share.file_path} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 mb-2 hover:bg-slate-100 transition-colors"
          data-testid={`download-${share.share_id}`}>
          <Download className="w-4 h-4 text-[#D4B36A]" />
          <span className="text-[11px] font-medium text-[#0B0B0D] flex-1 truncate">{share.file_name || 'Download file'}</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      )}

      {/* Customer Response (if already responded) */}
      {share.customer_response && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 mb-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Your Response</p>
          <p className="text-[11px] text-emerald-800 font-medium">{share.customer_response.replace(/_/g, ' ')}</p>
          {share.customer_response_note && (
            <p className="text-[10px] text-emerald-700 mt-0.5">{share.customer_response_note}</p>
          )}
        </div>
      )}

      {/* Action button */}
      {!isSuperseded && !share.customer_response && (share.lifecycle === 'shared' || share.lifecycle === 'viewed') && (
        <button onClick={() => setRespondModal(share)}
          className="w-full h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 mt-2 active:scale-[0.98] transition-transform"
          data-testid={`respond-btn-${share.share_id}`}>
          <Send className="w-3.5 h-3.5" /> Respond
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAYMENTS TAB — Customer deposit payments
   ════════════════════════════════════════════════════════════ */
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handlePayNow = async (payment) => {
    setPaying(payment.payment_request_id);
    try {
      const res = await api.post(`/case-payments/${payment.payment_request_id}/checkout`);
      const data = res.data;

      if (data.is_test_mode) {
        // Test mode: simulate payment
        const simRes = await api.post(`/case-payments/${payment.payment_request_id}/simulate`);
        setPaymentSuccess(simRes.data);
        toast.success('Payment successful!');
        await fetchPayments();
      } else {
        // Production: launch Razorpay checkout
        await loadRazorpayScript();
        const options = {
          key: data.razorpay_key,
          amount: data.amount,
          currency: data.currency,
          name: data.name,
          description: data.description,
          order_id: data.order_id,
          prefill: data.prefill,
          theme: { color: '#0B0B0D' },
          handler: async (response) => {
            try {
              const verifyRes = await api.post(`/case-payments/${payment.payment_request_id}/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setPaymentSuccess(verifyRes.data);
              toast.success('Payment successful!');
              await fetchPayments();
            } catch (err) {
              toast.error('Payment verification failed. Contact support.');
            }
          },
          modal: {
            ondismiss: () => {
              setPaying(null);
              fetchPayments();
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', () => {
          toast.error('Payment failed. You can retry.');
          fetchPayments();
        });
        rzp.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not initiate payment');
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>;
  }

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <div className="space-y-4" data-testid="payment-success-view">
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0B0B0D] mb-1">Payment Successful</h3>
          <p className="text-[13px] text-slate-500 mb-4">Your booking is progressing!</p>
          <div className="bg-[#F8F7F4] rounded-xl p-4 space-y-2 text-left">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-400">Amount</span>
              <span className="font-bold text-[#0B0B0D]">₹{paymentSuccess.amount?.toLocaleString('en-IN')}</span>
            </div>
            {paymentSuccess.receipt_number && (
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-400">Receipt</span>
                <span className="font-mono text-[11px] text-[#0B0B0D]">{paymentSuccess.receipt_number}</span>
              </div>
            )}
            {paymentSuccess.paid_at && (
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-400">Date</span>
                <span className="text-[#0B0B0D]">{formatDate(paymentSuccess.paid_at)}</span>
              </div>
            )}
          </div>
          <button onClick={() => setPaymentSuccess(null)}
            className="mt-4 h-10 px-6 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-xl"
            data-testid="payment-success-dismiss">
            Done
          </button>
        </div>
      </div>
    );
  }

  // No payments state
  if (payments.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-payments">
        <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <h3 className="text-[14px] font-bold text-slate-500 mb-1">No payments yet</h3>
        <p className="text-[12px] text-slate-400">When a deposit is required, it will appear here.</p>
      </div>
    );
  }

  const pendingPayments = payments.filter(p => p.can_pay);
  const completedPayments = payments.filter(p => !p.can_pay);

  return (
    <div className="space-y-4" data-testid="payments-tab">
      {/* Summary Banner */}
      {summary && (summary.total_due > 0 || summary.total_paid > 0) && (
        <div className="bg-white rounded-xl border border-black/[0.05] p-4">
          <div className="grid grid-cols-2 gap-3">
            {summary.total_due > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Due</p>
                <p className="text-[20px] font-bold text-[#0B0B0D]">₹{summary.total_due.toLocaleString('en-IN')}</p>
              </div>
            )}
            {summary.total_paid > 0 && (
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Paid</p>
                <p className="text-[20px] font-bold text-[#0B0B0D]">₹{summary.total_paid.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Payments (Pay Now) */}
      {pendingPayments.map(p => (
        <PaymentDueCard key={p.payment_request_id} payment={p} onPay={handlePayNow} paying={paying === p.payment_request_id} />
      ))}

      {/* Completed Payments (History) */}
      {completedPayments.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Payment History</h4>
          <div className="space-y-2">
            {completedPayments.map(p => (
              <PaymentHistoryCard key={p.payment_request_id} payment={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentDueCard({ payment, onPay, paying }) {
  const STATUS_BG = {
    payment_requested: 'border-[#D4B36A]/30 bg-[#D4B36A]/[0.03]',
    payment_due: 'border-amber-300/50 bg-amber-50/30',
    payment_failed: 'border-red-200 bg-red-50/30',
  };

  return (
    <div className={cn("bg-white rounded-2xl border p-4", STATUS_BG[payment.status] || 'border-black/[0.05]')}
      data-testid={`payment-due-${payment.payment_request_id}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#0B0B0D] flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-[#D4B36A]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-bold text-[#0B0B0D]">{payment.purpose_label}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">{payment.status_label}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[18px] font-bold text-[#0B0B0D]">₹{payment.amount?.toLocaleString('en-IN')}</p>
          {payment.due_date && (
            <p className="text-[10px] text-amber-600">Due {formatDate(payment.due_date)}</p>
          )}
        </div>
      </div>

      {/* Customer-facing message */}
      {payment.status_message && (
        <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">{payment.status_message}</p>
      )}

      {/* Customer note from RM */}
      {payment.customer_note && (
        <div className="bg-[#F8F7F4] rounded-lg p-2.5 mb-3">
          <p className="text-[11px] text-[#5A5347] italic">"{payment.customer_note}"</p>
        </div>
      )}

      {/* Venue context */}
      {payment.venue_name && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3">
          <MapPin className="w-3 h-3" /> {payment.venue_name}
        </div>
      )}

      {/* Failed state warning */}
      {payment.status === 'payment_failed' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5 mb-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[11px] text-red-600">Payment could not be processed. Please retry — you will not be charged twice.</p>
        </div>
      )}

      {/* Pay Now button */}
      <button onClick={() => onPay(payment)} disabled={paying}
        className="w-full h-12 bg-[#0B0B0D] text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all"
        data-testid={`pay-now-${payment.payment_request_id}`}>
        {paying ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            {payment.status === 'payment_failed' ? 'Retry Payment' : 'Pay Now'}
          </>
        )}
      </button>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[9px] text-slate-400">
        <ShieldCheck className="w-3 h-3" /> Secured by Razorpay. Your card details are never stored by VenuLoQ.
      </div>
    </div>
  );
}

function PaymentHistoryCard({ payment }) {
  const isSuccess = payment.status === 'payment_success';
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] p-3 flex items-center gap-3"
      data-testid={`payment-history-${payment.payment_request_id}`}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        isSuccess ? 'bg-emerald-50' : 'bg-slate-50')}>
        {isSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Receipt className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-[#0B0B0D] truncate">{payment.purpose_label}</p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
          <span className={cn("font-semibold", isSuccess ? 'text-emerald-600' : 'text-slate-500')}>
            {payment.status_label}
          </span>
          {payment.paid_at && <span>&middot; {formatDate(payment.paid_at)}</span>}
        </div>
        {payment.receipt_number && (
          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{payment.receipt_number}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[14px] font-bold text-[#0B0B0D]">₹{payment.amount?.toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });
}

/* ════════════════════════════════════════════════════════════
   MESSAGES TAB — Case conversation thread
   ════════════════════════════════════════════════════════════ */
function MessagesTab({ caseId, user }) {
  const [messages, setMessages] = useState([]);
  const [rmName, setRmName] = useState('');
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = React.useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/case-thread/${caseId}/customer`);
      setMessages(res.data?.messages || []);
      setRmName(res.data?.rm_name || '');
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.post(`/case-thread/${caseId}/customer`, { text: trimmed });
      setText('');
      await fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col" data-testid="messages-tab">
      {/* Header info */}
      {rmName && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-6 h-6 rounded-full bg-[#0B0B0D] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {rmName.charAt(0)}
          </div>
          <p className="text-[11px] text-slate-400">Conversation with <span className="font-semibold text-slate-600">{rmName}</span></p>
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <h4 className="text-[13px] font-bold text-slate-500 mb-1">Start a conversation</h4>
          <p className="text-[11px] text-slate-400">Send a message to your relationship manager.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4 min-h-[200px]">
          {messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDateBreak = !prevMsg || formatDate(msg.created_at) !== formatDate(prevMsg.created_at);
            return (
              <React.Fragment key={msg.message_id}>
                {showDateBreak && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] text-slate-400 font-semibold">{formatDate(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                )}
                <MessageBubble msg={msg} />
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      <div className="sticky bottom-0 bg-[#F8F7F4] pt-2 pb-1 border-t border-black/[0.05]">
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 min-h-[40px] max-h-[100px] bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-[#0B0B0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
            data-testid="message-input" />
          <button onClick={handleSend} disabled={!text.trim() || sending}
            className="w-10 h-10 bg-[#0B0B0D] rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all"
            data-testid="send-message-btn">
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isCustomer = msg.is_customer;
  return (
    <div className={cn("flex", isCustomer ? "justify-end" : "justify-start")}
      data-testid={`msg-${msg.message_id}`}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3.5 py-2.5",
        isCustomer
          ? "bg-[#0B0B0D] text-white rounded-br-md"
          : "bg-white border border-black/[0.05] text-[#0B0B0D] rounded-bl-md"
      )}>
        {!isCustomer && (
          <p className={cn("text-[9px] font-bold uppercase tracking-wider mb-0.5",
            isCustomer ? "text-white/50" : "text-[#D4B36A]"
          )}>
            {msg.role_label}
          </p>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <p className={cn("text-[9px] mt-1", isCustomer ? "text-white/40" : "text-slate-400")}>
          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TIMELINE TAB
   ════════════════════════════════════════════════════════════ */
function TimelineTab({ timeline }) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-16" data-testid="no-timeline">
        <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <h3 className="text-[14px] font-bold text-slate-500">No timeline events yet</h3>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="timeline-tab">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />

      <div className="space-y-4">
        {timeline.map((event, idx) => (
          <div key={idx} className="flex items-start gap-3 relative">
            <div className={cn(
              "w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0 z-10",
              idx === 0 ? 'bg-[#D4B36A] text-white' : 'bg-white border-2 border-slate-200 text-slate-400'
            )}>
              {event.type?.includes('share') || event.type?.includes('file') ? (
                <FileText className="w-3.5 h-3.5" />
              ) : event.type?.includes('visit') ? (
                <MapPin className="w-3.5 h-3.5" />
              ) : event.type?.includes('stage') ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[12px] text-[#0B0B0D] font-medium">{event.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {event.timestamp && (
                  <span className="text-[10px] text-slate-400">{formatDate(event.timestamp)}</span>
                )}
                {event.by && (
                  <span className="text-[10px] text-slate-400">&middot; {event.by}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CONTACT RM TAB — Structured actions
   ════════════════════════════════════════════════════════════ */
function ContactRMTab({ caseData, caseId, onRefresh }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const STRUCTURED_ACTIONS = [
    { id: 'request_callback', label: 'Request a Callback', description: 'Ask your RM to call you', icon: PhoneCall, color: 'text-blue-600 bg-blue-50' },
    { id: 'need_more_options', label: 'Request More Info', description: 'Need more details or options', icon: HelpCircle, color: 'text-sky-600 bg-sky-50' },
    { id: 'request_visit', label: 'Request Site Visit', description: 'Schedule a venue visit', icon: MapPin, color: 'text-purple-600 bg-purple-50' },
    { id: 'accept_quote', label: 'Accept Quote & Proceed', description: 'Ready to move forward', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'have_question', label: 'Ask a Question', description: 'Raise a concern or question', icon: MessageCircle, color: 'text-amber-600 bg-amber-50' },
  ];

  const submitAction = async () => {
    if (!selectedAction) return;
    setSubmitting(true);
    try {
      await api.post(`/case-portal/cases/${caseId}/respond`, {
        response: selectedAction,
        note: note.trim() || null,
      });
      toast.success('Request sent to your relationship manager');
      setSelectedAction(null);
      setNote('');
      await onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="contact-rm-tab">
      {/* RM Info */}
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
              <a href={`tel:${caseData.rm_phone}`}
                className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center"
                data-testid="call-rm-btn">
                <Phone className="w-4 h-4 text-emerald-600" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Structured Actions */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">What would you like to do?</p>
        <div className="space-y-2">
          {STRUCTURED_ACTIONS.map(action => (
            <button key={action.id} onClick={() => setSelectedAction(selectedAction === action.id ? null : action.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                selectedAction === action.id
                  ? 'border-[#D4B36A] bg-[#D4B36A]/[0.04] shadow-sm'
                  : 'border-black/[0.05] bg-white hover:border-slate-200'
              )} data-testid={`action-${action.id}`}>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", action.color)}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#0B0B0D]">{action.label}</p>
                <p className="text-[10px] text-slate-400">{action.description}</p>
              </div>
              {selectedAction === action.id && (
                <CheckCircle2 className="w-5 h-5 text-[#D4B36A] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Note input + Submit (visible when action selected) */}
      {selectedAction && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Add a note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any details to help your RM..."
              className="w-full h-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-[#0B0B0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
              data-testid="action-note-input" />
          </div>
          <button onClick={submitAction} disabled={submitting}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all"
            data-testid="submit-action-btn">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Send className="w-4 h-4" /> Send Request</>
            )}
          </button>
        </div>
      )}

      {/* External fallback */}
      {caseData.rm_phone && (
        <div className="pt-3 border-t border-black/[0.04]">
          <p className="text-[10px] text-slate-400 mb-2">Or reach out directly:</p>
          <div className="flex gap-2">
            <a href={`tel:${caseData.rm_phone}`}
              className="flex-1 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 transition-colors"
              data-testid="direct-call-btn">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a href={`https://wa.me/${caseData.rm_phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 transition-colors"
              data-testid="direct-wa-btn">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   RESPOND MODAL
   ════════════════════════════════════════════════════════════ */
function RespondModal({ share, caseId, onClose, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post(`/case-portal/cases/${caseId}/respond`, {
        response: selected,
        note: note.trim() || null,
        share_id: share.share_id,
      });
      toast.success('Response recorded');
      onClose();
      await onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to respond');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}
      data-testid="respond-modal">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/[0.05] px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-[14px] font-bold text-[#0B0B0D]" data-testid="respond-modal-title">Respond to: {share.title}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{SHARE_TYPE_LABELS[share.share_type] || share.share_type}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100"
            data-testid="respond-modal-close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Response options */}
        <div className="px-4 py-4 space-y-2">
          {RESPONSE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setSelected(opt.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                selected === opt.id ? 'border-[#D4B36A] bg-[#D4B36A]/[0.04]' : 'border-black/[0.05] hover:border-slate-200'
              )} data-testid={`response-option-${opt.id}`}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0", opt.color)}>
                <opt.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[12px] font-medium text-[#0B0B0D]">{opt.label}</span>
              {selected === opt.id && <CheckCircle2 className="w-4 h-4 text-[#D4B36A] ml-auto" />}
            </button>
          ))}

          {/* Note */}
          <div className="pt-2">
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-[#0B0B0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
              data-testid="respond-note-input" />
          </div>
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-white border-t border-black/[0.05] px-4 py-3">
          <button onClick={handleSubmit} disabled={!selected || submitting}
            className="w-full h-11 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-40 transition-all"
            data-testid="respond-submit-btn">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Send className="w-3.5 h-3.5" /> Send Response</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
