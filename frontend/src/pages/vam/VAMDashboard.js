import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight,
  MapPin, Users, Image, Building2, FileText, Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  changes_requested: { label: 'Changes Needed', color: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const VAMDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submitted');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, venuesRes, erRes] = await Promise.all([
        api.get('/venue-onboarding/stats'),
        api.get('/venue-onboarding/all'),
        api.get('/venue-onboarding/edit-requests/all').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setVenues(venuesRes.data?.venues || []);
      setEditRequests(erRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const pendingEditRequests = editRequests.filter(er => er.status === 'pending');
  const filtered = activeTab === 'all' ? venues
    : activeTab === 'edit_requests' ? []
    : venues.filter(v => v.status === activeTab);

  const tabs = [
    { id: 'submitted', label: 'Pending Review', icon: Clock, count: stats?.submitted || 0, color: 'text-amber-600' },
    { id: 'edit_requests', label: 'Edit Requests', icon: Send, count: pendingEditRequests.length, color: 'text-blue-600' },
    { id: 'approved', label: 'Approved', icon: CheckCircle, count: stats?.approved || 0, color: 'text-emerald-600' },
    { id: 'changes_requested', label: 'Changes Sent', icon: AlertTriangle, count: stats?.changes_requested || 0, color: 'text-orange-600' },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: stats?.rejected || 0, color: 'text-red-500' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Venue Acquisition">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Venue Review"
      breadcrumbs={[{ label: 'Acquisition Manager' }]}
    >
      <div style={sans}>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" data-testid="vam-stats">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "bg-white border rounded-xl p-4 text-left transition-all hover:shadow-sm",
                activeTab === tab.id ? "border-[#D4B36A] shadow-sm" : "border-slate-200"
              )}
              data-testid={`vam-stat-${tab.id}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <tab.icon className={cn("w-4 h-4", tab.color)} />
                <span className="text-xs text-slate-500 font-medium">{tab.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#0B0B0D]">{tab.count}</p>
            </button>
          ))}
        </div>

        {/* Edit Requests View */}
        {activeTab === 'edit_requests' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="edit-requests-list">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B0B0D]">Owner Edit Requests</h3>
              <span className="text-xs text-slate-400">{editRequests.length} total</span>
            </div>
            {editRequests.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Send className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No edit requests yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {editRequests.map(er => {
                  const statusCfg = {
                    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
                    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
                    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
                  };
                  const sc = statusCfg[er.status] || statusCfg.pending;
                  return (
                    <button
                      key={er.edit_request_id}
                      className="w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-center gap-3"
                      onClick={() => navigate(`/team/vam/edit-request/${er.edit_request_id}`)}
                      data-testid={`er-${er.edit_request_id}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#0B0B0D] truncate">{er.venue_name || 'Unknown Venue'}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>by {er.owner_name}</span>
                          <span>&middot;</span>
                          <span>{Object.keys(er.changes || {}).length} changes</span>
                          <span>&middot;</span>
                          <span>{er.created_at ? formatDistanceToNow(new Date(er.created_at), { addSuffix: true }) : ''}</span>
                        </div>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block", sc.color)}>
                          {sc.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Venue List */}
        {activeTab !== 'edit_requests' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B0B0D]">
              {tabs.find(t => t.id === activeTab)?.label || 'All'} Venues
            </h3>
            <span className="text-xs text-slate-400">{filtered.length} found</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Building2 className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No venues in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(venue => {
                const sc = STATUS_CONFIG[venue.status] || STATUS_CONFIG.draft;
                const photo = venue.photos?.[0]?.url;
                return (
                  <button
                    key={venue.venue_onboarding_id}
                    className="w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-center gap-3"
                    onClick={() => navigate(`/team/vam/venue/${venue.venue_onboarding_id}`)}
                    data-testid={`vam-venue-${venue.venue_onboarding_id}`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#0B0B0D] truncate">{venue.name || 'Untitled'}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        {venue.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{venue.city}</span>}
                        {venue.venue_type && <span>{venue.venue_type}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold", sc.color)}>
                          {sc.label}
                        </span>
                        <span className="text-[10px] text-slate-400">by {venue.created_by_name}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VAMDashboard;
