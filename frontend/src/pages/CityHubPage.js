import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSEO } from '@/lib/useSEO';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MapPin, Building2, Users, ArrowRight, Search, Phone,
} from 'lucide-react';

const CITY_IMAGES = {
  delhi: 'https://images.unsplash.com/photo-1617889206384-259371f2c511?w=800&q=80',
  mumbai: 'https://images.unsplash.com/photo-1723715435775-162d158ccc68?w=800&q=80',
  gurgaon: 'https://images.unsplash.com/photo-1715870251864-64fd4a6ae4ad?w=800&q=80',
  noida: 'https://images.unsplash.com/photo-1742405425182-6a92ae589983?w=800&q=80',
};

const CityHubPage = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get('/venues/cities');
        setCities(res.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchCities();
  }, []);

  const totalVenues = cities.reduce((s, c) => s + (c.venue_count || 0), 0);

  useSEO({
    title: 'Event Venues Across India | BookMyVenue',
    description: `Browse ${totalVenues} curated wedding & event venues across ${cities.length} cities. Delhi, Mumbai, Gurgaon, Noida — managed bookings with dedicated venue experts.`,
    ogType: 'website',
    canonical: `${window.location.origin}/venues`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Event Venues Across India",
      "description": "Curated wedding and event venues across major Indian cities",
      "numberOfItems": cities.length,
      "itemListElement": cities.map((c, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `${window.location.origin}/venues/${c.slug}`,
        "name": `Event Venues in ${c.city}`,
      })),
    },
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F9F7]">
        {/* Hero */}
        <div className="bg-[#0B1F3B] text-white" data-testid="hub-hero">
          <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 text-center">
            <p className="text-[#C9A227] text-sm font-semibold uppercase tracking-widest mb-3">
              BookMyVenue
            </p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold max-w-3xl mx-auto leading-tight">
              Find the Perfect Venue for Your Event
            </h1>
            <p className="text-slate-300 mt-4 text-base md:text-lg max-w-2xl mx-auto">
              {totalVenues} curated venues across {cities.length} cities.
              Every booking managed by a dedicated venue expert — from shortlisting to confirmation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link to="/#concierge">
                <Button className="bg-[#C9A227] hover:bg-[#B8911F] text-[#0B1F3B] font-semibold px-6 py-3" data-testid="hero-expert-cta">
                  <Phone className="w-4 h-4 mr-2" /> Speak to a Venue Expert
                </Button>
              </Link>
              <Link to="/venues/search">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-6 py-3" data-testid="hero-search-cta">
                  <Search className="w-4 h-4 mr-2" /> Search All Venues
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* SEO Intro */}
        <div className="max-w-4xl mx-auto px-4 py-10 text-center" data-testid="seo-intro">
          <h2 className="font-serif text-xl md:text-2xl font-bold text-[#0B1F3B] mb-3">
            India's Managed Venue Booking Platform
          </h2>
          <p className="text-[#64748B] leading-relaxed text-sm md:text-base">
            BookMyVenue is India's first fully managed venue booking platform.
            Unlike traditional listing sites, we assign a dedicated Relationship Manager
            to handle your entire booking — from understanding your requirements, shortlisting
            the best venues, negotiating rates, to confirming the booking. Browse venues by
            city below, or speak directly to our expert for a personalized recommendation.
          </p>
        </div>

        {/* City Grid */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <h2 className="font-serif text-xl font-bold text-[#0B1F3B] mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#C9A227]" /> Explore by City
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-10 h-10 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="city-grid">
              {cities.map((city) => {
                const img = city.sample_image || CITY_IMAGES[city.slug] || CITY_IMAGES.delhi;
                return (
                  <Link
                    key={city.slug}
                    to={`/venues/${city.slug}`}
                    className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    data-testid={`city-card-${city.slug}`}
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={img}
                        alt={`Event venues in ${city.city}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="font-serif text-xl font-bold text-white">{city.city}</h3>
                        {city.state && (
                          <p className="text-white/70 text-xs">{city.state}</p>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <span className="text-xs font-semibold text-[#0B1F3B]">{city.venue_count} venues</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                          <Building2 className="w-4 h-4" />
                          <span>{city.venue_count} {city.venue_count === 1 ? 'venue' : 'venues'}</span>
                        </div>
                        {city.min_price > 0 && (
                          <div className="text-sm">
                            <span className="text-[#64748B]">from </span>
                            <span className="font-semibold text-[#0B1F3B] font-mono">{formatIndianCurrency(city.min_price)}</span>
                            <span className="text-[#64748B] text-xs">/plate</span>
                          </div>
                        )}
                      </div>

                      {city.max_capacity > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-3">
                          <Users className="w-3.5 h-3.5" />
                          Up to {city.max_capacity.toLocaleString()} guests
                        </div>
                      )}

                      {/* Area tags */}
                      {city.areas?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {city.areas.slice(0, 3).map(a => (
                            <span key={a.area_id} className="text-[10px] bg-slate-100 text-[#64748B] px-2 py-0.5 rounded-full">
                              {a.name}
                            </span>
                          ))}
                          {city.areas.length > 3 && (
                            <span className="text-[10px] text-[#64748B] px-1 py-0.5">
                              +{city.areas.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-sm font-medium text-[#C9A227] group-hover:text-[#B8911F]">
                        Explore Venues <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="bg-[#0B1F3B] text-white" data-testid="hub-bottom-cta">
          <div className="max-w-3xl mx-auto px-4 py-12 text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-3">
              Don't see your city?
            </h2>
            <p className="text-slate-300 mb-6">
              We're rapidly expanding across India. Tell us where your event is and we'll
              find the best venues for you — even in cities we haven't listed yet.
            </p>
            <Link to="/#concierge">
              <Button className="bg-[#C9A227] hover:bg-[#B8911F] text-[#0B1F3B] font-semibold px-8 py-3" data-testid="bottom-expert-cta">
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

export default CityHubPage;
