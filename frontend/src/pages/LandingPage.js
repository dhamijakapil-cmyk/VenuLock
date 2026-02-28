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
  Briefcase,
  CheckCircle,
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
  const [searchDate, setSearchDate] = useState('');

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

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header transparent />

      {/* Premium Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-[#0B1F3B] overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1F3B] via-[#0B1F3B] to-[#071428] opacity-100" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A227]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A227]/20 to-transparent" />
        
        {/* Content */}
        <div className="container-main relative z-10 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-bold mb-6 leading-[1.1] tracking-tight">
              Book Perfect Venues for{' '}
              <span className="relative inline-block">
                <span className="text-[#C9A227]">Every Event</span>
                {/* Gold underline */}
                <span className="absolute -bottom-2 left-0 w-full h-[3px] bg-gradient-to-r from-[#C9A227]/0 via-[#C9A227] to-[#C9A227]/0" />
              </span>
              <span className="text-white">.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl lg:text-2xl text-slate-300 mb-16 max-w-2xl mx-auto leading-relaxed font-light">
              A Managed Event Booking Platform Powered by Experts.
            </p>

            {/* Elegant Search Bar */}
            <form
              onSubmit={handleSearch}
              className="bg-white/[0.03] backdrop-blur-sm border border-white/10 p-3 md:p-4 max-w-4xl mx-auto"
              data-testid="hero-search-form"
            >
              <div className="bg-white p-2 md:p-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
                  {/* Location */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                      Location
                    </label>
                    <Select value={searchCity} onValueChange={setSearchCity}>
                      <SelectTrigger 
                        className="h-11 border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227]/20"
                        data-testid="search-city"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#64748B]" />
                          <SelectValue placeholder="Select City" />
                        </div>
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

                  {/* Event Type */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                      Event Type
                    </label>
                    <Select value={searchEventType} onValueChange={setSearchEventType}>
                      <SelectTrigger 
                        className="h-11 border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227]/20"
                        data-testid="search-event-type"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#64748B]" />
                          <SelectValue placeholder="Select Event" />
                        </div>
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

                  {/* Guest Count */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                      Guest Count
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <Input
                        type="number"
                        placeholder="No. of guests"
                        value={searchGuests}
                        onChange={(e) => setSearchGuests(e.target.value)}
                        className="h-11 pl-10 border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227]/20"
                        data-testid="search-guests"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="h-11 border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227]/20 text-[#64748B]"
                      data-testid="search-date"
                    />
                  </div>

                  {/* Search Button */}
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="submit"
                      className="w-full h-11 bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B] font-semibold text-sm tracking-wide transition-all duration-200 hover:shadow-lg hover:shadow-[#C9A227]/20"
                      data-testid="search-btn"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search Venues
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Subtle trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C9A227]" />
                <span>500+ Premium Venues</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C9A227]" />
                <span>Expert-Managed Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C9A227]" />
                <span>Best Price Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-[#C9A227] font-semibold text-sm uppercase tracking-widest mb-4">
              Why BookMyVenue
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-[#0B1F3B] mb-6">
              Your Personal Event Concierge
            </h2>
            <p className="text-lg text-[#64748B] leading-relaxed">
              We don't just list venues. We negotiate, manage, and ensure your event is perfect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#F9F9F7] group-hover:bg-[#F0E6D2] transition-colors duration-300 flex items-center justify-center">
                <Briefcase className="w-9 h-9 text-[#C9A227]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0B1F3B] mb-3">
                Dedicated Expert
              </h3>
              <p className="text-[#64748B] leading-relaxed">
                A personal relationship manager handles your entire booking journey from search to celebration.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#F9F9F7] group-hover:bg-[#F0E6D2] transition-colors duration-300 flex items-center justify-center">
                <Shield className="w-9 h-9 text-[#C9A227]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0B1F3B] mb-3">
                Best Price Negotiated
              </h3>
              <p className="text-[#64748B] leading-relaxed">
                We negotiate directly with venues to get you the best rates and packages for your budget.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#F9F9F7] group-hover:bg-[#F0E6D2] transition-colors duration-300 flex items-center justify-center">
                <Star className="w-9 h-9 text-[#C9A227]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0B1F3B] mb-3">
                End-to-End Support
              </h3>
              <p className="text-[#64748B] leading-relaxed">
                From venue visits to contract review to event day coordination — we've got you covered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues */}
      <section className="py-20 md:py-28 bg-[#F9F9F7]">
        <div className="container-main">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
            <div>
              <p className="text-[#C9A227] font-semibold text-sm uppercase tracking-widest mb-4">
                Curated Selection
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0B1F3B]">
                Featured Venues
              </h2>
            </div>
            <Link
              to="/venues"
              className="mt-4 md:mt-0 inline-flex items-center text-[#0B1F3B] font-semibold hover:text-[#C9A227] transition-colors group"
            >
              Explore All Venues
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl">
                  <div className="aspect-[4/3] skeleton rounded-t-xl" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 skeleton w-1/3" />
                    <div className="h-6 skeleton w-2/3" />
                    <div className="h-4 skeleton w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredVenues.slice(0, 3).map((venue) => (
                <VenueCard key={venue.venue_id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-20 bg-white border-y border-slate-100">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#0B1F3B] mb-4">
              Trusted by India's Leading Families & Companies
            </h2>
          </div>

          {/* Placeholder Logos */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-12 opacity-40">
            {['Reliance', 'Tata', 'Infosys', 'Wipro', 'HDFC'].map((brand, idx) => (
              <div 
                key={idx} 
                className="h-8 md:h-10 px-6 flex items-center justify-center bg-slate-200 rounded"
              >
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  {brand}
                </span>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-[#F9F9F7] p-6 md:p-8 rounded-xl">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C9A227] text-[#C9A227]" />
                ))}
              </div>
              <p className="text-[#0B1F3B] text-lg italic leading-relaxed mb-4">
                "Professional and seamless booking experience. The team negotiated a package we couldn't have gotten ourselves."
              </p>
              <p className="text-sm text-[#64748B]">— Priya S., Wedding, Delhi</p>
            </div>
            <div className="bg-[#F9F9F7] p-6 md:p-8 rounded-xl">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C9A227] text-[#C9A227]" />
                ))}
              </div>
              <p className="text-[#0B1F3B] text-lg italic leading-relaxed mb-4">
                "They negotiated better than we could. Our corporate event was flawless from venue selection to execution."
              </p>
              <p className="text-sm text-[#64748B]">— Rajesh M., Corporate Event, Gurgaon</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-[#C9A227] font-semibold text-sm uppercase tracking-widest mb-4">
              Simple Process
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-[#0B1F3B]">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { step: '01', title: 'Share Requirements', desc: 'Tell us about your event, guest count, and preferences.' },
              { step: '02', title: 'Get Curated Options', desc: 'Our experts shortlist the best venues matching your needs.' },
              { step: '03', title: 'Visit & Negotiate', desc: 'We arrange site visits and negotiate the best rates for you.' },
              { step: '04', title: 'Book & Celebrate', desc: 'Confirm your booking with our support through the event.' },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#C9A227] to-transparent" />
                )}
                <div className="text-center relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0B1F3B] text-[#C9A227] font-mono text-xl font-bold mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#0B1F3B] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-[#0B1F3B] relative overflow-hidden">
        {/* Decorative line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A227]/30 to-transparent" />
        
        <div className="container-main relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Find Your{' '}
              <span className="text-[#C9A227]">Perfect Venue</span>?
            </h2>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Let our experts help you discover and book the ideal venue for your special occasion.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="h-12 px-8 bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B] font-semibold text-sm tracking-wide"
              >
                <Link to="/venues">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Venues
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 px-8 border-white/30 text-white hover:bg-white/10 font-semibold text-sm tracking-wide"
              >
                <Link to="/register">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
