import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '@/lib/useSEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import EnquiryForm from '@/components/EnquiryForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatIndianCurrency, AMENITIES } from '@/lib/utils';
import {
  Star, MapPin, Users, ChevronLeft, ChevronRight, Car, Wifi,
  Snowflake, Wine, Bed, ChefHat, Truck, Flower2, Speaker, Music,
  Zap, Key, Check, X, Phone, Heart, Share2, Calendar,
  MessageCircle, HelpCircle, ArrowRight, Scale,
} from 'lucide-react';
import { useCompare } from '@/context/CompareContext';
import PhotoLightbox from '@/components/venue/PhotoLightbox';
import StickyMobileCTA from '@/components/venue/StickyMobileCTA';
import EMICalculator from '@/components/venue/EMICalculator';
import mockVenuesData from '@/data/mockVenues';
import { toast } from 'sonner';

const iconMap = { Car, Key, Wine, Bed, Snowflake, ChefHat, Truck, Flower2, Speaker, Music, Wifi, Zap };

const FAQS = [
  { q: 'How does VenuLoQ managed booking work?', a: 'A dedicated Relationship Manager handles your entire booking — from venue shortlisting to final confirmation. You never deal with venue staff directly for pricing or availability.' },
  { q: 'Is there any charge for using VenuLoQ?', a: 'VenuLoQ is completely free for customers. We earn a small commission from venues, which means you get the best negotiated rates without any extra cost.' },
  { q: 'Can I visit the venue before booking?', a: 'Absolutely. Your RM will schedule a site visit at your convenience and accompany you to answer any questions on the spot.' },
  { q: 'What if I need to cancel or change my booking?', a: 'Your RM will guide you through the venue\'s cancellation policy and handle all communication. We mediate to ensure fair terms for both parties.' },
];

const VenuePublicPage = () => {
  const { citySlug, venueSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  const handleStartPlanning = () => {
    if (!isAuthenticated) {
      toast('Please sign in to start planning your event', { icon: '🔑' });
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setEnquiryOpen(true);
  };
  const [activeImg, setActiveImg] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryRef = useRef(null);
  const heroImgRef = useRef(null);

  const isFav = venue ? isFavorite(venue.venue_id) : false;
  const isCompared = venue ? isInCompare(venue.venue_id) : false;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: venue?.name, text: `Check out ${venue?.name} on VenuLoQ`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleFavorite(venue.venue_id);
    toast.success(isFav ? 'Removed from saved' : 'Saved to favorites');
  };

  const handleCompare = () => {
    if (isCompared) {
      removeFromCompare(venue.venue_id);
      toast.success('Removed from comparison');
    } else {
      addToCompare(venue);
      toast.success('Added to comparison');
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/venues/city/${citySlug}/${venueSlug}`);
        setVenue(res.data);
      } catch {
        // Fallback: try to find in mock data
        const mockVenue = mockVenuesData.find(v => v.slug === venueSlug);
        setVenue(mockVenue || null);
      }
      finally { setLoading(false); }
    };
    fetch();
  }, [citySlug, venueSlug]);

  // Track recently viewed venues
  useEffect(() => {
    if (!venue) return;
    try {
      const RECENT_KEY = 'vl_recently_viewed';
      const MAX_RECENT = 10;
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const filtered = stored.filter(v => v.venue_id !== venue.venue_id);
      const rawImg = venue.images?.[0];
      const imageUrl = typeof rawImg === 'string' ? rawImg : rawImg?.url || '';
      filtered.unshift({
        venue_id: venue.venue_id,
        name: venue.name,
        city: venue.city,
        area: venue.area,
        image: imageUrl,
        rating: venue.rating,
        venue_type: venue.venue_type,
        price_per_plate: venue.pricing?.price_per_plate_veg,
        slug: venue.slug || venueSlug,
        city_slug: venue.city_slug || citySlug,
      });
      localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
    } catch {}
  }, [venue, citySlug, venueSlug]);

  // SEO - must be called before any early returns (React hooks rule)
  const venueName = venue?.name || '';
  const venueArea = venue?.area || '';
  const venueCity = venue?.city || '';
  const seoTitle = venueName ? `${venueName} - ${venueArea}, ${venueCity} | VenuLoQ` : 'Loading Venue | VenuLoQ';
  const seoDesc = venue?.description || (venueName ? `Book ${venueName} in ${venueArea}, ${venueCity}. Managed booking with dedicated venue expert.` : '');
  const seoImage = venue?.images?.[0] || '';

  useSEO({
    title: seoTitle,
    description: seoDesc,
    ogImage: seoImage,
    ogType: 'place',
    canonical: `${window.location.origin}/venues/${citySlug}/${venueSlug}`,
    jsonLd: venue ? {
      "@context": "https://schema.org",
      "@type": "EventVenue",
      "name": venueName,
      "description": seoDesc,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": venue.address,
        "addressLocality": venueCity,
        "postalCode": venue.pincode,
        "addressCountry": "IN",
      },
      "geo": { "@type": "GeoCoordinates", "latitude": venue.latitude, "longitude": venue.longitude },
      "maximumAttendeeCapacity": venue.capacity_max,
      "image": seoImage,
      ...(venue.rating > 0 && {
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": venue.rating, "reviewCount": venue.review_count }
      }),
    } : null,
  });

  // Touch swipe for hero gallery (native listeners with { passive: false })
  useEffect(() => {
    const el = heroImgRef.current;
    if (!el) return;

    let startX = 0, startY = 0, moved = false;
    const onStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; moved = false; };
    const onMove = (e) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 8 && dx > dy) { moved = true; e.preventDefault(); }
    };
    const onEnd = (e) => {
      if (!moved) return;
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > 25) setActiveImg(i => i + 1);
      else if (diff < -25) setActiveImg(i => i - 1);
      moved = false;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  });

  // Clamp activeImg to valid range when images change
  useEffect(() => {
    if (!venue?.images) return;
    const maxIdx = (venue.images.length || 1) - 1;
    setActiveImg(i => Math.max(0, Math.min(i, maxIdx)));
  }, [venue?.images]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!venue) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]">
          <div className="text-center">
            <p className="text-xl font-bold text-[#111111]">Venue not found</p>
            <Link to={`/venues/${citySlug}`} className="text-[#D4B36A] mt-2 inline-block">View all venues in {citySlug}</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const images = venue.images?.length
    ? venue.images.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean)
    : ['https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'];
  const pricing = venue.pricing || {};
  const amenities = venue.amenities || {};
  const reviews = venue.reviews || [];
  const related = venue.related_venues || [];

  const scrollGallery = (dir) => {
    if (dir === 'next') setActiveImg(i => Math.min(i + 1, images.length - 1));
    else setActiveImg(i => Math.max(i - 1, 0));
  };

  return (
    <>

      <Header />
      <main className="min-h-screen bg-[#F4F1EC] pb-24 lg:pb-0">
        {/* Breadcrumb */}
        <div className="bg-[#F4F1EC]">
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <nav className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]" data-testid="venue-breadcrumb" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <Link to="/" className="hover:text-[#0B0B0D] transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to={`/venues/${citySlug}`} className="hover:text-[#0B0B0D] transition-colors capitalize">{citySlug?.replace(/-/g, ' ')}</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#6E6E6E] truncate max-w-[200px]">{venue.name}</span>
            </nav>
          </div>
        </div>

        {/* Hero Image Gallery — clean, minimal */}
        <div className="relative bg-[#0B0B0D]" data-testid="venue-gallery">
          <div className="max-w-7xl mx-auto">
            <div ref={heroImgRef} className="relative aspect-[4/3] md:aspect-[21/8] overflow-hidden touch-pan-y">
              <img
                src={images[activeImg]}
                alt={`${venue.name} - Image ${activeImg + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => { setLightboxIndex(activeImg); setLightboxOpen(true); }}
                data-testid="public-hero-image-clickable"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-[#0B0B0D]/20 pointer-events-none" />

              {/* Top row: Back + Save only — clean like Airbnb */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <button
                  onClick={() => window.history.back()}
                  className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                  data-testid="venue-back-btn"
                >
                  <ChevronLeft className="w-5 h-5 text-[#0B0B0D]" />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={handleShare} className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" data-testid="share-btn">
                    <Share2 className="w-4 h-4 text-[#0B0B0D]" />
                  </button>
                  <button onClick={handleFavorite} className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${isFav ? 'bg-white' : 'bg-white/90 backdrop-blur-sm'}`} data-testid="save-btn">
                    <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#0B0B0D]'}`} />
                  </button>
                </div>
              </div>

              {/* Nav arrows — subtle */}
              {images.length > 1 && (
                <>
                  <button onClick={() => scrollGallery('prev')} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" data-testid="gallery-prev">
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => scrollGallery('next')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" data-testid="gallery-next">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </>
              )}

              {/* Bottom overlay: venue info */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <h1 className="text-2xl md:text-4xl text-white leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
                  {venue.name}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-white/60 text-[12px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <MapPin className="w-3 h-3" /> {venue.area}, {venue.city}
                  </span>
                  {venue.rating > 0 && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="flex items-center gap-1 text-white/60 text-[12px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <Star className="w-3 h-3 fill-[#D4B36A] text-[#D4B36A]" /> {venue.rating.toFixed(1)}
                      </span>
                    </>
                  )}
                  <span className="text-white/20">·</span>
                  <span className="text-white/60 text-[12px] capitalize" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {venue.venue_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                {/* Dots */}
                {images.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-3">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setActiveImg(i)} className={`rounded-full transition-all ${i === activeImg ? 'w-5 h-1.5 bg-[#D4B36A]' : 'w-1.5 h-1.5 bg-white/40'}`} />
                    ))}
                    <button
                      onClick={() => { setLightboxIndex(activeImg); setLightboxOpen(true); }}
                      className="ml-auto text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider"
                      data-testid="public-view-all-photos"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {images.length} photos
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-5">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-0 bg-white border border-[#E5E0D8] rounded-xl overflow-hidden" data-testid="venue-stats">
                <div className="p-4 text-center border-r border-[#E5E0D8]">
                  <p className="text-lg font-bold text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatIndianCurrency(pricing.price_per_plate_veg)}</p>
                  <p className="text-[9px] text-[#9CA3AF] mt-0.5 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>Veg / plate</p>
                </div>
                <div className="p-4 text-center border-r border-[#E5E0D8]">
                  <p className="text-lg font-bold text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatIndianCurrency(pricing.price_per_plate_nonveg)}</p>
                  <p className="text-[9px] text-[#9CA3AF] mt-0.5 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>Non-veg / plate</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-lg font-bold text-[#D4B36A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{venue.capacity_max}</p>
                  <p className="text-[9px] text-[#9CA3AF] mt-0.5 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>Max guests</p>
                </div>
              </div>

              {/* Description */}
              {venue.description && (
                <div className="bg-white border border-[#E5E0D8] p-6 rounded-xl" data-testid="venue-description">
                  <h2 className="text-lg text-[#0B0B0D] mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>About {venue.name}</h2>
                  <p className="text-[#6E6E6E] text-[13px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue.description}</p>
                  {venue.event_types?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {venue.event_types.map(t => (
                        <Badge key={t} className="bg-[#F4F1EC] text-[#6E6E6E] border border-[#E5E0D8] capitalize text-[10px] font-medium tracking-wide">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pricing Packages */}
              {pricing.packages?.length > 0 && (
                <div className="bg-white border border-[#E5E0D8] p-6 rounded-xl" data-testid="venue-packages">
                  <h2 className="text-lg text-[#0B0B0D] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>Packages</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {pricing.packages.map((pkg, i) => (
                      <div key={i} className={`border rounded-xl p-5 text-center ${
                        i === 1 ? 'border-[#D4B36A] bg-[#FDFBF5]' : 'border-[#E5E0D8]'
                      }`}>
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{pkg.name}</p>
                        <p className="text-xl font-bold text-[#0B0B0D] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatIndianCurrency(pkg.price)}</p>
                        <p className="text-[12px] text-[#9CA3AF] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Up to {pkg.guests} guests</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div className="bg-white border border-[#E5E0D8] p-6 rounded-xl" data-testid="venue-amenities">
                <h2 className="text-lg text-[#0B0B0D] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(amenities).map(([key, val]) => {
                    if (key === 'rooms_available') {
                      return val > 0 ? (
                        <div key={key} className="flex items-center gap-2.5 p-3 bg-[#F4F1EC] rounded-lg">
                          <Check className="w-4 h-4 text-[#D4B36A] shrink-0" />
                          <span className="text-[12px] text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{val} Rooms</span>
                        </div>
                      ) : null;
                    }
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={key} className={`flex items-center gap-2.5 p-3 rounded-lg ${val ? 'bg-[#F4F1EC]' : 'bg-white'}`}>
                        {val ? <Check className="w-4 h-4 text-[#D4B36A] shrink-0" /> : <X className="w-4 h-4 text-[#E5E0D8] shrink-0" />}
                        <span className={`text-[12px] ${val ? 'text-[#0B0B0D]' : 'text-[#9CA3AF] line-through'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-white border border-[#E5E0D8] p-6 rounded-xl" data-testid="venue-reviews">
                <h2 className="text-lg text-[#0B0B0D] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
                  Reviews {venue.review_count > 0 && <span className="text-[#9CA3AF] font-normal text-sm">({venue.review_count})</span>}
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-[#9CA3AF] text-[13px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.review_id} className="border-b border-[#E5E0D8] pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-[#0B0B0D] text-[13px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.user_name}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-[#D4B36A] text-[#D4B36A]' : 'text-[#E5E0D8]'}`} />
                            ))}
                          </div>
                        </div>
                        {r.title && <p className="font-medium text-[13px] text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.title}</p>}
                        <p className="text-[12px] text-[#6E6E6E] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FAQ */}
              <div className="bg-white border border-[#E5E0D8] p-6 rounded-xl" data-testid="venue-faq">
                <h2 className="text-lg text-[#0B0B0D] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
                  Frequently Asked Questions
                </h2>
                <div className="space-y-2">
                  {FAQS.map((faq, i) => (
                    <div key={i} className="border border-[#E5E0D8] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F4F1EC] transition-colors"
                        data-testid={`faq-toggle-${i}`}
                      >
                        <span className="text-[13px] font-medium text-[#0B0B0D] pr-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>{faq.q}</span>
                        <ChevronRight className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                      </button>
                      {openFaq === i && (
                        <div className="px-4 pb-4">
                          <p className="text-[12px] text-[#6E6E6E] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: CTA Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-4">
                {/* Primary CTA */}
                <div className="bg-[#111111] p-7 rounded-xl" data-testid="venue-cta">
                  <div className="mb-6 pb-6 border-b border-white/[0.08]">
                    <p className="text-[11px] text-white/40 uppercase tracking-[0.1em] font-semibold mb-1">Starting from</p>
                    <p className="text-3xl font-bold text-white">
                      {formatIndianCurrency(pricing.price_per_plate_veg)}
                      <span className="text-base font-normal text-white/40">/plate</span>
                    </p>
                    {pricing.min_spend > 0 && (
                      <p className="text-[11px] text-white/30 mt-1">Min spend: {formatIndianCurrency(pricing.min_spend)}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <button
                      className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#111111] font-bold py-4 text-[12px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 transition-colors"
                      onClick={handleStartPlanning}
                      data-testid="speak-expert-btn"
                    >
                      <Phone className="w-4 h-4" /> Speak to Our Venue Expert
                    </button>
                    <div className="flex items-center gap-4 justify-center pt-2">
                      <button onClick={handleCompare} className={`flex items-center gap-1.5 text-[11px] transition-colors ${isCompared ? 'text-[#D4B36A]' : 'text-white/40 hover:text-white/70'}`} data-testid="desktop-compare-btn">
                        <Scale className="w-3.5 h-3.5" /> {isCompared ? 'Comparing' : 'Compare'}
                      </button>
                      <button onClick={handleShare} className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors" data-testid="desktop-share-btn">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                      <button onClick={handleFavorite} className={`flex items-center gap-1.5 text-[11px] transition-colors ${isFav ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`} data-testid="desktop-save-btn">
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} /> {isFav ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/25 text-center mt-5 leading-relaxed">
                    Our experts negotiate pricing and manage all documentation on your behalf.
                  </p>
                </div>

                {/* Availability */}
                <div className="bg-[#111111] p-5 rounded-xl" data-testid="venue-availability">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#D4B36A]" />
                    <div>
                      <p className="text-[13px] font-semibold text-white">Check Availability</p>
                      <p className="text-[11px] text-white/40">Ask our expert for real-time dates</p>
                    </div>
                  </div>
                </div>

                {/* EMI Finance Calculator */}
                <EMICalculator venuePrice={pricing.min_spend || (pricing.price_per_plate_veg * 100) || 500000} />

                {/* Policies */}
                {venue.policies && (
                  <div className="bg-[#111111] p-5 rounded-xl">
                    <h3 className="text-[12px] font-semibold text-white mb-2">Venue Policies</h3>
                    <p className="text-[11px] text-white/40 leading-relaxed">{venue.policies}</p>
                  </div>
                )}

                {/* Address */}
                <div className="bg-[#111111] p-5 rounded-xl" data-testid="venue-address">
                  <h3 className="text-[12px] font-semibold text-white mb-2 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D4B36A]" /> Location
                  </h3>
                  <p className="text-[12px] text-white/50">{venue.address}</p>
                  <p className="text-[11px] text-white/30 mt-1">{venue.area}, {venue.city} – {venue.pincode}</p>
                </div>

                {/* Google Maps Embed */}
                <div className="overflow-hidden rounded-xl" data-testid="venue-map">
                  <iframe
                    title={`${venue.name} location`}
                    width="100%"
                    height="220"
                    loading="lazy"
                    style={{ border: 0, display: 'block' }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.city}`)}&output=embed&z=15`}
                    allowFullScreen
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.city}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#111111] text-[11px] text-[#D4B36A] hover:text-white transition-colors border-t border-white/[0.06]"
                    data-testid="open-in-maps-btn"
                  >
                    <MapPin className="w-3 h-3" /> Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Related Venues */}
          {related.length > 0 && (
            <div className="mt-12" data-testid="related-venues">
              <h2 className="font-serif text-2xl font-bold text-[#111111] mb-6">
                More Venues in {venue.city}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {related.map(rv => (
                  <VenueCard key={rv.venue_id} venue={{...rv, _citySlug: citySlug}} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <PhotoLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        venueName={venue.name}
      />
      <EnquiryForm venue={venue} isOpen={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
      <StickyMobileCTA venue={venue} onEnquire={handleStartPlanning} />
    </>
  );
};

export default VenuePublicPage;
