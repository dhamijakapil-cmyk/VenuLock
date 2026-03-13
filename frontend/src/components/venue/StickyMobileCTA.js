import React, { useState } from 'react';
import { formatIndianCurrency } from '@/lib/utils';
import { Calendar, MessageCircle, PhoneIncoming, X } from 'lucide-react';

const StickyMobileCTA = ({ venue, onEnquire }) => {
  const [showConnect, setShowConnect] = useState(false);
  if (!venue) return null;
  const price = venue.pricing?.price_per_plate_veg;
  const whatsappNumber = venue.phone?.replace(/[^0-9]/g, '') || '919999999999';
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in ${venue.name} for my upcoming event. Can you help me with availability and pricing?`);

  return (
    <>
      {/* Connect overlay */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" data-testid="connect-overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConnect(false)} />
          <div className="relative w-full bg-white rounded-t-2xl px-5 pt-5 pb-8 animate-in slide-in-from-bottom-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                How would you like to connect?
              </h3>
              <button onClick={() => setShowConnect(false)} className="w-8 h-8 flex items-center justify-center text-[#9CA3AF]">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-3">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border border-[#E5E0D8] rounded-xl hover:border-[#25D366] transition-colors group"
                data-testid="connect-whatsapp"
              >
                <div className="w-11 h-11 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Chat on WhatsApp</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Get instant replies</p>
                </div>
              </a>
              <button
                onClick={() => { setShowConnect(false); onEnquire(); }}
                className="flex items-center gap-4 p-4 border border-[#E5E0D8] rounded-xl hover:border-[#D4B36A] transition-colors group w-full text-left"
                data-testid="connect-callback"
              >
                <div className="w-11 h-11 rounded-full bg-[#D4B36A]/10 flex items-center justify-center flex-shrink-0">
                  <PhoneIncoming className="w-5 h-5 text-[#D4B36A]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Request a Callback</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>We'll call you within 30 mins</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bar */}
      <div
        className="fixed bottom-[40px] left-0 right-0 z-40 lg:hidden bg-white border-t border-[#E5E0D8]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        data-testid="sticky-mobile-cta"
      >
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="min-w-0">
            {price ? (
              <>
                <p className="text-[16px] font-bold text-[#0B0B0D] leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatIndianCurrency(price)}
                  <span className="text-[10px] font-normal text-[#9CA3AF]"> /plate</span>
                </p>
                <p className="text-[10px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Veg starting price</p>
              </>
            ) : (
              <p className="text-[13px] font-medium text-[#0B0B0D]">Get pricing details</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowConnect(true)}
              className="h-10 px-4 border border-[#E5E0D8] bg-white text-[#0B0B0D] font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-[0.05em] hover:border-[#D4B36A]"
              data-testid="sticky-connect-btn"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              Connect
            </button>
            <button
              onClick={onEnquire}
              className="h-10 px-5 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-[0.05em]"
              data-testid="sticky-enquire-btn"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
              Start Planning
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StickyMobileCTA;
