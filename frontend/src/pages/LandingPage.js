import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/context/AuthContext';
import { EVENT_TYPES, GUEST_COUNT_OPTIONS, cn } from '@/lib/utils';
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  ArrowRight,
  Star,
  Shield,
  Briefcase,
  CheckCircle,
  IndianRupee,
  Lock,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search form state
  const [searchCity, setSearchCity] = useState('');
  const [searchGuests, setSearchGuests] = useState('');
  const [searchDate, setSearchDate] = useState(null);
  const [searchBudget, setSearchBudget] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [venuesRes, citiesRes] = await Promise.all([
          api.get('/venues?limit=6&sort_by=popular'),
          api.get('/cities'),
        ]);
        setFeaturedVenues(venuesRes.data);
        setCities(citiesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (searchCity) params.set('city', searchCity);
    if (searchGuests) {
      const guestOption = GUEST_COUNT_OPTIONS.find(opt => opt.value === searchGuests);
      if (guestOption) {
        params.set('guest_min', guestOption.min);
        if (guestOption.max) params.set('guest_max', guestOption.max);
      }
    }
    if (searchDate) params.set('event_date', format(searchDate, 'yyyy-MM-dd'));
    if (searchBudget) params.set('budget', searchBudget);
    
    navigate(`/venues/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      {/* Premium Hero Section - Split Layout */}
      <section className="min-h-[90vh] bg-[#F8F9FB] pt-20" data-testid="hero-section">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[calc(90vh-80px)] py-12 lg:py-0">
            
            {/* Left Content - 55% */}
            <div className="lg:col-span-7 space-y-8">
              {/* Headline */}
              <div className="space-y-4">
                <h1 
                  className="font-serif text-[2.75rem] sm:text-5xl lg:text-6xl xl:text-[4.25rem] text-[#0F172A] font-medium leading-[1.08] tracking-[-0.02em]"
                  data-testid="hero-headline"
                >
                  We Negotiate.
                  <br />
                  <span className="text-[#0F172A]">You Celebrate.</span>
                </h1>
                
                {/* Subline */}
                <p className="text-lg lg:text-xl text-[#475569] max-w-lg leading-relaxed font-light">
                  Venue acquisition and negotiation, managed with structure and financial discipline.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="h-13 px-8 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm tracking-wide rounded-none shadow-sm"
                  data-testid="primary-cta"
                >
                  <Link to="/register">
                    Start Managed Consultation
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-13 px-8 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A]/5 font-semibold text-sm tracking-wide rounded-none"
                  data-testid="secondary-cta"
                >
                  <Link to="/venues/search">
                    Browse Verified Venues
                  </Link>
                </Button>
              </div>

              {/* Inline Search Bar */}
              <form
                onSubmit={handleSearch}
                className="mt-10"
                data-testid="hero-search-form"
              >
                <div className="bg-white border border-[#E2E8F0] shadow-sm">
                  <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
                    {/* Location */}
                    <div className="p-4">
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-2">
                        Location
                      </label>
                      <Select value={searchCity} onValueChange={setSearchCity}>
                        <SelectTrigger 
                          className="h-10 border-0 p-0 shadow-none focus:ring-0 text-[#0F172A] font-medium"
                          data-testid="search-city"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#94A3B8]" />
                            <SelectValue placeholder="Select City" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-[#E2E8F0]">
                          {cities.map((city) => (
                            <SelectItem key={city.city_id} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Guests */}
                    <div className="p-4">
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-2">
                        Guests
                      </label>
                      <Select value={searchGuests} onValueChange={setSearchGuests}>
                        <SelectTrigger 
                          className="h-10 border-0 p-0 shadow-none focus:ring-0 text-[#0F172A] font-medium"
                          data-testid="search-guests"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#94A3B8]" />
                            <SelectValue placeholder="Guest Count" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-[#E2E8F0]">
                          {GUEST_COUNT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date */}
                    <div className="p-4">
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-2">
                        Date
                      </label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="h-10 w-full flex items-center gap-2 text-left text-sm font-medium text-[#0F172A]"
                            data-testid="search-date"
                          >
                            <CalendarIcon className="w-4 h-4 text-[#94A3B8]" />
                            <span className={searchDate ? "text-[#0F172A]" : "text-[#94A3B8]"}>
                              {searchDate ? format(searchDate, 'dd MMM yyyy') : 'Select Date'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-none border-[#E2E8F0]" align="start">
                          <Calendar
                            mode="single"
                            selected={searchDate}
                            onSelect={(date) => {
                              setSearchDate(date);
                              setDatePickerOpen(false);
                            }}
                            disabled={(date) => date < new Date()}
                            className="rounded-none"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Budget (Optional) */}
                    <div className="p-4">
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-2">
                        Budget <span className="text-[#CBD5E1]">(Optional)</span>
                      </label>
                      <div className="flex items-center gap-2 h-10">
                        <IndianRupee className="w-4 h-4 text-[#94A3B8]" />
                        <Input
                          type="number"
                          placeholder="Enter budget"
                          value={searchBudget}
                          onChange={(e) => setSearchBudget(e.target.value)}
                          className="h-10 border-0 p-0 shadow-none focus-visible:ring-0 text-[#0F172A] font-medium placeholder:text-[#94A3B8]"
                          data-testid="search-budget"
                        />
                      </div>
                    </div>

                    {/* Search Button */}
                    <div className="col-span-2 md:col-span-1 p-4 flex items-end">
                      <Button
                        type="submit"
                        className="w-full h-10 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm rounded-none"
                        data-testid="search-btn"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Image - 45% */}
            <div className="lg:col-span-5 relative">
              <div className="relative">
                {/* Soft shadow container */}
                <div 
                  className="rounded-lg overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]"
                  data-testid="hero-image"
                >
                  <img
                    src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80"
                    alt="Premium venue interior"
                    className="w-full aspect-[4/5] lg:aspect-[3/4] object-cover saturate-[0.85]"
                    style={{ borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Authority Strip */}
        <div className="border-t border-[#E2E8F0] bg-white mt-12 lg:mt-0">
          <div className="container-main">
            <div 
              className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]"
              data-testid="authority-strip"
            >
              <div className="py-6 px-4 md:px-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F8F9FB] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[#C6A75E]" />
                </div>
                <span className="text-sm font-medium text-[#0F172A]">Negotiation Included</span>
              </div>
              <div className="py-6 px-4 md:px-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F8F9FB] flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-[#C6A75E]" />
                </div>
                <span className="text-sm font-medium text-[#0F172A]">Verified Venues Only</span>
              </div>
              <div className="py-6 px-4 md:px-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F8F9FB] flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-[#C6A75E]" />
                </div>
                <span className="text-sm font-medium text-[#0F172A]">Real-Time Availability Sync</span>
              </div>
              <div className="py-6 px-4 md:px-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F8F9FB] flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-[#C6A75E]" />
                </div>
                <span className="text-sm font-medium text-[#0F172A]">Secure Transaction Mediation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-24 bg-white">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-[#C6A75E] font-semibold text-xs uppercase tracking-[0.2em] mb-4">
              The BookMyVenue Advantage
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#0F172A] font-medium mb-5">
              Structured Deal Advisory
            </h2>
            <p className="text-[#64748B] leading-relaxed">
              Professional venue acquisition with financial discipline. No hidden costs, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#E2E8F0]">
            {/* Feature 1 */}
            <div className="bg-white p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-6 bg-[#F8F9FB] flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-[#C6A75E]" />
              </div>
              <h3 className="font-serif text-lg text-[#0F172A] font-medium mb-3">
                Dedicated Deal Manager
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed">
                A single point of contact manages your entire transaction from discovery to contract execution.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-6 bg-[#F8F9FB] flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#C6A75E]" />
              </div>
              <h3 className="font-serif text-lg text-[#0F172A] font-medium mb-3">
                Price Negotiation
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed">
                We negotiate directly with venues to secure optimal rates and favorable contract terms.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-6 bg-[#F8F9FB] flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#C6A75E]" />
              </div>
              <h3 className="font-serif text-lg text-[#0F172A] font-medium mb-3">
                Escrow Protection
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed">
                Secure payment mediation ensures funds are protected until service delivery is confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues */}
      <section className="py-24 bg-[#F8F9FB]">
        <div className="container-main">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
            <div>
              <p className="text-[#C6A75E] font-semibold text-xs uppercase tracking-[0.2em] mb-4">
                Curated Portfolio
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-[#0F172A] font-medium">
                Verified Venues
              </h2>
            </div>
            <Link
              to="/venues/search"
              className="mt-4 md:mt-0 inline-flex items-center text-[#0F172A] font-medium text-sm hover:text-[#C6A75E] transition-colors group"
            >
              View All Venues
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white">
                  <div className="aspect-[4/3] skeleton" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 skeleton w-1/3" />
                    <div className="h-6 skeleton w-2/3" />
                    <div className="h-4 skeleton w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredVenues.slice(0, 3).map((venue) => (
                <VenueCard key={venue.venue_id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-[#C6A75E] font-semibold text-xs uppercase tracking-[0.2em] mb-4">
              Process
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#0F172A] font-medium">
              How We Work
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { step: '01', title: 'Submit Requirements', desc: 'Share event details, preferences, and budget parameters.' },
              { step: '02', title: 'Receive Shortlist', desc: 'Our team curates a verified venue selection tailored to your needs.' },
              { step: '03', title: 'Site Visits & Negotiation', desc: 'We coordinate visits and negotiate optimal pricing terms.' },
              { step: '04', title: 'Secure Booking', desc: 'Finalize with protected payment processing and contract support.' },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                {idx < 3 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-[#E2E8F0]" />
                )}
                <div className="text-center relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 border border-[#E2E8F0] text-[#C6A75E] font-mono text-sm font-semibold mb-5">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-base text-[#0F172A] font-medium mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#F8F9FB]">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-[#C6A75E] font-semibold text-xs uppercase tracking-[0.2em] mb-4">
              Client Outcomes
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#0F172A] font-medium">
              Trusted by Discerning Clients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 border border-[#E2E8F0]">
              <div className="flex gap-1 mb-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C6A75E] text-[#C6A75E]" />
                ))}
              </div>
              <p className="text-[#0F172A] leading-relaxed mb-5">
                "The negotiation alone saved us 18% on our venue cost. Their structured approach gave us confidence throughout the process."
              </p>
              <p className="text-sm text-[#64748B]">Priya S. — Wedding, Delhi</p>
            </div>
            <div className="bg-white p-8 border border-[#E2E8F0]">
              <div className="flex gap-1 mb-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C6A75E] text-[#C6A75E]" />
                ))}
              </div>
              <p className="text-[#0F172A] leading-relaxed mb-5">
                "Professional, transparent, and efficient. They handled our corporate event requirements with the discipline we expected."
              </p>
              <p className="text-sm text-[#64748B]">Rajesh M. — Corporate Event, Gurgaon</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#0F172A]">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-white font-medium mb-5">
              Ready to Begin?
            </h2>
            <p className="text-[#94A3B8] mb-10 leading-relaxed">
              Submit your requirements and our deal advisory team will respond within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="h-12 px-8 bg-[#C6A75E] hover:bg-[#B8993F] text-[#0F172A] font-semibold text-sm tracking-wide rounded-none"
              >
                <Link to="/register">
                  Start Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 px-8 border-[#334155] text-white hover:bg-[#1E293B] font-semibold text-sm tracking-wide rounded-none"
              >
                <Link to="/venues/search">
                  Browse Venues
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
