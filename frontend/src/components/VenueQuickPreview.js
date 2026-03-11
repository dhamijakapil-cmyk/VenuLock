import React, { useState, useRef, useEffect } from 'react';
import { formatIndianCurrency } from '@/lib/utils';
import { Star, MapPin, Users, Check, X } from 'lucide-react';

const VenueQuickPreview = ({ venue, children }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        setShow(true);
      }
    }, 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const price = venue.pricing?.price_per_plate_veg;
  const amenities = venue.amenities || {};
  const topAmenities = [
    amenities.parking && 'Parking',
    amenities.ac && 'AC',
    amenities.catering && 'Catering',
    amenities.decor && 'Decor',
    amenities.dj && 'DJ',
  ].filter(Boolean).slice(0, 4);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}
      {show && (
        <div
          className="fixed z-[70] pointer-events-none hidden lg:block"
          style={{
            left: `${Math.min(position.x, window.innerWidth - 320)}px`,
            top: `${position.y - 8}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-[280px] p-4 animate-scaleIn" data-testid="venue-quick-preview">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-sm font-bold text-[#111111] truncate">{venue.name}</h4>
                <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[#D4AF37]" />{venue.area}, {venue.city}
                </p>
              </div>
              {venue.rating > 0 && (
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full ml-2">
                  <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                  <span className="text-xs font-bold">{venue.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#64748B] mb-3">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{venue.capacity_min}-{venue.capacity_max}</span>
              <span className="capitalize">{venue.venue_type?.replace(/_/g, ' ')}</span>
            </div>

            {topAmenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {topAmenities.map((a) => (
                  <span key={a} className="flex items-center gap-0.5 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                    <Check className="w-2.5 h-2.5" />{a}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-[#64748B]">Starting from</span>
              <span className="text-sm font-bold text-[#D4AF37]">
                {price ? formatIndianCurrency(price) : 'Contact'}<span className="text-[10px] font-normal text-[#64748B]">/plate</span>
              </span>
            </div>

            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-100 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueQuickPreview;
