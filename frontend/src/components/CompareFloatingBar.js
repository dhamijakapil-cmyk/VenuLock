import React, { useState, useRef, useCallback } from 'react';
import { useCompare } from '@/context/CompareContext';
import { useNavigate } from 'react-router-dom';
import { formatIndianCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/context/AuthContext';
import {
  X, ArrowRight, Scale, Star, MapPin, Users,
  Share2, CheckCircle, Loader2, ChevronDown,
} from 'lucide-react';

/* ── Compact Compare Bottom Sheet ── */
const CompareSheet = ({ onClose }) => {
  const { compareVenues, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const sheetRef = useRef(null);
  const touchStartY = useRef(null);

  const venues = compareVenues;

  const handleShare = async () => {
    if (venues.length < 2) return;
    setSharing(true);
    try {
      const venueIds = venues.map((v) => v.venue_id);
      const res = await api.post('/shared-comparisons', { venue_ids: venueIds });
      const link = `${window.location.origin}/venues/compare/shared/${res.data.share_id}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not create share link.');
    } finally {
      setSharing(false);
    }
  };

  const goToVenue = (venue) => {
    const link = (venue.city_slug && venue.slug)
      ? `/venues/${venue.city_slug}/${venue.slug}`
      : `/venues/${venue.venue_id}`;
    onClose();
    navigate(link);
  };

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

  return (
    <div className="fixed inset-0 z-[200]" data-testid="compare-modal">
      {/* Backdrop — tap to close */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out"
        style={{ maxHeight: '65vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle + close bar */}
        <div className="flex flex-col items-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300 mb-2" />
          <div className="flex items-center justify-between w-full px-4 pb-2">
            <div className="flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-[#D4B36A]" />
              <span className="text-[13px] font-bold text-[#111]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Comparing {venues.length} venues
              </span>
            </div>
            <div className="flex items-center gap-2">
              {venues.length >= 2 && (
                <button onClick={handleShare} disabled={sharing}
                  className="text-[10px] font-bold text-[#D4B36A] px-2 py-1 rounded-full border border-[#D4B36A]/30 active:scale-95 transition-all"
                  data-testid="compare-modal-share-btn">
                  {sharing ? <Loader2 className="w-3 h-3 animate-spin" /> : copied ? <><CheckCircle className="w-3 h-3 inline mr-0.5" />Copied</> : <><Share2 className="w-3 h-3 inline mr-0.5" />Share</>}
                </button>
              )}
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 active:bg-slate-200 transition-colors"
                data-testid="compare-modal-close-btn">
                <X className="w-4 h-4 text-[#333]" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain flex-1" style={{ maxHeight: 'calc(65vh - 80px)', WebkitOverflowScrolling: 'touch' }}>

          {/* Venue Cards — horizontal row */}
          <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {venues.map((venue) => {
              const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=300';
              return (
                <div key={venue.venue_id} className="flex-shrink-0 w-[140px] bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm"
                  data-testid={`compare-modal-card-${venue.venue_id}`}>
                  <div className="relative aspect-[4/3]">
                    <img src={img} alt={venue.name} className="w-full h-full object-cover" loading="lazy" onClick={() => goToVenue(venue)} />
                    <button onClick={() => removeFromCompare(venue.venue_id)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                      data-testid={`compare-modal-remove-${venue.venue_id}`}>
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {venue.rating > 0 && (
                      <div className="absolute bottom-1.5 left-1.5 bg-white/90 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-[#D4B36A] text-[#D4B36A]" />
                        <span className="text-[9px] font-bold text-[#111]">{venue.rating?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2" onClick={() => goToVenue(venue)}>
                    <h3 className="text-[11px] font-bold text-[#111] line-clamp-1 leading-tight">{venue.name}</h3>
                    <p className="text-[9px] text-[#64748B] flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-2 h-2 text-[#D4B36A]" />{venue.area}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick comparison rows */}
          <div className="mx-4 mb-3 rounded-xl border border-slate-100 overflow-hidden" data-testid="compare-modal-table">
            <CompareRow label="Price/Plate" values={venues.map(v => formatIndianCurrency(v.pricing?.price_per_plate_veg))} highlight />
            <CompareRow label="Non-Veg" values={venues.map(v => formatIndianCurrency(v.pricing?.price_per_plate_nonveg))} />
            <CompareRow label="Capacity" values={venues.map(v => `${v.capacity_min}-${v.capacity_max}`)} highlight />
            <CompareRow label="Type" values={venues.map(v => v.venue_type?.replace(/_/g, ' ') || '--')} />
            <CompareRow label="Setting" values={venues.map(v => v.indoor_outdoor || '--')} highlight />
            <CompareRow label="Min Spend" values={venues.map(v => v.pricing?.min_spend ? formatIndianCurrency(v.pricing.min_spend) : '--')} />
          </div>

          {/* Bottom actions */}
          <div className="flex gap-2 px-4 pb-4">
            <button onClick={() => { clearCompare(); onClose(); }}
              className="flex-1 py-2.5 text-[11px] font-bold text-[#64748B] border border-slate-200 rounded-xl active:bg-slate-50 transition-colors"
              data-testid="compare-modal-clear-btn">
              Clear All
            </button>
            <button onClick={onClose}
              className="flex-[2] py-2.5 text-[11px] font-bold text-white bg-[#0B0B0D] rounded-xl active:bg-[#222] transition-colors"
              data-testid="compare-modal-done-btn">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Comparison Row ── */
const CompareRow = ({ label, values, highlight = false }) => (
  <div className={`flex items-center text-[11px] border-b border-slate-50 last:border-b-0 ${highlight ? 'bg-[#FDFBF5]' : 'bg-white'}`}>
    <span className="w-[80px] flex-shrink-0 px-3 py-2 font-medium text-[#111]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    {values.map((val, i) => (
      <span key={i} className="flex-1 px-2 py-2 text-center text-[#64748B] capitalize truncate">{val}</span>
    ))}
  </div>
);

/* ── Floating Compare Bar ── */
const CompareFloatingBar = () => {
  const { compareVenues, removeFromCompare, clearCompare } = useCompare();
  const [showSheet, setShowSheet] = useState(false);

  if (compareVenues.length === 0) return null;

  return (
    <>
      <div
        className="fixed left-0 right-0 z-[60] bg-[#111111]/95 backdrop-blur-md border-t border-[#D4B36A]/50 shadow-2xl animate-slideUp"
        style={{ bottom: '76px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        data-testid="compare-floating-bar"
      >
        <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => { if (compareVenues.length >= 2) setShowSheet(true); }}
              disabled={compareVenues.length < 2}
              className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all flex-shrink-0 ${
                compareVenues.length >= 2
                  ? 'bg-[#D4B36A] text-[#111111] hover:bg-[#C4A030]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
              data-testid="compare-now-btn"
            >
              <Scale className="w-3.5 h-3.5" />
              Compare {compareVenues.length}/3
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {compareVenues.map((venue) => (
                <div key={venue.venue_id} className="relative flex-shrink-0">
                  <img
                    src={venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=100'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#D4B36A]/40"
                  />
                  <button
                    onClick={() => removeFromCompare(venue.venue_id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                    data-testid={`compare-remove-${venue.venue_id}`}
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={clearCompare}
            className="text-white/40 hover:text-white/70 text-xs font-medium transition-colors px-1 flex-shrink-0"
            data-testid="compare-clear-all"
          >
            Clear
          </button>
        </div>
      </div>

      {showSheet && <CompareSheet onClose={() => setShowSheet(false)} />}
    </>
  );
};

export default CompareFloatingBar;
