import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Star, 
  ArrowRight, 
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Building2,
  Heart,
  Phone,
  MessageCircle,
  Award,
  TrendingUp,
  Zap
} from 'lucide-react';

// ============== CONSTANTS ==============

const HERO_SLIDES = [
  {
    id: 'wedding',
    label: 'Weddings',
    img: 'https://images.unsplash.com/photo-1670529776286-f426fb7ba42c?w=1920&q=80',
    tagline: 'Create memories that last forever'
  },
  {
    id: 'corporate', 
    label: 'Corporate',
    img: 'https://images.unsplash.com/photo-1768508947362-bca7a379e62a?w=1920&q=80',
    tagline: 'Impress clients & teams alike'
  },
  {
    id: 'celebration',
    label: 'Celebrations',
    img: 'https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1920&q=80',
    tagline: 'Every milestone deserves grandeur'
  },
  {
    id: 'gala',
    label: 'Galas',
    img: 'https://images.unsplash.com/photo-1768508951405-10e83c4a2872?w=1920&q=80',
    tagline: 'Sophisticated events, flawlessly executed'
  }
];

const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding / Reception' },
  { value: 'engagement', label: 'Engagement / Roka' },
  { value: 'corporate', label: 'Corporate / Conference' },
  { value: 'birthday', label: 'Birthday / Anniversary' },
  { value: 'cocktail', label: 'Cocktail / Sangeet' },
  { value: 'other', label: 'Other Events' }
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur'
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tell Us Your Event',
    description: 'Share your city, guest count, and event type. Our system instantly filters the best matches.',
    icon: MessageCircle
  },
  {
    step: '02', 
    title: 'Compare Smartly',
    description: 'View pricing, availability, amenities side-by-side. No hidden costs, no surprises.',
    icon: Zap
  },
  {
    step: '03',
    title: 'Book Confidently',
    description: 'Expert RM support guides you through. Secure payments, verified venues, peace of mind.',
    icon: CheckCircle2
  }
];

const FEATURED_VENUES = [
  {
    id: 1,
    name: 'The Grand Imperial',
    location: 'Connaught Place, Delhi',
    capacity: '100-1000',
    startingPrice: '₹5L',
    rating: 4.8,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=600&q=80',
    tag: 'Most Booked',
    type: 'wedding'
  },
  {
    id: 2,
    name: 'Royal Gardens Farmhouse',
    location: 'Sohna Road, Gurgaon',
    capacity: '200-2000',
    startingPrice: '₹3L',
    rating: 4.5,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1768851142314-c4ebf49ad45b?w=600&q=80',
    tag: 'Trending',
    type: 'wedding'
  },
  {
    id: 3,
    name: 'Sapphire Convention Centre',
    location: 'Sector 18, Noida',
    capacity: '50-500',
    startingPrice: '₹1L',
    rating: 4.2,
    reviews: 45,
    image: 'https://images.unsplash.com/photo-1768508951405-10e83c4a2872?w=600&q=80',
    tag: 'Best for Corporate',
    type: 'corporate'
  },
  {
    id: 4,
    name: 'Heritage Palace Hotel',
    location: 'Karol Bagh, Delhi',
    capacity: '50-400',
    startingPrice: '₹4L',
    rating: 4.7,
    reviews: 234,
    image: 'https://images.unsplash.com/photo-1654336037958-c698d50700b3?w=600&q=80',
    tag: 'Premium',
    type: 'wedding'
  },
  {
    id: 5,
    name: 'Sunset Terrace',
    location: 'Golf Course Road, Gurgaon',
    capacity: '30-150',
    startingPrice: '₹1.5L',
    rating: 4.6,
    reviews: 67,
    image: 'https://images.unsplash.com/photo-1768508947362-bca7a379e62a?w=600&q=80',
    tag: 'Intimate Events',
    type: 'celebration'
  }
];

const STATS = [
  { value: '12,000+', label: 'Events Hosted', icon: Award },
  { value: '500+', label: 'Verified Venues', icon: Building2 },
  { value: '4.8', label: 'Average Rating', icon: Star },
  { value: '98%', label: 'Happy Customers', icon: Heart }
];

// ============== COMPONENT ==============

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [guests, setGuests] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);

  // Auto-rotate hero slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
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

  const scrollCarousel = (direction) => {
    const newIndex = direction === 'left' 
      ? Math.max(0, carouselIndex - 1)
      : Math.min(FEATURED_VENUES.length - 3, carouselIndex + 1);
    setCarouselIndex(newIndex);
  };

  const currentSlide = HERO_SLIDES[activeSlide];

  return (
    <div className="min-h-screen bg-[#070B12] text-white overflow-x-hidden">
      
      {/* ============== NAVIGATION ============== */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#070B12]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-[#C7A14A] to-[#E8D5A3] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#0E1A2B]">
                  <span className="text-sm font-bold text-[#C7A14A]">BMV</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-semibold tracking-tight">BookMyVenue</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Premium Event Spaces</div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">How it Works</a>
              <a href="#venues" className="text-sm text-white/70 hover:text-white transition-colors">Venues</a>
              <a href="#trust" className="text-sm text-white/70 hover:text-white transition-colors">Trust</a>
              <a href="/venues" className="text-sm text-white/70 hover:text-white transition-colors">Browse All</a>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex px-4 py-2 text-sm text-white/70 hover:text-white border border-white/10 rounded-xl hover:border-white/20 transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-[#C7A14A] to-[#D4B65A] text-[#0E1A2B] rounded-xl hover:brightness-110 transition-all shadow-lg shadow-[#C7A14A]/20"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Get Expert Help</span>
                <span className="sm:hidden">Help</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============== HERO SECTION ============== */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background Slides */}
        <div className="absolute inset-0 overflow-hidden">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === activeSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div 
                className="h-full w-full bg-cover bg-center scale-105"
                style={{ backgroundImage: `url(${slide.img})` }}
              />
            </div>
          ))}
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#070B12]/60 via-[#070B12]/70 to-[#070B12]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070B12]/80 via-transparent to-[#070B12]/80" />
          {/* Animated grain texture */}
          <div className="absolute inset-0 opacity-[0.015]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'}} />
          {/* Subtle gold glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C7A14A]/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Slide Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {HERO_SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(index)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  index === activeSlide
                    ? 'bg-[#C7A14A]/20 text-[#E8D5A3] border border-[#C7A14A]/40'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {slide.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                <Sparkles className="h-4 w-4 text-[#C7A14A]" />
                <span className="text-xs text-white/70">{currentSlide.tagline}</span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-medium leading-[1.1] tracking-tight mb-6">
                <span className="block">Book The Perfect Venue.</span>
                <span className="block text-white/80">Without The Chaos.</span>
              </h1>

              {/* Subtext */}
              <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Compare verified venues for weddings, corporate events & celebrations. 
                Transparent pricing, real availability, expert support.
              </p>

              {/* Trust Line */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8">
                {[
                  { icon: ShieldCheck, text: 'Verified Venues' },
                  { icon: Star, text: 'Transparent Pricing' },
                  { icon: Users, text: 'Expert RM Support' }
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <item.icon className="h-4 w-4 text-[#C7A14A]" />
                    <span className="text-xs text-white/70">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Stats Row - Mobile Only */}
              <div className="flex justify-center gap-6 lg:hidden text-center">
                <div>
                  <div className="text-2xl font-bold text-[#C7A14A]">3,000+</div>
                  <div className="text-xs text-white/50">Verified Venues</div>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-2xl font-bold text-[#C7A14A]">12,000+</div>
                  <div className="text-xs text-white/50">Events Hosted</div>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-2xl font-bold text-[#C7A14A]">4.8</div>
                  <div className="text-xs text-white/50">Avg Rating</div>
                </div>
              </div>
            </div>

            {/* Right - Search Card */}
            <div className="lg:col-span-5">
              <div 
                className={`relative rounded-3xl border bg-[#0E1A2B]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl transition-all duration-300 ${
                  isSearchFocused 
                    ? 'border-[#C7A14A]/30 shadow-[#C7A14A]/10' 
                    : 'border-white/10'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Find Your Venue</h3>
                    <p className="text-xs text-white/50 mt-1">Search 3,000+ premium venues</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#C7A14A]/10 border border-[#C7A14A]/20">
                    <span className="text-xs text-[#C7A14A]">Live Availability</span>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">City / Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-[#C7A14A]/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0E1A2B]">Select City</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c} className="bg-[#0E1A2B]">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-[#C7A14A]/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value} className="bg-[#0E1A2B]">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Guest Count */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Guest Count</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <input
                        type="text"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="e.g., 200-500"
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-[#C7A14A]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[#C7A14A] to-[#D4B65A] text-[#0E1A2B] font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#C7A14A]/25 group"
                  >
                    <Search className="h-4 w-4" />
                    Explore Venues
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  {/* Secondary CTA */}
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/10 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <Phone className="h-4 w-4" />
                    Get Expert Assistance
                  </button>
                </form>

                {/* Trust Footer */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-center text-xs text-white/40">
                    <span className="text-[#C7A14A]">3,000+</span> Verified Venues • <span className="text-[#C7A14A]">Transparent</span> Pricing • <span className="text-[#C7A14A]">Expert</span> RM Support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how-it-works" className="relative py-24 sm:py-32 bg-[#070B12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7A14A]/10 border border-[#C7A14A]/20 mb-6">
              <Zap className="h-4 w-4 text-[#C7A14A]" />
              <span className="text-xs text-[#C7A14A] uppercase tracking-wider">Simple Process</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium mb-4">
              How It Works
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              From search to booking in three simple steps
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <div 
                key={item.step}
                className="group relative p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 hover:border-[#C7A14A]/20 transition-all duration-500"
              >
                {/* Step Number */}
                <div className="absolute -top-4 left-8 px-3 py-1 rounded-full bg-[#0E1A2B] border border-white/10 text-xs text-[#C7A14A] font-mono">
                  {item.step}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-[#C7A14A]/10 border border-[#C7A14A]/20 flex items-center justify-center mb-6 group-hover:bg-[#C7A14A]/20 transition-colors">
                  <item.icon className="h-6 w-6 text-[#C7A14A]" />
                </div>

                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-white/50 leading-relaxed">{item.description}</p>

                {/* Connector Line */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-6 w-8 lg:w-12 h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CATEGORY SPLIT ============== */}
      <section className="relative py-24 sm:py-32 bg-[#0A0F18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Weddings */}
            <div 
              className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer"
              onClick={() => navigate('/venues?event_type=wedding')}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1670529776286-f426fb7ba42c?w=1200&q=80)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070B12] via-[#070B12]/50 to-transparent" />
              <div className="absolute inset-0 bg-[#C7A14A]/0 group-hover:bg-[#C7A14A]/10 transition-colors duration-500" />
              
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                  <Heart className="h-4 w-4 text-[#C7A14A]" />
                  <span className="text-xs text-white/80">500+ Wedding Venues</span>
                </div>
                <h3 className="font-serif text-3xl lg:text-4xl font-medium mb-3">Weddings</h3>
                <p className="text-white/60 mb-6 max-w-sm">
                  Grand celebrations deserve grand venues. Find the perfect backdrop for your special day.
                </p>
                <div className="inline-flex items-center gap-2 text-[#C7A14A] font-medium group-hover:gap-4 transition-all">
                  Explore Wedding Venues
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Corporate & Celebrations */}
            <div 
              className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer"
              onClick={() => navigate('/venues?event_type=corporate')}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1768508951405-10e83c4a2872?w=1200&q=80)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070B12] via-[#070B12]/50 to-transparent" />
              <div className="absolute inset-0 bg-[#C7A14A]/0 group-hover:bg-[#C7A14A]/10 transition-colors duration-500" />
              
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                  <Building2 className="h-4 w-4 text-[#C7A14A]" />
                  <span className="text-xs text-white/80">300+ Corporate Venues</span>
                </div>
                <h3 className="font-serif text-3xl lg:text-4xl font-medium mb-3">Corporate & Celebrations</h3>
                <p className="text-white/60 mb-6 max-w-sm">
                  From boardroom to ballroom. Professional spaces for every business occasion.
                </p>
                <div className="inline-flex items-center gap-2 text-[#C7A14A] font-medium group-hover:gap-4 transition-all">
                  Explore Corporate Venues
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FEATURED VENUES CAROUSEL ============== */}
      <section id="venues" className="relative py-24 sm:py-32 bg-[#070B12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7A14A]/10 border border-[#C7A14A]/20 mb-4">
                <TrendingUp className="h-4 w-4 text-[#C7A14A]" />
                <span className="text-xs text-[#C7A14A] uppercase tracking-wider">Popular Choices</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium">
                Featured Venues
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => scrollCarousel('left')}
                disabled={carouselIndex === 0}
                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                disabled={carouselIndex >= FEATURED_VENUES.length - 3}
                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Carousel */}
          <div className="overflow-hidden" ref={carouselRef}>
            <div 
              className="flex gap-6 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${carouselIndex * (100 / 3 + 2)}%)` }}
            >
              {FEATURED_VENUES.map((venue) => (
                <div 
                  key={venue.id}
                  className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] group cursor-pointer"
                  onClick={() => navigate(`/venues/${venue.id}`)}
                >
                  <div className="relative h-[280px] rounded-2xl overflow-hidden mb-4">
                    <img 
                      src={venue.image} 
                      alt={venue.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070B12]/80 via-transparent to-transparent" />
                    
                    {/* Tag */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#C7A14A] text-[#0E1A2B] text-xs font-semibold">
                      {venue.tag}
                    </div>

                    {/* Rating */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                      <Star className="h-3 w-3 text-[#C7A14A] fill-[#C7A14A]" />
                      <span className="text-xs font-medium">{venue.rating}</span>
                    </div>

                    {/* Quick Info Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-white/80">
                        <Users className="h-3 w-3" />
                        {venue.capacity} guests
                      </div>
                      <div className="text-sm font-semibold text-[#C7A14A]">
                        {venue.startingPrice}+
                      </div>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-1 group-hover:text-[#C7A14A] transition-colors">
                    {venue.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-white/50">
                    <MapPin className="h-3 w-3" />
                    {venue.location}
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    {venue.reviews} reviews
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View All */}
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/venues')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all group"
            >
              View All Venues
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ============== SOCIAL PROOF / STATS ============== */}
      <section id="trust" className="relative py-24 sm:py-32 bg-[#0E1A2B]">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C7A14A]/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C7A14A]/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7A14A]/10 border border-[#C7A14A]/20 mb-6">
              <Award className="h-4 w-4 text-[#C7A14A]" />
              <span className="text-xs text-[#C7A14A] uppercase tracking-wider">Trusted Platform</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium mb-4">
              Numbers That Speak
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Thousands of events, hundreds of venues, one trusted platform
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {STATS.map((stat, index) => (
              <div 
                key={stat.label}
                className="relative p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 text-center group hover:border-[#C7A14A]/20 transition-all duration-500"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C7A14A]/10 border border-[#C7A14A]/20 flex items-center justify-center mb-6 group-hover:bg-[#C7A14A]/20 transition-colors">
                  <stat.icon className="h-7 w-7 text-[#C7A14A]" />
                </div>
                <div className="font-serif text-4xl sm:text-5xl font-medium text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-white/50 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-white/60 mb-6">Ready to find your perfect venue?</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#C7A14A] to-[#D4B65A] text-[#0E1A2B] font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#C7A14A]/25 group"
            >
              Start Your Search
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="relative py-16 bg-[#070B12] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#C7A14A] to-[#E8D5A3] p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#0E1A2B]">
                    <span className="text-sm font-bold text-[#C7A14A]">BMV</span>
                  </div>
                </div>
                <div className="text-lg font-semibold">BookMyVenue</div>
              </div>
              <p className="text-sm text-white/40 mb-4 max-w-xs">
                India's premium venue booking platform. Verified venues, transparent pricing, expert support.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-4">Quick Links</h4>
              <ul className="space-y-3">
                {['Browse Venues', 'How it Works', 'Pricing', 'Contact Us'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Venue Types */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-4">Venue Types</h4>
              <ul className="space-y-3">
                {['Wedding Venues', 'Corporate Venues', 'Party Venues', 'Banquet Halls'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cities */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-4">Top Cities</h4>
              <ul className="space-y-3">
                {['Delhi NCR', 'Mumbai', 'Bangalore', 'Hyderabad'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} BookMyVenue. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
