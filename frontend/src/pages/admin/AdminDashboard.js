import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { api } from '@/context/AuthContext';
import {
  formatDate,
  formatIndianCurrency,
  getStageBadgeClass,
  getStageLabel,
} from '@/lib/utils';
import {
  Users,
  Building2,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  IndianRupee,
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState({ venues: [], planners: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/pending-approvals'),
      ]);
      setStats(statsRes.data);
      setPendingApprovals(pendingRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard" breadcrumbs={[{ label: 'Dashboard' }]}>
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const totalPending = (pendingApprovals.total_venues || 0) + (pendingApprovals.total_planners || 0);

  return (
    <DashboardLayout title="Admin Dashboard" breadcrumbs={[{ label: 'Dashboard' }]}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Users</p>
              <p className="stat-value">{stats?.total_users || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
              <Users className="w-6 h-6 text-[#C9A227]" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Active Venues</p>
              <p className="stat-value">{stats?.total_venues || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Leads</p>
              <p className="stat-value">{stats?.total_leads || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pending Approvals</p>
              <p className="stat-value text-amber-600">{totalPending}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Stage */}
        <div className="bg-white border border-slate-200 p-6">
          <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Leads by Stage</h2>
          <div className="space-y-3">
            {Object.entries(stats?.leads_by_stage || {}).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${getStageBadgeClass(stage)} text-white`}>
                    {getStageLabel(stage)}
                  </Badge>
                </div>
                <span className="font-mono text-lg font-semibold text-[#0B1F3B]">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Commission Stats */}
        <div className="bg-white border border-slate-200 p-6">
          <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Commission Overview</h2>
          {stats?.commission_stats?.length > 0 ? (
            <div className="space-y-4">
              {stats.commission_stats.map((stat) => (
                <div key={stat._id} className="flex items-center justify-between p-4 bg-slate-50">
                  <div>
                    <p className="text-sm text-[#64748B] capitalize">{stat._id || 'Unknown'}</p>
                    <p className="text-sm text-[#64748B]">{stat.count} bookings</p>
                  </div>
                  <p className="font-mono text-xl font-bold text-[#0B1F3B]">
                    {formatIndianCurrency(stat.total)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#64748B] text-center py-8">No commission data yet</p>
          )}
        </div>

        {/* Pending Venue Approvals */}
        <div className="bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">Pending Venues</h2>
            <Link to="/admin/venues?status=pending" className="text-[#C9A227] text-sm hover:underline">
              View All
            </Link>
          </div>
          {pendingApprovals.venues?.length > 0 ? (
            <div className="space-y-3">
              {pendingApprovals.venues.slice(0, 5).map((venue) => (
                <div key={venue.venue_id} className="flex items-center justify-between p-3 border border-slate-200">
                  <div>
                    <p className="font-medium text-[#0B1F3B]">{venue.name}</p>
                    <p className="text-sm text-[#64748B]">{venue.area}, {venue.city}</p>
                  </div>
                  <Link
                    to={`/admin/venues`}
                    className="text-[#C9A227] hover:text-[#0B1F3B]"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#64748B] text-center py-8">No pending venues</p>
          )}
        </div>

        {/* Recent Leads */}
        <div className="bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">Recent Leads</h2>
            <Link to="/admin/leads" className="text-[#C9A227] text-sm hover:underline">
              View All
            </Link>
          </div>
          {stats?.recent_leads?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_leads.map((lead) => (
                <div key={lead.lead_id} className="flex items-center justify-between p-3 border border-slate-200">
                  <div>
                    <p className="font-medium text-[#0B1F3B]">{lead.customer_name}</p>
                    <p className="text-sm text-[#64748B]">
                      {lead.event_type?.replace(/_/g, ' ')} • {lead.city}
                    </p>
                  </div>
                  <Badge className={`${getStageBadgeClass(lead.stage)} text-white`}>
                    {getStageLabel(lead.stage)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#64748B] text-center py-8">No recent leads</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
