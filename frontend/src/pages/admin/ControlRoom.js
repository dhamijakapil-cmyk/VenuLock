import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

const ControlRoom = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchControlRoomData();
  }, []);

  const fetchControlRoomData = async () => {
    try {
      const response = await api.get('/admin/control-room');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching control room data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Control Room" breadcrumbs={[{ label: 'Admin' }, { label: 'Control Room' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
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
          <p className="font-semibold text-[#0B1F3B] mb-2">{payload[0]?.payload?.month_full || label}</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0B1F3B]">Revenue & Pipeline Intelligence</h2>
            <p className="text-[#64748B] mt-1">Real-time operational visibility • {current_month}</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 px-3 py-1">
            <Activity className="w-3 h-3 mr-1 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Pipeline Value */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-pipeline">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pipeline Value</p>
              <p className="text-2xl font-bold text-[#0B1F3B] mt-2 font-mono">
                {formatIndianCurrency(metrics.total_pipeline_value || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">{metrics.total_active_leads || 0} active leads</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#0B1F3B] to-[#153055] flex items-center justify-center rounded-lg">
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

        {/* BMV Commission */}
        <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid="metric-commission">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">BMV Commission</p>
              <p className="text-2xl font-bold text-[#C9A227] mt-2 font-mono">
                {formatIndianCurrency(metrics.bmv_commission_current_month || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">From {formatIndianCurrency(metrics.total_collected_current_month || 0)} collected</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#C9A227] to-[#D4AF37] flex items-center justify-center rounded-lg">
              <IndianRupee className="w-5 h-5 text-[#0B1F3B]" />
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
      <div className="bg-white border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[#0B1F3B] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#C9A227]" />
              Monthly GMV Trend
            </h3>
            <p className="text-sm text-[#64748B] mt-1">Gross Merchandise Value vs BMV Commission (Last 6 Months)</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#0B1F3B]" />
              <span className="text-[#64748B]">GMV</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#C9A227]" />
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
                fill="#0B1F3B" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                dataKey="commission" 
                name="Commission" 
                fill="#C9A227" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Venues Table */}
      <div className="bg-white border border-slate-200">
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#0B1F3B] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#C9A227]" />
              Top 10 Venues by BMV Commission
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
                        idx === 0 ? 'bg-gradient-to-br from-[#C9A227] to-[#D4AF37] text-[#0B1F3B] shadow-md' :
                        idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#0B1F3B]">{venue.venue_name}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{venue.payment_count} payment(s)</p>
                    </td>
                    <td className="px-4 py-4 text-[#64748B]">{venue.city}</td>
                    <td className="px-4 py-4">
                      <Badge className={`text-xs ${
                        venue.tier === 'Premium' ? 'bg-gradient-to-r from-[#C9A227] to-[#D4AF37] text-[#0B1F3B] border-0' :
                        venue.tier === 'Standard' ? 'bg-blue-500 text-white border-0' :
                        'bg-slate-400 text-white border-0'
                      }`}>
                        {venue.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-mono font-semibold text-[#C9A227]">
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
      <div className="mt-6 text-center">
        <p className="text-xs text-[#64748B]">
          <Clock className="w-3 h-3 inline mr-1" />
          Last updated: {data?.generated_at ? new Date(data.generated_at).toLocaleString('en-IN') : 'N/A'}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default ControlRoom;
