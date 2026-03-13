import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Check, X, ArrowRight, ChevronRight } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';

const MobileQuickPreview = ({ venue, open, onClose }) => {
  const navigate = useNavigate();
  if (!venue || !open) return null;

  const rawImg = venue.images?.[0];
  const mainImage = (typeof rawImg === 'string' ? rawImg : rawImg?.url) || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
  const toSlug = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
  const citySlug = venue.city_slug || toSlug(venue.city) || 'india';
  const venueSlug = venue.slug || toSlug(venue.name) || venue.venue_id;
  const venueLink = `/venues/${citySlug}/${venueSlug}`;
  const price = venue.pricing?.price_per_plate_veg;
  const amenities = venue.amenities || {};
  const topAmenities = [
    amenities.parking && 'Parking',
    amenities.ac && 'AC',
    amenities.catering_inhouse && 'Catering',
    amenities.decor_inhouse && 'Decor',
    amenities.dj_allowed && 'DJ',
    amenities.alcohol_allowed && 'Alcohol',
  ].filter(Boolean).slice(0, 5);
  const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60] animate-fadeIn" onClick={onClose} />
      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-[20px] animate-slideUp max-h-[75vh] overflow-hidden" data-testid="mobile-quick-preview">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#E5E0D8] rounded-full" />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center text-[#9CA3AF] hover:text-[#0B0B0D] transition-colors" data-testid="quick-preview-close">
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="px-5 pb-6 overflow-y-auto">
          {/* Image */}
          <div className="relative w-full h-48 rounded-xl overflow-hidden mt-2 mb-4">
            <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" />
            {venue.rating > 0 && (
              <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-[#D4B36A] text-[#D4B36A]" />
                <span className="text-xs font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Name & Location */}
          <h3 className="text-xl text-[#0B0B0D] leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            {venue.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#D4B36A]" strokeWidth={1.5} />
            <span className="text-[13px] text-[#6E6E6E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {venue.area}, {venue.city}
            </span>
          </div>

          {/* Quick info row */}
          <div className="flex items-center gap-3 mt-3">
            {venueTypeLabel && (
              <span className="text-[10px] font-medium text-[#6E6E6E] tracking-wide uppercase bg-[#F4F1EC] px-2 py-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venueTypeLabel}</span>
            )}
            <span className="flex items-center gap-1 text-[12px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
              {venue.capacity_min}-{venue.capacity_max} guests
            </span>
          </div>

          {/* Amenities */}
          {topAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {topAmenities.map((a) => (
                <span key={a} className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <Check className="w-3 h-3" />{a}
                </span>
              ))}
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#E5E0D8]">
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Starting from</p>
              <span className="text-xl font-bold text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {price ? formatIndianCurrency(price) : 'Contact'}
              </span>
              <span className="text-[11px] text-[#9CA3AF] ml-0.5">/plate</span>
            </div>
            <button
              onClick={() => { onClose(); navigate(venueLink); }}
              className="flex items-center gap-2 px-5 py-3 bg-[#0B0B0D] text-[#F4F1EC] text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-[#1A1A1A] transition-colors"
              data-testid="quick-preview-view-btn"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              View Details
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileQuickPreview;
