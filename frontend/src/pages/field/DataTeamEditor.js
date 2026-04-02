import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, CheckCircle2, XCircle, AlertCircle,
  AlertTriangle, Loader2, ArrowDown, Send, Clock, User,
  Zap, Camera, Wrench, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const VENUE_TYPES = [
  'banquet_hall', 'hotel', 'farmhouse', 'resort', 'villa', 'rooftop',
  'garden', 'temple', 'palace', 'club', 'convention_center', 'restaurant', 'other',
];

const INTEREST_LEVELS = ['hot', 'warm', 'cold', 'not_interested'];

export default function DataTeamEditor() {
  const navigate = useNavigate();
  const { acqId } = useParams();
  const [acq, setAcq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assist, setAssist] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Action modal
  const [actionModal, setActionModal] = useState(null); // 'approve' | 'send_back'
  const [reason, setReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Section collapse
  const [collapsed, setCollapsed] = useState({});
  const toggle = (s) => setCollapsed(prev => ({ ...prev, [s]: !prev[s] }));

  useEffect(() => {
    api.get(`/acquisitions/${acqId}`)
      .then(res => setAcq(res.data))
      .catch(() => { toast.error('Record not found'); navigate('/team/field/refine'); })
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

  const set = (key, val) => {
    setAcq(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const applySuggestion = (field, value) => {
    set(field, value);
    toast.success(`Applied: ${field.replace(/_/g, ' ')}`);
  };

  const saveRefinement = async () => {
    setSaving(true);
    try {
      const payload = {
        venue_name: acq.venue_name,
        owner_name: acq.owner_name,
        owner_phone: acq.owner_phone,
        city: acq.city,
        locality: acq.locality,
        address: acq.address,
        venue_type: acq.venue_type,
        capacity_min: acq.capacity_min ? parseInt(acq.capacity_min) : undefined,
        capacity_max: acq.capacity_max ? parseInt(acq.capacity_max) : undefined,
        indoor_outdoor: acq.indoor_outdoor,
        pricing_band_min: acq.pricing_band_min ? parseFloat(acq.pricing_band_min) : undefined,
        pricing_band_max: acq.pricing_band_max ? parseFloat(acq.pricing_band_max) : undefined,
        owner_interest: acq.owner_interest,
        meeting_outcome: acq.meeting_outcome,
        notes: acq.notes,
        amenity_tags: acq.amenity_tags,
        vibe_tags: acq.vibe_tags,
        event_types: acq.event_types,
        next_followup_date: acq.next_followup_date,
        publishable_summary: acq.publishable_summary,
      };
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined || payload[k] === null || payload[k] === '') delete payload[k];
      });
      await api.put(`/acquisitions/${acqId}`, payload);
      setDirty(false);
      toast.success('Saved');
      fetchAssist(); // refresh assist after save
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const performAction = async (newStatus) => {
    if (newStatus === 'sent_back_to_specialist' && !reason.trim()) {
      toast.error('Reason is required'); return;
    }
    setActionSubmitting(true);
    try {
      // Save first if dirty
      if (dirty) await saveRefinement();
      await api.post(`/acquisitions/${acqId}/status`, {
        new_status: newStatus,
        reason: reason.trim() || undefined,
      });
      toast.success(newStatus === 'awaiting_manager_approval' ? 'Marked ready for approval' : 'Sent back');
      navigate('/team/field/refine');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally { setActionSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
        <div className="w-6 h-6 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!acq) return null;

  const canAct = acq.status === 'under_data_refinement';
  const isQuick = acq.capture_mode === 'quick';
  const readiness = assist?.readiness || 'unknown';

  const READINESS_STYLE = {
    ready: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Ready for Approval' },
    almost_ready: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Almost Ready' },
    needs_fixes: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Needs Fixes' },
    not_ready: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Not Ready' },
    unknown: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', label: 'Checking...' },
  };
  const rs = READINESS_STYLE[readiness] || READINESS_STYLE.unknown;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="data-team-editor">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/team/field/refine')} className="flex items-center gap-1.5 text-white/50" data-testid="editor-back">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[11px]" style={sans}>Queue</span>
          </button>
          {dirty && (
            <button onClick={saveRefinement} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#D4B36A] text-[#0B0B0D] rounded-lg text-[11px] font-bold disabled:opacity-50"
              data-testid="save-btn" style={sans}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#D4B36A]" />
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]" style={sans}>Refine</p>
          {isQuick && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#D4B36A]/20 rounded-full text-[8px] font-bold text-[#D4B36A] ml-auto" style={sans}>
              <Zap className="w-2.5 h-2.5" /> QUICK
            </span>
          )}
        </div>
        <h1 className="text-[18px] font-bold text-white mt-0.5 truncate" style={sans}>{acq.venue_name}</h1>
        <p className="text-[11px] text-white/40 mt-0.5" style={sans}>
          By {acq.created_by_name || 'Specialist'} &middot; {acq.city || '—'}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4 pb-48">
        {/* Ven-Us Assist Panel */}
        <div className={`rounded-xl border p-3.5 ${rs.bg}`} data-testid="venus-assist-panel">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#D4B36A]" />
            <h3 className="text-[12px] font-bold text-[#0B0B0D]" style={sans}>Ven-Us Assist</h3>
            <span className={`ml-auto text-[10px] font-bold ${rs.text}`} style={sans}>{rs.label}</span>
          </div>

          {assistLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4B36A]" />
              <span className="text-[11px] text-[#64748B]" style={sans}>Analyzing...</span>
            </div>
          ) : assist ? (
            <div className="space-y-2">
              {/* Blockers */}
              {assist.blockers.map((b, i) => (
                <div key={`b-${i}`} className="flex items-start gap-2 py-1">
                  <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-red-700 font-medium" style={sans}>{b.message}</p>
                    <span className="text-[8px] text-red-400 font-bold uppercase" style={sans}>Blocker</span>
                  </div>
                </div>
              ))}

              {/* High/Medium issues */}
              {assist.issues.filter(i => i.severity !== 'low').map((issue, i) => (
                <div key={`i-${i}`} className="flex items-start gap-2 py-1">
                  <AlertCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${issue.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium ${issue.severity === 'high' ? 'text-red-600' : 'text-amber-700'}`} style={sans}>{issue.message}</p>
                    <span className={`text-[8px] font-bold uppercase ${issue.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} style={sans}>{issue.severity}</span>
                  </div>
                </div>
              ))}

              {/* Suggestions with apply buttons */}
              {assist.suggestions.map((s, i) => (
                <div key={`s-${i}`} className="flex items-start gap-2 py-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4B36A] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#0B0B0D] font-medium" style={sans}>{s.message}</p>
                    {s.suggested_value && (
                      <button onClick={() => applySuggestion(s.field, s.suggested_value)}
                        className="mt-0.5 text-[10px] font-bold text-[#D4B36A] underline" style={sans}
                        data-testid={`apply-suggestion-${s.field}`}>
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Low issues collapsed */}
              {assist.issues.filter(i => i.severity === 'low').length > 0 && (
                <div>
                  <button onClick={() => toggle('low_issues')} className="flex items-center gap-1 text-[10px] text-[#64748B] font-medium" style={sans}>
                    {collapsed.low_issues ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {assist.issues.filter(i => i.severity === 'low').length} minor items
                  </button>
                  {collapsed.low_issues && assist.issues.filter(i => i.severity === 'low').map((issue, i) => (
                    <div key={`lo-${i}`} className="flex items-start gap-2 py-0.5 pl-4">
                      <AlertCircle className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-slate-500" style={sans}>{issue.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center gap-2 pt-1 border-t border-black/[0.04]">
                <span className="text-[9px] text-[#9CA3AF]" style={sans}>
                  {assist.summary.blocker_count} blockers &middot; {assist.summary.high_count + assist.summary.medium_count} issues &middot; {assist.summary.suggestion_count} suggestions
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* SECTION: Venue Identity */}
        <EditorSection title="Venue Identity" defaultOpen>
          <Field label="Venue Name" required>
            <input value={acq.venue_name || ''} onChange={e => set('venue_name', e.target.value)}
              className="editor-input" data-testid="edit-venue-name" />
          </Field>
          <Field label="Venue Type" required>
            <select value={acq.venue_type || ''} onChange={e => set('venue_type', e.target.value)}
              className="editor-input" data-testid="edit-venue-type">
              <option value="">Select...</option>
              {VENUE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Indoor/Outdoor">
            <select value={acq.indoor_outdoor || ''} onChange={e => set('indoor_outdoor', e.target.value)}
              className="editor-input" data-testid="edit-indoor-outdoor">
              <option value="">Select...</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="both">Both</option>
            </select>
          </Field>
        </EditorSection>

        {/* SECTION: Location */}
        <EditorSection title="Location">
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" required>
              <input value={acq.city || ''} onChange={e => set('city', e.target.value)}
                className="editor-input" data-testid="edit-city" />
            </Field>
            <Field label="Locality" required>
              <input value={acq.locality || ''} onChange={e => set('locality', e.target.value)}
                className="editor-input" data-testid="edit-locality" />
            </Field>
          </div>
          <Field label="Full Address">
            <input value={acq.address || ''} onChange={e => set('address', e.target.value)}
              className="editor-input" data-testid="edit-address" />
          </Field>
          {acq.latitude && (
            <p className="text-[10px] text-[#9CA3AF]" style={sans}>GPS: {acq.latitude?.toFixed(5)}, {acq.longitude?.toFixed(5)}</p>
          )}
        </EditorSection>

        {/* SECTION: Capacity & Pricing */}
        <EditorSection title="Capacity & Pricing">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Capacity" required>
              <input type="number" value={acq.capacity_min || ''} onChange={e => set('capacity_min', e.target.value)}
                className="editor-input" data-testid="edit-cap-min" />
            </Field>
            <Field label="Max Capacity" required>
              <input type="number" value={acq.capacity_max || ''} onChange={e => set('capacity_max', e.target.value)}
                className="editor-input" data-testid="edit-cap-max" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price Min (₹/plate)">
              <input type="number" value={acq.pricing_band_min || ''} onChange={e => set('pricing_band_min', e.target.value)}
                className="editor-input" data-testid="edit-price-min" />
            </Field>
            <Field label="Price Max (₹/plate)">
              <input type="number" value={acq.pricing_band_max || ''} onChange={e => set('pricing_band_max', e.target.value)}
                className="editor-input" data-testid="edit-price-max" />
            </Field>
          </div>
        </EditorSection>

        {/* SECTION: Contact & Commercial */}
        <EditorSection title="Contact & Commercial">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner Name" required>
              <input value={acq.owner_name || ''} onChange={e => set('owner_name', e.target.value)}
                className="editor-input" data-testid="edit-owner-name" />
            </Field>
            <Field label="Phone" required>
              <input value={acq.owner_phone || ''} onChange={e => set('owner_phone', e.target.value)}
                className="editor-input" data-testid="edit-phone" />
            </Field>
          </div>
          <Field label="Interest Level">
            <div className="flex gap-1.5">
              {INTEREST_LEVELS.map(il => (
                <button key={il} onClick={() => set('owner_interest', il)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all capitalize ${
                    acq.owner_interest === il
                      ? il === 'hot' ? 'bg-emerald-500 text-white border-emerald-500'
                        : il === 'warm' ? 'bg-amber-400 text-white border-amber-400'
                        : il === 'cold' ? 'bg-blue-400 text-white border-blue-400'
                        : 'bg-red-400 text-white border-red-400'
                      : 'bg-white text-[#64748B] border-slate-200'
                  }`} style={sans} data-testid={`edit-interest-${il}`}>
                  {il.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Meeting Outcome">
            <input value={acq.meeting_outcome || ''} onChange={e => set('meeting_outcome', e.target.value)}
              className="editor-input" data-testid="edit-outcome" />
          </Field>
          <Field label="Follow-up Date">
            <input type="date" value={acq.next_followup_date || ''} onChange={e => set('next_followup_date', e.target.value)}
              className="editor-input" data-testid="edit-followup" />
          </Field>
        </EditorSection>

        {/* SECTION: Tags & Amenities */}
        <EditorSection title="Tags & Amenities">
          <Field label="Amenity Tags (comma-separated)">
            <input value={(acq.amenity_tags || []).join(', ')}
              onChange={e => set('amenity_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="parking, valet, ac, wifi, catering"
              className="editor-input" data-testid="edit-amenities" />
          </Field>
          <Field label="Vibe Tags (comma-separated)">
            <input value={(acq.vibe_tags || []).join(', ')}
              onChange={e => set('vibe_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="royal, modern, rustic"
              className="editor-input" data-testid="edit-vibes" />
          </Field>
          <Field label="Event Types (comma-separated)">
            <input value={(acq.event_types || []).join(', ')}
              onChange={e => set('event_types', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="wedding, reception, corporate"
              className="editor-input" data-testid="edit-events" />
          </Field>
        </EditorSection>

        {/* SECTION: Notes & Copy */}
        <EditorSection title="Notes & Listing Copy">
          <Field label="Specialist Notes">
            <textarea value={acq.notes || ''} onChange={e => set('notes', e.target.value)}
              rows={3} className="editor-input !h-auto" data-testid="edit-notes" />
          </Field>
          <Field label="Publishable Summary">
            <textarea value={acq.publishable_summary || ''} onChange={e => set('publishable_summary', e.target.value)}
              rows={4} placeholder="Write premium listing copy for the venue card..."
              className="editor-input !h-auto" data-testid="edit-summary" />
          </Field>
        </EditorSection>

        {/* SECTION: Media Posture */}
        <EditorSection title="Media">
          <div className="flex items-center gap-2 py-2">
            <Camera className={`w-5 h-5 ${(acq.photos?.length || 0) >= 3 ? 'text-emerald-500' : 'text-amber-500'}`} />
            <div>
              <p className="text-[12px] font-bold text-[#0B0B0D]" style={sans}>{acq.photos?.length || 0} photos</p>
              <p className="text-[10px] text-[#64748B]" style={sans}>
                {(acq.photos?.length || 0) >= 3 ? 'Meets minimum for premium listing' : 'Need 3+ photos for premium card'}
              </p>
            </div>
          </div>
          {(acq.photos?.length || 0) > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {acq.photos.map((ph, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={ph.url?.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ph.url}` : ph.url}
                    alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </EditorSection>

        {/* SECTION: Activity Log */}
        <EditorSection title="Activity Log">
          <div className="space-y-2">
            {(acq.history || []).slice().reverse().map((h, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 ${i === 0 ? 'bg-[#D4B36A]' : 'bg-slate-300'}`} />
                  {i < (acq.history.length - 1) && <div className="w-px flex-1 bg-slate-200 mt-0.5" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-[11px] font-semibold text-[#0B0B0D]" style={sans}>
                    {h.action === 'refinement_edit' ? 'Refinement edit' : h.action?.includes('status_change') ? h.action.split(':')[1] : h.action || h.status}
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
                    <div className="mt-0.5 text-[9px] text-[#64748B]" style={sans}>
                      Changed: {h.changes.map(c => c.field.replace(/_/g, ' ')).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </EditorSection>
      </div>

      {/* Action Bar */}
      {canAct && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3 space-y-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}
          data-testid="editor-action-bar">
          <div className="flex gap-2">
            <button onClick={() => setActionModal('send_back')}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-[12px] font-bold active:scale-[0.98] transition-transform"
              data-testid="dt-action-send-back" style={sans}>
              <Send className="w-3.5 h-3.5 rotate-180" /> Send Back
            </button>
            <button onClick={() => {
                if (assist?.readiness === 'not_ready') {
                  toast.error('Cannot approve — blockers remain. Fix them first.');
                  return;
                }
                setActionModal('approve');
              }}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[12px] font-bold active:scale-[0.98] transition-transform"
              data-testid="dt-action-approve" style={sans}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Approval
            </button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" data-testid="dt-action-modal"
          onClick={(e) => { if (e.target === e.currentTarget) { setActionModal(null); setReason(''); } }}>
          <div className="w-full max-w-lg bg-white rounded-t-2xl px-4 pt-4 pb-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 24px)' }}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-[#0B0B0D] mb-1" style={sans}>
              {actionModal === 'approve' ? 'Mark Ready for Manager Approval' : 'Send Back to Specialist'}
            </h3>
            <p className="text-[11px] text-[#64748B] mb-3" style={sans}>
              {actionModal === 'approve'
                ? 'This record will move to the Venue Manager for final approval.'
                : 'The specialist will see your feedback and can re-submit.'}
            </p>

            {actionModal === 'send_back' && (
              <div className="mb-3">
                <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.1em] mb-1 block" style={sans}>
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Need better photos of the main hall, confirm pricing with owner"
                  className="w-full h-20 px-3 py-2 border border-black/[0.08] rounded-xl text-[13px] resize-none outline-none focus:border-[#D4B36A]"
                  data-testid="dt-reason" style={sans} />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setActionModal(null); setReason(''); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-[#64748B] text-[13px] font-medium" style={sans}>
                Cancel
              </button>
              <button onClick={() => performAction(actionModal === 'approve' ? 'awaiting_manager_approval' : 'sent_back_to_specialist')}
                disabled={actionSubmitting}
                className={`flex-1 h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition-transform ${
                  actionModal === 'approve' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}
                data-testid="dt-action-confirm" style={sans}>
                {actionSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionModal === 'approve' ? 'Confirm' : 'Send Back'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .editor-input {
          width: 100%; height: 38px; padding: 0 10px;
          background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;
          font-size: 13px; color: #0B0B0D; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.2s;
        }
        .editor-input:focus { border-color: #D4B36A; }
        .editor-input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
}

function EditorSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
        <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em]" style={sans}>{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
      </button>
      {open && <div className="px-3.5 pb-3 space-y-3 border-t border-black/[0.04] pt-3">{children}</div>}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-[#0B0B0D] mb-1 block uppercase tracking-[0.08em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label} {required && <span className="text-[#D4B36A]">*</span>}
      </label>
      {children}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
