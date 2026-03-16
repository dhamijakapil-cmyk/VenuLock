import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { api } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, getStageLabel, getStageBadgeClass, formatIndianCurrency } from '@/lib/utils';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Heart,
  Clock,
  Star,
  Phone,
  FileText,
  ChevronRight,
  ChevronDown,
  Bookmark,
  Eye,
  User,
  CheckCircle2,
  Circle,
  MessageSquare,
  CreditCard,
  Shield,
  PartyPopper,
  Lock,
} from 'lucide-react';
import { ConnectButton } from '@/components/ConnectButton';

const RECENT_KEY = 'vl_recently_viewed';

// Stage progression for timeline — full booking lifecycle
const STAGE_STEPS = [
  { key: 'new', label: 'Enquiry Received', icon: FileText },
  { key: 'contacted', label: 'Expert Assigned', icon: User },
  { key: 'site_visit', label: 'Site Visit', icon: Eye },
  { key: 'negotiation', label: 'Negotiation', icon: MessageSquare },
  { key: 'date_locked', label: 'Date Locked', icon: Lock },
  { key: 'deposit_made', label: 'Deposit Made', icon: CreditCard },
  { key: 'final_checks', label: 'Final Checks', icon: Shield },
  { key: 'event_executed', label: 'Event Executed', icon: PartyPopper },
];

const getStageIndex = (stage) => {
  const map = { new: 0, contacted: 1, site_visit: 2, site_visit_done: 2, negotiation: 3, proposal_sent: 3, date_locked: 4, deposit_made: 5, final_checks: 6, event_executed: 7, converted: 7, booking_confirmed: 7, closed: -1 };
  return map[stage] ?? 0;
};

const EnquiryCardWithTimeline = ({ enquiry }) => {
  const [expanded, setExpanded] = React.useState(false);
  const stageIdx = getStageIndex(enquiry.stage);
  const isClosed = enquiry.stage === 'closed';

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 hover:border-[#D4B36A]/30 hover:shadow-sm transition-all overflow-hidden"
      data-testid={`enquiry-${enquiry.lead_id}`}
    >
      {/* Card Header */}
      <button
        className="w-full p-5 text-left flex flex-col sm:flex-row justify-between gap-3"
        onClick={() => setExpanded(!expanded)}
        data-testid={`enquiry-toggle-${enquiry.lead_id}`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-serif text-base font-semibold text-[#111111]">
              {enquiry.event_type?.replace(/_/g, ' ').charAt(0).toUpperCase() + 
               enquiry.event_type?.replace(/_/g, ' ').slice(1)} Venue
            </h3>
            <Badge className={`${getStageBadgeClass(enquiry.stage)} text-white text-xs`}>
              {getStageLabel(enquiry.stage)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {enquiry.city}{enquiry.area && `, ${enquiry.area}`}
            </span>
            {enquiry.event_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(enquiry.event_date)}
              </span>
            )}
            {enquiry.guest_count && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {enquiry.guest_count} guests
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-[#64748B]">{formatDate(enquiry.created_at)}</p>
            {enquiry.rm_name && (
              <p className="text-xs text-[#111111] font-medium mt-1">Expert: {enquiry.rm_name}</p>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-[#64748B] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expandable Timeline */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[800px]' : 'max-h-0'}`}>
        <div className="px-5 pb-5 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4">Booking Progress</p>
          {/* Vertical Timeline — fits 8 stages on mobile */}
          <div className="relative pl-6" data-testid={`enquiry-timeline-${enquiry.lead_id}`}>
            {/* Vertical line */}
            <div className="absolute left-[11px] top-1 bottom-1 w-[2px] bg-slate-200" />
            <div
              className="absolute left-[11px] top-1 w-[2px] bg-[#D4B36A] transition-all duration-500"
              style={{ height: isClosed ? '0%' : `${Math.min((stageIdx / (STAGE_STEPS.length - 1)) * 100, 100)}%` }}
            />

            {STAGE_STEPS.map((step, i) => {
              const isComplete = !isClosed && stageIdx >= i;
              const isCurrent = !isClosed && stageIdx === i;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="relative flex items-center gap-3 mb-3 last:mb-0">
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isCurrent ? 'bg-[#D4B36A] ring-3 ring-[#D4B36A]/20' :
                    isComplete ? 'bg-[#D4B36A]' :
                    'bg-white border-2 border-slate-200'
                  }`}>
                    <StepIcon className={`w-3 h-3 ${isComplete || isCurrent ? 'text-[#0B0B0D]' : 'text-slate-300'}`} strokeWidth={2} />
                  </div>
                  <span className={`text-[12px] leading-tight ${
                    isCurrent ? 'text-[#D4B36A] font-bold' : isComplete ? 'text-[#0B0B0D] font-medium' : 'text-[#9CA3AF]'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {isClosed && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-[#64748B] text-center">
              This enquiry has been closed. Contact us to reopen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MyEnquiriesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favoriteIds } = useFavorites();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favVenues, setFavVenues] = useState([]);
  const [recentVenues, setRecentVenues] = useState([]);

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const response = await api.get('/my-enquiries');
        setEnquiries(response.data);
      } catch (error) {
        console.error('Error fetching enquiries:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEnquiries();
  }, []);

  // Fetch favorite venues
  useEffect(() => {
    if (favoriteIds.length === 0) { setFavVenues([]); return; }
    const fetch = async () => {
      try {
        const res = await api.post('/venues/batch', { venue_ids: favoriteIds.slice(0, 4) });
        const ordered = favoriteIds.slice(0, 4).map(id => res.data.find(v => v.venue_id === id)).filter(Boolean);
        setFavVenues(ordered);
      } catch { setFavVenues([]); }
    };
    fetch();
  }, [favoriteIds]);

  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      setRecentVenues(stored.slice(0, 4));
    } catch { setRecentVenues([]); }
  }, []);

  const activeEnquiries = enquiries.filter(e => !['closed', 'converted'].includes(e.stage));
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col">
      <Header />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#111111] to-[#153055] text-white" data-testid="dashboard-welcome">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#D4B36A]/20 flex items-center justify-center border-2 border-[#D4B36A]/40">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-[#D4B36A]" />
              )}
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">Welcome back, {firstName}</h1>
              <p className="text-white/60 text-sm mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4" data-testid="stat-enquiries">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#D4B36A]" />
                <span className="text-white/60 text-xs sm:text-sm">Enquiries</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{enquiries.length}</p>
              {activeEnquiries.length > 0 && (
                <p className="text-xs text-[#D4B36A] mt-1">{activeEnquiries.length} active</p>
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4" data-testid="stat-favorites">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-white/60 text-xs sm:text-sm">Saved</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{favoriteIds.length}</p>
              <p className="text-xs text-white/40 mt-1">venues</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4" data-testid="stat-viewed">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="text-white/60 text-xs sm:text-sm">Viewed</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{recentVenues.length}</p>
              <p className="text-xs text-white/40 mt-1">recently</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={() => navigate('/venues/search')}
            className="bg-[#D4B36A] hover:bg-[#D4B040] text-[#111111] font-semibold"
            data-testid="action-browse"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Venues
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/favorites')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-favorites"
          >
            <Heart className="w-4 h-4 mr-2" />
            My Favorites
          </Button>
          <ConnectButton
            className="px-4 py-2 rounded-md text-sm border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5"
          />
        </div>

        {/* Track my Enquiry — PRIMARY section, always at top */}
        <section data-testid="dashboard-enquiries" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="w-4 h-4 text-[#D4B36A]" />
            <h2 className="font-serif text-lg font-semibold text-[#111111]">Track my Enquiry</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 animate-pulse">
                  <div className="flex justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="h-5 bg-slate-200 rounded w-1/3" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="h-6 w-20 bg-slate-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : enquiries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-100" data-testid="enquiries-empty">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                <Search className="w-7 h-7 text-slate-300" />
              </div>
              <h3 className="font-serif text-base text-[#111111] mb-1.5">No enquiries yet</h3>
              <p className="text-[#64748B] text-sm mb-5 max-w-sm mx-auto">
                Find your perfect venue and let our experts handle the rest
              </p>
              <Button
                onClick={() => navigate('/venues/search')}
                className="bg-[#D4B36A] hover:bg-[#D4B040] text-[#111111] font-semibold"
              >
                <Search className="w-4 h-4 mr-2" />
                Discover Venues
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enquiry) => (
                <EnquiryCardWithTimeline key={enquiry.lead_id} enquiry={enquiry} />
              ))}
            </div>
          )}
        </section>

        {/* My Favorites Section */}
        {favVenues.length > 0 && (
          <section className="mb-8" data-testid="dashboard-favorites">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <h2 className="font-serif text-lg font-semibold text-[#111111]">My Favorites</h2>
              </div>
              <Link to="/favorites" className="text-sm text-[#D4B36A] hover:underline flex items-center gap-1" data-testid="view-all-favorites">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {favVenues.map(v => (
                <Link key={v.venue_id} to={`/venues/${v.venue_id}`} className="group" data-testid={`dash-fav-${v.venue_id}`}>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative h-32 overflow-hidden">
                      <img src={v.images?.[0]} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      {v.rating && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
                          <Star className="w-3 h-3 text-[#D4B36A] fill-[#D4B36A]" />
                          <span className="text-xs font-medium">{v.rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-[#111111] truncate group-hover:text-[#D4B36A] transition-colors">{v.name}</h4>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">{v.area ? `${v.area}, ` : ''}{v.city}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed Section */}
        {recentVenues.length > 0 && (
          <section className="mb-8" data-testid="dashboard-recently-viewed">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#D4B36A]" />
              <h2 className="font-serif text-lg font-semibold text-[#111111]">Recently Viewed</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recentVenues.map(v => (
                <Link key={v.venue_id} to={`/venues/${v.venue_id}`} className="group" data-testid={`dash-recent-${v.venue_id}`}>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative h-32 overflow-hidden">
                      <img src={v.image} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      {v.venue_type && (
                        <span className="absolute top-2 right-2 bg-[#111111]/80 text-white text-[10px] px-2 py-0.5 rounded-full capitalize">
                          {v.venue_type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-[#111111] truncate group-hover:text-[#D4B36A] transition-colors">{v.name}</h4>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">{v.area ? `${v.area}, ` : ''}{v.city}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default MyEnquiriesPage;
