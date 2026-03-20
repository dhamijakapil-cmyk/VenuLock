import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Activity, Building2, Users, FileText,
  CheckCircle, Clock, AlertTriangle, TrendingUp,
} from 'lucide-react';

const OperationsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, onboardingRes] = await Promise.all([
          api.get('/admin/stats').catch(() => ({ data: {} })),
          api.get('/venue-onboarding/all').catch(() => ({ data: { venues: [] } })),
        ]);
        const stats = statsRes.data || {};
        const onboarding = onboardingRes.data?.venues || [];

        const drafts = onboarding.filter(v => v.status === 'draft').length;
        const submitted = onboarding.filter(v => v.status === 'submitted').length;
        const approved = onboarding.filter(v => v.status === 'approved').length;

        setData({
          totalVenues: stats.total_venues || 0,
          totalLeads: stats.total_leads || 0,
          totalUsers: stats.total_users || 0,
          pendingApprovals: stats.pending_approvals || 0,
          onboardingDrafts: drafts,
          onboardingSubmitted: submitted,
          onboardingApproved: approved,
          onboardingTotal: onboarding.length,
        });
      } catch {
        toast.error('Failed to load operations data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Operations Dashboard" breadcrumbs={[{ label: 'Operations' }]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Operations Dashboard" breadcrumbs={[{ label: 'Operations' }]}>
      <div className="max-w-5xl mx-auto" data-testid="operations-dashboard">
        {/* Platform Overview */}
        <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Platform Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Live Venues', value: data?.totalVenues, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Leads', value: data?.totalLeads, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Team Members', value: data?.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Pending Approvals', value: data?.pendingApprovals, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`ops-stat-${i}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-[#64748B]">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#111111]">{s.value || 0}</p>
            </div>
          ))}
        </div>

        {/* Venue Onboarding Pipeline */}
        <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Venue Onboarding Pipeline</h3>
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8" data-testid="onboarding-pipeline">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-[#111111]">Total in Pipeline</span>
            <span className="text-lg font-bold text-[#111111]">{data?.onboardingTotal || 0}</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Drafts', value: data?.onboardingDrafts || 0, color: 'bg-slate-400', max: data?.onboardingTotal },
              { label: 'In Review', value: data?.onboardingSubmitted || 0, color: 'bg-amber-500', max: data?.onboardingTotal },
              { label: 'Approved', value: data?.onboardingApproved || 0, color: 'bg-emerald-500', max: data?.onboardingTotal },
            ].map((bar, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#64748B]">{bar.label}</span>
                  <span className="font-semibold text-[#111111]">{bar.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all`}
                    style={{ width: bar.max ? `${(bar.value / bar.max) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OperationsDashboard;
