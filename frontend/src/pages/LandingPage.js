import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight,
  CheckCircle2, RefreshCw, GitCompare, ShieldCheck, Lock,
  Star, Globe, Phone, ChevronRight, Building2, Navigation, Loader2, Handshake,
  Sparkles, Shield, Clock, Menu, X, ChevronDown,
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
  { num: '03', title: 'Lock your venue', desc: 'Your dedicated manager handles negotiation, contracts, and confirmation.' },
];

const WHY_CHOOSE = [
  { icon: Target, title: 'Curated Matches', desc: 'We shortlist venues based on your event, budget, and preferences.' },
  { icon: GitCompare, title: 'Smart Comparison', desc: 'Compare options clearly without wasting time across multiple vendors.' },
  { icon: Headphones, title: 'Booking Support', desc: 'We help you through the process until the venue is locked.' },
];

const CAPABILITIES = [
  { icon: RefreshCw, title: 'Real-Time Availability', desc: 'Venue calendars sync live. Check open dates without a single phone call.' },
  { icon: GitCompare, title: 'Side-by-Side Comparison', desc: 'Structured comparison across pricing, capacity, amenities, and reviews.' },
  { icon: ShieldCheck, title: 'Venue Verification', desc: 'Every venue audited on-ground. Photos, capacity, and pricing verified.' },
  { icon: Lock, title: 'Secure Escrow Booking', desc: 'Platform-managed payments protect both parties until confirmation.' }
];

const SOCIAL_PROOF = [
  { value: '500+', label: 'Venues Listed' },
  { value: '100%', label: 'Verified Partners' },
  { value: 'End-to-End', label: 'Booking Support' }
];

/* ─── Dropdown: Dark variant (mobile search) ─── */
function SearchDropdown({ label, icon: Icon, value, placeholder, options, isOpen, onToggle, onSelect, testId }) {
  return (
    <div className="relative" data-dropdown>
      {label && (
        <label className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2 block">{label}</label>
      )}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-4 border transition-all duration-150 ${
          isOpen ? 'border-[#C8A960]/40 bg-white/[0.06]' : 'border-white/[0.1] bg-white/[0.03]'
        }`}
        data-testid={testId}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-[18px] h-[18px] text-[#C8A960] flex-shrink-0" strokeWidth={1.8} />
          <span className={`text-[14px] ${value ? 'text-white/90 font-medium' : 'text-white/35'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-px bg-[#1A1A1A] border border-white/[0.08] z-50 max-h-52 overflow-y-auto shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {options.map(opt => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <button
                key={optValue}
                onClick={() => onSelect(optValue === value ? '' : optValue)}
                className={`w-full text-left px-4 py-3 text-[14px] transition-colors ${
                  value === optValue ? 'bg-[#C8A960] text-[#111] font-semibold' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                }`}
                data-testid={`${testId}-option-${optValue.toLowerCase().replace(/[\s\/]+/g, '-')}`}
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

/* ─── Dropdown: Light variant (desktop search) ─── */
function DesktopDropdown({ value, placeholder, icon: Icon, options, isOpen, onToggle, onSelect, testId, renderOption }) {
  return (
    <div className="relative" data-dropdown>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-[14px] border cursor-pointer transition-all duration-150 ${
          isOpen ? 'border-[#111] bg-white ring-1 ring-[#111]/5' : 'border-[#E2E2E2] bg-white hover:border-[#CACACA]'
        }`}
        data-testid={testId}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-[17px] h-[17px] text-[#999] flex-shrink-0" strokeWidth={1.8} />
          <span className={`text-[14px] ${value ? 'text-[#111] font-medium' : 'text-[#ACACAC]'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#ACACAC] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E2E2] shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50 max-h-56 overflow-y-auto">
          {options.map(opt => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <button
                key={optValue}
                onClick={() => onSelect(optValue === value ? '' : optValue)}
                className={`w-full text-left px-5 py-3 text-[14px] transition-colors ${
                  value === optValue ? 'bg-[#111] text-white font-medium' : 'text-[#374151] hover:bg-[#F7F7F7]'
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

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('[data-dropdown]')) setActiveDropdown(null);
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
          const names = data.flatMap(c => c.city === 'Delhi' ? DELHI_SUBS : [c.city]);
          setCityNames(names);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/rms/top-performers`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setTopPerformers(data);
      })
      .catch(() => {});
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => { setGeoError('Location unavailable. Switching to city.'); setGeoLoading(false); setTimeout(() => { setSearchMode('city'); setGeoError(''); }, 2000); }
    );
  };

  const DELHI_SUBS = ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'];

  const handleExplore = () => {
    const params = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) {
      params.set('city', DELHI_SUBS.includes(selectedCity) ? 'Delhi' : selectedCity);
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

  const renderFormFields = (variant = 'mobile') => {
    const isMobile = variant === 'mobile';
    return (
      <>
        {isMobile ? (
          <SearchDropdown label="Event Type" icon={Calendar} value={eventType} placeholder="Select event type"
            options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')}
            onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId={`${variant}-event-type-dropdown`} />
        ) : (
          <DesktopDropdown icon={Calendar} value={eventType} placeholder="Event Type"
            options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')}
            onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId={`${variant}-event-type-dropdown`} />
        )}
        {isMobile ? (
          <SearchDropdown label="Guest Count" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''}
            placeholder="Expected guests" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'}
            onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }}
            testId={`${variant}-guest-count-dropdown`} />
        ) : (
          <DesktopDropdown icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''}
            placeholder="Guest Count" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'}
            onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }}
            testId={`${variant}-guest-count-dropdown`} />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ═══ MOBILE HEADER ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-[#0C0C0C]" data-testid="mobile-header">
        <div className="flex items-center justify-between px-5 h-[56px]">
          <button onClick={() => navigate('/')} className="flex items-center gap-0" data-testid="logo-btn">
            <span className="text-[13px] font-extrabold tracking-[0.18em] text-white">VENU</span>
            <span className="w-[1.5px] h-[14px] bg-[#C8A960] mx-[6px]" />
            <span className="text-[13px] font-extrabold tracking-[0.18em] text-[#C8A960]">LOCK</span>
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 flex items-center justify-center" data-testid="mobile-menu-toggle">
            {mobileMenuOpen ? <X className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#0C0C0C] border-t border-white/[0.06] px-5 py-5 space-y-1">
            {[
              { label: 'Sign In', to: '/login' },
              { label: 'Browse Venues', to: '/venues/search' },
              { label: 'List Your Venue', to: '/list-your-venue' },
            ].map(item => (
              <button key={item.label} onClick={() => { navigate(item.to); setMobileMenuOpen(false); }}
                className="block w-full text-left text-white/40 hover:text-white py-3 text-[14px] font-medium tracking-wide transition-colors">{item.label}</button>
            ))}
            <div className="pt-4 border-t border-white/[0.06]">
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                className="w-full py-3 text-[11px] font-bold bg-[#C8A960] text-[#0C0C0C] tracking-[0.1em] uppercase">Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* ═══ DESKTOP HEADER ═══ */}
      <header className="hidden lg:block sticky top-0 z-[9999] bg-[#0C0C0C]" data-testid="main-header">
        <div className="max-w-[1120px] mx-auto px-8 flex h-[60px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="desktop-logo-btn">
            <span className="text-[15px] font-extrabold tracking-[0.18em] text-white">VENU</span>
            <span className="w-[1.5px] h-[16px] bg-[#C8A960] mx-[7px]" />
            <span className="text-[15px] font-extrabold tracking-[0.18em] text-[#C8A960]">LOCK</span>
          </button>
          <div className="flex items-center gap-10">
            <button onClick={() => navigate('/venues/search')}
              className="text-[13px] font-medium text-white/45 hover:text-white transition-colors duration-150">Browse Venues</button>
            <button onClick={() => navigate('/login')}
              className="text-[13px] font-medium text-white/45 hover:text-white transition-colors duration-150" data-testid="login-btn">Sign In</button>
            <button onClick={() => navigate('/register')}
              className="text-[12px] font-bold text-[#0C0C0C] px-7 py-2.5 bg-[#C8A960] hover:bg-[#B99A50] transition-colors duration-150 tracking-[0.08em] uppercase"
              data-testid="get-started-btn">Get Started</button>
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative" data-testid="hero-section">

        {/* ── MOBILE HERO ── */}
        <div className="lg:hidden pt-[56px]">
          <div className="bg-[#0C0C0C] px-5 pt-14 pb-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(200,169,96,0.06)_0%,transparent_70%)]" />
            <div className="relative z-10 text-center">
              <p className="text-[10px] font-semibold text-[#C8A960]/70 uppercase tracking-[0.25em] mb-8">India's Trusted Venue Platform</p>
              <h1 className="text-[2.75rem] font-medium text-white leading-[1.05] mb-5 font-serif">
                We Talk.<br /><span className="text-[#C8A960]">You Lock.</span>
              </h1>
              <p className="text-white/45 text-[15px] leading-[1.7] max-w-[300px] mx-auto">
                Tell us your event. We shortlist, compare, and help you lock the right venue.
              </p>
            </div>
          </div>

          {/* ── MOBILE SEARCH CARD ── */}
          <div className="bg-[#111] px-5 pb-8 pt-0">
            <div className="bg-[#191919] border border-white/[0.08] p-5 -mt-5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
              <div className="grid grid-cols-2 gap-0 border border-white/[0.1] mb-6">
                <button onClick={() => switchMode('city')}
                  className={`flex items-center justify-center gap-2 py-3 text-[11px] font-bold tracking-[0.06em] uppercase transition-all duration-150 ${
                    searchMode === 'city' ? 'bg-white text-[#111]' : 'bg-transparent text-white/50 hover:text-white/70'
                  }`} data-testid="mode-city">
                  <Building2 className="w-4 h-4" strokeWidth={1.8} /> City
                </button>
                <button onClick={() => switchMode('nearby')}
                  className={`flex items-center justify-center gap-2 py-3 text-[11px] font-bold tracking-[0.06em] uppercase transition-all duration-150 ${
                    searchMode === 'nearby' ? 'bg-white text-[#111]' : 'bg-transparent text-white/50 hover:text-white/70'
                  }`} data-testid="mode-nearby">
                  <Navigation className="w-4 h-4" strokeWidth={1.8} /> Nearby
                </button>
              </div>

              {searchMode === 'city' && (
                <div className="space-y-4" data-testid="search-bar">
                  <SearchDropdown label="City" icon={MapPin} value={selectedCity} placeholder="Select your city"
                    options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')}
                    onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="city-dropdown-trigger" />
                  {renderFormFields('mobile')}
                  <button onClick={handleExplore}
                    className="w-full flex items-center justify-center gap-3 py-[16px] text-[12px] font-bold text-[#0C0C0C] bg-[#C8A960] hover:bg-[#B99A50] transition-all duration-150 active:scale-[0.98] tracking-[0.1em] uppercase mt-2"
                    data-testid="explore-venues-btn">
                    Find My Venue <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <p className="text-center text-[11px] text-white/25 pt-1">Free venue matching. No pressure.</p>
                </div>
              )}

              {searchMode === 'nearby' && (
                <div className="space-y-4" data-testid="nearby-panel">
                  {geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-white/50">
                      <Loader2 className="w-5 h-5 animate-spin text-[#C8A960]" />
                      <span className="text-sm font-medium">Detecting location...</span>
                    </div>
                  )}
                  {geoError && <p className="text-sm text-amber-400 text-center py-2 font-medium">{geoError}</p>}
                  {geoCoords && !geoLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/15">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-sm font-medium">Location detected</span>
                    </div>
                  )}
                  {!geoCoords && !geoLoading && !geoError && (
                    <button onClick={handleGetLocation}
                      className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#C8A960]/30 text-[#C8A960] text-sm font-semibold hover:bg-[#C8A960]/5 transition-colors"
                      data-testid="get-location-btn">
                      <Navigation className="w-[18px] h-[18px]" strokeWidth={1.8} /> Enable Location
                    </button>
                  )}
                  {(geoCoords || geoLoading) && !geoError && (
                    <>
                      {renderFormFields('mobile')}
                      <button onClick={handleExplore} disabled={!geoCoords || geoLoading}
                        className="w-full flex items-center justify-center gap-3 py-[16px] text-[12px] font-bold text-[#0C0C0C] bg-[#C8A960] hover:bg-[#B99A50] disabled:opacity-40 transition-all tracking-[0.1em] uppercase mt-2"
                        data-testid="explore-nearby-btn">
                        Find My Venue <ArrowRight className="w-4 h-4" strokeWidth={2} />
                      </button>
                      <p className="text-center text-[11px] text-white/25 pt-1">Free venue matching. No pressure.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile trust strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3" data-testid="trust-strip">
              {[
                { icon: ShieldCheck, label: 'Verified Venues' },
                { icon: Eye, label: 'Transparent Pricing' },
                { icon: Headphones, label: 'Booking Support' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 px-3 py-2">
                  <t.icon className="w-3.5 h-3.5 text-[#C8A960]/80" strokeWidth={1.8} />
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.08em]">{t.label}</span>
                </div>
              ))}
            </div>

            <p className="text-center mt-4 text-[12px] text-white/30">
              or{' '}
              <button onClick={() => navigate('/venues/search')}
                className="text-[#C8A960]/80 hover:text-[#C8A960] font-medium underline underline-offset-4 decoration-[#C8A960]/20 transition-colors"
                data-testid="browse-all-link">browse all venues</button>
            </p>
          </div>
        </div>

        {/* ── DESKTOP HERO ── */}
        <div className="hidden lg:block">
          <div className="bg-[#0C0C0C] pt-24 pb-28 relative">
            <div className="max-w-[680px] mx-auto px-8 text-center relative z-10">
              <p className="text-[11px] font-semibold text-white/25 uppercase tracking-[0.3em] mb-8">India's Trusted Venue Platform</p>
              <h1 className="text-[5rem] font-medium leading-[0.98] tracking-[-0.025em] text-white mb-7 font-serif" data-testid="hero-headline">
                We Talk. <span className="text-[#C8A960]">You Lock.</span>
              </h1>
              <p className="text-[17px] leading-[1.65] max-w-[480px] mx-auto text-white/40">
                Tell us your event. We shortlist, compare, negotiate, and help you lock the right venue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DESKTOP SEARCH MODULE ═══ */}
      <section className="hidden lg:block bg-[#FAFAF9]" data-testid="search-section">
        <div className="max-w-[560px] mx-auto px-8 -mt-10 relative z-20 pb-16">
          <div className="bg-white border border-[#E5E5E5] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#C8A960]" />

            {/* Tab Toggle */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex border border-[#E2E2E2]">
                <button onClick={() => switchMode('city')}
                  className={`flex items-center gap-2 px-6 py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-150 ${
                    searchMode === 'city' ? 'bg-[#0C0C0C] text-white' : 'text-[#999] hover:text-[#666] bg-white'
                  }`} data-testid="desktop-mode-city">
                  <Building2 className="h-4 w-4" strokeWidth={1.8} /> City
                </button>
                <button onClick={() => switchMode('nearby')}
                  className={`flex items-center gap-2 px-6 py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-150 ${
                    searchMode === 'nearby' ? 'bg-[#0C0C0C] text-white' : 'text-[#999] hover:text-[#666] bg-white'
                  }`} data-testid="desktop-mode-nearby">
                  <Navigation className="h-4 w-4" strokeWidth={1.8} /> Nearby
                </button>
              </div>
            </div>

            {searchMode === 'city' && (
              <div className="space-y-3" data-testid="desktop-search-bar">
                <DesktopDropdown icon={MapPin} value={selectedCity} placeholder="Select City"
                  options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')}
                  onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="desktop-city-dropdown-trigger"
                  renderOption={(label) => (<div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />{label}</div>)} />
                <div className="grid grid-cols-2 gap-3">
                  {renderFormFields('desktop')}
                </div>
                <button onClick={handleExplore}
                  className="w-full flex items-center justify-center gap-3 py-[14px] text-[13px] font-bold text-[#0C0C0C] bg-[#C8A960] hover:bg-[#B99A50] transition-all duration-150 tracking-[0.08em] uppercase mt-1"
                  data-testid="desktop-explore-venues-btn">
                  Find My Venue <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
                <p className="text-center text-[12px] text-[#ACACAC] pt-0.5">Free venue matching. No booking pressure.</p>
              </div>
            )}

            {searchMode === 'nearby' && (
              <div className="space-y-3" data-testid="desktop-nearby-panel">
                {geoLoading && (
                  <div className="flex items-center gap-2 text-sm py-3 justify-center text-[#999]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#C8A960]" /> Detecting location...
                  </div>
                )}
                {geoError && <p className="text-sm text-amber-600 text-center py-2">{geoError}</p>}
                {geoCoords && !geoLoading && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 justify-center py-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Location detected
                  </div>
                )}
                {!geoCoords && !geoLoading && !geoError && (
                  <button onClick={handleGetLocation}
                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-[#C8A960]/40 text-[#C8A960] text-sm font-semibold hover:bg-[#C8A960]/5 transition-colors"
                    data-testid="desktop-get-location-btn">
                    <Navigation className="h-4 w-4" strokeWidth={1.8} /> Allow Location Access
                  </button>
                )}
                {(geoCoords || geoLoading) && !geoError && (
                  <>
                    <div className="grid grid-cols-2 gap-3">{renderFormFields('desktop')}</div>
                    <button onClick={handleExplore} disabled={!geoCoords || geoLoading}
                      className="w-full flex items-center justify-center gap-3 py-[14px] text-[13px] font-bold text-[#0C0C0C] bg-[#C8A960] hover:bg-[#B99A50] disabled:opacity-40 transition-all tracking-[0.08em] uppercase mt-1"
                      data-testid="desktop-explore-nearby-btn">
                      Find My Venue <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <p className="text-center text-[12px] text-[#ACACAC] pt-0.5">Free venue matching. No booking pressure.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop trust strip */}
          <div className="mt-7 flex items-center justify-center gap-6" data-testid="desktop-trust-strip">
            {[
              { icon: ShieldCheck, label: 'Verified Venues' },
              { icon: Eye, label: 'Transparent Pricing' },
              { icon: Headphones, label: 'Booking Support' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2">
                <t.icon className="w-[14px] h-[14px] text-[#C8A960]" strokeWidth={1.8} />
                <span className="text-[12px] font-medium text-[#999]">{t.label}</span>
              </div>
            ))}
          </div>

          <p className="text-center mt-4 text-[13px] text-[#ACACAC]">
            or{' '}
            <button onClick={() => navigate('/venues/search')}
              className="text-[#111] font-medium underline underline-offset-4 decoration-[#111]/20 hover:decoration-[#111]/50 transition-colors"
              data-testid="desktop-browse-all-link">browse all venues</button>
          </p>
        </div>
      </section>

      {/* ═══ WHY CHOOSE ═══ */}
      <section className="py-20 lg:py-28 bg-[#FAFAF9]" data-testid="why-choose-us">
        <div className="max-w-[960px] mx-auto px-5 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-[28px] lg:text-[34px] font-medium text-[#111] font-serif">Why VenuLock</h2>
            <p className="text-[15px] text-[#999] mt-3 max-w-md mx-auto">Everything you need to find and book the right venue, without the runaround.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {WHY_CHOOSE.map(item => (
              <div key={item.title} className="bg-white border border-[#EBEBEB] p-7 lg:p-8 hover:border-[#D5D5D5] transition-colors duration-200"
                data-testid={`why-card-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="w-10 h-10 bg-[#0C0C0C] flex items-center justify-center mb-5">
                  <item.icon className="w-[18px] h-[18px] text-white" strokeWidth={1.8} />
                </div>
                <h3 className="text-[16px] font-semibold text-[#111] mb-2">{item.title}</h3>
                <p className="text-[14px] leading-[1.65] text-[#888]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="py-16 lg:py-20 bg-[#0C0C0C]" data-testid="social-proof">
        <div className="max-w-[800px] mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {SOCIAL_PROOF.map(s => (
              <div key={s.label}>
                <div className="text-[32px] lg:text-[40px] font-medium text-white leading-none mb-2 font-serif">{s.value}</div>
                <div className="text-[11px] lg:text-[12px] text-white/35 font-medium tracking-[0.1em] uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-20 lg:py-28 bg-[#FAFAF9]" id="how-it-works" data-testid="how-it-works">
        <div className="max-w-[960px] mx-auto px-5 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-[28px] lg:text-[34px] font-medium text-[#111] font-serif">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center sm:text-left">
                <div className="text-[40px] lg:text-[48px] font-medium text-[#E8E8E8] leading-none mb-4 font-serif">{s.num}</div>
                <h3 className="text-[16px] font-semibold text-[#111] mb-2">{s.title}</h3>
                <p className="text-[14px] leading-[1.65] text-[#888]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VENUE EXPERTS ═══ */}
      <section className="py-20 lg:py-28 bg-white border-t border-[#F0F0F0]" data-testid="top-performers-section">
        <div className="max-w-[1080px] mx-auto px-5 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-[28px] lg:text-[34px] font-medium text-[#111] font-serif">Meet Your Venue Experts</h2>
            <p className="text-[15px] text-[#999] mt-3">Dedicated relationship managers who guide you from search to booking.</p>
          </div>

          {topPerformers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {topPerformers.map((rm, idx) => (
                <div key={rm.user_id}
                  className="bg-white border border-[#EBEBEB] p-6 hover:border-[#D5D5D5] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
                  data-testid={`top-performer-card-${idx}`}>
                  <div className="flex items-start gap-4 mb-5">
                    <img src={rm.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(rm.name)}&background=111111&color=fff&size=56`}
                      alt={rm.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#F0F0F0] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-[#111]">{rm.name}</h3>
                      <p className="text-[13px] mt-0.5 text-[#999]">{rm.city_focus}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="h-3 w-3 fill-[#C8A960] text-[#C8A960]" />
                        <span className="text-[12px] font-semibold text-[#111]">{rm.rating}</span>
                        <span className="text-[11px] text-[#ACACAC] ml-1">{rm.events_closed} events</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(rm.languages || []).map(lang => (
                      <span key={lang} className="px-2.5 py-1 bg-[#F5F5F5] text-[11px] text-[#888] font-medium">{lang}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#ACACAC] text-sm">Loading venue experts...</div>
          )}
        </div>
      </section>

      {/* ═══ PLATFORM CAPABILITIES ═══ */}
      <section className="py-20 lg:py-28 bg-[#FAFAF9] border-t border-[#F0F0F0]" data-testid="platform-advantage">
        <div className="max-w-[1080px] mx-auto px-5 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-[28px] lg:text-[34px] font-medium text-[#111] font-serif">Platform Capabilities</h2>
            <p className="text-[15px] text-[#999] mt-3">Built for modern event planning at scale.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
            {CAPABILITIES.map(cap => (
              <div key={cap.title} className="bg-white border border-[#EBEBEB] p-7 hover:border-[#D5D5D5] transition-colors duration-200" data-testid="capability-card">
                <cap.icon className="h-5 w-5 mb-4 text-[#111]" strokeWidth={1.8} />
                <h3 className="text-[15px] font-semibold text-[#111] mb-2">{cap.title}</h3>
                <p className="text-[14px] leading-[1.65] text-[#888]">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BROWSE BY CITY ═══ */}
      <section className="py-20 lg:py-28 bg-white border-t border-[#F0F0F0]" data-testid="city-coverage">
        <div className="max-w-[1080px] mx-auto px-5 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-[28px] lg:text-[34px] font-medium text-[#111] font-serif">Browse by City</h2>
            <button onClick={() => navigate('/venues/search')}
              className="text-[13px] flex items-center gap-1 text-[#999] hover:text-[#111] transition-colors group"
              data-testid="view-all-cities-btn">
              All cities <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            {(citiesData.length > 0
              ? citiesData.map(c => ({ name: c.city, venues: c.venue_count }))
              : FALLBACK_CITIES.slice(0, 8).map(c => ({ name: c, venues: '-' }))
            ).map(c => (
              <button key={c.name} onClick={() => navigate(`/venues/search?city=${c.name}`)}
                className="text-left border border-[#EBEBEB] px-5 py-4 hover:border-[#111] transition-all duration-200 group bg-white"
                data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="text-[15px] font-semibold text-[#111] group-hover:text-[#111]">{c.name}</div>
                <div className="text-[13px] mt-0.5 text-[#ACACAC]">{c.venues} venues</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WORK WITH US ═══ */}
      <section className="py-20 lg:py-28 bg-[#FAFAF9] border-t border-[#F0F0F0]" data-testid="work-with-us">
        <div className="max-w-[1080px] mx-auto px-5 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-[28px] lg:text-[34px] font-medium text-[#111] font-serif">Grow With VenuLock</h2>
            <p className="text-[15px] text-[#999] mt-3">Join our ecosystem as a venue partner or event management company.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
            {/* List Your Venue */}
            <div className="bg-[#0C0C0C] p-8 lg:p-10" data-testid="list-venue-cta">
              <div className="w-10 h-10 bg-[#C8A960]/15 flex items-center justify-center mb-6">
                <Building2 className="h-5 w-5 text-[#C8A960]" strokeWidth={1.8} />
              </div>
              <h3 className="text-[20px] font-semibold text-white mb-3 font-serif">List Your Venue</h3>
              <p className="text-white/45 text-[14px] mb-7 leading-[1.65]">
                Get qualified leads from thousands of event planners. We handle discovery and follow-up.
              </p>
              <ul className="space-y-2.5 mb-8">
                {['Free to list', 'Dedicated RM manages bookings', 'Commission on confirmed bookings only'].map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-[14px] text-white/50">
                    <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" strokeWidth={1.8} />{p}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/list-your-venue')}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-[12px] font-bold bg-[#C8A960] text-[#0C0C0C] hover:bg-[#B99A50] transition-colors duration-150 tracking-[0.08em] uppercase"
                data-testid="list-venue-btn">Apply to List <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
            </div>
            {/* Partner */}
            <div className="bg-white border border-[#E5E5E5] p-8 lg:p-10" data-testid="partner-cta">
              <div className="w-10 h-10 bg-[#F5F5F5] flex items-center justify-center mb-6">
                <Handshake className="h-5 w-5 text-[#111]" strokeWidth={1.8} />
              </div>
              <h3 className="text-[20px] font-semibold text-[#111] mb-3 font-serif">Partner With Us</h3>
              <p className="text-[#888] text-[14px] mb-7 leading-[1.65]">
                Join our network and unlock access to premium venues, co-marketing, and shared pipeline.
              </p>
              <ul className="space-y-2.5 mb-8">
                {['Access 500+ curated venues', 'Co-branded marketing', 'Dedicated account management'].map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-[14px] text-[#666]">
                    <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" strokeWidth={1.8} />{p}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/partner')}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-[12px] font-bold bg-[#0C0C0C] text-white hover:bg-[#222] transition-colors duration-150 tracking-[0.08em] uppercase"
                data-testid="partner-btn">Become a Partner <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 lg:py-28 bg-[#0C0C0C]" data-testid="final-cta">
        <div className="max-w-[640px] mx-auto px-5 lg:px-8 text-center">
          <h2 className="text-[28px] lg:text-[36px] font-medium text-white mb-4 font-serif">Ready to lock your venue?</h2>
          <p className="text-[15px] text-white/35 mb-10">Get started in under 2 minutes. No payment required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-8 py-4 text-[12px] font-bold bg-[#C8A960] text-[#0C0C0C] hover:bg-[#B99A50] transition-colors duration-150 tracking-[0.08em] uppercase"
              data-testid="final-cta-booking">Start Booking <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
            <ConnectButton className="px-8 py-4 text-[12px] font-bold border border-white/15 text-white/50 hover:text-white hover:border-white/30 tracking-[0.08em] uppercase transition-colors duration-150" />
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[#F0F0F0] py-12 bg-white" data-testid="main-footer">
        <div className="max-w-[1080px] mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center mb-4">
                <span className="text-[14px] font-extrabold tracking-[0.18em] text-[#111]">VENU</span>
                <span className="w-[1.5px] h-[14px] bg-[#C8A960] mx-[6px]" />
                <span className="text-[14px] font-extrabold tracking-[0.18em] text-[#C8A960]">LOCK</span>
              </div>
              <p className="text-[12px] text-[#ACACAC]">We Talk. You Lock.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#ACACAC] mb-4">Platform</h4>
              <ul className="space-y-2">
                {[
                  { l: 'Browse Venues', h: '/venues/search' },
                  { l: 'How It Works', h: '/#how-it-works', isAnchor: true },
                  { l: 'List Your Venue', h: '/list-your-venue' },
                  { l: 'Partner With Us', h: '/partner' },
                ].map(x => (
                  <li key={x.l}>
                    <button onClick={() => {
                      if (x.isAnchor) {
                        const el = document.getElementById('how-it-works');
                        if (el) el.scrollIntoView({ behavior: 'smooth' }); else navigate('/');
                      } else { navigate(x.h); }
                    }} className="text-[13px] text-[#888] hover:text-[#111] transition-colors text-left"
                      data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#ACACAC] mb-4">Company</h4>
              <ul className="space-y-2">
                {[
                  { l: 'Contact', h: '/contact' },
                  { l: 'Support', h: '/support' },
                  { l: 'Privacy', h: '/privacy' },
                  { l: 'Terms', h: '/terms' },
                ].map(x => (
                  <li key={x.l}>
                    <button onClick={() => navigate(x.h)}
                      className="text-[13px] text-[#888] hover:text-[#111] transition-colors text-left"
                      data-testid={`footer-link-${x.l.toLowerCase()}`}>{x.l}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#ACACAC] mb-4">Cities</h4>
              <ul className="space-y-2">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad'].map(c => (
                  <li key={c}>
                    <button onClick={() => navigate(`/venues/search?city=${c}`)}
                      className="text-[13px] text-[#888] hover:text-[#111] transition-colors text-left"
                      data-testid={`footer-city-${c.toLowerCase().replace(/\s/g, '-')}`}>{c}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#F0F0F0] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-[#ACACAC]">&copy; {new Date().getFullYear()} VenuLock. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/privacy')} className="text-[12px] text-[#ACACAC] hover:text-[#111] transition-colors" data-testid="footer-privacy-policy">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-[12px] text-[#ACACAC] hover:text-[#111] transition-colors" data-testid="footer-terms-of-service">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
