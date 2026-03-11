import React from 'react';
import { formatIndianCurrency } from '@/lib/utils';
import { Phone, Calendar } from 'lucide-react';

const StickyMobileCTA = ({ venue, onEnquire }) => {
  if (!venue) return null;
  const price = venue.pricing?.price_per_plate_veg;

  return (
    <div
      className="fixed bottom-[40px] left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="sticky-mobile-cta"
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="min-w-0">
          {price ? (
            <>
              <p className="text-lg font-bold text-[#111111] leading-tight">
                {formatIndianCurrency(price)}
                <span className="text-xs font-normal text-[#64748B]"> /plate</span>
              </p>
              <p className="text-[11px] text-[#64748B]">Veg starting price</p>
            </>
          ) : (
            <p className="text-sm font-medium text-[#111111]">Get pricing details</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`tel:${venue.phone || '+919999999999'}`}
            className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
            data-testid="sticky-call-btn"
          >
            <Phone className="w-4.5 h-4.5 text-[#111111]" />
          </a>
          <button
            onClick={onEnquire}
            className="h-11 px-6 bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] font-bold text-sm rounded-full transition-colors flex items-center gap-2"
            data-testid="sticky-enquire-btn"
          >
            <Calendar className="w-4 h-4" />
            Enquire Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyMobileCTA;
