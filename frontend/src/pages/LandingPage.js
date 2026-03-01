import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  Users,
  MapPin,
  Calendar,
  Building2,
  Heart,
  CheckCircle,
  Radio,
  Layers,
  Shield,
  Workflow,
  ArrowUpRight,
  Activity,
  BarChart2,
  Clock
} from 'lucide-react';

// ============== CONSTANTS ==============

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
];

const EVENT_TYPES = [
  'Wedding', 'Corporate', 'Birthday', 'Conference', 'Engagement', 'Party'
];

const CITY_GRID = [
  { name: 'Delhi NCR', venues: 520, active: true },
  { name: 'Mumbai', venues: 420, active: true },
  { name: 'Bengaluru', venues: 380, active: true },
  { name: 'Hyderabad', venues: 245, active: true },
  { name: 'Pune', venues: 185, active: true },
  { name: 'Jaipur', venues: 165, active: true },
  { name: 'Chennai', venues: 142, active: true },
  { name: 'Kolkata', venues: 128, active: true },
  { name: 'Chandigarh', venues: 95, active: true },
  { name: 'Goa', venues: 88, active: true },
  { name: 'Udaipur', venues: 72, active: true },
  { name: 'Ahmedabad', venues: 68, active: true },
];

const PLATFORM_FEATURES = [
  {
    icon: Radio,
    title: 'Real-Time Availability',
    description: 'Live calendar sync. Instant slot confirmation. No double-bookings.'
  },
  {
    icon: Layers,
    title: 'Side-by-Side Comparison',
    description: 'Structured sheets for pricing, amenities, and policies.'
  },
  {
    icon: Shield,
    title: 'Verified Venue Data',
    description: 'Multi-point verification. Accurate listings. No hidden costs.'
  },
  {
    icon: Workflow,
    title: 'Dedicated RM Workflow',
    description: 'Assigned managers. Structured follow-ups. Full coordination.'
  }
];

// ============== COMPONENT ==============

export default function LandingPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  const [date, setDate] = useState('');
  
  // Live metrics
  const [metrics, setMetrics] = useState({
    venues: 3024,
    updates: 128,
    comparisons: 47,
    booked: 8
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        venues: prev.venues,
        updates: prev.updates + Math.floor(Math.random() * 3),
        comparisons: Math.max(20, prev.comparisons + Math.floor(Math.random() * 5) - 2),
        booked: prev.booked + (Math.random() > 0.85 ? 1 : 0)
      }));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (eventType) params.set('event_type', eventType);
    if (guests) params.set('guests', guests);
    if (date) params.set('date', date);
    navigate(`/venues?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      
      {/* ============== HEADER ============== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">BMV</span>
              </div>
              <span className="font-semibold text-sm">BookMyVenue</span>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
              <a href="#platform" className="hover:text-gray-900">Platform</a>
              <a href="#cities" className="hover:text-gray-900">Cities</a>
              <a href="#venues" className="hover:text-gray-900">For Venues</a>
            </nav>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="px-4 py-2 text-sm font-medium bg-[#C7A14A] text-white rounded hover:bg-[#B8923E] transition-colors"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="py-16 md:py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
              India's Smart Venue Booking Platform
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Compare venues, check real availability, make faster decisions.
            </p>
          </div>

          {/* Search Module */}
          <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="border-2 border-gray-900 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-5">
                  {/* Location */}
                  <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                      Location
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-sm text-gray-900 bg-transparent focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Select city</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Event Type */}
                  <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full text-sm text-gray-900 bg-transparent focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Select type</option>
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Guests */}
                  <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                      Guests
                    </label>
                    <input
                      type="text"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      placeholder="Count"
                      className="w-full text-sm text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {/* Date */}
                  <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* Search */}
                  <div className="col-span-2 md:col-span-1 p-4 bg-gray-900 flex items-end">
                    <button
                      type="submit"
                      className="w-full h-full min-h-[40px] flex items-center justify-center gap-2 text-white font-medium text-sm"
                    >
                      <Search className="h-4 w-4" />
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ============== LIVE PLATFORM SNAPSHOT ============== */}
      <section className="py-8 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="uppercase tracking-wider text-xs font-medium">Live Platform Snapshot</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{metrics.venues.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Verified Venues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{metrics.updates}</div>
                <div className="text-xs text-gray-500 mt-1">Availability Updates Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{metrics.comparisons}</div>
                <div className="text-xs text-gray-500 mt-1">Active Comparisons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{metrics.booked}</div>
                <div className="text-xs text-gray-500 mt-1">Venues Booked Today</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== EXPLORE BY CITY ============== */}
      <section id="cities" className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
              Explore By City
            </h2>
            <p className="text-sm text-gray-500">
              Browse verified venues across India
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CITY_GRID.map((city) => (
              <button
                key={city.name}
                onClick={() => navigate(`/venues?city=${city.name}`)}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{city.name}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-gray-500">{city.venues} venues</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PLATFORM ADVANTAGE ============== */}
      <section id="platform" className="py-16 md:py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
              Platform Advantage
            </h2>
            <p className="text-sm text-gray-500">
              Infrastructure built for scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORM_FEATURES.map((feature, i) => (
              <div 
                key={i}
                className="p-5 bg-white border border-gray-200 rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-gray-700" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CATEGORY CARDS ============== */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weddings */}
            <button
              onClick={() => navigate('/venues?category=wedding')}
              className="p-6 text-left border border-gray-200 rounded-lg hover:border-gray-400 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Heart className="h-5 w-5 text-gray-700" />
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">500+ venues</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Wedding Venues</h3>
              <p className="text-sm text-gray-500 mb-4">Premium venues for weddings and related functions.</p>
              <div className="flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
                Browse <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            {/* Corporate */}
            <button
              onClick={() => navigate('/venues?category=corporate')}
              className="p-6 text-left border border-gray-200 rounded-lg hover:border-gray-400 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Building2 className="h-5 w-5 text-gray-700" />
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">300+ venues</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Corporate & Events</h3>
              <p className="text-sm text-gray-500 mb-4">Conference halls, offsites, and celebration spaces.</p>
              <div className="flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
                Browse <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ============== FOR VENUES ============== */}
      <section id="venues" className="py-16 md:py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">For Venues & Event Managers</div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Join The Platform
            </h2>
            <p className="text-gray-400 mb-8">
              Access qualified event leads across India. Zero listing fees. Streamlined workflow.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate('/list-venue')}
                className="px-6 py-3 rounded bg-[#C7A14A] text-gray-900 font-medium text-sm hover:bg-[#D4B65A] transition-colors flex items-center justify-center gap-2"
              >
                List Your Venue
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="px-6 py-3 rounded border border-gray-700 text-gray-300 font-medium text-sm hover:border-gray-500 hover:text-white transition-all"
              >
                Contact Sales
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#C7A14A]" />
                <span>Zero listing fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#C7A14A]" />
                <span>Qualified leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#C7A14A]" />
                <span>Dashboard access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="py-10 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">BMV</span>
                </div>
                <span className="font-semibold text-sm text-gray-900">BookMyVenue</span>
              </div>
              <p className="text-xs text-gray-500">
                India's venue booking infrastructure.
              </p>
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Platform</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Browse Venues</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">How it Works</a></li>
              </ul>
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Company</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-600 hover:text-gray-900">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Contact</a></li>
              </ul>
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Privacy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} BookMyVenue Technologies Pvt. Ltd.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
