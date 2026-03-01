import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Users,
  MapPin,
  Calendar,
  Building2,
  Heart,
  TrendingUp,
  Clock,
  Shield,
  BarChart3,
  FileCheck,
  Eye,
  Zap,
  ChevronRight,
  Activity,
  Lock,
  FileText,
  Headphones,
  Layers
} from 'lucide-react';

// ============== CONSTANTS ==============

const EVENT_TABS = ['Weddings', 'Corporate', 'Celebrations'];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
];

const EVENT_TYPES = {
  Weddings: ['Wedding Reception', 'Engagement', 'Mehendi / Sangeet', 'Destination Wedding'],
  Corporate: ['Conference', 'Product Launch', 'Team Offsite', 'Annual Meet'],
  Celebrations: ['Birthday Party', 'Anniversary', 'Cocktail Party', 'Private Dinner']
};

const PLATFORM_FEATURES = [
  {
    icon: Eye,
    title: 'Real-Time Availability',
    description: 'See live calendar slots. No back-and-forth calls. Instant date confirmation.',
    stat: '24/7 sync'
  },
  {
    icon: BarChart3,
    title: 'Side-by-Side Comparison',
    description: 'Compare pricing, amenities, and availability across venues in structured sheets.',
    stat: '5 venues/sheet'
  },
  {
    icon: FileCheck,
    title: 'Verified Venue Data',
    description: 'Every listing verified. Accurate pricing. No hidden costs. Transparent policies.',
    stat: '100% verified'
  }
];

const LIVE_ACTIVITY = {
  recentBookings: [
    { venue: 'The Grand Imperial', city: 'Delhi', time: '12 min ago', type: 'Wedding' },
    { venue: 'Sapphire Convention', city: 'Noida', time: '28 min ago', type: 'Corporate' },
    { venue: 'Royal Gardens', city: 'Gurgaon', time: '1 hr ago', type: 'Wedding' },
  ],
  trendingCities: [
    { name: 'Delhi NCR', searches: '2.4K', trend: '+18%' },
    { name: 'Mumbai', searches: '1.8K', trend: '+12%' },
    { name: 'Bangalore', searches: '1.2K', trend: '+24%' },
    { name: 'Jaipur', searches: '890', trend: '+31%' },
  ],
  popularThisWeek: [
    { name: 'Farmhouse Venues', count: 342 },
    { name: 'Banquet Halls', count: 298 },
    { name: 'Hotel Venues', count: 256 },
    { name: 'Rooftop Spaces', count: 187 },
  ]
};

const STATS = [
  { value: '12,000+', label: 'Events Hosted', sublabel: 'Since 2020' },
  { value: '500+', label: 'Verified Venues', sublabel: 'Across 15 cities' },
  { value: '4.8', label: 'Platform Rating', sublabel: 'Google Reviews' },
  { value: '98%', label: 'Satisfaction Rate', sublabel: 'Post-event surveys' }
];

const CONFIDENCE_STRIP = [
  { icon: Lock, label: 'Secure Payments', sublabel: 'Escrow protected' },
  { icon: FileText, label: 'Verified Contracts', sublabel: 'Legal templates' },
  { icon: CheckCircle2, label: 'Transparent Pricing', sublabel: 'No hidden costs' },
  { icon: Headphones, label: 'Dedicated RM', sublabel: 'Expert support' }
];

// ============== COMPONENT ==============

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Weddings');
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  const [currentActivity, setCurrentActivity] = useState(0);
  
  // Live marketplace signals (simulated)
  const [liveSignals, setLiveSignals] = useState({
    venuesAvailable: 42,
    recentBookings: 12,
    usersComparing: 3
  });

  // Rotate live activity
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivity((prev) => (prev + 1) % LIVE_ACTIVITY.recentBookings.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Simulate live signal updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSignals(prev => ({
        venuesAvailable: prev.venuesAvailable + Math.floor(Math.random() * 3) - 1,
        recentBookings: prev.recentBookings + (Math.random() > 0.7 ? 1 : 0),
        usersComparing: Math.max(1, prev.usersComparing + Math.floor(Math.random() * 3) - 1)
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (eventType) params.set('event_type', eventType);
    if (guests) params.set('guests', guests);
    navigate(`/venues?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      
      {/* ============== NAVIGATION ============== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0E17]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C7A14A]">
                <span className="text-sm font-bold text-[#0A0E17]">BMV</span>
              </div>
              <div>
                <div className="text-base font-semibold tracking-tight">BookMyVenue</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">Platform</div>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#features" className="text-white/60 hover:text-white transition-colors">Platform</a>
              <a href="#venues" className="text-white/60 hover:text-white transition-colors">Browse Venues</a>
              <a href="#trust" className="text-white/60 hover:text-white transition-colors">Trust</a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="hidden sm:block px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="px-4 py-2.5 text-sm font-medium bg-[#C7A14A] text-[#0A0E17] rounded-lg hover:bg-[#D4B65A] transition-colors"
              >
                Talk to Expert
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="relative py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          
          {/* Live Marketplace Signals */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-10">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span><span className="text-white/70 font-medium">{liveSignals.venuesAvailable}</span> venues available in Delhi this weekend</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7A14A]" />
              <span><span className="text-white/70 font-medium">{liveSignals.recentBookings}</span> recent bookings in Mumbai</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span><span className="text-white/70 font-medium">{liveSignals.usersComparing}</span> users comparing venues right now</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-3">
              India's Smart Venue Booking Platform
            </h1>
            <p className="text-base text-white/50 max-w-xl mx-auto">
              Compare verified venues, check real availability, and make faster booking decisions.
            </p>
          </div>

          {/* Search Module - Enhanced */}
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex p-1 rounded-lg bg-[#0D1219] border border-white/[0.08]">
                {EVENT_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setEventType('');
                    }}
                    className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === tab
                        ? 'bg-[#C7A14A] text-[#0A0E17]'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Card - Stronger Structure */}
            <div className="bg-[#0D1219] border-2 border-white/[0.08] rounded-xl overflow-hidden">
              <form onSubmit={handleSearch}>
                <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                  {/* City */}
                  <div className="p-4 md:p-5">
                    <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-semibold">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-transparent text-sm text-white focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0D1219]">Select city</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c} className="bg-[#0D1219]">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Event Type */}
                  <div className="p-4 md:p-5">
                    <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-semibold">
                      Event Type
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-transparent text-sm text-white focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0D1219]">Select type</option>
                        {EVENT_TYPES[activeTab]?.map((type) => (
                          <option key={type} value={type} className="bg-[#0D1219]">{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Guest Count */}
                  <div className="p-4 md:p-5">
                    <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-semibold">
                      Guest Count
                    </label>
                    <div className="relative">
                      <Users className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <input
                        type="text"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        placeholder="e.g., 200"
                        className="w-full pl-6 pr-2 py-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="p-4 md:p-5 flex items-end">
                    <button
                      type="submit"
                      className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-[#C7A14A] text-[#0A0E17] font-semibold text-sm hover:bg-[#D4B65A] transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      Explore Venues
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Secondary CTA */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Need guidance? <span className="text-[#C7A14A]">Talk to an Expert</span>
              </button>
            </div>
          </div>

          {/* Comparison Sheet Feature Preview */}
          <div className="max-w-3xl mx-auto mt-10">
            <div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              {/* Mini Preview Card */}
              <div className="flex-shrink-0 w-48 h-32 rounded-lg bg-[#0D1219] border border-white/[0.08] p-3 relative overflow-hidden">
                <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Comparison Sheet</div>
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    <div className="w-12 h-6 rounded bg-white/[0.04]" />
                    <div className="w-12 h-6 rounded bg-white/[0.04]" />
                    <div className="w-12 h-6 rounded bg-white/[0.04]" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-12 h-3 rounded bg-white/[0.02]" />
                    <div className="w-12 h-3 rounded bg-white/[0.02]" />
                    <div className="w-12 h-3 rounded bg-white/[0.02]" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-12 h-3 rounded bg-white/[0.02]" />
                    <div className="w-12 h-3 rounded bg-white/[0.02]" />
                    <div className="w-12 h-3 rounded bg-white/[0.02]" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2">
                  <Layers className="h-4 w-4 text-[#C7A14A]/40" />
                </div>
              </div>
              
              {/* Text */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-[#C7A14A]" />
                  <span className="text-xs text-[#C7A14A] uppercase tracking-wider font-medium">Smart Feature</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">Compare Multiple Venues In One Smart Sheet</h3>
                <p className="text-sm text-white/50">
                  Side-by-side pricing, availability, amenities, and policies. Make faster decisions with structured data.
                </p>
              </div>
              
              {/* CTA */}
              <div className="flex-shrink-0">
                <button 
                  onClick={() => navigate('/venues')}
                  className="px-4 py-2.5 text-sm font-medium border border-white/[0.1] rounded-lg text-white/70 hover:text-white hover:border-white/20 transition-all"
                >
                  Try It Free
                </button>
              </div>
            </div>
          </div>

          {/* Commercial Confidence Strip */}
          <div className="max-w-4xl mx-auto mt-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CONFIDENCE_STRIP.map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-lg bg-[#0D1219] border border-white/[0.06]"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-[#C7A14A]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[10px] text-white/40">{item.sublabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== PLATFORM ADVANTAGE ============== */}
      <section id="features" className="py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="mb-16">
            <div className="text-[10px] text-[#C7A14A] uppercase tracking-widest mb-3 font-semibold">Platform</div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">
              Why BookMyVenue Is Different
            </h2>
            <p className="text-white/50 text-sm max-w-lg">
              Built for scale. Designed for decisions. Not another listing directory.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {PLATFORM_FEATURES.map((feature, i) => (
              <div 
                key={i}
                className="group p-6 rounded-xl bg-[#0D1219] border border-white/[0.06] hover:border-white/[0.1] transition-all"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-[#C7A14A]" />
                  </div>
                  <div className="px-2 py-1 rounded bg-white/[0.03] text-[9px] text-white/40 uppercase tracking-wider font-medium">
                    {feature.stat}
                  </div>
                </div>
                
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== LIVE MARKETPLACE ACTIVITY ============== */}
      <section className="py-20 bg-[#080B11] border-y border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="text-[10px] text-[#C7A14A] uppercase tracking-widest mb-3 font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Platform Activity
              </div>
              <h2 className="text-xl md:text-2xl font-semibold">
                What's Happening Now
              </h2>
            </div>
            <a 
              href="/venues" 
              className="hidden md:flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Activity Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Recent Bookings */}
            <div className="p-5 rounded-xl bg-[#0D1219] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider mb-4 font-medium">
                <Clock className="h-3 w-3" />
                Recent Bookings
              </div>
              <div className="space-y-2">
                {LIVE_ACTIVITY.recentBookings.map((booking, i) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg transition-all ${
                      i === currentActivity 
                        ? 'bg-[#C7A14A]/5 border border-[#C7A14A]/10' 
                        : 'bg-white/[0.01] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{booking.venue}</div>
                        <div className="text-[11px] text-white/40 mt-0.5">{booking.city} • {booking.type}</div>
                      </div>
                      <div className="text-[10px] text-white/30">{booking.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Cities */}
            <div className="p-5 rounded-xl bg-[#0D1219] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider mb-4 font-medium">
                <TrendingUp className="h-3 w-3" />
                Trending Cities
              </div>
              <div className="space-y-2">
                {LIVE_ACTIVITY.trendingCities.map((city, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-white/[0.03] flex items-center justify-center text-[10px] text-white/40 font-medium">
                        {i + 1}
                      </div>
                      <div className="text-sm">{city.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-white/40">{city.searches}</div>
                      <div className="text-[11px] text-green-400 font-medium">{city.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular This Week */}
            <div className="p-5 rounded-xl bg-[#0D1219] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider mb-4 font-medium">
                <Activity className="h-3 w-3" />
                Popular This Week
              </div>
              <div className="space-y-2">
                {LIVE_ACTIVITY.popularThisWeek.map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01]"
                  >
                    <div className="text-sm">{item.name}</div>
                    <div className="text-[11px] text-white/40">{item.count} searches</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== CATEGORY SPLIT ============== */}
      <section id="venues" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weddings */}
            <div 
              onClick={() => navigate('/venues?category=wedding')}
              className="group relative p-8 rounded-xl bg-[#0D1219] border border-white/[0.06] hover:border-white/[0.1] cursor-pointer transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                <Heart className="h-5 w-5 text-[#C7A14A]" />
              </div>
              
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-medium">500+ venues</div>
              <h3 className="text-xl font-semibold mb-2">Weddings</h3>
              <p className="text-sm text-white/50 mb-6 max-w-xs">
                Premium wedding venues. Verified availability. Transparent pricing. Expert support.
              </p>
              
              <div className="flex items-center gap-2 text-[#C7A14A] font-medium text-sm group-hover:gap-3 transition-all">
                Explore Wedding Venues
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Corporate */}
            <div 
              onClick={() => navigate('/venues?category=corporate')}
              className="group relative p-8 rounded-xl bg-[#0D1219] border border-white/[0.06] hover:border-white/[0.1] cursor-pointer transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                <Building2 className="h-5 w-5 text-[#C7A14A]" />
              </div>
              
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-medium">300+ venues</div>
              <h3 className="text-xl font-semibold mb-2">Corporate & Celebrations</h3>
              <p className="text-sm text-white/50 mb-6 max-w-xs">
                Conference halls. Offsite venues. Celebration spaces. Professional experience.
              </p>
              
              <div className="flex items-center gap-2 text-[#C7A14A] font-medium text-sm group-hover:gap-3 transition-all">
                Explore Corporate Venues
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== COMMERCIAL TRUST BLOCK ============== */}
      <section id="trust" className="py-20 bg-[#080B11] border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="text-[10px] text-[#C7A14A] uppercase tracking-widest mb-3 font-semibold">Platform Metrics</div>
            <h2 className="text-2xl md:text-3xl font-semibold">
              Numbers That Matter
            </h2>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <div 
                key={i}
                className="p-6 rounded-xl bg-[#0D1219] border border-white/[0.06] text-center"
              >
                <div className="text-3xl font-semibold text-[#C7A14A] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium mb-0.5">{stat.label}</div>
                <div className="text-[10px] text-white/40">{stat.sublabel}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <button
              onClick={() => navigate('/venues')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#C7A14A] text-[#0A0E17] font-semibold text-sm hover:bg-[#D4B65A] transition-colors"
            >
              Start Exploring Venues
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-xs text-white/40">
              No signup required. Free to compare.
            </p>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="py-12 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C7A14A]">
                  <span className="text-xs font-bold text-[#0A0E17]">BMV</span>
                </div>
                <div className="text-base font-semibold">BookMyVenue</div>
              </div>
              <p className="text-xs text-white/40 max-w-xs">
                India's smart venue booking platform. Compare, verify, and book with confidence.
              </p>
            </div>

            {/* Links */}
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3 font-medium">Platform</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Browse Venues</a></li>
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3 font-medium">Categories</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Wedding Venues</a></li>
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Corporate Venues</a></li>
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Party Venues</a></li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3 font-medium">Cities</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Delhi NCR</a></li>
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Mumbai</a></li>
                <li><a href="#" className="text-white/50 hover:text-white transition-colors">Bangalore</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-white/30">
              © {new Date().getFullYear()} BookMyVenue Technologies Pvt. Ltd.
            </p>
            <div className="flex items-center gap-6 text-[10px]">
              <a href="#" className="text-white/30 hover:text-white/50 transition-colors">Privacy</a>
              <a href="#" className="text-white/30 hover:text-white/50 transition-colors">Terms</a>
              <a href="#" className="text-white/30 hover:text-white/50 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
