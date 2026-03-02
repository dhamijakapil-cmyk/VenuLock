import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight, 
  CheckCircle2, RefreshCw, GitCompare, ShieldCheck, Lock,
  Star, Globe, Phone, ChevronRight, Building2, Navigation, Loader2, Handshake,
  Sparkles, Crown, Shield, Clock, Menu, X, ChevronDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FALLBACK_CITIES = [
  'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
];

const RADIUS_OPTIONS = [
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '20', label: '20 km' },
  { value: '50', label: '50 km' },
];

const STEPS = [
  { num: '01', title: 'Tell us your city', desc: 'Select your city and event type. We match you with the best-fit verified venues instantly.' },
  { num: '02', title: 'Choose your Relationship Manager', desc: 'Browse RM profiles and pick the expert who fits your event style and language preference.' },
  { num: '03', title: 'Compare structured offers', desc: 'Receive side-by-side venue comparisons with transparent pricing, amenities, and date availability.' },
  { num: '04', title: 'Secure booking with escrow', desc: 'Lock in your venue with a secure platform-managed payment. Contracts and confirmations — all digital.' }
];

const CAPABILITIES = [
  { icon: RefreshCw, title: 'Real-Time Availability', desc: 'Venue calendars sync live. Check open dates without a single phone call.' },
  { icon: GitCompare, title: 'Side-by-Side Comparison Sheets', desc: 'Structured comparison across pricing, capacity, amenities, and reviews in one view.' },
  { icon: ShieldCheck, title: 'Multi-point Venue Verification', desc: 'Every venue audited on-ground. Photos, capacity, and pricing verified for accuracy.' },
  { icon: Lock, title: 'Secure Escrow Booking', desc: 'Platform-managed payments protect both parties. Funds released only on confirmation.' }
];

const RM_PROFILES = [
  {
    name: 'Priya Sharma',
    city: 'Delhi NCR',
    experience: '6 years',
    languages: 'Hindi, English, Punjabi',
    rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1767175473698-859bc73e8e64?w=200&h=200&fit=crop&crop=face&q=80',
    responseTime: 'Typically responds in 10 minutes'
  },
  {
    name: 'Arjun Mehta',
    city: 'Mumbai',
    experience: '4 years',
    languages: 'Hindi, English, Marathi',
    rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1758523671918-cfe797ba54cb?w=200&h=200&fit=crop&crop=face&q=80',
    responseTime: 'Typically responds in 10 minutes'
  },
  {
    name: 'Kavita Reddy',
    city: 'Bengaluru',
    experience: '5 years',
    languages: 'English, Kannada, Telugu',
    rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1733231291506-34503f83f503?w=200&h=200&fit=crop&crop=face&q=80',
    responseTime: 'Typically responds in 10 minutes'
  }
];

const METRICS = [
  { value: '12,000+', label: 'Events Managed' },
  { value: '500+', label: 'Verified Venues' },
  { value: '4.8', label: 'Average Rating' },
  { value: '98%', label: 'Client Satisfaction' }
];

// ── SVG Logo ──
function Logo({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 180 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4C8 4 14 2 18 8C22 14 16 20 16 20L18 28L10 22C10 22 2 18 4 10C5.5 4 8 4 8 4Z" fill="#C7A14A" />
      <circle cx="12" cy="12" r="3" fill="#0A1A2F" />
      <text x="30" y="24" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16" fill="#0A1A2F">BookMyVenue</text>
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState('city'); // 'city' | 'nearby'
  const [selectedCity, setSelectedCity] = useState('');
  const [radius, setRadius] = useState('10');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoCoords, setGeoCoords] = useState(null);
  const [cityNames, setCityNames] = useState(FALLBACK_CITIES);
  const [citiesData, setCitiesData] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dropdownRefDesktop = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          dropdownRefDesktop.current && !dropdownRefDesktop.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/venues/cities`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCitiesData(data);
          const DELHI_SUBS = ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'];
          const names = data.flatMap(c =>
            c.city === 'Delhi' ? DELHI_SUBS : [c.city]
          );
          setCityNames(names);
        }
      })
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

  const DELHI_SUBS = ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'];

  const handleExplore = () => {
    const params = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) {
      const searchCity = DELHI_SUBS.includes(selectedCity) ? 'Delhi' : selectedCity;
      params.set('city', searchCity);
    } else if (searchMode === 'nearby' && geoCoords) {
      params.set('lat', geoCoords.lat.toString());
      params.set('lng', geoCoords.lng.toString());
      params.set('radius', radius);
    }
    navigate(`/venues/search?${params.toString()}`);
  };

  const selectCity = (city) => {
    setSelectedCity(city);
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* ══════════════════════════════════════════════════════════════════════════
          CORPORATE PREMIUM MOBILE - Light base with premium accents
      ══════════════════════════════════════════════════════════════════════════ */}
      
      {/* Mobile Header - Clean white */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-white border-b border-slate-100" data-testid="mobile-header">
        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2" data-testid="logo-btn">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0A1A2F] to-[#1a3a5c] flex items-center justify-center">
              <MapPin className="w-4 h-4 text-[#C9A227]" />
            </div>
            <span className="text-[#0A1A2F] font-bold text-lg">BookMyVenue</span>
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#0A1A2F]" /> : <Menu className="w-5 h-5 text-[#0A1A2F]" />}
          </button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-lg p-5 space-y-3">
            <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="block w-full text-left text-[#64748B] py-2 font-medium">Sign In</button>
            <button onClick={() => { navigate('/venues/search'); setMobileMenuOpen(false); }} className="block w-full text-left text-[#64748B] py-2 font-medium">Browse Venues</button>
            <button onClick={() => { navigate('/list-your-venue'); setMobileMenuOpen(false); }} className="block w-full text-left text-[#64748B] py-2 font-medium">List Your Venue</button>
            <button 
              onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
              className="w-full py-3 rounded-xl bg-[#0A1A2F] text-white font-semibold text-sm"
            >
              Start Booking
            </button>
          </div>
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block sticky top-0 z-[9999] bg-white border-b" style={{ borderColor: '#EAEAEA' }} data-testid="main-header">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex h-14 sm:h-16 items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="desktop-logo-btn">
            <Logo className="h-[36px] sm:h-[42px] w-auto" />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium hover:underline underline-offset-4"
              style={{ color: '#0A1A2F' }}
              data-testid="login-btn"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#C7A14A' }}
              data-testid="get-started-btn"
            >
              Start Booking
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          HERO SECTION - Dark premium banner on light page
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative lg:pt-24 lg:pb-16" data-testid="hero-section">
        
        {/* Mobile Hero - Dark banner at top, then light */}
        <div className="lg:hidden pt-16">
          {/* Dark Premium Banner */}
          <div className="bg-[#0A1A2F] px-6 py-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 -left-20 w-64 h-64 bg-[#C7A14A] rounded-full blur-3xl" />
              <div className="absolute bottom-0 -right-20 w-80 h-80 bg-[#C7A14A] rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-4">
                <Crown className="w-3.5 h-3.5 text-[#C7A14A]" />
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Premium Venue Concierge</span>
              </div>
              <h1 className="font-serif text-[2rem] font-bold text-white leading-[1.15] mb-3">
                We Negotiate.
                <br />
                <span className="text-[#C7A14A]">You Celebrate.</span>
              </h1>
              <p className="text-white/60 text-sm max-w-[260px] mx-auto">
                Dedicated managers. Verified venues. Seamless bookings.
              </p>
            </div>
          </div>

          {/* Light Search Section */}
          <div className="bg-[#FAFAF8] px-5 py-6 -mt-1">
            {/* Search Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              {/* Mode Toggle */}
              <div className="flex p-1 rounded-xl bg-slate-100 mb-5">
                <button
                  onClick={() => { setSearchMode('city'); setGeoError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    searchMode === 'city' 
                      ? 'bg-white text-[#0A1A2F] shadow-sm' 
                      : 'text-[#64748B]'
                  }`}
                  data-testid="mode-city"
                >
                  <Building2 className="w-4 h-4" />
                  City
                </button>
                <button
                  onClick={() => { setSearchMode('nearby'); if (!geoCoords) handleGetLocation(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    searchMode === 'nearby' 
                      ? 'bg-white text-[#0A1A2F] shadow-sm' 
                      : 'text-[#64748B]'
                  }`}
                  data-testid="mode-nearby"
                >
                  <Navigation className="w-4 h-4" />
                  Near Me
                </button>
              </div>

              {/* City Mode */}
              {searchMode === 'city' && (
                <div className="space-y-4" data-testid="search-bar">
                  {/* City Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        dropdownOpen ? 'border-[#0A1A2F] bg-white' : 'border-slate-200 bg-white'
                      }`}
                      data-testid="city-dropdown-trigger"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                        <span className={`text-sm ${selectedCity ? 'text-[#374151] font-medium' : 'text-[#94A3B8]'}`}>
                          {selectedCity || 'Select City'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto" data-testid="city-dropdown-list">
                        <button
                          onClick={() => selectCity('')}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            selectedCity === '' ? 'bg-[#0A1A2F] text-white' : 'text-[#374151] hover:bg-slate-50'
                          }`}
                          data-testid="city-option-all"
                        >
                          All Cities
                        </button>
                        {cityNames.map(c => (
                          <button
                            key={c}
                            onClick={() => selectCity(c)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              selectedCity === c ? 'bg-[#C7A14A] text-white' : 'text-[#374151] hover:bg-slate-50'
                            }`}
                            data-testid={`city-option-${c.toLowerCase().replace(/\s/g, '-')}`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                              {c}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Explore CTA */}
                  <button
                    onClick={handleExplore}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-white bg-[#C7A14A] shadow-lg shadow-[#C7A14A]/20 transition-all active:scale-[0.98]"
                    data-testid="explore-venues-btn"
                  >
                    Explore Venues
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Near Me Mode */}
              {searchMode === 'nearby' && (
                <div className="space-y-4" data-testid="nearby-panel">
                  {geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-[#64748B]">
                      <Loader2 className="w-5 h-5 animate-spin text-[#C7A14A]" />
                      <span className="text-sm">Finding your location...</span>
                    </div>
                  )}
                  {geoError && <p className="text-sm text-red-500 text-center py-2">{geoError}</p>}
                  {geoCoords && !geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 bg-emerald-50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-medium">Location detected</span>
                    </div>
                  )}
                  {!geoCoords && !geoLoading && !geoError && (
                    <button
                      onClick={handleGetLocation}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#C7A14A] text-[#C7A14A] text-sm font-medium"
                      data-testid="get-location-btn"
                    >
                      <Navigation className="w-4 h-4" />
                      Enable Location Access
                    </button>
                  )}
                  
                  {/* Radius */}
                  <div>
                    <label className="text-xs uppercase tracking-wider text-[#64748B] font-semibold mb-2 block">Search Radius</label>
                    <div className="flex gap-2">
                      {RADIUS_OPTIONS.slice(0, 4).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setRadius(opt.value)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                            radius === opt.value 
                              ? 'bg-[#0A1A2F] text-white border-[#0A1A2F]' 
                              : 'bg-white text-[#64748B] border-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleExplore}
                    disabled={!geoCoords || geoLoading}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-white bg-[#C7A14A] shadow-lg shadow-[#C7A14A]/20 disabled:opacity-50 disabled:shadow-none"
                    data-testid="explore-nearby-btn"
                  >
                    Explore Nearby
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Trust Badges - Light style */}
            <div className="mt-6 grid grid-cols-2 gap-3" data-testid="trust-strip">
              {[
                { icon: Shield, label: 'Verified Venues', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: Star, label: 'Top Rated RMs', color: 'text-[#C7A14A]', bg: 'bg-amber-50' },
                { icon: Lock, label: 'Secure Booking', color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: Clock, label: 'Quick Response', color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-3 border border-slate-100">
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-[#374151]">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Browse Link */}
            <p className="text-center mt-5 text-sm text-[#64748B]">
              or{' '}
              <button
                onClick={() => navigate('/venues/search')}
                className="text-[#C7A14A] font-semibold underline underline-offset-2"
                data-testid="browse-all-link"
              >
                browse all 500+ venues
              </button>
            </p>
          </div>
        </div>

        {/* Desktop Hero Content - Corporate Premium with Dark Banner */}
        <div className="hidden lg:block">
          {/* Dark Premium Banner */}
          <div className="bg-[#0A1A2F] py-16 -mt-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C7A14A] rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C7A14A] rounded-full blur-3xl" />
            </div>
            <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-6">
                <Crown className="w-4 h-4 text-[#C7A14A]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Premium Venue Concierge</span>
              </div>
              <h1 className="text-4xl lg:text-[52px] font-bold leading-[1.1] tracking-tight font-serif text-white mb-4" data-testid="hero-headline">
                We Negotiate.{' '}
                <span className="text-[#C7A14A]">You Celebrate.</span>
              </h1>
              <p className="text-lg leading-relaxed max-w-xl mx-auto text-white/60">
                Dedicated Relationship Managers. Verified Venues.
                <br />
                Structured Negotiation from first call to confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          DESKTOP SEARCH MODULE (Hidden on mobile - moved to hero)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="hidden lg:block pb-14 sm:pb-20 bg-white" data-testid="search-section">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          {/* Mode Toggle */}
          <div className="flex items-center justify-center mb-5">
            <div className="flex p-1 rounded-full gap-1" style={{ backgroundColor: '#F3F3F1' }}>
              <button
                onClick={() => { setSearchMode('city'); setGeoError(''); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                style={searchMode === 'city' ? { backgroundColor: '#fff', color: '#0A1A2F', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6B7280' }}
                data-testid="desktop-mode-city"
              >
                <Building2 className="h-4 w-4" />
                Choose City
              </button>
              <button
                onClick={() => { setSearchMode('nearby'); if (!geoCoords) handleGetLocation(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                style={searchMode === 'nearby' ? { backgroundColor: '#fff', color: '#0A1A2F', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6B7280' }}
                data-testid="desktop-mode-nearby"
              >
                <Navigation className="h-4 w-4" />
                Near Me
              </button>
            </div>
          </div>

          {/* City Mode */}
          {searchMode === 'city' && (
            <div className="space-y-3" data-testid="desktop-search-bar">
              {/* City Dropdown */}
              <div className="relative max-w-md mx-auto" ref={dropdownRefDesktop}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    dropdownOpen ? 'border-[#0A1A2F] bg-white shadow-md' : 'border-slate-200 bg-white'
                  }`}
                  data-testid="desktop-city-dropdown-trigger"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                    <span className={`text-sm ${selectedCity ? 'text-[#374151] font-medium' : 'text-[#94A3B8]'}`}>
                      {selectedCity || 'Select City'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto" data-testid="desktop-city-dropdown-list">
                    <button
                      onClick={() => selectCity('')}
                      className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
                        selectedCity === '' ? 'bg-[#0A1A2F] text-white' : 'text-[#374151] hover:bg-slate-50'
                      }`}
                      data-testid="desktop-city-option-all"
                    >
                      All Cities
                    </button>
                    {cityNames.map(c => (
                      <button
                        key={c}
                        onClick={() => selectCity(c)}
                        className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
                          selectedCity === c ? 'bg-[#C7A14A] text-white' : 'text-[#374151] hover:bg-slate-50'
                        }`}
                        data-testid={`desktop-city-option-${c.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                          {c}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Explore CTA */}
              <button
                onClick={handleExplore}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold text-white transition-all group"
                style={{ backgroundColor: '#C7A14A' }}
                data-testid="desktop-explore-venues-btn"
              >
                Explore Venues
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* Near Me Mode - Desktop */}
          {searchMode === 'nearby' && (
            <div className="rounded-[10px] border bg-white p-4 space-y-3" style={{ borderColor: '#0A1A2F' }} data-testid="desktop-nearby-panel">
              {geoLoading && (
                <div className="flex items-center gap-2 text-sm py-1" style={{ color: '#6B7280' }}>
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#C7A14A' }} />
                  Getting your location...
                </div>
              )}
              {geoError && <p className="text-sm text-red-500">{geoError}</p>}
              {geoCoords && !geoLoading && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Navigation className="h-4 w-4" />
                  Location detected
                </div>
              )}
              {!geoCoords && !geoLoading && !geoError && (
                <button
                  onClick={handleGetLocation}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed text-sm transition-colors"
                  style={{ borderColor: '#C7A14A', color: '#C7A14A' }}
                  data-testid="desktop-get-location-btn"
                >
                  <Navigation className="h-4 w-4" />
                  Allow Location Access
                </button>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <label className="text-[10px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: '#6B7280' }}>Search Radius</label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-white focus:outline-none appearance-none cursor-pointer border"
                    style={{ borderColor: '#EAEAEA' }}
                    data-testid="desktop-radius-select"
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#C7A14A' }}
                    data-testid="desktop-explore-nearby-btn"
                  >
                    Explore <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Trust indicators - Desktop */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="desktop-trust-strip">
            {[
              'Negotiation Included',
              'Verified Venues Only',
              'Real-Time Availability',
              'Secure Transactions'
            ].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C7A14A' }} />
                <span className="text-[12px]" style={{ color: '#6B7280' }}>{item}</span>
              </div>
            ))}
          </div>

          <p className="text-center mt-4 text-[12px]" style={{ color: '#9CA3AF' }}>
            or{' '}
            <button
              onClick={() => navigate('/venues/search')}
              className="underline hover:no-underline"
              style={{ color: '#C7A14A' }}
              data-testid="desktop-browse-all-link"
            >
              browse all venues
            </button>
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#F7F9FC' }} data-testid="how-it-works">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold font-sans mb-12">How It Works</h2>

          <div className="space-y-10">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold mb-4"
                  style={{ borderColor: '#0A1A2F', color: '#0A1A2F' }}
                >
                  {s.num}
                </div>
                <h3 className="text-sm sm:text-base font-semibold mb-1 font-sans">{s.title}</h3>
                <p className="text-[13px] max-w-sm leading-relaxed" style={{ color: '#6B7280' }}>{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="w-px h-8 mt-4" style={{ backgroundColor: '#EAEAEA' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RM SELECTION PREVIEW ── */}
      <section className="py-16 sm:py-24" data-testid="rm-section">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-bold font-sans mb-2">Your Booking, Personally Managed</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>Select your Relationship Manager after verification.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RM_PROFILES.map((rm) => (
              <div
                key={rm.name}
                className="bg-white rounded-xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
                style={{ borderColor: '#EAEAEA' }}
                data-testid="rm-card"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={rm.photo}
                    alt={rm.name}
                    className="w-14 h-14 rounded-full object-cover border-2"
                    style={{ borderColor: '#EAEAEA' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold font-sans">{rm.name}</h3>
                    <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{rm.city}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-[#C7A14A]" style={{ color: '#C7A14A' }} />
                      <span className="text-[12px] font-medium">{rm.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-emerald-600 font-medium">Available</span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[12px]">
                    <span style={{ color: '#6B7280' }}>Experience</span>
                    <span className="font-medium">{rm.experience}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span style={{ color: '#6B7280' }}>Languages</span>
                    <span className="font-medium">{rm.languages}</span>
                  </div>
                </div>

                <p className="text-[11px] mb-4" style={{ color: '#6B7280' }}>{rm.responseTime}</p>

                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#C7A14A' }}
                  data-testid={`select-rm-${rm.name.split(' ')[0].toLowerCase()}`}
                >
                  Select {rm.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM ADVANTAGE ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#F7F9FC' }} data-testid="platform-advantage">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <h2 className="text-xl sm:text-2xl font-bold font-sans mb-10 text-center">Platform Capabilities</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {CAPABILITIES.map(cap => (
              <div key={cap.title} className="bg-white rounded-xl border p-5" style={{ borderColor: '#EAEAEA' }} data-testid="capability-card">
                <cap.icon className="h-5 w-5 mb-3" style={{ color: '#0A1A2F' }} />
                <h3 className="text-sm font-bold font-sans mb-1">{cap.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST METRICS ── */}
      <section className="py-16 sm:py-20" data-testid="trust-metrics">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {METRICS.map(m => (
              <div key={m.label}>
                <div className="text-3xl sm:text-4xl font-bold font-sans" style={{ color: '#0A1A2F' }}>{m.value}</div>
                <div className="text-[13px] mt-1" style={{ color: '#6B7280' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITY COVERAGE ── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: '#EAEAEA' }} data-testid="city-coverage">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-xl sm:text-2xl font-bold font-sans">Browse by City</h2>
            <button
              onClick={() => navigate('/venues/search')}
              className="text-[13px] flex items-center gap-1 group"
              style={{ color: '#6B7280' }}
              data-testid="view-all-cities-btn"
            >
              All cities <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(citiesData.length > 0
              ? citiesData.map(c => ({ name: c.city, venues: c.venue_count }))
              : FALLBACK_CITIES.slice(0, 8).map(c => ({ name: c, venues: '-' }))
            ).map(c => (
              <button
                key={c.name}
                onClick={() => navigate(`/venues/search?city=${c.name}`)}
                className="text-left border rounded-lg px-4 py-3.5 hover:border-gray-300 transition-all group bg-white"
                style={{ borderColor: '#EAEAEA' }}
                data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="text-sm font-semibold font-sans">{c.name}</div>
                <div className="text-[13px] mt-0.5" style={{ color: '#6B7280' }}>{c.venues} venues</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORK WITH US ── */}
      <section className="py-16 sm:py-24 border-t" style={{ borderColor: '#EAEAEA' }} data-testid="work-with-us">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold font-sans mb-2">Grow Your Business With Us</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>Join the BookMyVenue ecosystem as a venue partner or event management company.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Venue Card */}
            <div
              className="bg-[#0A1A2F] rounded-2xl p-8 text-white"
              data-testid="list-venue-cta"
            >
              <div className="w-12 h-12 rounded-xl bg-[#C7A14A]/20 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-[#C7A14A]" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2">List Your Venue</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Get qualified leads from thousands of event planners. We handle discovery, negotiation,
                and follow-up — you focus on delivering great events.
              </p>
              <ul className="space-y-2 mb-8">
                {['Free to list', 'Dedicated RM manages your bookings', 'Commission only on confirmed bookings'].map(p => (
                  <li key={p} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C7A14A] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/list-your-venue')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-[#C7A14A] text-white hover:bg-[#B5912F] transition-colors"
                data-testid="list-venue-btn"
              >
                Apply to List <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Partner Card */}
            <div
              className="bg-white border-2 border-[#0A1A2F] rounded-2xl p-8"
              data-testid="partner-cta"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0A1A2F]/10 flex items-center justify-center mb-5">
                <Handshake className="h-6 w-6 text-[#0A1A2F]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0A1A2F] mb-2">Partner With Us</h3>
              <p className="text-[#64748B] text-sm mb-6 leading-relaxed">
                Are you an event management company? Join our network and unlock access to premium venues,
                co-marketing, and a shared customer pipeline.
              </p>
              <ul className="space-y-2 mb-8">
                {['Access 500+ curated venues', 'Co-branded marketing opportunities', 'Dedicated account management'].map(p => (
                  <li key={p} className="flex items-center gap-2 text-sm text-[#374151]">
                    <CheckCircle2 className="h-4 w-4 text-[#C7A14A] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/partner')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-[#0A1A2F] text-white hover:bg-[#153055] transition-colors"
                data-testid="partner-btn"
              >
                Become a Partner <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#0A1A2F' }} data-testid="final-cta">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-sans text-white mb-8">Start Your Booking Today</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#C7A14A' }}
              data-testid="final-cta-booking"
            >
              Start Booking <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => window.open('https://wa.me/919876543210?text=Hi%2C%20I%20would%20like%20to%20speak%20with%20a%20venue%20expert.', '_blank')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border text-white/80 hover:text-white hover:border-white/40 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              data-testid="final-cta-expert"
            >
              <Phone className="h-4 w-4" /> Talk to an Expert
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t py-10" style={{ borderColor: '#EAEAEA' }} data-testid="main-footer">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo className="h-[28px] w-auto mb-3" />
              <p className="text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>Managed venue booking platform.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#6B7280' }}>Platform</h4>
              <ul className="space-y-1.5">
                {[
                  { l: 'Browse Venues', h: '/venues/search' },
                  { l: 'How It Works', h: '#how-it-works' },
                  { l: 'List Your Venue', h: '/list-your-venue' },
                  { l: 'Partner With Us', h: '/partner' },
                ].map(x => (
                  <li key={x.l}><a href={x.h} className="text-[13px] hover:underline" style={{ color: '#6B7280' }}>{x.l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#6B7280' }}>Company</h4>
              <ul className="space-y-1.5">
                {['Contact', 'Support', 'Privacy', 'Terms'].map(l => (
                  <li key={l}><a href="#" className="text-[13px] hover:underline" style={{ color: '#6B7280' }}>{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#6B7280' }}>Cities</h4>
              <ul className="space-y-1.5">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad'].map(c => (
                  <li key={c}><a href={`/venues/search?city=${c}`} className="text-[13px] hover:underline" style={{ color: '#6B7280' }}>{c}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: '#EAEAEA' }}>
            <p className="text-[12px]" style={{ color: '#6B7280' }}>&copy; {new Date().getFullYear()} BookMyVenue. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-[12px] hover:underline" style={{ color: '#6B7280' }}>Privacy Policy</a>
              <a href="#" className="text-[12px] hover:underline" style={{ color: '#6B7280' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
