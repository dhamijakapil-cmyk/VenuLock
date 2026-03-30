import React, { useRef, useCallback } from 'react';
import { X, Star, MapPin, Users, Car, Wine, Snowflake, ChefHat, Palette, Check, Minus } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const sans = { fontFamily: "'DM Sans', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const formatPrice = (price) => {
  if (!price) return '—';
  if (price >= 1000) return `₹${(price / 1000).toFixed(1)}K`;
  return `₹${price}`;
};

const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  return `${API_URL}${img}`;
};

const AMENITIES = [
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'alcohol', label: 'Alcohol', icon: Wine },
  { key: 'ac', label: 'AC', icon: Snowflake },
  { key: 'catering_inhouse', label: 'Catering', icon: ChefHat },
  { key: 'decor', label: 'Decor', icon: Palette },
];

export default function CompareSheet({ venues, onClose, onRemove }) {
  const sheetRef = useRef(null);
  const touchStartY = useRef(null);

  // Swipe down to dismiss
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    const delta = e.touches[0].clientY - (touchStartY.current || 0);
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.min(delta, 200)}px)`;
    }
  };
  const onTouchEnd = useCallback((e) => {
    const delta = (e.changedTouches[0]?.clientY || 0) - (touchStartY.current || 0);
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (delta > 80) onClose();
    touchStartY.current = null;
  }, [onClose]);

  if (!venues || venues.length === 0) return null;

  const colWidth = venues.length === 2 ? 'w-1/2' : 'w-1/3';

  return (
    <div className="fixed inset-0 z-[60]" data-testid="compare-sheet-overlay">
      {/* Backdrop — tap to close */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[#F4F1EC] rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out flex flex-col"
        style={{ maxHeight: '68vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        data-testid="compare-sheet"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle + header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2.5">
            <h2 className="text-[14px] font-bold text-[#0B0B0D]" style={sans}>
              Compare Venues
              <span className="ml-2 text-[10px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-2 py-0.5 rounded-full">{venues.length}</span>
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 active:bg-black/10 transition-colors" data-testid="compare-close-btn">
              <X className="w-4.5 h-4.5 text-[#0B0B0D]" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Venue cards — compact row */}
          <div className="flex border-b border-black/[0.06] bg-white px-1.5 py-2">
            {venues.map((venue) => (
              <div key={venue.venue_id} className={`${colWidth} px-1.5 flex-shrink-0`}>
                <div className="relative">
                  <img
                    src={getImageUrl(venue.images?.[0])}
                    alt={venue.name}
                    className="w-full h-[90px] object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onRemove(venue.venue_id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                    data-testid={`compare-remove-${venue.venue_id}`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {venue.rating > 0 && (
                    <div className="absolute bottom-1 left-1 flex items-center gap-[2px] bg-black/60 backdrop-blur-sm px-1 py-[1px] rounded">
                      <Star className="w-2 h-2 fill-[#D4B36A] text-[#D4B36A]" />
                      <span className="text-[8px] font-bold text-white" style={sans}>{venue.rating?.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-[11px] font-bold text-[#0B0B0D] mt-1.5 line-clamp-1 leading-tight" style={sans}>{venue.name}</h3>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2 h-2 text-[#64748B]" strokeWidth={1.5} />
                  <span className="text-[8px] text-[#64748B] line-clamp-1" style={sans}>{venue.area}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison rows — compact */}
          <div className="divide-y divide-black/[0.04]">
            <CompareRow label="Price / Plate" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[13px] font-medium text-[#0B0B0D]" style={mono}>
                {formatPrice(v.pricing?.price_per_plate_veg || v.pricing?.per_person_price)}
              </span>
            )} />
            <CompareRow label="Non-Veg" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[12px] font-medium text-[#0B0B0D]" style={mono}>
                {formatPrice(v.pricing?.price_per_plate_nonveg) || '—'}
              </span>
            )} />
            <CompareRow label="Capacity" venues={venues} colWidth={colWidth} render={(v) => (
              <div className="flex items-center gap-0.5">
                <Users className="w-3 h-3 text-[#64748B]" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-[#0B0B0D]" style={mono}>
                  {v.capacity_min || '?'}–{v.capacity_max || '?'}
                </span>
              </div>
            )} />
            <CompareRow label="Type" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[9px] font-semibold text-[#64748B] uppercase tracking-wide bg-[#F4F1EC] px-1.5 py-0.5 rounded inline-block" style={sans}>
                {v.venue_type?.replace(/_/g, ' ') || '—'}
              </span>
            )} />
            <CompareRow label="Min Spend" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[12px] font-medium text-[#0B0B0D]" style={mono}>
                {v.pricing?.min_spend ? `₹${(v.pricing.min_spend / 1000).toFixed(0)}K` : '—'}
              </span>
            )} />
            {AMENITIES.map(({ key, label }) => (
              <CompareRow key={key} label={label} venues={venues} colWidth={colWidth} render={(v) => {
                const has = v.amenities?.[key] || v[key];
                return has ? (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-[#D4B36A]/15 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-[#D4B36A]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] text-[#0B0B0D] font-medium" style={sans}>Yes</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                      <Minus className="w-2.5 h-2.5 text-[#CBD5E1]" strokeWidth={2} />
                    </div>
                    <span className="text-[10px] text-[#9CA3AF]" style={sans}>No</span>
                  </div>
                );
              }} />
            ))}
          </div>
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, venues, colWidth, render }) {
  return (
    <div className="bg-white">
      <div className="px-4 pt-2 pb-0.5">
        <span className="text-[8px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      </div>
      <div className="flex px-2 pb-2">
        {venues.map((venue) => (
          <div key={venue.venue_id} className={`${colWidth} px-2`}>
            {render(venue)}
          </div>
        ))}
      </div>
    </div>
  );
}
