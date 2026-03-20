import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, MapPin, Users, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Image, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sans = { fontFamily: "'DM Sans', sans-serif" };
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: Clock },
  submitted: { label: 'Under Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  changes_requested: { label: 'Changes Needed', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const SpecialistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, venuesRes] = await Promise.all([
        api.get('/venue-onboarding/stats'),
        api.get('/venue-onboarding/my-submissions'),
      ]);
      setStats(statsRes.data);
      setVenues(venuesRes.data?.venues || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = activeFilter === 'all'
    ? venues
    : venues.filter(v => v.status === activeFilter);

  const filters = [
    { id: 'all', label: 'All', count: stats?.total || 0 },
    { id: 'draft', label: 'Drafts', count: stats?.drafts || 0 },
    { id: 'submitted', label: 'In Review', count: stats?.submitted || 0 },
    { id: 'approved', label: 'Approved', count: stats?.approved || 0 },
    { id: 'changes_requested', label: 'Changes', count: stats?.changes_requested || 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF9]" style={sans}>
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-12 pb-6">
        <p className="text-xs text-[#D4B36A] tracking-wider mb-1">VENUE SPECIALIST</p>
        <h1 className="text-xl font-bold" style={serif}>
          Hi, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-xs text-slate-400 mt-1">{stats?.total || 0} venues submitted</p>
      </div>

      {/* Quick Stats */}
      <div className="px-4 -mt-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="flex-1 text-center border-r border-slate-100">
            <p className="text-lg font-bold text-[#0B0B0D]">{stats?.drafts || 0}</p>
            <p className="text-[10px] text-slate-400">Drafts</p>
          </div>
          <div className="flex-1 text-center border-r border-slate-100">
            <p className="text-lg font-bold text-amber-600">{stats?.submitted || 0}</p>
            <p className="text-[10px] text-slate-400">In Review</p>
          </div>
          <div className="flex-1 text-center border-r border-slate-100">
            <p className="text-lg font-bold text-emerald-600">{stats?.approved || 0}</p>
            <p className="text-[10px] text-slate-400">Approved</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-orange-600">{stats?.changes_requested || 0}</p>
            <p className="text-[10px] text-slate-400">Changes</p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all shrink-0",
              activeFilter === f.id
                ? "bg-[#0B0B0D] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            )}
            data-testid={`filter-${f.id}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Venue List */}
      <div className="px-4 mt-4 space-y-3 pb-24" data-testid="venue-list">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No venues here yet</p>
            <p className="text-xs text-slate-300 mt-1">Tap + to add your first venue</p>
          </div>
        ) : (
          filtered.map(venue => {
            const sc = STATUS_CONFIG[venue.status] || STATUS_CONFIG.draft;
            const photo = venue.photos?.[0]?.url;
            return (
              <button
                key={venue.venue_onboarding_id}
                className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden flex text-left hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/specialist/venue/${venue.venue_onboarding_id}`)}
                data-testid={`venue-card-${venue.venue_onboarding_id}`}
              >
                {/* Thumbnail */}
                <div className="w-24 h-24 bg-slate-100 flex-shrink-0 relative">
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-[#0B0B0D] truncate">{venue.name || 'Untitled Venue'}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      {venue.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{venue.city}</span>}
                      {venue.capacity_max && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{venue.capacity_max}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", sc.color)}>
                      {sc.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-4 z-30">
        <Button
          onClick={() => navigate('/specialist/venue/new')}
          className="h-14 w-14 rounded-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] shadow-lg"
          data-testid="add-venue-btn"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default SpecialistDashboard;
