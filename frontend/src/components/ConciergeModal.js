import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Star, ArrowRight, Sparkles, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SERVICES = [
  { label: 'Venue Selection & Negotiation', emoji: '🏛️' },
  { label: 'Decor & Theme Design', emoji: '🎨' },
  { label: 'Catering & Menu Planning', emoji: '🍽️' },
  { label: 'DJ & Live Music', emoji: '🎵' },
  { label: 'Artists & Entertainment', emoji: '🎭' },
  { label: 'Photography & Videography', emoji: '📸' },
  { label: 'Mehendi & Sangeet', emoji: '💃' },
  { label: 'Makeup & Styling', emoji: '💄' },
  { label: 'Guest Management & RSVP', emoji: '📋' },
  { label: 'Travel & Stay Arrangements', emoji: '✈️' },
  { label: 'Budget Planning & Tracking', emoji: '💰' },
  { label: 'Day-of Coordination', emoji: '📅' },
];

const ConciergeModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [visibleChecks, setVisibleChecks] = useState(0);
  const [phase, setPhase] = useState('intro');

  useEffect(() => {
    if (!isOpen) {
      setVisibleChecks(0);
      setPhase('intro');
      return;
    }
    const introTimer = setTimeout(() => setPhase('services'), 400);
    return () => clearTimeout(introTimer);
  }, [isOpen]);

  useEffect(() => {
    if (phase !== 'services') return;
    if (visibleChecks >= SERVICES.length) return;
    const timer = setTimeout(() => setVisibleChecks(v => v + 1), 120);
    return () => clearTimeout(timer);
  }, [phase, visibleChecks]);

  if (!isOpen) return null;

  const allChecked = visibleChecks >= SERVICES.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" data-testid="concierge-modal">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-[440px] max-h-[90vh] overflow-y-auto bg-[#0B0B0D] sm:rounded-2xl rounded-t-3xl border-t sm:border border-[#E2C06E]/20 shadow-[0_-8px_48px_rgba(0,0,0,0.5)]">
        {/* Gold accent line at top */}
        <div className="w-12 h-1 bg-[#E2C06E]/40 rounded-full mx-auto mt-3 sm:hidden" />

        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors z-10" data-testid="concierge-close">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E2C06E] to-[#D4B36A] flex items-center justify-center">
              <Crown className="w-4 h-4 text-[#0B0B0D]" />
            </div>
            <span className="text-[10px] font-bold text-[#E2C06E] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>VenuLoQ Concierge</span>
          </div>
          <h2 className="text-[22px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Your Personal Relationship<br />Manager Handles <span className="text-[#E2C06E]">Everything</span>
          </h2>
          <p className="text-[13px] text-white/50 mt-2 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            From the first call to the last dance — one dedicated expert manages every detail of your event.
          </p>
        </div>

        {/* Services Checklist */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 gap-0">
            {SERVICES.map((service, i) => {
              const isVisible = i < visibleChecks;
              return (
                <div
                  key={service.label}
                  className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
                  style={{
                    opacity: isVisible ? 1 : 0.15,
                    transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isVisible ? 'bg-[#E2C06E]' : 'bg-white/10'
                  }`}>
                    {isVisible && <Check className="w-3 h-3 text-[#0B0B0D]" strokeWidth={3} />}
                  </div>
                  <span className="text-[13px] text-white/80 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {service.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary bar */}
        <div className={`px-6 py-3 transition-all duration-500 ${allChecked ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 bg-[#E2C06E]/10 border border-[#E2C06E]/20 rounded-xl px-4 py-3">
            <Sparkles className="w-4 h-4 text-[#E2C06E] flex-shrink-0" />
            <span className="text-[12px] text-[#E2C06E] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              All 12 services included — Zero extra charge
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={() => { onClose(); navigate('/venues/search'); }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#E2C06E] text-[#0B0B0D] rounded-xl text-[12px] font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(226,192,110,0.3)] hover:shadow-[0_4px_28px_rgba(226,192,110,0.5)] transition-all"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            data-testid="concierge-explore-btn"
          >
            Explore Venues <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="tel:+919876543210"
            className="flex items-center justify-center w-12 h-12 border border-[#E2C06E]/30 rounded-xl text-[#E2C06E] hover:bg-[#E2C06E]/10 transition-all"
            data-testid="concierge-call-btn"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

/* ─── Floating Concierge Banner (for Search Page) ─── */
export const ConciergeBanner = ({ onOpen }) => {
  return (
    <div className="my-3" data-testid="concierge-banner">
      <div
        onClick={onOpen}
        className="bg-gradient-to-r from-[#0B0B0D] to-[#1a1a24] border border-[#E2C06E]/15 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E2C06E] rounded-full blur-[60px] opacity-[0.08]" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E2C06E] to-[#D4B36A] flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(226,192,110,0.3)]">
            <Crown className="w-5 h-5 text-[#0B0B0D]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Get a Personal Event Manager
            </h4>
            <p className="text-[11px] text-white/45 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Decor, catering, DJ, artists — all 12 services included free
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#E2C06E] flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default ConciergeModal;
