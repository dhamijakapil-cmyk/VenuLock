import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, RefreshCw, CheckCircle2, XCircle, Clock,
  Eye, Loader2, Shield, ExternalLink, Copy, MessageCircle, Mail,
  AlertTriangle,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_LABEL = {
  approved: { label: 'Approved — Send Link', color: 'bg-emerald-50 text-emerald-700' },
  owner_onboarding_pending: { label: 'Pending — Send Link', color: 'bg-amber-50 text-amber-700' },
  owner_onboarding_sent: { label: 'Link Sent — Awaiting', color: 'bg-blue-50 text-blue-700' },
  owner_onboarding_viewed: { label: 'Owner Viewed', color: 'bg-indigo-50 text-indigo-700' },
  owner_onboarding_completed: { label: 'Accepted', color: 'bg-emerald-50 text-emerald-700' },
  owner_onboarding_declined: { label: 'Declined', color: 'bg-red-50 text-red-600' },
  owner_onboarding_expired: { label: 'Expired', color: 'bg-slate-100 text-slate-500' },
};

export default function OnboardingMonitor() {
  const navigate = useNavigate();
  const { acqId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState([]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`/onboarding/status/${acqId}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load');
      navigate('/team/field/approve');
    } finally { setLoading(false); }
  }, [acqId, navigate]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const sendOnboarding = async () => {
    if (selectedChannels.length === 0) {
      toast.error('Select at least one channel');
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/onboarding/send/${acqId}`, { channels: selectedChannels });
      toast.success('Onboarding link sent');

      // Open WhatsApp if link available
      if (res.data.whatsapp_link && selectedChannels.includes('whatsapp')) {
        window.open(res.data.whatsapp_link, '_blank');
      }

      // Copy link to clipboard
      if (res.data.onboarding_link) {
        try {
          await navigator.clipboard.writeText(res.data.onboarding_link);
          toast.success('Link copied to clipboard');
        } catch {}
      }

      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Send failed');
    } finally { setSending(false); }
  };

  const toggleChannel = (ch) => {
    setSelectedChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
        <div className="w-6 h-6 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const ob = data.onboarding || {};
  const st = STATUS_LABEL[data.status] || { label: data.status, color: 'bg-slate-100 text-slate-500' };
  const canSend = ['approved', 'owner_onboarding_pending', 'owner_onboarding_sent', 'owner_onboarding_expired'].includes(data.status);
  const hasPhone = !!data.owner_phone;
  const hasEmail = !!data.owner_email;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="onboarding-monitor">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <button onClick={() => navigate('/team/field/approve')} className="flex items-center gap-1.5 text-white/50 mb-2" data-testid="monitor-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px]" style={sans}>Approval Queue</span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-[#D4B36A]" />
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]" style={sans}>Owner Onboarding</p>
        </div>
        <h1 className="text-[18px] font-bold text-white truncate" style={sans}>{data.venue_name}</h1>
        <p className="text-[11px] text-white/40 mt-0.5" style={sans}>Owner: {data.owner_name || '—'}</p>
      </div>

      <div className="px-4 py-4 space-y-4 pb-8">
        {/* Status Banner */}
        <div className={`rounded-xl p-3.5 ${st.color}`} data-testid="onboarding-status">
          <div className="flex items-center gap-2">
            {data.status.includes('completed') ? <CheckCircle2 className="w-5 h-5" /> :
             data.status.includes('declined') ? <XCircle className="w-5 h-5" /> :
             data.status.includes('expired') ? <Clock className="w-5 h-5" /> :
             data.status.includes('viewed') ? <Eye className="w-5 h-5" /> :
             <Clock className="w-5 h-5" />}
            <h3 className="text-[14px] font-bold" style={sans}>{st.label}</h3>
          </div>
        </div>

        {/* Onboarding Timeline */}
        <div className="bg-white rounded-xl border border-black/[0.05] p-3.5">
          <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-3" style={sans}>Onboarding Progress</h3>
          <div className="space-y-2">
            <TimelineStep label="Link Generated" timestamp={ob.issued_at} by={ob.issued_by} done={!!ob.issued_at} />
            <TimelineStep label="Link Sent" timestamp={ob.sends?.length > 0 ? ob.sends[ob.sends.length-1].sent_at : null}
              by={ob.sends?.length > 0 ? `via ${ob.sends[ob.sends.length-1].channels?.join(', ')}` : null}
              done={!!ob.issued_at} />
            <TimelineStep label="Owner Viewed" timestamp={ob.viewed_at} done={!!ob.viewed_at} />
            <TimelineStep label="Owner Accepted" timestamp={ob.accepted_at} by={ob.signer_name ? `by ${ob.signer_name}` : null} done={!!ob.accepted_at} />
            {ob.declined_at && <TimelineStep label="Owner Declined" timestamp={ob.declined_at} by={ob.decline_reason} done={true} negative />}
          </div>
        </div>

        {/* Send History */}
        {ob.sends?.length > 0 && (
          <div className="bg-white rounded-xl border border-black/[0.05] p-3.5">
            <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-2" style={sans}>
              Send History ({ob.sends.length})
            </h3>
            <div className="space-y-1.5">
              {ob.sends.slice().reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]" style={sans}>
                  <div className="flex items-center gap-2">
                    {s.channels?.includes('whatsapp') && <MessageCircle className="w-3 h-3 text-emerald-500" />}
                    {s.channels?.includes('email') && <Mail className="w-3 h-3 text-blue-500" />}
                    <span className="text-[#0B0B0D] font-medium">{s.channels?.join(' + ')}</span>
                  </div>
                  <span className="text-[#9CA3AF] text-[10px]">{formatDate(s.sent_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acceptance Record */}
        {ob.accepted_at && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3.5">
            <h3 className="text-[12px] font-bold text-emerald-700 uppercase tracking-[0.08em] mb-2" style={sans}>Acceptance Record</h3>
            <div className="space-y-1 text-[11px]" style={sans}>
              <p className="text-emerald-700"><strong>Signer:</strong> {ob.signer_name}</p>
              <p className="text-emerald-700"><strong>Accepted:</strong> {formatDate(ob.accepted_at)}</p>
              <p className="text-emerald-700"><strong>Terms Version:</strong> {ob.terms_version}</p>
            </div>
          </div>
        )}

        {/* Send/Resend Panel */}
        {canSend && (
          <div className="bg-white rounded-xl border border-black/[0.05] p-3.5">
            <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-3" style={sans}>
              {ob.sends?.length > 0 ? 'Resend Link' : 'Send Onboarding Link'}
            </h3>

            {/* Channel selection */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => toggleChannel('whatsapp')} disabled={!hasPhone}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[12px] font-bold transition-all ${
                  selectedChannels.includes('whatsapp')
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : hasPhone ? 'bg-white text-[#64748B] border-slate-200' : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                }`} style={sans} data-testid="channel-whatsapp">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={() => toggleChannel('email')} disabled={!hasEmail}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[12px] font-bold transition-all ${
                  selectedChannels.includes('email')
                    ? 'bg-blue-500 text-white border-blue-500'
                    : hasEmail ? 'bg-white text-[#64748B] border-slate-200' : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                }`} style={sans} data-testid="channel-email">
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
            </div>

            {!hasPhone && !hasEmail && (
              <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] text-amber-700 font-medium" style={sans}>No phone or email on record</span>
              </div>
            )}

            <button onClick={sendOnboarding} disabled={sending || selectedChannels.length === 0}
              className="w-full h-11 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
              data-testid="send-btn" style={sans}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {ob.sends?.length > 0 ? 'Resend Link' : 'Send Link'}
            </button>

            {ob.token_expires_at && (
              <p className="text-[9px] text-[#9CA3AF] text-center mt-1.5" style={sans}>
                Expires: {formatDate(ob.token_expires_at)}
              </p>
            )}
          </div>
        )}

        {/* Refresh */}
        <button onClick={fetchStatus}
          className="w-full flex items-center justify-center gap-2 py-2 text-[11px] text-[#64748B] font-medium"
          data-testid="refresh-btn" style={sans}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </button>
      </div>
    </div>
  );
}

function TimelineStep({ label, timestamp, by, done, negative }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
        negative ? 'bg-red-400' : done ? 'bg-emerald-400' : 'bg-slate-200'
      }`} />
      <div className="flex-1">
        <p className={`text-[11px] font-semibold ${done ? 'text-[#0B0B0D]' : 'text-[#9CA3AF]'}`} style={sans}>{label}</p>
        {timestamp && <p className="text-[9px] text-[#9CA3AF]" style={sans}>{formatDate(timestamp)}{by ? ` — ${by}` : ''}</p>}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
