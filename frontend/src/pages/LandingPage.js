import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight, 
  CheckCircle2, RefreshCw, GitCompare, ShieldCheck, Lock,
  Star, Globe, Phone, ChevronRight, Building2, Navigation, Loader2, Handshake,
  Sparkles, Crown, Shield, Clock, Menu, X, ChevronDown
} from 'lucide-react';

import { ConnectButton } from '../components/ConnectButton';

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

const RANK_STYLES = [
  { border: 'border-[#C8A960]', ring: 'ring-2 ring-[#C8A960]/20', badgeBg: 'bg-[#C8A960]', label: '1st', numColor: 'text-[#C8A960]' },
  { border: 'border-slate-200', ring: '', badgeBg: 'bg-[#64748B]', label: '2nd', numColor: 'text-[#111111]' },
  { border: 'border-slate-200', ring: '', badgeBg: 'bg-[#92603F]', label: '3rd', numColor: 'text-[#111111]' },
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
      <path d="M8 4C8 4 14 2 18 8C22 14 16 20 16 20L18 28L10 22C10 22 2 18 4 10C5.5 4 8 4 8 4Z" fill="#C8A960" />
      <circle cx="12" cy="12" r="3" fill="#111111" />
      <text x="30" y="24" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16" fill="#111111">VenuLock</text>
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
  const [topPerformers, setTopPerformers] = useState([]);
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

  useEffect(() => {
    fetch(`${API_URL}/api/rms/top-performers`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTopPerformers(data);
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
      
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-[#111] border-b border-white/[0.06]" data-testid="mobile-header">
        <div className="flex items-center justify-between px-6 h-[52px]">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5" data-testid="logo-btn">
            <span className="text-[13px] font-bold tracking-[0.2em] text-white/90" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
            <span className="text-[13px] font-bold tracking-[0.2em] text-[#C4A455]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOCK</span>
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-8 h-8 flex items-center justify-center">
            {mobileMenuOpen ? <X className="w-[17px] h-[17px] text-white/50" /> : <Menu className="w-[17px] h-[17px] text-white/50" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#111] border-t border-white/[0.06] px-6 py-5 space-y-0.5">
            {[
              { label: 'Sign In', to: '/login' },
              { label: 'Browse Venues', to: '/venues/search' },
              { label: 'List Your Venue', to: '/list-your-venue' },
            ].map(item => (
              <button key={item.label} onClick={() => { navigate(item.to); setMobileMenuOpen(false); }} className="block w-full text-left text-white/40 hover:text-white py-3 text-[13px] font-medium tracking-wide transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.label}</button>
            ))}
            <div className="pt-4 border-t border-white/[0.06]">
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full py-3 text-[12px] font-semibold bg-[#C4A455] text-[#111] tracking-[0.08em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block sticky top-0 z-[9999] bg-[#111] border-b border-white/[0.06]" data-testid="main-header">
        <div className="max-w-[1100px] mx-auto px-8 flex h-[56px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5" data-testid="desktop-logo-btn">
            <span className="text-[15px] font-bold tracking-[0.2em] text-white/90" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
            <span className="text-[15px] font-bold tracking-[0.2em] text-[#C4A455]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOCK</span>
          </button>
          <div className="flex items-center gap-8">
            <button onClick={() => navigate('/venues/search')} className="text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>Browse Venues</button>
            <button onClick={() => navigate('/login')} className="text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide" data-testid="login-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
            <button onClick={() => navigate('/register')} className="text-[12px] font-semibold text-[#111] px-6 py-2 bg-[#C4A455] hover:bg-[#B89A4A] transition-colors tracking-[0.08em] uppercase" data-testid="get-started-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>Get Started</button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          HERO SECTION - Dark premium banner on light page
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative lg:pt-24 lg:pb-16" data-testid="hero-section">
        
        {/* Mobile Hero - Dark banner at top, then light */}
        <div className="lg:hidden pt-[52px]">
          {/* Hero */}
          <div className="bg-[#111] px-6 pt-14 pb-16">
            <div className="text-center">
              <p className="text-[10px] font-semibold text-[#C4A455]/70 uppercase tracking-[0.25em] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>India's Trusted Venue Booking Platform</p>

              <h1 className="text-[2.5rem] font-medium text-white leading-[1.08] mb-6" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
                We Talk.
                <br />
                <span className="text-[#C4A455]">You Lock.</span>
              </h1>
              <p className="text-white/45 text-[14px] leading-[1.7] max-w-[300px] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Tell us what you need. We shortlist, compare, and help you lock the right venue.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-[#161616] px-5 pb-10 pt-0">
            <div className="bg-[#1C1C1C] border border-white/[0.07] p-5 -mt-4">
              {/* Toggle */}
              <div className="grid grid-cols-2 gap-0 border border-white/[0.07] mb-5">
                <button
                  onClick={() => { setSearchMode('city'); setGeoError(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold tracking-[0.05em] uppercase transition-all ${
                    searchMode === 'city' ? 'bg-[#C4A455] text-[#111]' : 'text-white/35 hover:text-white/50'
                  }`}
                  data-testid="mode-city"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  City
                </button>
                <button
                  onClick={() => { setSearchMode('nearby'); if (!geoCoords) handleGetLocation(); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold tracking-[0.05em] uppercase transition-all ${
                    searchMode === 'nearby' ? 'bg-[#C4A455] text-[#111]' : 'text-white/35 hover:text-white/50'
                  }`}
                  data-testid="mode-nearby"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Near Me
                </button>
              </div>

              {searchMode === 'city' && (
                <div className="space-y-4" data-testid="search-bar">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 border transition-all ${
                        dropdownOpen ? 'border-[#C4A455]/30 bg-white/[0.03]' : 'border-white/[0.07] bg-white/[0.015]'
                      }`}
                      data-testid="city-dropdown-trigger"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-[#C4A455]/50 flex-shrink-0" />
                        <span className={`text-[13px] ${selectedCity ? 'text-white/80 font-medium' : 'text-white/30'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {selectedCity || 'Select your city'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/25 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-px bg-[#1C1C1C] border border-white/[0.07] z-50 max-h-48 overflow-y-auto" data-testid="city-dropdown-list">
                        <button onClick={() => selectCity('')} className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${selectedCity === '' ? 'bg-[#C4A455] text-[#111] font-semibold' : 'text-white/50 hover:bg-white/[0.03] hover:text-white/70'}`} data-testid="city-option-all" style={{ fontFamily: "'DM Sans', sans-serif" }}>All Cities</button>
                        {cityNames.map(c => (
                          <button key={c} onClick={() => selectCity(c)} className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${selectedCity === c ? 'bg-[#C4A455] text-[#111] font-semibold' : 'text-white/50 hover:bg-white/[0.03] hover:text-white/70'}`} data-testid={`city-option-${c.toLowerCase().replace(/\s/g, '-')}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-30" />{c}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleExplore}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 text-[12px] font-semibold text-[#111] bg-[#C4A455] hover:bg-[#B89A4A] transition-all active:scale-[0.98] tracking-[0.08em] uppercase"
                    data-testid="explore-venues-btn"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Explore Venues
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {searchMode === 'nearby' && (
                <div className="space-y-4" data-testid="nearby-panel">
                  {geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-white/40">
                      <Loader2 className="w-5 h-5 animate-spin text-[#C4A455]" />
                      <span className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>Finding your location...</span>
                    </div>
                  )}
                  {geoError && <p className="text-sm text-red-400 text-center py-2">{geoError}</p>}
                  {geoCoords && !geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Location detected</span>
                    </div>
                  )}
                  {!geoCoords && !geoLoading && !geoError && (
                    <button onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#C4A455]/30 text-[#C4A455] text-sm font-medium hover:bg-[#C4A455]/5 transition-colors" data-testid="get-location-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <Navigation className="w-4 h-4" />
                      Enable Location Access
                    </button>
                  )}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-semibold mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Search Radius</label>
                    <div className="flex gap-2">
                      {RADIUS_OPTIONS.slice(0, 4).map((opt) => (
                        <button key={opt.value} onClick={() => setRadius(opt.value)} className={`flex-1 py-2.5 text-sm font-medium border transition-all ${radius === opt.value ? 'bg-[#C4A455] text-[#111] border-[#C4A455]' : 'bg-white/[0.02] text-white/35 border-white/[0.07] hover:border-white/[0.12]'}`}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleExplore} disabled={!geoCoords || geoLoading} className="w-full flex items-center justify-center gap-2.5 py-3.5 text-[12px] font-semibold text-[#111] bg-[#C4A455] hover:bg-[#B89A4A] disabled:opacity-40 transition-all tracking-[0.08em] uppercase" data-testid="explore-nearby-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Explore Nearby <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Trust */}
            <div className="mt-8 flex items-center justify-center" data-testid="trust-strip">
              <div className="flex items-center gap-2 text-[10px] font-medium text-white/30 tracking-[0.1em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <span>500+ Venues</span>
                <span className="text-white/15">|</span>
                <span>Verified Partners</span>
                <span className="text-white/15">|</span>
                <span>Escrow Protected</span>
              </div>
            </div>

            <p className="text-center mt-5 text-[13px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              or{' '}
              <button onClick={() => navigate('/venues/search')} className="text-[#C4A455]/80 hover:text-[#C4A455] font-medium underline underline-offset-4 decoration-white/10 hover:decoration-[#C4A455]/30 transition-colors" data-testid="browse-all-link">browse all venues</button>
            </p>
          </div>
        </div>

        {/* Desktop Hero Content */}
        <div className="hidden lg:block">
          <div className="bg-[#141414] py-20 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8A960]/15 to-transparent" />
            <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative z-10">
              <div className="inline-block px-4 py-1.5 border border-white/[0.08] mb-8">
                <span className="text-[11px] font-medium text-white/45 uppercase tracking-[0.18em]" style={{ fontFamily: "Inter, sans-serif" }}>India's Trusted Venue Booking Platform</span>
              </div>
              <h1 className="text-5xl lg:text-[54px] font-bold leading-[1.1] tracking-[-0.01em] text-white mb-6" data-testid="hero-headline" style={{ fontFamily: "Inter, sans-serif" }}>
                We Talk.{' '}
                <span className="text-[#C8A960]">You Lock.</span>
              </h1>
              <p className="text-[15px] leading-[1.7] max-w-md mx-auto text-white/50" style={{ fontFamily: "Inter, sans-serif" }}>
                Tell us what you need. We shortlist, compare, and help you lock the right venue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          DESKTOP SEARCH MODULE (Hidden on mobile - moved to hero)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="hidden lg:block pb-14 sm:pb-20 bg-[#FAFAF8]" data-testid="search-section">
        <div className="max-w-xl mx-auto px-5 sm:px-8 -mt-8 relative z-20">
          <div className="bg-white border border-slate-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-center mb-5">
              <div className="flex border border-slate-200">
                <button
                  onClick={() => { setSearchMode('city'); setGeoError(''); }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium transition-all ${
                    searchMode === 'city' ? 'bg-[#111] text-white' : 'text-[#64748B] hover:text-[#374151]'
                  }`}
                  data-testid="desktop-mode-city"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <Building2 className="h-4 w-4" />
                  Choose City
                </button>
                <button
                  onClick={() => { setSearchMode('nearby'); if (!geoCoords) handleGetLocation(); }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium transition-all ${
                    searchMode === 'nearby' ? 'bg-[#111] text-white' : 'text-[#64748B] hover:text-[#374151]'
                  }`}
                  data-testid="desktop-mode-nearby"
                  style={{ fontFamily: "Inter, sans-serif" }}
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
                    dropdownOpen ? 'border-[#111111] bg-white shadow-md' : 'border-slate-200 bg-white'
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
                        selectedCity === '' ? 'bg-[#111111] text-white' : 'text-[#374151] hover:bg-slate-50'
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
                          selectedCity === c ? 'bg-[#C8A960] text-white' : 'text-[#374151] hover:bg-slate-50'
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
                className="w-full flex items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-[#111] bg-[#C8A960] hover:bg-[#BA9A52] transition-all"
                data-testid="desktop-explore-venues-btn"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Explore Venues
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* Near Me Mode - Desktop */}
          {searchMode === 'nearby' && (
            <div className="rounded-[10px] border bg-white p-4 space-y-3" style={{ borderColor: '#111111' }} data-testid="desktop-nearby-panel">
              {geoLoading && (
                <div className="flex items-center gap-2 text-sm py-1" style={{ color: '#6B7280' }}>
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#C8A960' }} />
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
                  style={{ borderColor: '#C8A960', color: '#C8A960' }}
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
                    style={{ backgroundColor: '#C8A960' }}
                    data-testid="desktop-explore-nearby-btn"
                  >
                    Explore <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>{/* close search card */}

          {/* Trust indicators - Desktop */}
          <div className="mt-5 flex items-center justify-center gap-6" data-testid="desktop-trust-strip">
            {[
              'Negotiation Included',
              'Verified Venues Only',
              'Real-Time Availability',
              'Secure Transactions'
            ].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[#C8A960]/50" />
                <span className="text-[11px] text-[#94A3B8] font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{item}</span>
              </div>
            ))}
          </div>

          <p className="text-center mt-4 text-[12px]" style={{ color: '#9CA3AF' }}>
            or{' '}
            <button
              onClick={() => navigate('/venues/search')}
              className="underline hover:no-underline"
              style={{ color: '#C8A960' }}
              data-testid="desktop-browse-all-link"
            >
              browse all venues
            </button>
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 sm:py-24" id="how-it-works" style={{ backgroundColor: '#F7F9FC' }} data-testid="how-it-works">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold font-sans mb-12">How It Works</h2>

          <div className="space-y-10">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold mb-4"
                  style={{ borderColor: '#111111', color: '#111111' }}
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

      {/* ── TOP PERFORMERS OF THE MONTH ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#F7F9FC' }} data-testid="top-performers-section">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111111]/5 border border-[#111111]/10 mb-4">
              <Crown className="w-3.5 h-3.5 text-[#C8A960]" />
              <span className="text-[11px] font-bold text-[#111111] uppercase tracking-widest">Top Performers</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-sans text-[#111111] mb-2">This Month's Best</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>Ranked live by events closed. Updated automatically.</p>
          </div>

          {topPerformers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
              {topPerformers.map((rm, idx) => {
                const style = RANK_STYLES[idx] || RANK_STYLES[2];
                const isFirst = idx === 0;
                return (
                  <div
                    key={rm.user_id}
                    className={`relative bg-white rounded-2xl border ${style.border} ${style.ring} p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all ${isFirst ? 'lg:scale-[1.04] lg:shadow-[0_8px_30px_rgba(199,161,74,0.12)] lg:z-10' : ''}`}
                    data-testid={`top-performer-card-${idx}`}
                  >
                    {/* Rank Badge */}
                    <div className={`absolute -top-2.5 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full ${style.badgeBg} text-white text-[10px] font-black shadow-sm`} data-testid={`rank-badge-${idx}`}>
                      {isFirst && <Crown className="w-3 h-3" />}
                      {style.label}
                    </div>

                    <div className="flex items-start gap-4 mb-5">
                      <div className="relative flex-shrink-0">
                        <img
                          src={rm.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(rm.name)}&background=C7A14A&color=fff&size=56`}
                          alt={rm.name}
                          className={`${isFirst ? 'w-16 h-16' : 'w-14 h-14'} rounded-full object-cover border-2 ${isFirst ? 'border-[#C8A960]' : 'border-slate-100'}`}
                        />
                        {isFirst && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#C8A960] flex items-center justify-center shadow-sm border-2 border-white">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`${isFirst ? 'text-base' : 'text-sm'} font-bold text-[#111111]`}>{rm.name}</h3>
                        <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{rm.city_focus}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-[#C8A960] text-[#C8A960]" />
                          <span className="text-[12px] font-medium text-[#374151]">{rm.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className={`rounded-xl ${isFirst ? 'bg-[#C8A960]/5 border border-[#C8A960]/15' : 'bg-[#FAFAF8] border border-slate-100'} px-3 py-3 text-center`}>
                        <div className={`text-xl font-black ${style.numColor}`} data-testid={`events-closed-${idx}`}>{rm.events_closed}</div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#6B7280' }}>Events Closed</div>
                      </div>
                      <div className="rounded-xl bg-[#FAFAF8] border border-slate-100 px-3 py-3 text-center">
                        <div className="text-xl font-black text-[#111111]">{rm.total_leads}</div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#6B7280' }}>Leads Managed</div>
                      </div>
                    </div>

                    {/* Languages */}
                    <div className="flex flex-wrap gap-1.5">
                      {(rm.languages || []).map(lang => (
                        <span key={lang} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-[#64748B] font-medium">{lang}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-[#94A3B8] text-sm">Loading top performers...</div>
          )}
        </div>
      </section>

      {/* ── PLATFORM ADVANTAGE ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#F7F9FC' }} data-testid="platform-advantage">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <h2 className="text-xl sm:text-2xl font-bold font-sans mb-10 text-center">Platform Capabilities</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {CAPABILITIES.map(cap => (
              <div key={cap.title} className="bg-white rounded-xl border p-5" style={{ borderColor: '#EAEAEA' }} data-testid="capability-card">
                <cap.icon className="h-5 w-5 mb-3" style={{ color: '#111111' }} />
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
                <div className="text-3xl sm:text-4xl font-bold font-sans" style={{ color: '#111111' }}>{m.value}</div>
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
            <p className="text-sm" style={{ color: '#6B7280' }}>Join the VenuLock ecosystem as a venue partner or event management company.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Venue Card */}
            <div
              className="bg-[#111111] rounded-2xl p-8 text-white"
              data-testid="list-venue-cta"
            >
              <div className="w-12 h-12 rounded-xl bg-[#C8A960]/20 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-[#C8A960]" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2">List Your Venue</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Get qualified leads from thousands of event planners. We handle discovery, negotiation,
                and follow-up — you focus on delivering great events.
              </p>
              <ul className="space-y-2 mb-8">
                {['Free to list', 'Dedicated RM manages your bookings', 'Commission only on confirmed bookings'].map(p => (
                  <li key={p} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/list-your-venue')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-[#C8A960] text-white hover:bg-[#B5912F] transition-colors"
                data-testid="list-venue-btn"
              >
                Apply to List <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Partner Card */}
            <div
              className="bg-white border-2 border-[#111111] rounded-2xl p-8"
              data-testid="partner-cta"
            >
              <div className="w-12 h-12 rounded-xl bg-[#111111]/10 flex items-center justify-center mb-5">
                <Handshake className="h-6 w-6 text-[#111111]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">Partner With Us</h3>
              <p className="text-[#64748B] text-sm mb-6 leading-relaxed">
                Are you an event management company? Join our network and unlock access to premium venues,
                co-marketing, and a shared customer pipeline.
              </p>
              <ul className="space-y-2 mb-8">
                {['Access 500+ curated venues', 'Co-branded marketing opportunities', 'Dedicated account management'].map(p => (
                  <li key={p} className="flex items-center gap-2 text-sm text-[#374151]">
                    <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/partner')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-[#111111] text-white hover:bg-[#153055] transition-colors"
                data-testid="partner-btn"
              >
                Become a Partner <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#111111' }} data-testid="final-cta">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-sans text-white mb-8">Start Your Booking Today</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#C8A960' }}
              data-testid="final-cta-booking"
            >
              Start Booking <ArrowRight className="h-4 w-4" />
            </button>
            <ConnectButton
              className="px-7 py-3.5 rounded-lg text-sm border text-white/80 hover:text-white hover:border-white/40"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t py-10" style={{ borderColor: '#EAEAEA' }} data-testid="main-footer">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo className="h-[28px] w-auto mb-3" />
              <p className="text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>WE TALK. YOU LOCK.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#6B7280' }}>Platform</h4>
              <ul className="space-y-1.5">
                {[
                  { l: 'Browse Venues', h: '/venues/search' },
                  { l: 'How It Works', h: '/#how-it-works', isAnchor: true },
                  { l: 'List Your Venue', h: '/list-your-venue' },
                  { l: 'Partner With Us', h: '/partner' },
                ].map(x => (
                  <li key={x.l}>
                    <button
                      onClick={() => {
                        if (x.isAnchor) {
                          const el = document.getElementById('how-it-works');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          else navigate('/');
                        } else {
                          navigate(x.h);
                        }
                      }}
                      className="text-[13px] hover:underline text-left"
                      style={{ color: '#6B7280' }}
                      data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {x.l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#6B7280' }}>Company</h4>
              <ul className="space-y-1.5">
                {[
                  { l: 'Contact', h: '/contact' },
                  { l: 'Support', h: '/support' },
                  { l: 'Privacy', h: '/privacy' },
                  { l: 'Terms', h: '/terms' },
                ].map(x => (
                  <li key={x.l}>
                    <button
                      onClick={() => navigate(x.h)}
                      className="text-[13px] hover:underline text-left"
                      style={{ color: '#6B7280' }}
                      data-testid={`footer-link-${x.l.toLowerCase()}`}
                    >
                      {x.l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#6B7280' }}>Cities</h4>
              <ul className="space-y-1.5">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad'].map(c => (
                  <li key={c}>
                    <button
                      onClick={() => navigate(`/venues/search?city=${c}`)}
                      className="text-[13px] hover:underline text-left"
                      style={{ color: '#6B7280' }}
                      data-testid={`footer-city-${c.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: '#EAEAEA' }}>
            <p className="text-[12px]" style={{ color: '#6B7280' }}>&copy; {new Date().getFullYear()} VenuLock. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/privacy')} className="text-[12px] hover:underline" style={{ color: '#6B7280' }} data-testid="footer-privacy-policy">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-[12px] hover:underline" style={{ color: '#6B7280' }} data-testid="footer-terms-of-service">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
