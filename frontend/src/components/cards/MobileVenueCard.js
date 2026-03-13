import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, Scale, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useCompare } from '@/context/CompareContext';
import { formatIndianCurrency } from '@/lib/utils';

const MobileVenueCard = ({ venue, index }) => {
  const navigate = useNavigate();
  const rawImg = venue.images?.[0];
  const mainImage = (typeof rawImg === 'string' ? rawImg : rawImg?.url) || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
  const toSlug = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
  const citySlug = venue.city_slug || toSlug(venue.city) || 'india';
  const venueSlug = venue.slug || toSlug(venue.name) || venue.venue_id;
  const venueLink = `/venues/${citySlug}/${venueSlug}`;

  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const isFav = isFavorite(venue.venue_id);
  const isCompared = isInCompare(venue.venue_id);
  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleFavorite(venue.venue_id);
  };
  const handleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) removeFromCompare(venue.venue_id);
    else addToCompare(venue);
  };

  const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  const isTopPick = index !== undefined && index < 2;

  return (
    <Link
      to={venueLink}
      className={`flex bg-white rounded-xl overflow-hidden border transition-all active:scale-[0.98] ${isTopPick ? 'border-[#D4B36A]/25 shadow-[0_2px_12px_rgba(212,179,106,0.08)]' : 'border-slate-200/80 shadow-sm'}`}
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Image - left side */}
      <div className="relative w-[130px] flex-shrink-0">
        <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
        {isTopPick && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#0B0B0D]/75 backdrop-blur-sm px-2 py-0.5 rounded">
            <Crown className="w-2.5 h-2.5 text-[#D4B36A]" />
            <span className="text-[8px] font-semibold text-[#D4B36A] uppercase tracking-wider">Top Pick</span>
          </div>
        )}
        {venue.rating > 0 && (
          <div className={`absolute ${isTopPick ? 'bottom-2' : 'top-2'} left-2 flex items-center gap-0.5 bg-[#111]/75 backdrop-blur-sm px-1.5 py-0.5 rounded`}>
            <Star className="w-2.5 h-2.5 fill-[#D4B36A] text-[#D4B36A]" />
            <span className="text-[10px] font-bold text-white">{venue.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info - right side */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-bold text-[#111] line-clamp-1 leading-snug">{venue.name}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleCompare}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isCompared ? 'bg-[#D4B36A]/15 border border-[#D4B36A]/40' : 'border border-slate-200'
                }`}
                data-testid={`mobile-card-compare-${venue.venue_id}`}
              >
                <Scale className={`w-3 h-3 ${isCompared ? 'text-[#D4B36A]' : 'text-[#94A3B8]'}`} />
              </button>
              <button
                onClick={handleFav}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isFav ? 'bg-red-50 border border-red-200' : 'border border-slate-200'
                }`}
                data-testid={`venue-card-fav-${venue.venue_id}`}
              >
                <Heart className={`w-3 h-3 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#94A3B8]'}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#64748B] mt-1">
            <MapPin className="w-3 h-3 text-[#D4B36A] flex-shrink-0" />
            <span className="text-[11px] line-clamp-1">{venue.area}, {venue.city}</span>
          </div>
          {venueTypeLabel && (
            <span className="inline-block mt-1.5 text-[9px] font-semibold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded">{venueTypeLabel}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80">
          <div className="flex items-center gap-1 text-[#94A3B8]">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-medium">{venue.capacity_min}-{venue.capacity_max}</span>
          </div>
          <p className="text-[13px] font-bold text-[#D4B36A]">
            {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            <span className="text-[9px] font-normal text-[#94A3B8] ml-0.5">/plate</span>
          </p>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
