import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Search,
  Users,
  Clock,
  ChevronRight,
  Phone,
  Calendar,
  MapPin,
  Sparkles,
  Filter,
} from 'lucide-react';

const STAGE_CONFIG = {
  new:              { label: 'New',              color: 'bg-blue-500',   text: 'text-blue-600',  bg: 'bg-blue-50' },
  contacted:        { label: 'Contacted',        color: 'bg-amber-500',  text: 'text-amber-600', bg: 'bg-amber-50' },
  site_visit:       { label: 'Site Visit',       color: 'bg-purple-500', text: 'text-purple-600',bg: 'bg-purple-50' },
  negotiation:      { label: 'Negotiation',      color: 'bg-orange-500', text: 'text-orange-600',bg: 'bg-orange-50' },
  booked:           { label: 'Booked',           color: 'bg-emerald-500',text: 'text-emerald-600',bg: 'bg-emerald-50' },
  deposit_paid:     { label: 'Deposit Paid',     color: 'bg-teal-500',   text: 'text-teal-600',  bg: 'bg-teal-50' },
  event_done:       { label: 'Event Done',       color: 'bg-indigo-500', text: 'text-indigo-600',bg: 'bg-indigo-50' },
  full_payment:     { label: 'Full Payment',     color: 'bg-cyan-500',   text: 'text-cyan-600',  bg: 'bg-cyan-50' },
  payment_released: { label: 'Released',         color: 'bg-green-600',  text: 'text-green-600', bg: 'bg-green-50' },
  lost:             { label: 'Lost',             color: 'bg-red-500',    text: 'text-red-600',   bg: 'bg-red-50' },
};

const sans = { fontFamily: "'DM Sans', sans-serif" };

const RMDashboard = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/workflow/my-leads');
      setLeads(res.data || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.customer_name?.toLowerCase().includes(q) ||
          l.venue_name?.toLowerCase().includes(q) ||
          l.customer_phone?.includes(q) ||
          l.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, stageFilter, searchQuery]);

  // Stage counts for filter chips
  const stageCounts = useMemo(() => {
    const counts = { all: leads.length };
    leads.forEach(l => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
    return counts;
  }, [leads]);

  // Active stage filters (only show stages that have leads)
  const activeStages = ['all', ...Object.keys(STAGE_CONFIG).filter(s => stageCounts[s] > 0)];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto" style={sans}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</p>
              <h1 className="text-[22px] font-bold text-[#0B0B0D] leading-tight" data-testid="rm-dashboard-title">
                {user?.name?.split(' ')[0] || 'RM'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-[#0B0B0D] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#D4B36A]" />
                <span className="text-[13px] font-bold">{leads.length}</span>
                <span className="text-[10px] text-white/50">leads</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, venue, phone, city..."
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-[14px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] transition-all"
              data-testid="rm-search-input"
            />
          </div>
        </div>

        {/* Stage filter chips */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5" data-testid="rm-stage-filters">
            {activeStages.map(stage => {
              const isActive = stageFilter === stage;
              const config = stage === 'all' ? null : STAGE_CONFIG[stage];
              const count = stageCounts[stage] || 0;
              return (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-8 text-[11px] font-semibold whitespace-nowrap border rounded-full transition-all flex-shrink-0",
                    isActive
                      ? "bg-[#0B0B0D] text-white border-[#0B0B0D]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                  data-testid={`rm-filter-${stage}`}
                >
                  {config && <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />}
                  {stage === 'all' ? 'All' : config?.label}
                  <span className={cn("text-[10px]", isActive ? "text-white/50" : "text-slate-400")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lead List */}
        <div className="px-4 pb-20">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-[15px] font-semibold text-slate-500">No leads found</p>
              <p className="text-[12px] text-slate-400 mt-1">
                {searchQuery ? 'Try a different search' : 'New leads will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLeads.map(lead => {
                const config = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.new;
                return (
                  <Link
                    key={lead.lead_id}
                    to={`/rm/leads/${lead.lead_id}`}
                    className="block bg-white border border-slate-100 rounded-xl p-3.5 hover:border-[#D4B36A]/30 hover:shadow-sm transition-all active:scale-[0.99]"
                    data-testid={`rm-lead-card-${lead.lead_id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-[14px] flex-shrink-0">
                        {lead.customer_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate">{lead.customer_name}</h3>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{formatDate(lead.updated_at || lead.created_at)}</span>
                        </div>

                        {/* Venue + City */}
                        {lead.venue_name && (
                          <p className="text-[12px] text-slate-500 truncate mb-1">
                            <MapPin className="w-3 h-3 inline-block mr-0.5 -mt-0.5 text-slate-400" />
                            {lead.venue_name}{lead.city ? `, ${lead.city}` : ''}
                          </p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", config.bg, config.text)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
                            {config.label}
                          </span>
                          {lead.event_date && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(lead.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {lead.guest_count_range && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <Users className="w-3 h-3" />
                              {lead.guest_count_range}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RMDashboard;
