import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ArrowRight, 
  CheckCircle2, RefreshCw, GitCompare, ShieldCheck, Lock,
  Star, Globe, Phone, ChevronRight, Building2, Navigation, Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FALLBACK_CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
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

  useEffect(() => {
    fetch(`${API_URL}/api/venues/cities`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCitiesData(data);
          setCityNames(data.map(c => c.city));
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

  const handleExplore = () => {
    const params = new URLSearchParams();
    if (searchMode === 'city' && selectedCity) {
      params.set('city', selectedCity);
    } else if (searchMode === 'nearby' && geoCoords) {
      params.set('lat', geoCoords.lat.toString());
      params.set('lng', geoCoords.lng.toString());
      params.set('radius', radius);
    }
    navigate(`/venues/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white" style={{ color: '#0A1A2F' }}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-[9999] bg-white border-b" style={{ borderColor: '#EAEAEA' }} data-testid="main-header">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex h-14 sm:h-16 items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center" data-testid="logo-btn">
            <Logo className="h-[36px] sm:h-[42px] w-auto" />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium hover:underline underline-offset-4 hidden sm:block"
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

      {/* ── HERO ── */}
      <section className="pt-16 sm:pt-24 pb-12 sm:pb-16 text-center" data-testid="hero-section">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-bold leading-[1.12] tracking-tight font-sans" data-testid="hero-headline">
            We Coordinate.{' '}
            <span style={{ color: '#C7A14A' }}>You Celebrate.</span>
          </h1>
          <p className="mt-5 text-sm sm:text-base leading-relaxed max-w-lg mx-auto" style={{ color: '#6B7280' }}>
            Dedicated Relationship Managers. Verified Venues.
            <br className="hidden sm:block" />
            Structured Negotiation from first call to confirmation.
          </p>
        </div>
      </section>

      {/* ── SEARCH MODULE ── */}
      <section className="pb-14 sm:pb-20" data-testid="search-section">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          {/* Mode Toggle */}
          <div className="flex items-center justify-center mb-5">
            <div className="flex p-1 rounded-full gap-1" style={{ backgroundColor: '#F3F3F1' }}>
              <button
                onClick={() => { setSearchMode('city'); setGeoError(''); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                style={searchMode === 'city' ? { backgroundColor: '#fff', color: '#0A1A2F', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6B7280' }}
                data-testid="mode-city"
              >
                <Building2 className="h-4 w-4" />
                Choose City
              </button>
              <button
                onClick={() => { setSearchMode('nearby'); if (!geoCoords) handleGetLocation(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                style={searchMode === 'nearby' ? { backgroundColor: '#fff', color: '#0A1A2F', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6B7280' }}
                data-testid="mode-nearby"
              >
                <Navigation className="h-4 w-4" />
                Near Me
              </button>
            </div>
          </div>

          {/* City Mode */}
          {searchMode === 'city' && (
            <div className="rounded-[10px] border bg-white overflow-hidden flex gap-0" style={{ borderColor: '#0A1A2F' }} data-testid="search-bar">
              <div className="flex-1 relative">
                <label className="absolute top-2 left-3 text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6B7280' }}>City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pt-6 pb-2.5 px-3 text-sm bg-transparent focus:outline-none appearance-none cursor-pointer font-sans"
                  data-testid="search-city"
                >
                  <option value="">All Cities</option>
                  {cityNames.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={handleExplore}
                className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-white transition-colors flex-shrink-0"
                style={{ backgroundColor: '#C7A14A' }}
                data-testid="explore-venues-btn"
              >
                Explore Venues <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Near Me Mode */}
          {searchMode === 'nearby' && (
            <div className="rounded-[10px] border bg-white p-4 space-y-3" style={{ borderColor: '#0A1A2F' }} data-testid="nearby-panel">
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
                  data-testid="get-location-btn"
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#C7A14A' }}
                    data-testid="explore-nearby-btn"
                  >
                    Explore <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Trust indicators */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="trust-strip">
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
              data-testid="browse-all-link"
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
              onClick={() => navigate('/contact')}
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
                  { l: 'For Venues', h: '#' }
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
