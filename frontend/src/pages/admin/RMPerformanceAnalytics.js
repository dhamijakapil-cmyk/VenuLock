import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  TrendingUp, Users, Target, IndianRupee, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ArrowUpRight, Timer, Shield, Zap,
  RefreshCw,
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

const FUNNEL_COLORS = ['#111111', '#1E3A5F', '#2D5F8A', '#C8A960', '#16A34A'];

const formatHours = (hrs) => {
  if (hrs === null || hrs === undefined) return '--';
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
};

const MetricCard = ({ label, value, subtext, icon: Icon, color, testId }) => (
  <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider truncate">{label}</p>
        <p className={`text-2xl font-bold mt-2 font-mono ${color || 'text-[#111111]'}`}>{value}</p>
        {subtext && <p className="text-xs text-[#64748B] mt-1">{subtext}</p>}
      </div>
      <div className={`w-10 h-10 flex items-center justify-center rounded-lg shrink-0 ${
        color === 'text-emerald-600' ? 'bg-emerald-100' :
        color === 'text-[#C8A960]' ? 'bg-[#F0E6D2]' :
        color === 'text-blue-600' ? 'bg-blue-100' :
        color === 'text-amber-600' ? 'bg-amber-100' :
        'bg-slate-100'
      }`}>
        <Icon className={`w-5 h-5 ${color || 'text-[#111111]'}`} />
      </div>
    </div>
  </div>
);

const RMPerformanceAnalytics = () => {
  const [data, setData] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [expandedRM, setExpandedRM] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, slaRes] = await Promise.all([
        api.get(`/admin/rm-analytics?time_period=${period}`),
        api.get('/admin/sla-breaches'),
      ]);
      setData(analyticsRes.data);
      setSlaData(slaRes.data);
    } catch (error) {
      console.error('Error fetching RM analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout title="RM Performance Analytics" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'RM Analytics' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const { rms = [], summary = {} } = data || {};
  const { sla_breaches = [], summary: slaSummary = {} } = slaData || {};

  // Chart data: top 5 RMs by GMV
  const gmvChartData = rms.slice(0, 8).map((rm) => ({
    name: rm.rm_name.split(' ')[0],
    gmv: rm.financials.total_gmv,
    commission: rm.financials.total_commission,
  }));

  // Funnel data from top RM
  const buildFunnelData = (rm) => [
    { name: 'Assigned', value: rm.funnel.assigned, fill: FUNNEL_COLORS[0] },
    { name: 'Contacted', value: rm.funnel.contacted, fill: FUNNEL_COLORS[1] },
    { name: 'Site Visits', value: rm.funnel.site_visits, fill: FUNNEL_COLORS[2] },
    { name: 'Confirmed', value: rm.funnel.confirmed, fill: FUNNEL_COLORS[3] },
  ];

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-slate-200 shadow-lg p-3 rounded-lg text-sm">
          <p className="font-semibold text-[#111111] mb-1">{payload[0]?.payload?.name}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color }}>
              {entry.name}: {formatIndianCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout
      title="RM Performance Analytics"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'RM Analytics' }]}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#111111]">Team Performance Dashboard</h2>
          <p className="text-sm text-[#64748B] mt-1">Conversion funnels, GMV attribution, SLA compliance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-analytics-btn">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="period-selector">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-[#111111] text-white'
                    : 'text-[#64748B] hover:bg-slate-50'
                }`}
                data-testid={`period-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8" data-testid="summary-cards">
        <MetricCard label="Total Leads" value={summary.total_leads} subtext={`${summary.total_rms} active RMs`} icon={Users} testId="metric-total-leads" />
        <MetricCard label="Bookings Confirmed" value={summary.total_confirmed} subtext={`${summary.overall_conversion}% conversion`} icon={Target} color="text-emerald-600" testId="metric-confirmed" />
        <MetricCard label="Total GMV" value={formatIndianCurrency(summary.total_gmv)} subtext="Gross booking value" icon={TrendingUp} color="text-[#111111]" testId="metric-gmv" />
        <MetricCard label="Total Commission" value={formatIndianCurrency(summary.total_commission)} subtext="Revenue attributed" icon={IndianRupee} color="text-[#C8A960]" testId="metric-commission" />
        <MetricCard label="SLA Breaches" value={slaSummary.total_breaches || 0} subtext={`${slaSummary.critical_breaches || 0} critical`} icon={AlertTriangle} color={slaSummary.critical_breaches > 0 ? 'text-red-600' : 'text-amber-600'} testId="metric-sla" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit" data-testid="tab-nav">
        {[
          { id: 'leaderboard', label: 'RM Leaderboard', icon: Users },
          { id: 'charts', label: 'GMV & Conversion', icon: TrendingUp },
          { id: 'sla', label: `SLA Alerts${slaSummary.total_breaches ? ` (${slaSummary.total_breaches})` : ''}`, icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-[#111111] text-white'
                : 'text-[#64748B] hover:bg-slate-50'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* RM Leaderboard Table */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white border border-slate-200" data-testid="rm-leaderboard">
          <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C8A960]" />
              RM Performance Leaderboard
            </h3>
            <p className="text-xs text-[#64748B] mt-1">Click any row to expand detailed metrics</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="rm-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">RM Name</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Assigned</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Contacted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Site Visits</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Confirmed</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Conversion</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">GMV</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">Commission</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Avg Contact</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rms.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-[#64748B]">
                      No RM data available for this period
                    </td>
                  </tr>
                ) : (
                  rms.map((rm, idx) => (
                    <React.Fragment key={rm.rm_id}>
                      <tr
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedRM(expandedRM === rm.rm_id ? null : rm.rm_id)}
                        data-testid={`rm-row-${idx}`}
                      >
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-gradient-to-br from-[#C8A960] to-[#D4AF37] text-[#111111] shadow-md' :
                            idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' :
                            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                            'bg-slate-100 text-slate-600'
                          }`}>{idx + 1}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#111111]">{rm.rm_name}</p>
                          <p className="text-xs text-[#64748B]">{rm.email}</p>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-sm">{rm.funnel.assigned}</td>
                        <td className="px-4 py-4 text-center font-mono text-sm">{rm.funnel.contacted}</td>
                        <td className="px-4 py-4 text-center font-mono text-sm">{rm.funnel.site_visits}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-mono text-sm font-semibold text-emerald-600">{rm.funnel.confirmed}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className={`text-xs border-0 ${
                            rm.conversion_rates.overall >= 20 ? 'bg-emerald-100 text-emerald-700' :
                            rm.conversion_rates.overall >= 10 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {rm.conversion_rates.overall}%
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-[#111111]">
                          {formatIndianCurrency(rm.financials.total_gmv)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm text-[#C8A960] font-semibold">
                          {formatIndianCurrency(rm.financials.total_commission)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Timer className="w-3 h-3 text-[#64748B]" />
                            <span className={`text-xs font-mono ${
                              rm.time_metrics.avg_time_to_first_contact_hrs !== null && rm.time_metrics.avg_time_to_first_contact_hrs <= 24
                                ? 'text-emerald-600'
                                : rm.time_metrics.avg_time_to_first_contact_hrs !== null
                                ? 'text-red-600'
                                : 'text-[#64748B]'
                            }`}>
                              {formatHours(rm.time_metrics.avg_time_to_first_contact_hrs)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {expandedRM === rm.rm_id ?
                            <ChevronUp className="w-4 h-4 text-[#64748B]" /> :
                            <ChevronDown className="w-4 h-4 text-[#64748B]" />
                          }
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {expandedRM === rm.rm_id && (
                        <tr data-testid={`rm-detail-${idx}`}>
                          <td colSpan="11" className="bg-slate-50 px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Funnel Breakdown */}
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-[#C8A960]" /> Stage Funnel
                                </h4>
                                <div className="space-y-2">
                                  {buildFunnelData(rm).map((stage, i) => {
                                    const maxVal = rm.funnel.assigned || 1;
                                    const pct = Math.round((stage.value / maxVal) * 100);
                                    return (
                                      <div key={i}>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className="text-[#64748B]">{stage.name}</span>
                                          <span className="font-mono font-semibold">{stage.value} ({pct}%)</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stage.fill }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-100">
                                    <span className="text-[#64748B]">Lost</span>
                                    <span className="font-mono text-red-600">{rm.funnel.lost}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Conversion Rates */}
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
                                  <ArrowUpRight className="w-4 h-4 text-[#C8A960]" /> Conversion Rates
                                </h4>
                                <div className="space-y-3">
                                  {[
                                    { label: 'Assign → Contact', value: rm.conversion_rates.assign_to_contact },
                                    { label: 'Contact → Site Visit', value: rm.conversion_rates.contact_to_visit },
                                    { label: 'Site Visit → Confirm', value: rm.conversion_rates.visit_to_confirm },
                                    { label: 'Overall', value: rm.conversion_rates.overall },
                                  ].map((rate, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <span className="text-xs text-[#64748B]">{rate.label}</span>
                                      <Badge className={`text-xs border-0 font-mono ${
                                        rate.value >= 30 ? 'bg-emerald-100 text-emerald-700' :
                                        rate.value >= 10 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {rate.value}%
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Financials + Time */}
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
                                  <IndianRupee className="w-4 h-4 text-[#C8A960]" /> Financials & Time
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-[#64748B]">Total GMV</span>
                                    <span className="text-sm font-mono font-semibold text-[#111111]">{formatIndianCurrency(rm.financials.total_gmv)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-[#64748B]">Avg Deal Size</span>
                                    <span className="text-sm font-mono">{formatIndianCurrency(rm.financials.avg_deal_size)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-[#64748B]">Venue Commission</span>
                                    <span className="text-sm font-mono text-[#C8A960]">{formatIndianCurrency(rm.financials.venue_commission)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-[#64748B]">Planner Commission</span>
                                    <span className="text-sm font-mono text-[#C8A960]">{formatIndianCurrency(rm.financials.planner_commission)}</span>
                                  </div>
                                  <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-xs text-[#64748B] flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Avg First Contact
                                      </span>
                                      <span className="text-sm font-mono">{formatHours(rm.time_metrics.avg_time_to_first_contact_hrs)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-xs text-[#64748B] flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Avg Time-to-Close
                                      </span>
                                      <span className="text-sm font-mono">{formatHours(rm.time_metrics.avg_time_to_close_hrs)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* GMV Comparison Chart */}
          <div className="bg-white border border-slate-200 p-6" data-testid="gmv-comparison-chart">
            <h3 className="font-semibold text-[#111111] mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#C8A960]" />
              GMV & Commission by RM
            </h3>
            <p className="text-xs text-[#64748B] mb-6">Top performing RMs by Gross Merchandise Value</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gmvChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(v) => {
                      if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
                      if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                      return v;
                    }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="gmv" name="GMV" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="commission" name="Commission" fill="#C8A960" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Rate Comparison */}
          <div className="bg-white border border-slate-200 p-6" data-testid="conversion-chart">
            <h3 className="font-semibold text-[#111111] mb-1 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#C8A960]" />
              Overall Conversion Rate by RM
            </h3>
            <p className="text-xs text-[#64748B] mb-6">Lead-to-Booking conversion percentage</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rms.map((rm) => ({
                    name: rm.rm_name.split(' ')[0],
                    rate: rm.conversion_rates.overall,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Conversion Rate']} />
                  <Bar dataKey="rate" name="Conversion" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {rms.map((rm, i) => (
                      <Cell
                        key={i}
                        fill={rm.conversion_rates.overall >= 20 ? '#16A34A' : rm.conversion_rates.overall >= 10 ? '#D97706' : '#DC2626'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SLA Alerts Tab */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          {/* SLA Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="sla-summary">
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Total Breaches</p>
              <p className="text-3xl font-bold mt-2 font-mono text-[#111111]">{slaSummary.total_breaches || 0}</p>
            </div>
            <div className="bg-white border border-red-200 p-5">
              <p className="text-xs font-semibold text-red-600 uppercase">Critical</p>
              <p className="text-3xl font-bold mt-2 font-mono text-red-600">{slaSummary.critical_breaches || 0}</p>
            </div>
            <div className="bg-white border border-amber-200 p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase">Warnings</p>
              <p className="text-3xl font-bold mt-2 font-mono text-amber-600">{slaSummary.warning_breaches || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Aging Leads</p>
              <p className="text-3xl font-bold mt-2 font-mono text-[#111111]">{slaSummary.total_aging || 0}</p>
            </div>
          </div>

          {/* SLA Config Info */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg" data-testid="sla-config">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" /> SLA Configuration
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-blue-600">First Contact:</span> <strong>{slaData?.sla_config?.first_contact_hours || 24}h</strong></div>
              {Object.entries(slaData?.sla_config?.aging_thresholds || {}).map(([stage, hours]) => (
                <div key={stage}>
                  <span className="text-blue-600 capitalize">{stage.replace(/_/g, ' ')}:</span> <strong>{hours}h</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Breaches Table */}
          <div className="bg-white border border-slate-200" data-testid="sla-breaches-table">
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-red-50 to-white">
              <h3 className="font-semibold text-[#111111] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                SLA Breach & Aging Alerts
              </h3>
              <p className="text-xs text-[#64748B] mt-1">Leads requiring immediate RM attention</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">RM</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Breach</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sla_breaches.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Shield className="w-10 h-10 text-emerald-300" />
                          <p className="text-[#64748B] font-medium">All Clear - No SLA Breaches</p>
                          <p className="text-xs text-slate-400">All leads are within SLA thresholds</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sla_breaches.map((breach, idx) => (
                      <tr key={idx} className="hover:bg-slate-50" data-testid={`breach-row-${idx}`}>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border-0 ${
                            breach.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {breach.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm text-[#111111]">{breach.customer_name}</p>
                          <p className="text-xs text-[#64748B]">{breach.city} - {breach.event_type}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{breach.rm_name || 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {breach.stage?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B] max-w-[250px]">{breach.breach_description}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-sm font-semibold ${
                            breach.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            +{formatHours(breach.hours_overdue)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RMPerformanceAnalytics;
