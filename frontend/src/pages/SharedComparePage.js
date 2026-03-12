import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatIndianCurrency, AMENITIES } from '@/lib/utils';
import { api } from '@/context/AuthContext';
import {
  ArrowLeft, Star, MapPin, Users, Check, X, Phone,
  Scale, Share2, Eye, Loader2, AlertCircle,
} from 'lucide-react';

const CompareRow = ({ label, values, highlight = false }) => (
  <tr className={highlight ? 'bg-[#FDFBF5]' : 'bg-white'}>
    <td className="px-4 py-3.5 text-sm font-medium text-[#111111] border-b border-slate-100 w-[180px]">{label}</td>
    {values.map((val, i) => (
      <td key={i} className="px-4 py-3.5 text-sm text-center border-b border-slate-100 text-[#64748B]">{val}</td>
    ))}
  </tr>
);

const SharedComparePage = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/shared-comparisons/${shareId}`);
        setData(res.data);
      } catch {
        setError('This comparison link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#D4B36A] animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">Comparison Not Found</h1>
          <p className="text-[#64748B] mb-6">{error}</p>
          <button
            onClick={() => navigate('/venues/search')}
            className="bg-[#D4B36A] hover:bg-[#C4A030] text-[#111111] font-bold px-6 py-3 text-sm transition-colors"
            data-testid="shared-browse-btn"
          >
            Browse Venues
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const venues = data.venues;

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
                onClick={() => navigate('/venues/search')}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                data-testid="shared-back-btn"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4 text-[#D4B36A]" />
                  <span className="text-[#D4B36A] text-xs font-bold uppercase tracking-wider">Shared Comparison</span>
                </div>
                <h1 className="font-serif text-xl md:text-2xl font-bold text-white">
                  Compare {venues.length} Venues
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>{data.view_count} views</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Shared notice */}
        <div className="mb-6 bg-[#FDFBF5] border border-[#D4B36A]/20 rounded-xl p-4 flex items-center gap-3" data-testid="shared-notice">
          <Share2 className="w-5 h-5 text-[#D4B36A] flex-shrink-0" />
          <p className="text-sm text-[#64748B]">
            Someone shared this venue comparison with you. <Link to="/venues/search" className="text-[#D4B36A] font-medium hover:underline">Start your own search</Link> to find your perfect venue.
          </p>
        </div>

        {/* Venue Cards */}
        <div className={`grid gap-4 mb-8 ${venues.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {venues.map((venue) => {
            const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=600';
            const venueLink = (venue.city_slug && venue.slug)
              ? `/venues/${venue.city_slug}/${venue.slug}`
              : `/venues/${venue.venue_id}`;
            return (
              <div key={venue.venue_id} className="bg-white rounded-xl border border-slate-100 overflow-hidden" data-testid={`shared-card-${venue.venue_id}`}>
                <div className="relative h-40 md:h-52">
                  <img src={img} alt={venue.name} className="w-full h-full object-cover" />
                  {venue.rating > 0 && (
                    <div className="absolute top-3 left-3 bg-white/90 rounded-full px-2 py-1 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#D4B36A] text-[#D4B36A]" />
                      <span className="text-xs font-bold text-[#111111]">{venue.rating?.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <Link to={venueLink} className="font-serif text-lg font-bold text-[#111111] hover:text-[#D4B36A] transition-colors line-clamp-1">
                    {venue.name}
                  </Link>
                  <p className="text-sm text-[#64748B] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D4B36A]" />
                    {venue.area}, {venue.city}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-sm text-[#64748B] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {venue.capacity_min}-{venue.capacity_max}
                    </span>
                    <span className="text-lg font-bold text-[#D4B36A]">
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
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden" data-testid="shared-compare-table">
          <div className="bg-gradient-to-r from-[#111111] to-[#153055] px-6 py-4">
            <h2 className="text-white font-serif text-lg font-bold">Detailed Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider text-left w-[180px]">Feature</th>
                  {venues.map((v) => (
                    <th key={v.venue_id} className="px-4 py-3 text-xs font-bold text-[#D4B36A] uppercase tracking-wider text-center">
                      {v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Venue Type" values={venues.map((v) => <span className="capitalize">{v.venue_type?.replace(/_/g, ' ')}</span>)} />
                <CompareRow label="Setting" highlight values={venues.map((v) => <span className="capitalize">{v.indoor_outdoor}</span>)} />
                <CompareRow label="Capacity" values={venues.map((v) => `${v.capacity_min} - ${v.capacity_max}`)} />
                <CompareRow label="Veg Price/Plate" highlight values={venues.map((v) => <span className="font-bold text-[#111111]">{formatIndianCurrency(v.pricing?.price_per_plate_veg)}</span>)} />
                <CompareRow label="Non-Veg Price/Plate" values={venues.map((v) => <span className="font-bold text-[#111111]">{formatIndianCurrency(v.pricing?.price_per_plate_nonveg)}</span>)} />
                <CompareRow label="Min. Spend" highlight values={venues.map((v) => v.pricing?.min_spend ? formatIndianCurrency(v.pricing.min_spend) : '—')} />
                <CompareRow label="Rating" values={venues.map((v) => <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-[#D4B36A] text-[#D4B36A]" />{v.rating?.toFixed(1) || '—'}</span>)} />
                <tr>
                  <td colSpan={venues.length + 1} className="px-4 py-3 bg-[#111111]">
                    <span className="text-xs font-bold text-[#D4B36A] uppercase tracking-wider">Amenities</span>
                  </td>
                </tr>
                {AMENITIES.map((amenity, idx) => (
                  <CompareRow key={amenity.key} label={amenity.label} highlight={idx % 2 === 0} values={venues.map((v) => getAmenityValue(v, amenity.key))} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center bg-white rounded-xl border border-slate-100 p-8">
          <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">Like what you see?</h3>
          <p className="text-[#64748B] text-sm mb-4">Our venue experts can help you get the best deal on any of these venues.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/venues/search')}
              className="bg-[#D4B36A] hover:bg-[#C4A030] text-[#111111] font-bold px-6 py-3 text-sm transition-colors flex items-center gap-2"
              data-testid="shared-enquire-btn"
            >
              <Phone className="w-4 h-4" />
              Speak to an Expert
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SharedComparePage;
