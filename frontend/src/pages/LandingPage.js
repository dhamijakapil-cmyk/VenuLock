import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/context/AuthContext';
import { EVENT_TYPES } from '@/lib/utils';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Phone,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search form state
  const [searchCity, setSearchCity] = useState('');
  const [searchEventType, setSearchEventType] = useState('');
  const [searchGuests, setSearchGuests] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [venuesRes, citiesRes] = await Promise.all([
          api.get('/venues?limit=6&sort_by=popular'),
          api.get('/cities'),
        ]);
        setFeaturedVenues(venuesRes.data);
        setCities(citiesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    if (searchEventType) params.set('event_type', searchEventType);
    if (searchGuests) params.set('guest_min', searchGuests);
    navigate(`/venues?${params.toString()}`);
  };

  const heroImages = [
    'https://images.unsplash.com/photo-1745573673416-66e829644ae9?w=1600',
    'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=1600',
    'https://images.unsplash.com/photo-1728024181315-8c7f5815bf00?w=1600',
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header transparent />

      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImages[0]})` }}
        >
          <div className="absolute inset-0 hero-gradient"></div>
        </div>

        <div className="container-main relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-bold mb-6 animate-slideUp">
              Find Your Perfect Venue for Every Celebration
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed animate-slideUp" style={{ animationDelay: '0.1s' }}>
              Discover and book premium venues across Delhi NCR. From intimate gatherings to grand weddings, we have the perfect space for you.
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white p-4 md:p-6 shadow-xl animate-slideUp"
              style={{ animationDelay: '0.2s' }}
              data-testid="hero-search-form"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1 block">
                    City
                  </label>
                  <Select value={searchCity} onValueChange={setSearchCity}>
                    <SelectTrigger data-testid="search-city">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.city_id} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1 block">
                    Event Type
                  </label>
                  <Select value={searchEventType} onValueChange={setSearchEventType}>
                    <SelectTrigger data-testid="search-event-type">
                      <SelectValue placeholder="Select Event" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1 block">
                    Guests
                  </label>
                  <Input
                    type="number"
                    placeholder="No. of guests"
                    value={searchGuests}
                    onChange={(e) => setSearchGuests(e.target.value)}
                    data-testid="search-guests"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-semibold h-10"
                    data-testid="search-btn"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Venues
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-y border-slate-200">
        <div className="container-main py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
                <Star className="w-6 h-6 text-[#C9A227]" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#0B1F3B]">500+</p>
                <p className="text-sm text-[#64748B]">Premium Venues</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#C9A227]" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#0B1F3B]">10,000+</p>
                <p className="text-sm text-[#64748B]">Happy Customers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#C9A227]" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#0B1F3B]">100%</p>
                <p className="text-sm text-[#64748B]">Verified Venues</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#C9A227]" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#0B1F3B]">24hr</p>
                <p className="text-sm text-[#64748B]">Response Time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues */}
      <section className="py-16 md:py-24">
        <div className="container-main">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0B1F3B] mb-2">
                Featured Venues
              </h2>
              <p className="text-[#64748B]">Hand-picked venues for exceptional experiences</p>
            </div>
            <Link
              to="/venues"
              className="mt-4 md:mt-0 flex items-center gap-2 text-[#0B1F3B] font-medium hover:text-[#C9A227] transition-colors"
              data-testid="view-all-venues"
            >
              View All Venues
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white overflow-hidden">
                  <div className="aspect-[4/3] skeleton" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 skeleton w-1/3" />
                    <div className="h-6 skeleton w-2/3" />
                    <div className="h-4 skeleton w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredVenues.map((venue) => (
                <VenueCard key={venue.venue_id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Event Types Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0B1F3B] mb-4">
              Venues for Every Occasion
            </h2>
            <p className="text-[#64748B] max-w-2xl mx-auto">
              Whether it's a grand wedding or an intimate birthday celebration, find the perfect venue for your special day.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Weddings', value: 'wedding', image: 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=400' },
              { name: 'Corporate', value: 'corporate', image: 'https://images.unsplash.com/photo-1759065662057-0c008c001d8d?w=400' },
              { name: 'Birthday', value: 'birthday', image: 'https://images.unsplash.com/photo-1677232519517-9dca7bacdfd3?w=400' },
              { name: 'Reception', value: 'reception', image: 'https://images.unsplash.com/photo-1571983371651-221e6c0b910a?w=400' },
            ].map((event) => (
              <Link
                key={event.value}
                to={`/venues?event_type=${event.value}`}
                className="group relative aspect-square overflow-hidden"
                data-testid={`event-${event.value}`}
              >
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="font-serif text-xl text-white font-semibold">{event.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0B1F3B] mb-4">
              How It Works
            </h2>
            <p className="text-[#64748B]">Book your perfect venue in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Search & Filter',
                description: 'Browse through our curated list of venues. Use filters to find the perfect match for your event.',
                icon: Search,
              },
              {
                step: '02',
                title: 'Compare & Enquire',
                description: 'Compare venues, check availability, and submit your enquiry. Our team will assist you.',
                icon: Calendar,
              },
              {
                step: '03',
                title: 'Visit & Book',
                description: 'Schedule a site visit, finalize details, and book your dream venue with confidence.',
                icon: MapPin,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="gold-border-left pl-6">
                  <span className="font-mono text-4xl text-[#C9A227] font-bold">{item.step}</span>
                  <h3 className="font-serif text-xl font-semibold text-[#0B1F3B] mt-2 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-[#64748B] leading-relaxed">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 w-1/2 border-t border-dashed border-[#C9A227]/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#0B1F3B] noise-overlay py-16 md:py-24">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl text-white font-bold mb-6">
                Are You a Venue Owner?
              </h2>
              <p className="text-slate-300 leading-relaxed mb-8">
                Partner with BookMyVenue and reach thousands of customers looking for the perfect venue. Get more bookings, grow your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate('/register?role=venue_owner')}
                  className="bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-semibold px-8"
                  data-testid="list-venue-btn"
                >
                  List Your Venue
                </Button>
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#0B1F3B]"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Sales
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-6">
                <p className="font-mono text-3xl text-[#C9A227] font-bold">0%</p>
                <p className="text-white mt-1">Listing Fee</p>
              </div>
              <div className="bg-white/10 p-6">
                <p className="font-mono text-3xl text-[#C9A227] font-bold">24hr</p>
                <p className="text-white mt-1">Quick Approval</p>
              </div>
              <div className="bg-white/10 p-6">
                <p className="font-mono text-3xl text-[#C9A227] font-bold">1L+</p>
                <p className="text-white mt-1">Monthly Visitors</p>
              </div>
              <div className="bg-white/10 p-6">
                <p className="font-mono text-3xl text-[#C9A227] font-bold">5x</p>
                <p className="text-white mt-1">More Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
