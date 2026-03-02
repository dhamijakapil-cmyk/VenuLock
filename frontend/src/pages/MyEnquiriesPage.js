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
  Bookmark,
  Eye,
  User,
} from 'lucide-react';

const RECENT_KEY = 'bmv_recently_viewed';

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
      <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] text-white" data-testid="dashboard-welcome">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#C9A227]/20 flex items-center justify-center border-2 border-[#C9A227]/40">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-[#C9A227]" />
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
                <FileText className="w-4 h-4 text-[#C9A227]" />
                <span className="text-white/60 text-xs sm:text-sm">Enquiries</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{enquiries.length}</p>
              {activeEnquiries.length > 0 && (
                <p className="text-xs text-[#C9A227] mt-1">{activeEnquiries.length} active</p>
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
            className="bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-semibold"
            data-testid="action-browse"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Venues
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/favorites')}
            className="border-[#0B1F3B] text-[#0B1F3B]"
            data-testid="action-favorites"
          >
            <Heart className="w-4 h-4 mr-2" />
            My Favorites
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://wa.me/919876543210?text=Hi%2C%20I%20need%20help%20finding%20a%20venue.', '_blank')}
            className="border-[#25D366] text-[#25D366]"
            data-testid="action-expert"
          >
            <Phone className="w-4 h-4 mr-2" />
            Talk to Expert
          </Button>
        </div>

        {/* My Favorites Section */}
        {favVenues.length > 0 && (
          <section className="mb-8" data-testid="dashboard-favorites">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">My Favorites</h2>
              </div>
              <Link to="/favorites" className="text-sm text-[#C9A227] hover:underline flex items-center gap-1" data-testid="view-all-favorites">
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
                          <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                          <span className="text-xs font-medium">{v.rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-[#0B1F3B] truncate group-hover:text-[#C9A227] transition-colors">{v.name}</h4>
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
              <Clock className="w-4 h-4 text-[#C9A227]" />
              <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">Recently Viewed</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recentVenues.map(v => (
                <Link key={v.venue_id} to={`/venues/${v.venue_id}`} className="group" data-testid={`dash-recent-${v.venue_id}`}>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative h-32 overflow-hidden">
                      <img src={v.image} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      {v.venue_type && (
                        <span className="absolute top-2 right-2 bg-[#0B1F3B]/80 text-white text-[10px] px-2 py-0.5 rounded-full capitalize">
                          {v.venue_type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-[#0B1F3B] truncate group-hover:text-[#C9A227] transition-colors">{v.name}</h4>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">{v.area ? `${v.area}, ` : ''}{v.city}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* My Booking Requests */}
        <section data-testid="dashboard-enquiries">
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="w-4 h-4 text-[#C9A227]" />
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">My Booking Requests</h2>
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
            <div className="text-center py-16 bg-white rounded-xl border border-slate-100" data-testid="enquiries-empty">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-serif text-lg text-[#0B1F3B] mb-2">No booking requests yet</h3>
              <p className="text-[#64748B] text-sm mb-6 max-w-sm mx-auto">
                Find your perfect venue and let our experts handle the rest
              </p>
              <Button
                onClick={() => navigate('/venues/search')}
                className="bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-semibold"
              >
                <Search className="w-4 h-4 mr-2" />
                Discover Venues
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enquiry) => (
                <div
                  key={enquiry.lead_id}
                  className="bg-white rounded-xl p-5 border border-slate-100 hover:border-[#C9A227]/30 hover:shadow-sm transition-all"
                  data-testid={`enquiry-${enquiry.lead_id}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-serif text-base font-semibold text-[#0B1F3B]">
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-[#64748B]">{formatDate(enquiry.created_at)}</p>
                      {enquiry.rm_name && (
                        <p className="text-xs text-[#0B1F3B] font-medium mt-1">
                          Expert: {enquiry.rm_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MyEnquiriesPage;
