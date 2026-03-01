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
  Sparkles,
  TrendingUp,
  Clock,
  Shield,
  BarChart3,
  FileCheck,
  Eye,
  Zap,
  ChevronRight,
  Activity
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

// ============== COMPONENT ==============

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Weddings');
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  const [currentActivity, setCurrentActivity] = useState(0);

  // Rotate live activity
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivity((prev) => (prev + 1) % LIVE_ACTIVITY.recentBookings.length);
    }, 4000);
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
      <section className="relative py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C7A14A]/10 border border-[#C7A14A]/20 text-xs text-[#C7A14A] mb-6">
              <Zap className="h-3 w-3" />
              Platform Launch: Now live in 15 cities
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4">
              India's Smart Venue
              <span className="block text-white/80">Booking Platform</span>
            </h1>
            
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Compare verified venues, check real availability, and make faster booking decisions.
            </p>
          </div>

          {/* Search Module */}
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                {EVENT_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setEventType('');
                    }}
                    className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all ${
                      activeTab === tab
                        ? 'bg-[#C7A14A] text-[#0A0E17]'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Card */}
            <div className="bg-[#0D1219] border border-white/[0.08] rounded-xl p-6">
              <form onSubmit={handleSearch}>
                <div className="grid md:grid-cols-4 gap-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2 font-medium">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#0A0E17] border border-white/[0.08] text-sm text-white focus:border-[#C7A14A]/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0D1219]">Select city</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c} className="bg-[#0D1219]">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2 font-medium">
                      Event Type
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#0A0E17] border border-white/[0.08] text-sm text-white focus:border-[#C7A14A]/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0D1219]">Select type</option>
                        {EVENT_TYPES[activeTab]?.map((type) => (
                          <option key={type} value={type} className="bg-[#0D1219]">{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Guest Count */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2 font-medium">
                      Guest Count
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <input
                        type="text"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        placeholder="e.g., 200"
                        className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#0A0E17] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:border-[#C7A14A]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      className="h-12 flex items-center justify-center gap-2 rounded-lg bg-[#C7A14A] text-[#0A0E17] font-semibold hover:bg-[#D4B65A] transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      Explore Venues
                    </button>
                  </div>
                </div>

                {/* Secondary CTA */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Need help? <span className="text-[#C7A14A]">Talk to an Expert →</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Credibility Row */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Shield, text: '3,000+ Verified Venues' },
                { icon: CheckCircle2, text: 'Transparent Pricing' },
                { icon: Activity, text: 'Live Availability' },
                { icon: Users, text: 'Dedicated RM Support' }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <item.icon className="h-4 w-4 text-[#C7A14A]" />
                  <span className="text-xs text-white/60">{item.text}</span>
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
            <div className="text-xs text-[#C7A14A] uppercase tracking-widest mb-3 font-medium">Platform</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Why BookMyVenue Is Different
            </h2>
            <p className="text-white/50 max-w-xl">
              Built for scale. Designed for decisions. Not another listing directory.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {PLATFORM_FEATURES.map((feature, i) => (
              <div 
                key={i}
                className="group p-6 rounded-xl bg-[#0D1219] border border-white/[0.06] hover:border-[#C7A14A]/20 transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-lg bg-[#C7A14A]/10 border border-[#C7A14A]/20 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-[#C7A14A]" />
                  </div>
                  <div className="px-2 py-1 rounded bg-white/[0.04] text-[10px] text-white/40 uppercase tracking-wider">
                    {feature.stat}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
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
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="text-xs text-[#C7A14A] uppercase tracking-widest mb-3 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Platform Activity
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                What's Happening Now
              </h2>
            </div>
            <a 
              href="/venues" 
              className="hidden md:flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
            >
              View all activity <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Activity Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Recent Bookings */}
            <div className="p-5 rounded-xl bg-[#0D1219] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-4">
                <Clock className="h-3 w-3" />
                Recent Bookings
              </div>
              <div className="space-y-3">
                {LIVE_ACTIVITY.recentBookings.map((booking, i) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg transition-all ${
                      i === currentActivity 
                        ? 'bg-[#C7A14A]/10 border border-[#C7A14A]/20' 
                        : 'bg-white/[0.02] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{booking.venue}</div>
                        <div className="text-xs text-white/40 mt-0.5">{booking.city} • {booking.type}</div>
                      </div>
                      <div className="text-[10px] text-white/30">{booking.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Cities */}
            <div className="p-5 rounded-xl bg-[#0D1219] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-4">
                <TrendingUp className="h-3 w-3" />
                Trending Cities
              </div>
              <div className="space-y-3">
                {LIVE_ACTIVITY.trendingCities.map((city, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-white/[0.04] flex items-center justify-center text-xs text-white/40">
                        {i + 1}
                      </div>
                      <div className="text-sm">{city.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-white/40">{city.searches}</div>
                      <div className="text-xs text-green-400">{city.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular This Week */}
            <div className="p-5 rounded-xl bg-[#0D1219] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-4">
                <Sparkles className="h-3 w-3" />
                Popular This Week
              </div>
              <div className="space-y-3">
                {LIVE_ACTIVITY.popularThisWeek.map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]"
                  >
                    <div className="text-sm">{item.name}</div>
                    <div className="text-xs text-white/40">{item.count} searches</div>
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
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weddings */}
            <div 
              onClick={() => navigate('/venues?category=wedding')}
              className="group relative p-8 rounded-xl bg-[#0D1219] border border-white/[0.06] hover:border-[#C7A14A]/20 cursor-pointer transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#C7A14A]/5 to-transparent rounded-bl-full" />
              
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-[#C7A14A]/10 border border-[#C7A14A]/20 flex items-center justify-center mb-6">
                  <Heart className="h-5 w-5 text-[#C7A14A]" />
                </div>
                
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">500+ venues</div>
                <h3 className="text-2xl font-semibold mb-3">Weddings</h3>
                <p className="text-sm text-white/50 mb-6 max-w-sm">
                  Premium wedding venues. Verified availability. Transparent pricing. Expert negotiation support.
                </p>
                
                <div className="flex items-center gap-2 text-[#C7A14A] font-medium text-sm group-hover:gap-3 transition-all">
                  Explore Wedding Venues
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Corporate */}
            <div 
              onClick={() => navigate('/venues?category=corporate')}
              className="group relative p-8 rounded-xl bg-[#0D1219] border border-white/[0.06] hover:border-[#C7A14A]/20 cursor-pointer transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#C7A14A]/5 to-transparent rounded-bl-full" />
              
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-[#C7A14A]/10 border border-[#C7A14A]/20 flex items-center justify-center mb-6">
                  <Building2 className="h-5 w-5 text-[#C7A14A]" />
                </div>
                
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">300+ venues</div>
                <h3 className="text-2xl font-semibold mb-3">Corporate & Celebrations</h3>
                <p className="text-sm text-white/50 mb-6 max-w-sm">
                  Conference halls. Offsite venues. Celebration spaces. Professional booking experience.
                </p>
                
                <div className="flex items-center gap-2 text-[#C7A14A] font-medium text-sm group-hover:gap-3 transition-all">
                  Explore Corporate Venues
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== COMMERCIAL TRUST BLOCK ============== */}
      <section id="trust" className="py-20 bg-[#080B11] border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="text-xs text-[#C7A14A] uppercase tracking-widest mb-3 font-medium">Platform Metrics</div>
            <h2 className="text-3xl md:text-4xl font-semibold">
              Numbers That Matter
            </h2>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <div 
                key={i}
                className="p-6 rounded-xl bg-[#0D1219] border border-white/[0.06] text-center"
              >
                <div className="text-3xl md:text-4xl font-semibold text-[#C7A14A] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium mb-1">{stat.label}</div>
                <div className="text-xs text-white/40">{stat.sublabel}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <button
              onClick={() => navigate('/venues')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#C7A14A] text-[#0A0E17] font-semibold hover:bg-[#D4B65A] transition-colors"
            >
              Start Exploring Venues
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-4 text-sm text-white/40">
              No signup required. Free to compare.
            </p>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="py-16 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C7A14A]">
                  <span className="text-sm font-bold text-[#0A0E17]">BMV</span>
                </div>
                <div className="text-base font-semibold">BookMyVenue</div>
              </div>
              <p className="text-sm text-white/40 max-w-xs">
                India's smart venue booking platform. Compare, verify, and book with confidence.
              </p>
            </div>

            {/* Links */}
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">Platform</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Browse Venues</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">Categories</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Wedding Venues</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Corporate Venues</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Party Venues</a></li>
              </ul>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">Cities</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Delhi NCR</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Mumbai</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors">Bangalore</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} BookMyVenue Technologies Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs">
              <a href="#" className="text-white/30 hover:text-white/60 transition-colors">Privacy</a>
              <a href="#" className="text-white/30 hover:text-white/60 transition-colors">Terms</a>
              <a href="#" className="text-white/30 hover:text-white/60 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
