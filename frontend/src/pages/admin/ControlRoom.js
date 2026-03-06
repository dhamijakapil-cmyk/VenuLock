import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  Building2,
  Percent,
  Activity,
  PieChart,
  Target,
  Briefcase,
  Clock,
  RefreshCw,
  Pause,
  Play,
  AlertTriangle,
  Shield,
  Zap,
} from 'lucide-react';

const REFRESH_INTERVAL = 60000; // 60 seconds
const INTERACTION_COOLDOWN = 5000; // 5 seconds after interaction before refreshing

const ControlRoom = () => {
  const [data, setData] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL / 1000);
  
  // Track user interaction
  const isInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const fetchControlRoomData = useCallback(async (isManual = false) => {
    // Skip auto-refresh if user is interacting (but allow manual refresh)
    if (!isManual && isInteractingRef.current) {
      return;
    }
    
    setIsRefreshing(true);
    try {
      const [crRes, slaRes] = await Promise.all([
        api.get('/admin/control-room'),
        api.get('/admin/sla-breaches'),
      ]);
      setData(crRes.data);
      setSlaData(slaRes.data);
      setLastUpdated(new Date());
      setNextRefreshIn(REFRESH_INTERVAL / 1000);
    } catch (error) {
      console.error('Error fetching control room data:', error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchControlRoomData();
  }, [fetchControlRoomData]);

  // Auto-refresh logic
  useEffect(() => {
    if (liveMode) {
      // Start refresh interval
      refreshIntervalRef.current = setInterval(() => {
        fetchControlRoomData();
      }, REFRESH_INTERVAL);
      
      // Start countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setNextRefreshIn(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [liveMode, fetchControlRoomData]);

  // Reset countdown when data updates
  useEffect(() => {
    if (lastUpdated) {
      setNextRefreshIn(REFRESH_INTERVAL / 1000);
    }
  }, [lastUpdated]);

  // Track user interaction (scroll, hover on chart, etc.)
  const handleInteractionStart = useCallback(() => {
    isInteractingRef.current = true;
    
    // Clear any existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    // Set cooldown before allowing refresh again
    interactionTimeoutRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, INTERACTION_COOLDOWN);
  }, []);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchControlRoomData(true);
  };

  // Toggle live mode
  const toggleLiveMode = () => {
    setLiveMode(prev => !prev);
    if (!liveMode) {
      setNextRefreshIn(REFRESH_INTERVAL / 1000);
    }
  };

  // Format time for display
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'N/A';
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 5) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <DashboardLayout title="Control Room" breadcrumbs={[{ label: 'Admin' }, { label: 'Control Room' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const { metrics = {}, monthly_gmv_trend = [], top_venues_by_commission = [], current_month = '' } = data || {};

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 shadow-lg p-3 rounded-lg">
          <p className="font-semibold text-[#111111] mb-2">{payload[0]?.payload?.month_full || label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatIndianCurrency(entry.value)}
            </p>
          ))}
          {payload[0]?.payload?.bookings > 0 && (
            <p className="text-xs text-[#64748B] mt-1">
              {payload[0].payload.bookings} booking(s)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout 
      title="Control Room" 
      breadcrumbs={[{ label: 'Admin' }, { label: 'Control Room' }]}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#111111]">Revenue & Pipeline Intelligence</h2>
            <p className="text-[#64748B] mt-1">Real-time operational visibility • {current_month}</p>
          </div>
          
          {/* Live Mode Controls */}
          <div className="flex items-center gap-4">
            {/* Manual Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-9 px-3"
              data-testid="manual-refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            {/* Live Mode Toggle */}
            <div 
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2"
              data-testid="live-mode-control"
            >
              <div className="flex items-center gap-2">
                {liveMode ? (
                  <Play className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Pause className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-medium text-[#111111]">Live Mode</span>
              </div>
              <Switch
                checked={liveMode}
                onCheckedChange={toggleLiveMode}
                data-testid="live-mode-toggle"
              />
            </div>
            
            {/* Live Badge with countdown */}
            {liveMode ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 px-3 py-1.5 min-w-[100px] justify-center">
                <Activity className="w-3 h-3 mr-1.5 animate-pulse" />
                {nextRefreshIn}s
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 px-3 py-1.5">
                <Clock className="w-3 h-3 mr-1.5" />
                Paused
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* SLA Alert Banner */}
      {slaData && slaData.summary && slaData.summary.total_breaches > 0 && (
        <div className={`mb-6 border rounded-lg overflow-hidden ${
          slaData.summary.critical_breaches > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
        }`} data-testid="sla-alert-banner">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  slaData.summary.critical_breaches > 0 ? 'text-red-500' : 'text-amber-500'
                }`} />
                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    {slaData.summary.total_breaches} SLA {slaData.summary.total_breaches === 1 ? 'Breach' : 'Breaches'} Detected
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {slaData.summary.critical_breaches > 0 && (
                      <span className="text-red-600 font-semibold">{slaData.summary.critical_breaches} critical</span>
                    )}
                    {slaData.summary.critical_breaches > 0 && slaData.summary.warning_breaches > 0 && ' + '}
                    {slaData.summary.warning_breaches > 0 && (
                      <span className="text-amber-600 font-semibold">{slaData.summary.warning_breaches} warnings</span>
                    )}
                    {' — leads need immediate RM attention'}
                  </p>
                </div>
              </div>
              <a
                href="/admin/rm-analytics"
                className="text-xs font-medium text-[#111111] hover:text-[#F5C84C] flex items-center gap-1 shrink-0"
              >
                View Details <Zap className="w-3 h-3" />
              </a>
            </div>
            {/* Quick breach list (top 5) */}
            {slaData.sla_breaches && slaData.sla_breaches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {slaData.sla_breaches.slice(0, 5).map((breach, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                      breach.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      breach.severity === 'critical' ? 'bg-red-500' : 'bg-amber-400'
                    }`} />
                    {breach.customer_name || breach.rm_name} — {breach.stage?.replace(/_/g, ' ')}
                  </span>
                ))}
                {slaData.sla_breaches.length > 5 && (
                  <span className="text-xs text-[#64748B] py-1">+{slaData.sla_breaches.length - 5} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Pipeline Value */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-pipeline">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pipeline Value</p>
              <p className="text-2xl font-bold text-[#111111] mt-2 font-mono">
                {formatIndianCurrency(metrics.total_pipeline_value || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">{metrics.total_active_leads || 0} active leads</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#111111] to-[#153055] flex items-center justify-center rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Confirmed GMV */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-gmv">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Confirmed GMV</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
                {formatIndianCurrency(metrics.confirmed_gmv_current_month || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">{metrics.confirmed_bookings_current_month || 0} bookings this month</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* VL Commission */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-commission">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">VL Commission</p>
              <p className="text-2xl font-bold text-[#F5C84C] mt-2 font-mono">
                {formatIndianCurrency(metrics.vl_commission_current_month || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">From {formatIndianCurrency(metrics.total_collected_current_month || 0)} collected</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#F5C84C] to-[#D4AF37] flex items-center justify-center rounded-lg">
              <IndianRupee className="w-5 h-5 text-[#111111]" />
            </div>
          </div>
        </div>

        {/* Active Holds */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-holds">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Active Holds</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {metrics.active_tentative_holds || 0}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Tentative reservations</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Payment Conversion */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-conversion">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Payment Conv.</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {metrics.payment_conversion_rate || 0}%
              </p>
              <p className="text-xs text-[#64748B] mt-1">Link → Payment</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center rounded-lg">
              <Percent className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div 
        className="bg-white border border-slate-200 p-6 mb-8"
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#F5C84C]" />
              Monthly GMV Trend
            </h3>
            <p className="text-sm text-[#64748B] mt-1">Gross Merchandise Value vs VL Commission (Last 6 Months)</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#111111]" />
              <span className="text-[#64748B]">GMV</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#F5C84C]" />
              <span className="text-[#64748B]">Commission</span>
            </div>
          </div>
        </div>

        <div className="h-72" data-testid="gmv-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthly_gmv_trend}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                  return `₹${value}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="gmv" 
                name="GMV" 
                fill="#111111" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                dataKey="commission" 
                name="Commission" 
                fill="#F5C84C" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Venues Table */}
      <div 
        className="bg-white border border-slate-200"
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
        onScroll={handleInteractionStart}
      >
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#F5C84C]" />
              Top 10 Venues by VL Commission
            </h3>
            <p className="text-xs text-[#64748B] mt-1">Revenue performance leaderboard</p>
          </div>
          <Badge variant="outline" className="text-xs">
            All Time
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="top-venues-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider w-12">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Venue Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Tier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top_venues_by_commission.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-10 h-10 text-slate-300" />
                      <p className="text-[#64748B]">No commission data yet</p>
                      <p className="text-xs text-slate-400">Revenue will appear here after payments are processed</p>
                    </div>
                  </td>
                </tr>
              ) : (
                top_venues_by_commission.map((venue, idx) => (
                  <tr 
                    key={venue.venue_id} 
                    className="hover:bg-slate-50 transition-colors"
                    data-testid={`venue-row-${idx}`}
                  >
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        idx === 0 ? 'bg-gradient-to-br from-[#F5C84C] to-[#D4AF37] text-[#111111] shadow-md' :
                        idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#111111]">{venue.venue_name}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{venue.payment_count} payment(s)</p>
                    </td>
                    <td className="px-4 py-4 text-[#64748B]">{venue.city}</td>
                    <td className="px-4 py-4">
                      <Badge className={`text-xs ${
                        venue.tier === 'Premium' ? 'bg-gradient-to-r from-[#F5C84C] to-[#D4AF37] text-[#111111] border-0' :
                        venue.tier === 'Standard' ? 'bg-blue-500 text-white border-0' :
                        'bg-slate-400 text-white border-0'
                      }`}>
                        {venue.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-mono font-semibold text-[#F5C84C]">
                        {formatIndianCurrency(venue.total_commission)}
                      </p>
                      <p className="text-xs text-[#64748B] font-mono mt-0.5">
                        of {formatIndianCurrency(venue.total_revenue)}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <p className="text-xs text-[#64748B]" data-testid="last-updated">
          <Clock className="w-3 h-3 inline mr-1" />
          Last updated: {formatLastUpdated()}
        </p>
        {liveMode && (
          <p className="text-xs text-emerald-600">
            <Activity className="w-3 h-3 inline mr-1 animate-pulse" />
            Auto-refresh active
          </p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ControlRoom;
