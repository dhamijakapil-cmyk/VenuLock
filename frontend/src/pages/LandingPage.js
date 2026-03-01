import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Users, ArrowRight, Calendar,
  ShieldCheck, ArrowUpRight, BarChart3,
  RefreshCw, GitCompare, Lock, Headphones,
  Building2, Eye, CheckCircle2, Radio,
  ChevronRight, Globe, Activity, Layers
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

const LIVE_ACTIVITY = [
  { text: '27 venues viewed in Delhi in last 2 hours', icon: Eye },
  { text: '6 corporate bookings confirmed today', icon: CheckCircle2 },
  { text: '112 availability updates synced', icon: RefreshCw },
  { text: '3 new venues onboarded this week', icon: Building2 }
];

const CITY_GRID = [
  { name: 'Delhi NCR', venues: 520 },
  { name: 'Mumbai', venues: 420 },
  { name: 'Bengaluru', venues: 380 },
  { name: 'Hyderabad', venues: 245 },
  { name: 'Jaipur', venues: 165 },
  { name: 'Goa', venues: 88 },
  { name: 'Udaipur', venues: 72 }
];

const CAPABILITIES = [
  {
    icon: RefreshCw,
    title: 'Real-Time Availability Sync',
    desc: 'Venue calendars update in real time. Check open dates without waiting for callbacks.'
  },
  {
    icon: GitCompare,
    title: 'Side-by-Side Venue Comparison',
    desc: 'Compare pricing, capacity, amenities, and reviews across venues in a single view.'
  },
  {
    icon: ShieldCheck,
    title: 'Verified Venue Data',
    desc: 'Every listing is physically verified. Photos, pricing, and capacity are audited for accuracy.'
  },
  {
    icon: Lock,
    title: 'Secure Booking Workflow',
    desc: 'End-to-end encrypted transactions. Booking confirmations with digital contracts.'
  },
  {
    icon: Headphones,
    title: 'Optional Dedicated RM Support',
    desc: 'Need a human? Request a Relationship Manager to handle vendor coordination on your behalf.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  const [date, setDate] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (city) p.set('city', city);
    if (eventType) p.set('event_type', eventType);
    if (guests) p.set('guests', guests);
    if (date) p.set('date', date);
    navigate(`/venues?${p.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* NAV */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 border-b ${
          scrolled ? 'bg-white border-gray-200' : 'bg-white border-transparent'
        }`}
        data-testid="main-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-gray-900 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white tracking-tight">BMV</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">BookMyVenue</span>
          </div>

          <nav className="hidden md:flex items-center gap-7">
            <a href="#marketplace" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">Platform</a>
            <a href="#cities" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">Cities</a>
            <a href="#capabilities" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">Capabilities</a>
            <a href="#for-venues" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">For Venues</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
              data-testid="login-btn"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-[13px] font-medium bg-[#C7A14A] text-white px-4 py-2 rounded-md hover:bg-[#b5912f] transition-colors"
              data-testid="get-started-btn"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.1] tracking-tight font-sans"
              data-testid="hero-headline"
            >
              India's Venue Booking
              <br />
              Marketplace
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-500 max-w-xl leading-relaxed">
              Search, compare and book verified venues with real-time availability and transparent pricing.
            </p>
          </div>

          {/* SEARCH MODULE */}
          <form
            onSubmit={handleSearch}
            className="mt-10 border border-gray-300 rounded-lg bg-white"
            data-testid="search-bar"
          >
            <div className="grid grid-cols-2 sm:grid-cols-5">
              <div className="relative border-r border-b sm:border-b-0 border-gray-200 p-0">
                <label className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-gray-400 font-medium">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pt-6 pb-2.5 px-3 text-sm bg-transparent focus:outline-none appearance-none cursor-pointer"
                  data-testid="search-city"
                >
                  <option value="">Select city</option>
                  {CITIES_SELECT.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="relative border-b sm:border-b-0 sm:border-r border-gray-200 p-0">
                <label className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-gray-400 font-medium">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full pt-6 pb-2.5 px-3 text-sm bg-transparent focus:outline-none appearance-none cursor-pointer"
                  data-testid="search-event-type"
                >
                  <option value="">Select type</option>
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="relative border-r border-b sm:border-b-0 border-gray-200 p-0">
                <label className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-gray-400 font-medium">Guests</label>
                <input
                  type="text"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="Count"
                  className="w-full pt-6 pb-2.5 px-3 text-sm bg-transparent placeholder:text-gray-300 focus:outline-none"
                  data-testid="search-guests"
                />
              </div>

              <div className="relative border-b sm:border-b-0 sm:border-r border-gray-200 p-0">
                <label className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-gray-400 font-medium">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pt-6 pb-2.5 px-3 text-sm bg-transparent focus:outline-none text-gray-900"
                  data-testid="search-date"
                />
              </div>

              <button
                type="submit"
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium py-3 sm:py-0 sm:rounded-r-lg hover:bg-gray-800 transition-colors"
                data-testid="search-submit-btn"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </form>

          {/* DATA STRIP */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-gray-400" data-testid="data-strip">
            <span><strong className="text-gray-600 font-semibold">3,000+</strong> Verified Venues</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span><strong className="text-gray-600 font-semibold">12,000+</strong> Events Completed</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span><strong className="text-gray-600 font-semibold">10+</strong> Cities</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-gray-600 font-semibold">128</strong> Live Updates Today
            </span>
          </div>
        </div>
      </section>

      {/* LIVE MARKETPLACE ACTIVITY */}
      <section id="marketplace" className="py-16 sm:py-20 border-t border-gray-100" data-testid="live-marketplace">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 mb-8">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans">Live Marketplace Activity</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LIVE_ACTIVITY.map((item, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 flex items-start gap-3"
                data-testid="live-activity-card"
              >
                <div className="mt-0.5 h-8 w-8 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-[13px] text-gray-600 leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BROWSE BY CITY */}
      <section id="cities" className="py-16 sm:py-20 border-t border-gray-100 bg-gray-50/50" data-testid="browse-by-city">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans">Browse by City</h2>
            <button
              onClick={() => navigate('/venues')}
              className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 group"
              data-testid="view-all-cities-btn"
            >
              All cities
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CITY_GRID.map((c) => (
              <button
                key={c.name}
                onClick={() => navigate(`/venues?city=${c.name}`)}
                className="text-left border border-gray-200 bg-white rounded-lg px-4 py-3.5 hover:border-gray-300 hover:shadow-sm transition-all group"
                data-testid={`city-card-${c.name.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{c.name}</div>
                <div className="text-[13px] text-gray-400 mt-0.5">{c.venues} venues</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM CAPABILITIES */}
      <section id="capabilities" className="py-16 sm:py-20 border-t border-gray-100" data-testid="platform-capabilities">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 font-sans">Platform Capabilities</h2>
          <p className="text-sm text-gray-400 mb-10 max-w-lg">
            Core infrastructure powering venue discovery, comparison, and booking at scale.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
                data-testid="capability-card"
              >
                <div className="h-9 w-9 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                  <cap.icon className="h-4 w-4 text-gray-500" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 font-sans">{cap.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR BOTH SIDES */}
      <section id="for-venues" className="py-16 sm:py-20 border-t border-gray-100 bg-gray-50/50" data-testid="two-sided-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-10 font-sans">Built for Both Sides</h2>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* For Customers */}
            <div className="border border-gray-200 bg-white rounded-lg p-6 sm:p-8" data-testid="for-customers-card">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-4">For Customers</div>
              <ul className="space-y-3 mb-8">
                {[
                  'Structured search across 3,000+ venues',
                  'Transparent pricing with no hidden charges',
                  'Instant availability checks',
                  'Secure end-to-end booking'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/venues')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#C7A14A] text-white text-sm font-medium hover:bg-[#b5912f] transition-colors"
                data-testid="start-searching-btn"
              >
                Start Searching
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* For Venue Partners */}
            <div className="border border-gray-200 bg-white rounded-lg p-6 sm:p-8" data-testid="for-venues-card">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-4">For Venue Partners</div>
              <ul className="space-y-3 mb-8">
                {[
                  'List your venue to a growing marketplace',
                  'Manage availability through a live dashboard',
                  'Receive verified, qualified booking leads',
                  'Access performance insights and analytics'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                data-testid="list-venue-btn"
              >
                List Your Venue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* EXPANDING ACROSS INDIA */}
      <section className="py-16 sm:py-20 border-t border-gray-100" data-testid="expansion-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Globe className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 font-sans">Expanding Across India</h2>
              <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                Now active in major metro and tier-2 cities. Rapidly growing venue inventory and partner network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-12 bg-white" data-testid="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-md bg-gray-900 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">BMV</span>
                </div>
                <span className="text-sm font-semibold">BookMyVenue</span>
              </div>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                India's venue booking marketplace.
              </p>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">Platform</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Browse Venues', href: '/venues' },
                  { label: 'Cities', href: '#cities' },
                  { label: 'For Venues', href: '#for-venues' }
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">Company</h4>
              <ul className="space-y-2">
                {['Contact', 'Support', 'Privacy', 'Terms'].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">Top Cities</h4>
              <ul className="space-y-2">
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Jaipur'].map((c) => (
                  <li key={c}>
                    <a href={`/venues?city=${c}`} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">{c}</a>
                  </li>
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
