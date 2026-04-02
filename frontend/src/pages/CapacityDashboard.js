import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import {
  Activity, Users, AlertTriangle, TrendingUp, Clock,
  Building2, FileCheck, CreditCard, ChevronLeft, RefreshCw,
  ShieldAlert, UserPlus, ArrowUpRight, BarChart3
} from 'lucide-react';

// ── Severity badge ──
const SeverityBadge = ({ severity }) => {
  const styles = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[severity] || styles.info}`}>
      {severity}
    </span>
  );
};

// ── Metric card ──
const MetricCard = ({ label, value, sub, icon: Icon, alert }) => (
  <div className={`rounded-lg border p-3.5 ${alert ? 'border-red-500/30 bg-red-500/5' : 'border-white/8 bg-white/[0.03]'}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
      {Icon && <Icon className={`w-3.5 h-3.5 ${alert ? 'text-red-400' : 'text-white/20'}`} />}
    </div>
    <div className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-white'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {value}
    </div>
    {sub && <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>}
  </div>
);

// ── RM Load Bar ──
const RMLoadBar = ({ rm }) => {
  const pct = Math.min(rm.capacity_pct, 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-24 truncate text-xs text-white/70 font-medium">{rm.name?.split(' ')[0]}</div>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`w-16 text-right text-xs font-mono font-bold ${textColor}`}>
        {rm.active_cases}/{25}
      </div>
      {rm.overdue_followups > 0 && (
        <div className="text-[10px] text-red-400/70 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />{rm.overdue_followups}
        </div>
      )}
    </div>
  );
};

// ── Recommendation card ──
const RecommendationCard = ({ alert }) => {
  const icons = {
    'Relationship Team': Users,
    'Operations': Activity,
    'Data Team': FileCheck,
    'Finance': CreditCard,
  };
  const Icon = icons[alert.category] || AlertTriangle;

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          alert.severity === 'critical' ? 'bg-red-500/15' : 'bg-amber-500/15'
        }`}>
          <Icon className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white">{alert.title}</span>
            <SeverityBadge severity={alert.severity} />
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed mb-2">{alert.message}</p>
          <div className="flex items-start gap-2 bg-[#D4B36A]/8 border border-[#D4B36A]/20 rounded-md p-2.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-[#D4B36A] shrink-0 mt-0.5" />
            <span className="text-[11px] text-[#D4B36A]/90 font-medium leading-relaxed">{alert.recommendation}</span>
          </div>
          <div className="text-[10px] text-white/25 mt-2 uppercase tracking-wider">{alert.category}</div>
        </div>
      </div>
    </div>
  );
};

// ── Backlog row ──
const BacklogRow = ({ label, count, threshold, icon: Icon }) => {
  const isOver = count >= threshold;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <div className={`text-sm font-bold font-mono ${isOver ? 'text-red-400' : 'text-white/80'}`}>{count}</div>
    </div>
  );
};

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function CapacityDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/platform-ops/capacity/analysis');
      setData(res.data);
    } catch (err) {
      console.error('Capacity fetch failed:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <p className="text-white/40 text-sm">Admin access required</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  const d = data || {};
  const alerts = d.alerts || [];
  const rmLoads = (d.rm_loads || []).sort((a, b) => b.active_cases - a.active_cases);
  const critCount = d.alert_count?.critical || 0;
  const warnCount = d.alert_count?.warning || 0;
  const overloadedCount = rmLoads.filter(r => r.capacity_pct >= 90).length;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white" data-testid="capacity-dashboard">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0D]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/5 transition" data-testid="capacity-back-btn">
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <BarChart3 className="w-4 h-4 text-[#D4B36A]" />
                Workforce Health
              </h1>
              <p className="text-[10px] text-white/30">Ven-Us Capacity Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {critCount > 0 && (
              <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                {critCount} critical
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg hover:bg-white/5 transition disabled:opacity-50"
              data-testid="capacity-refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-6">
        {/* ── Summary Cards ── */}
        <section data-testid="summary-cards">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Today's Enquiries" value={d.today_enquiries || 0} sub={`${((d.today_enquiries || 0) / Math.max(d.total_rms, 1)).toFixed(1)} per RM`} icon={TrendingUp} alert={d.today_enquiries > d.total_rms * 15} />
            <MetricCard label="Avg RM Load" value={d.avg_rm_load || 0} sub={`Threshold: 25`} icon={Users} alert={d.avg_rm_load >= 22} />
            <MetricCard label="Overloaded RMs" value={`${overloadedCount}/${d.total_rms || 0}`} sub="At 90%+ capacity" icon={ShieldAlert} alert={overloadedCount > 0} />
            <MetricCard label="Overdue Follow-ups" value={`${d.overdue_followups_pct || 0}%`} sub={`${d.overdue_followups || 0} of ${d.total_followups || 0}`} icon={Clock} alert={d.overdue_followups_pct >= 40} />
          </div>
        </section>

        {/* ── RM Load Heatmap ── */}
        <section data-testid="rm-heatmap">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">RM Load Distribution</h2>
            <div className="flex items-center gap-3 text-[9px] text-white/30">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;70%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 70-90%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;90%</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
            {rmLoads.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-4">No active RMs</p>
            ) : (
              rmLoads.map(rm => <RMLoadBar key={rm.rm_id} rm={rm} />)
            )}
          </div>
        </section>

        {/* ── Two-column: Backlogs + Alerts ── */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Backlog Section */}
          <section data-testid="backlog-section">
            <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Operational Backlogs</h2>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
              <BacklogRow label="Stale Cases (30+ days)" count={d.aged_cases || 0} threshold={10} icon={Clock} />
              <BacklogRow label="Venue Approvals Pending" count={d.venue_backlog || 0} threshold={20} icon={Building2} />
              <BacklogRow label="Settlements Pending" count={d.settlement_pending || 0} threshold={10} icon={CreditCard} />
              <BacklogRow label="Follow-ups Overdue" count={d.overdue_followups || 0} threshold={5} icon={AlertTriangle} />
            </div>
          </section>

          {/* Alert count summary */}
          <section data-testid="alert-summary">
            <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Alert Summary</h2>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Critical alerts</span>
                <span className={`text-lg font-bold font-mono ${critCount > 0 ? 'text-red-400' : 'text-white/30'}`}>{critCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Warnings</span>
                <span className={`text-lg font-bold font-mono ${warnCount > 0 ? 'text-amber-400' : 'text-white/30'}`}>{warnCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Total RMs</span>
                <span className="text-lg font-bold font-mono text-white/80">{d.total_rms || 0}</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/25">Last analyzed: {d.analyzed_at ? new Date(d.analyzed_at).toLocaleTimeString() : '—'}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── Ven-Us Recommendations ── */}
        <section data-testid="recommendations">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">Ven-Us Recommendations</h2>
            <span className="text-[9px] text-white/20 border border-white/10 rounded px-1.5 py-0.5">ADVISORY ONLY</span>
          </div>
          {alerts.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
              <p className="text-xs text-emerald-400 font-medium">All systems healthy. No capacity alerts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => <RecommendationCard key={i} alert={alert} />)}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="text-center py-4 text-[10px] text-white/15">
          Ven-Us Capacity Intelligence — Advisory Only — Not Actionable Without Leadership Approval
        </div>
      </div>
    </div>
  );
}
