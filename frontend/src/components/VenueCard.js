import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Users } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';

const VenueCard = ({ venue, compact = false }) => {
  const mainImage = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';

  // Compact mode for map sidebar
  if (compact) {
    return (
      <Link
        to={`/venues/${venue.venue_id}`}
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
            <div className="absolute top-1 left-1 bg-[#0B1F3B]/90 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
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
            <span className="text-sm font-semibold text-[#C9A227]">
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Premium full card mode
  return (
    <Link
      to={`/venues/${venue.venue_id}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Image with overlay */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={mainImage}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Stronger dark gradient overlay for text clarity */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3B]/90 via-[#0B1F3B]/30 to-transparent" />
        
        {/* Rating Badge */}
        {venue.rating > 0 && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-[#C9A227] text-[#C9A227]" />
            <span className="text-sm font-semibold text-[#0B1F3B]">{venue.rating.toFixed(1)}</span>
          </div>
        )}
        
        {/* Managed by BMV Badge */}
        <div className="absolute top-4 right-4 bg-[#C9A227]/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <span className="text-[10px] font-semibold text-[#0B1F3B] uppercase tracking-wide">
            Managed by BMV
          </span>
        </div>
        
        {/* Venue name on image - increased font size */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="font-serif text-xl md:text-[1.65rem] font-bold text-white line-clamp-2 drop-shadow-lg">
            {venue.name}
          </h3>
        </div>
      </div>

      {/* Content below image */}
      <div className="p-5">
        {/* Location */}
        <div className="flex items-center gap-2 text-[#64748B] mb-4">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{venue.area}, {venue.city}</span>
        </div>

        {/* Capacity and Price row - increased spacing, better alignment */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-[#64748B]">
            <Users className="w-4 h-4" />
            <span className="text-sm">{venue.capacity_min} – {venue.capacity_max} guests</span>
          </div>
          
          {/* Price in gold - cleaner right alignment */}
          <div className="text-right flex flex-col items-end">
            <p className="text-[11px] text-[#64748B] mb-0.5">Starting from</p>
            <p className="text-lg font-bold text-[#C9A227] leading-tight">
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
