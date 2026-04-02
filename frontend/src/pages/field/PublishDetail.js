import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, Globe, EyeOff,
  Archive, Shield, Zap, Camera, MapPin, Users, IndianRupee,
  FileText, Clock, ChevronDown, ChevronUp, Eye, Ban,
  RefreshCw, Loader2, AlertTriangle, Building2, Star,
  GitCompare, History, Send,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const RANKING_VALUES = [
  { value: 'not_eligible', label: 'Not Eligible', desc: 'Default after publish' },
  { value: 'eligible', label: 'Eligible', desc: 'Ranking engine can include' },
  { value: 'blocked_quality', label: 'Blocked (Quality)', desc: 'Quality issues' },
  { value: 'hidden', label: 'Hidden', desc: 'Not visible at all' },
];

export default function PublishDetail() {
  const navigate = useNavigate();
  const { acqId } = useParams();
  const [acq, setAcq] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [preview, setPreview] = useState(null);
  const [versions, setVersions] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  // Panel state
  const [activePanel, setActivePanel] = useState('readiness');
  // Action modals
  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [overrideMedia, setOverrideMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Ranking
  const [rankingValue, setRankingValue] = useState('');
  const [rankingReason, setRankingReason] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [acqRes, readRes, prevRes, verRes, audRes] = await Promise.all([
        api.get(`/acquisitions/${acqId}`),
        api.get(`/publish/${acqId}/readiness`),
        api.get(`/publish/${acqId}/preview`),
        api.get(`/publish/${acqId}/versions`),
        api.get(`/publish/${acqId}/audit`),
      ]);
      setAcq(acqRes.data);
      setReadiness(readRes.data);
      setPreview(prevRes.data);
      setVersions(verRes.data);
      setAudit(audRes.data.audit || []);
      setRankingValue(acqRes.data.ranking_eligibility || 'not_eligible');
    } catch (err) {
      toast.error('Failed to load data');
      console.error(err);
    } finally { setLoading(false); }
  }, [acqId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Actions
  const handlePublish = async () => {
    setSubmitting(true);
    try {
      await api.post(`/publish/${acqId}/publish`, {
        reason: actionReason.trim() || undefined,
        override_media_min: overrideMedia,
      });
      toast.success('Venue published!');
      setActionModal(null);
      setActionReason('');
      setOverrideMedia(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Publish failed');
    } finally { setSubmitting(false); }
  };

  const handleVisibilityAction = async (action) => {
    if (!actionReason.trim() && action !== 'unhide') {
      toast.error('Reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/publish/${acqId}/${action}`, { reason: actionReason.trim() || undefined });
      toast.success(`Venue ${action === 'hide' ? 'hidden' : action === 'unhide' ? 'restored' : action === 'unpublish' ? 'unpublished' : 'archived'}`);
      setActionModal(null);
      setActionReason('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally { setSubmitting(false); }
  };

  const handlePromoteDraft = async () => {
    if (!actionReason.trim()) {
      toast.error('Reason required for promoting draft');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/publish/${acqId}/promote-draft`, { confirm: true, reason: actionReason.trim() });
      toast.success('Draft promoted to live');
      setActionModal(null);
      setActionReason('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Promote failed');
    } finally { setSubmitting(false); }
  };

  const handleRankingUpdate = async () => {
    setSubmitting(true);
    try {
      await api.post(`/publish/${acqId}/ranking`, { ranking_eligibility: rankingValue, reason: rankingReason.trim() || undefined });
      toast.success('Ranking updated');
      setRankingReason('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
      <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
    </div>
  );

  if (!acq) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBF9] px-4">
      <XCircle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-slate-600 text-sm" style={sans}>Venue not found</p>
      <button onClick={() => navigate('/team/field/publish')} className="mt-4 text-[#D4B36A] text-sm font-semibold" style={sans}>Back to Queue</button>
    </div>
  );

  const status = acq.status;
  const isLive = status === 'published_live';
  const isHidden = status === 'hidden_from_public';
  const canPublish = ['owner_onboarding_completed', 'publish_ready', 'unpublished', 'hidden_from_public'].includes(status);
  const canHide = isLive;
  const canUnhide = isHidden;
  const canUnpublish = isLive || isHidden;
  const hasDraft = versions?.has_draft;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="publish-detail">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/team/field/publish')} className="p-1.5 rounded-lg bg-white/10 active:bg-white/20" data-testid="publish-detail-back">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-base font-bold truncate" style={sans}>{acq.venue_name}</h1>
            <p className="text-white/50 text-xs truncate" style={sans}>{acq.locality}, {acq.city}</p>
          </div>
        </div>
        {/* Status strip */}
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={status} />
          {readiness && <ReadinessBadge readiness={readiness} />}
          {isLive && <RankingBadge value={acq.ranking_eligibility || 'not_eligible'} />}
        </div>
      </div>

      {/* Panel Tabs */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-1 overflow-x-auto scrollbar-hide">
        {[
          { id: 'readiness', label: 'Readiness', icon: Zap },
          { id: 'preview', label: 'Preview', icon: Eye },
          { id: 'versions', label: 'Versions', icon: GitCompare },
          { id: 'actions', label: 'Actions', icon: Send },
          { id: 'audit', label: 'Audit', icon: History },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors flex-shrink-0 ${
              activePanel === p.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400'
            }`}
            style={sans}
            data-testid={`panel-tab-${p.id}`}
          >
            <p.icon className="w-3.5 h-3.5" />{p.label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="px-4 py-4">
        {activePanel === 'readiness' && readiness && <ReadinessPanel readiness={readiness} />}
        {activePanel === 'preview' && preview && <PreviewPanel preview={preview} />}
        {activePanel === 'versions' && versions && <VersionsPanel versions={versions} onPromote={() => setActionModal('promote')} />}
        {activePanel === 'actions' && (
          <ActionsPanel
            status={status}
            canPublish={canPublish}
            canHide={canHide}
            canUnhide={canUnhide}
            canUnpublish={canUnpublish}
            hasDraft={hasDraft}
            readiness={readiness}
            rankingValue={rankingValue}
            onPublish={() => setActionModal('publish')}
            onHide={() => setActionModal('hide')}
            onUnhide={() => setActionModal('unhide')}
            onUnpublish={() => setActionModal('unpublish')}
            onArchive={() => setActionModal('archive')}
            onPromote={() => setActionModal('promote')}
            onRankingChange={setRankingValue}
            rankingReason={rankingReason}
            onRankingReasonChange={setRankingReason}
            onRankingSave={handleRankingUpdate}
            submitting={submitting}
          />
        )}
        {activePanel === 'audit' && <AuditPanel audit={audit} />}
      </div>

      {/* Action Modals */}
      {actionModal && (
        <ActionModal
          type={actionModal}
          reason={actionReason}
          onReasonChange={setActionReason}
          overrideMedia={overrideMedia}
          onOverrideChange={setOverrideMedia}
          submitting={submitting}
          readiness={readiness}
          onConfirm={() => {
            if (actionModal === 'publish') handlePublish();
            else if (actionModal === 'promote') handlePromoteDraft();
            else handleVisibilityAction(actionModal);
          }}
          onClose={() => { setActionModal(null); setActionReason(''); setOverrideMedia(false); }}
          versions={versions}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function StatusBadge({ status }) {
  const map = {
    owner_onboarding_completed: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Onboarded' },
    publish_ready: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', label: 'Publish Ready' },
    published_live: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Live' },
    hidden_from_public: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Hidden' },
    unpublished: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Unpublished' },
    archived: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Archived' },
  };
  const s = map[status] || map.owner_onboarding_completed;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`} style={sans}>{s.label}</span>;
}

function ReadinessBadge({ readiness }) {
  const map = {
    ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
    ready_with_override: { bg: 'bg-amber-500/20', text: 'text-amber-300' },
    not_ready: { bg: 'bg-red-500/20', text: 'text-red-300' },
  };
  const s = map[readiness.overall] || map.not_ready;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`} style={sans}>{readiness.passed_count}/{readiness.total_count} checks</span>;
}

function RankingBadge({ value }) {
  const map = {
    not_eligible: 'text-slate-400',
    eligible: 'text-emerald-300',
    blocked_quality: 'text-red-300',
    hidden: 'text-amber-300',
  };
  return <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${map[value] || map.not_eligible}`} style={sans}><Shield className="w-3 h-3" />{value?.replace('_', ' ')}</span>;
}

function ReadinessPanel({ readiness }) {
  return (
    <div className="space-y-3" data-testid="readiness-panel">
      {/* Overall banner */}
      <div className={`rounded-2xl border p-4 ${
        readiness.overall === 'ready' ? 'bg-emerald-50 border-emerald-200' :
        readiness.overall === 'ready_with_override' ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          {readiness.overall === 'ready' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
           readiness.overall === 'ready_with_override' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
           <XCircle className="w-5 h-5 text-red-600" />}
          <div>
            <p className={`text-sm font-bold ${
              readiness.overall === 'ready' ? 'text-emerald-700' :
              readiness.overall === 'ready_with_override' ? 'text-amber-700' : 'text-red-700'
            }`} style={sans}>
              {readiness.overall === 'ready' ? 'Ready to Publish' :
               readiness.overall === 'ready_with_override' ? 'Publishable with Override' : 'Not Ready'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5" style={sans}>
              {readiness.passed_count} of {readiness.total_count} checks passed
            </p>
          </div>
        </div>
      </div>

      {/* Checks list */}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {readiness.checks.map((check, i) => (
          <div key={check.id} className="flex items-start gap-3 px-4 py-3" data-testid={`readiness-check-${check.id}`}>
            {check.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : check.overridable ? (
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0B0B0D]" style={sans}>{check.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5" style={sans}>{check.detail}</p>
              {check.overridable && !check.passed && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 uppercase" style={sans}>Manager Override Available</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({ preview }) {
  const images = preview.images || [];
  const heroImage = images[0];

  return (
    <div className="space-y-4" data-testid="preview-panel">
      <p className="text-xs text-slate-500 font-medium" style={sans}>This is how the venue will appear on the public customer platform:</p>

      {/* Card Preview */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm" data-testid="venue-card-preview">
        {/* Image */}
        <div className="relative h-48 bg-slate-100">
          {heroImage ? (
            <img src={heroImage} alt={preview.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-slate-300" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-[#0B0B0D] uppercase tracking-wide" style={sans}>
              {(preview.venue_type || '').replace('_', ' ')}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
            <Camera className="w-3 h-3 text-white" />
            <span className="text-white text-[10px] font-bold">{images.length}</span>
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          <h3 className="text-base font-bold text-[#0B0B0D]" style={sans}>{preview.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500" style={sans}>
            <MapPin className="w-3 h-3" />
            <span>{preview.area}, {preview.city}</span>
          </div>

          {/* Capacity & Price */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600" style={sans}>
              <Users className="w-3.5 h-3.5" />
              <span>{preview.capacity_min}–{preview.capacity_max} guests</span>
            </div>
            {preview.pricing?.price_per_plate_veg > 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-[#0B0B0D]" style={sans}>
                <IndianRupee className="w-3 h-3" />
                <span>{preview.pricing.price_per_plate_veg.toLocaleString()}/plate</span>
              </div>
            )}
          </div>

          {/* Rating placeholder */}
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400" style={sans}>
            <Star className="w-3 h-3" /> New venue — no ratings yet
          </div>

          {/* Description */}
          {preview.description && (
            <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-3" style={sans}>{preview.description}</p>
          )}

          {/* Event types */}
          {preview.event_types?.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {preview.event_types.map(t => (
                <span key={t} className="px-2 py-0.5 bg-[#F4F1EC] rounded-full text-[10px] font-medium text-[#0B0B0D] capitalize" style={sans}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full page preview info */}
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-[11px] text-slate-500" style={sans}>
          This preview reflects the public card view. The full venue page will include all photos, detailed amenities, reviews section, and booking/enquiry CTA.
        </p>
      </div>
    </div>
  );
}

function VersionsPanel({ versions, onPromote }) {
  if (!versions) return null;
  const hasDiff = versions.diff && versions.diff.length > 0;

  return (
    <div className="space-y-4" data-testid="versions-panel">
      {/* Version status */}
      <div className="grid grid-cols-3 gap-2">
        <VersionCard label="Live" exists={versions.has_live} timestamp={versions.live_version?.snapshot_at} />
        <VersionCard label="Draft" exists={versions.has_draft} timestamp={versions.draft_version?.last_edited_at || versions.draft_version?.snapshot_at} />
        <VersionCard label="Approved" exists={versions.has_approved} timestamp={versions.last_approved_version?.snapshot_at} />
      </div>

      {/* Diff */}
      {hasDiff && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-700" style={sans}>Draft differs from Live — {versions.diff.length} change(s)</p>
          </div>
          <div className="divide-y divide-slate-50">
            {versions.diff.map((d, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" style={sans}>{d.field}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-red-500 uppercase mb-0.5" style={sans}>Live</p>
                    <p className="text-[11px] text-red-700 break-words" style={sans}>{Array.isArray(d.live) ? d.live.join(', ') : String(d.live ?? '—')}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase mb-0.5" style={sans}>Draft</p>
                    <p className="text-[11px] text-emerald-700 break-words" style={sans}>{Array.isArray(d.draft) ? d.draft.join(', ') : String(d.draft ?? '—')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <button onClick={onPromote} className="w-full py-2.5 rounded-xl bg-[#D4B36A] text-[#0B0B0D] text-xs font-bold" style={sans} data-testid="promote-draft-btn">
              Promote Draft to Live
            </button>
          </div>
        </div>
      )}

      {!hasDiff && versions.has_live && !versions.has_draft && (
        <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-700 font-medium" style={sans}>Live and internal versions are in sync. No pending draft changes.</p>
        </div>
      )}

      {!versions.has_live && (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500" style={sans}>No live version yet. Publish the venue to create the first live snapshot.</p>
        </div>
      )}
    </div>
  );
}

function VersionCard({ label, exists, timestamp }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${exists ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400" style={sans}>{label}</p>
      {exists ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mt-1" />
          {timestamp && <p className="text-[9px] text-slate-400 mt-1" style={sans}>{new Date(timestamp).toLocaleDateString()}</p>}
        </>
      ) : (
        <XCircle className="w-4 h-4 text-slate-300 mx-auto mt-1" />
      )}
    </div>
  );
}

function ActionsPanel({ status, canPublish, canHide, canUnhide, canUnpublish, hasDraft, readiness, rankingValue, onPublish, onHide, onUnhide, onUnpublish, onArchive, onPromote, onRankingChange, rankingReason, onRankingReasonChange, onRankingSave, submitting }) {
  const isLive = status === 'published_live';
  const [showRanking, setShowRanking] = useState(false);

  return (
    <div className="space-y-4" data-testid="actions-panel">
      {/* Publish */}
      {canPublish && (
        <ActionCard
          icon={Globe}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Publish to Public Platform"
          desc={readiness?.overall === 'ready' ? 'All checks passed — ready to go live' : readiness?.overall === 'ready_with_override' ? 'Needs override — review before publish' : 'Readiness checks not passed'}
          btnLabel="Publish"
          btnClass="bg-emerald-600 text-white"
          onClick={onPublish}
          disabled={readiness?.overall === 'not_ready'}
          testId="action-publish"
        />
      )}

      {/* Hide */}
      {canHide && (
        <ActionCard
          icon={EyeOff}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          title="Hide Temporarily"
          desc="Remove from public search while keeping the listing intact"
          btnLabel="Hide"
          btnClass="bg-amber-500 text-white"
          onClick={onHide}
          testId="action-hide"
        />
      )}

      {/* Unhide */}
      {canUnhide && (
        <ActionCard
          icon={Globe}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Restore to Public"
          desc="Make the venue visible on the public platform again"
          btnLabel="Restore Live"
          btnClass="bg-emerald-600 text-white"
          onClick={onUnhide}
          testId="action-unhide"
        />
      )}

      {/* Unpublish */}
      {canUnpublish && (
        <ActionCard
          icon={Ban}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          title="Unpublish"
          desc="Remove the venue from public entirely. Can be re-published later."
          btnLabel="Unpublish"
          btnClass="bg-slate-600 text-white"
          onClick={onUnpublish}
          testId="action-unpublish"
        />
      )}

      {/* Promote draft */}
      {hasDraft && (isLive || status === 'hidden_from_public') && (
        <ActionCard
          icon={RefreshCw}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          title="Promote Draft to Live"
          desc="Push pending draft changes to the live public listing"
          btnLabel="Promote"
          btnClass="bg-indigo-600 text-white"
          onClick={onPromote}
          testId="action-promote"
        />
      )}

      {/* Ranking eligibility */}
      {(isLive || status === 'hidden_from_public') && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button onClick={() => setShowRanking(!showRanking)} className="w-full flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#0B0B0D]" style={sans}>Ranking Eligibility</p>
              <p className="text-xs text-slate-500 capitalize" style={sans}>Current: {rankingValue?.replace('_', ' ')}</p>
            </div>
            {showRanking ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showRanking && (
            <div className="px-4 pb-4 space-y-2">
              {RANKING_VALUES.map(rv => (
                <label key={rv.value} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  rankingValue === rv.value ? 'border-[#D4B36A] bg-[#D4B36A]/5' : 'border-slate-100'
                }`}>
                  <input type="radio" name="ranking" value={rv.value} checked={rankingValue === rv.value} onChange={() => onRankingChange(rv.value)} className="accent-[#D4B36A]" />
                  <div>
                    <p className="text-xs font-semibold text-[#0B0B0D]" style={sans}>{rv.label}</p>
                    <p className="text-[10px] text-slate-500" style={sans}>{rv.desc}</p>
                  </div>
                </label>
              ))}
              <input
                value={rankingReason}
                onChange={e => onRankingReasonChange(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                style={sans}
              />
              <button
                onClick={onRankingSave}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-50"
                style={sans}
                data-testid="ranking-save-btn"
              >
                {submitting ? 'Saving...' : 'Update Ranking'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Archive — admin sees this always */}
      {status !== 'archived' && (
        <ActionCard
          icon={Archive}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          title="Archive (Terminal)"
          desc="Permanently archive. This is not a casual hide — use for decommissioned venues."
          btnLabel="Archive"
          btnClass="bg-red-600 text-white"
          onClick={onArchive}
          testId="action-archive"
        />
      )}
    </div>
  );
}

function ActionCard({ icon: Icon, iconBg, iconColor, title, desc, btnLabel, btnClass, onClick, disabled, testId }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#0B0B0D]" style={sans}>{title}</p>
          <p className="text-xs text-slate-500 mt-0.5" style={sans}>{desc}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full mt-3 py-2.5 rounded-xl text-xs font-bold ${btnClass} disabled:opacity-40`}
        style={sans}
        data-testid={testId}
      >
        {btnLabel}
      </button>
    </div>
  );
}

function AuditPanel({ audit }) {
  if (!audit.length) {
    return (
      <div className="text-center py-12" data-testid="audit-panel">
        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500" style={sans}>No publish activity yet</p>
      </div>
    );
  }

  const actionLabel = {
    published: { label: 'Published', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Globe },
    unpublished: { label: 'Unpublished', color: 'text-slate-600', bg: 'bg-slate-100', icon: Ban },
    hidden: { label: 'Hidden', color: 'text-amber-600', bg: 'bg-amber-50', icon: EyeOff },
    unhidden: { label: 'Restored', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Globe },
    archived: { label: 'Archived', color: 'text-red-600', bg: 'bg-red-50', icon: Archive },
    draft_promoted: { label: 'Draft Promoted', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: RefreshCw },
    ranking_changed: { label: 'Ranking Changed', color: 'text-purple-600', bg: 'bg-purple-50', icon: Shield },
  };

  return (
    <div className="space-y-2" data-testid="audit-panel">
      {audit.slice().reverse().map((entry, i) => {
        const meta = actionLabel[entry.action] || { label: entry.action, color: 'text-slate-600', bg: 'bg-slate-50', icon: Clock };
        const Icon = meta.icon;
        return (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-lg ${meta.bg} flex items-center justify-center`}>
                <Icon className={`w-3 h-3 ${meta.color}`} />
              </div>
              <span className={`text-xs font-bold ${meta.color}`} style={sans}>{meta.label}</span>
              <span className="text-[10px] text-slate-400 ml-auto" style={sans}>
                {new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 ml-8" style={sans}>
              by <span className="font-semibold">{entry.actor_name}</span> ({entry.actor_role})
            </p>
            {entry.reason && <p className="text-[11px] text-slate-500 ml-8 mt-0.5 italic" style={sans}>"{entry.reason}"</p>}
            {entry.old_value && (
              <p className="text-[10px] text-slate-400 ml-8 mt-0.5" style={sans}>
                {entry.old_value} → {entry.new_value}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionModal({ type, reason, onReasonChange, overrideMedia, onOverrideChange, submitting, readiness, onConfirm, onClose, versions }) {
  const configs = {
    publish: { title: 'Publish Venue', desc: 'This will make the venue visible on the public platform.', btnLabel: 'Confirm Publish', btnClass: 'bg-emerald-600 text-white', reasonRequired: false, showOverride: readiness?.overall === 'ready_with_override' },
    hide: { title: 'Hide Venue', desc: 'The venue will be temporarily hidden from public search.', btnLabel: 'Confirm Hide', btnClass: 'bg-amber-500 text-white', reasonRequired: true },
    unhide: { title: 'Restore Venue', desc: 'The venue will be visible on the public platform again.', btnLabel: 'Confirm Restore', btnClass: 'bg-emerald-600 text-white', reasonRequired: false },
    unpublish: { title: 'Unpublish Venue', desc: 'The venue will be removed from the public platform entirely.', btnLabel: 'Confirm Unpublish', btnClass: 'bg-slate-600 text-white', reasonRequired: true },
    archive: { title: 'Archive Venue', desc: 'This is a terminal action. The venue will be permanently archived.', btnLabel: 'Confirm Archive', btnClass: 'bg-red-600 text-white', reasonRequired: true },
    promote: { title: 'Promote Draft to Live', desc: 'The draft version will replace the current live listing.', btnLabel: 'Confirm Promote', btnClass: 'bg-indigo-600 text-white', reasonRequired: true },
  };

  const cfg = configs[type] || configs.publish;
  const hasDiff = versions?.diff?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 animate-slide-up" onClick={e => e.stopPropagation()} data-testid={`action-modal-${type}`}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <h3 className="text-base font-bold text-[#0B0B0D]" style={sans}>{cfg.title}</h3>
        <p className="text-xs text-slate-500 mt-1" style={sans}>{cfg.desc}</p>

        {/* Show diff summary for promote */}
        {type === 'promote' && hasDiff && (
          <div className="mt-3 bg-amber-50 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700" style={sans}>{versions.diff.length} field(s) will be updated:</p>
            <ul className="mt-1 space-y-0.5">
              {versions.diff.map((d, i) => (
                <li key={i} className="text-[11px] text-amber-600" style={sans}>• {d.field}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Override checkbox */}
        {cfg.showOverride && (
          <label className="flex items-center gap-2 mt-4 p-3 bg-amber-50 rounded-xl cursor-pointer">
            <input type="checkbox" checked={overrideMedia} onChange={e => onOverrideChange(e.target.checked)} className="accent-[#D4B36A]" />
            <div>
              <p className="text-xs font-semibold text-amber-700" style={sans}>Override media minimum</p>
              <p className="text-[10px] text-amber-600" style={sans}>Publish with fewer than 3 photos (reason required)</p>
            </div>
          </label>
        )}

        {/* Reason */}
        <textarea
          value={reason}
          onChange={e => onReasonChange(e.target.value)}
          placeholder={cfg.reasonRequired ? 'Reason (required)' : 'Reason (optional)'}
          rows={2}
          className="w-full mt-4 px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-[#D4B36A]"
          style={sans}
          data-testid="action-reason-input"
        />

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600" style={sans}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={submitting || (cfg.reasonRequired && !reason.trim()) || (cfg.showOverride && overrideMedia && !reason.trim())}
            className={`flex-1 py-3 rounded-xl text-sm font-bold ${cfg.btnClass} disabled:opacity-40 flex items-center justify-center gap-2`}
            style={sans}
            data-testid="action-confirm-btn"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
