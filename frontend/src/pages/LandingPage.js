import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight, ShieldCheck,
  Star, ChevronRight, ChevronDown, Building2, Navigation, Loader2,
  Menu, X, Calendar, Locate, Users, Search,
  BedDouble, Sun, Tent, Crown, PartyPopper, Briefcase, CloudSun,
  BarChart3, Headphones, Eye, Heart, Scale, Check, Sparkles, Phone,
  LogOut, User as UserIcon
} from 'lucide-react';
import { ConnectButton } from '../components/ConnectButton';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import NotificationBell from '@/components/NotificationBell';
import SEOHead from '@/components/SEOHead';
import { VENULOQ_SUPPORT } from '@/config/contact';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const HERO_IMAGES = [
  '/assets/hero/h1.jpg',
  '/assets/hero/h2.jpg',
  '/assets/hero/h3.jpg',
  '/assets/hero/h4.jpg',
  '/assets/hero/h5.jpg',
];

const FALLBACK_CITIES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Chandigarh',
  'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi', 'Gurgaon', 'Noida',
  'Greater Noida', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
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
  { label: 'Wedding Venues', icon: Heart, type: 'hotel', query: 'event_type=Wedding' },
  { label: 'Birthday Venues', icon: PartyPopper, type: 'banquet_hall', query: 'event_type=Birthday+%2F+Anniversary' },
  { label: 'Corporate', icon: Briefcase, type: 'hotel', query: 'event_type=Corporate+Event' },
  { label: 'Rooftop Venues', icon: CloudSun, type: 'rooftop' },
  { label: 'Luxury Venues', icon: Crown, type: 'Palace' },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, title: 'Verified Venues', desc: 'Every venue personally audited & quality-checked' },
  { icon: Eye, title: 'Transparent Pricing', desc: 'No hidden charges — what you see is what you pay' },
  { icon: Scale, title: 'Smart Comparison', desc: 'Compare venues side-by-side with real data' },
  { icon: Headphones, title: 'Booking Assistance', desc: 'A dedicated expert assigned to your event' },
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
  { name: 'Priya Sharma', event: 'Wedding', city: 'Delhi', quote: 'VenuLoQ found us the perfect banquet in South Delhi in 48 hours. The RM handled everything — we just showed up to our wedding.' },
  { name: 'Rohan Mehta', event: 'Corporate Event', city: 'Mumbai', quote: 'Booked a conference space for 300 guests. Transparent pricing, zero hidden charges. Our team was genuinely impressed.' },
  { name: 'Ananya Patel', event: 'Birthday Party', city: 'Bengaluru', quote: 'I was skeptical at first but our RM negotiated 15% off the original quote. The venue was stunning and the whole process was seamless.' },
];

/* ─── useScrollY — lightweight scroll tracker ─── */
function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrollY;
}

/* ─── Scroll reveal ─── */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: vis ? `${delay}ms` : '0ms' }}>{children}</div>;
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
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCount(Math.min(Math.round(inc * step), num));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);
  return <span ref={ref}>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

/* ─── Venue Showcase Carousel (Premium Interactive) ─── */
function VenueShowcase({ featuredVenues, navigate }) {
  const trackRef = useRef(null);
  const scrollPos = useRef(0);
  const animRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scroll: 0 });
  const lastDragX = useRef(0);

  const SHOWCASE_ITEMS = featuredVenues.length > 0
    ? featuredVenues.map(v => ({
        img: (typeof v.images?.[0] === 'string' ? v.images[0] : v.images?.[0]?.url) || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=70',
        name: v.name,
        city: v.city,
        link: (v.city_slug && v.slug) ? `/venues/${v.city_slug}/${v.slug}` : `/venues/${v.venue_id}`,
      }))
    : [
        { img: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&q=70', name: 'The Grand Ballroom', city: 'Delhi', link: '/venues/search' },
        { img: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=400&q=70', name: 'Royal Garden Resort', city: 'Mumbai', link: '/venues/search' },
        { img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=70', name: 'Heritage Palace', city: 'Jaipur', link: '/venues/search' },
        { img: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=400&q=70', name: 'Luxury Farmhouse', city: 'Gurgaon', link: '/venues/search' },
        { img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=70', name: 'Five Star Hotel', city: 'Bangalore', link: '/venues/search' },
        { img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=70', name: 'Open Air Venue', city: 'Goa', link: '/venues/search' },
      ];

  // Triple the items for seamless infinite loop
  const items = [...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS];

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 3000);
  };

  // Auto-scroll with requestAnimationFrame
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const speed = 0.3; // px per frame — very slow glide
    const tick = () => {
      if (!pausedRef.current && !isDragging.current) {
        scrollPos.current += speed;
        const singleSetWidth = track.scrollWidth / 3;
        if (scrollPos.current >= singleSetWidth) scrollPos.current -= singleSetWidth;
        track.style.transform = `translateX(${-scrollPos.current}px)`;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); if (resumeTimer.current) clearTimeout(resumeTimer.current); };
  }, [items.length]);

  // Touch handlers
  const onTouchStart = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, scroll: scrollPos.current };
    lastDragX.current = e.touches[0].clientX;
    pause();
  };
  const onTouchMove = (e) => {
    if (!isDragging.current) return;
    const dx = dragStart.current.x - e.touches[0].clientX;
    const track = trackRef.current;
    const singleSetWidth = track.scrollWidth / 3;
    let newPos = dragStart.current.scroll + dx;
    if (newPos < 0) newPos += singleSetWidth;
    if (newPos >= singleSetWidth) newPos -= singleSetWidth;
    scrollPos.current = newPos;
    track.style.transform = `translateX(${-scrollPos.current}px)`;
    lastDragX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => { isDragging.current = false; };

  // Mouse drag handlers (desktop)
  const onMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, scroll: scrollPos.current };
    e.preventDefault();
    pause();
  };
  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = dragStart.current.x - e.clientX;
    const track = trackRef.current;
    const singleSetWidth = track.scrollWidth / 3;
    let newPos = dragStart.current.scroll + dx;
    if (newPos < 0) newPos += singleSetWidth;
    if (newPos >= singleSetWidth) newPos -= singleSetWidth;
    scrollPos.current = newPos;
    track.style.transform = `translateX(${-scrollPos.current}px)`;
  };
  const onMouseUp = () => { isDragging.current = false; };

  const handleCardClick = (link, e) => {
    // Only navigate if it wasn't a drag
    const movedX = Math.abs((dragStart.current.x || 0) - (e.clientX || 0));
    if (movedX < 5) navigate(link);
  };

  return (
    <div className="relative overflow-hidden pb-14 sm:pb-16 lg:pb-20 hero-text-enter-d4" data-testid="venue-showcase">
      <div className="max-w-[600px] mx-auto px-5 mb-5">
        <p className="text-center text-[10px] font-semibold text-[#F6F4F0]/40 uppercase tracking-[0.25em]">
          Discover <span className="text-[#C4A76C] font-semibold">500+</span> Curated Venues Across Delhi NCR
        </p>
      </div>
      <div
        className="relative select-none"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div ref={trackRef} className="flex gap-4 sm:gap-5 will-change-transform" style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}>
          {items.map((v, i) => (
            <div
              key={i}
              onClick={(e) => handleCardClick(v.link, e)}
              className="flex-shrink-0 w-[180px] sm:w-[220px] lg:w-[260px] group/v cursor-pointer"
              data-testid={`showcase-venue-${i}`}
            >
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.15)] group-hover/v:shadow-[0_6px_28px_rgba(212,179,106,0.15)] group-hover/v:-translate-y-1 transition-all duration-500">
                <img src={v.img} alt={v.name} className="w-full h-full object-cover group-hover/v:scale-[1.08] transition-transform duration-700" loading="lazy" draggable="false" />
                {/* Frosted glass overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A0A0A]/75 via-[#0A0A0A]/20 to-transparent px-3.5 pb-3.5 pt-12">
                  <p className="text-[12px] text-[#F6F4F0] font-semibold leading-[1.35] line-clamp-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{v.name}</p>
                  <p className="text-[10px] text-[#F6F4F0]/45 font-medium mt-1">{v.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchDropdown({ label, icon: Icon, value, placeholder, options, isOpen, onToggle, onSelect, testId }) {
  return (
    <div className="relative" data-dropdown>
      {label && <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#999] block mb-2">{label}</label>}
      <button onClick={onToggle} data-testid={testId}
        className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl transition-all duration-200 text-left ${isOpen ? 'border-[#C4A76C]/60 bg-[#FFFDF8] ring-2 ring-[#C4A76C]/10' : 'border-[#E8E6E2] bg-white hover:border-[#D5D3CF] hover:bg-white'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-[18px] h-[18px] text-[#BBBBBB] flex-shrink-0" strokeWidth={1.5} />
          <span className={`text-[14px] truncate ${value ? 'text-[#111] font-semibold' : 'text-[#BBBBBB]'}`}>{value || placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#BBB] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-[#C4A76C]' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E8E8E8] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.16)] z-[100] max-h-64 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {options.map(opt => {
            const v = typeof opt === 'string' ? opt : opt.value;
            const l = typeof opt === 'string' ? opt : opt.label;
            return (
              <button key={v} onClick={() => onSelect(v === value ? '' : v)}
                className={`w-full text-left px-4 py-3.5 text-[14px] transition-colors first:rounded-t-xl last:rounded-b-xl ${value === v ? 'bg-[#111] text-white font-semibold' : 'text-[#333] hover:bg-[#F7F6F3]'}`}
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

/* ─── Featured Venue Card (Premium Polished) ─── */
function VenueCard({ venue, navigate }) {
  const toSlug = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
  const citySlug = venue.city_slug || toSlug(venue.city) || 'india';
  const venueSlug = venue.slug || toSlug(venue.name) || venue.venue_id;
  const venueLink = `/venues/${citySlug}/${venueSlug}`;
  const rawImg = venue.images?.[0];
  const img = (typeof rawImg === 'string' ? rawImg : rawImg?.url) || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
  const price = venue.pricing?.price_per_plate_veg;
  const capMin = venue.capacity?.min || venue.capacity_min || null;
  const capMax = venue.capacity?.max || venue.capacity_max || null;
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
    <div
      onClick={() => navigate(venueLink)}
      className="group bg-white rounded-2xl border border-[#EBEBEB] hover:border-[#C4A76C]/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.09)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      data-testid={`venue-card-${venue.venue_id}`}
    >  <div className="relative aspect-[4/3] overflow-hidden">
        <img src={img} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {/* Verified — top-left, prominent */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#065F46] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-[0.04em] uppercase">VL Verified</span>
        </div>
        {/* Rating — top-right, small and clean */}
        {venue.rating > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-[#C4A76C] text-[#C4A76C]" />
            <span className="text-[11px] font-bold text-white">{venue.rating.toFixed(1)}</span>
          </div>
        )}
        {/* Hover actions — bottom-right */}
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all" data-testid={`venue-fav-${venue.venue_id}`}>
            <Heart className="w-4 h-4 text-[#555]" />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all" data-testid={`venue-compare-${venue.venue_id}`}>
            <Scale className="w-4 h-4 text-[#555]" />
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="p-5 pt-4">
        <h3 className="text-[15px] font-bold text-[#111] mb-1.5 line-clamp-1 leading-tight">{venue.name}</h3>
        <div className="flex items-center gap-1.5 text-[#777] text-[12px] mb-3">
          <MapPin className="w-3.5 h-3.5 text-[#C4A76C] flex-shrink-0" strokeWidth={1.8} />
          <span className="truncate">{venue.area ? `${venue.area}, ${venue.city}` : venue.city}</span>
        </div>
        {/* Price & Capacity row */}
        <div className="flex items-center justify-between py-2.5 mb-3 border-t border-b border-[#F0F0F0]">
          {price ? (
            <div>
              <span className="text-[16px] font-extrabold text-[#111]">₹{price.toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-[#AAA] font-medium ml-0.5">/plate</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#999]">Price on request</span>
          )}
          {capMax && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#777] bg-[#F8F5ED] px-2.5 py-1 rounded-lg">
              <Users className="w-3 h-3 text-[#C4A76C]" strokeWidth={1.8} />
              <span className="font-bold">{capMin || 50}–{capMax}</span>
            </div>
          )}
        </div>
        {/* Amenities */}
        {displayAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayAmenities.map(a => (
              <span key={a} className="px-2.5 py-1 bg-[#F5F4F0] text-[10px] text-[#888] font-semibold rounded-md tracking-wide">{a}</span>
            ))}
          </div>
        )}
        {/* CTA */}
        <button onClick={() => navigate(venueLink)}
          className="w-full py-3 text-[11px] font-bold text-white bg-[#111] rounded-xl hover:bg-[#222] active:scale-[0.98] transition-all tracking-[0.08em] uppercase group/btn"
          data-testid={`venue-details-${venue.venue_id}`}>
          <span className="flex items-center justify-center gap-2">Explore Venue <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" /></span>
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
  const { isAuthenticated, user, logout } = useAuth();
  const { favoriteIds } = useFavorites();
  const [searchMode, setSearchMode] = useState('city');
  const [selectedCity, setSelectedCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [bookingDate, setBookingDate] = useState('');
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
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHeroImageIndex(i => (i + 1) % HERO_IMAGES.length), 4000);
    return () => clearInterval(id);
  }, []);
  const toggleDropdown = (name) => setActiveDropdown(prev => prev === name ? null : name);

  useEffect(() => { const h = (e) => { if (!e.target.closest('[data-dropdown]')) setActiveDropdown(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { const fetchCities = (r = 0) => { fetch(`${API_URL}/api/venues/cities`).then(r => r.json()).then(data => { if (Array.isArray(data) && data.length > 0) { setCitiesData(data); setCityNames(data.flatMap(c => c.city === 'Delhi' ? ['South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'] : [c.city])); } }).catch(() => { if (r < 3) setTimeout(() => fetchCities(r + 1), (r + 1) * 2000); }); }; fetchCities(0); }, []);
  useEffect(() => { const fetchFeat = (r = 0) => { fetch(`${API_URL}/api/venues/featured`).then(r => r.json()).then(data => { if (Array.isArray(data)) setFeaturedVenues(data); }).catch(() => { if (r < 3) setTimeout(() => fetchFeat(r + 1), (r + 1) * 2000); }); }; fetchFeat(0); }, []);

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
    const p = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) p.set('city', DELHI_SUBS.includes(selectedCity) ? 'Delhi' : selectedCity);
    else if (searchMode === 'nearby' && geoCoords) { p.set('lat', geoCoords.lat.toString()); p.set('lng', geoCoords.lng.toString()); p.set('radius', radius); }
    // Store booking intent for the enquiry flow
    if (guestCount) localStorage.setItem('booking_guests', guestCount);
    if (bookingDate) localStorage.setItem('booking_date', bookingDate);
    navigate(`/venues/search?${p.toString()}`);
  };

  const switchMode = (mode) => { setSearchMode(mode); setActiveDropdown(null); setGeoError(''); };

  const scrollY = useScrollY();
  const heroParallax = Math.min(scrollY * 0.25, 200);
  const headerOpacity = Math.min(scrollY / 300, 1);

  return (
    <div className="min-h-screen bg-white app-main-content" data-testid="landing-page">
      <SEOHead
        title="Premium Venue Marketplace"
        description="Discover and book 500+ premium event venues across India. Find banquet halls, hotels, and wedding venues curated for your perfect celebration."
        path="/"
      />
      <style>{`
        @keyframes float-card {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gold-line {
          0% { width: 0; opacity: 0; }
          100% { width: 40px; opacity: 1; }
        }
        @keyframes fade-up-in {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes venue-card-lift {
          0% { transform: translateY(0); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          100% { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
        }
        @keyframes typeReveal {
          0% { width: 0; }
          100% { width: 100%; }
        }
        .animate-float-card { animation: float-card 6s ease-in-out infinite; }
        .btn-shimmer {
          background: #1A1A1A;
          transition: all 0.3s;
        }
        .btn-shimmer:hover { opacity: 0.9; }
        .stat-gold-line::after {
          content: '';
          display: block;
          height: 2px;
          background: #C4A76C;
          margin: 12px auto 0;
          border-radius: 1px;
          animation: gold-line 0.8s ease-out forwards;
        }
        .hero-text-enter { animation: fade-up-in 0.9s ease-out both; }
        .hero-text-enter-d1 { animation: fade-up-in 0.9s ease-out 0.15s both; }
        .hero-text-enter-d2 { animation: fade-up-in 0.9s ease-out 0.3s both; }
        .hero-text-enter-d3 { animation: fade-up-in 0.9s ease-out 0.45s both; }
        .hero-text-enter-d4 { animation: fade-up-in 0.9s ease-out 0.6s both; }
        .cta-gold-gradient {
          background: linear-gradient(135deg, #EDD07E 0%, #E2C06E 50%, #C4A76C 100%);
          box-shadow: 0 4px 20px rgba(226,192,110,0.25);
          transition: all 0.3s;
        }
        .cta-gold-gradient:hover {
          background: linear-gradient(135deg, #F5DC8A 0%, #EDD07E 50%, #E2C06E 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(226,192,110,0.45);
        }
        @keyframes cta-glow {
          0%, 100% { box-shadow: 0 4px 16px rgba(226,192,110,0.25); }
          50% { box-shadow: 0 4px 32px rgba(226,192,110,0.5); }
        }
        .hero-celebrate {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
        }
        .hero-celebrate-inner {
          display: inline-block;
          animation: typeReveal 0.8s ease-out 0.6s both;
          overflow: hidden;
          white-space: nowrap;
        }
      `}</style>

      {/* ════════════════════════════════════════════ */}
      {/* ═══ MOBILE HEADER (Polished) ═══ */}
      {/* ════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden" data-testid="mobile-header" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-5 h-14 bg-[#0B0B0D]/95 backdrop-blur-2xl border-b border-white/[0.04]">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="logo-btn">
            <BrandLogo size="sm" dark={true} linkTo={null} />
          </button>
          <div className="flex items-center gap-1.5">
            {isAuthenticated ? (
              <>
                <span className="text-[11px] font-semibold text-[#E2C06E]" data-testid="mobile-welcome-landing">
                  {user?.name?.split(' ')[0]}
                </span>
                <NotificationBell variant="dark" />
              </>
            ) : (
              <button onClick={() => navigate('/auth')} className="text-[11px] font-semibold text-[#E2C06E] hover:text-[#EDD07E] px-2.5 py-1.5 transition-colors" data-testid="mobile-signin-btn">Sign In</button>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors" data-testid="mobile-menu-toggle">
              {mobileMenuOpen ? <X className="w-4.5 h-4.5 text-white/70" /> : <Menu className="w-4.5 h-4.5 text-white/70" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="bg-[#1A1A1A]/95 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-5 space-y-1">
            {isAuthenticated && (
              <div className="flex items-center gap-3 pb-3 mb-2 border-b border-white/[0.06]">
                <div className="w-9 h-9 rounded-full bg-[#E2C06E] flex items-center justify-center text-[#1A1A1A] text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">{user?.name}</p>
                  <p className="text-[10px] text-white/35">{user?.email}</p>
                </div>
              </div>
            )}
            <button onClick={() => { navigate('/venues/search'); setMobileMenuOpen(false); }} className="block w-full text-left text-white/50 hover:text-white py-3 text-[14px] font-medium transition-colors border-b border-white/[0.04]">Browse Venues</button>
            {isAuthenticated && (
              <>
                <button onClick={() => { navigate('/favorites'); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full text-left text-white/50 hover:text-white py-3 text-[14px] font-medium transition-colors border-b border-white/[0.04]">
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" /> My Favourites
                </button>
                <button onClick={() => { navigate('/home'); setMobileMenuOpen(false); }} className="block w-full text-left text-white/50 hover:text-white py-3 text-[14px] font-medium transition-colors border-b border-white/[0.04]">My Enquiries</button>
              </>
            )}
            <div className="pt-3">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} className="block w-full text-left text-white/50 hover:text-white py-3 text-[14px] font-medium transition-colors border-b border-white/[0.04]">Profile</button>
                  <button onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }} className="block w-full text-left text-red-400 py-3 text-[14px] font-medium transition-colors">Sign Out</button>
                </div>
              ) : (
                <button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full py-3.5 text-[11px] font-bold bg-[#E2C06E] text-[#1A1A1A] tracking-[0.08em] uppercase rounded-xl shadow-[0_0_16px_rgba(226,192,110,0.25)]">Get Started</button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ═══ DESKTOP HEADER (Polished) ═══ */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] transition-colors duration-300" style={{ backgroundColor: `rgba(11,11,13,${0.75 + headerOpacity * 0.2})`, backdropFilter: `blur(${16 + headerOpacity * 8}px)` }} data-testid="main-header">
        <div className="max-w-[1280px] mx-auto px-12 flex h-[72px] items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="desktop-logo-btn">
            <BrandLogo size="md" dark={true} linkTo={null} />
          </button>
          <nav className="flex items-center gap-10">
            <button onClick={() => navigate('/venues/search')} className="text-[13px] text-[#F6F4F0]/60 hover:text-[#F6F4F0] transition-colors font-medium tracking-[0.01em]">Discover</button>
            <button onClick={() => navigate('/venues/search?event_type=Wedding')} className="text-[13px] text-[#F6F4F0]/60 hover:text-[#F6F4F0] transition-colors font-medium tracking-[0.01em]">Weddings</button>
            <button onClick={() => navigate('/venues/search?event_type=Corporate+Event')} className="text-[13px] text-[#F6F4F0]/60 hover:text-[#F6F4F0] transition-colors font-medium tracking-[0.01em]">Corporate</button>
            <button onClick={() => navigate('/list-your-venue')} className="text-[13px] text-[#F6F4F0]/60 hover:text-[#F6F4F0] transition-colors font-medium tracking-[0.01em]">List Venue</button>
          </nav>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <NotificationBell variant="dark" />
                <div className="relative">
                <button onClick={() => setDesktopProfileOpen(!desktopProfileOpen)} className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all" data-testid="desktop-profile-toggle">
                  <div className="w-7 h-7 rounded-full bg-[#E2C06E] flex items-center justify-center text-[#1A1A1A] text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[13px] text-[#F6F4F0]/80 font-medium">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#F6F4F0]/40 transition-transform ${desktopProfileOpen ? 'rotate-180' : ''}`} />
                </button>
                {desktopProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDesktopProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#1A1A1D] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50" data-testid="desktop-profile-dropdown">
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-[13px] font-bold text-white">{user?.name}</p>
                        <p className="text-[10px] text-white/40">{user?.email}</p>
                      </div>
                      <button onClick={() => { navigate('/favorites'); setDesktopProfileOpen(false); }} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                        <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> Favourites
                      </button>
                      <button onClick={() => { navigate('/home'); setDesktopProfileOpen(false); }} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                        <Calendar className="w-3.5 h-3.5" /> My Enquiries
                      </button>
                      <button onClick={() => { navigate('/profile'); setDesktopProfileOpen(false); }} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                        <UserIcon className="w-3.5 h-3.5" /> Profile
                      </button>
                      <div className="border-t border-white/[0.06]">
                        <button onClick={() => { logout(); setDesktopProfileOpen(false); navigate('/'); }} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-white/5 transition-colors">
                          <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/auth')} className="text-[13px] text-[#F6F4F0]/70 hover:text-[#F6F4F0] transition-colors font-medium" data-testid="login-btn">Sign In</button>
                <button onClick={() => navigate('/auth')} className="text-[11px] font-bold text-[#1A1A1A] px-7 py-2.5 bg-[#E2C06E] hover:bg-[#C4A76C] transition-all tracking-[0.06em] uppercase rounded-lg shadow-[0_0_20px_rgba(212,179,106,0.3)]" data-testid="get-started-btn">Get Started</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════ */}
      {/* ═══ HERO SECTION ═══ */}
      {/* ════════════════════════════════════════════ */}
      <section className="relative bg-[#1A1A1A]" data-testid="hero-section">
        <div className="absolute inset-0 overflow-hidden will-change-transform" style={{ transform: `translateY(${heroParallax}px)` }}>
          {HERO_IMAGES.map((src, i) => (
            <img key={src} src={src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: i === heroImageIndex ? 0.45 : 0, transform: `scale(${i === heroImageIndex ? 1.12 : 1.02})`, transition: 'opacity 1.8s ease-in-out, transform 5s ease-out' }} loading={i === 0 ? 'eager' : 'lazy'} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/55 via-[#1A1A1A]/20 to-[#1A1A1A]/88" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,179,106,0.08)_0%,_transparent_60%)]" />
        </div>

        <div className="relative z-20 lg:pt-[72px]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
          {/* Hero text */}
          <div className="text-center pt-10 sm:pt-24 lg:pt-32 pb-6 sm:pb-10 lg:pb-14 px-5">
            <p className="hidden sm:block text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.3em] mb-5 lg:mb-6 hero-text-enter" data-testid="hero-tagline">
              Find. Compare. Lock.
            </p>
            <h1 className="text-[2.4rem] sm:text-[3.5rem] lg:text-[5rem] xl:text-[5.5rem] font-bold leading-[0.92] tracking-[-0.03em] text-[#F6F4F0] mb-4 sm:mb-5 lg:mb-6 hero-text-enter-d1" style={{ textShadow: '0 2px 40px rgba(0,0,0,0.6), 0 4px 80px rgba(0,0,0,0.3)' }} data-testid="hero-headline">
              We Negotiate.<br /><span className="hero-celebrate text-[#C4A76C]"><span className="hero-celebrate-inner">You Celebrate.</span></span>
            </h1>
            <p className="text-[13px] sm:text-[15px] lg:text-[17px] leading-[1.6] max-w-[380px] mx-auto text-[#F6F4F0]/65 font-medium hero-text-enter-d2">
              From search to final booking, we handle the hard part for you.
            </p>
          </div>

          {/* ═══ SEARCH CARD (Glass-morphism) ═══ */}
          <div className="relative z-30 max-w-[480px] mx-auto px-5 sm:px-6 pb-10 sm:pb-12 lg:pb-14 hero-text-enter-d3">
            <div className="bg-white/[0.96] backdrop-blur-2xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.04)] border border-white/70 p-6 sm:p-7 lg:p-8" data-testid="search-card">

              {/* Toggle: City / Near Me */}
              <div className="flex bg-[#F5F3EE] rounded-xl p-1 mb-5 sm:mb-6" data-testid="search-toggle">
                <button onClick={() => switchMode('city')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold tracking-[0.04em] uppercase rounded-[10px] transition-all duration-250 ${searchMode === 'city' ? 'bg-white text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.14),0_0_1px_rgba(0,0,0,0.08)]' : 'text-[#444] hover:text-[#222]'}`}
                  data-testid="mode-city">
                  <Building2 className="w-4 h-4" strokeWidth={1.8} /> City
                </button>
                <button onClick={() => switchMode('nearby')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold tracking-[0.04em] uppercase rounded-[10px] transition-all duration-250 ${searchMode === 'nearby' ? 'bg-white text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.14),0_0_1px_rgba(0,0,0,0.08)]' : 'text-[#444] hover:text-[#222]'}`}
                  data-testid="mode-nearby">
                  <Navigation className="w-4 h-4" strokeWidth={1.8} /> Near Me
                </button>
              </div>

              {/* City Mode — city dropdown + guests & date */}
              {searchMode === 'city' && (
                <div className="mb-5 sm:mb-6 space-y-3.5">
                  <SearchDropdown label={null} icon={MapPin} value={selectedCity} placeholder="Select your city" options={cityNames} isOpen={activeDropdown === 'city'} onToggle={() => toggleDropdown('city')} onSelect={(v) => { setSelectedCity(v); setActiveDropdown(null); }} testId="city-dropdown-trigger" />
                  
                  {selectedCity && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      {/* Guest Count */}
                      <div data-dropdown>
                        <SearchDropdown label={null} icon={Users} value={guestCount} placeholder="Guests" options={['50-100', '100-200', '200-500', '500-1000', '1000+']} isOpen={activeDropdown === 'guests'} onToggle={() => toggleDropdown('guests')} onSelect={(v) => { setGuestCount(v); setActiveDropdown(null); }} testId="guests-dropdown-trigger" />
                      </div>
                      {/* Event Date */}
                      <div>
                        <div className="relative" data-dropdown>
                          <button
                            type="button"
                            onClick={() => document.getElementById('landing-date-input')?.showPicker?.()}
                            className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl transition-all duration-200 text-left cursor-pointer ${bookingDate ? 'border-[#E2E2E2] bg-[#FAFAFA] hover:border-[#CCC] hover:bg-white' : 'border-[#E2E2E2] bg-[#FAFAFA] hover:border-[#CCC] hover:bg-white'}`}
                            data-testid="date-trigger"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Calendar className="w-[18px] h-[18px] text-[#BBBBBB] flex-shrink-0" strokeWidth={1.5} />
                              <span className={`text-[14px] truncate ${bookingDate ? 'text-[#111] font-semibold' : 'text-[#BBBBBB]'}`}>
                                {bookingDate
                                  ? new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                  : 'Date'}
                              </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[#BBB] flex-shrink-0" />
                          </button>
                          <input
                            id="landing-date-input"
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            data-testid="date-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Near Me Mode */}
              {searchMode === 'nearby' && (
                <div className="mb-5 sm:mb-6">
                  {geoLoading && (
                    <div className="flex items-center justify-center gap-2.5 py-6 text-[#777]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C4A76C]" />
                      <span className="text-[13px] font-medium">Detecting your location...</span>
                    </div>
                  )}
                  {geoError && (
                    <div className="bg-amber-50/70 border border-amber-200/50 rounded-xl p-4 text-center">
                      <p className="text-[13px] text-amber-700 font-medium mb-2">Location access denied</p>
                      <button onClick={handleGetLocation} className="text-[12px] text-[#C4A76C] font-bold hover:underline" data-testid="retry-location-btn">Try again</button>
                      <span className="text-[12px] text-[#CCC] mx-2">or</span>
                      <button onClick={() => switchMode('city')} className="text-[12px] text-[#C4A76C] font-bold hover:underline" data-testid="switch-to-city-btn">search by city</button>
                    </div>
                  )}
                  {geoCoords && !geoLoading && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50/50 border border-emerald-200/40 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[13px] font-medium text-emerald-700">Location detected</span>
                    </div>
                  )}
                  {!geoCoords && !geoLoading && !geoError && (
                    <div className="text-center py-3">
                      <p className="text-[13px] text-[#999] mb-3.5 leading-relaxed">Discover venues around you.</p>
                      <button onClick={handleGetLocation}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#E0E0E0] rounded-xl text-[12px] font-bold text-[#555] hover:bg-[#F7F7F7] hover:border-[#CCC] transition-colors"
                        data-testid="get-location-btn">
                        <Locate className="w-4 h-4 text-[#C4A76C]" /> Use My Location
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CTA — sharp premium gold */}
              <button onClick={handleSearch}
                className="w-full flex items-center justify-center gap-2.5 py-4 sm:py-[18px] text-[13px] font-bold text-[#1A1A1A] cta-gold-gradient active:scale-[0.98] transition-all tracking-[0.06em] uppercase rounded-xl border border-[#C4A76C]/20"
                data-testid="find-venue-btn">
                <Search className="w-4 h-4" strokeWidth={2.5} />
                {searchMode === 'nearby' && geoCoords ? 'Find Venues Near Me' : 'Find My Perfect Venue'}
              </button>
              <p className="text-center text-[10px] text-[#AAAAAA] mt-3.5 font-medium tracking-wide" data-testid="cta-microcopy">Free venue matching &bull; No booking fees &bull; Expert booking support</p>

            </div>
          </div>

          {/* ═══ VENUE SHOWCASE CAROUSEL ═══ */}
          <VenueShowcase featuredVenues={featuredVenues} navigate={navigate} />
        </div>
      </section>

      {/* ═══ EVERYTHING BELOW IS LIGHT ═══ */}

      {/* ═══ 1. TRUST BADGES ═══ */}
      <section className="relative py-14 lg:py-20 bg-white border-b border-[#F0F0F0]" data-testid="trust-badges">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8 lg:gap-10">
            {TRUST_BADGES.map((badge, i) => (
              <div key={badge.title} className="flex items-start gap-3.5" data-testid={`trust-badge-${i}`}>
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#F8F5ED] rounded-2xl flex items-center justify-center flex-shrink-0 border border-[#E8E0C8]/40">
                  <badge.icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#C4A76C]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] lg:text-[14px] font-bold text-[#111] leading-snug">{badge.title}</h4>
                  <p className="text-[11px] lg:text-[12px] text-[#999] mt-1 leading-relaxed">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 2. VENUE CATEGORIES ═══ */}
      <section className="py-20 lg:py-28 bg-[#FAFAF8]" data-testid="venue-categories">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <p className="text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.2em] mb-3">Explore</p>
              <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold text-[#111] leading-[1.1]">Browse by Venue Type</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
            {VENUE_CATEGORIES.map((cat, i) => (
              <Reveal key={cat.label} delay={i * 40}>
                <button onClick={() => navigate(cat.query ? `/venues/search?${cat.query}` : `/venues/search?venue_type=${cat.type}`)}
                  className="w-full aspect-square bg-white border border-[#EBEBEB] rounded-2xl p-4 sm:p-5 lg:p-6 flex flex-col items-center justify-center hover:border-[#C4A76C]/50 hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  data-testid={`category-${cat.type}-${i}`}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-[#F8F5ED] rounded-xl flex items-center justify-center mb-2.5 group-hover:bg-[#C4A76C]/15 transition-colors border border-[#E8E0C8]/30">
                    <cat.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-[#C4A76C]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[11px] sm:text-[12px] lg:text-[13px] font-bold text-[#333] leading-tight text-center line-clamp-1">{cat.label}</h3>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C4A76C] mx-auto mt-2 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAVOURITES TAB (Logged-in users with favorites) ═══ */}
      {isAuthenticated && favoriteIds.length > 0 && (
        <section className="bg-[#FAFAF8] border-t border-black/[0.04]" data-testid="landing-favorites-section">
          <div className="max-w-[1120px] mx-auto px-5 lg:px-10 py-4">
            <button
              onClick={() => navigate('/favorites')}
              className="flex items-center gap-3 w-full sm:w-auto px-5 py-3.5 bg-white border border-black/[0.06] rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
              data-testid="landing-favorites-tab"
            >
              <Heart className="w-5 h-5 text-red-400 fill-red-400 flex-shrink-0" />
              <span className="text-[14px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                My Favourites
              </span>
              <span className="text-[12px] text-white bg-[#1A1A1A] px-2 py-0.5 rounded-full font-bold">{favoriteIds.length}</span>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
            </button>
          </div>
        </section>
      )}

      {/* ═══ 3. FEATURED VENUES ═══ */}
      <section className="py-10 lg:py-28 bg-white" data-testid="featured-venues-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-10 lg:mb-14">
              <div>
                <p className="text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.2em] mb-3">Top Picks</p>
                <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold text-[#111] leading-[1.1]">Handpicked & Verified</h2>
              </div>
              <button onClick={() => navigate('/venues/search')} className="hidden sm:flex text-[13px] items-center gap-2 text-[#BBB] hover:text-[#111] transition-colors group font-semibold" data-testid="view-all-venues-btn">
                View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Reveal>
          {featuredVenues.length > 0 ? (
            <div className="flex gap-5 overflow-x-auto scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible snap-x snap-mandatory">
              {featuredVenues.map((venue, i) => (
                <Reveal key={venue.venue_id} delay={i * 60}>
                  <div className="min-w-[280px] sm:min-w-[300px] lg:min-w-0 snap-start">
                    <VenueCard venue={venue} navigate={navigate} />
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
              {[1,2,3,4].map(i => (
                <div key={i} className="min-w-[280px] lg:min-w-0 animate-pulse rounded-2xl overflow-hidden border border-[#EBEBEB]">
                  <div className="aspect-[4/3] bg-[#F5F5F5]" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-[#F0F0F0] rounded w-3/4" />
                    <div className="h-3 bg-[#F0F0F0] rounded w-1/2" />
                    <div className="h-10 bg-[#F0F0F0] rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/venues/search')} className="sm:hidden flex items-center justify-center gap-2 w-full mt-8 py-3.5 text-[12px] text-[#111] font-bold border border-[#E0E0E0] rounded-xl hover:bg-[#F7F7F7] transition-colors tracking-[0.04em]">
            Browse All Venues <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ═══ 4. HOW IT WORKS ═══ */}
      <section className="py-10 lg:py-28 bg-[#FAFAF8] border-t border-[#F0F0F0]" id="how-it-works" data-testid="how-it-works">
        <div className="max-w-[1040px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <p className="text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.2em] mb-3">How It Works</p>
              <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold text-[#111] leading-[1.1]">Three steps to your perfect venue</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 lg:gap-14">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 100}>
                <div className="text-center sm:text-left relative">
                  <div className="text-[48px] lg:text-[72px] font-black text-[#C4A76C]/12 leading-none select-none">{s.num}</div>
                  <h3 className="text-[16px] lg:text-[18px] font-bold text-[#111] -mt-2 mb-2.5">{s.title}</h3>
                  <p className="text-[13px] lg:text-[14px] leading-[1.75] text-[#999]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. CONCIERGE SERVICE ═══ */}
      <section className="py-10 lg:py-28 bg-[#1A1A1A] relative overflow-hidden" data-testid="concierge-section">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#E2C06E] rounded-full blur-[150px] opacity-[0.05]" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#E2C06E] rounded-full blur-[120px] opacity-[0.04]" />
        </div>
        <div className="max-w-[1040px] mx-auto px-5 lg:px-10 relative z-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <div className="inline-flex items-center gap-2 bg-[#E2C06E]/10 border border-[#E2C06E]/20 rounded-full px-4 py-1.5 mb-4">
                <Crown className="w-3.5 h-3.5 text-[#E2C06E]" />
                <span className="text-[10px] font-bold text-[#E2C06E] uppercase tracking-[0.15em]">VenuLoQ Concierge</span>
              </div>
              <h2 className="text-[24px] sm:text-[28px] lg:text-[38px] font-bold text-white leading-[1.1]">
                Your Personal Relationship Manager<br />Handles <span className="text-[#E2C06E]">Everything</span>
              </h2>
              <p className="text-[14px] text-white/45 mt-4 max-w-[520px] mx-auto leading-relaxed">
                One dedicated Relationship Manager from first call to last dance. Zero stress, zero coordination headaches.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {[
              { label: 'Venue Selection', sub: 'Shortlisting & Negotiation' },
              { label: 'Decor & Theme', sub: 'Design & Setup' },
              { label: 'Catering & Menu', sub: 'Veg, Non-Veg & Custom' },
              { label: 'DJ & Live Music', sub: 'Curated Playlists & Bands' },
              { label: 'Artists & Acts', sub: 'Dancers, Comedians & More' },
              { label: 'Photography', sub: 'Photo + Video + Drone' },
              { label: 'Mehendi & Sangeet', sub: 'Artists & Choreography' },
              { label: 'Makeup & Styling', sub: 'Bride, Groom & Family' },
              { label: 'Guest Management', sub: 'RSVP, Seating & Gifting' },
              { label: 'Travel & Stay', sub: 'Hotels, Flights & Transfers' },
              { label: 'Budget Planning', sub: 'Track Every Rupee' },
              { label: 'Day-of Execution', sub: 'End-to-End Coordination' },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 50} className="h-full">
                <div className="h-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 hover:border-[#E2C06E]/30 hover:bg-[#E2C06E]/[0.04] transition-all duration-300 group">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#E2C06E] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(226,192,110,0.3)]">
                      <Check className="w-3 h-3 text-[#1A1A1A]" strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white leading-tight">{s.label}</h4>
                      <p className="text-[11px] text-white/35 mt-0.5">{s.sub}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={600}>
            <div className="text-center mt-10 lg:mt-14">
              <div className="inline-flex items-center gap-2 bg-[#E2C06E]/10 border border-[#E2C06E]/20 rounded-xl px-5 py-2.5 mb-6">
                <Sparkles className="w-4 h-4 text-[#E2C06E]" />
                <span className="text-[12px] text-[#E2C06E] font-semibold">All 12 services included with every booking — Zero extra charge</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => navigate('/venues/search')}
                  className="inline-flex items-center gap-2.5 px-8 py-4 text-[12px] font-bold bg-[#E2C06E] text-[#1A1A1A] hover:bg-[#EDD07E] transition-all tracking-[0.06em] uppercase rounded-xl shadow-[0_4px_24px_rgba(226,192,110,0.3)]"
                  data-testid="concierge-cta-explore">
                  Find Your Venue <ArrowRight className="w-4 h-4" />
                </button>
                <a href={VENULOQ_SUPPORT.telLink}
                  className="inline-flex items-center gap-2 px-6 py-4 text-[12px] font-bold text-white/60 border border-white/15 hover:border-[#E2C06E]/30 hover:text-[#E2C06E] transition-all tracking-[0.06em] uppercase rounded-xl"
                  data-testid="concierge-cta-call">
                  <Phone className="w-4 h-4" /> Talk to a Concierge
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ 6. WHY VENULOQ ═══ */}
      {/* ═══ 6. WHY VENULOQ — hidden on mobile ═══ */}
      <section className="hidden lg:block py-20 lg:py-28 bg-white" data-testid="why-choose-us">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <p className="text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.2em] mb-3">Why VenuLoQ</p>
              <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold text-[#111] leading-[1.1]">The smarter way to book venues</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5 lg:gap-6">
            {WHY_REASONS.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="bg-[#FAFAF8] border border-[#E5E5E5] rounded-2xl p-7 lg:p-8 hover:border-[#C4A76C]/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden" data-testid={`why-card-${i}`}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C4A76C] to-[#C4A76C]/0 rounded-l-2xl" />
                  <div className="w-12 h-12 bg-[#111] rounded-xl flex items-center justify-center mb-5">
                    <item.icon className="w-5 h-5 text-[#C4A76C]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#111] mb-2">{item.title}</h3>
                  <p className="text-[13px] leading-[1.75] text-[#999]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. STATS / SOCIAL PROOF (Refined) — Desktop only ═══ */}
      <section className="hidden lg:block py-20 lg:py-24 bg-[#111] relative overflow-hidden" data-testid="stats-section">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(226,192,110,0.08)_0%,_transparent_70%)]" />
        <div className="max-w-[1040px] mx-auto px-5 lg:px-10 relative z-10">
          <Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 text-center">
              {[
                { target: '500', suffix: '+', label: 'Verified Venues' },
                { target: '150', suffix: '+', label: 'Expert Planners' },
                { target: '4.8', suffix: '', label: 'Average Rating', isDecimal: true },
                { target: '1800', suffix: '+', label: 'Events Booked' },
              ].map((stat) => (
                <div key={stat.label} className="stat-gold-line">
                  <div className="text-[32px] lg:text-[48px] font-bold text-white leading-none tracking-tight">
                    {stat.isDecimal ? (
                      <span className="flex items-center justify-center gap-1.5"><Star className="w-6 h-6 fill-[#C4A76C] text-[#C4A76C]" /> 4.8</span>
                    ) : (
                      <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                    )}
                  </div>
                  <div className="text-[10px] lg:text-[11px] text-white/45 font-bold tracking-[0.12em] uppercase mt-3">{stat.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ TESTIMONIALS (Refined) — Desktop only ═══ */}
      <section className="hidden lg:block py-20 lg:py-28 bg-white border-t border-[#F0F0F0]" data-testid="testimonials-section">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <Reveal>
            <div className="text-center mb-10 lg:mb-14">
              <p className="text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.2em] mb-3">Testimonials</p>
              <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold text-[#111] leading-[1.1]">Trusted by thousands across India</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5 lg:gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="bg-[#FAFAF8] border border-[#E5E5E5] rounded-2xl p-7 lg:p-8 hover:border-[#C4A76C]/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col" data-testid={`testimonial-card-${i}`}>
                  <div className="flex items-center gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#C4A76C] text-[#C4A76C]" />)}
                  </div>
                  <p className="text-[14px] leading-[1.8] text-[#555] mb-6 font-normal flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="border-t border-[#E8E8E8] pt-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <span className="text-[12px] font-bold text-[#C4A76C]">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#111]">{t.name}</p>
                      <p className="text-[11px] text-[#BBB] mt-0.5">{t.event} &middot; {t.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA BANNER — Desktop only ═══ */}
      <section className="hidden lg:block py-24 lg:py-28 bg-[#111] relative overflow-hidden" data-testid="final-cta">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(226,192,110,0.10)_0%,_transparent_60%)]" />
        <Reveal>
          <div className="max-w-[640px] mx-auto px-5 lg:px-10 text-center">
            <p className="text-[11px] font-bold text-[#C4A76C] uppercase tracking-[0.2em] mb-5">Get Started</p>
            <h2 className="text-[26px] sm:text-[32px] lg:text-[38px] font-bold text-white leading-[1.1] mb-4">Ready to lock your venue?</h2>
            <p className="text-[14px] text-white/45 mb-10 font-medium leading-relaxed max-w-[480px] mx-auto">
              Free, no commitment. Your dedicated venue expert is one click away.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2.5 px-9 py-[18px] text-[12px] font-bold bg-[#E2C06E] text-[#1A1A1A] hover:bg-[#EDD07E] transition-all tracking-[0.08em] uppercase rounded-xl shadow-[0_4px_24px_rgba(226,192,110,0.35)]"
                data-testid="final-cta-booking">
                Start Booking <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <ConnectButton className="px-9 py-[18px] text-[12px] font-bold border border-white/15 text-white/55 hover:text-white hover:border-white/30 tracking-[0.08em] uppercase transition-all rounded-xl" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      {/* ═══ FOOTER — Desktop only ═══ */}
      <footer className="hidden lg:block py-14 lg:py-20 bg-[#1A1A1A] border-t border-white/[0.04]" data-testid="main-footer">
        <div className="max-w-[1120px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 lg:gap-14 mb-14">
            <div>
              <div className="mb-5">
                <BrandLogo size="md" dark={true} showTagline={true} linkTo={null} />
              </div>
              <p className="text-[12px] text-[#F6F4F0]/25 leading-relaxed">India's trusted venue booking platform. We negotiate, you celebrate.</p>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.12em] font-bold text-white/35 mb-5">Platform</h4>
              <ul className="space-y-3">
                {[{ l: 'Discover Venues', h: '/venues/search' }, { l: 'How It Works', h: '/#how-it-works', isAnchor: true }, { l: 'List Your Venue', h: '/list-your-venue' }, { l: 'Partner With Us', h: '/partner' }].map(x => (
                  <li key={x.l}><button onClick={() => { if (x.isAnchor) { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else navigate('/'); } else navigate(x.h); }} className="text-[13px] text-white/30 hover:text-white/65 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.12em] font-bold text-white/35 mb-5">Company</h4>
              <ul className="space-y-3">
                {[{ l: 'About Us', h: '/about' }, { l: 'Contact', h: '/contact' }, { l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }].map(x => (
                  <li key={x.l}><button onClick={() => navigate(x.h)} className="text-[13px] text-white/30 hover:text-white/65 transition-colors text-left" data-testid={`footer-link-${x.l.toLowerCase().replace(/\s/g, '-')}`}>{x.l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.12em] font-bold text-white/35 mb-5">Top Cities</h4>
              <ul className="space-y-3">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Chandigarh'].map(c => (
                  <li key={c}><button onClick={() => navigate(`/venues/search?city=${c}`)} className="text-[13px] text-white/30 hover:text-white/65 transition-colors text-left" data-testid={`footer-city-${c.toLowerCase().replace(/\s/g, '-')}`}>{c}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-7 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} VenuLoQ. All rights reserved.</p>
            <div className="flex items-center gap-8">
              <button onClick={() => navigate('/privacy')} className="text-[12px] text-white/15 hover:text-white/45 transition-colors" data-testid="footer-privacy-policy">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-[12px] text-white/15 hover:text-white/45 transition-colors" data-testid="footer-terms-of-service">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
