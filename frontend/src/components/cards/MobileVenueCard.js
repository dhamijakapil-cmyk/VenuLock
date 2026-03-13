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
      className="block bg-white rounded-2xl overflow-hidden transition-all active:scale-[0.98] shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Image - full width on top, Airbnb style */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
        
        {/* Favorite button - top right like Airbnb */}
        <button
          onClick={handleFav}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-transform hover:scale-110"
          data-testid={`venue-card-fav-${venue.venue_id}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#333]'}`} />
        </button>

        {/* Compare button */}
        <button
          onClick={handleCompare}
          className={`absolute top-3 right-13 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm transition-transform hover:scale-110 ${
            isCompared ? 'bg-[#D4B36A]/90' : 'bg-white/90'
          }`}
          style={{ right: '52px' }}
          data-testid={`mobile-card-compare-${venue.venue_id}`}
        >
          <Scale className={`w-3.5 h-3.5 ${isCompared ? 'text-white' : 'text-[#333]'}`} />
        </button>

        {/* Top Pick badge */}
        {isTopPick && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
            <Crown className="w-3 h-3 text-[#D4B36A]" />
            <span className="text-[10px] font-bold text-[#111] uppercase tracking-wide">Top Pick</span>
          </div>
        )}

        {/* Rating badge */}
        {venue.rating > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
            <Star className="w-3 h-3 fill-[#111] text-[#111]" />
            <span className="text-[11px] font-bold text-[#111]">{venue.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-[#111] line-clamp-1 leading-snug">{venue.name}</h3>
          <p className="text-[14px] font-semibold text-[#111] flex-shrink-0">
            {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            <span className="text-[10px] font-normal text-[#94A3B8]">/plate</span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-[#94A3B8] mt-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="text-[12px] line-clamp-1">{venue.area}, {venue.city}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {venueTypeLabel && (
            <span className="text-[10px] font-medium text-[#64748B] bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{venueTypeLabel}</span>
          )}
          <span className="flex items-center gap-1 text-[#94A3B8] text-[11px]">
            <Users className="w-3 h-3" />
            {venue.capacity_min}-{venue.capacity_max} guests
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
