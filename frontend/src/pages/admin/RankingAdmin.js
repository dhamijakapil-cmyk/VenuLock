import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Settings, Zap, Eye, GitCompare, Shield, Save,
  AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Loader2, History, ToggleLeft, ToggleRight, Activity,
  MapPin, Users, IndianRupee, Sparkles, Target, Building2,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const WEIGHT_LABELS = {
  customer_fit: { label: 'Customer Fit', icon: Target, desc: 'How well venue matches search criteria' },
  supply_quality: { label: 'Supply Quality', icon: Shield, desc: 'Listing completeness & verification' },
  freshness: { label: 'Freshness', icon: Sparkles, desc: 'Recency of publish/update' },
  engagement: { label: 'Engagement', icon: Activity, desc: 'Reviews, enquiries, views' },
};

const FIT_LABELS = {
  distance_location: { label: 'Distance / Location', icon: MapPin, desc: 'Proximity to preferred area' },
  event_type: { label: 'Event Type Match', icon: Zap, desc: 'Wedding, corporate, etc.' },
  capacity: { label: 'Capacity Fit', icon: Users, desc: 'Guest count vs venue capacity' },
  budget: { label: 'Budget Fit', icon: IndianRupee, desc: 'Price vs customer budget' },
  style_vibe: { label: 'Style / Vibe', icon: Sparkles, desc: 'Venue type, vibes match' },
  amenity: { label: 'Amenity Fit', icon: Building2, desc: 'Required amenities match' },
};

export default function RankingAdmin() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({});
  const [fitSubs, setFitSubs] = useState({});
  const [engine, setEngine] = useState({});
  const [showAudit, setShowAudit] = useState(false);
  const [reason, setReason] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/ranking/config');
      setConfig(res.data);
      setWeights(res.data.weights || {});
      setFitSubs(res.data.fit_subfactors || {});
      setEngine({
        mode: res.data.mode,
        diversity_strength: res.data.diversity_strength,
        freshness_boost_days: res.data.freshness_boost_days,
        quality_threshold: res.data.quality_threshold,
        verified_boost_points: res.data.verified_boost_points,
      });
    } catch (err) { toast.error('Failed to load config'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/ranking/config', {
        weights,
        fit_subfactors: fitSubs,
        mode: engine.mode,
        diversity_strength: engine.diversity_strength,
        freshness_boost_days: engine.freshness_boost_days,
        quality_threshold: engine.quality_threshold,
        verified_boost_points: engine.verified_boost_points,
        reason: reason.trim() || undefined,
      });
      toast.success('Ranking config updated');
      setReason('');
      fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const updateWeight = (key, value) => {
    const v = Math.max(0, Math.min(1, parseFloat(value) || 0));
    setWeights(prev => ({ ...prev, [key]: v }));
  };

  const updateFitSub = (key, value) => {
    const v = Math.max(0, Math.min(1, parseFloat(value) || 0));
    setFitSubs(prev => ({ ...prev, [key]: v }));
  };

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const fitSum = Object.values(fitSubs).reduce((a, b) => a + b, 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
      <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="ranking-admin">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/team/field/publish')} className="p-1.5 rounded-lg bg-white/10 active:bg-white/20" data-testid="ranking-back-btn">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold tracking-tight" style={sans}>Ranking Engine</h1>
            <p className="text-white/50 text-xs" style={sans}>Tuning & governance controls</p>
          </div>
          <button
            onClick={() => navigate('/team/admin/ranking/shadow')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4B36A]/20 text-[#D4B36A] text-xs font-semibold"
            style={sans}
            data-testid="go-shadow-btn"
          >
            <GitCompare className="w-3.5 h-3.5" />Shadow
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3 bg-white/[0.08] rounded-xl px-4 py-3">
          <div className="flex-1">
            <p className="text-white text-sm font-bold" style={sans}>Engine Mode</p>
            <p className="text-white/50 text-[11px]" style={sans}>
              {engine.mode === 'validation' ? 'Shadow mode — engine scores visible but not affecting public order' : 'LIVE — engine controls public venue ordering'}
            </p>
          </div>
          <button
            onClick={() => setEngine(p => ({ ...p, mode: p.mode === 'validation' ? 'live' : 'validation' }))}
            className={`p-1 rounded-lg ${engine.mode === 'live' ? 'text-emerald-400' : 'text-white/40'}`}
            data-testid="mode-toggle"
          >
            {engine.mode === 'live' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
        {engine.mode === 'live' && (
          <div className="mt-2 flex items-center gap-2 bg-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-[11px] font-medium" style={sans}>Live mode — engine scores directly affect public ranking</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Top-level weights */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#D4B36A]" />
            <h2 className="text-sm font-bold text-[#0B0B0D]" style={sans}>Scoring Weights</h2>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
              Math.abs(weightSum - 1) < 0.05 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`} style={sans}>Sum: {weightSum.toFixed(2)}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(WEIGHT_LABELS).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="px-4 py-3 flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0B0B0D]" style={sans}>{meta.label}</p>
                    <p className="text-[10px] text-slate-400" style={sans}>{meta.desc}</p>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={weights[key] || 0}
                    onChange={e => updateWeight(key, e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-center text-xs font-bold text-[#0B0B0D] focus:outline-none focus:border-[#D4B36A]"
                    style={sans}
                    data-testid={`weight-${key}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Customer Fit subfactors */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#D4B36A]" />
            <h2 className="text-sm font-bold text-[#0B0B0D]" style={sans}>Customer Fit Subfactors</h2>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
              Math.abs(fitSum - 1) < 0.05 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`} style={sans}>Sum: {fitSum.toFixed(2)}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(FIT_LABELS).map(([key, meta]) => {
              const Icon = meta.icon;
              const isDistance = key === 'distance_location';
              return (
                <div key={key} className={`px-4 py-3 flex items-center gap-3 ${isDistance ? 'bg-amber-50/50' : ''}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isDistance ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isDistance ? 'text-amber-700' : 'text-[#0B0B0D]'}`} style={sans}>
                      {meta.label} {isDistance && <span className="text-[9px] font-normal text-amber-500 ml-1">MAJOR FACTOR</span>}
                    </p>
                    <p className="text-[10px] text-slate-400" style={sans}>{meta.desc}</p>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={fitSubs[key] || 0}
                    onChange={e => updateFitSub(key, e.target.value)}
                    className={`w-16 px-2 py-1.5 rounded-lg border text-center text-xs font-bold focus:outline-none focus:border-[#D4B36A] ${
                      isDistance ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-[#0B0B0D]'
                    }`}
                    style={sans}
                    data-testid={`fit-${key}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-slate-50">
            <p className="text-[10px] text-slate-500" style={sans}>
              Distance weight dynamically adjusts based on travel flexibility: strictly_nearby=0.40, city_wide=0.15, destination=0.03
            </p>
          </div>
        </section>

        {/* Engine parameters */}
        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#0B0B0D] flex items-center gap-2" style={sans}>
            <Zap className="w-4 h-4 text-[#D4B36A]" />Engine Parameters
          </h2>
          {[
            { key: 'diversity_strength', label: 'Diversity Strength', step: 0.05, min: 0, max: 1 },
            { key: 'freshness_boost_days', label: 'Freshness Boost Window (days)', step: 5, min: 7, max: 90 },
            { key: 'quality_threshold', label: 'Quality Threshold (min score)', step: 5, min: 0, max: 80 },
            { key: 'verified_boost_points', label: 'Verified Boost Points', step: 1, min: 0, max: 20 },
          ].map(p => (
            <div key={p.key} className="flex items-center justify-between">
              <label className="text-xs text-slate-600" style={sans}>{p.label}</label>
              <input
                type="number"
                step={p.step}
                min={p.min}
                max={p.max}
                value={engine[p.key] ?? 0}
                onChange={e => setEngine(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))}
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-center text-xs font-bold text-[#0B0B0D] focus:outline-none focus:border-[#D4B36A]"
                style={sans}
                data-testid={`param-${p.key}`}
              />
            </div>
          ))}
        </section>

        {/* Save */}
        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for changes (optional but logged)"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#D4B36A]"
            style={sans}
            data-testid="config-reason"
          />
          <button
            onClick={handleSave}
            disabled={saving || (Math.abs(weightSum - 1) > 0.05) || (Math.abs(fitSum - 1) > 0.05)}
            className="w-full py-3 rounded-xl bg-[#D4B36A] text-[#0B0B0D] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={sans}
            data-testid="save-config-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </section>

        {/* Audit trail */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button onClick={() => setShowAudit(!showAudit)} className="w-full flex items-center gap-2 px-4 py-3">
            <History className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-[#0B0B0D] flex-1 text-left" style={sans}>Config Audit Trail</span>
            {showAudit ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showAudit && (
            <div className="px-4 pb-4 space-y-2" data-testid="config-audit">
              {(config?.audit || []).slice().reverse().map((entry, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#0B0B0D]" style={sans}>{entry.actor_name} ({entry.actor_role})</span>
                    <span className="text-[10px] text-slate-400" style={sans}>
                      {new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {entry.changes?.map((c, j) => (
                    <p key={j} className="text-[11px] text-slate-600" style={sans}>• {c}</p>
                  ))}
                  {entry.reason && <p className="text-[11px] text-slate-500 italic mt-1" style={sans}>"{entry.reason}"</p>}
                </div>
              ))}
              {(!config?.audit || config.audit.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4" style={sans}>No changes yet</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
