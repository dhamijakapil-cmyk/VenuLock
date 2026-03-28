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
  Sparkles,
} from 'lucide-react';
import { ConnectButton } from '@/components/ConnectButton';

const RECENT_KEY = 'vl_recently_viewed';

// Stage progression for timeline — full booking lifecycle
const STAGE_STEPS = [
  { key: 'new', label: 'Enquiry Received', icon: FileText, desc: 'We got your request' },
  { key: 'contacted', label: 'Expert Assigned', icon: User, desc: 'Your dedicated planner is ready' },
  { key: 'site_visit', label: 'Site Visit', icon: Eye, desc: 'Venue walkthrough scheduled' },
  { key: 'negotiation', label: 'Negotiation', icon: MessageSquare, desc: 'Getting you the best deal' },
  { key: 'date_locked', label: 'Date Locked', icon: Lock, desc: 'Your event date is confirmed' },
  { key: 'deposit_made', label: 'Deposit Made', icon: CreditCard, desc: 'Booking secured with payment' },
  { key: 'final_checks', label: 'Final Checks', icon: Shield, desc: 'Everything verified & ready' },
  { key: 'event_executed', label: 'Event Executed', icon: PartyPopper, desc: 'Celebration complete!' },
];

const getStageIndex = (stage) => {
  const map = { new: 0, contacted: 1, site_visit: 2, site_visit_done: 2, negotiation: 3, proposal_sent: 3, date_locked: 4, deposit_made: 5, final_checks: 6, event_executed: 7, converted: 7, booking_confirmed: 7, closed: -1 };
  return map[stage] ?? 0;
};

const EnquiryCardWithTimeline = ({ enquiry }) => {
  const [expanded, setExpanded] = React.useState(true);
  const stageIdx = getStageIndex(enquiry.stage);
  const isClosed = enquiry.stage === 'closed';
  const progressPct = isClosed ? 0 : Math.round((stageIdx / (STAGE_STEPS.length - 1)) * 100);

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md"
      data-testid={`enquiry-${enquiry.lead_id}`}
    >
      {/* Gradient Header Tab */}
      <button
        className="w-full text-left relative overflow-hidden"
        onClick={() => setExpanded(!expanded)}
        data-testid={`enquiry-toggle-${enquiry.lead_id}`}
        style={{ background: 'linear-gradient(135deg, #0B0B0D 0%, #1a1a2e 50%, #16213e 100%)' }}
      >
        <div className="px-5 py-4 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#D4B36A] flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-[#0B0B0D]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {enquiry.event_type?.replace(/_/g, ' ').charAt(0).toUpperCase() + 
                   enquiry.event_type?.replace(/_/g, ' ').slice(1)} Venue
                </h3>
                <p className="text-[10px] text-white/50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {enquiry.rm_name ? `Expert: ${enquiry.rm_name}` : 'Assigning expert...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getStageBadgeClass(enquiry.stage)} text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5`}>
                {getStageLabel(enquiry.stage)}
              </Badge>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-4 text-[11px] text-white/60 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{enquiry.city}</span>
            {enquiry.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(enquiry.event_date)}</span>}
            {enquiry.guest_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enquiry.guest_count}</span>}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #D4B36A, #F0D78C)' }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#D4B36A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {progressPct}%
            </span>
          </div>
        </div>
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4B36A]/5 rounded-full blur-3xl" />
      </button>

      {/* Expandable Timeline */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[900px]' : 'max-h-0'}`}>
        <div className="bg-white px-5 py-5">
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>Live Progress</p>

          <div className="relative" data-testid={`enquiry-timeline-${enquiry.lead_id}`}>
            {STAGE_STEPS.map((step, i) => {
              const isComplete = !isClosed && stageIdx > i;
              const isCurrent = !isClosed && stageIdx === i;
              const isUpcoming = !isComplete && !isCurrent;
              const StepIcon = step.icon;
              const isLast = i === STAGE_STEPS.length - 1;

              return (
                <div key={step.key} className="flex gap-3.5 relative">
                  {/* Vertical connector line */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-[2px]">
                      <div className={`w-full h-full ${isComplete ? 'bg-[#D4B36A]' : 'bg-slate-100'}`} />
                    </div>
                  )}

                  {/* Icon circle */}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isCurrent ? 'bg-[#D4B36A] shadow-[0_0_12px_rgba(212,179,106,0.4)]' :
                    isComplete ? 'bg-[#D4B36A]' :
                    'bg-[#F4F1EC] border border-slate-200'
                  }`}
                  style={isCurrent ? { animation: 'pulse 2s ease-in-out infinite' } : {}}
                  >
                    <StepIcon className={`w-3.5 h-3.5 ${isComplete || isCurrent ? 'text-[#0B0B0D]' : 'text-[#CBD5E1]'}`} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-5 ${isLast ? 'pb-0' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] leading-tight ${
                        isCurrent ? 'text-[#D4B36A] font-bold' : isComplete ? 'text-[#0B0B0D] font-semibold' : 'text-[#CBD5E1] font-medium'
                      }`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {step.label}
                      </span>
                      {isComplete && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                      )}
                      {isCurrent && (
                        <span className="text-[8px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Current</span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isComplete || isCurrent ? 'text-[#9CA3AF]' : 'text-[#E5E0D8]'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {isClosed && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[12px] text-[#64748B] text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
  const [recommended, setRecommended] = useState([]);

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

  // Fetch recommended venues based on preferences
  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await api.get('/auth/recommended-venues');
        if (res.data.has_preferences && res.data.venues?.length > 0) {
          setRecommended(res.data.venues.slice(0, 8));
        }
      } catch { /* silently fail */ }
    };
    fetchRecs();
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
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col app-main-content">
      <Header />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#111111] to-[#153055] text-white" data-testid="dashboard-welcome">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate('/profile')} className="w-14 h-14 rounded-full bg-[#D4B36A]/20 flex items-center justify-center border-2 border-[#D4B36A]/40 hover:border-[#D4B36A] transition-colors cursor-pointer" data-testid="dashboard-avatar">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-[#D4B36A]" />
              )}
            </button>
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
        <div className="flex flex-wrap gap-2.5 mb-8" data-testid="quick-actions">
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
            onClick={() => navigate('/my-bookings')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-bookings"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            My Bookings
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/my-reviews')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-reviews"
          >
            <Star className="w-4 h-4 mr-2" />
            My Reviews
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/payments')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-payments"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/invoices')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-invoices"
          >
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/favorites')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-favorites"
          >
            <Heart className="w-4 h-4 mr-2" />
            Favorites
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            className="border-[#111111] text-[#111111]"
            data-testid="action-profile"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <ConnectButton
            className="px-4 py-2 rounded-md text-sm border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5"
          />
        </div>

        {/* Track my Enquiry — PRIMARY section, always at top */}
        <section data-testid="dashboard-enquiries" className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4B36A, #F0D78C)' }}>
              <Bookmark className="w-4 h-4 text-[#0B0B0D]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-bold text-[#0B0B0D] tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>Track my Enquiry</h2>
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

        {/* Recommended for You */}
        {recommended.length > 0 && (
          <section className="mb-8" data-testid="dashboard-recommended">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4B36A, #F0D78C)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#0B0B0D]" strokeWidth={2.5} />
                </div>
                <h2 className="font-serif text-lg font-semibold text-[#111111]">Recommended for You</h2>
              </div>
              <Link to="/venues/search" className="text-sm text-[#D4B36A] hover:underline flex items-center gap-1" data-testid="view-all-recommended">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar" data-testid="recommended-scroll">
              {recommended.map(v => (
                <Link
                  key={v.venue_id}
                  to={`/venues/${v.city_slug || 'india'}/${v.slug || v.venue_id}`}
                  className="group flex-shrink-0 w-[200px] sm:w-[220px]"
                  data-testid={`rec-venue-${v.venue_id}`}
                >
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="relative h-32 overflow-hidden">
                      <img src={v.images?.[0]} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      {v.rating > 0 && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <Star className="w-3 h-3 text-[#D4B36A] fill-[#D4B36A]" />
                          <span className="text-[11px] font-semibold text-[#0B0B0D]">{v.rating}</span>
                        </div>
                      )}
                      {v.event_types?.includes('wedding') && (
                        <span className="absolute top-2 right-2 bg-[#D4B36A]/90 text-[#0B0B0D] text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Match
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-[13px] text-[#111111] truncate group-hover:text-[#D4B36A] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {v.name}
                      </h4>
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <MapPin className="w-3 h-3 flex-shrink-0" />{v.area ? `${v.area}, ` : ''}{v.city}
                      </p>
                      {v.pricing?.price_per_plate_veg && (
                        <p className="text-[11px] text-[#0B0B0D] font-semibold mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          from ₹{v.pricing.price_per_plate_veg.toLocaleString('en-IN')}/plate
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
