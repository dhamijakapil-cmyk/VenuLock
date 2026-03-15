import React from 'react';
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
  if (!venues || venues.length === 0) return null;

  const colWidth = venues.length === 1 ? 'w-full' : venues.length === 2 ? 'w-1/2' : 'w-1/3';

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" data-testid="compare-sheet-overlay">
      <div className="absolute inset-0 flex flex-col bg-[#F4F1EC]" data-testid="compare-sheet">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-black/[0.06] flex-shrink-0">
          <h2 className="text-[15px] font-bold text-[#0B0B0D]" style={sans}>
            Compare Venues
            <span className="ml-2 text-[10px] font-bold text-[#D4B36A] bg-[#D4B36A]/10 px-2 py-0.5 rounded-full">{venues.length}</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F4F1EC] transition-colors" data-testid="compare-close-btn">
            <X className="w-5 h-5 text-[#0B0B0D]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Venue headers with images */}
          <div className="flex border-b border-black/[0.06] bg-white">
            {venues.map((venue) => (
              <div key={venue.venue_id} className={`${colWidth} p-2 flex-shrink-0`}>
                <div className="relative">
                  <img
                    src={getImageUrl(venue.images?.[0])}
                    alt={venue.name}
                    className="w-full h-[120px] object-cover rounded-xl"
                    style={{ filter: 'brightness(1.05) saturate(1.2)' }}
                  />
                  <button
                    onClick={() => onRemove(venue.venue_id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                    data-testid={`compare-remove-${venue.venue_id}`}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                  {venue.rating > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-[3px] bg-black/60 backdrop-blur-sm px-1.5 py-[2px] rounded">
                      <Star className="w-2.5 h-2.5 fill-[#D4B36A] text-[#D4B36A]" />
                      <span className="text-[10px] font-bold text-white" style={sans}>{venue.rating?.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-[12px] font-bold text-[#0B0B0D] mt-2 line-clamp-2 leading-tight" style={sans}>{venue.name}</h3>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-[#64748B]" strokeWidth={1.5} />
                  <span className="text-[9px] text-[#64748B] line-clamp-1" style={sans}>{venue.area}, {venue.city}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          <div className="divide-y divide-black/[0.04]">
            {/* Price */}
            <CompareRow label="Price / Plate" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[15px] font-medium text-[#0B0B0D]" style={mono}>
                {formatPrice(v.pricing?.price_per_plate_veg || v.pricing?.per_person_price)}
              </span>
            )} />

            {/* Non-Veg Price */}
            <CompareRow label="Non-Veg / Plate" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[13px] font-medium text-[#0B0B0D]" style={mono}>
                {formatPrice(v.pricing?.price_per_plate_nonveg) || '—'}
              </span>
            )} />

            {/* Capacity */}
            <CompareRow label="Capacity" venues={venues} colWidth={colWidth} render={(v) => (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#64748B]" strokeWidth={1.5} />
                <span className="text-[12px] font-medium text-[#0B0B0D]" style={mono}>
                  {v.capacity_min || '?'}–{v.capacity_max || '?'}
                </span>
              </div>
            )} />

            {/* Venue Type */}
            <CompareRow label="Type" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide bg-[#F4F1EC] px-2 py-1 rounded inline-block" style={sans}>
                {v.venue_type?.replace(/_/g, ' ') || '—'}
              </span>
            )} />

            {/* Setting */}
            <CompareRow label="Setting" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[12px] text-[#0B0B0D] capitalize" style={sans}>
                {v.setting || '—'}
              </span>
            )} />

            {/* Min Spend */}
            <CompareRow label="Min Spend" venues={venues} colWidth={colWidth} render={(v) => (
              <span className="text-[13px] font-medium text-[#0B0B0D]" style={mono}>
                {v.pricing?.min_spend ? `₹${(v.pricing.min_spend / 1000).toFixed(0)}K` : '—'}
              </span>
            )} />

            {/* Amenities */}
            {AMENITIES.map(({ key, label, icon: Icon }) => (
              <CompareRow key={key} label={label} venues={venues} colWidth={colWidth} render={(v) => {
                const has = v.amenities?.[key] || v[key];
                return has ? (
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-[#D4B36A]/15 flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#D4B36A]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] text-[#0B0B0D] font-medium" style={sans}>Yes</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                      <Minus className="w-3 h-3 text-[#CBD5E1]" strokeWidth={2} />
                    </div>
                    <span className="text-[11px] text-[#9CA3AF]" style={sans}>No</span>
                  </div>
                );
              }} />
            ))}
          </div>

          {/* Bottom padding */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, venues, colWidth, render }) {
  return (
    <div className="bg-white">
      <div className="px-4 pt-2.5 pb-1">
        <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      </div>
      <div className="flex px-2 pb-2.5">
        {venues.map((venue) => (
          <div key={venue.venue_id} className={`${colWidth} px-2`}>
            {render(venue)}
          </div>
        ))}
      </div>
    </div>
  );
}
