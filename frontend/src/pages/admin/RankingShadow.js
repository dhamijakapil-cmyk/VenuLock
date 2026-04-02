import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, GitCompare, Search, MapPin, Users,
  ChevronUp, ChevronDown, Minus, Loader2, Zap,
  Target, Shield, Sparkles, Activity, AlertTriangle,
  IndianRupee, Building2, Eye, Navigation,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const TRAVEL_OPTIONS = [
  { value: 'strictly_nearby', label: 'Strictly Nearby', icon: '📍' },
  { value: 'moderately_flexible', label: 'Moderately Flexible', icon: '🔄' },
  { value: 'city_wide', label: 'City-wide OK', icon: '🏙' },
  { value: 'willing_to_travel', label: 'Willing to Travel', icon: '🚗' },
  { value: 'destination', label: 'Destination Style', icon: '✈' },
];

export default function RankingShadow() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({
    city: 'Delhi',
    preferred_locality: '',
    hard_locality: '',
    event_type: 'wedding',
    guests: 300,
    budget_per_plate: 3000,
    travel_flexibility: 'moderately_flexible',
  });
  const [loading, setLoading] = useState(false);
  const [shadowData, setShadowData] = useState(null);
  const [bucketData, setBucketData] = useState(null);
  const [view, setView] = useState('shadow');
  const [expandedVenue, setExpandedVenue] = useState(null);
  const [explainData, setExplainData] = useState({});

  const runShadow = useCallback(async () => {
    setLoading(true);
    try {
      const [shadowRes, runRes] = await Promise.all([
        api.post('/ranking/shadow', search),
        api.post('/ranking/run', search),
      ]);
      setShadowData(shadowRes.data);
      setBucketData(runRes.data);
    } catch (err) { toast.error('Engine run failed'); }
    finally { setLoading(false); }
  }, [search]);

  const loadExplain = async (acqId) => {
    if (explainData[acqId]) {
      setExpandedVenue(expandedVenue === acqId ? null : acqId);
      return;
    }
    try {
      const params = new URLSearchParams({
        city: search.city || '',
        preferred_locality: search.preferred_locality || '',
        event_type: search.event_type || '',
        guests: search.guests || 0,
        budget_per_plate: search.budget_per_plate || 0,
        travel_flexibility: search.travel_flexibility || 'moderately_flexible',
      });
      const res = await api.get(`/ranking/venue/${acqId}/explain?${params}`);
      setExplainData(prev => ({ ...prev, [acqId]: res.data }));
      setExpandedVenue(acqId);
    } catch {
      toast.error('Could not load score explanation');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="ranking-shadow">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/team/admin/ranking')} className="p-1.5 rounded-lg bg-white/10" data-testid="shadow-back-btn">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold" style={sans}>Shadow Comparison</h1>
            <p className="text-white/50 text-xs" style={sans}>Engine vs current DB ordering</p>
          </div>
        </div>
      </div>

      {/* Search controls */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={search.city} onChange={e => setSearch(p => ({ ...p, city: e.target.value }))} placeholder="City" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" style={sans} data-testid="search-city" />
          <input value={search.preferred_locality} onChange={e => setSearch(p => ({ ...p, preferred_locality: e.target.value }))} placeholder="Preferred Locality" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" style={sans} data-testid="search-locality" />
          <input value={search.event_type} onChange={e => setSearch(p => ({ ...p, event_type: e.target.value }))} placeholder="Event Type" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" style={sans} />
          <input value={search.guests} onChange={e => setSearch(p => ({ ...p, guests: parseInt(e.target.value) || 0 }))} placeholder="Guests" type="number" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" style={sans} />
          <input value={search.budget_per_plate} onChange={e => setSearch(p => ({ ...p, budget_per_plate: parseInt(e.target.value) || 0 }))} placeholder="Budget/plate" type="number" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" style={sans} />
          <input value={search.hard_locality} onChange={e => setSearch(p => ({ ...p, hard_locality: e.target.value }))} placeholder="Hard Filter (area)" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" style={sans} data-testid="search-hard-locality" />
        </div>

        {/* Travel flexibility */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {TRAVEL_OPTIONS.map(t => (
            <button
              key={t.value}
              onClick={() => setSearch(p => ({ ...p, travel_flexibility: t.value }))}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-semibold transition-colors ${
                search.travel_flexibility === t.value ? 'bg-[#D4B36A] text-[#0B0B0D]' : 'bg-slate-100 text-slate-500'
              }`}
              style={sans}
              data-testid={`travel-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={runShadow}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[#0B0B0D] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={sans}
          data-testid="run-shadow-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Run Engine
        </button>
      </div>

      {/* View tabs */}
      {(shadowData || bucketData) && (
        <div className="bg-white border-b border-slate-100 px-4 flex gap-1">
          {[
            { id: 'shadow', label: 'Shadow Comparison', icon: GitCompare },
            { id: 'buckets', label: 'Customer Buckets', icon: Target },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${
                view === t.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400'
              }`}
              style={sans}
              data-testid={`view-tab-${t.id}`}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {!shadowData && !loading && (
          <div className="text-center py-16">
            <GitCompare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500" style={sans}>Configure search above and run the engine</p>
          </div>
        )}

        {view === 'shadow' && shadowData && (
          <ShadowView data={shadowData} onExpand={loadExplain} expandedVenue={expandedVenue} explainData={explainData} />
        )}

        {view === 'buckets' && bucketData && (
          <BucketView data={bucketData} />
        )}
      </div>
    </div>
  );
}

function ShadowView({ data, onExpand, expandedVenue, explainData }) {
  return (
    <div className="space-y-3" data-testid="shadow-view">
      <div className="flex items-center gap-3 text-xs text-slate-500" style={sans}>
        <span>Current DB: {data.current_count} venues</span>
        <span>Engine: {data.engine_count} scored</span>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
          data.mode === 'validation' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
        }`}>{data.mode?.toUpperCase()}</span>
      </div>

      {data.comparison.map((item, i) => {
        const change = item.position_change;
        const isExpanded = expandedVenue === item.venue_id;
        const explain = explainData[item.venue_id];

        return (
          <div key={item.venue_id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden" data-testid={`shadow-card-${i}`}>
            <button onClick={() => item.from_pipeline && onExpand(item.venue_id)} className="w-full p-3 text-left">
              <div className="flex items-center gap-3">
                {/* Engine rank */}
                <div className="w-8 h-8 rounded-lg bg-[#0B0B0D] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#D4B36A] text-xs font-bold">#{item.engine_position || '–'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#0B0B0D] truncate" style={sans}>{item.venue_name}</p>
                  <p className="text-[10px] text-slate-400" style={sans}>{item.area}, {item.city}</p>
                </div>

                {/* Position change */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  {change !== null ? (
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${
                      change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-slate-400'
                    }`} style={sans}>
                      {change > 0 ? <ChevronUp className="w-3 h-3" /> : change < 0 ? <ChevronDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {change > 0 ? `+${change}` : change === 0 ? '0' : change}
                    </span>
                  ) : <span className="text-[10px] text-slate-300">—</span>}
                  <span className="text-[9px] text-slate-400" style={sans}>was #{item.current_position || '–'}</span>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0 ml-1">
                  <p className="text-xs font-bold text-[#0B0B0D]" style={sans}>{item.engine_score?.toFixed(1) || '–'}</p>
                  <p className="text-[9px] text-slate-400" style={sans}>fit: {item.customer_fit?.toFixed(0)}</p>
                </div>
              </div>

              {/* Pipeline badge */}
              {item.from_pipeline && (
                <span className="inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 uppercase" style={sans}>
                  <Shield className="w-2.5 h-2.5" />Pipeline Verified
                </span>
              )}
            </button>

            {/* Expanded explain view */}
            {isExpanded && explain && <ExplainPanel data={explain} />}
          </div>
        );
      })}
    </div>
  );
}

function ExplainPanel({ data }) {
  const r = data.ranking;
  const cfb = r.customer_fit_breakdown;

  const fitEntries = [
    { key: 'distance_location', label: 'Distance', icon: MapPin, highlight: true },
    { key: 'event_type', label: 'Event Type', icon: Zap },
    { key: 'capacity', label: 'Capacity', icon: Users },
    { key: 'budget', label: 'Budget', icon: IndianRupee },
    { key: 'style_vibe', label: 'Style', icon: Sparkles },
    { key: 'amenity', label: 'Amenity', icon: Building2 },
  ];

  return (
    <div className="border-t border-slate-100 px-3 pb-3 pt-2 bg-slate-50/50" data-testid="explain-panel">
      {/* Eligibility */}
      <div className="flex items-center gap-2 mb-2">
        {data.is_eligible ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" style={sans}>ELIGIBLE</span>
        ) : (
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full" style={sans}>NOT ELIGIBLE</span>
        )}
        {data.blockers?.map((b, i) => (
          <span key={i} className="text-[9px] text-red-500 flex items-center gap-1" style={sans}>
            <AlertTriangle className="w-2.5 h-2.5" />{b}
          </span>
        ))}
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        <ScorePill label="Total" value={r.total_score} />
        <ScorePill label="Fit" value={r.customer_fit} />
        <ScorePill label="Quality" value={r.supply_quality.score} />
        <ScorePill label="Fresh" value={r.freshness.score} />
      </div>

      {/* Customer Fit breakdown bars */}
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" style={sans}>Customer Fit Breakdown</p>
      <div className="space-y-1.5">
        {fitEntries.map(({ key, label, icon: Icon, highlight }) => {
          const d = cfb[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <Icon className={`w-3 h-3 flex-shrink-0 ${highlight ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="text-[10px] w-14 flex-shrink-0 font-medium text-slate-600" style={sans}>{label}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    d.score >= 80 ? 'bg-emerald-400' : d.score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <span className="text-[10px] font-bold w-7 text-right" style={sans}>{d.score}</span>
            </div>
          );
        })}
      </div>

      {/* Detail text */}
      <div className="mt-2 space-y-0.5">
        {fitEntries.map(({ key }) => {
          const d = cfb[key];
          return <p key={key} className="text-[9px] text-slate-400" style={sans}>{key}: {d.detail}</p>;
        })}
      </div>
    </div>
  );
}

function ScorePill({ label, value }) {
  const color = value >= 70 ? 'bg-emerald-50 text-emerald-700' : value >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
  return (
    <div className={`rounded-lg p-1.5 text-center ${color}`}>
      <p className="text-[9px] font-medium opacity-70" style={sans}>{label}</p>
      <p className="text-xs font-bold" style={sans}>{typeof value === 'number' ? value.toFixed(0) : '–'}</p>
    </div>
  );
}

function BucketView({ data }) {
  const buckets = [
    { key: 'best_matches', label: 'Best Matches', icon: Target, desc: 'Top ranked by total score' },
    { key: 'smart_alternatives', label: 'Smart Alternatives', icon: Sparkles, desc: 'Diverse picks for variety' },
    { key: 'expert_picks', label: 'Expert Picks', icon: Shield, desc: 'High quality + verified, broader match' },
  ];

  return (
    <div className="space-y-4" data-testid="bucket-view">
      <div className="flex items-center gap-3 text-xs text-slate-500" style={sans}>
        <span>Eligible: {data.total_eligible}</span>
        <span>Scored: {data.total_scored}</span>
        <span>Threshold: {data.quality_threshold}</span>
      </div>

      {buckets.map(b => {
        const items = data.buckets[b.key] || [];
        const Icon = b.icon;
        return (
          <div key={b.key}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#D4B36A]" />
              <h3 className="text-sm font-bold text-[#0B0B0D]" style={sans}>{b.label}</h3>
              <span className="text-[10px] text-slate-400 ml-1" style={sans}>({items.length})</span>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 pl-6" style={sans}>No venues in this bucket</p>
            ) : (
              <div className="space-y-2 pl-1">
                {items.map((item, i) => (
                  <BucketCard key={item.venue.venue_id} item={item} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BucketCard({ item, rank }) {
  const v = item.venue;
  const r = item.ranking;
  const cfb = r.customer_fit_breakdown;

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3" data-testid={`bucket-card-${rank}`}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[#0B0B0D] flex items-center justify-center flex-shrink-0">
          <span className="text-[#D4B36A] text-[10px] font-bold">#{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#0B0B0D] truncate" style={sans}>{v.name}</p>
          <p className="text-[10px] text-slate-400" style={sans}>{v.area}, {v.city}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-[#0B0B0D]" style={sans}>{r.total_score.toFixed(0)}</p>
          <p className="text-[9px] text-slate-400" style={sans}>fit: {r.customer_fit.toFixed(0)}</p>
        </div>
      </div>

      {/* Mini score bars */}
      <div className="flex gap-1 mt-2">
        {['distance_location', 'event_type', 'capacity', 'budget'].map(k => {
          const score = cfb[k].score;
          const color = score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';
          return (
            <div key={k} className="flex-1">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
              </div>
              <p className="text-[8px] text-slate-400 text-center mt-0.5" style={sans}>{k.split('_')[0]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
