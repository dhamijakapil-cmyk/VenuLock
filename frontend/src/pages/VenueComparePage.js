import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCompare } from '@/context/CompareContext';
import { formatIndianCurrency, AMENITIES } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/context/AuthContext';
import {
  ArrowLeft,
  Star,
  MapPin,
  Users,
  Check,
  X,
  Phone,
  Scale,
  Trash2,
  Share2,
  Link2,
  CheckCircle,
  Loader2,
} from 'lucide-react';

const CompareRow = ({ label, values, highlight = false }) => (
  <tr className={highlight ? 'bg-[#FDFBF5]' : 'bg-white'}>
    <td className="px-4 py-3.5 text-sm font-medium text-[#111111] border-b border-slate-100 w-[180px]">
      {label}
    </td>
    {values.map((val, i) => (
      <td key={i} className="px-4 py-3.5 text-sm text-center border-b border-slate-100 text-[#64748B]">
        {val}
      </td>
    ))}
  </tr>
);

const VenueComparePage = () => {
  const navigate = useNavigate();
  const { compareVenues, removeFromCompare, clearCompare } = useCompare();
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);

  const handleShare = async () => {
    if (compareVenues.length < 2) return;
    setSharing(true);
    try {
      const venueIds = compareVenues.map((v) => v.venue_id);
      const res = await api.post('/shared-comparisons', { venue_ids: venueIds });
      const link = `${window.location.origin}/venues/compare/shared/${res.data.share_id}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!', { description: 'Share it with friends and family.' });
    } catch {
      toast.error('Failed to generate share link');
    } finally {
      setSharing(false);
    }
  };

  if (compareVenues.length < 2) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Scale className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">Not Enough Venues to Compare</h1>
          <p className="text-[#64748B] mb-6">Add at least 2 venues to compare them side-by-side.</p>
          <button
            onClick={() => navigate('/venues/search')}
            className="bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] font-bold px-6 py-3 text-sm transition-colors"
            data-testid="compare-browse-btn"
          >
            Browse Venues
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const venues = compareVenues;

  const getAmenityValue = (venue, amenityKey) => {
    const val = venue.amenities?.[amenityKey];
    if (amenityKey === 'rooms_available') {
      return val > 0 ? <span className="text-[#111111] font-medium">{val} rooms</span> : <X className="w-4 h-4 text-slate-300 mx-auto" />;
    }
    return val
      ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
      : <X className="w-4 h-4 text-slate-300 mx-auto" />;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Header />

      {/* Hero Header */}
      <div className="bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                data-testid="compare-back-btn"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-wider">Side-by-Side</span>
                </div>
                <h1 className="font-serif text-xl md:text-2xl font-bold text-white">
                  Compare {venues.length} Venues
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                data-testid="compare-share-btn"
              >
                {sharing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : shareLink ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                {shareLink ? 'Copied!' : 'Share'}
              </button>
              <button
                onClick={() => { clearCompare(); navigate('/venues/search'); }}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs font-medium transition-colors"
                data-testid="compare-clear-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Share Link Banner */}
        {shareLink && (
          <div className="mb-6 bg-[#FDFBF5] border border-[#D4AF37]/20 rounded-xl p-4 flex items-center justify-between gap-4 animate-slideInUp" data-testid="share-link-banner">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111111]">Shareable link created</p>
                <p className="text-xs text-[#64748B] truncate">{shareLink}</p>
              </div>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Copied!'); }}
              className="flex-shrink-0 text-[#D4AF37] hover:text-[#C4A030] text-sm font-bold transition-colors"
              data-testid="copy-share-link"
            >
              Copy
            </button>
          </div>
        )}
        {/* Venue Cards Row */}
        <div className={`grid gap-4 mb-8 ${venues.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {venues.map((venue) => {
            const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=600';
            const venueLink = (venue.city_slug && venue.slug)
              ? `/venues/${venue.city_slug}/${venue.slug}`
              : `/venues/${venue.venue_id}`;
            return (
              <div key={venue.venue_id} className="bg-white rounded-xl border border-slate-100 overflow-hidden" data-testid={`compare-card-${venue.venue_id}`}>
                <div className="relative h-40 md:h-52">
                  <img src={img} alt={venue.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeFromCompare(venue.venue_id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                    data-testid={`compare-card-remove-${venue.venue_id}`}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {venue.rating > 0 && (
                    <div className="absolute top-3 left-3 bg-white/90 rounded-full px-2 py-1 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                      <span className="text-xs font-bold text-[#111111]">{venue.rating?.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <Link to={venueLink} className="font-serif text-lg font-bold text-[#111111] hover:text-[#D4AF37] transition-colors line-clamp-1">
                    {venue.name}
                  </Link>
                  <p className="text-sm text-[#64748B] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {venue.area}, {venue.city}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-sm text-[#64748B] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {venue.capacity_min}-{venue.capacity_max}
                    </span>
                    <span className="text-lg font-bold text-[#D4AF37]">
                      {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
                      <span className="text-xs font-normal text-[#64748B]">/plate</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden" data-testid="compare-table">
          <div className="bg-gradient-to-r from-[#111111] to-[#153055] px-6 py-4">
            <h2 className="text-white font-serif text-lg font-bold">Detailed Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider text-left w-[180px]">Feature</th>
                  {venues.map((v) => (
                    <th key={v.venue_id} className="px-4 py-3 text-xs font-bold text-[#D4AF37] uppercase tracking-wider text-center">
                      {v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label="Venue Type"
                  values={venues.map((v) => <span className="capitalize">{v.venue_type?.replace(/_/g, ' ')}</span>)}
                />
                <CompareRow
                  label="Setting"
                  highlight
                  values={venues.map((v) => <span className="capitalize">{v.indoor_outdoor}</span>)}
                />
                <CompareRow
                  label="Capacity"
                  values={venues.map((v) => `${v.capacity_min} - ${v.capacity_max}`)}
                />
                <CompareRow
                  label="Veg Price/Plate"
                  highlight
                  values={venues.map((v) => (
                    <span className="font-bold text-[#111111]">{formatIndianCurrency(v.pricing?.price_per_plate_veg)}</span>
                  ))}
                />
                <CompareRow
                  label="Non-Veg Price/Plate"
                  values={venues.map((v) => (
                    <span className="font-bold text-[#111111]">{formatIndianCurrency(v.pricing?.price_per_plate_nonveg)}</span>
                  ))}
                />
                <CompareRow
                  label="Min. Spend"
                  highlight
                  values={venues.map((v) => v.pricing?.min_spend ? formatIndianCurrency(v.pricing.min_spend) : '—')}
                />
                <CompareRow
                  label="Rating"
                  values={venues.map((v) => (
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                      {v.rating?.toFixed(1) || '—'}
                    </span>
                  ))}
                />

                {/* Amenities section header */}
                <tr>
                  <td colSpan={venues.length + 1} className="px-4 py-3 bg-[#111111]">
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Amenities</span>
                  </td>
                </tr>

                {AMENITIES.map((amenity, idx) => (
                  <CompareRow
                    key={amenity.key}
                    label={amenity.label}
                    highlight={idx % 2 === 0}
                    values={venues.map((v) => getAmenityValue(v, amenity.key))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center bg-white rounded-xl border border-slate-100 p-8">
          <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">Found your match?</h3>
          <p className="text-[#64748B] text-sm mb-4">Our venue experts can help you get the best deal.</p>
          <button
            onClick={() => navigate('/venues/search')}
            className="bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] font-bold px-6 py-3 text-sm transition-colors flex items-center gap-2 mx-auto"
            data-testid="compare-enquire-btn"
          >
            <Phone className="w-4 h-4" />
            Speak to an Expert
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VenueComparePage;
