import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EnquiryForm from '@/components/EnquiryForm';
import GalleryModal from '@/components/venue/GalleryModal';
import PhotoLightbox from '@/components/venue/PhotoLightbox';
import EMICalculatorSection from '@/components/venue/EMICalculator';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency, formatIndianCurrencyFull, formatDate, AMENITIES } from '@/lib/utils';
import {
  Star,
  MapPin,
  Users,
  Phone,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Car,
  Wifi,
  Snowflake,
  Wine,
  Bed,
  ChefHat,
  Truck,
  Flower2,
  Speaker,
  Music,
  Zap,
  Key,
  Check,
  X,
  Calendar,
  Clock,
  Crown,
  Shield,
  ArrowLeft,
  Menu,
  HelpCircle,
  ChevronDown,
  Play,
  Video,
  Maximize2,
  ImagePlus,
  Images,
  Scale,
} from 'lucide-react';
import { ConnectButton } from '@/components/ConnectButton';
import { useCompare } from '@/context/CompareContext';

const iconMap = {
  Car,
  Key,
  Wine,
  Bed,
  Snowflake,
  ChefHat,
  Truck,
  Flower2,
  Speaker,
  Music,
  Wifi,
  Zap,
};

// Default FAQ items for venues
const getDefaultFAQs = (venue) => {
  const defaults = [
    {
      question: `What is the guest capacity at ${venue?.name || 'this venue'}?`,
      answer: venue?.capacity_min && venue?.capacity_max 
        ? `This venue can accommodate between ${venue.capacity_min} and ${venue.capacity_max} guests. Our venue experts can help you plan the optimal setup for your specific guest count.`
        : 'Please contact our venue experts for specific capacity information tailored to your event type.'
    },
    {
      question: 'What catering options are available?',
      answer: venue?.amenities?.catering_inhouse && venue?.amenities?.catering_outside_allowed
        ? 'This venue offers both in-house catering and allows outside caterers. Our team can guide you on the best option based on your preferences and budget.'
        : venue?.amenities?.catering_inhouse
        ? 'This venue provides in-house catering services. Speak with our experts to learn about menu options and packages.'
        : venue?.amenities?.catering_outside_allowed
        ? 'This venue allows outside caterers, giving you flexibility in choosing your preferred catering partner.'
        : 'Contact our venue experts for detailed information about catering arrangements.'
    },
    {
      question: 'Is parking available for guests?',
      answer: venue?.amenities?.parking
        ? `Yes, parking is available at this venue.${venue?.amenities?.valet ? ' Valet parking service is also offered for a premium experience.' : ''}`
        : 'Please inquire with our team about parking arrangements for your event.'
    },
    {
      question: 'What is the booking process?',
      answer: 'Our streamlined booking process includes: 1) Submit your event requirements through our inquiry form, 2) Get matched with a dedicated Relationship Manager, 3) Receive personalized venue recommendations and quotes, 4) Confirm your booking with our managed documentation support.'
    },
    {
      question: 'Can I visit the venue before booking?',
      answer: 'Absolutely! We encourage venue visits. Your dedicated Relationship Manager will coordinate a convenient time for you to visit and experience the venue firsthand.'
    },
    {
      question: 'What types of events can be hosted here?',
      answer: venue?.event_types?.length 
        ? `This venue is perfect for ${venue.event_types.map(t => t.replace(/_/g, ' ')).join(', ')}. Our experts can advise on the best setup for your specific event.`
        : 'This venue can host a variety of events. Contact our team to discuss your specific requirements.'
    },
    {
      question: 'Is there a minimum spend requirement?',
      answer: venue?.pricing?.min_spend
        ? `Yes, there is a minimum spend requirement of ₹${venue.pricing.min_spend.toLocaleString('en-IN')}. Our Relationship Managers can help you optimize your event within your budget.`
        : 'Pricing varies based on event type, guest count, and services required. Our team will provide a detailed quote tailored to your needs.'
    },
    {
      question: 'Are decorations and DJ services allowed?',
      answer: venue?.amenities?.decor_inhouse && venue?.amenities?.sound_system
        ? 'Yes! This venue offers in-house decoration services and has a professional sound system. External decorators and DJs can also be arranged based on venue policies.'
        : 'Please discuss decoration and entertainment requirements with our venue experts who can guide you on available options.'
    }
  ];
  
  // If venue has custom FAQs, prepend them to the list
  if (venue?.faqs && venue.faqs.length > 0) {
    return [...venue.faqs, ...defaults];
  }
  
  return defaults;
};

// FAQ Accordion Item Component
const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-slate-200 last:border-b-0">
    <button
      onClick={onClick}
      className="w-full py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
      data-testid={`faq-question-${question.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
    >
      <span className="font-medium text-[#111111] pr-4">{question}</span>
      <ChevronDown 
        className={`w-5 h-5 text-[#D4AF37] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
      />
    </button>
    <div 
      className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}
    >
      <p className="text-[#64748B] leading-relaxed pr-8">{answer}</p>
    </div>
  </div>
);

const VenueDetailPage = () => {
  const { venueId: venueIdParam, param } = useParams();
  const navigate = useNavigate();
  const venueId = venueIdParam || param;
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialTab, setGalleryInitialTab] = useState('photos');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const { isAuthenticated } = useAuth();
  const { isFavorite: isFav, toggleFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const isFavorite = venue ? isFav(venue?.venue_id || venueId) : false;
  const isCompared = venue ? isInCompare(venue?.venue_id || venueId) : false;

  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: venue?.name || 'Check out this venue',
      text: `${venue?.name} - ${venue?.area}, ${venue?.city}. Perfect for your celebration!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  // Favorite functionality - requires login
  const handleFavorite = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleFavorite(venueId);
  };

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const response = await api.get(`/venues/${venueId}`);
        const v = response.data;
        setVenue(v);

        // Track recently viewed
        try {
          const RECENT_KEY = 'vl_recently_viewed';
          const MAX_RECENT = 10;
          const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
          const filtered = stored.filter(item => item.venue_id !== v.venue_id);
          filtered.unshift({
            venue_id: v.venue_id,
            name: v.name,
            city: v.city,
            area: v.area,
            image: v.images?.[0] || '',
            price_per_plate: v.price_per_plate,
            rating: v.rating,
            venue_type: v.venue_type,
            viewed_at: Date.now(),
          });
          localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
        } catch {}
        
        // Fetch availability for current and next month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
        
        try {
          const [currentRes, nextRes] = await Promise.all([
            api.get(`/venues/${venueId}/availability?month=${currentMonth}`),
            api.get(`/venues/${venueId}/availability?month=${nextMonthStr}`)
          ]);
          setAvailability([...(currentRes.data.slots || []), ...(nextRes.data.slots || [])]);
        } catch (availErr) {
          console.log('No availability data:', availErr);
        }
      } catch (error) {
        console.error('Error fetching venue:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [venueId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7]">
        <Header />
        <div className="container-main py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 w-1/3 mb-4" />
            <div className="h-[500px] bg-slate-200 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-6 bg-slate-200 w-2/3" />
                <div className="h-4 bg-slate-200 w-full" />
                <div className="h-4 bg-slate-200 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#F9F9F7]">
        <Header />
        <div className="container-main py-16 text-center">
          <h1 className="font-serif text-2xl text-[#111111] mb-4">Venue not found</h1>
          <Link to="/venues" className="text-[#D4AF37] hover:underline">
            Browse all venues
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const images = venue.images?.length > 0
    ? venue.images
    : ['https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=1200'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* Mobile Header - Fixed transparent over image */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setGalleryOpen(true); setGalleryInitialTab('360'); }}
              className="h-10 px-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center gap-1.5 active:bg-white/40 transition-colors"
              data-testid="360-tour-button"
            >
              <Maximize2 className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-medium">360°</span>
            </button>
            <button 
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/40 transition-colors"
              data-testid="share-button"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={handleFavorite}
              className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                isFavorite ? 'bg-red-500' : 'bg-white/20 active:bg-white/40'
              }`}
              data-testid="favorite-button"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-white fill-white' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Breadcrumb */}
      <div className="hidden lg:block bg-white border-b border-slate-200">
        <div className="container-main py-3">
          <nav className="flex items-center gap-2 text-sm text-[#64748B]">
            <Link to="/" className="hover:text-[#111111]">Home</Link>
            <span>/</span>
            <Link to="/venues" className="hover:text-[#111111]">Venues</Link>
            <span>/</span>
            <Link to={`/venues?city=${venue.city}`} className="hover:text-[#111111]">{venue.city}</Link>
            <span>/</span>
            <span className="text-[#111111]">{venue.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Image Gallery - Full width on mobile */}
      <div className="relative lg:container-main lg:py-8">
        <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden lg:rounded-2xl">
          <img
            src={images[currentImageIndex]}
            alt={venue.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => { setLightboxIndex(currentImageIndex); setLightboxOpen(true); }}
            data-testid="hero-image-clickable"
          />
          
          {/* Dark gradient overlay - stronger on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:from-black/40 lg:via-transparent" />
          
          {/* Image Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                data-testid="prev-image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                data-testid="next-image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex absolute top-4 right-4 gap-2">
            <button 
              onClick={() => { setGalleryOpen(true); setGalleryInitialTab('360'); }}
              className="h-10 px-4 bg-white/90 rounded-full flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-lg"
              data-testid="desktop-360-button"
            >
              <Maximize2 className="w-4 h-4 text-[#111111]" />
              <span className="text-sm font-medium text-[#111111]">360° Tour</span>
            </button>
            <button 
              onClick={handleShare}
              className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
            >
              <Share2 className="w-5 h-5 text-[#111111]" />
            </button>
            <button 
              onClick={handleFavorite}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                isFavorite ? 'bg-red-500 hover:bg-red-600' : 'bg-white/90 hover:bg-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-white fill-white' : 'text-[#111111]'}`} />
            </button>
          </div>

          {/* View Gallery Button - Bottom of image */}
          <button
            onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
            className="absolute bottom-20 right-4 lg:bottom-6 lg:right-6 z-10 h-10 px-4 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
            data-testid="view-gallery-button"
          >
            <ImagePlus className="w-4 h-4 text-[#111111]" />
            <span className="text-sm font-medium text-[#111111]">{images.length} Photos</span>
          </button>

          {/* Rating Badge */}
          {venue.rating > 0 && (
            <div className="absolute top-16 lg:top-4 left-4 bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
              <span className="font-bold text-[#111111]">{venue.rating.toFixed(1)}</span>
              <span className="text-xs text-[#64748B]">({venue.review_count} reviews)</span>
            </div>
          )}

          {/* Mobile Venue Info Overlay */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-[#D4AF37] text-[#111111] text-xs font-bold rounded uppercase">
                {venue.venue_type?.replace(/_/g, ' ')}
              </span>
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded">
                {venue.indoor_outdoor}
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-white mb-1 drop-shadow-lg">
              {venue.name}
            </h1>
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {venue.area}, {venue.city}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {venue.capacity_min}-{venue.capacity_max}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-main py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2">
            {/* Desktop Header */}
            <div className="hidden lg:block mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-[#111111] text-white hover:bg-[#111111]">
                  {venue.venue_type?.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">{venue.indoor_outdoor}</Badge>
                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#111111] mb-3">
                {venue.name}
              </h1>
              <div className="flex items-center gap-4 text-[#64748B]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>{venue.area}, {venue.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{venue.capacity_min} - {venue.capacity_max} guests</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-between border-b border-slate-200 rounded-none bg-transparent h-auto p-0 mb-6">
                <TabsTrigger
                  value="overview"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#D4AF37] data-[state=active]:bg-transparent py-3 text-sm font-medium"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#D4AF37] data-[state=active]:bg-transparent py-3 text-sm font-medium"
                >
                  Pricing
                </TabsTrigger>
                <TabsTrigger
                  value="amenities"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#D4AF37] data-[state=active]:bg-transparent py-3 text-sm font-medium"
                >
                  Amenities
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#D4AF37] data-[state=active]:bg-transparent py-3 text-sm font-medium"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="faq"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#D4AF37] data-[state=active]:bg-transparent py-3 text-sm font-medium"
                  data-testid="faq-tab"
                >
                  FAQ
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8">
                {venue.description && (
                  <div className="bg-white p-5 rounded-xl border border-slate-100">
                    <h3 className="font-serif text-lg font-semibold text-[#111111] mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#D4AF37] rounded-full"></span>
                      About This Venue
                    </h3>
                    <p className="text-[#64748B] leading-relaxed text-sm sm:text-base">{venue.description}</p>
                  </div>
                )}

                <div className="bg-white p-5 rounded-xl border border-slate-100">
                  <h3 className="font-serif text-lg font-semibold text-[#111111] mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#D4AF37] rounded-full"></span>
                    Event Types
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {venue.event_types?.map((type) => (
                      <span 
                        key={type} 
                        className="px-3 py-1.5 bg-[#F5F0E6] text-[#111111] text-sm rounded-full capitalize border border-[#D4AF37]/20"
                      >
                        {type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100">
                  <h3 className="font-serif text-lg font-semibold text-[#111111] mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#D4AF37] rounded-full"></span>
                    Location
                  </h3>
                  <p className="text-[#64748B] mb-4 text-sm sm:text-base">{venue.address}</p>
                  <div className="h-[200px] sm:h-[300px] rounded-lg overflow-hidden border border-slate-200">
                    <iframe
                      title="Venue Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(venue.address || venue.area + ', ' + venue.city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address || venue.area + ', ' + venue.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#111111] font-medium"
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                </div>

                {venue.policies && (
                  <div className="bg-white p-5 rounded-xl border border-slate-100">
                    <h3 className="font-serif text-lg font-semibold text-[#111111] mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#D4AF37] rounded-full"></span>
                      Policies
                    </h3>
                    <p className="text-[#64748B] leading-relaxed text-sm sm:text-base">{venue.policies}</p>
                  </div>
                )}
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venue.pricing?.price_per_plate_veg && (
                    <div className="bg-white p-6 border border-slate-200">
                      <p className="text-sm text-[#64748B] mb-1">Veg Price per Plate</p>
                      <p className="font-mono text-2xl font-bold text-[#111111]">
                        {formatIndianCurrencyFull(venue.pricing.price_per_plate_veg)}
                      </p>
                    </div>
                  )}
                  {venue.pricing?.price_per_plate_nonveg && (
                    <div className="bg-white p-6 border border-slate-200">
                      <p className="text-sm text-[#64748B] mb-1">Non-Veg Price per Plate</p>
                      <p className="font-mono text-2xl font-bold text-[#111111]">
                        {formatIndianCurrencyFull(venue.pricing.price_per_plate_nonveg)}
                      </p>
                    </div>
                  )}
                  {venue.pricing?.min_spend && (
                    <div className="bg-white p-6 border border-slate-200">
                      <p className="text-sm text-[#64748B] mb-1">Minimum Spend</p>
                      <p className="font-mono text-2xl font-bold text-[#111111]">
                        {formatIndianCurrencyFull(venue.pricing.min_spend)}
                      </p>
                    </div>
                  )}
                </div>

                {venue.pricing?.packages?.length > 0 && (
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#111111] mb-4">Packages</h3>
                    <div className="space-y-4">
                      {venue.pricing.packages.map((pkg, idx) => (
                        <div key={idx} className="bg-white p-6 border border-slate-200 flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-[#111111]">{pkg.name}</h4>
                            {pkg.guests && <p className="text-sm text-[#64748B]">Up to {pkg.guests} guests</p>}
                            {pkg.hours && <p className="text-sm text-[#64748B]">{pkg.hours} hours</p>}
                          </div>
                          <p className="font-mono text-xl font-bold text-[#D4AF37]">
                            {formatIndianCurrencyFull(pkg.price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Amenities Tab */}
              <TabsContent value="amenities">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AMENITIES.map((amenity) => {
                    const available = amenity.key === 'rooms_available'
                      ? venue.amenities?.[amenity.key] > 0
                      : venue.amenities?.[amenity.key];
                    const Icon = iconMap[amenity.icon] || Check;
                    
                    return (
                      <div
                        key={amenity.key}
                        className={`flex items-center gap-3 p-4 ${
                          available ? 'bg-white border border-slate-200' : 'bg-slate-50 opacity-50'
                        }`}
                      >
                        <div className={`w-10 h-10 flex items-center justify-center ${
                          available ? 'bg-[#F0E6D2] text-[#111111]' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-medium ${available ? 'text-[#111111]' : 'text-slate-400'}`}>
                            {amenity.label}
                          </p>
                          {amenity.key === 'rooms_available' && venue.amenities?.[amenity.key] > 0 && (
                            <p className="text-sm text-[#64748B]">{venue.amenities[amenity.key]} rooms</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                {venue.reviews?.length > 0 ? (
                  <div className="space-y-6">
                    {venue.reviews.map((review) => (
                      <div key={review.review_id} className="bg-white p-6 border border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-[#111111]">{review.user_name}</p>
                            <p className="text-sm text-[#64748B]">{formatDate(review.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-[#D4AF37] fill-current' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.title && (
                          <h4 className="font-medium text-[#111111] mb-2">{review.title}</h4>
                        )}
                        <p className="text-[#64748B]">{review.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-[#64748B]">No reviews yet</p>
                  </div>
                )}
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" data-testid="faq-content">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {/* FAQ Header */}
                  <div className="bg-gradient-to-r from-[#111111] to-[#1a3a5c] px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-white">Frequently Asked Questions</h3>
                        <p className="text-white/70 text-sm">Everything you need to know about this venue</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* FAQ Items */}
                  <div className="px-6">
                    {getDefaultFAQs(venue).map((faq, index) => (
                      <FAQItem
                        key={index}
                        question={faq.question}
                        answer={faq.answer}
                        isOpen={openFAQ === index}
                        onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                      />
                    ))}
                  </div>
                  
                  {/* FAQ Footer CTA */}
                  <div className="px-6 py-5 bg-[#F9F9F7] border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-[#64748B] text-sm text-center sm:text-left">
                        Still have questions? Our venue experts are here to help.
                      </p>
                      <Button
                        onClick={() => setEnquiryOpen(true)}
                        className="bg-[#D4AF37] hover:bg-[#D4B040] text-[#111111] font-medium"
                        data-testid="faq-enquire-btn"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Ask an Expert
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#111111] p-7">
              {/* Price */}
              <div className="mb-6 pb-6 border-b border-white/[0.08]">
                <p className="text-[11px] text-white/40 uppercase tracking-[0.1em] font-semibold mb-1">Starting from</p>
                <p className="text-3xl font-bold text-white">
                  {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
                  <span className="text-base font-normal text-white/40">/plate</span>
                </p>
              </div>

              {/* Quick Info */}
              <div className="space-y-3 mb-6 pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-white/65 text-sm">{venue.capacity_min} – {venue.capacity_max} guests</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-white/65 text-sm">{venue.area}, {venue.city}</span>
                </div>
                {venue.distance && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-white/65 text-sm">{venue.distance.toFixed(1)} km away</span>
                  </div>
                )}
              </div>

              {/* Availability Indicator */}
              {availability.length > 0 && (
                <div className="mb-6 pb-6 border-b border-white/[0.08]">
                  <h3 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/40 mb-3">Upcoming Availability</h3>
                  <div className="space-y-2">
                    {(() => {
                      const now = new Date();
                      const next14Days = [];
                      for (let i = 0; i < 14; i++) {
                        const date = new Date(now);
                        date.setDate(date.getDate() + i);
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const slot = availability.find(s => s.date === dateStr);
                        next14Days.push({ date, dateStr, status: slot?.status || 'available' });
                      }
                      
                      // Group consecutive same-status days
                      const groups = [];
                      let currentGroup = null;
                      next14Days.forEach(day => {
                        if (!currentGroup || currentGroup.status !== day.status) {
                          if (currentGroup) groups.push(currentGroup);
                          currentGroup = { status: day.status, days: [day] };
                        } else {
                          currentGroup.days.push(day);
                        }
                      });
                      if (currentGroup) groups.push(currentGroup);
                      
                      return groups.slice(0, 4).map((group, idx) => {
                        const statusConfig = {
                          available: { color: 'bg-emerald-500', text: 'Available', textColor: 'text-emerald-700' },
                          tentative: { color: 'bg-amber-500', text: 'Tentative', textColor: 'text-amber-700' },
                          blocked: { color: 'bg-red-500', text: 'Blocked', textColor: 'text-red-700' },
                          booked: { color: 'bg-slate-500', text: 'Booked', textColor: 'text-slate-700' },
                        };
                        const config = statusConfig[group.status] || statusConfig.available;
                        const startDate = group.days[0].date;
                        const endDate = group.days[group.days.length - 1].date;
                        const dateRange = group.days.length === 1 
                          ? startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${config.color}`} />
                            <span className={`${config.textColor} font-medium`}>{config.text}</span>
                            <span className="text-[#64748B]">{dateRange}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <p className="text-[11px] text-white/30 mt-3">
                    Contact our expert to check specific date availability.
                  </p>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button
                  className="w-full bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] font-bold py-4 text-[12px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 transition-colors"
                  onClick={() => setEnquiryOpen(true)}
                  data-testid="enquire-now-btn"
                >
                  <Calendar className="w-4 h-4" />
                  Speak to Our Venue Expert
                </button>
                <ConnectButton
                  variant="outline"
                  className="w-full py-4 text-sm border border-white/15 text-white/55 hover:text-white hover:border-white/30 transition-colors"
                  fullWidth
                />
                <button
                  className={`w-full py-4 text-sm border transition-colors flex items-center justify-center gap-2 ${
                    isFavorite
                      ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'border-white/15 text-white/55 hover:text-white hover:border-white/30'
                  }`}
                  onClick={handleFavorite}
                  data-testid="sidebar-favorite-btn"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-400 text-red-400' : ''}`} />
                  {isFavorite ? 'Saved to Favorites' : 'Save to Favorites'}
                </button>
                <button
                  className={`w-full py-4 text-sm border transition-colors flex items-center justify-center gap-2 ${
                    isCompared
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                      : 'border-white/15 text-white/55 hover:text-white hover:border-white/30'
                  }`}
                  onClick={() => {
                    if (isCompared) removeFromCompare(venue.venue_id);
                    else addToCompare(venue);
                  }}
                  data-testid="sidebar-compare-btn"
                >
                  <Scale className="w-4 h-4" />
                  {isCompared ? 'Added to Compare' : 'Add to Compare'}
                </button>
              </div>

              {/* Trust Note */}
              <p className="text-[11px] text-white/30 text-center mt-5 leading-relaxed">
                Our experts negotiate pricing and manage all documentation on your behalf.
              </p>
            </div>

            {/* EMI Calculator Card */}
            <div className="mt-6">
              <EMICalculatorSection venue={venue} onEnquire={() => setEnquiryOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        venueName={venue.name}
      />

      {/* Photo Gallery Modal */}
      <GalleryModal 
        open={galleryOpen} 
        onOpenChange={setGalleryOpen} 
        images={images} 
        venueName={venue.name} 
        onEnquire={() => setEnquiryOpen(true)}
        initialTab={galleryInitialTab}
      />

      {/* Enquiry Form Modal */}
      <EnquiryForm venue={venue} isOpen={enquiryOpen} onClose={() => setEnquiryOpen(false)} />

      <Footer />
    </div>
  );
};

export default VenueDetailPage;
