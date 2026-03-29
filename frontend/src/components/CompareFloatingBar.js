import React, { useState } from 'react';
import { useCompare } from '@/context/CompareContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatIndianCurrency, AMENITIES } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/context/AuthContext';
import {
  X, ArrowRight, Scale, Star, MapPin, Users, Check,
  Share2, Link2, CheckCircle, Loader2, Trash2,
} from 'lucide-react';

/* ── Compare Modal (Popup Overlay) ── */
const CompareModal = ({ onClose }) => {
  const { compareVenues, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);

  const venues = compareVenues;

  const handleShare = async () => {
    if (venues.length < 2) return;
    setSharing(true);
    try {
      const venueIds = venues.map((v) => v.venue_id);
      const res = await api.post('/shared-comparisons', { venue_ids: venueIds });
      const link = `${window.location.origin}/venues/compare/shared/${res.data.share_id}`;
      setShareLink(link);
      try {
        await navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.success('Share link created!');
      }
    } catch {
      toast.error('Could not create share link.');
    } finally {
      setSharing(false);
    }
  };

  const getAmenityValue = (venue, amenityKey) => {
    const val = venue.amenities?.[amenityKey];
    if (amenityKey === 'rooms_available') {
      return val > 0
        ? <span className="text-[#111] font-medium">{val} rooms</span>
        : <span className="text-slate-300">--</span>;
    }
    return val
      ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
      : <X className="w-4 h-4 text-slate-300 mx-auto" />;
  };

  const handleVenueClick = (venue) => {
    const link = (venue.city_slug && venue.slug)
      ? `/venues/${venue.city_slug}/${venue.slug}`
      : `/venues/${venue.venue_id}`;
    onClose();
    navigate(link);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" data-testid="compare-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 flex flex-col h-full max-h-[100dvh] bg-white animate-slideInUp"
        style={{ animationDuration: '0.3s' }}>

        {/* Header — sticky */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111] flex-shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 8px)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <Scale className="w-4 h-4 text-[#D4B36A] flex-shrink-0" />
            <h2 className="text-[15px] font-bold text-white truncate">
              Compare <span className="text-[#D4B36A]">{venues.length}</span> Venues
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {venues.length >= 2 && (
              <button onClick={handleShare} disabled={sharing}
                className="flex items-center gap-1.5 bg-[#D4B36A] hover:bg-[#C4A030] text-[#111] text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                data-testid="compare-modal-share-btn">
                {sharing ? <Loader2 className="w-3 h-3 animate-spin" /> : shareLink ? <CheckCircle className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {shareLink ? 'Copied' : 'Share'}
              </button>
            )}
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              data-testid="compare-modal-close-btn">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Share link banner */}
        {shareLink && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#FDFBF5] border-b border-[#D4B36A]/20 flex-shrink-0">
            <Link2 className="w-4 h-4 text-[#D4B36A] flex-shrink-0" />
            <p className="text-[11px] text-[#64748B] truncate flex-1">{shareLink}</p>
            <button onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Copied!'); }}
              className="text-[#D4B36A] text-[11px] font-bold flex-shrink-0" data-testid="compare-modal-copy-link">
              Copy
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Venue Cards */}
          <div className={`grid gap-3 p-4 ${venues.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {venues.map((venue) => {
              const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=400';
              return (
                <div key={venue.venue_id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm"
                  data-testid={`compare-modal-card-${venue.venue_id}`}>
                  <div className="relative aspect-[4/3]">
                    <img src={img} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
                    <button onClick={() => removeFromCompare(venue.venue_id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                      data-testid={`compare-modal-remove-${venue.venue_id}`}>
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    {venue.rating > 0 && (
                      <div className="absolute top-2 left-2 bg-white/90 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-[#D4B36A] text-[#D4B36A]" />
                        <span className="text-[10px] font-bold text-[#111]">{venue.rating?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5" onClick={() => handleVenueClick(venue)}>
                    <h3 className="text-[12px] font-bold text-[#111] line-clamp-2 leading-tight cursor-pointer hover:text-[#D4B36A] transition-colors">
                      {venue.name}
                    </h3>
                    <p className="text-[10px] text-[#64748B] flex items-center gap-0.5 mt-1">
                      <MapPin className="w-2.5 h-2.5 text-[#D4B36A]" />
                      {venue.area}, {venue.city}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="mx-4 mb-4 bg-white rounded-xl border border-slate-100 overflow-hidden" data-testid="compare-modal-table">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-left w-[120px] sticky left-0 bg-slate-50">
                      Feature
                    </th>
                    {venues.map((v) => (
                      <th key={v.venue_id} className="px-3 py-2.5 text-[10px] font-bold text-[#D4B36A] uppercase tracking-wider text-center">
                        {v.name?.split(' ').slice(0, 2).join(' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Price / Plate" highlight
                    values={venues.map((v) => <span className="font-bold text-[#111]">{formatIndianCurrency(v.pricing?.price_per_plate_veg)}</span>)} />
                  <CompareRow label="Non-Veg / Plate"
                    values={venues.map((v) => <span className="font-bold text-[#111]">{formatIndianCurrency(v.pricing?.price_per_plate_nonveg)}</span>)} />
                  <CompareRow label="Capacity" highlight
                    values={venues.map((v) => (
                      <span className="inline-flex items-center gap-1 text-[#111]">
                        <Users className="w-3 h-3 text-[#D4B36A]" /> {v.capacity_min}-{v.capacity_max}
                      </span>
                    ))} />
                  <CompareRow label="Type"
                    values={venues.map((v) => <span className="capitalize text-[#111] text-[11px] border border-slate-200 rounded px-1.5 py-0.5">{v.venue_type?.replace(/_/g, ' ')}</span>)} />
                  <CompareRow label="Setting" highlight
                    values={venues.map((v) => <span className="capitalize">{v.indoor_outdoor || '--'}</span>)} />
                  <CompareRow label="Min Spend"
                    values={venues.map((v) => v.pricing?.min_spend ? <span className="font-bold text-[#111]">{formatIndianCurrency(v.pricing.min_spend)}</span> : '--')} />

                  {/* Amenities header */}
                  <tr>
                    <td colSpan={venues.length + 1} className="px-3 py-2 bg-[#111]">
                      <span className="text-[10px] font-bold text-[#D4B36A] uppercase tracking-wider">Amenities</span>
                    </td>
                  </tr>

                  {AMENITIES.map((amenity, idx) => (
                    <CompareRow key={amenity.key} label={amenity.label} highlight={idx % 2 === 0}
                      values={venues.map((v) => getAmenityValue(v, amenity.key))} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div className="mx-4 mb-6 text-center bg-[#FDFBF5] rounded-xl border border-[#D4B36A]/15 p-5">
            <p className="text-[13px] font-bold text-[#111] mb-1">Found your match?</p>
            <p className="text-[11px] text-[#64748B] mb-3">Our experts can help you get the best deal.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { clearCompare(); onClose(); }}
                className="text-[11px] font-bold text-[#64748B] border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                data-testid="compare-modal-clear-btn">
                <Trash2 className="w-3 h-3 inline mr-1" /> Clear All
              </button>
              <button onClick={onClose}
                className="text-[11px] font-bold text-[#111] bg-[#D4B36A] hover:bg-[#C4A030] px-5 py-2 rounded-lg transition-colors"
                data-testid="compare-modal-done-btn">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Compare Table Row ── */
const CompareRow = ({ label, values, highlight = false }) => (
  <tr className={highlight ? 'bg-[#FDFBF5]' : 'bg-white'}>
    <td className="px-3 py-2.5 text-[11px] font-medium text-[#111] border-b border-slate-100 w-[120px] sticky left-0 bg-inherit">
      {label}
    </td>
    {values.map((val, i) => (
      <td key={i} className="px-3 py-2.5 text-[12px] text-center border-b border-slate-100 text-[#64748B]">
        {val}
      </td>
    ))}
  </tr>
);

/* ── Floating Compare Bar ── */
const CompareFloatingBar = () => {
  const { compareVenues, removeFromCompare, clearCompare } = useCompare();
  const [showModal, setShowModal] = useState(false);

  if (compareVenues.length === 0) return null;

  return (
    <>
      <div
        className="fixed left-0 right-0 z-[60] bg-[#111111]/95 backdrop-blur-md border-t border-[#D4B36A]/50 shadow-2xl animate-slideUp"
        style={{ bottom: '0px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        data-testid="compare-floating-bar"
      >
        <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2 md:gap-4">
          {/* Left: count + compare button */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => { if (compareVenues.length >= 2) setShowModal(true); }}
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
            {/* Venue thumbnails */}
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

          {/* Right: clear */}
          <button
            onClick={clearCompare}
            className="text-white/40 hover:text-white/70 text-xs font-medium transition-colors px-1 flex-shrink-0"
            data-testid="compare-clear-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Compare Modal */}
      {showModal && <CompareModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default CompareFloatingBar;
