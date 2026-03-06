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
import { useAuth } from '@/context/AuthContext';
import {
  formatDate,
  formatIndianCurrency,
  LEAD_STAGES,
  getStageBadgeClass,
  getStageLabel,
} from '@/lib/utils';
import {
  Search,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Mail,
  Briefcase,
  IndianRupee,
  Target,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Crown,
  Trophy,
  Download,
  Share2,
  Star,
} from 'lucide-react';

// Payment status badge helper
const getPaymentStatusBadge = (status) => {
  const statusConfig = {
    awaiting_advance: { label: 'Awaiting Payment', className: 'bg-amber-500' },
    advance_paid: { label: 'Advance Paid', className: 'bg-emerald-600' },
    payment_released: { label: 'Released', className: 'bg-blue-600' },
    payment_failed: { label: 'Failed', className: 'bg-red-500' },
    pending: { label: 'Pending', className: 'bg-slate-400' },
  };
  return statusConfig[status] || { label: status || '--', className: 'bg-slate-300' };
};

const RMDashboard = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    in_negotiation: 0,
    converted: 0,
    projected_earnings: 0,
    confirmed_earnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [topPerformerRank, setTopPerformerRank] = useState(null); // null or {rank, data}
  const [showShareCard, setShowShareCard] = useState(false);

  // Fetch top performers to check if current RM is in top 3
  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        const res = await api.get('/rms/top-performers');
        const performers = res.data || [];
        const idx = performers.findIndex(p => p.user_id === user?.user_id);
        if (idx !== -1) {
          setTopPerformerRank({ rank: idx + 1, data: performers[idx] });
        }
      } catch (err) {
        // silently fail
      }
    };
    if (user?.user_id) fetchTopPerformers();
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [stageFilter]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set('stage', stageFilter);
      
      const response = await api.get(`/leads?${params.toString()}`);
      const allLeads = response.data.leads || [];
      setLeads(allLeads);
      
      // Calculate stats including commission data
      const inNegotiation = allLeads.filter(l => 
        ['negotiation', 'site_visit', 'shortlisted'].includes(l.stage)
      ).length;
      
      const confirmedLeads = allLeads.filter(l => l.stage === 'booking_confirmed');
      
      // Calculate projected and confirmed earnings
      let projectedEarnings = 0;
      let confirmedEarnings = 0;
      
      allLeads.forEach(lead => {
        if (lead.commission?.amount_calculated) {
          if (lead.commission.status === 'projected') {
            projectedEarnings += lead.commission.amount_calculated;
          } else if (['confirmed', 'earned', 'collected'].includes(lead.commission.status)) {
            confirmedEarnings += lead.commission.amount_calculated;
          }
        }
      });

      setStats({
        total: response.data.total || allLeads.length,
        new: allLeads.filter(l => l.stage === 'new').length,
        in_negotiation: inNegotiation,
        converted: confirmedLeads.length,
        projected_earnings: projectedEarnings,
        confirmed_earnings: confirmedEarnings,
      });
    } catch (error) {
      console.error('Error fetching client cases:', error);
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
      title="Relationship Manager Console"
      breadcrumbs={[{ label: 'Console' }]}
    >
      {/* Top Performer Banner */}
      {topPerformerRank && (
        <div className="mb-6 rounded-xl overflow-hidden border border-[#F5C84C]/30" data-testid="top-performer-banner">
          <div className="bg-gradient-to-r from-[#111111] via-[#111111] to-[#1a3a5c] px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F5C84C]/20 flex items-center justify-center flex-shrink-0">
                  {topPerformerRank.rank === 1 ? <Crown className="w-6 h-6 text-[#F5C84C]" /> : <Trophy className="w-6 h-6 text-[#F5C84C]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-base">
                      #{topPerformerRank.rank} Top Performer
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F5C84C] text-white text-[10px] font-bold uppercase">
                      This Month
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mt-0.5">
                    {topPerformerRank.data.events_closed} events closed &middot; {topPerformerRank.data.total_leads} leads managed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareCard(!showShareCard)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5C84C] text-white text-xs font-semibold hover:bg-[#B5912F] transition-colors"
                data-testid="share-achievement-btn"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Achievement
              </button>
            </div>
          </div>

          {/* Shareable Achievement Card */}
          {showShareCard && (
            <div className="bg-white p-5 border-t border-slate-100">
              <p className="text-xs text-[#64748B] mb-3">Download or screenshot this card to share on social media:</p>
              <div
                id="achievement-card"
                className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200"
                data-testid="shareable-achievement-card"
              >
                {/* Card Header */}
                <div className="bg-[#111111] px-6 py-5 text-center relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5C84C]/20">
                    <Star className="w-3 h-3 text-[#F5C84C] fill-[#F5C84C]" />
                    <span className="text-[10px] text-[#F5C84C] font-bold">{topPerformerRank.data.rating}</span>
                  </div>
                  <div className="w-20 h-20 mx-auto rounded-full border-3 border-[#F5C84C] overflow-hidden mb-3">
                    <img
                      src={topPerformerRank.data.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(topPerformerRank.data.name)}&background=C9A227&color=fff&size=80`}
                      alt={topPerformerRank.data.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-white font-bold text-lg">{topPerformerRank.data.name}</h3>
                  <p className="text-white/50 text-xs mt-0.5">Relationship Manager &middot; VenuLock</p>
                </div>
                {/* Card Body */}
                <div className="px-6 py-5 bg-white text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5C84C]/10 mb-4">
                    {topPerformerRank.rank === 1 ? <Crown className="w-4 h-4 text-[#F5C84C]" /> : <Trophy className="w-4 h-4 text-[#F5C84C]" />}
                    <span className="text-sm font-bold text-[#111111]">#{topPerformerRank.rank} Top Performer of the Month</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-2xl font-black text-[#F5C84C]">{topPerformerRank.data.events_closed}</div>
                      <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Events Closed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[#111111]">{topPerformerRank.data.total_leads}</div>
                      <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Leads Managed</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">VenuLock</p>
                    <p className="text-[9px] text-[#94A3B8] mt-0.5">WE TALK. YOU LOCK.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    const card = document.getElementById('achievement-card');
                    if (card) {
                      import('html2canvas').then(({ default: html2canvas }) => {
                        html2canvas(card, { scale: 2, useCORS: true }).then(canvas => {
                          const link = document.createElement('a');
                          link.download = `VenuLock-Top-Performer-${topPerformerRank.data.name.replace(/\s/g, '-')}.png`;
                          link.href = canvas.toDataURL('image/png');
                          link.click();
                        });
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111111] text-white text-xs font-semibold hover:bg-[#153055] transition-colors"
                  data-testid="download-achievement-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download as Image
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Active Client Cases</p>
              <p className="card-value">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[#F5C84C]" />
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">New Client Cases</p>
              <p className="card-value text-blue-600">{stats.new}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Cases in Negotiation</p>
              <p className="card-value text-amber-600">{stats.in_negotiation}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="card-label">Events Secured</p>
              <p className="card-value text-green-600">{stats.converted}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="summary-card bg-gradient-to-br from-[#111111] to-[#153055]">
          <div>
            <p className="card-label text-slate-300">Partner Earnings</p>
            <p className="card-value text-[#F5C84C]">
              {formatIndianCurrency(stats.confirmed_earnings)}
            </p>
            <p className="card-subtext text-slate-400">
              +{formatIndianCurrency(stats.projected_earnings)} projected
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="Search by client name, email, phone, city..."
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

      {/* Pipeline View (Desktop) */}
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
                      className="block bg-white p-3 border border-slate-200 hover:border-[#F5C84C] transition-colors"
                    >
                      <p className="font-medium text-[#111111] text-sm truncate">
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

      {/* Client Cases Table */}
      <div className="bg-white border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-[#111111]">Client Cases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Event</th>
                <th>Location</th>
                <th>Date</th>
                <th>Budget</th>
                <th>Stage</th>
                <th>Payment</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-[#64748B]">
                    No client cases found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const paymentBadge = getPaymentStatusBadge(lead.payment_status);
                  return (
                  <tr key={lead.lead_id} data-testid={`lead-row-${lead.lead_id}`}>
                    <td>
                      <div>
                        <p className="font-medium text-[#111111]">{lead.customer_name}</p>
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
                    <td>
                      {lead.stage === 'booking_confirmed' ? (
                        <Badge className={`${paymentBadge.className} text-white text-xs`}>
                          {paymentBadge.label}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">--</span>
                      )}
                    </td>
                    <td className="text-[#64748B] text-sm">{formatDate(lead.created_at)}</td>
                    <td>
                      <Link
                        to={`/rm/leads/${lead.lead_id}`}
                        className="text-[#F5C84C] hover:text-[#111111] flex items-center gap-1"
                        data-testid={`view-lead-${lead.lead_id}`}
                      >
                        View
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RMDashboard;
