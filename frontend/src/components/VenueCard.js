import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Users, Car, Wifi, Snowflake } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';

const VenueCard = ({ venue, compact = false }) => {
  const mainImage = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';

  // Compact mode for map sidebar
  if (compact) {
    return (
      <Link
        to={`/venues/${venue.venue_id}`}
        className="group flex gap-3 bg-white p-3 border border-slate-200 hover:border-[#C9A227]/50 transition-colors"
        data-testid={`venue-card-compact-${venue.venue_id}`}
      >
        {/* Thumbnail */}
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden">
          <img
            src={mainImage}
            alt={venue.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {venue.rating > 0 && (
            <div className="absolute top-1 left-1 bg-[#0B1F3B] text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current text-[#C9A227]" />
              {venue.rating.toFixed(1)}
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-[#0B1F3B] group-hover:text-[#C9A227] transition-colors line-clamp-1">
            {venue.name}
          </h4>
          <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{venue.area}, {venue.city}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <Users className="w-3 h-3" />
              <span>{venue.capacity_min}-{venue.capacity_max}</span>
            </div>
            <span className="text-sm font-semibold text-[#0B1F3B]">
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Full card mode
  return (
    <Link
      to={`/venues/${venue.venue_id}`}
      className="group block bg-white overflow-hidden card-hover border border-transparent hover:border-[#C9A227]/30"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={mainImage}
          alt={venue.name}
          className="w-full h-full object-cover venue-card-image"
          loading="lazy"
        />
        {/* Rating Badge */}
        {venue.rating > 0 && (
          <div className="absolute top-3 left-3 rating-badge">
            <Star className="w-3 h-3 fill-current" />
            <span>{venue.rating.toFixed(1)}</span>
          </div>
        )}
        {/* Price Tag */}
        <div className="absolute bottom-3 right-3 price-tag">
          {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}/plate
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Venue Type & Event Types */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-[#C9A227] uppercase tracking-wide">
            {venue.venue_type?.replace(/_/g, ' ')}
          </span>
          {venue.indoor_outdoor && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-[#64748B]">
                {venue.indoor_outdoor.charAt(0).toUpperCase() + venue.indoor_outdoor.slice(1)}
              </span>
            </>
          )}
        </div>

        {/* Name */}
        <h3 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-2 group-hover:text-[#C9A227] transition-colors line-clamp-1">
          {venue.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-[#64748B] text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{venue.area}, {venue.city}</span>
          {venue.distance && (
            <span className="ml-auto text-[#0B1F3B] font-medium">
              {venue.distance.toFixed(1)} km
            </span>
          )}
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-1 text-[#64748B] text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>{venue.capacity_min} - {venue.capacity_max} guests</span>
        </div>

        {/* Quick Amenities */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          {venue.amenities?.parking && (
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <Car className="w-3.5 h-3.5" />
              <span>Parking</span>
            </div>
          )}
          {venue.amenities?.ac && (
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <Snowflake className="w-3.5 h-3.5" />
              <span>AC</span>
            </div>
          )}
          {venue.amenities?.wifi && (
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <Wifi className="w-3.5 h-3.5" />
              <span>WiFi</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default VenueCard;
