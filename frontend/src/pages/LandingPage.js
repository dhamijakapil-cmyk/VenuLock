import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/context/AuthContext';
import { EVENT_TYPES, GUEST_COUNT_OPTIONS, RADIUS_OPTIONS, CITY_COORDINATES, cn } from '@/lib/utils';
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  ArrowRight,
  Star,
  Shield,
  Briefcase,
  CheckCircle,
  Crosshair,
  Loader2,
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
  const [searchDate, setSearchDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Location-based search state
  const [userLocation, setUserLocation] = useState(null);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState('');

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

  // Handle "Near Me" geolocation request
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setUsingCurrentLocation(true);
        setSearchCity(''); // Clear city selection when using current location
        setSearchRadius('10'); // Default to 10km radius
        setLocationLoading(false);
        toast.success('Location detected! Select a radius to search nearby venues.');
      },
      (error) => {
        setLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Enable location to use Nearby search.', {
            description: 'Please allow location access in your browser settings.',
          });
        } else {
          toast.error('Unable to get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle city selection - use city center coordinates
  const handleCityChange = (city) => {
    setSearchCity(city);
    setUsingCurrentLocation(false);
    if (city && CITY_COORDINATES[city]) {
      setUserLocation(CITY_COORDINATES[city]);
    } else {
      setUserLocation(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    // Location-based search
    if (userLocation && searchRadius) {
      params.set('lat', userLocation.lat);
      params.set('lng', userLocation.lng);
      params.set('radius', searchRadius);
      params.set('sort_by', 'distance');
    } else if (searchCity) {
      params.set('city', searchCity);
    }
    
    if (searchEventType) params.set('event_type', searchEventType);
    if (searchGuests) {
      const guestOption = GUEST_COUNT_OPTIONS.find(opt => opt.value === searchGuests);
      if (guestOption) {
        params.set('guest_min', guestOption.min);
        if (guestOption.max) params.set('guest_max', guestOption.max);
      }
    }
    if (searchDate) params.set('event_date', format(searchDate, 'yyyy-MM-dd'));
    navigate(`/venues?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header transparent />

      {/* Premium Hero Section with Luxury Depth */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Base gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1E3A] via-[#0A1A32] to-[#081629]" />
        
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Decorative gold lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A227]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A227]/20 to-transparent" />
        
        {/* Content */}
        <div className="container-main relative z-10 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-bold mb-6 leading-[1.1] tracking-tight">
              Book Perfect Venues for{' '}
              <span className="relative inline-block">
                {/* Subtle radial gold glow behind text */}
                <span 
                  className="absolute inset-0 blur-2xl opacity-30"
                  style={{
                    background: 'radial-gradient(ellipse at center, #C9A227 0%, transparent 70%)',
                    transform: 'scale(1.5)',
                  }}
                />
                <span className="relative text-[#C9A227]">Every Event</span>
                {/* Gold underline */}
                <span className="absolute -bottom-2 left-0 w-full h-[3px] bg-gradient-to-r from-[#C9A227]/0 via-[#C9A227] to-[#C9A227]/0" />
              </span>
              <span className="text-white">.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl lg:text-2xl text-slate-300 mb-16 max-w-2xl mx-auto leading-relaxed font-light">
              A Managed Event Booking Platform Powered by Experts.
            </p>

            {/* Luxury Search Card */}
            <form
              onSubmit={handleSearch}
              className="relative max-w-4xl mx-auto"
              data-testid="hero-search-form"
            >
              {/* Glass effect backdrop */}
              <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-md rounded-3xl" />
              
              {/* Outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-3xl blur-sm" />
              
              {/* Main card */}
              <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/20">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-5">
                  {/* Location */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2.5 block">
                      Location
                    </label>
                    <Select value={searchCity} onValueChange={setSearchCity}>
                      <SelectTrigger 
                        className="h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 focus:shadow-[0_0_0_3px_rgba(201,162,39,0.1)] px-5 rounded-xl transition-all duration-200"
                        data-testid="search-city"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-[#94A3B8]" />
                          <SelectValue placeholder="Select City" className="text-[#475569]" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        {cities.map((city) => (
                          <SelectItem key={city.city_id} value={city.name} className="rounded-lg">
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Event Type */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2.5 block">
                      Event Type
                    </label>
                    <Select value={searchEventType} onValueChange={setSearchEventType}>
                      <SelectTrigger 
                        className="h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 focus:shadow-[0_0_0_3px_rgba(201,162,39,0.1)] px-5 rounded-xl transition-all duration-200"
                        data-testid="search-event-type"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="w-4 h-4 text-[#94A3B8]" />
                          <SelectValue placeholder="Select Event" className="text-[#475569]" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="rounded-lg">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Guest Count */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2.5 block">
                      Guest Count
                    </label>
                    <Select value={searchGuests} onValueChange={setSearchGuests}>
                      <SelectTrigger 
                        className="h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 focus:shadow-[0_0_0_3px_rgba(201,162,39,0.1)] px-5 rounded-xl transition-all duration-200"
                        data-testid="search-guests"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-[#94A3B8]" />
                          <SelectValue placeholder="Select Guests" className="text-[#475569]" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        {GUEST_COUNT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="rounded-lg">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2.5 block">
                      Date
                    </label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full h-14 px-5 flex items-center gap-3 rounded-xl text-left text-sm transition-all duration-200",
                            "bg-slate-50/80 shadow-inner shadow-slate-200/50",
                            "focus:ring-2 focus:ring-[#C9A227]/30 focus:shadow-[0_0_0_3px_rgba(201,162,39,0.1)] focus:outline-none",
                            !searchDate && "text-[#475569]"
                          )}
                          data-testid="search-date"
                        >
                          <CalendarIcon className="w-4 h-4 text-[#94A3B8]" />
                          <span className={searchDate ? "text-[#0B1F3B]" : "text-[#475569]"}>
                            {searchDate ? format(searchDate, 'dd MMM yyyy') : 'Select Date'}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white rounded-xl border-0 shadow-xl" align="start" sideOffset={8}>
                        <Calendar
                          mode="single"
                          selected={searchDate}
                          onSelect={(date) => {
                            setSearchDate(date);
                            setDatePickerOpen(false);
                          }}
                          disabled={(date) => date < new Date()}
                          className="rounded-xl border-0"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Search Button - Premium Gold CTA */}
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="submit"
                      className="w-full h-[3.5rem] bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.97] hover:-translate-y-0.5"
                      data-testid="search-btn"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Discover Venues
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Trust messaging under search */}
            <p className="mt-10 text-slate-400 text-base">
              No direct vendor pressure. We represent you.
            </p>

            {/* Subtle trust indicators - 2x2 on mobile, row on desktop */}
            <div className="mt-8 grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-6 md:gap-10 text-slate-300">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#C9A227] stroke-[2.5]" />
                <span className="text-sm md:text-base">500+ Premium Venues</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#C9A227] stroke-[2.5]" />
                <span className="text-sm md:text-base">Expert-Managed Bookings</span>
              </div>
              <div className="flex items-center gap-3 col-span-2 md:col-span-1 justify-center md:justify-start">
                <CheckCircle className="w-5 h-5 text-[#C9A227] stroke-[2.5]" />
                <span className="text-sm md:text-base">Best Price Guarantee</span>
              </div>
            </div>

            {/* Key trust statement */}
            <p className="mt-8 text-[#C9A227] text-base font-medium">
              Transparent pricing. Professional negotiation. Zero hidden surprises.
            </p>
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
            <p className="text-lg text-slate-300 mb-4 leading-relaxed">
              Let our experts help you discover and book the ideal venue for your special occasion.
            </p>
            <p className="text-sm text-slate-400 mb-10">
              Our experts negotiate pricing and manage documentation on your behalf.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="h-12 px-8 bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B] font-semibold text-sm tracking-wide"
              >
                <Link to="/venues">
                  <Search className="w-4 h-4 mr-2" />
                  Discover Venues
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 px-8 border-white/30 text-white hover:bg-white/10 font-semibold text-sm tracking-wide"
              >
                <Link to="/register">
                  Speak to Our Venue Expert
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
