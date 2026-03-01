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
  Layers,
  Globe,
  Server,
  Database,
  Workflow,
  UserCheck,
  ArrowUpRight,
  Radio
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

const CITY_NETWORK = [
  { name: 'Delhi NCR', venues: 420, status: 'live' },
  { name: 'Mumbai', venues: 380, status: 'live' },
  { name: 'Bengaluru', venues: 290, status: 'live' },
  { name: 'Hyderabad', venues: 185, status: 'live' },
  { name: 'Jaipur', venues: 145, status: 'live' },
  { name: 'Pune', venues: 120, status: 'live' },
  { name: 'Chennai', venues: 95, status: 'live' },
  { name: 'Chandigarh', venues: 68, status: 'live' },
  { name: 'Goa', venues: 52, status: 'live' },
  { name: 'Udaipur', venues: 48, status: 'live' },
  { name: 'Kolkata', venues: 42, status: 'expanding' },
  { name: 'Ahmedabad', venues: 35, status: 'expanding' },
];

const PLATFORM_ENGINE = [
  {
    icon: Radio,
    title: 'Real-Time Availability System',
    description: 'Live calendar sync across all venues. Instant slot confirmation. Zero double-bookings.'
  },
  {
    icon: Layers,
    title: 'Side-by-Side Comparison Engine',
    description: 'Structured data sheets for pricing, amenities, and policies. Decision-ready format.'
  },
  {
    icon: Shield,
    title: 'Verified Venue Framework',
    description: 'Multi-point verification. Accurate listings. Transparent pricing standards.'
  },
  {
    icon: Workflow,
    title: 'Dedicated RM Workflow',
    description: 'Assigned relationship managers. Structured follow-ups. End-to-end coordination.'
  }
];

const CONFIDENCE_STRIP = [
  { icon: Lock, label: 'Secure Payments', sublabel: 'Escrow protected' },
  { icon: FileText, label: 'Verified Contracts', sublabel: 'Legal templates' },
  { icon: CheckCircle2, label: 'Transparent Pricing', sublabel: 'No hidden costs' },
  { icon: Headphones, label: 'Dedicated RM', sublabel: 'Expert support' }
];

const STATS = [
  { value: '12,000+', label: 'Events Processed', sublabel: 'Since platform launch' },
  { value: '500+', label: 'Verified Venues', sublabel: 'Active on platform' },
  { value: '15', label: 'Cities', sublabel: 'Nationwide coverage' },
  { value: '98%', label: 'Fulfillment Rate', sublabel: 'Booking success' }
];

// ============== COMPONENT ==============

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Weddings');
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  
  // Live platform metrics (simulated)
  const [platformMetrics, setPlatformMetrics] = useState({
    searchesLast10Min: 124,
    venuesBookedToday: 8,
    clientsComparing: 3
  });

  // Simulate live metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPlatformMetrics(prev => ({
        searchesLast10Min: prev.searchesLast10Min + Math.floor(Math.random() * 5),
        venuesBookedToday: prev.venuesBookedToday + (Math.random() > 0.8 ? 1 : 0),
        clientsComparing: Math.max(1, prev.clientsComparing + Math.floor(Math.random() * 3) - 1)
      }));
    }, 12000);
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
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#C7A14A]">
                <span className="text-xs font-bold text-[#0A0E17]">BMV</span>
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">BookMyVenue</div>
                <div className="text-[9px] text-white/40 uppercase tracking-widest">Platform</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#platform" className="text-white/50 hover:text-white transition-colors">Platform</a>
              <a href="#network" className="text-white/50 hover:text-white transition-colors">Network</a>
              <a href="#venues" className="text-white/50 hover:text-white transition-colors">For Venues</a>
            </nav>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="hidden sm:block px-3 py-1.5 text-sm text-white/50 hover:text-white transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="px-4 py-2 text-sm font-medium bg-[#C7A14A] text-[#0A0E17] rounded hover:bg-[#D4B65A] transition-colors"
              >
                Contact
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/50 uppercase tracking-widest mb-6">
              <Globe className="h-3 w-3 text-[#C7A14A]" />
              Live in 15 cities
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
              India's Venue Booking Infrastructure
            </h1>
            
            <p className="text-base text-white/40 max-w-lg mx-auto">
              Scalable platform for venue discovery, comparison, and booking. Built for scale.
            </p>
          </div>

          {/* Search Module */}
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex p-1 rounded bg-[#0D1219] border border-white/[0.08]">
                {EVENT_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setEventType('');
                    }}
                    className={`px-5 py-2 text-sm font-medium rounded transition-all ${
                      activeTab === tab
                        ? 'bg-[#C7A14A] text-[#0A0E17]'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Card */}
            <div className="bg-[#0D1219] border border-white/[0.08] rounded-lg overflow-hidden">
              <form onSubmit={handleSearch}>
                <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                  <div className="p-4">
                    <label className="block text-[9px] text-white/40 uppercase tracking-widest mb-2 font-medium">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-transparent text-sm text-white focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0D1219]">Select</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c} className="bg-[#0D1219]">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4">
                    <label className="block text-[9px] text-white/40 uppercase tracking-widest mb-2 font-medium">Event Type</label>
                    <div className="relative">
                      <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-transparent text-sm text-white focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0D1219]">Select</option>
                        {EVENT_TYPES[activeTab]?.map((type) => (
                          <option key={type} value={type} className="bg-[#0D1219]">{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4">
                    <label className="block text-[9px] text-white/40 uppercase tracking-widest mb-2 font-medium">Guests</label>
                    <div className="relative">
                      <Users className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                      <input
                        type="text"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        placeholder="Count"
                        className="w-full pl-6 pr-2 py-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 flex items-end">
                    <button
                      type="submit"
                      className="w-full h-9 flex items-center justify-center gap-2 rounded bg-[#C7A14A] text-[#0A0E17] font-medium text-sm hover:bg-[#D4B65A] transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      Search
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Secondary Link */}
            <div className="mt-3 text-center">
              <button
                onClick={() => navigate('/contact')}
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Enterprise inquiry? <span className="text-[#C7A14A]">Contact team</span>
              </button>
            </div>
          </div>

          {/* Confidence Strip */}
          <div className="max-w-4xl mx-auto mt-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CONFIDENCE_STRIP.map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-3 rounded bg-white/[0.02] border border-white/[0.04]"
                >
                  <item.icon className="h-4 w-4 text-[#C7A14A]" />
                  <div>
                    <div className="text-xs font-medium">{item.label}</div>
                    <div className="text-[9px] text-white/30">{item.sublabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== LIVE PLATFORM ACTIVITY ============== */}
      <section className="py-12 border-y border-white/[0.04] bg-[#080B11]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Platform Activity</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">{platformMetrics.searchesLast10Min}</div>
                <div className="text-[10px] text-white/40 mt-1">searches in last 10 min</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">{platformMetrics.venuesBookedToday}</div>
                <div className="text-[10px] text-white/40 mt-1">venues booked today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">{platformMetrics.clientsComparing}</div>
                <div className="text-[10px] text-white/40 mt-1">clients comparing now</div>
              </div>
            </div>

            <div className="hidden md:block w-24" />
          </div>
        </div>
      </section>

      {/* ============== CITY NETWORK ============== */}
      <section id="network" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="mb-12">
            <div className="text-[9px] text-[#C7A14A] uppercase tracking-widest mb-3 font-semibold">Network</div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-2">
              Expanding Across India
            </h2>
            <p className="text-sm text-white/40">
              Growing network of verified venues nationwide.
            </p>
          </div>

          {/* City Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CITY_NETWORK.map((city, i) => (
              <div 
                key={i}
                className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-white/[0.1] ${
                  city.status === 'live' 
                    ? 'bg-white/[0.02] border-white/[0.06]' 
                    : 'bg-white/[0.01] border-white/[0.04]'
                }`}
                onClick={() => navigate(`/venues?city=${city.name}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{city.name}</span>
                  {city.status === 'live' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  ) : (
                    <span className="text-[8px] text-white/30 uppercase">Soon</span>
                  )}
                </div>
                <div className="text-[10px] text-white/40">{city.venues} venues</div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-8 text-center">
            <span className="text-xs text-white/30">
              Total: <span className="text-white/50 font-medium">1,880+ venues</span> across <span className="text-white/50 font-medium">15 cities</span>
            </span>
          </div>
        </div>
      </section>

      {/* ============== THE BOOKMYVENUE ENGINE ============== */}
      <section id="platform" className="py-20 bg-[#080B11] border-y border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="mb-12">
            <div className="text-[9px] text-[#C7A14A] uppercase tracking-widest mb-3 font-semibold">Infrastructure</div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-2">
              Powered By Smart Infrastructure
            </h2>
            <p className="text-sm text-white/40 max-w-lg">
              Purpose-built systems for venue discovery, comparison, and booking at scale.
            </p>
          </div>

          {/* Engine Features */}
          <div className="grid md:grid-cols-2 gap-4">
            {PLATFORM_ENGINE.map((item, i) => (
              <div 
                key={i}
                className="flex gap-4 p-5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-[#C7A14A]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CATEGORY SPLIT ============== */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weddings */}
            <div 
              onClick={() => navigate('/venues?category=wedding')}
              className="group p-6 rounded-lg bg-[#0D1219] border border-white/[0.06] hover:border-white/[0.1] cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Heart className="h-4 w-4 text-[#C7A14A]" />
              </div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1 font-medium">500+ venues</div>
              <h3 className="text-lg font-semibold mb-2">Wedding Venues</h3>
              <p className="text-xs text-white/40 mb-4">Premium venues for weddings and related functions.</p>
              <div className="flex items-center gap-1 text-[#C7A14A] text-sm font-medium group-hover:gap-2 transition-all">
                Browse <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Corporate */}
            <div 
              onClick={() => navigate('/venues?category=corporate')}
              className="group p-6 rounded-lg bg-[#0D1219] border border-white/[0.06] hover:border-white/[0.1] cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Building2 className="h-4 w-4 text-[#C7A14A]" />
              </div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1 font-medium">300+ venues</div>
              <h3 className="text-lg font-semibold mb-2">Corporate & Events</h3>
              <p className="text-xs text-white/40 mb-4">Conference halls, offsites, and celebration spaces.</p>
              <div className="flex items-center gap-1 text-[#C7A14A] text-sm font-medium group-hover:gap-2 transition-all">
                Browse <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== PLATFORM METRICS ============== */}
      <section className="py-20 bg-[#080B11] border-y border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <div key={i} className="p-5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                <div className="text-2xl md:text-3xl font-semibold text-[#C7A14A] mb-1">{stat.value}</div>
                <div className="text-xs font-medium mb-0.5">{stat.label}</div>
                <div className="text-[9px] text-white/30">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FOR VENUES ============== */}
      <section id="venues" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-[9px] text-[#C7A14A] uppercase tracking-widest mb-3 font-semibold">For Venues</div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">
              Join The Platform
            </h2>
            <p className="text-sm text-white/40 mb-8">
              Access qualified event leads across India. Streamlined booking workflow. Zero listing fees.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate('/list-venue')}
                className="px-6 py-3 rounded bg-[#C7A14A] text-[#0A0E17] font-medium text-sm hover:bg-[#D4B65A] transition-colors flex items-center justify-center gap-2"
              >
                List Your Venue
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="px-6 py-3 rounded border border-white/[0.1] text-white/70 font-medium text-sm hover:border-white/[0.2] hover:text-white transition-all"
              >
                Contact Sales
              </button>
            </div>

            {/* Trust points */}
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-[10px] text-white/40">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#C7A14A]" />
                <span>Zero listing fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#C7A14A]" />
                <span>Qualified leads only</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#C7A14A]" />
                <span>Dashboard access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="py-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-[#C7A14A]">
                  <span className="text-[10px] font-bold text-[#0A0E17]">BMV</span>
                </div>
                <div className="text-sm font-semibold">BookMyVenue</div>
              </div>
              <p className="text-[10px] text-white/30 max-w-xs">
                India's venue booking infrastructure. Built for scale.
              </p>
            </div>

            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest mb-3 font-medium">Platform</div>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">Browse Venues</a></li>
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">How it Works</a></li>
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest mb-3 font-medium">Company</div>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">About</a></li>
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">Careers</a></li>
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest mb-3 font-medium">Legal</div>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-white/40 hover:text-white/70 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[9px] text-white/30">
              © {new Date().getFullYear()} BookMyVenue Technologies Pvt. Ltd.
            </p>
            <p className="text-[9px] text-white/30">
              Building India's venue infrastructure
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
