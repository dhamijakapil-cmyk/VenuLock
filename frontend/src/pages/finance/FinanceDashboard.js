import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  IndianRupee, TrendingUp, CreditCard, Calendar,
  ArrowUpRight, ArrowDownRight, BarChart3, FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const formatCurrency = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

const FinanceDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentsRes, leadsRes] = await Promise.all([
          api.get('/payments/stats/summary').catch(() => ({ data: {} })),
          api.get('/leads').catch(() => ({ data: { leads: [] } })),
        ]);
        const stats = paymentsRes.data || {};
        const leads = leadsRes.data?.leads || [];

        const totalRevenue = stats.all_time?.collected || 0;
        const totalPayments = stats.all_time?.count || 0;
        const pendingCount = stats.pending_payments || 0;
        const wonLeads = leads.filter(l => l.status === 'won');

        setData({
          totalRevenue,
          totalPayments,
          pendingCount,
          pendingAmount: 0,
          wonDeals: wonLeads.length,
          recentPayments: [],
        });
      } catch {
        toast.error('Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Finance Dashboard" breadcrumbs={[{ label: 'Finance' }]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue || 0), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Payments', value: data?.totalPayments || 0, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Payments', value: data?.pendingCount || 0, sub: formatCurrency(data?.pendingAmount || 0), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Won Deals', value: data?.wonDeals || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <DashboardLayout title="Finance Dashboard" breadcrumbs={[{ label: 'Finance' }]}>
      <div className="max-w-5xl mx-auto" data-testid="finance-dashboard">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`finance-stat-${i}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-[#64748B]">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-[#111111]">{s.value}</p>
              {s.sub && <p className="text-xs text-[#64748B] mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Recent Payments */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="recent-payments">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#0B0B0D]">Recent Payments</h3>
          </div>
          {(data?.recentPayments || []).length === 0 ? (
            <div className="text-center py-12 text-[#64748B] text-sm">No payment records yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentPayments.map((p, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111111]">{p.customer_name || p.lead_id || 'Unknown'}</p>
                    <p className="text-xs text-[#64748B]">{p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#111111]">{formatCurrency(p.amount)}</p>
                    <p className={`text-[10px] font-medium ${p.status === 'captured' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {p.status?.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FinanceDashboard;
