import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight, CheckCircle2, ShieldCheck,
  Star, ChevronRight, ChevronDown, Building2, Navigation, Loader2,
  Menu, X, Calendar, Locate, Users, Search,
  Car, Utensils, Wine, Music, BedDouble, Sun, Tent,
  BarChart3, Headphones, Eye, Heart, Scale
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
  { value: 'under-50', label: 'Under 50' }, { value: '50-100', label: '50–100' }, { value: '100-250', label: '100–250' },
  { value: '250-500', label: '250–500' }, { value: '500-1000', label: '500–1000' }, { value: '1000+', label: '1000+' },
];
const RADIUS_OPTIONS = [
  { value: '5', label: '5 km' }, { value: '10', label: '10 km' }, { value: '20', label: '20 km' },
  { value: '30', label: '30 km' }, { value: '50', label: '50 km' },
];
const BUDGET_OPTIONS = [
  { value: '', label: 'Any budget' },
  { value: '500-1000', label: '₹500 – ₹1,000/plate' },
  { value: '1000-2000', label: '₹1,000 – ₹2,000/plate' },
  { value: '2000-5000', label: '₹2,000 – ₹5,000/plate' },
  { value: '5000+', label: '₹5,000+/plate' },
];
const SETTING_OPTIONS = [
  { value: '', label: 'Any' }, { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' }, { value: 'both', label: 'Both' },
];

const VENUE_CATEGORIES = [
  { label: 'Hotels', icon: BedDouble, type: 'hotel' },
  { label: 'Banquet Halls', icon: Building2, type: 'banquet_hall' },
  { label: 'Farmhouses', icon: Tent, type: 'farmhouse' },
  { label: 'Resorts', icon: Sun, type: 'resort' },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, title: 'Verified Venues', desc: 'Every venue personally audited' },
  { icon: Eye, title: 'Transparent Pricing', desc: 'No hidden charges, ever' },
  { icon: Scale, title: 'Smart Comparison', desc: 'Side-by-side venue analysis' },
  { icon: Headphones, title: 'Booking Assistance', desc: 'Dedicated expert for your event' },
];

const STEPS = [
  { num: '01', title: 'Tell us your event', desc: 'Share your event type, city, guest count, and preferences. It takes under 2 minutes.' },
  { num: '02', title: 'Compare curated options', desc: 'We shortlist the best-fit venues with transparent pricing and honest comparisons.' },
  { num: '03', title: 'Lock with confidence', desc: 'Your dedicated manager handles negotiation, paperwork, and final confirmation.' },
];

const WHY_REASONS = [
  { icon: Star, title: 'Curated Matches', desc: 'Venues matched to your event type, budget, and guest count — not a random directory listing.' },
  { icon: BarChart3, title: 'Transparent Comparison', desc: 'Compare pricing, amenities, and reviews side-by-side. Make informed decisions, not guesses.' },
  { icon: Headphones, title: 'Expert Booking Support', desc: 'Your relationship manager handles everything from shortlist to booking confirmation.' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', event: 'Wedding', city: 'Delhi', quote: 'VenuLock found us the perfect banquet in South Delhi in 48 hours. The RM handled everything — we just showed up to our wedding.' },
  { name: 'Rohan Mehta', event: 'Corporate Event', city: 'Mumbai', quote: 'Booked a conference space for 300 guests. Transparent pricing, zero hidden charges. Our team was genuinely impressed.' },
  { name: 'Ananya Patel', event: 'Birthday Party', city: 'Bengaluru', quote: 'I was skeptical at first but our RM negotiated 15% off the original quote. The venue was stunning and the whole process was seamless.' },
];

/* ─── Scroll reveal ─── */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`} style={{ transitionDelay: vis ? `${delay}ms` : '0ms' }}>{children}</div>;
}

/* ─── Animated Counter ─── */
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { setStarted(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    const num = parseInt(target.replace(/[^0-9]/g, '')) || 0;
    const duration = 1800; const steps = 40; const inc = num / steps;
    let current = 0; let step = 0;
    const timer = setInterval(() => {
      step++; current = Math.min(Math.round(inc * step), num);
      setCount(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);
  return <span ref={ref}>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

/* ─── Search Card Dropdown ─── */
function SearchDropdown({ label, icon: Icon, value, placeholder, options, isOpen, onToggle, onSelect, testId }) {
  return (
    <div className="relative" data-dropdown>
      <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#555] block mb-1.5">{label}</label>
      <button onClick={onToggle} data-testid={testId}
        className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-all text-left ${isOpen ? 'border-[#D4AF37] bg-[#FFFDF5] ring-1 ring-[#D4AF37]/20' : 'border-[#E0E0E0] bg-white hover:border-[#CCC]'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-4 h-4 text-[#999] flex-shrink-0" strokeWidth={1.5} />
          <span className={`text-[14px] truncate ${value ? 'text-[#111] font-medium' : 'text-[#AAA]'}`}>{value || placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#999] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E0E0E0] rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-50 max-h-52 overflow-y-auto">
          {options.map(opt => {
            const v = typeof opt === 'string' ? opt : opt.value;
            const l = typeof opt === 'string' ? opt : opt.label;
            return (
              <button key={v} onClick={() => onSelect(v === value ? '' : v)}
                className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors first:rounded-t-lg last:rounded-b-lg ${value === v ? 'bg-[#111] text-white font-semibold' : 'text-[#444] hover:bg-[#F7F7F7]'}`}
                data-testid={`${testId}-option-${String(v).toLowerCase().replace(/[\s\/]+/g, '-')}`}>
                {l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Featured Venue Card (Premium) ─── */
function VenueCard({ venue, navigate, onCompare, onFav }) {
  const venueLink = (venue.city_slug && venue.slug) ? `/venues/${venue.city_slug}/${venue.slug}` : `/venues/${venue.venue_id}`;
  const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
  const price = venue.pricing?.price_per_plate_veg;
  const capacity = venue.capacity;
  const amenities = [];
  if (venue.amenities) {
    if (venue.amenities.parking) amenities.push('Parking');
    if (venue.amenities.ac) amenities.push('AC');
    if (venue.amenities.catering_inhouse) amenities.push('In-house Catering');
    if (venue.amenities.alcohol_allowed) amenities.push('Alcohol');
    if (venue.amenities.dj_allowed) amenities.push('DJ/Music');
    if (venue.amenities.rooms_available > 0) amenities.push('Rooms');
  }
  const displayAmenities = amenities.slice(0, 3);

  return (
    <div className="group bg-white rounded-xl border border-[#EDEDED] hover:border-[#D4AF37]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden" data-testid={`venue-card-${venue.venue_id}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={img} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Rating */}
        {venue.rating > 0 && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
            <span className="text-[11px] font-bold text-[#111]">{venue.rating.toFixed(1)}</span>
          </div>
        )}
        {/* Verified Badge */}
        <div className="absolute top-3 right-3 bg-[#065F46]/90 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[9px] font-bold tracking-wide uppercase">Verified</span>
        </div>
        {/* Actions overlay */}
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={(e) => { e.stopPropagation(); }} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors" data-testid={`venue-fav-${venue.venue_id}`}>
            <Heart className="w-3.5 h-3.5 text-[#666]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); }} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors" data-testid={`venue-compare-${venue.venue_id}`}>
            <Scale className="w-3.5 h-3.5 text-[#666]" />
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="text-[15px] font-bold text-[#111] mb-1 line-clamp-1">{venue.name}</h3>
        <div className="flex items-center gap-1.5 text-[#888] text-[12px] mb-3">
          <MapPin className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
          <span className="truncate">{venue.area ? `${venue.area}, ${venue.city}` : venue.city}</span>
        </div>
        {/* Capacity & Price */}
        <div className="flex items-center justify-between mb-3">
          {capacity && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#777]">
              <Users className="w-3 h-3" />
              <span>{capacity.min || 50}–{capacity.max || 1000} guests</span>
            </div>
          )}
          {price && (
            <p className="text-[14px] font-bold text-[#111]">
              ₹{price.toLocaleString('en-IN')}<span className="text-[11px] text-[#AAA] font-normal">/plate</span>
            </p>
          )}
        </div>
        {/* Amenities */}
        {displayAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayAmenities.map(a => (
              <span key={a} className="px-2 py-0.5 bg-[#F5F5F5] text-[10px] text-[#666] font-medium rounded">{a}</span>
            ))}
          </div>
        )}
        {/* CTA */}
        <button onClick={() => navigate(venueLink)}
          className="w-full py-2.5 text-[12px] font-bold text-[#111] border border-[#111] rounded-lg hover:bg-[#111] hover:text-white transition-all tracking-[0.04em] uppercase"
          data-testid={`venue-details-${venue.venue_id}`}>
          View Details
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════ */
/* ═══ MAIN LANDING PAGE ═══ */
/* ═════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState('city');
  const [selectedCity, setSelectedCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [radius, setRadius] = useState('20');
  const [budget, setBudget] = useState('');
  const [setting, setSetting] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoCoords, setGeoCoords] = useState(null);
  const [cityNames, setCityNames] = useState(FALLBACK_CITIES);
  const [citiesData, setCitiesData] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const toggleDropdown = (name) => setActiveDropdown(prev => prev === name ? null : name);

  useEffect(() => { const h = (e) => { if (!e.target.closest('[data-dropdown]')) setActiveDropdown(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { fetch(`${API_URL}/api/venues/cities`).then(r => r.json()).then(data => { if (Array.isArray(data) && data.length > 0) { setCitiesData(data); setCityNames(data.flatMap(c => c.city === 'Delhi' ? ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'] : [c.city])); } }).catch(() => {}); }, []);
  useEffect(() => { fetch(`${API_URL}/api/venues/featured`).then(r => r.json()).then(data => { if (Array.isArray(data)) setFeaturedVenues(data); }).catch(() => {}); }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => { setGeoError('Location access denied.'); setGeoLoading(false); }
    );
  };

  const DELHI_SUBS = ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'];
  const handleSearch = () => {
    if (searchMode === 'nearby' && !geoCoords) { handleGetLocation(); return; }
    const p = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) p.set('city', DELHI_SUBS.includes(selectedCity) ? 'Delhi' : selectedCity);
    else if (searchMode === 'nearby' && geoCoords) { p.set('lat', geoCoords.lat.toString()); p.set('lng', geoCoords.lng.toString()); p.set('radius', radius); }
    if (eventType) p.set('event_type', eventType);
    if (guestCount) p.set('guests', guestCount);
    if (setting) p.set('setting', setting);
    navigate(`/venues/search?${p.toString()}`);
  };

  const switchMode = (mode) => { setSearchMode(mode); setActiveDropdown(null); setGeoError(''); };

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">

      {/* ══════════════════════════════════════ */}
      {/* ═══ HEADER ═══ */}
      {/* ══════════════════════════════════════ */}

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden" data-testid="mobile-header">
        <div className="flex items-center justify-between px-5 h-[56px] bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <button onClick={() => navigate('/')} className="flex items-center gap-2" data-testid="logo-btn">
            <svg width="20" height="24" viewBox="0 0 36 44" fill="none"><path d="M18 0C9.716 0 3 6.716 3 15C3 26.25 18 42 18 42C18 42 33 26.25 33 15C33 6.716 26.284 0 18 0Z" fill="#C8A960"/><path d="M12 12L18 22L24 12" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M18 22V12" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <span className="text-[15px] font-bold tracking-tight"><span className="text-white">Venu</span><span className="text-[#D4AF37]">Lock</span></span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-[12px] font-semibold text-white/70 hover:text-white transition-colors" data-testid="mobile-signin-btn">Sign In</button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 flex items-center justify-center" data-testid="mobile-menu-toggle">
              {mobileMenuOpen ? <X className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/[0.06] px-5 py-4 space-y-1">
            {[{ label: 'Browse Venues', to: '/venues/search' }, { label: 'List Your Venue', to: '/list-your-venue' }].map(item => (
              <button key={item.label} onClick={() => { navigate(item.to); setMobileMenuOpen(false); }} className="block w-full text-left text-white/50 hover:text-white py-3 text-[14px] font-medium transition-colors">{item.label}</button>
            ))}
            <div className="pt-3 border-t border-white/[0.06]">
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full py-3 text-[11px] font-bold bg-[#D4AF37] text-[#111] tracking-[0.08em] uppercase rounded-lg">Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-white/[0.04]" data-testid="main-header">
        <div className="max-w-[1280px] mx-auto px-12 flex h-[72px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-1" data-testid="desktop-logo-btn">
            <svg width="24" height="30" viewBox="0 0 36 44" fill="none"><path d="M18 0C9.716 0 3 6.716 3 15C3 26.25 18 42 18 42C18 42 33 26.25 33 15C33 6.716 26.284 0 18 0Z" fill="#C8A960"/><path d="M12 12L18 22L24 12" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M18 22V12" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <span className="text-[20px] font-bold tracking-tight ml-2"><span className="text-white">Venu</span><span className="text-[#D4AF37]">Lock</span></span>
          </button>
          <nav className="flex items-center gap-8">
            <button onClick={() => navigate('/venues/search')} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Discover Venues</button>
            <button onClick={() => navigate('/venues/search')} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Weddings</button>
            <button onClick={() => navigate('/venues/search?event_type=corporate')} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Corporate</button>
            <button onClick={() => navigate('/list-your-venue')} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">List Venue</button>
          </nav>
          <div className="flex items-center gap-5">
            <button onClick={() => navigate('/login')} className="text-[13px] text-white/60 hover:text-white transition-colors font-medium" data-testid="login-btn">Sign In</button>
            <button onClick={() => navigate('/register')} className="text-[12px] font-bold text-[#111] px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C9A432] transition-colors tracking-[0.04em] uppercase rounded-lg" data-testid="get-started-btn">Get Started</button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════ */}
      {/* ═══ HERO SECTION (DARK) ═══ */}
      {/* ══════════════════════════════════════ */}
      <section className="relative bg-[#0A0A0A] overflow-hidden" data-testid="hero-section">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1920&q=80" alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-[#0A0A0A]/40 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 pt-[56px] lg:pt-[72px]">
          {/* Hero Content */}
          <div className="text-center pt-16 sm:pt-20 lg:pt-28 pb-8 lg:pb-12 px-5">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.25em] mb-5 lg:mb-6" data-testid="hero-tagline">
              Find. Compare. Lock.
            </p>
            <h1 className="text-[2.5rem] sm:text-[3.5rem] lg:text-[5rem] xl:text-[5.5rem] font-bold leading-[0.95] tracking-[-0.03em] text-white mb-5 lg:mb-6" data-testid="hero-headline">
              We Negotiate.<br /><span className="text-[#D4AF37]">You Celebrate.</span>
            </h1>
            <p className="text-[14px] sm:text-[16px] lg:text-[18px] leading-[1.6] max-w-[620px] mx-auto text-white/70 font-normal">
              Tell us your event. We shortlist, compare, negotiate, and help you lock the right venue.
            </p>
          </div>

          {/* ═══ FLOATING SEARCH CARD ═══ */}
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 pb-12 lg:pb-20">
            <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-5 sm:p-6 lg:p-8" data-testid="search-card">
              {/* Tabs */}
              <div className="flex border border-[#E8E8E8] rounded-lg mb-5 overflow-hidden">
                <button onClick={() => switchMode('city')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-bold tracking-[0.04em] uppercase transition-all ${searchMode === 'city' ? 'bg-[#111] text-white' : 'bg-white text-[#888] hover:bg-[#F7F7F7]'}`}
                  data-testid="mode-city">
                  <Building2 className="w-3.5 h-3.5" strokeWidth={1.8} /> City
                </button>
                <button onClick={() => { switchMode('nearby'); if (!geoCoords && !geoLoading) handleGetLocation(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-bold tracking-[0.04em] uppercase transition-all ${searchMode === 'nearby' ? 'bg-[#111] text-white' : 'bg-white text-[#888] hover:bg-[#F7F7F7]'}`}
                  data-testid="mode-nearby">
                  <Navigation className="w-3.5 h-3.5" strokeWidth={1.8} /> Use My Location
                </button>
              </div>

              {/* Main Fields */}
              {searchMode === 'city' ? (
                <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <SearchDropdown label="City" icon={MapPin} value={selectedCity} placeholder="Select city" options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')} onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="city-dropdown-trigger" />
                  <SearchDropdown label="Event Type" icon={Calendar} value={eventType} placeholder="Select event" options={EVENT_TYPES} isOpen={activeDropdown === 'eventType'} onToggle={() => toggleDropdown('eventType')} onSelect={(v) => { setEventType(v); setActiveDropdown(null); }} testId="event-type-dropdown" />
                  <SearchDropdown label="Guest Count" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''} placeholder="Any size" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'} onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="guest-count-dropdown" />
                </div>
              ) : (
                <div className="mb-4">
                  {geoLoading && <div className="flex items-center justify-center gap-2 py-4 text-[#777]"><Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /><span className="text-sm">Detecting your location...</span></div>}
                  {geoError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <p className="text-[13px] text-amber-700 font-medium mb-1">Location access denied</p>
                      <button onClick={() => switchMode('city')} className="text-[12px] text-[#D4AF37] font-bold underline underline-offset-2" data-testid="switch-to-city-btn">Search by city instead</button>
                    </div>
                  )}
                  {geoCoords && !geoLoading && (
                    <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-emerald-700">Location detected</span>
                      </div>
                      <SearchDropdown label="Radius" icon={Locate} value={RADIUS_OPTIONS.find(o => o.value === radius)?.label || ''} placeholder="20 km" options={RADIUS_OPTIONS} isOpen={activeDropdown === 'radius'} onToggle={() => toggleDropdown('radius')} onSelect={(v) => { setRadius(v); setActiveDropdown(null); }} testId="radius-dropdown" />
                      <SearchDropdown label="Guest Count" icon={Users} value={GUEST_COUNT_OPTIONS.find(o => o.value === guestCount)?.label || ''} placeholder="Any size" options={GUEST_COUNT_OPTIONS} isOpen={activeDropdown === 'guestCount'} onToggle={() => toggleDropdown('guestCount')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="guest-count-dropdown" />
                    </div>
                  )}
                  {!geoCoords && !geoLoading && !geoError && (
                    <button onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#D4AF37]/30 text-[#D4AF37] text-sm font-semibold hover:bg-[#FFFDF5] transition-colors rounded-lg" data-testid="get-location-btn">
                      <Navigation className="w-4 h-4" strokeWidth={1.8} /> Enable Location Access
                    </button>
                  )}
                </div>
              )}

              {/* Advanced Filters Toggle */}
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-[12px] text-[#999] hover:text-[#666] font-medium mb-4 transition-colors"
                data-testid="advanced-filters-toggle">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                {showAdvanced ? 'Hide' : 'Show'} advanced filters
              </button>

              {/* Advanced Filters */}
              {showAdvanced && (
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-5 pt-4 border-t border-[#F0F0F0]">
                  <SearchDropdown label="Budget" icon={BarChart3} value={BUDGET_OPTIONS.find(o => o.value === budget)?.label || ''} placeholder="Any budget" options={BUDGET_OPTIONS} isOpen={activeDropdown === 'budget'} onToggle={() => toggleDropdown('budget')} onSelect={(v) => { setBudget(v); setActiveDropdown(null); }} testId="budget-dropdown" />
                  <SearchDropdown label="Setting" icon={Sun} value={SETTING_OPTIONS.find(o => o.value === setting)?.label || ''} placeholder="Indoor / Outdoor" options={SETTING_OPTIONS} isOpen={activeDropdown === 'setting'} onToggle={() => toggleDropdown('setting')} onSelect={(v) => { setSetting(v); setActiveDropdown(null); }} testId="setting-dropdown" />
                </div>
              )}

              {/* CTA Button */}
              <button onClick={handleSearch}
                className="w-full flex items-center justify-center gap-2.5 py-4 text-[13px] font-bold text-[#111] bg-[#D4AF37] hover:bg-[#C9A432] transition-all active:scale-[0.99] tracking-[0.06em] uppercase rounded-xl shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                data-testid="find-venue-btn">
                <Search className="w-4 h-4" strokeWidth={2.5} />
                Find My Venue
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* ═══ EVERYTHING BELOW IS LIGHT ═══ */}
      {/* ══════════════════════════════════════ */}

      {/* ═══ 1. TRUST BADGES STRIP ═══ */}
      <section className="py-10 lg:py-12 bg-white border-b border-[#F0F0F0]" data-testid="trust-badges">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {TRUST_BADGES.map((badge, i) => (
              <div key={badge.title} className="flex items-start gap-3.5" data-testid={`trust-badge-${i}`}>
                <div className="w-10 h-10 bg-[#F8F5ED] rounded-xl flex items-center justify-center flex-shrink-0">
                  <badge.icon className="w-[18px] h-[18px] text-[#D4AF37]" strokeWidth={1.8} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-[#111]">{badge.title}</h4>
                  <p className="text-[12px] text-[#888] mt-0.5">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 2. FEATURED VENUE CATEGORIES ═══ */}
      <section className="py-14 lg:py-16 bg-[#FAFAF8]" data-testid="venue-categories">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-8 lg:mb-10">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Explore</p>
              <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Browse by Venue Type</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {VENUE_CATEGORIES.map((cat, i) => (
              <Reveal key={cat.label} delay={i * 60}>
                <button onClick={() => navigate(`/venues/search?venue_type=${cat.type}`)}
                  className="w-full bg-white border border-[#EDEDED] rounded-xl p-6 text-center hover:border-[#D4AF37]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all group"
                  data-testid={`category-${cat.type}`}>
                  <div className="w-12 h-12 bg-[#F8F5ED] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#D4AF37]/10 transition-colors">
                    <cat.icon className="w-5 h-5 text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#111]">{cat.label}</h3>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. FEATURED VENUES GRID ═══ */}
      <section className="py-14 lg:py-20 bg-white" data-testid="featured-venues-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-8 lg:mb-10">
              <div>
                <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Top Picks</p>
                <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Handpicked & Verified</h2>
              </div>
              <button onClick={() => navigate('/venues/search')} className="hidden sm:flex text-[13px] items-center gap-1.5 text-[#999] hover:text-[#111] transition-colors group font-medium" data-testid="view-all-venues-btn">
                View all <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Reveal>
          {featuredVenues.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {featuredVenues.map((venue, i) => (
                <Reveal key={venue.venue_id} delay={i * 60}>
                  <VenueCard venue={venue} navigate={navigate} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse rounded-xl overflow-hidden">
                  <div className="aspect-[4/3] bg-slate-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-10 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/venues/search')} className="sm:hidden flex items-center justify-center gap-2 w-full mt-6 py-3 text-[13px] text-[#777] font-medium border border-[#E8E8E8] rounded-lg hover:bg-[#F7F7F7] transition-colors">
            View all venues <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ═══ 4. HOW IT WORKS ═══ */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8] border-t border-[#F0F0F0]" id="how-it-works" data-testid="how-it-works">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">How It Works</p>
              <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Three steps to your perfect venue</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 100}>
                <div className="text-center sm:text-left relative">
                  <div className="text-[56px] lg:text-[64px] font-bold text-[#D4AF37]/15 leading-none select-none">{s.num}</div>
                  <h3 className="text-[16px] lg:text-[18px] font-bold text-[#111] -mt-2 mb-3">{s.title}</h3>
                  <p className="text-[14px] leading-[1.7] text-[#777]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. WHY CHOOSE VENULOCK ═══ */}
      <section className="py-14 lg:py-20 bg-white" data-testid="why-choose-us">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-12">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Why VenuLock</p>
              <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">The smarter way to book venues</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5 lg:gap-6">
            {WHY_REASONS.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="bg-[#FAFAF8] border border-[#EDEDED] rounded-2xl p-7 lg:p-8 hover:border-[#D4AF37]/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300" data-testid={`why-card-${i}`}>
                  <div className="w-11 h-11 bg-[#111] rounded-xl flex items-center justify-center mb-5">
                    <item.icon className="w-5 h-5 text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#111] mb-2">{item.title}</h3>
                  <p className="text-[14px] leading-[1.7] text-[#777]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. STATS / SOCIAL PROOF ═══ */}
      <section className="py-14 lg:py-16 bg-[#111]" data-testid="stats-section">
        <div className="max-w-[960px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { target: '500', suffix: '+', label: 'Verified Venues' },
                { target: '150', suffix: '+', label: 'Expert Planners' },
                { target: '4.8', suffix: '', label: 'Average Rating', isDecimal: true },
                { target: '1800', suffix: '+', label: 'Events Booked' },
              ].map((stat, i) => (
                <div key={stat.label}>
                  <div className="text-[32px] lg:text-[44px] font-bold text-white leading-none">
                    {stat.isDecimal ? (
                      <span className="flex items-center justify-center gap-1"><Star className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" /> 4.8</span>
                    ) : (
                      <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                    )}
                  </div>
                  <div className="text-[10px] lg:text-[11px] text-white/40 font-semibold tracking-[0.1em] uppercase mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ BROWSE BY CITY ═══ */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8] border-t border-[#F0F0F0]" data-testid="city-coverage">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Cities</p>
                <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Browse by City</h2>
              </div>
              <button onClick={() => navigate('/venues/search')} className="text-[13px] flex items-center gap-1 text-[#999] hover:text-[#111] transition-colors group font-medium" data-testid="view-all-cities-btn">
                All cities <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" /></button>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(citiesData.length > 0 ? citiesData.map(c => ({ name: c.city, venues: c.venue_count })) : FALLBACK_CITIES.slice(0, 8).map(c => ({ name: c, venues: '-' }))).map((c, i) => (
              <Reveal key={c.name} delay={i * 40}>
                <button onClick={() => navigate(`/venues/search?city=${c.name}`)} className="text-left w-full bg-white border border-[#EDEDED] rounded-xl px-5 py-4 hover:border-[#D4AF37]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200" data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="text-[15px] font-bold text-[#111]">{c.name}</div>
                  <div className="text-[13px] mt-0.5 text-[#AAA]">{c.venues} venues</div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-14 lg:py-20 bg-white border-t border-[#F0F0F0]" data-testid="testimonials-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-12">
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3">Testimonials</p>
              <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-[#111] leading-[1.15]">Trusted by thousands across India</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="bg-[#FAFAF8] border border-[#EDEDED] rounded-2xl p-7 hover:border-[#D4AF37]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-300" data-testid={`testimonial-card-${i}`}>
                  <div className="flex items-center gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />)}
                  </div>
                  <p className="text-[14px] leading-[1.75] text-[#444] mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div className="border-t border-[#E8E8E8] pt-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <span className="text-[12px] font-bold text-[#D4AF37]">{t.name.charAt(0)}</span>
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

      {/* ═══ 7. FINAL CTA BANNER ═══ */}
      <section className="py-16 lg:py-20 bg-[#111]" data-testid="final-cta">
        <Reveal>
          <div className="max-w-[640px] mx-auto px-5 lg:px-10 text-center">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-4">Get Started</p>
            <h2 className="text-[26px] sm:text-[30px] lg:text-[36px] font-bold text-white leading-[1.15] mb-4">Ready to lock your venue?</h2>
            <p className="text-[15px] text-white/45 mb-8 font-medium leading-relaxed">
              Get started in under 2 minutes. Free, no commitment. Your dedicated venue expert is one click away.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-8 py-4 text-[12px] font-bold bg-[#D4AF37] text-[#111] hover:bg-[#C9A432] transition-colors tracking-[0.06em] uppercase rounded-xl shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                data-testid="final-cta-booking">
                Start Booking <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <ConnectButton className="px-8 py-4 text-[12px] font-bold border border-white/15 text-white/50 hover:text-white hover:border-white/30 tracking-[0.06em] uppercase transition-colors rounded-xl" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ 8. DARK PREMIUM FOOTER ═══ */}
      <footer className="py-12 lg:py-16 bg-[#0A0A0A] border-t border-white/[0.04]" data-testid="main-footer">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="18" height="22" viewBox="0 0 36 44" fill="none"><path d="M18 0C9.716 0 3 6.716 3 15C3 26.25 18 42 18 42C18 42 33 26.25 33 15C33 6.716 26.284 0 18 0Z" fill="#C8A960"/><path d="M12 12L18 22L24 12" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M18 22V12" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/></svg>
                <span className="text-[15px] font-bold tracking-tight"><span className="text-white">Venu</span><span className="text-[#D4AF37]">Lock</span></span>
              </div>
              <p className="text-[13px] text-white/30 leading-relaxed">India's trusted venue booking platform. We negotiate, you celebrate.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-bold text-white/40 mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {[{ l: 'Discover Venues', h: '/venues/search' }, { l: 'How It Works', h: '/#how-it-works', isAnchor: true }, { l: 'List Your Venue', h: '/list-your-venue' }, { l: 'Partner With Us', h: '/partner' }].map(x => (
                  <li key={x.l}><button onClick={() => { if (x.isAnchor) { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else navigate('/'); } else navigate(x.h); }} className="text-[13px] text-white/35 hover:text-white/70 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-bold text-white/40 mb-4">Company</h4>
              <ul className="space-y-2.5">
                {[{ l: 'About Us', h: '/about' }, { l: 'Contact', h: '/contact' }, { l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }].map(x => (
                  <li key={x.l}><button onClick={() => navigate(x.h)} className="text-[13px] text-white/35 hover:text-white/70 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.1em] font-bold text-white/40 mb-4">Top Cities</h4>
              <ul className="space-y-2.5">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Chandigarh'].map(c => (
                  <li key={c}><button onClick={() => navigate(`/venues/search?city=${c}`)} className="text-[13px] text-white/35 hover:text-white/70 transition-colors text-left" data-testid={`footer-city-${c.toLowerCase().replace(/\s/g, '-')}`}>{c}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-white/20">&copy; {new Date().getFullYear()} VenuLock. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/privacy')} className="text-[12px] text-white/20 hover:text-white/50 transition-colors" data-testid="footer-privacy-policy">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-[12px] text-white/20 hover:text-white/50 transition-colors" data-testid="footer-terms-of-service">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
