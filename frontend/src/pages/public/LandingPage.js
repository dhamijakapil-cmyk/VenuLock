import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Users, ArrowRight, 
  ShieldCheck, Star, Phone, Building2,
  CheckCircle2, Headphones, Eye, Clock, 
  Heart, Award, Activity, ChevronRight, 
  TrendingUp, Globe, MessageCircle,
  Navigation, Loader2
} from 'lucide-react';
import { api } from '@/context/AuthContext';

// ============== DATA ==============

const RADIUS_OPTIONS = [
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '20', label: '20 km' },
  { value: '50', label: '50 km' },
];

const CITIES_DATA = [
  { 
    name: 'Delhi NCR', 
    venues: '800+', 
    image: 'https://images.unsplash.com/photo-1706545604042-399792bd8a04?w=600&q=80',
    tagline: 'The Capital of Celebrations'
  },
  { 
    name: 'Mumbai', 
    venues: '500+', 
    image: 'https://images.unsplash.com/photo-1679249010086-b8a932c8cafc?w=600&q=80',
    tagline: 'Where Dreams Meet the Sea'
  },
  { 
    name: 'Jaipur', 
    venues: '350+', 
    image: 'https://images.unsplash.com/photo-1607160913542-6234aae47ec5?w=600&q=80',
    tagline: 'Royal Heritage, Royal Events'
  },
  { 
    name: 'Bangalore', 
    venues: '400+', 
    image: 'https://images.unsplash.com/photo-1768822854459-725b1105eb15?w=600&q=80',
    tagline: 'The Garden City of Events'
  },
  { 
    name: 'Goa', 
    venues: '200+', 
    image: 'https://images.unsplash.com/photo-1741208597601-499d1d60fb5c?w=600&q=80',
    tagline: 'Beach, Bliss & Celebrations'
  },
  { 
    name: 'Udaipur', 
    venues: '150+', 
    image: 'https://images.unsplash.com/photo-1710987759549-db4263464211?w=600&q=80',
    tagline: 'The City of Lakes & Love'
  }
];

const PLATFORM_ADVANTAGES = [
  {
    icon: ShieldCheck,
    title: 'Verified Venues Only',
    description: 'Every venue is physically verified. No fake listings, no inflated photos. What you see is what you get.'
  },
  {
    icon: Headphones,
    title: 'Dedicated Relationship Manager',
    description: 'A real human manages your booking end-to-end. From shortlisting to the final walkthrough.'
  },
  {
    icon: Eye,
    title: 'Transparent Pricing',
    description: 'See real prices upfront. No hidden charges, no last-minute surprises. We negotiate so you celebrate.'
  },
  {
    icon: Clock,
    title: 'Real-time Availability',
    description: 'Check live date availability instantly. No back-and-forth calls, no waiting for callbacks.'
  }
];

const LIVE_STATS = [
  { value: '3000', suffix: '+', label: 'Verified Venues', icon: Building2 },
  { value: '12000', suffix: '+', label: 'Events Completed', icon: Award },
  { value: '10', suffix: '+', label: 'Cities Covered', icon: Globe },
  { value: '98', suffix: '%', label: 'Happy Customers', icon: Heart }
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tell Us Your Vision',
    description: 'Share your city, guest count, and event type. Our platform instantly finds the best matches for you.',
    icon: MessageCircle
  },
  {
    step: '02',
    title: 'We Handle The Rest',
    description: 'Your dedicated RM negotiates the best deals, coordinates site visits, and manages all vendor communication.',
    icon: Headphones
  },
  {
    step: '03',
    title: 'You Celebrate',
    description: 'Walk into your perfectly booked venue with everything arranged. No stress, no surprises — just celebration.',
    icon: Heart
  }
];

// ============== ANIMATED COUNTER ==============

function AnimatedCounter({ value, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const numericValue = parseInt(value);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000;
          const step = numericValue / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= numericValue) {
              setCount(numericValue);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [numericValue]);

  const formatted = count.toLocaleString('en-IN');
  return <span ref={ref}>{formatted}{suffix}</span>;
}

// ============== MAIN COMPONENT ==============

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState('city'); // 'city' | 'nearby'
  const [selectedCity, setSelectedCity] = useState('');
  const [radius, setRadius] = useState('10');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoCoords, setGeoCoords] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    api.get('/venues/cities')
      .then(res => setCities(res.data || []))
      .catch(() => {});
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError('Location access denied. Please enable it or use City search.');
        setGeoLoading(false);
      }
    );
  };

  const handleExplore = () => {
    const params = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) {
      params.set('city', selectedCity);
    } else if (searchMode === 'nearby' && geoCoords) {
      params.set('lat', geoCoords.lat.toString());
      params.set('lng', geoCoords.lng.toString());
      params.set('radius', radius);
    } else if (searchMode === 'city' && !selectedCity) {
      // navigate without filter to show all
    }
    navigate(`/venues/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white text-[#1C1C1C] overflow-x-hidden">

      {/* ============== NAVIGATION ============== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
            : 'bg-transparent'
        }`}
        data-testid="main-header"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#1C1C1C] flex items-center justify-center">
                <span className="text-sm font-bold text-white tracking-tight">BMV</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-semibold tracking-tight">VenuLoQ</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors">How it Works</a>
              <a href="#cities" className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors">Cities</a>
              <a href="#advantages" className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors">Why BMV</a>
              <a href="/venues/search" className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors">Browse Venues</a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex px-4 py-2 text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
                data-testid="login-btn"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#D4B36A] text-[#0B0B0D] rounded-full hover:bg-[#B5912F] transition-all shadow-sm"
                data-testid="get-started-btn"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Get Expert Help</span>
                <span className="sm:hidden">Help</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="relative pt-28 pb-12 sm:pt-36 sm:pb-20" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FBF9F5] via-[#FDFCFA] to-white" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F0E5] border border-[#E8DCC8] mb-8">
                <Activity className="h-4 w-4 text-[#D4B36A]" />
                <span className="text-xs font-medium text-[#8B7332]">3,000+ Verified Venues Across India</span>
              </div>

              <h1
                className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.08] tracking-tight mb-5"
                data-testid="hero-headline"
              >
                India's Smart Venue
                <br />
                Booking Platform
              </h1>

              <p
                className="font-serif text-xl sm:text-2xl italic text-[#D4B36A] mb-6"
                data-testid="hero-tagline"
              >
                We Negotiate. You Celebrate.
              </p>

              <p className="text-base sm:text-lg text-[#6B7280] max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
                Compare verified venues, get transparent pricing, and let our expert
                Relationship Managers handle everything — so you can focus on what truly matters.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                {[
                  { icon: ShieldCheck, text: 'Verified Venues' },
                  { icon: Star, text: 'Transparent Pricing' },
                  { icon: Users, text: 'Dedicated RM' }
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F9F9F9] border border-[#EBEBEB]"
                  >
                    <item.icon className="h-4 w-4 text-[#D4B36A]" />
                    <span className="text-xs font-medium text-[#4B5563]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Hero Image */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/8">
                <img
                  src="https://images.unsplash.com/photo-1763553113332-800519753e40?w=800&q=80"
                  alt="Beautiful venue with floral arrangements"
                  className="w-full h-[380px] sm:h-[460px] object-cover"
                  data-testid="hero-image"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                    <Heart className="h-4 w-4 text-[#E8D5A3] fill-[#E8D5A3]" />
                    <span>Every celebration deserves the perfect venue</span>
                  </div>
                </div>
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-5 -left-4 bg-white rounded-2xl shadow-xl border border-[#F0F0F0] px-5 py-4 hidden lg:flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#F5F0E5] flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#D4B36A]" />
                </div>
                <div>
                  <div className="text-xl font-bold leading-tight">12,000+</div>
                  <div className="text-[11px] text-[#9CA3AF]">Events Completed</div>
                </div>
              </div>
            </div>
          </div>

          {/* ============== SEARCH DISCOVERY MODULE ============== */}
          <div className="mt-14 sm:mt-16 max-w-2xl mx-auto" data-testid="search-bar">
            {/* Mode Toggle */}
            <div className="flex items-center justify-center mb-5">
              <div className="flex bg-[#F3F3F1] rounded-full p-1 gap-1">
                <button
                  onClick={() => { setSearchMode('city'); setGeoError(''); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    searchMode === 'city'
                      ? 'bg-white shadow-sm text-[#1C1C1C]'
                      : 'text-[#6B7280] hover:text-[#1C1C1C]'
                  }`}
                  data-testid="mode-city"
                >
                  <Building2 className="h-4 w-4" />
                  Choose City
                </button>
                <button
                  onClick={() => { setSearchMode('nearby'); if (!geoCoords) handleGetLocation(); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    searchMode === 'nearby'
                      ? 'bg-white shadow-sm text-[#1C1C1C]'
                      : 'text-[#6B7280] hover:text-[#1C1C1C]'
                  }`}
                  data-testid="mode-nearby"
                >
                  <Navigation className="h-4 w-4" />
                  Near Me
                </button>
              </div>
            </div>

            {/* City Mode */}
            {searchMode === 'city' && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-lg shadow-black/[0.04] p-2 flex gap-2" data-testid="city-search-panel">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full pl-10 pr-3 py-3.5 rounded-xl bg-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 appearance-none cursor-pointer text-[#1C1C1C]"
                    data-testid="search-city"
                  >
                    <option value="">All Cities</option>
                    {cities.map((c) => (
                      <option key={c.city} value={c.city}>{c.city}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleExplore}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#D4B36A] text-[#0B0B0D] font-medium hover:bg-[#B5912F] transition-all group whitespace-nowrap"
                  data-testid="explore-venues-btn"
                >
                  Explore Venues
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}

            {/* Near Me Mode */}
            {searchMode === 'nearby' && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-lg shadow-black/[0.04] p-4 space-y-3" data-testid="nearby-search-panel">
                {geoLoading && (
                  <div className="flex items-center gap-2 text-sm text-[#6B7280] py-1">
                    <Loader2 className="h-4 w-4 animate-spin text-[#D4B36A]" />
                    Getting your location...
                  </div>
                )}
                {geoError && (
                  <p className="text-sm text-red-500">{geoError}</p>
                )}
                {geoCoords && !geoLoading && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <Navigation className="h-4 w-4" />
                    Location detected
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-[#6B7280] font-medium mb-1.5 block">Search Radius</label>
                    <select
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 appearance-none cursor-pointer"
                      data-testid="radius-select"
                    >
                      {RADIUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleExplore}
                      disabled={!geoCoords || geoLoading}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4B36A] text-[#0B0B0D] font-medium hover:bg-[#B5912F] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      data-testid="explore-nearby-btn"
                    >
                      Explore
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>

                {!geoCoords && !geoLoading && !geoError && (
                  <button
                    onClick={handleGetLocation}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#D4B36A]/40 text-sm text-[#D4B36A] hover:bg-[#D4B36A]/5 transition-colors"
                    data-testid="get-location-btn"
                  >
                    <Navigation className="h-4 w-4" />
                    Allow Location Access
                  </button>
                )}
              </div>
            )}

            <p className="text-center text-xs text-[#9CA3AF] mt-3">
              or{' '}
              <button
                onClick={() => navigate('/venues/search')}
                className="text-[#D4B36A] hover:underline"
                data-testid="browse-all-link"
              >
                browse all venues
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* ============== LIVE PLATFORM SNAPSHOT ============== */}
      <section className="py-16 sm:py-20 bg-[#FAFAF8] border-y border-[#F0F0F0]" data-testid="platform-snapshot">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Live Platform Data</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium">
              The Numbers Speak
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {LIVE_STATS.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 sm:p-8 rounded-2xl bg-white border border-[#F0F0F0] hover:shadow-lg hover:shadow-black/[0.04] transition-all duration-300"
              >
                <div className="inline-flex h-12 w-12 rounded-xl bg-[#F5F0E5] items-center justify-center mb-4">
                  <stat.icon className="h-5 w-5 text-[#D4B36A]" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-[#1C1C1C] mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-[#6B7280]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how-it-works" className="py-16 sm:py-24" data-testid="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-3">
              How VenuLoQ Works
            </h2>
            <p className="text-[#6B7280] text-base sm:text-lg max-w-xl mx-auto">
              Three simple steps to your perfect venue — and your perfect day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
            {HOW_IT_WORKS.map((item, index) => (
              <div key={item.step} className="relative text-center group">
                {/* Step number */}
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#1C1C1C] text-white text-lg font-bold mb-6 group-hover:bg-[#D4B36A] transition-colors duration-300">
                  {item.step}
                </div>

                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed max-w-xs mx-auto">{item.description}</p>

                {/* Connector */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-[#E5E7EB]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== EXPLORE BY CITY ============== */}
      <section id="cities" className="py-16 sm:py-24 bg-[#FAFAF8]" data-testid="explore-by-city">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-2">
                Explore by City
              </h2>
              <p className="text-[#6B7280]">Discover venues in India's top celebration cities</p>
            </div>
            <button
              onClick={() => navigate('/venues/search')}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#D4B36A] hover:text-[#B5912F] transition-colors group"
              data-testid="view-all-cities-btn"
            >
              View all cities
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {(cities.length > 0 ? cities : CITIES_DATA).slice(0, 6).map((cityItem, index) => {
              const name = cityItem.name || cityItem.city;
              const image = cityItem.image || cityItem.sample_image || `https://images.unsplash.com/photo-1706545604042-399792bd8a04?w=600&q=80`;
              const tagline = cityItem.tagline || `${cityItem.venue_count || ''} Venues`;
              const venueCount = cityItem.venues || (cityItem.venue_count ? `${cityItem.venue_count}` : '');
              return (
                <div
                  key={name}
                  className={`group relative overflow-hidden rounded-2xl cursor-pointer ${
                    index === 0 ? 'col-span-2 lg:col-span-1 lg:row-span-2 h-[280px] lg:h-full' : 'h-[200px] lg:h-[220px]'
                  }`}
                  onClick={() => navigate(`/venues/search?city=${name}`)}
                  data-testid={`city-card-${name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <img
                    src={image}
                    alt={name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-white text-lg sm:text-xl font-semibold mb-0.5">{name}</h3>
                    <p className="text-white/60 text-xs sm:text-sm mb-2">{tagline}</p>
                    {venueCount && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs text-white/90">
                        <Building2 className="h-3 w-3" />
                        {venueCount} Venues
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== PLATFORM ADVANTAGE ============== */}
      <section id="advantages" className="py-16 sm:py-24" data-testid="platform-advantage">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-3">
              The VenuLoQ Advantage
            </h2>
            <p className="text-[#6B7280] text-base sm:text-lg max-w-2xl mx-auto">
              We're not just a listing site. We're your event planning partner.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLATFORM_ADVANTAGES.map((advantage) => (
              <div
                key={advantage.title}
                className="bg-[#FAFAF8] rounded-2xl border border-[#F0F0F0] p-6 hover:shadow-lg hover:shadow-black/[0.04] hover:border-[#D4B36A]/20 transition-all duration-300 group"
                data-testid={`advantage-card`}
              >
                <div className="h-12 w-12 rounded-xl bg-[#F5F0E5] flex items-center justify-center mb-5 group-hover:bg-[#D4B36A]/15 transition-colors">
                  <advantage.icon className="h-5 w-5 text-[#D4B36A]" />
                </div>
                <h3 className="text-base font-semibold mb-2">{advantage.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{advantage.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <p className="font-serif text-lg sm:text-xl italic text-[#8B7332]">
              "Because your celebration shouldn't come with compromise."
            </p>
          </div>
        </div>
      </section>

      {/* ============== FOR VENUES & EVENT MANAGERS ============== */}
      <section className="py-16 sm:py-24 bg-[#FAFAF8]" data-testid="for-venues-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-3">
              For Venues & Event Managers
            </h2>
            <p className="text-[#6B7280]">Grow with India's fastest-growing venue marketplace</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* For Venues */}
            <div className="relative rounded-3xl overflow-hidden bg-[#1C1C1C] p-8 sm:p-10 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4B36A]/8 rounded-full blur-[100px]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
                  <Building2 className="h-4 w-4 text-[#D4B36A]" />
                  <span className="text-xs text-white/70">For Venue Partners</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium mb-4">List Your Venue</h3>
                <p className="text-white/60 mb-6 leading-relaxed text-sm sm:text-base">
                  Join India's fastest-growing venue marketplace. Get verified bookings,
                  professional photography, and a dedicated account manager.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Zero listing fees', 'Verified booking leads', 'Professional venue photography', 'Dedicated account manager'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-[#D4B36A] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4B36A] text-[#0B0B0D] font-medium hover:bg-[#B5912F] transition-all group"
                  data-testid="list-venue-btn"
                >
                  Partner With Us
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* For Event Managers */}
            <div className="relative rounded-3xl overflow-hidden bg-[#F5F0E5] p-8 sm:p-10">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D4B36A]/8 rounded-full blur-[100px]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4B36A]/10 border border-[#D4B36A]/20 mb-6">
                  <Headphones className="h-4 w-4 text-[#D4B36A]" />
                  <span className="text-xs text-[#8B7332]">For Event Managers</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium mb-4">Grow Your Business</h3>
                <p className="text-[#6B7280] mb-6 leading-relaxed text-sm sm:text-base">
                  Access our venue network, manage clients better, and scale your event
                  management business with VenuLoQ's platform tools.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Access to 3,000+ venues', 'Client management dashboard', 'Bulk booking discounts', 'Priority support channel'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-[#4B5563]">
                      <CheckCircle2 className="h-4 w-4 text-[#D4B36A] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1C1C1C] text-white font-medium hover:bg-[#333] transition-all group"
                  data-testid="event-manager-btn"
                >
                  Join as Event Manager
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="py-20 sm:py-28 bg-[#1C1C1C] text-white" data-testid="final-cta">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium mb-4 leading-tight">
            Your Celebration
            <br />
            Starts Here
          </h2>
          <p className="font-serif text-xl sm:text-2xl italic text-[#D4B36A] mb-4">
            We Negotiate. You Celebrate.
          </p>
          <p className="text-white/50 text-base sm:text-lg mb-10 max-w-xl mx-auto">
            Tell us about your event, and our expert team will curate the best venue options — within your budget, in your city.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/venues/search')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#D4B36A] text-[#0B0B0D] font-semibold hover:bg-[#B5912F] transition-all group"
              data-testid="final-cta-search"
            >
              Start Searching Venues
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => window.open('https://wa.me/919876543210?text=Hi%2C%20I%20would%20like%20to%20speak%20with%20a%20venue%20expert.', '_blank')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white/80 hover:bg-white/5 hover:text-white transition-all"
              data-testid="final-cta-expert"
            >
              <Phone className="h-4 w-4" />
              Talk to an Expert
            </button>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="py-14 bg-[#151515] text-white" data-testid="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                  <span className="text-sm font-bold text-[#1C1C1C]">BMV</span>
                </div>
                <div className="text-lg font-semibold">VenuLoQ</div>
              </div>
              <p className="text-sm text-white/40 mb-3 max-w-xs">
                India's smart venue booking platform. Verified venues, transparent pricing, expert support.
              </p>
              <p className="font-serif text-sm italic text-[#D4B36A]">
                We Negotiate. You Celebrate.
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Platform</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Browse Venues', href: '/venues/search' },
                  { label: 'How it Works', href: '#how-it-works' },
                  { label: 'For Venues', href: '#' },
                  { label: 'Contact Us', href: 'https://wa.me/919876543210?text=Hi%2C%20I%20have%20a%20question%20about%20VenuLoQ.' }
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-white/35 hover:text-white/70 transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Venue Types */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Venue Types</h4>
              <ul className="space-y-3">
                {['Wedding Venues', 'Corporate Venues', 'Party Venues', 'Banquet Halls'].map((link) => (
                  <li key={link}>
                    <a href="/venues/search" className="text-sm text-white/35 hover:text-white/70 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top Cities */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Top Cities</h4>
              <ul className="space-y-3">
                {['Delhi NCR', 'Mumbai', 'Bangalore', 'Jaipur', 'Goa', 'Udaipur'].map((c) => (
                  <li key={c}>
                    <a href={`/venues/search?city=${c}`} className="text-sm text-white/35 hover:text-white/70 transition-colors">{c}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/25">
              &copy; {new Date().getFullYear()} VenuLoQ. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
