import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import { api } from '@/context/AuthContext';
import { EVENT_TYPES, formatIndianCurrency } from '@/lib/utils';
import {
  MapPin, ChevronRight, Building2, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CityVenuesPage = () => {
  const { citySlug: citySlugParam, param } = useParams();
  const citySlug = citySlugParam || param;
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const eventType = searchParams.get('event_type') || '';
  const sortBy = searchParams.get('sort') || 'popular';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/venues/city/${citySlug}?sort_by=${sortBy}`;
        if (eventType) url += `&event_type=${eventType}`;
        const res = await api.get(url);
        setData(res.data);
      } catch { setData(null); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [citySlug, eventType, sortBy]);

  const cityName = data?.city || citySlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const title = `Best Wedding & Event Venues in ${cityName} | BookMyVenue`;
  const description = `Discover ${data?.total || ''} curated event venues in ${cityName}. Compare prices, capacity & amenities. Managed bookings with dedicated venue experts.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${window.location.origin}/venues/${citySlug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": `Event Venues in ${cityName}`,
          "numberOfItems": data?.total || 0,
          "itemListElement": (data?.venues || []).slice(0, 10).map((v, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `${window.location.origin}/venues/${citySlug}/${v.slug}`,
            "name": v.name,
          })),
        })}</script>
      </Helmet>

      <Header />
      <main className="min-h-screen bg-[#F9F9F7]">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-sm text-[#64748B]" data-testid="breadcrumb">
              <Link to="/" className="hover:text-[#0B1F3B]">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to="/venues" className="hover:text-[#0B1F3B]">Venues</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#0B1F3B] font-medium">{cityName}</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-[#0B1F3B] text-white" data-testid="city-hero">
          <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
            <div className="flex items-center gap-2 text-[#C9A227] text-sm mb-2">
              <MapPin className="w-4 h-4" />
              <span>{data?.state || ''}</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold">
              Event Venues in {cityName}
            </h1>
            <p className="text-slate-300 mt-3 text-base max-w-2xl">
              {data?.total || 0} curated venues managed by BookMyVenue experts.
              Compare, shortlist and book with zero hassle.
            </p>
            {data?.areas?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {data.areas.map(a => (
                  <span key={a.area_id} className="text-xs bg-white/10 px-3 py-1.5 rounded-full text-slate-300">
                    {a.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20" data-testid="city-filters">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto">
            <SlidersHorizontal className="w-4 h-4 text-[#64748B] shrink-0" />
            <select
              value={eventType}
              onChange={e => { const p = new URLSearchParams(searchParams); if (e.target.value) p.set('event_type', e.target.value); else p.delete('event_type'); setSearchParams(p); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
              data-testid="filter-event-type"
            >
              <option value="">All Events</option>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={e => { const p = new URLSearchParams(searchParams); p.set('sort', e.target.value); setSearchParams(p); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
              data-testid="filter-sort"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
            <span className="text-sm text-[#64748B] ml-auto shrink-0">
              {data?.total || 0} venues
            </span>
          </div>
        </div>

        {/* Venue Grid */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-10 h-10 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data?.venues?.length ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-[#0B1F3B]">No venues found in {cityName}</p>
              <p className="text-sm text-[#64748B] mt-1">Try adjusting your filters or explore other cities</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="venue-grid">
              {data.venues.map(venue => (
                <VenueCard key={venue.venue_id} venue={{...venue, _citySlug: citySlug}} />
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-[#0B1F3B] text-white" data-testid="city-cta">
          <div className="max-w-3xl mx-auto px-4 py-12 text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-3">
              Can't decide? Let our experts help.
            </h2>
            <p className="text-slate-300 mb-6">
              Our venue experts know every venue in {cityName} personally.
              Tell us your requirements and we'll shortlist the best options for you.
            </p>
            <Link to="/#concierge">
              <Button className="bg-[#C9A227] hover:bg-[#B8911F] text-[#0B1F3B] font-semibold px-8 py-3" data-testid="speak-expert-cta">
                Speak to a Venue Expert
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CityVenuesPage;
