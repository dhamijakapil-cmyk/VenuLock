import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight,
  CheckCircle2, RefreshCw, GitCompare, ShieldCheck, Lock,
  Star, ChevronRight, Building2, Navigation, Loader2, Handshake,
  Menu, X, ChevronDown,
  Target, Headphones, Eye, Users, Calendar
} from 'lucide-react';
import { ConnectButton } from '../components/ConnectButton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FALLBACK_CITIES = [
  'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
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
  { num: '02', title: 'Compare curated venues', desc: 'We shortlist the best-fit venues with transparent pricing.' },
  { num: '03', title: 'Lock your venue', desc: 'Your dedicated manager handles negotiation and confirmation.' },
];

const WHY_CHOOSE = [
  { icon: Target, title: 'Curated Matches', desc: 'Venues matched to your event type, budget, and guest count — not a random list.' },
  { icon: GitCompare, title: 'Smart Comparison', desc: 'Compare pricing, amenities, and availability side-by-side in one view.' },
  { icon: Headphones, title: 'End-to-End Support', desc: 'A dedicated manager handles your entire booking from search to confirmation.' },
];

const CAPABILITIES = [
  { icon: RefreshCw, title: 'Real-Time Availability', desc: 'Live calendar sync. Check open dates without a single phone call.' },
  { icon: GitCompare, title: 'Side-by-Side Comparison', desc: 'Pricing, capacity, amenities, and reviews — all in one structured view.' },
  { icon: ShieldCheck, title: 'Venue Verification', desc: 'Every venue audited on-ground. Photos, capacity, and pricing verified.' },
  { icon: Lock, title: 'Secure Escrow', desc: 'Platform-managed payments protect both parties until confirmation.' }
];

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-[800ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: vis ? `${delay}ms` : '0ms' }}>{children}</div>
  );
}

function MobileDropdown({ label, icon: Icon, value, placeholder, options, isOpen, onToggle, onSelect, testId }) {
  return (
    <div className="relative" data-dropdown>
      {label && <label className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-semibold mb-1.5 block">{label}</label>}
      <button onClick={onToggle} data-testid={testId}
        className={`w-full flex items-center justify-between px-4 py-[14px] border transition-all duration-150 ${isOpen ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
        <div className="flex items-center gap-3">
          <Icon className="w-[17px] h-[17px] text-[#C8A960]/80 flex-shrink-0" strokeWidth={1.5} />
          <span className={`text-[14px] ${value ? 'text-white/90 font-medium' : 'text-white/30'}`}>{value || placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/25 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-px bg-[#1A1A1A] border border-white/[0.08] z-50 max-h-52 overflow-y-auto shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {options.map(opt => {
            const v = typeof opt === 'string' ? opt : opt.value;
            const l = typeof opt === 'string' ? opt : opt.label;
            return (
              <button key={v} onClick={() => onSelect(v === value ? '' : v)}
                className={`w-full text-left px-4 py-3 text-[14px] transition-colors ${value === v ? 'bg-[#C8A960] text-[#0A0A0A] font-semibold' : 'text-white/45 hover:bg-white/[0.04] hover:text-white/65'}`}
                data-testid={`${testId}-option-${v.toLowerCase().replace(/[\s\/]+/g, '-')}`}>{l}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineField({ label, value, placeholder, icon: Icon, options, isOpen, onToggle, onSelect, testId, hasBorder = true }) {
  return (
    <div className={`relative flex-1 min-w-0 ${hasBorder ? 'border-r border-[#EBEBEB]' : ''}`} data-dropdown>
      <button onClick={onToggle} data-testid={testId}
        className={`w-full flex items-center gap-3.5 px-6 py-0 h-[76px] text-left transition-colors duration-100 ${isOpen ? 'bg-[#F7F7F5]' : 'hover:bg-[#FAFAF8]'}`}>
        <Icon className="w-[17px] h-[17px] text-[#BFBFBF] flex-shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BFBFBF] mb-[2px]">{label}</div>
          <div className={`text-[15px] truncate ${value ? 'text-[#111] font-medium' : 'text-[#D0D0D0]'}`}>{value || placeholder}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#D0D0D0] transition-transform duration-150 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 min-w-[260px] mt-1 bg-white border border-[#E5E5E5] shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-50 max-h-64 overflow-y-auto">
          {options.map(opt => {
            const v = typeof opt === 'string' ? opt : opt.value;
            const l = typeof opt === 'string' ? opt : opt.label;
            return (
              <button key={v} onClick={() => onSelect(v === value ? '' : v)}
                className={`w-full text-left px-5 py-3 text-[14px] transition-colors ${value === v ? 'bg-[#0A0A0A] text-white font-medium' : 'text-[#555] hover:bg-[#F7F7F5]'}`}
                data-testid={`${testId}-option-${v.toLowerCase().replace(/[\s\/]+/g, '-')}`}>{l}</button>
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
    const h = (e) => { if (!e.target.closest('[data-dropdown]')) setActiveDropdown(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/venues/cities`).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setCitiesData(data);
        setCityNames(data.flatMap(c => c.city === 'Delhi' ? ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'] : [c.city]));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/rms/top-performers`).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) setTopPerformers(data);
    }).catch(() => {});
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => { setGeoError('Location unavailable.'); setGeoLoading(false); setTimeout(() => { setSearchMode('city'); setGeoError(''); }, 2000); }
    );
  };

  const DELHI_SUBS = ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'];
  const handleExplore = () => {
    const p = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) p.set('city', DELHI_SUBS.includes(selectedCity) ? 'Delhi' : selectedCity);
    else if (searchMode === 'nearby' && geoCoords) { p.set('lat', geoCoords.lat.toString()); p.set('lng', geoCoords.lng.toString()); p.set('radius', radius); }
    if (eventType) p.set('event_type', eventType);
    if (guestCount) p.set('guests', guestCount);
    navigate(`/venues/search?${p.toString()}`);
  };

  const switchMode = (mode) => {
    setSearchMode(mode); setActiveDropdown(null); setGeoError('');
    if (mode === 'nearby' && !geoCoords) handleGetLocation();
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ══ MOBILE HEADER ══ */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-[#0A0A0A]" data-testid="mobile-header">
        <div className="flex items-center justify-between px-5 h-[56px]">
          <button onClick={() => navigate('/')} className="flex items-baseline" data-testid="logo-btn">
            <span className="font-serif italic text-[18px] font-medium text-white tracking-[-0.01em]">Venu</span>
            <span className="font-serif italic text-[18px] font-medium text-[#C8A960] tracking-[-0.01em]">Lock</span>
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 flex items-center justify-center" data-testid="mobile-menu-toggle">
            {mobileMenuOpen ? <X className="w-5 h-5 text-white/50" /> : <Menu className="w-5 h-5 text-white/50" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#0A0A0A] border-t border-white/[0.05] px-5 py-5 space-y-1">
            {[{ label: 'Sign In', to: '/login' }, { label: 'Browse Venues', to: '/venues/search' }, { label: 'List Your Venue', to: '/list-your-venue' }].map(item => (
              <button key={item.label} onClick={() => { navigate(item.to); setMobileMenuOpen(false); }}
                className="block w-full text-left text-white/35 hover:text-white py-3 text-[15px] font-medium transition-colors">{item.label}</button>
            ))}
            <div className="pt-4 border-t border-white/[0.05]">
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                className="w-full py-3 text-[11px] font-bold bg-[#C8A960] text-[#0A0A0A] tracking-[0.08em] uppercase">Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* ══ DESKTOP HEADER ══ */}
      <header className="hidden lg:block sticky top-0 z-[9999] bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/[0.04]" data-testid="main-header">
        <div className="max-w-[1320px] mx-auto px-12 flex h-[68px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-baseline" data-testid="desktop-logo-btn">
            <span className="font-serif italic text-[24px] font-medium text-white tracking-[-0.01em]">Venu</span>
            <span className="font-serif italic text-[24px] font-medium text-[#C8A960] tracking-[-0.01em]">Lock</span>
          </button>
          <div className="flex items-center gap-10">
            <button onClick={() => navigate('/venues/search')} className="text-[13px] text-white/35 hover:text-white/70 transition-colors duration-200 font-medium">Browse Venues</button>
            <button onClick={() => navigate('/login')} className="text-[13px] text-white/35 hover:text-white/70 transition-colors duration-200 font-medium" data-testid="login-btn">Sign In</button>
            <button onClick={() => navigate('/register')}
              className="text-[12px] font-bold text-[#0A0A0A] px-7 py-2.5 bg-[#C8A960] hover:bg-[#BF9F52] transition-colors duration-200 tracking-[0.06em] uppercase"
              data-testid="get-started-btn">Get Started</button>
          </div>
        </div>
      </header>

      {/* ══ HERO + SEARCH (ONE BLOCK ON DESKTOP) ══ */}
      <section data-testid="hero-section">

        {/* ── Mobile Hero ── */}
        <div className="lg:hidden pt-[56px]">
          <div className="bg-[#0A0A0A] px-5 pt-16 pb-20 relative overflow-hidden noise-overlay">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_10%,rgba(200,169,96,0.04)_0%,transparent_70%)]" />
            <div className="relative z-10 text-center">
              <h1 className="text-[3rem] font-medium text-white leading-[0.95] mb-5 font-serif tracking-[-0.02em]">
                We Talk.<br /><span className="text-[#C8A960]" style={{ textShadow: '0 0 60px rgba(200,169,96,0.12)' }}>You Lock.</span>
              </h1>
              <p className="text-white/30 text-[15px] leading-[1.65] max-w-[280px] mx-auto">Tell us your event. We find, compare, and lock the right venue.</p>
            </div>
          </div>
          {/* Mobile Search Card */}
          <div className="bg-[#0F0F0F] px-5 pb-8">
            <div className="bg-[#171717] border border-white/[0.06] p-5 -mt-6 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
              <div className="flex border border-white/[0.08] mb-6">
                <button onClick={() => switchMode('city')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold tracking-[0.04em] uppercase transition-all duration-150 ${searchMode === 'city' ? 'bg-white text-[#0A0A0A]' : 'text-white/40'}`}
                  data-testid="mode-city"><Building2 className="w-3.5 h-3.5" strokeWidth={1.8} /> City</button>
                <button onClick={() => switchMode('nearby')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold tracking-[0.04em] uppercase transition-all duration-150 ${searchMode === 'nearby' ? 'bg-white text-[#0A0A0A]' : 'text-white/40'}`}
                  data-testid="mode-nearby"><Navigation className="w-3.5 h-3.5" strokeWidth={1.8} /> Nearby</button>
              </div>
              {searchMode === 'city' && (
                <div className="space-y-3.5" data-testid="search-bar">
                  <MobileDropdown label="City" icon={MapPin} value={selectedCity} placeholder="Select your city"
                    options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')}
                    onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="city-dropdown-trigger" />
                  <MobileDropdown label="Event Type" icon={Calendar} value={eventType} placeholder="Select event type"
                    options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')}
                    onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="mobile-event-type-dropdown" />
                  <MobileDropdown label="Guests" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''}
                    placeholder="Expected guests" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'}
                    onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="mobile-guest-count-dropdown" />
                  <button onClick={handleExplore}
                    className="w-full flex items-center justify-center gap-2.5 py-[14px] text-[12px] font-bold text-white bg-[#0A0A0A] border border-white/[0.15] hover:bg-[#1A1A1A] transition-all duration-150 active:scale-[0.98] tracking-[0.06em] uppercase mt-1"
                    data-testid="explore-venues-btn">Find My Venue <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                  <p className="text-center text-[11px] text-white/20">Free. No booking pressure.</p>
                </div>
              )}
              {searchMode === 'nearby' && (
                <div className="space-y-3.5" data-testid="nearby-panel">
                  {geoLoading && <div className="flex items-center justify-center gap-2 py-4 text-white/40"><Loader2 className="w-4 h-4 animate-spin text-[#C8A960]" /><span className="text-sm">Detecting location...</span></div>}
                  {geoError && <p className="text-sm text-amber-400 text-center py-2">{geoError}</p>}
                  {geoCoords && !geoLoading && <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/10"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-sm font-medium">Location detected</span></div>}
                  {!geoCoords && !geoLoading && !geoError && (
                    <button onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#C8A960]/25 text-[#C8A960] text-sm font-medium hover:bg-[#C8A960]/5 transition-colors" data-testid="get-location-btn">
                      <Navigation className="w-4 h-4" strokeWidth={1.8} /> Enable Location</button>
                  )}
                  {(geoCoords || geoLoading) && !geoError && (
                    <>
                      <MobileDropdown label="Event Type" icon={Calendar} value={eventType} placeholder="Select event type"
                        options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')}
                        onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="mobile-event-type-dropdown" />
                      <MobileDropdown label="Guests" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''}
                        placeholder="Expected guests" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'}
                        onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="mobile-guest-count-dropdown" />
                      <button onClick={handleExplore} disabled={!geoCoords || geoLoading}
                        className="w-full flex items-center justify-center gap-2.5 py-[14px] text-[12px] font-bold text-white bg-[#0A0A0A] border border-white/[0.15] disabled:opacity-30 transition-all tracking-[0.06em] uppercase mt-1"
                        data-testid="explore-nearby-btn">Find My Venue <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                      <p className="text-center text-[11px] text-white/20">Free. No booking pressure.</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 text-center text-[11px] text-white/20" data-testid="trust-strip">
              500+ Verified Venues
              <span className="inline-block w-[3px] h-[3px] bg-white/15 rounded-full mx-3 align-middle" />
              Transparent Pricing
              <span className="inline-block w-[3px] h-[3px] bg-white/15 rounded-full mx-3 align-middle" />
              <button onClick={() => navigate('/venues/search')} className="text-white/35 underline underline-offset-2 decoration-white/10" data-testid="browse-all-link">Browse All</button>
            </div>
          </div>
        </div>

        {/* ── Desktop: Hero + Search as ONE dark block ── */}
        <div className="hidden lg:block" data-testid="search-section">
          <div className="bg-[#0A0A0A] pt-14 pb-14 relative noise-overlay">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(200,169,96,0.03)_0%,transparent_60%)]" />

            {/* Headline */}
            <div className="max-w-[860px] mx-auto px-10 text-center relative z-10">
              <h1 className="text-[6.5rem] font-medium leading-[0.92] tracking-[-0.035em] text-white font-serif" data-testid="hero-headline">
                We Talk.<br /><span className="text-[#C8A960]" style={{ textShadow: '0 0 80px rgba(200,169,96,0.1)' }}>You Lock.</span>
              </h1>
              <p className="text-[17px] leading-[1.6] max-w-[400px] mx-auto text-white/28 mt-6">
                Tell us your event. We find, compare, and lock the right venue for you.
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-[860px] mx-auto px-10 mt-10 relative z-10">
              <div className="flex items-center justify-center gap-5 mb-4 text-[13px]">
                <button onClick={() => switchMode('city')}
                  className={`transition-colors duration-150 ${searchMode === 'city' ? 'text-white font-semibold' : 'text-white/30 hover:text-white/50'}`}
                  data-testid="desktop-mode-city">Search by City</button>
                <span className="text-white/15">|</span>
                <button onClick={() => switchMode('nearby')}
                  className={`transition-colors duration-150 ${searchMode === 'nearby' ? 'text-white font-semibold' : 'text-white/30 hover:text-white/50'}`}
                  data-testid="desktop-mode-nearby">Use My Location</button>
              </div>

              <div className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.1)] flex items-stretch" data-testid="desktop-search-bar">
                {searchMode === 'city' ? (
                  <InlineField label="City" value={selectedCity} placeholder="Any city" icon={MapPin}
                    options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')}
                    onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="desktop-city-dropdown-trigger" />
                ) : (
                  <div className="relative flex-1 min-w-0 border-r border-[#EBEBEB]" data-dropdown>
                    {geoCoords ? (
                      <div className="flex items-center gap-3.5 px-6 h-[76px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                        <div><div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BFBFBF] mb-[2px]">Location</div><div className="text-[15px] font-medium text-emerald-600">Detected</div></div>
                      </div>
                    ) : geoLoading ? (
                      <div className="flex items-center gap-3.5 px-6 h-[76px]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#C8A960] flex-shrink-0" />
                        <div><div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BFBFBF] mb-[2px]">Location</div><div className="text-[15px] text-[#999]">Detecting...</div></div>
                      </div>
                    ) : geoError ? (
                      <div className="flex items-center gap-3.5 px-6 h-[76px]"><div className="text-[14px] text-amber-600">{geoError}</div></div>
                    ) : (
                      <button onClick={handleGetLocation} className="flex items-center gap-3.5 px-6 h-[76px] w-full text-left hover:bg-[#FAFAF8] transition-colors" data-testid="desktop-get-location-btn">
                        <Navigation className="w-4 h-4 text-[#C8A960] flex-shrink-0" strokeWidth={1.5} />
                        <div><div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BFBFBF] mb-[2px]">Location</div><div className="text-[15px] text-[#C8A960] font-medium">Enable Access</div></div>
                      </button>
                    )}
                  </div>
                )}
                <InlineField label="Event" value={eventType} placeholder="Any type" icon={Calendar}
                  options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')}
                  onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="desktop-event-type-dropdown" />
                <InlineField label="Guests" value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''} placeholder="Any size" icon={Users}
                  options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'} onToggle={() => toggleDropdown('guestCount')}
                  onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="desktop-guest-count-dropdown" hasBorder={false} />
                <button onClick={handleExplore} disabled={searchMode === 'nearby' && !geoCoords}
                  className="px-10 bg-[#C8A960] text-[#0A0A0A] flex items-center gap-2.5 text-[13px] font-bold tracking-[0.06em] uppercase whitespace-nowrap hover:bg-[#BF9F52] disabled:opacity-30 transition-colors duration-150 flex-shrink-0"
                  data-testid="desktop-explore-venues-btn">
                  Find Venue <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-5 text-center text-[12px] text-white/22" data-testid="desktop-trust-strip">
                500+ Verified Venues
                <span className="inline-block w-[3px] h-[3px] bg-white/15 rounded-full mx-4 align-middle" />
                Transparent Pricing
                <span className="inline-block w-[3px] h-[3px] bg-white/15 rounded-full mx-4 align-middle" />
                End-to-End Support
                <span className="inline-block w-[3px] h-[3px] bg-white/15 rounded-full mx-4 align-middle" />
                <button onClick={() => navigate('/venues/search')} className="text-white/40 font-medium underline underline-offset-3 decoration-white/15 hover:text-white/60 transition-colors" data-testid="desktop-browse-all-link">Browse All</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHY VENULOCK ══ */}
      <section className="py-16 lg:py-20 bg-[#FAFAF9]" data-testid="why-choose-us">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-12">
              <h2 className="text-[28px] lg:text-[36px] font-medium text-[#111] font-serif leading-[1.1]">Why VenuLock</h2>
              <p className="text-[15px] text-[#999] mt-3 max-w-[420px] mx-auto leading-[1.6]">Everything you need to find and book the right venue.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-px bg-[#EBEBEB]">
            {WHY_CHOOSE.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="bg-white p-7 lg:p-8" data-testid={`why-card-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="w-10 h-10 bg-[#0A0A0A] flex items-center justify-center mb-5">
                    <item.icon className="w-[17px] h-[17px] text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#111] mb-2 font-sans">{item.title}</h3>
                  <p className="text-[14px] leading-[1.65] text-[#888]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SOCIAL PROOF ══ */}
      <section className="py-12 lg:py-14 bg-[#0A0A0A]" data-testid="social-proof">
        <Reveal>
          <div className="max-w-[800px] mx-auto px-5 lg:px-10 grid grid-cols-3 text-center">
            {[{ val: '500+', label: 'Venues Listed' }, { val: '100%', label: 'Verified Partners' }, { val: 'End-to-End', label: 'Booking Support' }].map(s => (
              <div key={s.label}>
                <div className="text-[32px] lg:text-[44px] font-medium text-white leading-none font-serif">{s.val}</div>
                <div className="text-[10px] lg:text-[11px] text-white/25 font-medium tracking-[0.1em] uppercase mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="py-16 lg:py-20 bg-white" id="how-it-works" data-testid="how-it-works">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <Reveal><div className="text-center mb-10 lg:mb-14"><h2 className="text-[28px] lg:text-[36px] font-medium text-[#111] font-serif leading-[1.1]">How It Works</h2></div></Reveal>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 100}>
                <div className="text-center sm:text-left">
                  <div className="text-[52px] lg:text-[64px] font-medium text-[#F0F0F0] leading-none font-serif select-none">{s.num}</div>
                  <h3 className="text-[16px] font-semibold text-[#111] mt-1 mb-2 font-sans">{s.title}</h3>
                  <p className="text-[14px] leading-[1.65] text-[#888]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VENUE EXPERTS ══ */}
      <section className="py-16 lg:py-20 bg-[#FAFAF9] border-t border-[#F0F0F0]" data-testid="top-performers-section">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10">
              <h2 className="text-[28px] lg:text-[36px] font-medium text-[#111] font-serif leading-[1.1]">Meet Your Venue Experts</h2>
              <p className="text-[15px] text-[#999] mt-3">Dedicated managers who guide you from search to booking.</p>
            </div>
          </Reveal>
          {topPerformers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#EBEBEB]">
              {topPerformers.map((rm, idx) => (
                <Reveal key={rm.user_id} delay={idx * 60}>
                  <div className="bg-white p-6" data-testid={`top-performer-card-${idx}`}>
                    <div className="flex items-start gap-3.5 mb-4">
                      <img src={rm.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(rm.name)}&background=0A0A0A&color=fff&size=44`}
                        alt={rm.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-[#111]">{rm.name}</h3>
                        <p className="text-[13px] text-[#999] mt-0.5">{rm.city_focus}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-[#C8A960] text-[#C8A960]" />
                          <span className="text-[12px] font-semibold text-[#111]">{rm.rating}</span>
                          <span className="text-[11px] text-[#BFBFBF] ml-1">{rm.events_closed} events</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(rm.languages || []).map(lang => (
                        <span key={lang} className="px-2.5 py-1 bg-[#F5F5F3] text-[11px] text-[#999] font-medium">{lang}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-[#BFBFBF] text-sm">Loading venue experts...</div>
          )}
        </div>
      </section>

      {/* ══ PLATFORM CAPABILITIES ══ */}
      <section className="py-16 lg:py-20 bg-white border-t border-[#F0F0F0]" data-testid="platform-advantage">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-12">
              <h2 className="text-[28px] lg:text-[36px] font-medium text-[#111] font-serif leading-[1.1]">Platform Capabilities</h2>
              <p className="text-[15px] text-[#999] mt-3">Built for modern event planning at scale.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-px bg-[#EBEBEB]">
            {CAPABILITIES.map((cap, i) => (
              <Reveal key={cap.title} delay={i * 60}>
                <div className="bg-white p-7 lg:p-8" data-testid="capability-card">
                  <cap.icon className="h-5 w-5 mb-4 text-[#0A0A0A]" strokeWidth={1.5} />
                  <h3 className="text-[15px] font-semibold text-[#111] mb-2 font-sans">{cap.title}</h3>
                  <p className="text-[14px] leading-[1.65] text-[#888]">{cap.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BROWSE BY CITY ══ */}
      <section className="py-16 lg:py-20 bg-[#FAFAF9] border-t border-[#F0F0F0]" data-testid="city-coverage">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-[28px] lg:text-[36px] font-medium text-[#111] font-serif leading-[1.1]">Browse by City</h2>
              <button onClick={() => navigate('/venues/search')} className="text-[13px] flex items-center gap-1 text-[#BFBFBF] hover:text-[#111] transition-colors group" data-testid="view-all-cities-btn">
                All cities <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" /></button>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            {(citiesData.length > 0 ? citiesData.map(c => ({ name: c.city, venues: c.venue_count })) : FALLBACK_CITIES.slice(0, 8).map(c => ({ name: c, venues: '-' }))).map((c, i) => (
              <Reveal key={c.name} delay={i * 40}>
                <button onClick={() => navigate(`/venues/search?city=${c.name}`)}
                  className="text-left w-full border border-[#EBEBEB] bg-white px-5 py-4 hover:border-[#0A0A0A] transition-all duration-200 group"
                  data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="text-[15px] font-semibold text-[#111] font-sans">{c.name}</div>
                  <div className="text-[13px] mt-0.5 text-[#BFBFBF]">{c.venues} venues</div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WORK WITH US ══ */}
      <section className="py-16 lg:py-20 bg-white border-t border-[#F0F0F0]" data-testid="work-with-us">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <Reveal><div className="text-center mb-10"><h2 className="text-[28px] lg:text-[36px] font-medium text-[#111] font-serif leading-[1.1]">Grow With VenuLock</h2><p className="text-[15px] text-[#999] mt-3">Join our ecosystem as a venue partner or event management company.</p></div></Reveal>
          <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
            <Reveal>
              <div className="bg-[#0A0A0A] p-8 lg:p-10 h-full" data-testid="list-venue-cta">
                <Building2 className="h-5 w-5 text-[#C8A960] mb-5" strokeWidth={1.2} />
                <h3 className="text-[20px] font-medium text-white mb-3 font-serif">List Your Venue</h3>
                <p className="text-white/35 text-[14px] mb-6 leading-[1.65]">Get qualified leads from event planners. We handle discovery and follow-up.</p>
                <ul className="space-y-2 mb-7">
                  {['Free to list', 'Dedicated RM manages bookings', 'Commission on confirmed bookings only'].map(p => (
                    <li key={p} className="flex items-center gap-2.5 text-[14px] text-white/40"><CheckCircle2 className="h-3.5 w-3.5 text-[#C8A960] flex-shrink-0" strokeWidth={1.5} />{p}</li>
                  ))}
                </ul>
                <button onClick={() => navigate('/list-your-venue')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-[11px] font-bold bg-[#C8A960] text-[#0A0A0A] hover:bg-[#BF9F52] transition-colors duration-150 tracking-[0.06em] uppercase"
                  data-testid="list-venue-btn">Apply to List <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="bg-white border border-[#EBEBEB] p-8 lg:p-10 h-full" data-testid="partner-cta">
                <Handshake className="h-5 w-5 text-[#0A0A0A] mb-5" strokeWidth={1.2} />
                <h3 className="text-[20px] font-medium text-[#111] mb-3 font-serif">Partner With Us</h3>
                <p className="text-[#888] text-[14px] mb-6 leading-[1.65]">Join our network for premium venue access, co-marketing, and shared pipeline.</p>
                <ul className="space-y-2 mb-7">
                  {['Access 500+ curated venues', 'Co-branded marketing', 'Dedicated account management'].map(p => (
                    <li key={p} className="flex items-center gap-2.5 text-[14px] text-[#888]"><CheckCircle2 className="h-3.5 w-3.5 text-[#C8A960] flex-shrink-0" strokeWidth={1.5} />{p}</li>
                  ))}
                </ul>
                <button onClick={() => navigate('/partner')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-[11px] font-bold bg-[#0A0A0A] text-white hover:bg-[#222] transition-colors duration-150 tracking-[0.06em] uppercase"
                  data-testid="partner-btn">Become a Partner <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section className="py-16 lg:py-20 bg-[#0A0A0A]" data-testid="final-cta">
        <Reveal>
          <div className="max-w-[560px] mx-auto px-5 lg:px-10 text-center">
            <h2 className="text-[28px] lg:text-[36px] font-medium text-white font-serif leading-[1.1]">Ready to lock your venue?</h2>
            <p className="text-[15px] text-white/25 mt-3 mb-8">Get started in under 2 minutes. Free, no commitment.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-8 py-4 text-[12px] font-bold bg-[#C8A960] text-[#0A0A0A] hover:bg-[#BF9F52] transition-colors duration-150 tracking-[0.06em] uppercase"
                data-testid="final-cta-booking">Start Booking <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
              <ConnectButton className="px-8 py-4 text-[12px] font-bold border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 tracking-[0.06em] uppercase transition-colors duration-150" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-10 bg-[#0A0A0A] border-t border-white/[0.04]" data-testid="main-footer">
        <div className="max-w-[1140px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-baseline mb-3">
                <span className="font-serif italic text-[18px] font-medium text-white tracking-[-0.01em]">Venu</span>
                <span className="font-serif italic text-[18px] font-medium text-[#C8A960] tracking-[-0.01em]">Lock</span>
              </div>
              <p className="text-[12px] text-white/20">We Talk. You Lock.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/25 mb-3">Platform</h4>
              <ul className="space-y-2">
                {[{ l: 'Browse Venues', h: '/venues/search' }, { l: 'How It Works', h: '/#how-it-works', isAnchor: true }, { l: 'List Your Venue', h: '/list-your-venue' }, { l: 'Partner With Us', h: '/partner' }].map(x => (
                  <li key={x.l}><button onClick={() => { if (x.isAnchor) { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else navigate('/'); } else navigate(x.h); }}
                    className="text-[13px] text-white/30 hover:text-white/60 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/25 mb-3">Company</h4>
              <ul className="space-y-2">
                {[{ l: 'Contact', h: '/contact' }, { l: 'Support', h: '/support' }, { l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }].map(x => (
                  <li key={x.l}><button onClick={() => navigate(x.h)} className="text-[13px] text-white/30 hover:text-white/60 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase()}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/25 mb-3">Cities</h4>
              <ul className="space-y-2">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad'].map(c => (
                  <li key={c}><button onClick={() => navigate(`/venues/search?city=${c}`)} className="text-[13px] text-white/30 hover:text-white/60 transition-colors text-left" data-testid={`footer-city-${c.toLowerCase().replace(/\s/g, '-')}`}>{c}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-white/20">&copy; {new Date().getFullYear()} VenuLock. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/privacy')} className="text-[12px] text-white/20 hover:text-white/40 transition-colors" data-testid="footer-privacy-policy">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-[12px] text-white/20 hover:text-white/40 transition-colors" data-testid="footer-terms-of-service">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
