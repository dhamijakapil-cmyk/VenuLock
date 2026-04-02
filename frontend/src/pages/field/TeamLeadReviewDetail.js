import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Phone, Mail, User, Building2, Users,
  IndianRupee, Camera, FileText, Clock, Zap, CheckCircle2,
  XCircle, AlertCircle, AlertTriangle, Send, ArrowDown,
  Archive, ChevronDown, Loader2, Image as ImageIcon,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const POSTURE_STYLE = {
  complete: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  incomplete: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
  weak: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
  missing: { bg: 'bg-slate-100', text: 'text-slate-500', icon: XCircle },
};

const MANDATORY_FIELDS = [
  { key: 'venue_name', label: 'Venue Name' },
  { key: 'owner_name', label: 'Owner Name' },
  { key: 'owner_phone', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'locality', label: 'Locality' },
  { key: 'venue_type', label: 'Venue Type' },
  { key: 'capacity_min', label: 'Min Capacity' },
  { key: 'capacity_max', label: 'Max Capacity' },
];

const COMMERCIAL_FIELDS = [
  { key: 'owner_interest', label: 'Owner Interest' },
  { key: 'pricing_band_min', label: 'Pricing' },
];

const FOLLOWUP_FIELDS = [
  { key: 'meeting_outcome', label: 'Meeting Outcome' },
  { key: 'next_followup_date', label: 'Follow-up Date' },
];

function posture(completeness) {
  if (!completeness) return { mandatory: 'missing', media: 'missing', commercial: 'missing', followup: 'missing' };
  const m = completeness.mandatory;
  const med = completeness.media;
  const c = completeness.commercial;
  const f = completeness.followup;
  return {
    mandatory: m?.complete ? 'complete' : 'incomplete',
    media: med?.complete ? 'complete' : med?.count > 0 ? 'weak' : 'missing',
    commercial: c?.complete ? 'complete' : c?.filled > 0 ? 'partial' : 'missing',
    followup: f?.complete ? 'complete' : f?.filled > 0 ? 'partial' : 'missing',
  };
}

function PostureBlock({ label, value, detail }) {
  const s = POSTURE_STYLE[value] || POSTURE_STYLE.missing;
  const Icon = s.icon;
  return (
    <div className={`flex-1 ${s.bg} rounded-xl p-2.5`}>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={`w-3 h-3 ${s.text}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wide ${s.text}`} style={sans}>{label}</span>
      </div>
      <p className={`text-[11px] font-semibold capitalize ${s.text}`} style={sans}>{value}</p>
      {detail && <p className="text-[9px] text-[#64748B] mt-0.5" style={sans}>{detail}</p>}
    </div>
  );
}

export default function TeamLeadReviewDetail() {
  const navigate = useNavigate();
  const { acqId } = useParams();
  const { user } = useAuth();
  const [acq, setAcq] = useState(null);
  const [loading, setLoading] = useState(true);

  // Action state
  const [actionModal, setActionModal] = useState(null); // 'send_back' | 'reject' | 'pass_data' | null
  const [reason, setReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/acquisitions/${acqId}`)
      .then(res => setAcq(res.data))
      .catch(() => { toast.error('Record not found'); navigate('/team/field/review'); })
      .finally(() => setLoading(false));
  }, [acqId, navigate]);

  const performAction = async (newStatus) => {
    if ((newStatus === 'sent_back_to_specialist' || newStatus === 'rejected') && !reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/acquisitions/${acqId}/status`, {
        new_status: newStatus,
        reason: reason.trim() || undefined,
        notes: actionNotes.trim() || undefined,
      });
      const labels = {
        sent_back_to_specialist: 'Sent back to specialist',
        under_data_refinement: 'Passed to Data Team',
        rejected: 'Rejected',
      };
      toast.success(labels[newStatus] || 'Updated');
      navigate('/team/field/review');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
        <div className="w-6 h-6 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!acq) return null;

  const p = posture(acq.completeness);
  const isQuick = acq.capture_mode === 'quick';
  const canAct = acq.status === 'submitted_for_review';
  const photoCount = acq.photos?.length || 0;

  // Missing mandatory fields
  const missingMandatory = MANDATORY_FIELDS.filter(f => !acq[f.key] && acq[f.key] !== 0);
  const missingCommercial = COMMERCIAL_FIELDS.filter(f => !acq[f.key]);
  const missingFollowup = FOLLOWUP_FIELDS.filter(f => !acq[f.key]);

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="team-lead-review-detail">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <button onClick={() => navigate('/team/field/review')} className="flex items-center gap-1.5 text-white/50 mb-2" data-testid="review-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px]" style={sans}>Review Queue</span>
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-[18px] font-bold text-white truncate flex-1" style={sans}>{acq.venue_name}</h1>
          {isQuick && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#D4B36A]/20 rounded-full text-[9px] font-bold text-[#D4B36A]" style={sans}>
              <Zap className="w-3 h-3" /> QUICK
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/50 mt-0.5" style={sans}>
          {acq.locality && `${acq.locality}, `}{acq.city || '—'} &middot; {acq.venue_type?.replace(/_/g, ' ') || '—'}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4 pb-40">
        {/* Posture Grid */}
        <div className="grid grid-cols-2 gap-2" data-testid="posture-grid">
          <PostureBlock label="Mandatory" value={p.mandatory}
            detail={p.mandatory === 'complete' ? '8/8 fields' : `${acq.completeness?.mandatory?.filled || 0}/8 fields`} />
          <PostureBlock label="Media" value={p.media}
            detail={`${photoCount} photo${photoCount !== 1 ? 's' : ''}`} />
          <PostureBlock label="Commercial" value={p.commercial}
            detail={acq.completeness?.commercial ? `${acq.completeness.commercial.filled}/${acq.completeness.commercial.total}` : '—'} />
          <PostureBlock label="Notes/Follow-up" value={p.followup}
            detail={acq.completeness?.followup ? `${acq.completeness.followup.filled}/${acq.completeness.followup.total}` : '—'} />
        </div>

        {/* Capture Source */}
        <Section title="Capture Info">
          <InfoRow icon={User} label="Specialist" value={acq.created_by_name || '—'} />
          <InfoRow icon={Zap} label="Capture Mode" value={isQuick ? 'Quick Capture' : 'Full Capture'} />
          <InfoRow icon={Clock} label="Created" value={formatDate(acq.created_at)} />
          <InfoRow icon={Clock} label="Last Updated" value={formatDate(acq.updated_at)} />
        </Section>

        {/* Contact Details */}
        <Section title="Contact">
          <InfoRow icon={User} label="Owner" value={acq.owner_name || '—'} />
          <InfoRow icon={Phone} label="Phone" value={acq.owner_phone || '—'} />
          {acq.owner_email && <InfoRow icon={Mail} label="Email" value={acq.owner_email} />}
          {acq.is_decision_maker !== null && (
            <InfoRow icon={User} label="Decision Maker" value={acq.is_decision_maker ? 'Yes' : 'No / Unsure'} />
          )}
        </Section>

        {/* Venue Details */}
        <Section title="Venue Details">
          <InfoRow icon={Building2} label="Type" value={acq.venue_type?.replace(/_/g, ' ') || '—'} />
          <InfoRow icon={MapPin} label="Location" value={`${acq.locality || '—'}, ${acq.city || '—'}`} />
          {acq.address && <InfoRow icon={MapPin} label="Address" value={acq.address} />}
          {acq.latitude && <InfoRow icon={MapPin} label="GPS" value={`${acq.latitude.toFixed(5)}, ${acq.longitude?.toFixed(5)}`} />}
          <InfoRow icon={Users} label="Capacity" value={acq.capacity_min || acq.capacity_max ? `${acq.capacity_min || '—'} – ${acq.capacity_max || '—'}` : '—'} />
          {acq.indoor_outdoor && <InfoRow icon={Building2} label="Setting" value={acq.indoor_outdoor} />}
        </Section>

        {/* Commercial */}
        <Section title="Commercial">
          <InfoRow icon={IndianRupee} label="Pricing" value={acq.pricing_band_min ? `₹${acq.pricing_band_min}${acq.pricing_band_max ? ` – ₹${acq.pricing_band_max}` : '+'}` : '—'} />
          <InfoRow icon={AlertCircle} label="Interest" value={acq.owner_interest?.replace(/_/g, ' ') || '—'} highlight={acq.owner_interest === 'hot' ? 'emerald' : acq.owner_interest === 'cold' ? 'blue' : undefined} />
          {acq.meeting_outcome && <InfoRow icon={FileText} label="Outcome" value={acq.meeting_outcome} />}
          {acq.next_followup_date && <InfoRow icon={Clock} label="Follow-up" value={acq.next_followup_date} />}
        </Section>

        {/* Photos */}
        {photoCount > 0 && (
          <Section title={`Photos (${photoCount})`}>
            <div className="grid grid-cols-3 gap-1.5">
              {acq.photos.map((ph, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={ph.url?.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ph.url}` : ph.url}
                    alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {acq.notes && (
          <Section title="Specialist Notes">
            <p className="text-[12px] text-[#0B0B0D] leading-relaxed" style={sans}>{acq.notes}</p>
          </Section>
        )}

        {/* Missing Items Checklist */}
        {(missingMandatory.length > 0 || missingCommercial.length > 0 || missingFollowup.length > 0) && (
          <Section title="Missing Items">
            <div className="space-y-1">
              {missingMandatory.map(f => (
                <div key={f.key} className="flex items-center gap-2 py-1">
                  <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-[11px] text-red-600 font-medium" style={sans}>{f.label}</span>
                  <span className="text-[9px] text-red-400 ml-auto" style={sans}>mandatory</span>
                </div>
              ))}
              {missingCommercial.map(f => (
                <div key={f.key} className="flex items-center gap-2 py-1">
                  <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] text-amber-700 font-medium" style={sans}>{f.label}</span>
                  <span className="text-[9px] text-amber-400 ml-auto" style={sans}>commercial</span>
                </div>
              ))}
              {missingFollowup.map(f => (
                <div key={f.key} className="flex items-center gap-2 py-1">
                  <AlertCircle className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 font-medium" style={sans}>{f.label}</span>
                  <span className="text-[9px] text-slate-400 ml-auto" style={sans}>follow-up</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Activity Log */}
        <Section title="Activity Log">
          <div className="space-y-2">
            {(acq.history || []).slice().reverse().map((h, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 ${i === 0 ? 'bg-[#D4B36A]' : 'bg-slate-300'}`} />
                  {i < (acq.history.length - 1) && <div className="w-px flex-1 bg-slate-200 mt-0.5" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-[11px] font-semibold text-[#0B0B0D]" style={sans}>
                    {h.action?.includes('status_change') ? h.action.split(':')[1] : h.action || h.status}
                  </p>
                  <p className="text-[9px] text-[#64748B]" style={sans}>
                    {h.by_name || h.by_role} &middot; {formatDate(h.timestamp)}
                  </p>
                  {h.reason && (
                    <div className="mt-1 px-2 py-1 bg-red-50 rounded border border-red-100">
                      <p className="text-[10px] text-red-600" style={sans}>Reason: {h.reason}</p>
                    </div>
                  )}
                  {h.notes && <p className="text-[10px] text-[#64748B] mt-0.5" style={sans}>Note: {h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Action Bar — only for submitted_for_review */}
      {canAct && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3 space-y-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}
          data-testid="action-bar">
          <div className="flex gap-2">
            <button onClick={() => setActionModal('send_back')}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-[12px] font-bold active:scale-[0.98] transition-transform"
              data-testid="action-send-back" style={sans}>
              <Send className="w-3.5 h-3.5 rotate-180" /> Send Back
            </button>
            <button onClick={() => setActionModal('pass_data')}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#0B0B0D] text-white text-[12px] font-bold active:scale-[0.98] transition-transform"
              data-testid="action-pass-data" style={sans}>
              <ArrowDown className="w-3.5 h-3.5" /> Pass to Data Team
            </button>
          </div>
          <button onClick={() => setActionModal('reject')}
            className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 text-red-500 text-[11px] font-bold active:scale-[0.98] transition-colors"
            data-testid="action-reject" style={sans}>
            <Archive className="w-3.5 h-3.5" /> Reject / Archive
          </button>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" data-testid="action-modal"
          onClick={(e) => { if (e.target === e.currentTarget) setActionModal(null); }}>
          <div className="w-full max-w-lg bg-white rounded-t-2xl px-4 pt-4 pb-6 animate-in slide-in-from-bottom"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 24px)' }}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-[#0B0B0D] mb-1" style={sans}>
              {actionModal === 'send_back' && 'Send Back to Specialist'}
              {actionModal === 'pass_data' && 'Pass to Data Team'}
              {actionModal === 'reject' && 'Reject / Archive'}
            </h3>
            <p className="text-[11px] text-[#64748B] mb-3" style={sans}>
              {actionModal === 'send_back' && 'Specify what the specialist needs to fix or add.'}
              {actionModal === 'pass_data' && 'This will move the record to Data Team for refinement.'}
              {actionModal === 'reject' && 'This record will be archived. Provide a reason.'}
            </p>

            {(actionModal === 'send_back' || actionModal === 'reject') && (
              <div className="mb-3">
                <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder={actionModal === 'send_back' ? 'e.g. Missing photos, please capture facade and hall shots' : 'e.g. Venue closed permanently'}
                  className="w-full h-20 px-3 py-2 border border-black/[0.08] rounded-xl text-[13px] resize-none outline-none focus:border-[#D4B36A]"
                  data-testid="action-reason" style={sans} />
              </div>
            )}

            <div className="mb-4">
              <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                Additional Notes (optional)
              </label>
              <input value={actionNotes} onChange={e => setActionNotes(e.target.value)}
                placeholder="Any context..." className="w-full h-10 px-3 border border-black/[0.08] rounded-xl text-[13px] outline-none focus:border-[#D4B36A]"
                data-testid="action-notes" style={sans} />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setActionModal(null); setReason(''); setActionNotes(''); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-[#64748B] text-[13px] font-medium" style={sans}>
                Cancel
              </button>
              <button onClick={() => {
                  const statusMap = { send_back: 'sent_back_to_specialist', pass_data: 'under_data_refinement', reject: 'rejected' };
                  performAction(statusMap[actionModal]);
                }}
                disabled={submitting}
                className={`flex-1 h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition-transform ${
                  actionModal === 'reject' ? 'bg-red-500 text-white' : actionModal === 'send_back' ? 'bg-amber-500 text-white' : 'bg-[#0B0B0D] text-white'
                }`}
                data-testid="action-confirm" style={sans}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {actionModal === 'send_back' && 'Send Back'}
                {actionModal === 'pass_data' && 'Confirm'}
                {actionModal === 'reject' && 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-black/[0.04]">
        <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em]" style={sans}>{title}</h3>
      </div>
      <div className="px-3.5 py-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[#9CA3AF] block" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span className={`text-[12px] font-medium capitalize ${
          highlight === 'emerald' ? 'text-emerald-600' : highlight === 'blue' ? 'text-blue-600' : 'text-[#0B0B0D]'
        }`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}
