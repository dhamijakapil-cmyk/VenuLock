import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight,
  CheckCircle2, RefreshCw, ShieldCheck,
  Star, ChevronRight, Building2, Navigation, Loader2, Handshake,
  Menu, X, ChevronDown,
  Target, Headphones, Users, Calendar, Locate, TrendingUp
} from 'lucide-react';
import { ConnectButton } from '../components/ConnectButton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FALLBACK_CITIES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Chandigarh',
  'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi', 'Gurgaon', 'Noida',
  'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
];
const EVENT_TYPES = ['Wedding', 'Birthday / Anniversary', 'Corporate Event', 'Cocktail / Reception', 'Conference / Seminar', 'Exhibition', 'Private Party', 'Other'];
const GUEST_COUNT_OPTIONS = [
  { value: 'under-50', label: 'Under 50' }, { value: '50-100', label: '50\u2013100' }, { value: '100-250', label: '100\u2013250' },
  { value: '250-500', label: '250\u2013500' }, { value: '500-1000', label: '500\u20131000' }, { value: '1000+', label: '1000+' },
];
const RADIUS_OPTIONS = [
  { value: '5', label: '5 km' }, { value: '10', label: '10 km' }, { value: '20', label: '20 km' },
  { value: '30', label: '30 km' }, { value: '50', label: '50 km' },
];

const VALUE_PROPS = [
  { icon: Target, title: 'Curated Venues', desc: 'Matched to your event type, budget, and guest count — not a random directory.' },
  { icon: RefreshCw, title: 'Real-Time Availability', desc: 'Check open dates and pricing instantly. No phone calls, no waiting.' },
  { icon: Headphones, title: 'Dedicated Manager', desc: 'Your relationship manager handles everything from shortlist to confirmation.' },
  { icon: ShieldCheck, title: 'Verified & Secure', desc: 'Every venue audited on-ground. Payments held in escrow until confirmed.' },
];

const STEPS = [
  { num: '01', title: 'Tell us what you need', desc: 'Share your event type, city, guest count, and preferences.' },
  { num: '02', title: 'Compare curated venues', desc: 'We shortlist the best-fit venues with transparent pricing.' },
  { num: '03', title: 'Lock your venue', desc: 'Your dedicated manager handles negotiation and confirmation.' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', event: 'Wedding', city: 'Delhi', quote: 'VenuLock found us the perfect banquet in South Delhi in 48 hours. The RM handled everything — we just showed up to our wedding.' },
  { name: 'Rohan Mehta', event: 'Corporate Event', city: 'Mumbai', quote: 'Booked a conference space for 300 guests. Transparent pricing, zero hidden charges. Our team was genuinely impressed.' },
  { name: 'Ananya Patel', event: 'Birthday Party', city: 'Bengaluru', quote: 'I was skeptical at first but our RM negotiated 15% off the original quote. The venue was stunning and the whole process was seamless.' },
];

/* ─── Featured Venue Card (Landing Page) ─── */
function FeaturedVenueCard({ venue, navigate }) {
  const venueLink = (venue.city_slug && venue.slug) ? `/venues/${venue.city_slug}/${venue.slug}` : `/venues/${venue.venue_id}`;
  const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
  const price = venue.pricing?.price_per_plate_veg;
  return (
    <button onClick={() => navigate(venueLink)} className="group text-left w-full" data-testid={`featured-venue-${venue.venue_id}`}>
      <div className="aspect-[4/3] overflow-hidden mb-4 relative">
        <img src={img} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent" />
        {venue.rating > 0 && (
          <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
            <span className="text-[11px] font-bold text-[#111]">{venue.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-[14px] font-bold text-white leading-tight line-clamp-2">{venue.name}</h3>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[#777] text-[12px] min-w-0">
          <MapPin className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
          <span className="truncate">{venue.area ? `${venue.area}, ${venue.city}` : venue.city}</span>
        </div>
        {price && <p className="text-[13px] font-bold text-[#D4AF37] whitespace-nowrap">₹{price.toLocaleString('en-IN')}<span className="text-[10px] text-[#AAA] font-normal">/plate</span></p>}
      </div>
    </button>
  );
}

/* ─── Scroll reveal ─── */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`} style={{ transitionDelay: vis ? `${delay}ms` : '0ms' }}>{children}</div>;
}

/* ─── Mobile dropdown (dark) ─── */
function MobileDropdown({ label, icon: Icon, value, placeholder, options, isOpen, onToggle, onSelect, testId }) {
  return (
    <div className="relative" data-dropdown>
      {label && <label className="text-[11px] uppercase tracking-[0.1em] text-white/50 font-semibold mb-1.5 block">{label}</label>}
      <button onClick={onToggle} data-testid={testId}
        className={`w-full flex items-center justify-between px-4 py-3.5 border transition-all ${isOpen ? 'border-[#D4AF37]/50 bg-white/[0.06]' : 'border-white/[0.12] bg-white/[0.03]'}`}>
        <div className="flex items-center gap-3">
          <Icon className="w-[17px] h-[17px] text-[#D4AF37] flex-shrink-0" strokeWidth={1.5} />
          <span className={`text-[14px] ${value ? 'text-white font-medium' : 'text-white/40'}`}>{value || placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-px bg-[#1A1A1A] border border-white/[0.1] z-50 max-h-52 overflow-y-auto shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {options.map(opt => { const v = typeof opt === 'string' ? opt : opt.value; const l = typeof opt === 'string' ? opt : opt.label;
            return <button key={v} onClick={() => onSelect(v === value ? '' : v)} className={`w-full text-left px-4 py-3 text-[14px] transition-colors ${value === v ? 'bg-[#D4AF37] text-[#111] font-semibold' : 'text-white/60 hover:bg-white/[0.05] hover:text-white/80'}`} data-testid={`${testId}-option-${v.toLowerCase().replace(/[\s\/]+/g, '-')}`}>{l}</button>;
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */
const fmtINR = (n) => {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

const EST_EVENTS = ['Wedding', 'Reception', 'Corporate', 'Birthday', 'Engagement', 'Conference'];
const EST_CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Chandigarh', 'Gurgaon', 'Noida'];
const EST_GUESTS = [
  { label: '50 guests', value: 50 }, { label: '100 guests', value: 100 },
  { label: '150 guests', value: 150 }, { label: '200 guests', value: 200 },
  { label: '300 guests', value: 300 }, { label: '500 guests', value: 500 },
  { label: '750 guests', value: 750 }, { label: '1000+ guests', value: 1000 },
];

/* ─── Price Estimator Component ─── */
function PriceEstimator({ navigate }) {
  const [city, setCity] = useState('Delhi');
  const [eventType, setEventType] = useState('Wedding');
  const [guests, setGuests] = useState(200);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEstimate = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ guests, city, event_type: eventType.toLowerCase() });
    fetch(`${API_URL}/api/venues/price-estimate?${params}`)
      .then(r => r.json())
      .then(data => { setResult(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [city, eventType, guests]);

  useEffect(() => { fetchEstimate(); }, [fetchEstimate]);

  const handleSearch = () => {
    const p = new URLSearchParams({ city, event_type: eventType.toLowerCase(), guests: String(guests) });
    navigate(`/venues/search?${p.toString()}`);
  };

  return (
    <section className="bg-[#0D0D0D] py-16 lg:py-20 border-t border-[#D4AF37]/20" data-testid="price-estimator-section">
      <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Budget Estimator</p>
          <h2 className="text-[26px] lg:text-[32px] font-bold text-white leading-[1.15]">What will your celebration cost?</h2>
          <p className="text-white/45 text-[15px] mt-3">Based on real venue pricing across India</p>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[760px] mx-auto mb-10">
          {/* City */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">City</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="bg-[#1A1A1A] border border-white/10 text-white text-[14px] px-4 py-3 appearance-none cursor-pointer hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60 focus:outline-none transition-colors"
              data-testid="estimator-city-select"
            >
              <option value="">Any city</option>
              {EST_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Event */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Event Type</label>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              className="bg-[#1A1A1A] border border-white/10 text-white text-[14px] px-4 py-3 appearance-none cursor-pointer hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60 focus:outline-none transition-colors"
              data-testid="estimator-event-select"
            >
              {EST_EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {/* Guests */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Guests</label>
            <select
              value={guests}
              onChange={e => setGuests(Number(e.target.value))}
              className="bg-[#1A1A1A] border border-white/10 text-white text-[14px] px-4 py-3 appearance-none cursor-pointer hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60 focus:outline-none transition-colors"
              data-testid="estimator-guests-select"
            >
              {EST_GUESTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>

        {/* Result Card */}
        <div className="max-w-[760px] mx-auto border border-[#D4AF37]/25 bg-[#111] p-8 lg:p-10" data-testid="estimator-result-card">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
              <span className="text-white/40 text-[14px]">Calculating…</span>
            </div>
          ) : result && result.venue_count > 0 ? (
            <>
              <p className="text-[13px] text-white/45 mb-2">
                A <span className="text-white font-semibold">{eventType}</span> for <span className="text-white font-semibold">{guests} guests</span>{city ? <> in <span className="text-white font-semibold">{city}</span></> : ''} typically costs:
              </p>
              <div className="flex items-end gap-4 mb-2">
                <span className="text-[42px] lg:text-[52px] font-bold text-[#D4AF37] leading-none">{fmtINR(result.min_price)}</span>
                <span className="text-[22px] text-white/30 pb-1 font-light">–</span>
                <span className="text-[42px] lg:text-[52px] font-bold text-white leading-none">{fmtINR(result.max_price)}</span>
              </div>
              <p className="text-[12px] text-white/30 mb-7">
                Avg. {fmtINR(result.avg_price)} &nbsp;·&nbsp; Based on {result.venue_count} matching venue{result.venue_count !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleSearch}
                className="flex items-center gap-2.5 bg-[#D4AF37] hover:bg-[#C4A030] text-[#111] font-extrabold text-[12px] uppercase tracking-[0.08em] px-8 py-4 transition-colors group"
                data-testid="estimator-browse-btn"
              >
                Browse {result.venue_count} matching venue{result.venue_count !== 1 ? 's' : ''}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/40 text-[14px]">No venues found for this combination. Try different filters.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
function InlineField({ label, value, placeholder, icon: Icon, options, isOpen, onToggle, onSelect, testId, hasBorder = true }) {
  return (
    <div className={`relative flex-1 min-w-0 ${hasBorder ? 'border-r border-[#CCCCCC]' : ''}`} data-dropdown>
      <button onClick={onToggle} data-testid={testId}
        className={`w-full flex items-center gap-4 px-7 h-[84px] text-left transition-colors ${isOpen ? 'bg-[#F0F0F0]' : 'hover:bg-[#F7F7F7]'}`}>
        <Icon className="w-[18px] h-[18px] text-[#555] flex-shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#333] mb-[4px]">{label}</div>
          <div className={`text-[15px] truncate ${value ? 'text-[#111] font-semibold' : 'text-[#888]'}`}>{value || placeholder}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#777] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 min-w-[260px] mt-1 bg-white border border-[#E0E0E0] shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-50 max-h-64 overflow-y-auto">
          {options.map(opt => { const v = typeof opt === 'string' ? opt : opt.value; const l = typeof opt === 'string' ? opt : opt.label;
            return <button key={v} onClick={() => onSelect(v === value ? '' : v)} className={`w-full text-left px-5 py-3 text-[14px] transition-colors ${value === v ? 'bg-[#111] text-white font-semibold' : 'text-[#444] hover:bg-[#F5F5F5]'}`} data-testid={`${testId}-option-${v.toLowerCase().replace(/[\s\/]+/g, '-')}`}>{l}</button>;
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
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const toggleDropdown = (name) => setActiveDropdown(prev => prev === name ? null : name);

  useEffect(() => { const h = (e) => { if (!e.target.closest('[data-dropdown]')) setActiveDropdown(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { fetch(`${API_URL}/api/venues/cities`).then(r => r.json()).then(data => { if (Array.isArray(data) && data.length > 0) { setCitiesData(data); setCityNames(data.flatMap(c => c.city === 'Delhi' ? ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'] : [c.city])); } }).catch(() => {}); }, []);
  useEffect(() => { fetch(`${API_URL}/api/rms/top-performers`).then(r => r.json()).then(data => { if (Array.isArray(data) && data.length > 0) setTopPerformers(data); }).catch(() => {}); }, []);
  useEffect(() => { fetch(`${API_URL}/api/venues/featured`).then(r => r.json()).then(data => { if (Array.isArray(data)) setFeaturedVenues(data); }).catch(() => {}); }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => { setGeoError('Location access denied. Please enable it in your browser.'); setGeoLoading(false); }
    );
  };
  const DELHI_SUBS = ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'];
  const handleExplore = () => {
    if (searchMode === 'nearby' && !geoCoords) { handleGetLocation(); return; }
    const p = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) p.set('city', DELHI_SUBS.includes(selectedCity) ? 'Delhi' : selectedCity);
    else if (searchMode === 'nearby' && geoCoords) { p.set('lat', geoCoords.lat.toString()); p.set('lng', geoCoords.lng.toString()); p.set('radius', radius); }
    if (eventType) p.set('event_type', eventType); if (guestCount) p.set('guests', guestCount);
    navigate(`/venues/search?${p.toString()}`);
  };
  const switchMode = (mode) => { setSearchMode(mode); setActiveDropdown(null); setGeoError(''); };

  return (
    <div className="min-h-screen bg-white">

      {/* ══ MOBILE HEADER ══ */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-[#111]" data-testid="mobile-header">
        <div className="flex items-center justify-between px-5 h-[56px]">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="logo-btn">
            <span className="text-[14px] font-extrabold tracking-[0.08em] text-white uppercase">Venu</span>
            <span className="w-[1.5px] h-[14px] bg-[#D4AF37] mx-[5px]" />
            <span className="text-[14px] font-extrabold tracking-[0.08em] text-[#D4AF37] uppercase">Lock</span>
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 flex items-center justify-center" data-testid="mobile-menu-toggle">
            {mobileMenuOpen ? <X className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#111] border-t border-white/[0.08] px-5 py-5 space-y-1">
            {[{ label: 'Sign In', to: '/login' }, { label: 'Browse Venues', to: '/venues/search' }, { label: 'List Your Venue', to: '/list-your-venue' }].map(item => (
              <button key={item.label} onClick={() => { navigate(item.to); setMobileMenuOpen(false); }} className="block w-full text-left text-white/50 hover:text-white py-3 text-[14px] font-medium transition-colors">{item.label}</button>
            ))}
            <div className="pt-4 border-t border-white/[0.08]">
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full py-3 text-[11px] font-bold bg-[#D4AF37] text-[#111] tracking-[0.08em] uppercase">Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* ══ DESKTOP HEADER ══ */}
      <header className="hidden lg:block sticky top-0 z-[9999] bg-[#111]/95 backdrop-blur-lg border-b border-white/[0.06]" data-testid="main-header">
        <div className="max-w-[1280px] mx-auto px-12 flex h-[72px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="desktop-logo-btn">
            <span className="text-[18px] font-extrabold tracking-[0.08em] text-white uppercase">Venu</span>
            <span className="w-[1.5px] h-[18px] bg-[#D4AF37] mx-[6px]" />
            <span className="text-[18px] font-extrabold tracking-[0.08em] text-[#D4AF37] uppercase">Lock</span>
          </button>
          <div className="flex items-center gap-10">
            <button onClick={() => navigate('/venues/search')} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Browse Venues</button>
            <button onClick={() => navigate('/login')} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium" data-testid="login-btn">Sign In</button>
            <button onClick={() => navigate('/register')} className="text-[12px] font-bold text-[#111] px-7 py-2.5 bg-[#D4AF37] hover:bg-[#C9A432] transition-colors tracking-[0.06em] uppercase" data-testid="get-started-btn">Get Started</button>
          </div>
        </div>
      </header>

      {/* ══ HERO + SEARCH ══ */}
      <section data-testid="hero-section">

        {/* ── Mobile Hero ── */}
        <div className="lg:hidden pt-[56px]">
          <div className="px-5 pt-12 pb-4" style={{ background: "linear-gradient(rgba(5,4,2,0.86) 0%, rgba(8,6,3,0.78) 100%), url('https://images.unsplash.com/photo-1521399252503-e25b03aeda66?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800') center/cover no-repeat" }}>
            <div className="text-center">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-5">Find. Compare. Lock.</p>
              <h1 className="text-[2.5rem] font-bold text-white leading-[1.05] mb-4 tracking-[-0.02em]">
                We Negotiate.<br /><span className="text-[#D4AF37]">You Celebrate.</span>
              </h1>
              <p className="text-white/75 text-[15px] leading-[1.6] max-w-[300px] mx-auto">Tell us your event. We find, compare, and lock the right venue.</p>
            </div>
          </div>
          <div className="px-5 pb-6" style={{ background: "linear-gradient(rgba(5,4,2,0.90) 0%, rgba(5,4,2,0.92) 100%), url('https://images.unsplash.com/photo-1521399252503-e25b03aeda66?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800') center/cover no-repeat" }}>
            <div className="bg-[#1A1A1A] border border-white/[0.1] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
              <div className="flex border border-white/[0.1] mb-5">
                <button onClick={() => switchMode('city')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold tracking-[0.04em] uppercase transition-all ${searchMode === 'city' ? 'bg-white text-[#111]' : 'text-white/50'}`} data-testid="mode-city"><Building2 className="w-3.5 h-3.5" strokeWidth={1.8} /> City</button>
                <button onClick={() => switchMode('nearby')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold tracking-[0.04em] uppercase transition-all ${searchMode === 'nearby' ? 'bg-white text-[#111]' : 'text-white/50'}`} data-testid="mode-nearby"><Navigation className="w-3.5 h-3.5" strokeWidth={1.8} /> Nearby</button>
              </div>
              {searchMode === 'city' && (
                <div className="space-y-3" data-testid="search-bar">
                  <MobileDropdown label="City" icon={MapPin} value={selectedCity} placeholder="Select your city" options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')} onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="city-dropdown-trigger" />
                  <MobileDropdown label="Event Type" icon={Calendar} value={eventType} placeholder="Select event type" options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')} onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="mobile-event-type-dropdown" />
                  <MobileDropdown label="Guests" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''} placeholder="Expected guests" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'} onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="mobile-guest-count-dropdown" />
                  <button onClick={handleExplore} className="w-full flex items-center justify-center gap-2.5 py-[14px] text-[12px] font-bold text-[#111] bg-[#D4AF37] hover:bg-[#C9A432] transition-all active:scale-[0.98] tracking-[0.06em] uppercase mt-1" data-testid="explore-venues-btn">Find My Venue <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                </div>
              )}
              {searchMode === 'nearby' && (
                <div className="space-y-3" data-testid="nearby-panel">
                  {geoLoading && <div className="flex items-center justify-center gap-2 py-4 text-white/50"><Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /><span className="text-sm">Detecting location...</span></div>}
                  {geoError && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4">
                      <p className="text-[13px] text-amber-400 font-semibold mb-2">Location blocked by browser</p>
                      <button onClick={() => switchMode('city')} className="text-[12px] text-[#D4AF37] font-bold underline underline-offset-2" data-testid="mobile-switch-to-city-btn">Search by city instead →</button>
                    </div>
                  )}
                  {geoCoords && !geoLoading && <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/15"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-sm font-medium">Location detected</span></div>}
                  {!geoCoords && !geoLoading && !geoError && <button onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#D4AF37]/30 text-[#D4AF37] text-sm font-semibold hover:bg-[#D4AF37]/5 transition-colors" data-testid="get-location-btn"><Navigation className="w-4 h-4" strokeWidth={1.8} /> Enable Location</button>}
                  {(geoCoords || geoLoading) && !geoError && (
                    <>
                      <MobileDropdown label="Radius" icon={Locate} value={RADIUS_OPTIONS.find(o => o.value === radius)?.label || ''} placeholder="Within 20 km" options={RADIUS_OPTIONS} isOpen={activeDropdown === 'radius'} onToggle={() => toggleDropdown('radius')} onSelect={(v) => { setRadius(v); setActiveDropdown(null); }} testId="mobile-radius-dropdown" />
                      <MobileDropdown label="Event Type" icon={Calendar} value={eventType} placeholder="Select event type" options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')} onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="mobile-event-type-dropdown" />
                      <MobileDropdown label="Guests" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''} placeholder="Expected guests" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'} onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="mobile-guest-count-dropdown" />
                      <button onClick={handleExplore} className="w-full flex items-center justify-center gap-2.5 py-[14px] text-[12px] font-bold text-[#111] bg-[#D4AF37] hover:bg-[#C9A432] transition-all tracking-[0.06em] uppercase mt-1" data-testid="explore-nearby-btn">Find My Venue <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Mobile social proof + trust */}
          <div className="px-5 pb-8" style={{ background: "linear-gradient(rgba(5,4,2,0.92) 0%, rgba(5,4,2,0.95) 100%), url('https://images.unsplash.com/photo-1521399252503-e25b03aeda66?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800') center/cover no-repeat" }}>
            <div className="grid grid-cols-3 text-center py-6 border-t border-white/[0.06]">
              {[{ v: '500+', l: 'Venues' }, { v: '100%', l: 'Verified' }, { v: '24/7', l: 'Support' }].map(s => (
                <div key={s.l}><div className="text-[20px] font-bold text-white">{s.v}</div><div className="text-[9px] text-white/35 font-semibold tracking-[0.08em] uppercase mt-0.5">{s.l}</div></div>
              ))}
            </div>
            <p className="text-center text-[12px] text-white/30">
              <button onClick={() => navigate('/venues/search')} className="text-[#D4AF37] font-medium underline underline-offset-2 decoration-[#D4AF37]/30" data-testid="browse-all-link">Browse all venues</button>
            </p>
          </div>
        </div>

        {/* ── Desktop Hero + Search ── */}
        <div className="hidden lg:block" data-testid="search-section">
          <div className="pt-16 pb-12" style={{ background: "linear-gradient(rgba(5,4,2,0.84) 0%, rgba(8,6,3,0.72) 45%, rgba(5,4,2,0.90) 100%), url('https://images.unsplash.com/photo-1521399252503-e25b03aeda66?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1920') center/cover no-repeat" }}>
            {/* Headline */}
            <div className="max-w-[860px] mx-auto px-10 text-center">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.25em] mb-7">Find. Compare. Lock.</p>
              <h1 className="text-[5.5rem] font-bold leading-[0.96] tracking-[-0.03em] text-white" data-testid="hero-headline">
                We Negotiate.<br /><span className="text-[#D4AF37]">You Celebrate.</span>
              </h1>
              <p className="text-[17px] leading-[1.65] max-w-[580px] mx-auto text-white/90 mt-6 font-normal">
                Tell us your event. We find, compare, and lock the right venue for you.
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-[960px] mx-auto px-10 mt-12">
              <div className="flex items-center justify-center gap-6 mb-4">
                <button onClick={() => switchMode('city')} className={`text-[13px] font-semibold tracking-wide transition-colors ${searchMode === 'city' ? 'text-white' : 'text-white/50 hover:text-white/75'}`} data-testid="desktop-mode-city">Search by City</button>
                <span className="text-white/25 text-lg leading-none">|</span>
                <button onClick={() => switchMode('nearby')} className={`text-[13px] font-semibold tracking-wide transition-colors ${searchMode === 'nearby' ? 'text-white' : 'text-white/50 hover:text-white/75'}`} data-testid="desktop-mode-nearby">Use My Location</button>
              </div>
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#D4AF37]" />
                <div className="bg-white shadow-[0_16px_64px_rgba(0,0,0,0.5)] flex items-stretch" data-testid="desktop-search-bar">
                  {searchMode === 'city' ? (
                    <InlineField label="City" value={selectedCity} placeholder="Any city" icon={MapPin} options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')} onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="desktop-city-dropdown-trigger" />
                  ) : (
                    <div className="relative flex-1 min-w-0 border-r border-[#CCCCCC]" data-dropdown>
                      {geoCoords ? (
                        <div className="flex items-center gap-3.5 px-7 h-[84px]"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" /><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#333] mb-[4px]">Location</div><div className="text-[15px] font-semibold text-emerald-600">Detected</div></div></div>
                      ) : geoLoading ? (
                        <div className="flex items-center gap-3.5 px-7 h-[84px]"><Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] flex-shrink-0" /><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#333] mb-[4px]">Location</div><div className="text-[15px] text-[#666]">Detecting...</div></div></div>
                      ) : geoError ? (
                        <div className="flex flex-col justify-center px-7 h-[84px]">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#333] mb-[3px]">Location</div>
                          <div className="text-[13px] text-amber-600 font-semibold leading-tight">Blocked by browser</div>
                          <button onClick={() => switchMode('city')} className="text-[11px] text-[#D4AF37] font-semibold underline underline-offset-1 text-left hover:text-[#C4A030] mt-1 transition-colors" data-testid="switch-to-city-btn">Search by city instead →</button>
                        </div>
                      ) : (
                        <button onClick={handleGetLocation} className="flex items-center gap-3.5 px-7 h-[84px] w-full text-left hover:bg-[#F7F7F7] transition-colors" data-testid="desktop-get-location-btn">
                          <Navigation className="w-[18px] h-[18px] text-[#D4AF37] flex-shrink-0" strokeWidth={1.5} />
                          <div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#333] mb-[4px]">Location</div><div className="text-[15px] text-[#D4AF37] font-semibold">Enable Access</div></div>
                        </button>
                      )}
                    </div>
                  )}
                  <InlineField label="Event" value={eventType} placeholder="Any type" icon={Calendar} options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')} onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="desktop-event-type-dropdown" />
                  {searchMode === 'nearby' && (
                    <InlineField label="Radius" value={RADIUS_OPTIONS.find(o => o.value === radius)?.label || ''} placeholder="20 km" icon={Locate} options={RADIUS_OPTIONS} isOpen={activeDropdown === 'radius'} onToggle={() => toggleDropdown('radius')} onSelect={(v) => { setRadius(v); setActiveDropdown(null); }} testId="desktop-radius-dropdown" />
                  )}
                  <InlineField label="Guests" value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''} placeholder="Any size" icon={Users} options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'} onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="desktop-guest-count-dropdown" hasBorder={false} />
                  <button onClick={handleExplore}
                    className="px-12 bg-[#D4AF37] text-[#111] flex items-center gap-2.5 text-[13px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap hover:bg-[#C4A030] transition-all flex-shrink-0 group"
                    data-testid="desktop-explore-venues-btn">
                    Find Venue <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center mt-6 text-[12px] text-white/65 font-medium gap-4" data-testid="desktop-trust-strip">
                <span>500+ Verified Venues</span>
                <span className="w-[3px] h-[3px] bg-white/40 rounded-full" />
                <span>Transparent Pricing</span>
                <span className="w-[3px] h-[3px] bg-white/40 rounded-full" />
                <span>End-to-End Support</span>
                <span className="w-[3px] h-[3px] bg-white/40 rounded-full" />
                <button onClick={() => navigate('/venues/search')} className="text-[#D4AF37] font-semibold underline underline-offset-2 decoration-[#D4AF37]/40 hover:decoration-[#D4AF37]/70 transition-colors" data-testid="desktop-browse-all-link">Browse All</button>
              </div>
            </div>
          </div>

          {/* Transition: gold accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
        </div>
      </section>

      {/* ══ WHY VENULOCK (merged value props) ══ */}
      <section className="py-16 lg:py-20 bg-[#FAFAFA]" data-testid="why-choose-us">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-12">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Why VenuLock</p>
              <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Everything you need to book the right venue</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUE_PROPS.map((item, i) => (
              <Reveal key={item.title} delay={i * 70}>
                <div className="bg-white border border-[#E8E8E8] p-7 lg:p-8 hover:border-[#D4AF37]/30 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200" data-testid={`why-card-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="w-10 h-10 bg-[#111] flex items-center justify-center mb-5">
                    <item.icon className="w-[17px] h-[17px] text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#111] mb-2">{item.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-[#777]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SOCIAL PROOF ══ */}
      <section className="py-12 lg:py-14 bg-[#111]" data-testid="social-proof">
        <Reveal>
          <div className="max-w-[800px] mx-auto px-5 lg:px-10 grid grid-cols-3 text-center">
            {[{ val: '500+', label: 'Venues Listed' }, { val: '100%', label: 'Verified Partners' }, { val: 'End-to-End', label: 'Booking Support' }].map(s => (
              <div key={s.label}>
                <div className="text-[30px] lg:text-[40px] font-bold text-white leading-none">{s.val}</div>
                <div className="text-[10px] lg:text-[11px] text-white/40 font-semibold tracking-[0.1em] uppercase mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="py-16 lg:py-20 bg-white" id="how-it-works" data-testid="how-it-works">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">How It Works</p>
              <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Three steps to your perfect venue</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-14">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 100}>
                <div className="text-center sm:text-left">
                  <div className="text-[48px] lg:text-[56px] font-bold text-[#ECECEC] leading-none select-none">{s.num}</div>
                  <h3 className="text-[16px] font-bold text-[#111] mt-1 mb-2">{s.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-[#777]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICE ESTIMATOR ══ */}
      <PriceEstimator navigate={navigate} />

      {/* ══ FEATURED VENUES ══ */}
      <section className="py-16 lg:py-20 bg-white border-t border-[#ECECEC]" data-testid="featured-venues-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Top Picks</p>
                <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Handpicked. Verified. Ready.</h2>
              </div>
              <button onClick={() => navigate('/venues/search')} className="text-[13px] flex items-center gap-1 text-[#999] hover:text-[#111] transition-colors group font-medium" data-testid="view-all-venues-btn">
                All venues <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Reveal>
          {featuredVenues.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {featuredVenues.map((venue, i) => (
                <Reveal key={venue.venue_id} delay={i * 60}>
                  <FeaturedVenueCard venue={venue} navigate={navigate} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-slate-100 mb-4" />
                  <div className="h-3.5 bg-slate-100 mb-2 w-4/5" />
                  <div className="h-3 bg-slate-100 w-2/3" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══ BROWSE BY CITY ══ */}      <section className="py-16 lg:py-20 bg-[#FAFAFA] border-t border-[#ECECEC]" data-testid="city-coverage">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Explore</p>
                <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Browse by City</h2>
              </div>
              <button onClick={() => navigate('/venues/search')} className="text-[13px] flex items-center gap-1 text-[#999] hover:text-[#111] transition-colors group font-medium" data-testid="view-all-cities-btn">
                All cities <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" /></button>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(citiesData.length > 0 ? citiesData.map(c => ({ name: c.city, venues: c.venue_count })) : FALLBACK_CITIES.slice(0, 8).map(c => ({ name: c, venues: '-' }))).map((c, i) => (
              <Reveal key={c.name} delay={i * 40}>
                <button onClick={() => navigate(`/venues/search?city=${c.name}`)} className="text-left w-full border border-[#E8E8E8] bg-white px-5 py-4 hover:border-[#D4AF37]/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200" data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="text-[15px] font-bold text-[#111]">{c.name}</div>
                  <div className="text-[13px] mt-0.5 text-[#AAA]">{c.venues} venues</div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VENUE EXPERTS ══ */}
      <section className="py-16 lg:py-20 bg-white border-t border-[#ECECEC]" data-testid="top-performers-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Your Team</p>
              <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Meet Your Venue Experts</h2>
              <p className="text-[15px] text-[#777] mt-2">Dedicated managers who guide you from search to booking.</p>
            </div>
          </Reveal>
          {topPerformers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPerformers.map((rm, idx) => (
                <Reveal key={rm.user_id} delay={idx * 60}>
                  <div className="bg-white border border-[#E8E8E8] p-6 hover:border-[#D4AF37]/30 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200" data-testid={`top-performer-card-${idx}`}>
                    <div className="flex items-start gap-3.5 mb-4">
                      <img src={rm.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(rm.name)}&background=111111&color=fff&size=44`} alt={rm.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-[#111]">{rm.name}</h3>
                        <p className="text-[13px] text-[#888] mt-0.5">{rm.city_focus}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37]" />
                          <span className="text-[12px] font-bold text-[#111]">{rm.rating}</span>
                          <span className="text-[11px] text-[#AAA] ml-1">{rm.events_closed} events</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(rm.languages || []).map(lang => <span key={lang} className="px-2.5 py-1 bg-[#F5F5F5] text-[11px] text-[#777] font-medium">{lang}</span>)}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : <div className="text-center py-10 text-[#AAA] text-sm">Loading venue experts...</div>}
        </div>
      </section>

      {/* ══ GROW WITH VENULOCK ══ */}
      <section className="py-16 lg:py-20 bg-[#FAFAFA] border-t border-[#ECECEC]" data-testid="work-with-us">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">For Partners</p>
              <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Grow With VenuLock</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
            <Reveal>
              <div className="bg-[#111] p-8 lg:p-10 h-full" data-testid="list-venue-cta">
                <Building2 className="h-5 w-5 text-[#D4AF37] mb-5" strokeWidth={1.5} />
                <h3 className="text-[20px] font-bold text-white mb-3">List Your Venue</h3>
                <p className="text-white/50 text-[14px] mb-6 leading-[1.6]">Get qualified leads from event planners. We handle discovery and follow-up.</p>
                <ul className="space-y-2 mb-7">
                  {['Free to list', 'Dedicated RM manages bookings', 'Commission on confirmed bookings only'].map(p => <li key={p} className="flex items-center gap-2.5 text-[14px] text-white/50"><CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37] flex-shrink-0" strokeWidth={1.5} />{p}</li>)}
                </ul>
                <button onClick={() => navigate('/list-your-venue')} className="inline-flex items-center gap-2 px-7 py-3.5 text-[12px] font-bold bg-[#D4AF37] text-[#111] hover:bg-[#C9A432] transition-colors tracking-[0.06em] uppercase" data-testid="list-venue-btn">Apply to List <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="bg-white border border-[#E8E8E8] p-8 lg:p-10 h-full" data-testid="partner-cta">
                <Handshake className="h-5 w-5 text-[#111] mb-5" strokeWidth={1.5} />
                <h3 className="text-[20px] font-bold text-[#111] mb-3">Partner With Us</h3>
                <p className="text-[#777] text-[14px] mb-6 leading-[1.6]">Join our network for premium venue access, co-marketing, and shared pipeline.</p>
                <ul className="space-y-2 mb-7">
                  {['Access 500+ curated venues', 'Co-branded marketing', 'Dedicated account management'].map(p => <li key={p} className="flex items-center gap-2.5 text-[14px] text-[#777]"><CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37] flex-shrink-0" strokeWidth={1.5} />{p}</li>)}
                </ul>
                <button onClick={() => navigate('/partner')} className="inline-flex items-center gap-2 px-7 py-3.5 text-[12px] font-bold bg-[#111] text-white hover:bg-[#222] transition-colors tracking-[0.06em] uppercase" data-testid="partner-btn">Become a Partner <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="py-16 lg:py-20 bg-white border-t border-[#ECECEC]" data-testid="testimonials-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Real Celebrations</p>
              <h2 className="text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Trusted by thousands across India</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="border border-[#E8E8E8] p-7 hover:border-[#D4AF37]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200" data-testid={`testimonial-card-${i}`}>
                  <div className="flex items-center gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />)}
                  </div>
                  <p className="text-[15px] leading-[1.75] text-[#333] mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div className="border-t border-[#F0F0F0] pt-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#D4AF37]">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#111]">{t.name}</p>
                      <p className="text-[11px] text-[#AAA]">{t.event} &middot; {t.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section className="py-16 lg:py-20 bg-[#111]" data-testid="final-cta">
        <Reveal>
          <div className="max-w-[560px] mx-auto px-5 lg:px-10 text-center">
            <h2 className="text-[26px] lg:text-[32px] font-bold text-white leading-[1.15]">Ready to lock your venue?</h2>
            <p className="text-[15px] text-white/40 mt-3 mb-8 font-medium">Get started in under 2 minutes. Free, no commitment.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 px-8 py-4 text-[12px] font-bold bg-[#D4AF37] text-[#111] hover:bg-[#C9A432] transition-colors tracking-[0.06em] uppercase" data-testid="final-cta-booking">Start Booking <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
              <ConnectButton className="px-8 py-4 text-[12px] font-bold border border-white/15 text-white/50 hover:text-white hover:border-white/30 tracking-[0.06em] uppercase transition-colors" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-10 bg-[#111] border-t border-white/[0.06]" data-testid="main-footer">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center mb-3">
                <span className="text-[13px] font-extrabold tracking-[0.08em] text-white uppercase">Venu</span>
                <span className="w-[1px] h-[12px] bg-[#D4AF37] mx-[4px]" />
                <span className="text-[13px] font-extrabold tracking-[0.08em] text-[#D4AF37] uppercase">Lock</span>
              </div>
              <p className="text-[12px] text-white/25">We Negotiate. You Celebrate.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-bold text-white/30 mb-3">Platform</h4>
              <ul className="space-y-2">
                {[{ l: 'Browse Venues', h: '/venues/search' }, { l: 'How It Works', h: '/#how-it-works', isAnchor: true }, { l: 'List Your Venue', h: '/list-your-venue' }, { l: 'Partner With Us', h: '/partner' }].map(x => (
                  <li key={x.l}><button onClick={() => { if (x.isAnchor) { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else navigate('/'); } else navigate(x.h); }} className="text-[13px] text-white/35 hover:text-white/65 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-bold text-white/30 mb-3">Company</h4>
              <ul className="space-y-2">
                {[{ l: 'Contact', h: '/contact' }, { l: 'Support', h: '/support' }, { l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }].map(x => (
                  <li key={x.l}><button onClick={() => navigate(x.h)} className="text-[13px] text-white/35 hover:text-white/65 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase()}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-bold text-white/30 mb-3">Cities</h4>
              <ul className="space-y-2">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad'].map(c => (
                  <li key={c}><button onClick={() => navigate(`/venues/search?city=${c}`)} className="text-[13px] text-white/35 hover:text-white/65 transition-colors text-left" data-testid={`footer-city-${c.toLowerCase().replace(/\s/g, '-')}`}>{c}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-white/20">&copy; {new Date().getFullYear()} VenuLock. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/privacy')} className="text-[12px] text-white/20 hover:text-white/45 transition-colors" data-testid="footer-privacy-policy">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-[12px] text-white/20 hover:text-white/45 transition-colors" data-testid="footer-terms-of-service">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
