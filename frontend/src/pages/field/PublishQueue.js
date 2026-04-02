import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import {
  ArrowLeft, ChevronRight, MapPin, Camera, Building2,
  CheckCircle2, XCircle, AlertCircle, Globe, EyeOff, Archive,
  Ban, Shield, Zap, Users,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const TABS = [
  { value: 'ready', label: 'Ready', icon: Zap },
  { value: 'live', label: 'Live', icon: Globe },
  { value: 'hidden', label: 'Hidden', icon: EyeOff },
  { value: 'unpublished', label: 'Unpublished', icon: Ban },
  { value: 'archived', label: 'Archived', icon: Archive },
];

const READINESS_STYLE = {
  ready: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Ready' },
  ready_with_override: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle, label: 'Override Needed' },
  not_ready: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: XCircle, label: 'Not Ready' },
};

const STATUS_BADGE = {
  owner_onboarding_completed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Onboarded' },
  publish_ready: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Publish Ready' },
  published_live: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Live' },
  hidden_from_public: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Hidden' },
  unpublished: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Unpublished' },
  archived: { bg: 'bg-red-50', text: 'text-red-600', label: 'Archived' },
};

const RANKING_BADGE = {
  not_eligible: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Not Eligible' },
  eligible: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Eligible' },
  blocked_quality: { bg: 'bg-red-50', text: 'text-red-600', label: 'Blocked' },
  hidden: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Hidden' },
};

export default function PublishQueue() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ready');
  const [stats, setStats] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/publish/queue?tab=${tab}`);
      setItems(res.data.items || []);
      setStats(res.data.stats || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTabCount = (tabVal) => {
    const map = {
      ready: (stats.owner_onboarding_completed || 0) + (stats.publish_ready || 0),
      live: stats.published_live || 0,
      hidden: stats.hidden_from_public || 0,
      unpublished: stats.unpublished || 0,
      archived: stats.archived || 0,
    };
    return map[tabVal] || 0;
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="publish-queue">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/team/field/approve')} className="p-1.5 rounded-lg bg-white/10 active:bg-white/20" data-testid="publish-back-btn">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight" style={sans}>Publish Governance</h1>
            <p className="text-white/50 text-xs" style={sans}>Supply activation & visibility control</p>
          </div>
          <button
            onClick={() => navigate('/team/admin/ranking')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4B36A]/20 text-[#D4B36A] text-xs font-semibold ml-auto"
            style={sans}
            data-testid="go-ranking-btn"
          >
            <Zap className="w-3.5 h-3.5" />Ranking
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {TABS.map(t => {
            const active = tab === t.value;
            const count = getTabCount(t.value);
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                  active ? 'bg-[#D4B36A] text-[#0B0B0D]' : 'bg-white/10 text-white/60'
                }`}
                style={sans}
                data-testid={`publish-tab-${t.value}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? 'bg-[#0B0B0D]/20 text-[#0B0B0D]' : 'bg-white/10 text-white/50'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16" data-testid="publish-empty">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              {tab === 'ready' ? <Zap className="w-5 h-5 text-slate-400" /> : <Globe className="w-5 h-5 text-slate-400" />}
            </div>
            <p className="text-slate-500 text-sm font-medium" style={sans}>
              No venues in {TABS.find(t => t.value === tab)?.label || tab} state
            </p>
          </div>
        ) : (
          items.map(item => {
            const readinessStyle = READINESS_STYLE[item.publish_readiness] || READINESS_STYLE.not_ready;
            const ReadinessIcon = readinessStyle.icon;
            const statusBadge = STATUS_BADGE[item.status] || STATUS_BADGE.owner_onboarding_completed;
            const rankBadge = RANKING_BADGE[item.ranking_eligibility] || RANKING_BADGE.not_eligible;

            return (
              <button
                key={item.acquisition_id}
                onClick={() => navigate(`/team/field/publish/${item.acquisition_id}`)}
                className="w-full bg-white rounded-2xl border border-slate-100 p-4 text-left active:scale-[0.98] transition-transform shadow-sm"
                data-testid={`publish-card-${item.acquisition_id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-[#0B0B0D] truncate" style={sans}>
                      {item.venue_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500" style={sans}>
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.locality}, {item.city}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </div>

                {/* Info row */}
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500" style={sans}>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {(item.venue_type || '').replace('_', ' ')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {item.capacity_min}–{item.capacity_max}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    {item.photo_count} photos
                  </span>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge.bg} ${statusBadge.text}`} style={sans}>
                    {statusBadge.label}
                  </span>

                  {/* Readiness badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${readinessStyle.bg} ${readinessStyle.text}`} style={sans}>
                    <ReadinessIcon className="w-2.5 h-2.5" />
                    {readinessStyle.label} {item.readiness_score}
                  </span>

                  {/* Ranking badge (only for live/hidden) */}
                  {item.ranking_eligibility && tab !== 'ready' && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rankBadge.bg} ${rankBadge.text}`} style={sans}>
                      <Shield className="w-2.5 h-2.5" />
                      {rankBadge.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
