import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  Loader2, Send, Archive, Shield, Zap, Camera, MapPin, Phone,
  User, Building2, Users, IndianRupee, FileText, Clock,
  Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const POSTURE_STYLE = {
  complete: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, label: 'Complete' },
  incomplete: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle, label: 'Incomplete' },
  weak: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle, label: 'Weak' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle, label: 'Partial' },
  missing: { bg: 'bg-slate-100', text: 'text-slate-500', icon: XCircle, label: 'Missing' },
};

const READINESS_STYLE = {
  ready: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Ready to Approve', icon: CheckCircle2 },
  almost_ready: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Soft Warnings', icon: AlertCircle },
  needs_fixes: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Needs Fixes', icon: AlertTriangle },
  not_ready: { bg: 'bg-red-100 border-red-300', text: 'text-red-700', label: 'Hard Blockers', icon: XCircle },
  unknown: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', label: 'Checking...', icon: AlertCircle },
};

const SEND_BACK_TARGETS = [
  { value: 'under_data_refinement', label: 'Data Team', desc: 'Data quality or structure issue' },
  { value: 'sent_back_to_specialist', label: 'Specialist', desc: 'Needs field recollection' },
];

export default function ManagerApprovalDetail() {
  const navigate = useNavigate();
  const { acqId } = useParams();
  const [acq, setAcq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assist, setAssist] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);

  // Action state
  const [actionModal, setActionModal] = useState(null); // 'approve' | 'send_back' | 'reject'
  const [reason, setReason] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [sendBackTarget, setSendBackTarget] = useState('under_data_refinement');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/acquisitions/${acqId}`)
      .then(res => setAcq(res.data))
      .catch(() => { toast.error('Record not found'); navigate('/team/field/approve'); })
      .finally(() => setLoading(false));
  }, [acqId, navigate]);

  const fetchAssist = useCallback(async () => {
    setAssistLoading(true);
    try {
      const res = await api.get(`/acquisitions/venus-assist/${acqId}`);
      setAssist(res.data);
    } catch {} finally { setAssistLoading(false); }
  }, [acqId]);

  useEffect(() => { if (!loading && acq) fetchAssist(); }, [loading, acq, fetchAssist]);

  const performAction = async (newStatus) => {
    if ((newStatus === 'sent_back_to_specialist' || newStatus === 'under_data_refinement' || newStatus === 'rejected') && !reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/acquisitions/${acqId}/status`, {
        new_status: newStatus,
        reason: newStatus === 'approved' ? (approveNote.trim() || undefined) : reason.trim(),
        notes: newStatus === 'approved' ? approveNote.trim() || undefined : undefined,
      });
      const labels = {
        approved: 'Approved',
        under_data_refinement: 'Sent back to Data Team',
        sent_back_to_specialist: 'Sent back to Specialist',
        rejected: 'Rejected',
      };
      toast.success(labels[newStatus] || 'Updated');
      navigate('/team/field/approve');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
        <div className="w-6 h-6 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!acq) return null;

  const canAct = acq.status === 'awaiting_manager_approval';
  const isApproved = acq.status === 'approved';
  const isOnboarding = acq.status?.startsWith('owner_onboarding_');
  const isQuick = acq.capture_mode === 'quick';
  const photoCount = acq.photos?.length || 0;
  const readiness = assist?.readiness || 'unknown';
  const rs = READINESS_STYLE[readiness] || READINESS_STYLE.unknown;
  const RsIcon = rs.icon;

  // Compute posture
  const comp = acq.completeness || {};
  const fieldPosture = comp.mandatory?.complete ? 'complete' : 'incomplete';
  const mediaPosture = comp.media?.complete ? 'complete' : comp.media?.count > 0 ? 'weak' : 'missing';
  const commercialPosture = comp.commercial?.complete ? 'complete' : comp.commercial?.filled > 0 ? 'partial' : 'missing';
  const notesPosture = comp.followup?.complete ? 'complete' : comp.followup?.filled > 0 ? 'partial' : 'missing';

  // Summary fields
  const hasSummary = acq.publishable_summary && acq.publishable_summary.length > 10;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="manager-approval-detail">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/team/field/approve')} className="flex items-center gap-1.5 text-white/50" data-testid="mgr-detail-back">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[11px]" style={sans}>Queue</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#D4B36A]" />
            <span className="text-[10px] font-bold text-[#D4B36A] uppercase tracking-[0.1em]" style={sans}>Final Gate</span>
          </div>
        </div>
        <h1 className="text-[18px] font-bold text-white truncate" style={sans}>{acq.venue_name}</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-white/50" style={sans}>
            {acq.locality && `${acq.locality}, `}{acq.city || '—'} &middot; {acq.venue_type?.replace(/_/g, ' ') || '—'}
          </p>
          {isQuick && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#D4B36A]/20 rounded-full text-[8px] font-bold text-[#D4B36A]" style={sans}>
              <Zap className="w-2.5 h-2.5" /> QUICK
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">

        {/* Decision Posture — top-of-page */}
        <div className={`rounded-xl border p-3.5 ${rs.bg}`} data-testid="readiness-banner">
          <div className="flex items-center gap-2 mb-2">
            <RsIcon className={`w-5 h-5 ${rs.text}`} />
            <h3 className={`text-[14px] font-bold ${rs.text}`} style={sans}>{rs.label}</h3>
          </div>
          {assistLoading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4B36A]" />
              <span className="text-[11px] text-[#64748B]" style={sans}>Running Ven-Us checks...</span>
            </div>
          ) : assist ? (
            <div className="space-y-1.5">
              {assist.blockers.length > 0 && (
                <div className="space-y-1">
                  {assist.blockers.map((b, i) => (
                    <div key={`b-${i}`} className="flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-[11px] text-red-700 font-medium" style={sans}>{b.message}</span>
                      <span className="text-[8px] text-red-400 font-bold uppercase ml-auto" style={sans}>BLOCKER</span>
                    </div>
                  ))}
                </div>
              )}
              {assist.issues.filter(i => i.severity !== 'low').map((issue, i) => (
                <div key={`i-${i}`} className="flex items-center gap-2">
                  <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${issue.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className={`text-[11px] font-medium ${issue.severity === 'high' ? 'text-red-600' : 'text-amber-700'}`} style={sans}>{issue.message}</span>
                  <span className={`text-[8px] font-bold uppercase ml-auto ${issue.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} style={sans}>{issue.severity}</span>
                </div>
              ))}
              {assist.issues.filter(i => i.severity === 'low').length > 0 && (
                <p className="text-[10px] text-[#9CA3AF]" style={sans}>
                  + {assist.issues.filter(i => i.severity === 'low').length} minor items
                </p>
              )}
              <div className="pt-1.5 border-t border-black/[0.04] flex gap-4 text-[9px] text-[#9CA3AF]" style={sans}>
                <span>{assist.summary.blocker_count} blockers</span>
                <span>{assist.summary.high_count + assist.summary.medium_count} issues</span>
                <span>{assist.summary.suggestion_count} suggestions</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Posture Grid */}
        <div className="grid grid-cols-2 gap-2" data-testid="posture-grid">
          <PostureCard label="Field Completeness" value={fieldPosture}
            detail={`${comp.mandatory?.filled || 0}/${comp.mandatory?.total || 8} fields`} />
          <PostureCard label="Media Quality" value={mediaPosture}
            detail={`${photoCount} photo${photoCount !== 1 ? 's' : ''}`} />
          <PostureCard label="Commercial Summary" value={commercialPosture}
            detail={comp.commercial ? `${comp.commercial.filled}/${comp.commercial.total}` : '—'} />
          <PostureCard label="Publishability" value={hasSummary ? 'complete' : 'missing'}
            detail={hasSummary ? 'Has listing copy' : 'No listing copy'} />
        </div>

        {/* Core Summary */}
        <Section title="Venue Summary" defaultOpen>
          <InfoRow icon={Building2} label="Type" value={acq.venue_type?.replace(/_/g, ' ') || '—'} />
          <InfoRow icon={MapPin} label="Location" value={`${acq.locality || '—'}, ${acq.city || '—'}`} />
          {acq.address && <InfoRow icon={MapPin} label="Address" value={acq.address} />}
          <InfoRow icon={Users} label="Capacity" value={acq.capacity_min || acq.capacity_max ? `${acq.capacity_min || '—'} – ${acq.capacity_max || '—'}` : '—'} />
          <InfoRow icon={IndianRupee} label="Pricing" value={acq.pricing_band_min ? `₹${acq.pricing_band_min}${acq.pricing_band_max ? ` – ₹${acq.pricing_band_max}` : '+'}` : '—'} />
          {acq.indoor_outdoor && <InfoRow icon={Building2} label="Setting" value={acq.indoor_outdoor} />}
        </Section>

        {/* Contact & Commercial */}
        <Section title="Contact & Commercial">
          <InfoRow icon={User} label="Owner" value={acq.owner_name || '—'} />
          <InfoRow icon={Phone} label="Phone" value={acq.owner_phone || '—'} />
          <InfoRow icon={AlertCircle} label="Interest"
            value={acq.owner_interest?.replace(/_/g, ' ') || '—'}
            highlight={acq.owner_interest === 'hot' ? 'emerald' : acq.owner_interest === 'cold' ? 'blue' : undefined} />
          {acq.meeting_outcome && <InfoRow icon={FileText} label="Outcome" value={acq.meeting_outcome} />}
          {acq.next_followup_date && <InfoRow icon={Clock} label="Follow-up" value={acq.next_followup_date} />}
        </Section>

        {/* Listing Copy */}
        {acq.publishable_summary && (
          <Section title="Listing Copy">
            <p className="text-[12px] text-[#0B0B0D] leading-relaxed" style={sans}>{acq.publishable_summary}</p>
          </Section>
        )}

        {/* Tags */}
        {((acq.amenity_tags?.length || 0) > 0 || (acq.vibe_tags?.length || 0) > 0) && (
          <Section title="Tags & Amenities">
            {(acq.amenity_tags?.length || 0) > 0 && (
              <div className="mb-2">
                <span className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-bold block mb-1" style={sans}>Amenities</span>
                <div className="flex flex-wrap gap-1">
                  {acq.amenity_tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-[#0B0B0D] font-medium" style={sans}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {(acq.vibe_tags?.length || 0) > 0 && (
              <div>
                <span className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-bold block mb-1" style={sans}>Vibes</span>
                <div className="flex flex-wrap gap-1">
                  {acq.vibe_tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-[#D4B36A]/10 rounded text-[10px] text-[#8B7330] font-medium" style={sans}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Media Preview */}
        <Section title={`Media (${photoCount})`}>
          {photoCount > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {acq.photos.map((ph, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={ph.url?.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ph.url}` : ph.url}
                    alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3">
              <Camera className="w-5 h-5 text-red-400" />
              <p className="text-[12px] text-red-500 font-medium" style={sans}>No photos uploaded</p>
            </div>
          )}
        </Section>

        {/* Specialist Notes */}
        {acq.notes && (
          <Section title="Specialist Notes">
            <p className="text-[12px] text-[#0B0B0D] leading-relaxed" style={sans}>{acq.notes}</p>
          </Section>
        )}

        {/* Operational Context */}
        <Section title="Routing History">
          <InfoRow icon={User} label="Captured by" value={acq.created_by_name || '—'} />
          <InfoRow icon={Zap} label="Capture Mode" value={isQuick ? 'Quick Capture' : 'Full Capture'} />
          <InfoRow icon={Clock} label="Created" value={formatDate(acq.created_at)} />
          <InfoRow icon={Clock} label="Last Updated" value={formatDate(acq.updated_at)} />
        </Section>

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
                    {h.action === 'refinement_edit' ? 'Refinement edit' : h.action?.includes('status_change') ? h.action.split(':')[1]?.replace('→', ' → ') : h.action || h.status}
                  </p>
                  <p className="text-[9px] text-[#64748B]" style={sans}>
                    {h.by_name || h.by_role} &middot; {formatDate(h.timestamp)}
                  </p>
                  {h.reason && (
                    <div className="mt-0.5 px-2 py-1 bg-red-50 rounded border border-red-100">
                      <p className="text-[10px] text-red-600" style={sans}>{h.reason}</p>
                    </div>
                  )}
                  {h.changes && (
                    <p className="text-[9px] text-[#64748B] mt-0.5" style={sans}>
                      Changed: {h.changes.map(c => c.field.replace(/_/g, ' ')).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Action Bar — only for awaiting_manager_approval */}
      {canAct && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3 space-y-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}
          data-testid="mgr-action-bar">
          <div className="flex gap-2">
            <button onClick={() => setActionModal('send_back')}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-[12px] font-bold active:scale-[0.98] transition-transform"
              data-testid="mgr-action-send-back" style={sans}>
              <Send className="w-3.5 h-3.5 rotate-180" /> Send Back
            </button>
            <button onClick={() => {
                if (assist?.readiness === 'not_ready') {
                  toast.error('Cannot approve — hard blockers remain');
                  return;
                }
                setActionModal('approve');
              }}
              className={`flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold active:scale-[0.98] transition-transform ${
                assist?.readiness === 'not_ready'
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white'
              }`}
              data-testid="mgr-action-approve" style={sans}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
          </div>
          <button onClick={() => setActionModal('reject')}
            className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 text-red-500 text-[11px] font-bold active:scale-[0.98] transition-colors"
            data-testid="mgr-action-reject" style={sans}>
            <Archive className="w-3.5 h-3.5" /> Reject / Archive
          </button>
        </div>
      )}

      {/* Onboarding CTA — for approved or onboarding statuses */}
      {(isApproved || isOnboarding) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}
          data-testid="onboarding-cta">
          <button onClick={() => navigate(`/team/field/onboarding/${acq.acquisition_id}`)}
            className="w-full h-12 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-[#D4B36A]/20"
            data-testid="go-to-onboarding-btn" style={sans}>
            <Send className="w-4 h-4" />
            {isApproved ? 'Send Onboarding Link to Owner' : 'View Onboarding Monitor'}
          </button>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" data-testid="mgr-action-modal"
          onClick={(e) => { if (e.target === e.currentTarget) { setActionModal(null); setReason(''); setApproveNote(''); } }}>
          <div className="w-full max-w-lg bg-white rounded-t-2xl px-4 pt-4 pb-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 24px)' }}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-[#0B0B0D] mb-1" style={sans}>
              {actionModal === 'approve' && 'Approve Venue'}
              {actionModal === 'send_back' && 'Send Back'}
              {actionModal === 'reject' && 'Reject / Archive'}
            </h3>
            <p className="text-[11px] text-[#64748B] mb-3" style={sans}>
              {actionModal === 'approve' && 'This venue will move to owner onboarding.'}
              {actionModal === 'send_back' && 'Choose where to send this record back.'}
              {actionModal === 'reject' && 'This record will be archived permanently.'}
            </p>

            {/* Approve — optional note + warnings */}
            {actionModal === 'approve' && (
              <>
                {assist && (assist.summary.medium_count > 0 || assist.summary.low_count > 0) && (
                  <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-amber-700" style={sans}>Active Warnings</span>
                    </div>
                    <p className="text-[10px] text-amber-600" style={sans}>
                      {assist.summary.medium_count + assist.summary.low_count} non-blocking warnings remain. Approval will proceed.
                    </p>
                  </div>
                )}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                    Approval Note (optional)
                  </label>
                  <input value={approveNote} onChange={e => setApproveNote(e.target.value)}
                    placeholder="Any note for the record..."
                    className="w-full h-10 px-3 border border-black/[0.08] rounded-xl text-[13px] outline-none focus:border-emerald-400"
                    data-testid="mgr-approve-note" style={sans} />
                </div>
              </>
            )}

            {/* Send Back — target + reason */}
            {actionModal === 'send_back' && (
              <>
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                    Send Back To
                  </label>
                  <div className="space-y-1.5">
                    {SEND_BACK_TARGETS.map(t => (
                      <button key={t.value} onClick={() => setSendBackTarget(t.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          sendBackTarget === t.value ? 'border-[#D4B36A] bg-[#D4B36A]/5' : 'border-slate-200'
                        }`} data-testid={`mgr-target-${t.value}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          sendBackTarget === t.value ? 'border-[#D4B36A]' : 'border-slate-300'
                        }`}>
                          {sendBackTarget === t.value && <div className="w-2 h-2 rounded-full bg-[#D4B36A]" />}
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-[#0B0B0D]" style={sans}>{t.label}</p>
                          <p className="text-[10px] text-[#64748B]" style={sans}>{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="What needs to be fixed..."
                    className="w-full h-20 px-3 py-2 border border-black/[0.08] rounded-xl text-[13px] resize-none outline-none focus:border-[#D4B36A]"
                    data-testid="mgr-reason" style={sans} />
                </div>
              </>
            )}

            {/* Reject — reason */}
            {actionModal === 'reject' && (
              <div className="mb-3">
                <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Venue permanently closed, duplicate entry..."
                  className="w-full h-20 px-3 py-2 border border-black/[0.08] rounded-xl text-[13px] resize-none outline-none focus:border-red-300"
                  data-testid="mgr-reject-reason" style={sans} />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setActionModal(null); setReason(''); setApproveNote(''); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-[#64748B] text-[13px] font-medium" style={sans}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionModal === 'approve') performAction('approved');
                  else if (actionModal === 'send_back') performAction(sendBackTarget);
                  else performAction('rejected');
                }}
                disabled={submitting}
                className={`flex-1 h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition-transform ${
                  actionModal === 'approve' ? 'bg-emerald-600 text-white'
                    : actionModal === 'reject' ? 'bg-red-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
                data-testid="mgr-action-confirm" style={sans}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionModal === 'approve' && 'Approve'}
                {actionModal === 'send_back' && 'Send Back'}
                {actionModal === 'reject' && 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostureCard({ label, value, detail }) {
  const s = POSTURE_STYLE[value] || POSTURE_STYLE.missing;
  const Icon = s.icon;
  return (
    <div className={`${s.bg} rounded-xl p-2.5`}>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={`w-3 h-3 ${s.text}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wide ${s.text}`} style={sans}>{label}</span>
      </div>
      <p className={`text-[11px] font-semibold capitalize ${s.text}`} style={sans}>{s.label}</p>
      {detail && <p className="text-[9px] text-[#64748B] mt-0.5" style={sans}>{detail}</p>}
    </div>
  );
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
        <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em]" style={sans}>{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
      </button>
      {open && <div className="px-3.5 pb-3 border-t border-black/[0.04] pt-3">{children}</div>}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[#9CA3AF] block" style={sans}>{label}</span>
        <span className={`text-[12px] font-medium capitalize ${
          highlight === 'emerald' ? 'text-emerald-600' : highlight === 'blue' ? 'text-blue-600' : 'text-[#0B0B0D]'
        }`} style={sans}>{value}</span>
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
