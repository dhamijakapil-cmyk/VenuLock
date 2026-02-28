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
  AlertCircle,
  ArrowRight,
  IndianRupee,
  Target,
  UserCheck,
  Percent,
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
      <DashboardLayout title="Operations Control Center" breadcrumbs={[{ label: 'Dashboard' }]}>
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const totalPending = (pendingApprovals.total_venues || 0) + (pendingApprovals.total_planners || 0);
  
  // Calculate commission metrics
  const totalDealValue = stats?.commission_stats?.reduce((acc, stat) => acc + (stat.total || 0), 0) || 0;
  const confirmedCommission = stats?.commission_stats?.find(s => s._id === 'confirmed')?.total || 0;
  const collectedCommission = stats?.commission_stats?.find(s => s._id === 'collected')?.total || 0;
  const collectionRate = confirmedCommission > 0 ? Math.round((collectedCommission / confirmedCommission) * 100) : 0;
  
  // Count active RMs (simplified - would need backend support for accurate count)
  const activeRMs = stats?.users_by_role?.rm || 0;
  
  // Calculate conversion rate
  const totalLeads = stats?.total_leads || 0;
  const convertedLeads = stats?.leads_by_stage?.booking_confirmed || 0;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return (
    <DashboardLayout title="Operations Control Center" breadcrumbs={[{ label: 'Dashboard' }]}>
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Total Deal Value</p>
              <p className="card-value text-[#0B1F3B]">
                {formatIndianCurrency(totalDealValue)}
              </p>
              <p className="card-subtext">This Month</p>
            </div>
            <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-[#C9A227]" />
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Partner Earnings</p>
              <p className="card-value text-green-600">
                {formatIndianCurrency(confirmedCommission)}
              </p>
              <p className="card-subtext">This Month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Collection Rate</p>
              <p className="card-value text-blue-600">{collectionRate}%</p>
              <p className="card-subtext">Earnings Collected</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <Percent className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Active RMs</p>
              <p className="card-value text-amber-600">{activeRMs}</p>
              <p className="card-subtext">Relationship Managers</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Conversion Rate</p>
              <p className="card-value text-emerald-600">{conversionRate}%</p>
              <p className="card-subtext">{convertedLeads} Events Secured</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Users</p>
              <p className="stat-value">{stats?.total_users || 0}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Active Venues</p>
              <p className="stat-value">{stats?.total_venues || 0}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Client Cases</p>
              <p className="stat-value">{stats?.total_leads || 0}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pending Approvals</p>
              <p className="stat-value text-amber-600">{totalPending}</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Cases by Stage */}
        <div className="bg-white border border-slate-200 p-6">
          <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Client Cases by Stage</h2>
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

        {/* Partner Earnings Overview */}
        <div className="bg-white border border-slate-200 p-6">
          <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Partner Earnings Overview</h2>
          {stats?.commission_stats?.length > 0 ? (
            <div className="space-y-4">
              {stats.commission_stats.map((stat) => {
                const statusLabels = {
                  'projected': 'Projected',
                  'confirmed': 'Confirmed',
                  'earned': 'Earned',
                  'collected': 'Collected'
                };
                const statusColors = {
                  'projected': 'bg-blue-100 text-blue-700',
                  'confirmed': 'bg-amber-100 text-amber-700',
                  'earned': 'bg-green-100 text-green-700',
                  'collected': 'bg-emerald-100 text-emerald-700'
                };
                return (
                  <div key={stat._id} className="flex items-center justify-between p-4 bg-slate-50">
                    <div>
                      <span className={`text-xs font-semibold px-2 py-1 ${statusColors[stat._id] || 'bg-slate-100'}`}>
                        {statusLabels[stat._id] || stat._id || 'Unknown'}
                      </span>
                      <p className="text-sm text-[#64748B] mt-1">{stat.count} bookings</p>
                    </div>
                    <p className="font-mono text-xl font-bold text-[#0B1F3B]">
                      {formatIndianCurrency(stat.total)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[#64748B] text-center py-8">No earnings data yet</p>
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

        {/* Recent Client Cases */}
        <div className="bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">Recent Client Cases</h2>
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
            <p className="text-[#64748B] text-center py-8">No recent client cases</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
