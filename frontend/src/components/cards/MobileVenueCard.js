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
      className="block bg-white overflow-hidden transition-all active:scale-[0.99]"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
        
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Favorite — top right */}
        <button
          onClick={handleFav}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isFav ? 'bg-white shadow-md' : 'bg-black/20 backdrop-blur-sm hover:bg-black/30'
          }`}
          data-testid={`venue-card-fav-${venue.venue_id}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-white'}`} strokeWidth={1.5} />
        </button>

        {/* Compare — next to favorite */}
        <button
          onClick={handleCompare}
          className={`absolute top-3 right-14 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isCompared ? 'bg-[#D4B36A] shadow-md' : 'bg-black/20 backdrop-blur-sm hover:bg-black/30'
          }`}
          data-testid={`mobile-card-compare-${venue.venue_id}`}
        >
          <Scale className={`w-3.5 h-3.5 ${isCompared ? 'text-white' : 'text-white'}`} strokeWidth={1.5} />
        </button>

        {/* Top Pick — top left */}
        {isTopPick && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#0B0B0D]/80 backdrop-blur-sm px-2.5 py-1">
            <Crown className="w-3 h-3 text-[#D4B36A]" strokeWidth={1.5} />
            <span className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Top Pick</span>
          </div>
        )}

        {/* Rating — bottom left */}
        {venue.rating > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1">
            <Star className="w-3 h-3 fill-[#0B0B0D] text-[#0B0B0D]" />
            <span className="text-[11px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Price — bottom right */}
        <div className="absolute bottom-3 right-3 bg-[#0B0B0D]/80 backdrop-blur-sm px-2.5 py-1">
          <span className="text-[12px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
          </span>
          <span className="text-[9px] text-white/60 ml-0.5">/plate</span>
        </div>
      </div>

      {/* Info */}
      <div className="px-1 pt-3 pb-4">
        <h3 className="text-[16px] text-[#0B0B0D] leading-snug line-clamp-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3 text-[#9CA3AF] flex-shrink-0" strokeWidth={1.5} />
          <span className="text-[12px] text-[#6E6E6E] line-clamp-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {venue.area}, {venue.city}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {venueTypeLabel && (
            <span className="text-[10px] font-medium text-[#6E6E6E] tracking-wide uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venueTypeLabel}</span>
          )}
          <span className="text-[#E5E0D8]">|</span>
          <span className="flex items-center gap-1 text-[#9CA3AF] text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Users className="w-3 h-3" strokeWidth={1.5} />
            {venue.capacity_min}-{venue.capacity_max}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
