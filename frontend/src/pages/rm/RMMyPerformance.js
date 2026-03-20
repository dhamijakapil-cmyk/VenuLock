import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import {
  TrendingUp, Target, IndianRupee, Clock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Timer, RefreshCw, Shield,
  Calendar, CreditCard, ChevronRight, Minus,
} from 'lucide-react';

const formatHours = (hrs) => {
  if (hrs === null || hrs === undefined) return '--';
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
};

const CompareIndicator = ({ value, teamAvg, unit = '', inverse = false, isCurrency = false }) => {
  if (value === null || value === undefined || teamAvg === null || teamAvg === undefined) return null;
  const diff = value - teamAvg;
  const isGood = inverse ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 0.5;

  if (isNeutral) return (
    <span className="text-xs text-[#64748B] flex items-center gap-0.5">
      <Minus className="w-3 h-3" /> Team avg
    </span>
  );

  const displayDiff = isCurrency ? formatIndianCurrency(Math.abs(diff)) : `${Math.abs(diff).toFixed(1)}${unit}`;

  return (
    <span className={`text-xs flex items-center gap-0.5 ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
      {isGood ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {displayDiff} vs team
    </span>
  );
};

const RMMyPerformance = () => {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, alertRes] = await Promise.all([
        api.get('/rm/my-performance'),
        api.get('/rm/my-sla-alerts'),
      ]);
      setData(perfRes.data);
      setAlerts(alertRes.data);
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout title="My Performance" breadcrumbs={[{ label: 'Console', href: '/team/rm/dashboard' }, { label: 'My Performance' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const { funnel = {}, financials = {}, time_metrics = {}, team_averages = {} } = data || {};
  const { aging_leads = [], expiring_holds = [], pending_payments = [], summary: alertSummary = {} } = alerts || {};
  const totalAlerts = alertSummary.total_alerts || 0;

  return (
    <DashboardLayout
      title="My Performance"
      breadcrumbs={[{ label: 'Console', href: '/team/rm/dashboard' }, { label: 'My Performance' }]}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#111111]">Performance Overview</h2>
          <p className="text-sm text-[#64748B] mt-1">Your metrics vs. team of {team_averages.team_size} RMs</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-perf-btn">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* ═══════ SECTION A: Personal Funnel ═══════ */}
      <div className="bg-white border border-slate-200 p-6 mb-6" data-testid="funnel-section">
        <h3 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-5">Lead Funnel</h3>

        {/* Funnel Bars */}
        <div className="space-y-4 mb-6">
          {[
            { label: 'Assigned', value: funnel.assigned, pct: 100, color: '#111111' },
            { label: 'Contacted', value: funnel.contacted, pct: funnel.contacted_pct, color: '#1E3A5F' },
            { label: 'Site Visits', value: funnel.site_visits, pct: funnel.site_visit_pct, color: '#2D5F8A' },
            { label: 'Confirmed', value: funnel.confirmed, pct: funnel.confirmed_pct, color: '#16A34A' },
          ].map((stage, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#64748B]">{stage.label}</span>
                <span className="text-sm font-mono font-semibold text-[#111111]">
                  {stage.value} <span className="text-[#64748B] font-normal">({stage.pct}%)</span>
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stage.pct, 100)}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-[#64748B]">Lost</span>
            <span className="text-sm font-mono text-red-500">{funnel.lost}</span>
          </div>
        </div>

        {/* Conversion + Team Comparison */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="text-center" data-testid="my-conversion">
            <p className="text-xs text-[#64748B] uppercase tracking-wider">Conversion</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${
              funnel.conversion_rate >= 20 ? 'text-emerald-600' :
              funnel.conversion_rate >= 10 ? 'text-amber-600' : 'text-red-500'
            }`}>{funnel.conversion_rate}%</p>
            <CompareIndicator value={funnel.conversion_rate} teamAvg={team_averages.avg_conversion_rate} unit="%" />
          </div>
          <div className="text-center" data-testid="team-conversion">
            <p className="text-xs text-[#64748B] uppercase tracking-wider">Team Avg</p>
            <p className="text-2xl font-bold font-mono mt-1 text-[#64748B]">{team_averages.avg_conversion_rate}%</p>
            <span className="text-xs text-[#64748B]">conversion</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748B] uppercase tracking-wider flex items-center justify-center gap-1">
              <Timer className="w-3 h-3" /> First Contact
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-[#111111]">{formatHours(time_metrics.avg_first_contact_hrs)}</p>
            <span className={`text-xs ${
              time_metrics.avg_first_contact_hrs !== null && time_metrics.avg_first_contact_hrs <= 24
                ? 'text-emerald-600' : 'text-red-500'
            }`}>{time_metrics.avg_first_contact_hrs !== null && time_metrics.avg_first_contact_hrs <= 24 ? 'Within SLA' : 'Check SLA'}</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748B] uppercase tracking-wider flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Time to Close
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-[#111111]">{formatHours(time_metrics.avg_close_hrs)}</p>
            <span className="text-xs text-[#64748B]">avg</span>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION B: Financial Impact ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" data-testid="financials-section">
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total GMV</p>
              <p className="text-2xl font-bold font-mono text-[#111111] mt-2">{formatIndianCurrency(financials.total_gmv)}</p>
              <CompareIndicator value={financials.total_gmv} teamAvg={team_averages.avg_gmv_per_rm} isCurrency />
            </div>
            <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#111111]" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Commission Generated</p>
              <p className="text-2xl font-bold font-mono text-[#D4B36A] mt-2">{formatIndianCurrency(financials.total_commission)}</p>
              <span className="text-xs text-[#64748B]">Revenue attributed to you</span>
            </div>
            <div className="w-10 h-10 bg-[#F0E6D2] flex items-center justify-center rounded-lg">
              <IndianRupee className="w-5 h-5 text-[#D4B36A]" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Avg Deal Size</p>
              <p className="text-2xl font-bold font-mono text-[#111111] mt-2">{formatIndianCurrency(financials.avg_deal_size)}</p>
              <span className="text-xs text-[#64748B]">{funnel.confirmed} confirmed deals</span>
            </div>
            <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center rounded-lg">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION C: SLA Alerts ═══════ */}
      <div className="bg-white border border-slate-200" data-testid="sla-section">
        <div className={`p-5 border-b flex items-center justify-between ${
          totalAlerts > 0 ? 'bg-gradient-to-r from-red-50 to-white border-red-100' : 'bg-gradient-to-r from-emerald-50 to-white border-emerald-100'
        }`}>
          <div>
            <h3 className="text-sm font-semibold text-[#111111] uppercase tracking-wider flex items-center gap-2">
              {totalAlerts > 0 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-emerald-500" />}
              Action Required
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              {totalAlerts > 0
                ? `${alertSummary.critical} critical, ${alertSummary.warnings} warnings`
                : 'All leads within SLA thresholds'
              }
            </p>
          </div>
          {totalAlerts > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 text-lg px-3 py-1 font-mono">{totalAlerts}</Badge>
          )}
        </div>

        {totalAlerts === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="font-medium text-[#111111]">All Clear</p>
            <p className="text-sm text-[#64748B] mt-1">No aging leads, expiring holds, or pending payments</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Aging Leads */}
            {aging_leads.length > 0 && (
              <div className="p-5">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Aging Leads ({aging_leads.length})
                </h4>
                <div className="space-y-2">
                  {aging_leads.map((alert, i) => (
                    <Link
                      key={i}
                      to={`/rm/leads/${alert.lead_id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg group"
                      data-testid={`aging-lead-${i}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] border-0 shrink-0 ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>{alert.severity === 'critical' ? 'CRIT' : 'WARN'}</Badge>
                        <div>
                          <p className="text-sm font-medium text-[#111111]">{alert.customer_name}</p>
                          <p className="text-xs text-[#64748B]">{alert.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-semibold ${
                          alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                        }`}>+{formatHours(alert.hours_overdue)}</span>
                        <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#111111]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring Holds */}
            {expiring_holds.length > 0 && (
              <div className="p-5">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Holds Expiring Soon ({expiring_holds.length})
                </h4>
                <div className="space-y-2">
                  {expiring_holds.map((hold, i) => (
                    <Link
                      key={i}
                      to={`/rm/leads/${hold.lead_id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg group"
                      data-testid={`expiring-hold-${i}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] border-0 shrink-0 ${
                          hold.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>{hold.severity === 'critical' ? 'CRIT' : 'WARN'}</Badge>
                        <div>
                          <p className="text-sm font-medium text-[#111111]">{hold.venue_name}</p>
                          <p className="text-xs text-[#64748B]">Date: {hold.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-semibold ${
                          hold.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                        }`}>{formatHours(hold.hours_remaining)} left</span>
                        <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#111111]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Payments */}
            {pending_payments.length > 0 && (
              <div className="p-5">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Links Pending &gt;24h ({pending_payments.length})
                </h4>
                <div className="space-y-2">
                  {pending_payments.map((pmt, i) => (
                    <Link
                      key={i}
                      to={`/rm/leads/${pmt.lead_id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg group"
                      data-testid={`pending-payment-${i}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] border-0 shrink-0 ${
                          pmt.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>{pmt.severity === 'critical' ? 'CRIT' : 'WARN'}</Badge>
                        <div>
                          <p className="text-sm font-medium text-[#111111]">{pmt.customer_name}</p>
                          <p className="text-xs text-[#64748B]">{formatIndianCurrency(pmt.amount)} pending</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-red-600">
                          {formatHours(pmt.hours_pending)} ago
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#111111]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RMMyPerformance;
