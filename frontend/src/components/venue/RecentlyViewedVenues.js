import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';

const RECENT_KEY = 'bmv_recently_viewed';

const RecentlyViewedVenues = ({ excludeVenueId, maxItems = 6 }) => {
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

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
    }
  };

  if (venues.length === 0) return null;

  return (
    <section className="py-6" data-testid="recently-viewed-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C9A227]" />
          <h3 className="font-serif text-lg font-semibold text-[#0B1F3B]">
            Recently Viewed
          </h3>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
            data-testid="recent-scroll-left"
          >
            <ChevronLeft className="w-4 h-4 text-[#64748B]" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
            data-testid="recent-scroll-right"
          >
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {venues.map((v) => (
          <Link
            key={v.venue_id}
            to={`/venues/${v.venue_id}`}
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
                    <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                    <span className="text-xs font-medium text-[#0B1F3B]">{v.rating}</span>
                  </div>
                )}
                {v.venue_type && (
                  <span className="absolute top-2 right-2 bg-[#0B1F3B]/80 text-white text-[10px] px-2 py-0.5 rounded-full capitalize">
                    {v.venue_type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm text-[#0B1F3B] truncate group-hover:text-[#C9A227] transition-colors">
                  {v.name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{v.area ? `${v.area}, ${v.city}` : v.city}</span>
                </div>
                {v.price_per_plate && (
                  <p className="text-xs mt-1.5">
                    <span className="font-semibold text-[#0B1F3B]">{formatIndianCurrency(v.price_per_plate)}</span>
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
