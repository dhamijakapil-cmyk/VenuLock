import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
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
import { Search, ArrowRight, Mail, Phone } from 'lucide-react';

const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLeads();
    fetchCities();
  }, [stageFilter, cityFilter]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set('stage', stageFilter);
      if (cityFilter) params.set('city', cityFilter);
      
      const response = await api.get(`/leads?${params.toString()}`);
      setLeads(response.data.leads || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await api.get('/cities');
      setCities(response.data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.customer_name?.toLowerCase().includes(query) ||
      lead.customer_email?.toLowerCase().includes(query) ||
      lead.rm_name?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout
      title="All Client Cases"
      breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Client Cases' }]}
    >
      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="Search by name, email, or RM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-leads"
            />
          </div>
          <Select value={stageFilter || "__all__"} onValueChange={(v) => setStageFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-stage">
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
          <Select value={cityFilter || "__all__"} onValueChange={(v) => setCityFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px]" data-testid="filter-city">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.city_id} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <th>Budget</th>
                <th>RM</th>
                <th>Stage</th>
                <th>Commission</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-[#64748B]">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.lead_id} data-testid={`lead-row-${lead.lead_id}`}>
                    <td>
                      <div>
                        <p className="font-medium text-[#0B1F3B]">{lead.customer_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#64748B]">
                          <Mail className="w-3 h-3" />
                          {lead.customer_email}
                        </div>
                      </div>
                    </td>
                    <td className="capitalize">{lead.event_type?.replace(/_/g, ' ')}</td>
                    <td>{lead.city}</td>
                    <td className="font-mono">
                      {lead.budget ? formatIndianCurrency(lead.budget) : '--'}
                    </td>
                    <td>{lead.rm_name || '--'}</td>
                    <td>
                      <Badge className={`${getStageBadgeClass(lead.stage)} text-white`}>
                        {getStageLabel(lead.stage)}
                      </Badge>
                    </td>
                    <td>
                      {lead.commission_amount ? (
                        <div>
                          <p className="font-mono font-medium">
                            {formatIndianCurrency(lead.commission_amount)}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              lead.commission_status === 'paid'
                                ? 'text-green-600 border-green-600'
                                : 'text-amber-600 border-amber-600'
                            }
                          >
                            {lead.commission_status}
                          </Badge>
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="text-[#64748B] text-sm">{formatDate(lead.created_at)}</td>
                    <td>
                      <Link
                        to={`/rm/leads/${lead.lead_id}`}
                        className="text-[#C9A227] hover:text-[#0B1F3B] flex items-center gap-1"
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

      <p className="mt-4 text-sm text-[#64748B]">
        Showing {filteredLeads.length} of {total} leads
      </p>
    </DashboardLayout>
  );
};

export default AdminLeads;
