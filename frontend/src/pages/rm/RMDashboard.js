import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/context/AuthContext';
import {
  formatDate,
  formatIndianCurrency,
  LEAD_STAGES,
  getStageBadgeClass,
  getStageLabel,
} from '@/lib/utils';
import {
  Search,
  Filter,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';

const RMDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    converted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeads();
  }, [stageFilter]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set('stage', stageFilter);
      
      const response = await api.get(`/leads?${params.toString()}`);
      setLeads(response.data.leads || []);
      
      // Calculate stats
      const allLeads = response.data.leads || [];
      setStats({
        total: response.data.total || allLeads.length,
        new: allLeads.filter(l => l.stage === 'new').length,
        contacted: allLeads.filter(l => l.stage === 'contacted').length,
        converted: allLeads.filter(l => l.stage === 'booking_confirmed').length,
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.customer_name?.toLowerCase().includes(query) ||
      lead.customer_email?.toLowerCase().includes(query) ||
      lead.customer_phone?.includes(query) ||
      lead.city?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout
      title="RM Dashboard"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Leads</p>
              <p className="stat-value">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
              <Users className="w-6 h-6 text-[#C9A227]" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">New Leads</p>
              <p className="stat-value text-blue-600">{stats.new}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">In Progress</p>
              <p className="stat-value text-amber-600">{stats.contacted}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Converted</p>
              <p className="stat-value text-green-600">{stats.converted}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="Search by name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-leads"
            />
          </div>
          <Select value={stageFilter || "__all__"} onValueChange={(v) => setStageFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-stage">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Stages</SelectItem>
              {LEAD_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipeline View */}
      <div className="hidden xl:block mb-8 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.value);
            return (
              <div key={stage.value} className="w-72 flex-shrink-0">
                <div className={`${stage.color} text-white px-4 py-2 flex justify-between items-center`}>
                  <span className="font-medium">{stage.label}</span>
                  <span className="bg-white/20 px-2 py-0.5 text-sm rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="bg-slate-50 border border-t-0 border-slate-200 p-2 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {stageLeads.slice(0, 5).map((lead) => (
                    <Link
                      key={lead.lead_id}
                      to={`/rm/leads/${lead.lead_id}`}
                      className="block bg-white p-3 border border-slate-200 hover:border-[#C9A227] transition-colors"
                    >
                      <p className="font-medium text-[#0B1F3B] text-sm truncate">
                        {lead.customer_name}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {lead.event_type?.replace(/_/g, ' ')} • {lead.city}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {formatDate(lead.created_at)}
                      </p>
                    </Link>
                  ))}
                  {stageLeads.length > 5 && (
                    <p className="text-center text-xs text-[#64748B] py-2">
                      +{stageLeads.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Event</th>
                <th>Location</th>
                <th>Date</th>
                <th>Budget</th>
                <th>Stage</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#64748B]">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.lead_id} data-testid={`lead-row-${lead.lead_id}`}>
                    <td>
                      <div>
                        <p className="font-medium text-[#0B1F3B]">{lead.customer_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.customer_email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="capitalize">{lead.event_type?.replace(/_/g, ' ')}</td>
                    <td>{lead.city}</td>
                    <td>{lead.event_date ? formatDate(lead.event_date) : '--'}</td>
                    <td className="font-mono">{lead.budget ? formatIndianCurrency(lead.budget) : '--'}</td>
                    <td>
                      <Badge className={`${getStageBadgeClass(lead.stage)} text-white`}>
                        {getStageLabel(lead.stage)}
                      </Badge>
                    </td>
                    <td className="text-[#64748B] text-sm">{formatDate(lead.created_at)}</td>
                    <td>
                      <Link
                        to={`/rm/leads/${lead.lead_id}`}
                        className="text-[#C9A227] hover:text-[#0B1F3B] flex items-center gap-1"
                        data-testid={`view-lead-${lead.lead_id}`}
                      >
                        View
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
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

export default RMDashboard;
