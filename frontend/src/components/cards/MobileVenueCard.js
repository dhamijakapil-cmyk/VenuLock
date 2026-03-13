import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
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
  const isFav = isFavorite(venue.venue_id);
  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleFavorite(venue.venue_id);
  };

  const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  const isTopPick = index !== undefined && index < 2;

  return (
    <Link
      to={venueLink}
      className="flex gap-3 bg-white border-b border-[#E5E0D8]/60 py-3 active:bg-[#F4F1EC]/50 transition-colors"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Compact image — square */}
      <div className="relative w-[110px] h-[110px] flex-shrink-0 overflow-hidden rounded-lg">
        <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
        
        {/* Top Pick */}
        {isTopPick && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-[#0B0B0D]/80 backdrop-blur-sm px-1.5 py-0.5">
            <Crown className="w-2.5 h-2.5 text-[#D4B36A]" strokeWidth={1.5} />
            <span className="text-[7px] font-bold text-[#D4B36A] uppercase tracking-[0.1em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Top</span>
          </div>
        )}

        {/* Rating */}
        {venue.rating > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-white/95 px-1.5 py-0.5 rounded-sm">
            <Star className="w-2.5 h-2.5 fill-[#0B0B0D] text-[#0B0B0D]" />
            <span className="text-[10px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="text-[14px] text-[#0B0B0D] leading-snug line-clamp-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            {venue.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-[#9CA3AF] flex-shrink-0" strokeWidth={1.5} />
            <span className="text-[11px] text-[#6E6E6E] line-clamp-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {venue.area}, {venue.city}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {venueTypeLabel && (
              <span className="text-[9px] font-medium text-[#6E6E6E] tracking-wide uppercase bg-[#F4F1EC] px-1.5 py-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venueTypeLabel}</span>
            )}
            <span className="flex items-center gap-0.5 text-[#9CA3AF] text-[10px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <Users className="w-3 h-3" strokeWidth={1.5} />
              {venue.capacity_min}-{venue.capacity_max}
            </span>
          </div>
        </div>

        {/* Bottom row — price + favorite */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <span className="text-[15px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
            <span className="text-[9px] text-[#9CA3AF] ml-0.5">/plate</span>
          </div>
          <button
            onClick={handleFav}
            className="w-8 h-8 flex items-center justify-center"
            data-testid={`venue-card-fav-${venue.venue_id}`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#D5D0C8]'}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
