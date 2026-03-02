import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Heart,
  Star,
  MapPin,
  Users,
  Trash2,
  ArrowLeft,
  Search,
} from 'lucide-react';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { favoriteIds, toggleFavorite, clearAll: clearAllFavs } = useFavorites();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setVenues([]);
      setLoading(false);
      return;
    }
    const fetchVenues = async () => {
      try {
        const res = await api.post('/venues/batch', { venue_ids: favoriteIds });
        const ordered = favoriteIds
          .map(id => res.data.find(v => v.venue_id === id))
          .filter(Boolean);
        setVenues(ordered);
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, [favoriteIds]);

  const removeFavorite = (venueId) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/favorites`);
      return;
    }
    toggleFavorite(venueId);
  };

  const clearAll = () => {
    clearAllFavs();
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors"
              data-testid="favorites-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold">My Favorites</h1>
                </div>
                <p className="text-white/60 text-sm">
                  {venues.length} {venues.length === 1 ? 'venue' : 'venues'} saved
                </p>
              </div>
              {venues.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-white/50 hover:text-red-400 text-sm transition-colors hidden sm:block"
                  data-testid="favorites-clear-all"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-pulse">
                  <div className="h-48 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-20" data-testid="favorites-empty">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                <Heart className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#0B1F3B] mb-2">
                No favorites yet
              </h2>
              <p className="text-[#64748B] mb-8 max-w-md mx-auto">
                Tap the heart icon on any venue to save it here. Your favorites make it easy to compare and decide.
              </p>
              <Button
                onClick={() => navigate('/venues/search')}
                className="bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-semibold"
                data-testid="favorites-browse-btn"
              >
                <Search className="w-4 h-4 mr-2" />
                Browse Venues
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="favorites-grid">
              {venues.map(venue => (
                <div
                  key={venue.venue_id}
                  className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow group relative"
                  data-testid={`favorite-venue-${venue.venue_id}`}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.preventDefault(); removeFavorite(venue.venue_id); }}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm"
                    title="Remove from favorites"
                    data-testid={`remove-favorite-${venue.venue_id}`}
                  >
                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500 transition-colors" />
                  </button>

                  <Link to={`/venues/${venue.venue_id}`}>
                    {/* Image */}
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={venue.images?.[0] || ''}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {venue.rating && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <Star className="w-3.5 h-3.5 text-[#C9A227] fill-[#C9A227]" />
                          <span className="text-sm font-semibold text-[#0B1F3B]">{venue.rating}</span>
                          {venue.review_count > 0 && (
                            <span className="text-xs text-[#64748B]">({venue.review_count})</span>
                          )}
                        </div>
                      )}
                      {venue.venue_type && (
                        <span className="absolute top-3 left-3 bg-[#0B1F3B]/80 text-white text-xs px-2.5 py-1 rounded-full capitalize">
                          {venue.venue_type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-serif font-semibold text-[#0B1F3B] text-lg mb-1 group-hover:text-[#C9A227] transition-colors line-clamp-1">
                        {venue.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-[#64748B] mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{venue.area ? `${venue.area}, ${venue.city}` : venue.city}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-lg font-bold text-[#0B1F3B]">
                            {formatIndianCurrency(venue.pricing?.price_per_plate_veg || venue.price_per_plate)}
                          </span>
                          <span className="text-xs text-[#64748B]">/plate</span>
                        </div>
                        {(venue.capacity_min || venue.capacity_max) && (
                          <div className="flex items-center gap-1 text-xs text-[#64748B]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{venue.capacity_min || 50}-{venue.capacity_max || 500}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FavoritesPage;
