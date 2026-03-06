import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight, 
  CheckCircle2, RefreshCw, GitCompare, ShieldCheck, Lock,
  Star, Globe, Phone, ChevronRight, Building2, Navigation, Loader2, Handshake,
  Sparkles, Crown, Shield, Clock, Menu, X, ChevronDown,
  Target, Headphones, Eye, Users, Calendar
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

const EVENT_TYPES = [
  'Wedding', 'Birthday / Anniversary', 'Corporate Event', 'Cocktail / Reception',
  'Conference / Seminar', 'Exhibition', 'Private Party', 'Other'
];

const GUEST_COUNT_OPTIONS = [
  { value: 'under-50', label: 'Under 50' },
  { value: '50-100', label: '50\u2013100' },
  { value: '100-250', label: '100\u2013250' },
  { value: '250-500', label: '250\u2013500' },
  { value: '500-1000', label: '500\u20131000' },
  { value: '1000+', label: '1000+' },
];

const STEPS = [
  { num: '01', title: 'Tell us what you need', desc: 'Share your event type, city, guest count, and preferences.' },
  { num: '02', title: 'Compare curated venues', desc: 'We shortlist and present the best-fit venues with transparent pricing.' },
  { num: '03', title: 'Lock your venue with support', desc: 'Your dedicated manager handles negotiation, contracts, and confirmation.' },
];

const WHY_CHOOSE = [
  { icon: Target, title: 'Curated Matches', desc: 'We shortlist venues based on your event, budget, and preferences.' },
  { icon: GitCompare, title: 'Smart Comparison', desc: 'Compare options clearly without wasting time across multiple vendors.' },
  { icon: Headphones, title: 'Booking Support', desc: 'We help you through the process until the venue is locked.' },
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

const SOCIAL_PROOF = [
  { value: '500+', label: 'Venues Across Top Cities' },
  { value: '100%', label: 'Verified Partners' },
  { value: 'End-to-End', label: 'Booking Support' }
];

// ── SVG Logo ──
function Logo({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 180 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4C8 4 14 2 18 8C22 14 16 20 16 20L18 28L10 22C10 22 2 18 4 10C5.5 4 8 4 8 4Z" fill="#C8A960" />
      <circle cx="12" cy="12" r="3" fill="#111111" />
      <text x="30" y="24" fontFamily="DM Sans, system-ui, sans-serif" fontWeight="600" fontSize="16" fill="#111111" letterSpacing="0.15em">VENULOCK</text>
    </svg>
  );
}

// ── Shared dropdown component for dark search cards ──
function SearchDropdown({ label, icon: Icon, value, placeholder, options, isOpen, onToggle, onSelect, testId }) {
  return (
    <div className="relative" data-dropdown>
      {label && (
        <label className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
      )}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-4 border transition-all duration-200 ${
          isOpen ? 'border-[#C8A960]/50 bg-white/[0.07] shadow-[0_0_12px_rgba(200,169,96,0.08)]' : 'border-white/[0.12] bg-white/[0.04]'
        }`}
        data-testid={testId}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-[18px] h-[18px] text-[#C8A960] flex-shrink-0" strokeWidth={2} />
          <span className={`text-[13px] ${value ? 'text-white/90 font-medium' : 'text-white/45'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/35 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-px bg-[#222] border border-white/[0.1] z-50 max-h-52 overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {options.map(opt => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <button
                key={optValue}
                onClick={() => onSelect(optValue === value ? '' : optValue)}
                className={`w-full text-left px-4 py-3 text-[13px] transition-colors ${
                  value === optValue ? 'bg-[#C8A960] text-[#111] font-semibold' : 'text-white/60 hover:bg-white/[0.05] hover:text-white/80'
                }`}
                data-testid={`${testId}-option-${optValue.toLowerCase().replace(/[\s\/]+/g, '-')}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared dropdown for desktop light search cards ──
function DesktopDropdown({ value, placeholder, icon: Icon, options, isOpen, onToggle, onSelect, testId, renderOption }) {
  return (
    <div className="relative" data-dropdown>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3.5 border cursor-pointer transition-all ${
          isOpen ? 'border-[#111111] bg-white shadow-sm' : 'border-slate-200 bg-white'
        }`}
        data-testid={testId}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-[#64748B] flex-shrink-0" />
          <span className={`text-sm ${value ? 'text-[#374151] font-medium' : 'text-[#94A3B8]'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-px bg-white border border-slate-200 shadow-lg z-50 max-h-56 overflow-y-auto">
          {options.map(opt => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <button
                key={optValue}
                onClick={() => onSelect(optValue === value ? '' : optValue)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  value === optValue ? 'bg-[#C8A960] text-white font-medium' : 'text-[#374151] hover:bg-slate-50'
                }`}
                data-testid={`${testId}-option-${optValue.toLowerCase().replace(/[\s\/]+/g, '-')}`}
              >
                {renderOption ? renderOption(optLabel) : optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState('city');
  const [selectedCity, setSelectedCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [radius, setRadius] = useState('20');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoCoords, setGeoCoords] = useState(null);
  const [cityNames, setCityNames] = useState(FALLBACK_CITIES);
  const [citiesData, setCitiesData] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);

  const toggleDropdown = (name) => setActiveDropdown(prev => prev === name ? null : name);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setActiveDropdown(null);
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
      setGeoError('Geolocation not supported.');
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
        setGeoError('Location unavailable. Switching to city selection.');
        setGeoLoading(false);
        setTimeout(() => { setSearchMode('city'); setGeoError(''); }, 2000);
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
    if (eventType) params.set('event_type', eventType);
    if (guestCount) params.set('guests', guestCount);
    navigate(`/venues/search?${params.toString()}`);
  };

  const switchMode = (mode) => {
    setSearchMode(mode);
    setActiveDropdown(null);
    setGeoError('');
    if (mode === 'nearby' && !geoCoords) handleGetLocation();
  };

  // Shared form fields for both modes
  const renderFormFields = (variant = 'mobile') => {
    const isMobile = variant === 'mobile';
    return (
      <>
        {/* Event Type */}
        {isMobile ? (
          <SearchDropdown
            label="Event Type"
            icon={Calendar}
            value={eventType}
            placeholder="Select event type"
            options={EVENT_TYPES}
            isOpen={activeDropdown === 'eventType'}
            onToggle={() => toggleDropdown('eventType')}
            onSelect={(v) => { setEventType(v); setActiveDropdown(null); }}
            testId={`${variant}-event-type-dropdown`}
          />
        ) : (
          <DesktopDropdown
            icon={Calendar}
            value={eventType}
            placeholder="Event Type"
            options={EVENT_TYPES}
            isOpen={activeDropdown === 'eventType'}
            onToggle={() => toggleDropdown('eventType')}
            onSelect={(v) => { setEventType(v); setActiveDropdown(null); }}
            testId={`${variant}-event-type-dropdown`}
          />
        )}
        {/* Guest Count */}
        {isMobile ? (
          <SearchDropdown
            label="Guest Count"
            icon={Users}
            value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''}
            placeholder="Expected guests"
            options={GUEST_COUNT_OPTIONS}
            isOpen={activeDropdown === 'guestCount'}
            onToggle={() => toggleDropdown('guestCount')}
            onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }}
            testId={`${variant}-guest-count-dropdown`}
          />
        ) : (
          <DesktopDropdown
            icon={Users}
            value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''}
            placeholder="Guest Count"
            options={GUEST_COUNT_OPTIONS}
            isOpen={activeDropdown === 'guestCount'}
            onToggle={() => toggleDropdown('guestCount')}
            onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }}
            testId={`${variant}-guest-count-dropdown`}
          />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-[#111] border-b border-white/[0.06]" data-testid="mobile-header">
        <div className="flex items-center justify-between px-6 h-[52px]">
          <button onClick={() => navigate('/')} className="flex items-center gap-1" data-testid="logo-btn">
            <span className="text-[12px] font-bold tracking-[0.3em] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
            <span className="w-px h-3.5 bg-[#C8A960]/50 mx-1" />
            <span className="text-[12px] font-bold tracking-[0.3em] text-[#C8A960]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOCK</span>
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
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full py-3 text-[11px] font-bold bg-[#C8A960] text-[#111] tracking-[0.1em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <header className="hidden lg:block sticky top-0 z-[9999] bg-[#111] border-b border-white/[0.06]" data-testid="main-header">
        <div className="max-w-[1100px] mx-auto px-8 flex h-[56px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5" data-testid="desktop-logo-btn">
            <span className="text-[13px] font-semibold tracking-[0.35em] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
            <span className="w-px h-3.5 bg-[#C8A960]/50 mx-1" />
            <span className="text-[13px] font-semibold tracking-[0.35em] text-[#C8A960]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOCK</span>
          </button>
          <div className="flex items-center gap-8">
            <button onClick={() => navigate('/venues/search')} className="text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors tracking-[0.05em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Browse Venues</button>
            <button onClick={() => navigate('/login')} className="text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors tracking-[0.05em]" data-testid="login-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
            <button onClick={() => navigate('/register')} className="text-[11px] font-bold text-[#111] px-6 py-2 bg-[#C8A960] hover:bg-[#B89A4A] transition-colors tracking-[0.1em] uppercase" data-testid="get-started-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>Get Started</button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative lg:pt-24 lg:pb-16" data-testid="hero-section">
        
        {/* ── MOBILE HERO ── */}
        <div className="lg:hidden pt-[52px]">
          <div className="bg-[#111] px-6 pt-12 pb-14 relative overflow-hidden">
            {/* Luxury spotlight gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(200,169,96,0.07)_0%,transparent_70%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8A960]/15 to-transparent" />
            <div className="relative z-10 text-center">
              <p className="text-[10px] font-bold text-[#C8A960]/80 uppercase tracking-[0.3em] mb-7" style={{ fontFamily: "'DM Sans', sans-serif" }}>India's Trusted Venue Booking Platform</p>
              <h1 className="text-[2.5rem] font-medium text-white leading-[1.08] mb-5" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
                We Talk.
                <br />
                <span className="text-[#C8A960]">You Lock.</span>
              </h1>
              <p className="text-white/60 text-[14px] leading-[1.8] max-w-[320px] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Tell us your event. We shortlist, compare, negotiate, and help you lock the right venue.
              </p>
            </div>
          </div>

          {/* ── MOBILE SEARCH CARD ── */}
          <div className="bg-[#161616] px-5 pb-8 pt-0">
            <div className="bg-[#1E1E1E] border border-white/[0.1] p-5 -mt-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              {/* Tab Toggle */}
              <div className="grid grid-cols-2 gap-0 border border-[#C8A960]/20 mb-6">
                <button
                  onClick={() => switchMode('city')}
                  className={`flex items-center justify-center gap-2 py-3 text-[11px] font-bold tracking-[0.06em] uppercase transition-all duration-200 ${
                    searchMode === 'city' ? 'bg-[#FAF6EC] text-[#1A1A1A]' : 'bg-transparent text-white/60 hover:text-white/80'
                  }`}
                  data-testid="mode-city"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Building2 className="w-4 h-4" strokeWidth={2} />
                  City
                </button>
                <button
                  onClick={() => switchMode('nearby')}
                  className={`flex items-center justify-center gap-2 py-3 text-[11px] font-bold tracking-[0.06em] uppercase transition-all duration-200 ${
                    searchMode === 'nearby' ? 'bg-[#FAF6EC] text-[#1A1A1A]' : 'bg-transparent text-white/60 hover:text-white/80'
                  }`}
                  data-testid="mode-nearby"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Navigation className="w-4 h-4" strokeWidth={2} />
                  Use My Location
                </button>
              </div>

              {searchMode === 'city' && (
                <div className="space-y-4" data-testid="search-bar">
                  {/* City */}
                  <SearchDropdown
                    label="City"
                    icon={MapPin}
                    value={selectedCity}
                    placeholder="Select your city"
                    options={cityNames}
                    isOpen={activeDropdown === 'city'}
                    onToggle={() => toggleDropdown('city')}
                    onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }}
                    testId="city-dropdown-trigger"
                  />
                  {renderFormFields('mobile')}
                  {/* CTA */}
                  <button
                    onClick={handleExplore}
                    className="w-full flex items-center justify-center gap-3 py-[18px] text-[12px] font-extrabold text-[#111] bg-gradient-to-b from-[#D4B76A] to-[#C8A960] hover:from-[#C8A960] hover:to-[#BA9A52] transition-all active:scale-[0.97] tracking-[0.15em] uppercase mt-2 shadow-[0_2px_16px_rgba(200,169,96,0.3)]"
                    data-testid="explore-venues-btn"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Find My Venue
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <p className="text-center text-[11px] text-white/35 pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Free venue matching. No booking pressure.
                  </p>
                </div>
              )}

              {searchMode === 'nearby' && (
                <div className="space-y-4" data-testid="nearby-panel">
                  {geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-white/50">
                      <Loader2 className="w-5 h-5 animate-spin text-[#C8A960]" />
                      <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Detecting your location...</span>
                    </div>
                  )}
                  {geoError && <p className="text-sm text-amber-400 text-center py-2 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>{geoError}</p>}
                  {geoCoords && !geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-3.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Location detected</span>
                    </div>
                  )}
                  {!geoCoords && !geoLoading && !geoError && (
                    <button onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#C8A960]/40 text-[#C8A960] text-sm font-semibold hover:bg-[#C8A960]/5 transition-colors" data-testid="get-location-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <Navigation className="w-[18px] h-[18px]" strokeWidth={2} />
                      Enable Location Access
                    </button>
                  )}
                  {(geoCoords || geoLoading) && !geoError && (
                    <>
                      {renderFormFields('mobile')}
                      <button
                        onClick={handleExplore}
                        disabled={!geoCoords || geoLoading}
                        className="w-full flex items-center justify-center gap-3 py-[18px] text-[12px] font-extrabold text-[#111] bg-gradient-to-b from-[#D4B76A] to-[#C8A960] hover:from-[#C8A960] hover:to-[#BA9A52] disabled:opacity-40 transition-all tracking-[0.15em] uppercase mt-2 shadow-[0_2px_16px_rgba(200,169,96,0.3)]"
                        data-testid="explore-nearby-btn"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Find My Venue <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                      <p className="text-center text-[11px] text-white/35 pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Free venue matching. No booking pressure.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── MOBILE TRUST BADGES ── */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5" data-testid="trust-strip">
              {[
                { icon: ShieldCheck, label: 'Verified Venues' },
                { icon: Eye, label: 'Transparent Pricing' },
                { icon: Headphones, label: 'Booking Assistance' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 px-3.5 py-2.5 border border-white/[0.12] bg-white/[0.05]">
                  <t.icon className="w-3.5 h-3.5 text-[#C8A960]" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-white/65 uppercase tracking-[0.08em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
                </div>
              ))}
            </div>

            <p className="text-center mt-5 text-[12px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              or{' '}
              <button onClick={() => navigate('/venues/search')} className="text-[#C8A960]/90 hover:text-[#C8A960] font-semibold underline underline-offset-4 decoration-[#C8A960]/20 hover:decoration-[#C8A960]/40 transition-colors" data-testid="browse-all-link">browse all venues</button>
            </p>
          </div>
        </div>

        {/* ── DESKTOP HERO ── */}
        <div className="hidden lg:block">
          <div className="bg-[#141414] py-20 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8A960]/15 to-transparent" />
            <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative z-10">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 border border-white/[0.06] mb-10">
                <span className="w-1.5 h-1.5 bg-[#C8A960]/50" />
                <span className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.3em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>India's Trusted Venue Booking Platform</span>
                <span className="w-1.5 h-1.5 bg-[#C8A960]/50" />
              </div>
              <h1 className="text-5xl lg:text-[3.75rem] font-medium leading-[1.06] tracking-[-0.015em] text-white mb-6" data-testid="hero-headline" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
                We Talk.{' '}
                <span className="text-[#C8A960]">You Lock.</span>
              </h1>
              <p className="text-[15px] leading-[1.75] max-w-xl mx-auto text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Tell us your event. We shortlist, compare, negotiate, and help you lock the right venue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP SEARCH MODULE
      ══════════════════════════════════════════════════════════════════ */}
      <section className="hidden lg:block pb-14 sm:pb-20 bg-[#FAFAF8]" data-testid="search-section">
        <div className="max-w-xl mx-auto px-5 sm:px-8 -mt-8 relative z-20">
          <div className="bg-white border border-slate-200/80 p-7 shadow-[0_4px_24px_rgba(0,0,0,0.05)] relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#C8A960]" />
            {/* Tab Toggle */}
            <div className="flex items-center justify-center mb-5">
              <div className="flex border border-slate-200">
                <button
                  onClick={() => switchMode('city')}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-semibold tracking-wide transition-all ${
                    searchMode === 'city' ? 'bg-[#111] text-white' : 'text-[#64748B] hover:text-[#374151]'
                  }`}
                  data-testid="desktop-mode-city"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Building2 className="h-4 w-4" />
                  City
                </button>
                <button
                  onClick={() => switchMode('nearby')}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-semibold tracking-wide transition-all ${
                    searchMode === 'nearby' ? 'bg-[#111] text-white' : 'text-[#64748B] hover:text-[#374151]'
                  }`}
                  data-testid="desktop-mode-nearby"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Navigation className="h-4 w-4" />
                  Use My Location
                </button>
              </div>
            </div>

            {/* City Mode */}
            {searchMode === 'city' && (
              <div className="space-y-3" data-testid="desktop-search-bar">
                <DesktopDropdown
                  icon={MapPin}
                  value={selectedCity}
                  placeholder="Select City"
                  options={cityNames}
                  isOpen={activeDropdown === 'city'}
                  onToggle={() => toggleDropdown('city')}
                  onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }}
                  testId="desktop-city-dropdown-trigger"
                  renderOption={(label) => (
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />{label}</div>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  {renderFormFields('desktop')}
                </div>
                <button
                  onClick={handleExplore}
                  className="w-full flex items-center justify-center gap-3 py-4 text-[12px] font-extrabold text-[#111] bg-[#C8A960] hover:bg-[#B89A4A] transition-all tracking-[0.15em] uppercase"
                  data-testid="desktop-explore-venues-btn"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Find My Venue
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-center text-[11px] text-[#94A3B8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Free venue matching. No booking pressure.
                </p>
              </div>
            )}

            {/* Use My Location Mode - Desktop */}
            {searchMode === 'nearby' && (
              <div className="space-y-3" data-testid="desktop-nearby-panel">
                {geoLoading && (
                  <div className="flex items-center gap-2 text-sm py-3 justify-center text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#C8A960]" />
                    Detecting your location...
                  </div>
                )}
                {geoError && <p className="text-sm text-amber-600 text-center py-2">{geoError}</p>}
                {geoCoords && !geoLoading && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 justify-center py-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Location detected
                  </div>
                )}
                {!geoCoords && !geoLoading && !geoError && (
                  <button
                    onClick={handleGetLocation}
                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed text-sm transition-colors"
                    style={{ borderColor: '#C8A960', color: '#C8A960' }}
                    data-testid="desktop-get-location-btn"
                  >
                    <Navigation className="h-4 w-4" />
                    Allow Location Access
                  </button>
                )}
                {(geoCoords || geoLoading) && !geoError && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {renderFormFields('desktop')}
                    </div>
                    <button
                      onClick={handleExplore}
                      disabled={!geoCoords || geoLoading}
                      className="w-full flex items-center justify-center gap-3 py-4 text-[12px] font-extrabold text-[#111] bg-[#C8A960] hover:bg-[#B89A4A] disabled:opacity-40 transition-all tracking-[0.15em] uppercase"
                      data-testid="desktop-explore-nearby-btn"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Find My Venue <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-center text-[11px] text-[#94A3B8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Free venue matching. No booking pressure.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── DESKTOP TRUST BADGES ── */}
          <div className="mt-6 flex items-center justify-center gap-4" data-testid="desktop-trust-strip">
            {[
              { icon: ShieldCheck, label: 'Verified Venues' },
              { icon: Eye, label: 'Transparent Pricing' },
              { icon: Headphones, label: 'Booking Assistance' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white">
                <t.icon className="w-3.5 h-3.5 text-[#C8A960]" />
                <span className="text-[11px] font-semibold text-[#374151] tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
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

      {/* ══════════════════════════════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-[#FAFAF8]" data-testid="why-choose-us">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <h2 className="text-2xl sm:text-[1.75rem] font-medium text-center mb-10" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Why Choose VenuLock</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {WHY_CHOOSE.map(item => (
              <div key={item.title} className="bg-white border border-[#E5E5E5] p-6 text-center" data-testid={`why-card-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="w-11 h-11 mx-auto mb-4 bg-[#F5F5F5] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#111]" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#111] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.title}</h3>
                <p className="text-[13px] leading-relaxed text-[#6B7280]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SOCIAL PROOF
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-16 bg-[#111]" data-testid="social-proof">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            {SOCIAL_PROOF.map(s => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-medium text-white mb-1" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>{s.value}</div>
                <div className="text-[11px] sm:text-[12px] text-white/40 font-medium tracking-wide uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-[13px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Trusted by event planners, families, and corporate teams.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" id="how-it-works" style={{ backgroundColor: '#FAFAF8' }} data-testid="how-it-works">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-[1.75rem] font-medium mb-12" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>How It Works</h2>

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
      <section className="py-16 sm:py-20 bg-[#FAFAF8]" data-testid="top-performers-section">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-[1.75rem] font-medium text-[#111111] mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Meet Your Venue Experts</h2>
            <p className="text-[13px] text-[#6B7280]">Dedicated relationship managers who guide you from search to booking.</p>
          </div>

          {topPerformers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
              {topPerformers.map((rm, idx) => {
                return (
                  <div
                    key={rm.user_id}
                    className="bg-white border border-[#E5E5E5] p-6 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
                    data-testid={`top-performer-card-${idx}`}
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <img
                        src={rm.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(rm.name)}&background=C7A14A&color=fff&size=56`}
                        alt={rm.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[#111111]">{rm.name}</h3>
                        <p className="text-[12px] mt-0.5 text-[#6B7280]">{rm.city_focus}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Star className="h-3 w-3 fill-[#C8A960] text-[#C8A960]" />
                          <span className="text-[12px] font-semibold text-[#374151]">{rm.rating}</span>
                          <span className="text-[11px] text-[#9CA3AF] ml-1">{rm.events_closed} events managed</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(rm.languages || []).map(lang => (
                        <span key={lang} className="px-2.5 py-0.5 bg-[#F5F5F5] text-[10px] text-[#64748B] font-medium">{lang}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-[#94A3B8] text-sm">Loading venue experts...</div>
          )}
        </div>
      </section>

      {/* ── PLATFORM ADVANTAGE ── */}
      <section className="py-16 sm:py-20 bg-[#FAFAF8]" data-testid="platform-advantage">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <h2 className="text-2xl sm:text-[1.75rem] font-medium mb-10 text-center" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Platform Capabilities</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {CAPABILITIES.map(cap => (
              <div key={cap.title} className="bg-white border border-[#E5E5E5] p-6" data-testid="capability-card">
                <cap.icon className="h-5 w-5 mb-3 text-[#111]" />
                <h3 className="text-sm font-bold font-sans mb-1">{cap.title}</h3>
                <p className="text-[13px] leading-relaxed text-[#6B7280]">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITY COVERAGE ── */}
      <section className="py-16 sm:py-20 border-t border-[#E5E5E5]" data-testid="city-coverage">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl sm:text-[1.75rem] font-medium" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Browse by City</h2>
            <button
              onClick={() => navigate('/venues/search')}
              className="text-[13px] flex items-center gap-1 group text-[#6B7280]"
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
                className="text-left border border-[#E5E5E5] px-4 py-3.5 hover:border-[#C8A960]/40 transition-all group bg-white"
                data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="text-sm font-semibold font-sans">{c.name}</div>
                <div className="text-[13px] mt-0.5 text-[#6B7280]">{c.venues} venues</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORK WITH US ── */}
      <section className="py-16 sm:py-20 border-t border-[#E5E5E5]" data-testid="work-with-us">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-[1.75rem] font-medium mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Grow Your Business With Us</h2>
            <p className="text-[13px] text-[#6B7280]">Join the VenuLock ecosystem as a venue partner or event management company.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-[#111111] p-8 text-white" data-testid="list-venue-cta">
              <div className="w-12 h-12 bg-[#C8A960]/20 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-[#C8A960]" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2">List Your Venue</h3>
              <p className="text-slate-300 text-[13px] mb-6 leading-relaxed">
                Get qualified leads from thousands of event planners. We handle discovery, negotiation,
                and follow-up — you focus on delivering great events.
              </p>
              <ul className="space-y-2 mb-8">
                {['Free to list', 'Dedicated RM manages your bookings', 'Commission only on confirmed bookings'].map(p => (
                  <li key={p} className="flex items-center gap-2 text-[13px] text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/list-your-venue')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-[11px] font-bold bg-[#C8A960] text-[#111] hover:bg-[#B89A4A] transition-colors tracking-[0.1em] uppercase"
                data-testid="list-venue-btn"
              >
                Apply to List <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-white border-2 border-[#111111] p-8" data-testid="partner-cta">
              <div className="w-12 h-12 bg-[#111111]/10 flex items-center justify-center mb-5">
                <Handshake className="h-6 w-6 text-[#111111]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">Partner With Us</h3>
              <p className="text-[#64748B] text-[13px] mb-6 leading-relaxed">
                Are you an event management company? Join our network and unlock access to premium venues,
                co-marketing, and a shared customer pipeline.
              </p>
              <ul className="space-y-2 mb-8">
                {['Access 500+ curated venues', 'Co-branded marketing opportunities', 'Dedicated account management'].map(p => (
                  <li key={p} className="flex items-center gap-2 text-[13px] text-[#374151]">
                    <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/partner')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-[11px] font-bold bg-[#111] text-white hover:bg-[#222] transition-colors tracking-[0.1em] uppercase"
                data-testid="partner-btn"
              >
                Become a Partner <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-20 pb-24 lg:pb-20" style={{ backgroundColor: '#111111' }} data-testid="final-cta">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-[1.75rem] font-medium text-white mb-8" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Start Your Booking Today</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-[11px] font-bold bg-[#C8A960] text-[#111] hover:bg-[#B89A4A] transition-colors tracking-[0.1em] uppercase"
              data-testid="final-cta-booking"
            >
              Start Booking <ArrowRight className="h-4 w-4" />
            </button>
            <ConnectButton
              className="px-7 py-3.5 text-[11px] font-bold border border-white/20 text-white/80 hover:text-white hover:border-white/40 tracking-[0.1em] uppercase transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5E5E5] py-10 bg-white" data-testid="main-footer">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[13px] font-semibold tracking-[0.35em] text-[#111]" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
                <span className="w-px h-3.5 bg-[#C8A960]/50" />
                <span className="text-[13px] font-semibold tracking-[0.35em] text-[#C8A960]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOCK</span>
              </div>
              <p className="text-[11px] tracking-[0.12em] text-[#9CA3AF] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>We Talk. You Lock.</p>
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
          <div className="pt-6 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3">
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
