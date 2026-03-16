import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, X } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';

const RECENT_KEY = 'vl_recently_viewed';
const sans = { fontFamily: "'DM Sans', sans-serif" };

const RecentlyViewedVenues = ({ excludeVenueId, maxItems = 8, variant = 'default' }) => {
  const [venues, setVenues] = useState([]);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const filtered = excludeVenueId
        ? stored.filter(v => v.venue_id !== excludeVenueId)
        : stored;
      setVenues(filtered.slice(0, maxItems));
    } catch {
      setVenues([]);
    }
  }, [excludeVenueId, maxItems]);

  const clearAll = () => {
    localStorage.removeItem(RECENT_KEY);
    setVenues([]);
  };

  if (venues.length === 0) return null;

  if (variant === 'mobile') {
    return (
      <div className="mb-5" data-testid="recently-viewed-mobile">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#D4B36A]" strokeWidth={2} />
            <span className="text-[11px] font-bold text-[#0B0B0D] uppercase tracking-[0.12em]" style={sans}>
              Recently Viewed
            </span>
          </div>
          <button
            onClick={clearAll}
            className="text-[10px] text-[#9CA3AF] font-medium tracking-wide"
            style={sans}
            data-testid="recent-clear-btn"
          >
            Clear
          </button>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {venues.map((v) => (
            <Link
              key={v.venue_id}
              to={v.city_slug && v.slug ? `/venues/${v.city_slug}/${v.slug}` : `/venues/${v.venue_id}`}
              className="flex-shrink-0 w-[150px] group"
              data-testid={`recent-venue-${v.venue_id}`}
            >
              <div className="relative h-[100px] rounded-xl overflow-hidden">
                <img
                  src={v.image}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  style={{ filter: 'brightness(1.05) saturate(1.15)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {v.rating && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                    <Star className="w-2.5 h-2.5 text-[#D4B36A] fill-[#D4B36A]" />
                    <span className="text-[9px] font-bold text-white">{v.rating}</span>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <p className="text-[10px] font-bold text-white leading-tight line-clamp-1" style={sans}>
                    {v.name}
                  </p>
                  <p className="text-[8px] text-white/70 line-clamp-1 mt-0.5" style={sans}>
                    {v.city}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* Default desktop variant */
  return (
    <section className="py-6" data-testid="recently-viewed-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#D4B36A]" />
          <h3 className="font-serif text-lg font-semibold text-[#111111]">
            Recently Viewed
          </h3>
        </div>
        <button
          onClick={clearAll}
          className="text-xs text-[#9CA3AF] hover:text-[#64748B] font-medium transition-colors"
          data-testid="recent-clear-btn-desktop"
        >
          Clear history
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {venues.map((v) => (
          <Link
            key={v.venue_id}
            to={v.city_slug && v.slug ? `/venues/${v.city_slug}/${v.slug}` : `/venues/${v.venue_id}`}
            className="flex-shrink-0 w-[240px] group"
            data-testid={`recent-venue-${v.venue_id}`}
          >
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-[140px] overflow-hidden">
                <img
                  src={v.image}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {v.rating && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <Star className="w-3 h-3 text-[#D4B36A] fill-[#D4B36A]" />
                    <span className="text-xs font-medium text-[#111111]">{v.rating}</span>
                  </div>
                )}
                {v.venue_type && (
                  <span className="absolute top-2 right-2 bg-[#111111]/80 text-white text-[10px] px-2 py-0.5 rounded-full capitalize">
                    {v.venue_type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm text-[#111111] truncate group-hover:text-[#D4B36A] transition-colors">
                  {v.name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{v.area ? `${v.area}, ${v.city}` : v.city}</span>
                </div>
                {v.price_per_plate && (
                  <p className="text-xs mt-1.5">
                    <span className="font-semibold text-[#111111]">{formatIndianCurrency(v.price_per_plate)}</span>
                    <span className="text-[#64748B]">/plate</span>
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecentlyViewedVenues;
