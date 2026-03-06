import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Navigation, Heart } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';

const VenueCard = ({ venue, compact = false }) => {
  const mainImage = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
  const hasDistance = typeof venue.distance === 'number';
  const navigate = useNavigate();
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

  const venueLink = (venue.city_slug && venue.slug)
    ? `/venues/${venue.city_slug}/${venue.slug}`
    : (venue._citySlug && venue.slug)
    ? `/venues/${venue._citySlug}/${venue.slug}`
    : `/venues/${venue.venue_id}`;

  // Compact mode for map sidebar
  if (compact) {
    return (
      <Link
        to={venueLink}
        className="group flex gap-3 bg-white p-3 rounded-lg shadow hover:shadow-md transition-all duration-300"
        data-testid={`venue-card-compact-${venue.venue_id}`}
      >
        {/* Thumbnail */}
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={mainImage}
            alt={venue.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {venue.rating > 0 && (
            <div className="absolute top-1 left-1 bg-[#111111]/90 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current text-[#F5C84C]" />
              {venue.rating.toFixed(1)}
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-[#111111] group-hover:text-[#F5C84C] transition-colors line-clamp-1">
            {venue.name}
          </h4>
          <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{venue.area}, {venue.city}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              {hasDistance ? (
                <>
                  <Navigation className="w-3 h-3" />
                  <span>{venue.distance.toFixed(1)} km</span>
                </>
              ) : (
                <>
                  <Users className="w-3 h-3" />
                  <span>{venue.capacity_min}-{venue.capacity_max}</span>
                </>
              )}
            </div>
            <span className="text-sm font-semibold text-[#F5C84C]">
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Premium full card mode - Enhanced for 2-column layout
  return (
    <Link
      to={venueLink}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-slate-100"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Image with overlay */}
      <div className="relative overflow-hidden aspect-[16/10]">
        <img
          src={mainImage}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Stronger dark gradient overlay for text clarity */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-[#111111]/20 to-transparent" />
        
        {/* Rating Badge */}
        {venue.rating > 0 && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <Star className="w-4 h-4 fill-[#F5C84C] text-[#F5C84C]" />
            <span className="text-sm font-bold text-[#111111]">{venue.rating.toFixed(1)}</span>
          </div>
        )}
        
        {/* Managed by VL Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="bg-[#F5C84C] backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-bold text-[#111111] uppercase tracking-wider">
              VL Verified
            </span>
          </div>
          <button
            onClick={handleFav}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
              isFav ? 'bg-red-500 hover:bg-red-600' : 'bg-white/90 hover:bg-white'
            }`}
            data-testid={`venue-card-fav-${venue.venue_id}`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-white fill-white' : 'text-[#111111]'}`} />
          </button>
        </div>
        
        {/* Distance Badge - shown when radius search is active */}
        {hasDistance && (
          <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <Navigation className="w-3.5 h-3.5 text-[#F5C84C]" />
            <span className="text-sm font-semibold text-[#111111]">{venue.distance.toFixed(1)} km</span>
          </div>
        )}
        
        {/* Venue name on image - increased font size */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="font-serif text-xl md:text-2xl font-bold text-white line-clamp-2 drop-shadow-lg">
            {venue.name}
          </h3>
        </div>
      </div>

      {/* Content below image - Enhanced spacing */}
      <div className="p-6">
        {/* Location */}
        <div className="flex items-center justify-between gap-2 text-[#64748B] mb-5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0 text-[#F5C84C]" />
            <span className="text-sm">{venue.area}, {venue.city}</span>
          </div>
          {hasDistance && (
            <span className="text-xs font-medium text-[#F5C84C] bg-[#F5C84C]/10 px-2.5 py-1 rounded-full">
              {venue.distance.toFixed(1)} km
            </span>
          )}
        </div>

        {/* Capacity and Price row - increased spacing, better alignment */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[#64748B]">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{venue.capacity_min} – {venue.capacity_max} guests</span>
          </div>
          
          {/* Price in gold - cleaner right alignment */}
          <div className="text-right">
            <p className="text-[10px] text-[#64748B] uppercase tracking-wide mb-0.5">From</p>
            <p className="text-xl font-bold text-[#F5C84C] leading-tight">
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
              <span className="text-xs font-normal text-[#64748B]">/plate</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VenueCard;
