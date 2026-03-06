import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import {
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  IndianRupee,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';

const PaymentAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/payments/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Payment Analytics" breadcrumbs={[{ label: 'Admin' }, { label: 'Analytics' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const { monthly_trend = [], funnel = {}, top_venues = [] } = analytics || {};

  // Calculate max value for chart scaling
  const maxCollected = Math.max(...monthly_trend.map(m => m.total_collected), 1);

  return (
    <DashboardLayout 
      title="Payment Analytics" 
      breadcrumbs={[{ label: 'Admin' }, { label: 'Analytics' }]}
    >
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-[#111111]">Revenue Intelligence</h2>
        <p className="text-[#64748B] mt-1">Track payment performance and platform revenue</p>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C8A960]" />
              Monthly Trend
            </h3>
            <p className="text-sm text-[#64748B] mt-1">Last 7 months collection overview</p>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#111111]" />
              <span className="text-[#64748B]">Total Collected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#C8A960]" />
              <span className="text-[#64748B]">VL Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-[#64748B]">Pending Release</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 flex items-end justify-between gap-2 px-4">
          {monthly_trend.map((month, idx) => {
            const collectedHeight = (month.total_collected / maxCollected) * 100;
            const revenueHeight = (month.vl_revenue / maxCollected) * 100;
            const pendingHeight = (month.pending_release / maxCollected) * 100;
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                {/* Bars container */}
                <div className="w-full h-48 flex items-end justify-center gap-1">
                  {/* Collected bar */}
                  <div 
                    className="w-6 bg-gradient-to-t from-[#111111] to-[#153055] rounded-t transition-all duration-500 relative group"
                    style={{ height: `${Math.max(collectedHeight, 2)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatIndianCurrency(month.total_collected)}
                    </div>
                  </div>
                  {/* Revenue bar */}
                  <div 
                    className="w-6 bg-gradient-to-t from-[#C8A960] to-[#D4AF37] rounded-t transition-all duration-500 relative group"
                    style={{ height: `${Math.max(revenueHeight, 2)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#C8A960] text-[#111111] text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatIndianCurrency(month.vl_revenue)}
                    </div>
                  </div>
                  {/* Pending bar */}
                  {month.pending_release > 0 && (
                    <div 
                      className="w-6 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t transition-all duration-500"
                      style={{ height: `${Math.max(pendingHeight, 2)}%` }}
                    />
                  )}
                </div>
                {/* Month label */}
                <span className="text-xs text-[#64748B] font-medium">{month.month_short}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Links Generated */}
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Links Generated</p>
              <p className="text-3xl font-bold text-[#111111] mt-2">{funnel.links_generated || 0}</p>
              <p className="text-xs text-[#64748B] mt-1">Total payment requests</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-xl">
              <Target className="w-6 h-6 text-[#64748B]" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Conversion Rate</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{funnel.conversion_rate || 0}%</p>
              <p className="text-xs text-[#64748B] mt-1">{funnel.payments_completed || 0} of {funnel.links_generated || 0} paid</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Avg Time to Pay */}
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Avg. Time to Pay</p>
              <p className="text-3xl font-bold text-[#111111] mt-2">
                {funnel.avg_time_to_pay_hours < 1 
                  ? `${Math.round(funnel.avg_time_to_pay_hours * 60)}m`
                  : funnel.avg_time_to_pay_hours < 24
                    ? `${funnel.avg_time_to_pay_hours.toFixed(1)}h`
                    : `${(funnel.avg_time_to_pay_hours / 24).toFixed(1)}d`
                }
              </p>
              <p className="text-xs text-[#64748B] mt-1">From link to payment</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center rounded-xl">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending/Failed */}
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pipeline Status</p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-xl font-bold text-amber-600">{funnel.pending || 0}</p>
                  <p className="text-[10px] text-[#64748B]">Pending</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <p className="text-xl font-bold text-red-500">{funnel.failed || 0}</p>
                  <p className="text-[10px] text-[#64748B]">Failed</p>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Venues Table */}
      <div className="bg-white border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#C8A960]" />
              Top Venues by VL Commission
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">Highest revenue generating partners</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Venue</th>
                <th>City</th>
                <th>Type</th>
                <th>Tier</th>
                <th>Payments</th>
                <th>Total Collected</th>
                <th>VL Commission</th>
              </tr>
            </thead>
            <tbody>
              {top_venues.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#64748B]">
                    No venue data available yet
                  </td>
                </tr>
              ) : (
                top_venues.map((venue, idx) => (
                  <tr key={venue.venue_id} data-testid={`venue-row-${venue.venue_id}`}>
                    <td className="text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0 ? 'bg-[#C8A960] text-[#111111]' :
                        idx === 1 ? 'bg-slate-300 text-slate-700' :
                        idx === 2 ? 'bg-amber-600 text-white' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td>
                      <p className="font-medium text-[#111111]">{venue.venue_name}</p>
                    </td>
                    <td className="text-[#64748B]">{venue.city}</td>
                    <td className="capitalize text-[#64748B]">{venue.venue_type?.replace(/_/g, ' ')}</td>
                    <td>
                      <Badge className={`text-xs ${
                        venue.tier === 'Premium' ? 'bg-[#C8A960] text-[#111111]' :
                        venue.tier === 'Standard' ? 'bg-blue-500 text-white' :
                        'bg-slate-400 text-white'
                      }`}>
                        {venue.tier}
                      </Badge>
                    </td>
                    <td className="text-center font-medium">{venue.payment_count}</td>
                    <td className="font-mono text-[#111111]">{formatIndianCurrency(venue.total_collected)}</td>
                    <td className="font-mono font-semibold text-[#C8A960]">{formatIndianCurrency(venue.total_commission)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentAnalytics;
