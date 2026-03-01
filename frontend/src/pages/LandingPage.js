import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Users, ArrowRight, Calendar,
  ShieldCheck, ClipboardList, UserCheck, FileCheck,
  CheckCircle2, Building2, Eye, RefreshCw,
  ChevronRight, Globe, Activity, Phone,
  Lock, BarChart3, FileText, Crosshair
} from 'lucide-react';

const CITIES_SELECT = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
];

const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'conference', label: 'Conference' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'party', label: 'Party' },
  { value: 'other', label: 'Other' }
];

const STEPS = [
  {
    num: '01',
    title: 'Submit Your Event Details',
    desc: 'Tell us your city, event type, guest count, and preferred dates. Your request enters our coordination pipeline.'
  },
  {
    num: '02',
    title: 'RM Shortlists & Coordinates',
    desc: 'Your dedicated Relationship Manager contacts venues, checks live availability, and negotiates pricing on your behalf.'
  },
  {
    num: '03',
    title: 'Structured Offers Shared',
    desc: 'Receive a curated shortlist with transparent pricing, amenities, and terms — ready for side-by-side comparison.'
  },
  {
    num: '04',
    title: 'Secure Booking Confirmation',
    desc: 'Finalize your venue with a secure, documented booking. Contracts, payments, and confirmations — all managed through the platform.'
  }
];

const ADVANTAGES = [
  { icon: ShieldCheck, title: 'Verified Venue Network', desc: 'Every venue is physically audited. Listings reflect actual capacity, pricing, and availability.' },
  { icon: BarChart3, title: 'Structured Pricing Negotiation', desc: 'Your RM negotiates directly with venues. You receive structured, comparable quotes — no guesswork.' },
  { icon: UserCheck, title: 'Dedicated RM Management', desc: 'One point of contact from search to booking. Your RM handles coordination, follow-ups, and vendor communication.' },
  { icon: Eye, title: 'Transparent Booking Process', desc: 'Every step is visible. Track shortlists, offers, confirmations, and payments in one place.' },
  { icon: FileText, title: 'Secure Documentation', desc: 'Digital contracts, payment receipts, and booking confirmations — all stored and accessible on platform.' }
];

const LIVE_ACTIVITY = [
  { text: '6 events confirmed today' },
  { text: '24 active comparisons' },
  { text: '14 venues added this month' },
  { text: 'Active across 10+ cities' }
];

const CITY_GRID = [
  { name: 'Delhi NCR', venues: 520 },
  { name: 'Mumbai', venues: 420 },
  { name: 'Bengaluru', venues: 380 },
  { name: 'Hyderabad', venues: 245 },
  { name: 'Pune', venues: 185 },
  { name: 'Jaipur', venues: 165 },
  { name: 'Goa', venues: 88 },
  { name: 'Udaipur', venues: 72 }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState('10');
  const [locating, setLocating] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleNearMe = () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    setCity('');
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { setNearMe(true); setLocating(false); },
        () => { setLocating(false); }
      );
    } else {
      setLocating(false);
    }
  };

  const handleExplore = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (nearMe) {
      p.set('near_me', 'true');
      p.set('radius', radius);
    } else if (city) {
      p.set('city', city);
    }
    navigate(`/venues?${p.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* NAV */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0F1C]/95 backdrop-blur-md shadow-lg shadow-black/10' : 'bg-transparent'}`}
        data-testid="main-header"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded bg-[#C7A14A] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white tracking-tight">BMV</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white font-sans">BookMyVenue</span>
          </div>

          <nav className="hidden md:flex items-center gap-7">
            <a href="#how-it-works" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">How It Works</a>
            <a href="#why-bmv" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">Why BMV</a>
            <a href="#cities" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">Cities</a>
            <a href="#for-venues" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">For Venues</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-[13px] text-white/50 hover:text-white transition-colors hidden sm:block" data-testid="login-btn">Log in</button>
            <button onClick={() => navigate('/register')} className="text-[13px] font-medium bg-[#C7A14A] text-white px-4 py-2 rounded hover:bg-[#b5912f] transition-colors" data-testid="get-started-btn">Get Started</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative bg-gradient-to-b from-[#080C18] via-[#0E1525] to-[#131B2E] pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden" data-testid="hero-section">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px'}} />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          {/* Headline block */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-bold leading-[1.12] tracking-tight font-sans text-white mb-5" data-testid="hero-headline">
              We <span className="text-[#C7A14A]">Coordinate</span>. You <span className="text-[#C7A14A]">Celebrate</span>.
            </h1>
            <p className="text-[15px] sm:text-base text-white/45 leading-relaxed max-w-lg mx-auto">
              Discover verified venues in your city. Our dedicated RM manages negotiation and booking once you're ready.
            </p>
          </div>

          {/* SEARCH MODULE — Low Friction */}
          <form onSubmit={handleExplore} className="max-w-xl mx-auto bg-white rounded-xl shadow-2xl shadow-black/25 p-5 sm:p-6" data-testid="search-bar">
            {/* City select OR Near Me toggle */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={nearMe ? '__near_me__' : city}
                  onChange={(e) => {
                    if (e.target.value === '__near_me__') {
                      handleNearMe();
                    } else {
                      setNearMe(false);
                      setCity(e.target.value);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C7A14A]/50 focus:ring-1 focus:ring-[#C7A14A]/20 appearance-none cursor-pointer font-sans bg-white"
                  data-testid="search-city"
                >
                  <option value="">Select city</option>
                  {CITIES_SELECT.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNearMe}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all flex-shrink-0 ${
                  nearMe
                    ? 'bg-[#C7A14A]/10 border-[#C7A14A]/30 text-[#C7A14A]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                data-testid="near-me-btn"
              >
                <Crosshair className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{locating ? 'Locating...' : 'Near Me'}</span>
              </button>
            </div>

            {/* Radius selector — shown when Near Me active */}
            {nearMe && (
              <div className="mb-4 flex items-center gap-3" data-testid="radius-selector">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Radius</span>
                <div className="flex gap-1.5">
                  {['5', '10', '20'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadius(r)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        radius === r
                          ? 'bg-[#C7A14A] text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      data-testid={`radius-${r}km`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#C7A14A] text-white text-sm font-semibold hover:bg-[#b5912f] transition-all shadow-sm"
              data-testid="explore-venues-btn"
            >
              Explore Venues <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Secondary CTA */}
          <div className="mt-5 text-center">
            <button
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/70 transition-colors"
              data-testid="talk-to-expert-btn"
            >
              <Phone className="h-3.5 w-3.5" /> or Talk to an Expert
            </button>
          </div>

          {/* TRUST STRIP */}
          <div className="mt-10 max-w-xl mx-auto grid grid-cols-2 gap-x-6 gap-y-3" data-testid="trust-strip">
            {[
              '3,000+ Verified Venues',
              'Dedicated RM Coordination',
              'Structured Negotiation',
              'Secure Booking Process'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#C7A14A] flex-shrink-0" />
                <span className="text-[12px] text-white/40">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 sm:py-20 border-t border-gray-100" data-testid="how-it-works">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans mb-2">How It Works</h2>
          <p className="text-sm text-gray-400 mb-10 max-w-md">The operational flow from request to confirmed booking.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden">
            {STEPS.map((s) => (
              <div key={s.num} className="bg-white p-5 sm:p-6">
                <div className="text-[11px] font-bold text-[#C7A14A] tracking-wider mb-3 font-sans">STEP {s.num}</div>
                <h3 className="text-sm font-semibold mb-2 font-sans">{s.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY BOOKMYVENUE */}
      <section id="why-bmv" className="py-16 sm:py-20 border-t border-gray-100 bg-gray-50/60" data-testid="why-bmv">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans mb-2">Why BookMyVenue</h2>
          <p className="text-sm text-gray-400 mb-10 max-w-md">What the platform delivers at every stage of the booking process.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className="bg-white border border-gray-200 rounded p-5 hover:border-gray-300 transition-colors" data-testid="advantage-card">
                <div className="h-9 w-9 rounded bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                  <a.icon className="h-4 w-4 text-gray-500" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 font-sans">{a.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKINGS IN MOTION */}
      <section className="py-16 sm:py-20 border-t border-gray-100" data-testid="live-activity">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-2 mb-8">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans">Bookings in Motion</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {LIVE_ACTIVITY.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded px-4 py-3.5" data-testid="live-activity-card">
                <p className="text-sm text-gray-600 font-sans">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CITY COVERAGE */}
      <section id="cities" className="py-16 sm:py-20 border-t border-gray-100 bg-gray-50/60" data-testid="city-coverage">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans mb-1">City Coverage</h2>
              <p className="text-sm text-gray-400">Verified venue inventory across major metros and tier-2 cities.</p>
            </div>
            <button onClick={() => navigate('/venues')} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors items-center gap-1 group hidden sm:flex" data-testid="view-all-cities-btn">
              All cities <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CITY_GRID.map((c) => (
              <button key={c.name} onClick={() => navigate(`/venues?city=${c.name}`)} className="text-left border border-gray-200 bg-white rounded px-4 py-3.5 hover:border-gray-300 transition-all group" data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="text-sm font-semibold text-gray-900 font-sans">{c.name}</div>
                <div className="text-[13px] text-gray-400 mt-0.5">{c.venues} venues</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FOR VENUES */}
      <section id="for-venues" className="py-16 sm:py-20 border-t border-gray-100" data-testid="for-venues-section">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="border border-gray-200 rounded p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans mb-2">Partner With BookMyVenue</h2>
              <p className="text-sm text-gray-400 leading-relaxed">Access structured demand and managed booking flow. Receive verified leads, manage availability, and grow through the platform.</p>
            </div>
            <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 px-6 py-3 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex-shrink-0 font-sans" data-testid="list-venue-btn">
              List Your Venue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-10 bg-white" data-testid="main-footer">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded bg-gray-900 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">BMV</span>
                </div>
                <span className="text-sm font-semibold font-sans">BookMyVenue</span>
              </div>
              <p className="text-[12px] text-gray-400 leading-relaxed">Managed venue booking platform.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">Platform</h4>
              <ul className="space-y-1.5">
                {[{ l: 'Browse Venues', h: '/venues' }, { l: 'How It Works', h: '#how-it-works' }, { l: 'For Venues', h: '#for-venues' }].map((x) => (
                  <li key={x.l}><a href={x.h} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">{x.l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">Company</h4>
              <ul className="space-y-1.5">
                {['Contact', 'Support', 'Privacy', 'Terms'].map((l) => (
                  <li key={l}><a href="#" className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">Cities</h4>
              <ul className="space-y-1.5">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad'].map((c) => (
                  <li key={c}><a href={`/venues?city=${c}`} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">{c}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} BookMyVenue. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors">Privacy Policy</a>
              <a href="#" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
