import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSEO } from '@/lib/useSEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import EnquiryForm from '@/components/EnquiryForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency, AMENITIES } from '@/lib/utils';
import {
  Star, MapPin, Users, ChevronLeft, ChevronRight, Car, Wifi,
  Snowflake, Wine, Bed, ChefHat, Truck, Flower2, Speaker, Music,
  Zap, Key, Check, X, Phone, Heart, Share2, Calendar,
  MessageCircle, HelpCircle, ArrowRight,
} from 'lucide-react';
import PhotoLightbox from '@/components/venue/PhotoLightbox';
import StickyMobileCTA from '@/components/venue/StickyMobileCTA';

const iconMap = { Car, Key, Wine, Bed, Snowflake, ChefHat, Truck, Flower2, Speaker, Music, Wifi, Zap };

const FAQS = [
  { q: 'How does VenuLock managed booking work?', a: 'A dedicated Relationship Manager handles your entire booking — from venue shortlisting to final confirmation. You never deal with venue staff directly for pricing or availability.' },
  { q: 'Is there any charge for using VenuLock?', a: 'VenuLock is completely free for customers. We earn a small commission from venues, which means you get the best negotiated rates without any extra cost.' },
  { q: 'Can I visit the venue before booking?', a: 'Absolutely. Your RM will schedule a site visit at your convenience and accompany you to answer any questions on the spot.' },
  { q: 'What if I need to cancel or change my booking?', a: 'Your RM will guide you through the venue\'s cancellation policy and handle all communication. We mediate to ensure fair terms for both parties.' },
];

const VenuePublicPage = () => {
  const { citySlug, venueSlug } = useParams();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/venues/city/${citySlug}/${venueSlug}`);
        setVenue(res.data);
      } catch { setVenue(null); }
      finally { setLoading(false); }
    };
    fetch();
  }, [citySlug, venueSlug]);

  // SEO - must be called before any early returns (React hooks rule)
  const venueName = venue?.name || '';
  const venueArea = venue?.area || '';
  const venueCity = venue?.city || '';
  const seoTitle = venueName ? `${venueName} - ${venueArea}, ${venueCity} | VenuLock` : 'Loading Venue | VenuLock';
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
            <Link to={`/venues/${citySlug}`} className="text-[#D4AF37] mt-2 inline-block">View all venues in {citySlug}</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const images = venue.images?.length ? venue.images : ['https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'];
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
      <main className="min-h-screen bg-[#F9F9F7] pb-24 lg:pb-0">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-sm text-[#64748B]" data-testid="venue-breadcrumb">
              <Link to="/" className="hover:text-[#111111]">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to={`/venues/${citySlug}`} className="hover:text-[#111111] capitalize">{citySlug?.replace(/-/g, ' ')}</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#111111] font-medium truncate max-w-[200px]">{venue.name}</span>
            </nav>
          </div>
        </div>

        {/* Hero Image Gallery */}
        <div className="relative bg-black" data-testid="venue-gallery">
          <div className="max-w-7xl mx-auto">
            <div className="relative aspect-[21/9] md:aspect-[21/8] overflow-hidden">
              <img
                src={images[activeImg]}
                alt={`${venue.name} - Image ${activeImg + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => { setLightboxIndex(activeImg); setLightboxOpen(true); }}
                data-testid="public-hero-image-clickable"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => scrollGallery('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
                    data-testid="gallery-prev"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => scrollGallery('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
                    data-testid="gallery-next"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}

              {/* Image counter + lightbox trigger */}
              <button
                onClick={() => { setLightboxIndex(activeImg); setLightboxOpen(true); }}
                className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full hover:bg-black/70 transition-colors cursor-pointer"
                data-testid="public-view-all-photos"
              >
                {activeImg + 1} / {images.length} — View All
              </button>

              {/* Venue name overlay */}
              <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8">
                {venue.rating > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
                    <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-sm font-bold text-[#111111]">{venue.rating.toFixed(1)}</span>
                    <span className="text-xs text-[#64748B]">({venue.review_count} reviews)</span>
                  </div>
                )}
                <h1 className="font-serif text-2xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {venue.name}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-white/80 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{venue.area}, {venue.city}</span>
                </div>
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-1 p-2 bg-black overflow-x-auto" ref={galleryRef}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                      i === activeImg ? 'border-[#D4AF37]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="venue-stats">
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                  <Users className="w-5 h-5 mx-auto text-[#D4AF37] mb-1.5" />
                  <p className="text-lg font-bold text-[#111111] font-mono">{venue.capacity_min} – {venue.capacity_max}</p>
                  <p className="text-xs text-[#64748B]">Guests</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                  <span className="text-lg">&#8377;</span>
                  <p className="text-lg font-bold text-[#111111] font-mono">{formatIndianCurrency(pricing.price_per_plate_veg)}</p>
                  <p className="text-xs text-[#64748B]">Veg / plate</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                  <span className="text-lg">&#8377;</span>
                  <p className="text-lg font-bold text-[#111111] font-mono">{formatIndianCurrency(pricing.price_per_plate_nonveg)}</p>
                  <p className="text-xs text-[#64748B]">Non-veg / plate</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                  <Badge variant="outline" className="capitalize text-xs">{venue.venue_type?.replace(/_/g, ' ')}</Badge>
                  <p className="text-xs text-[#64748B] mt-1.5 capitalize">{venue.indoor_outdoor}</p>
                </div>
              </div>

              {/* Description */}
              {venue.description && (
                <div className="bg-white border border-slate-200 p-6 rounded-xl" data-testid="venue-description">
                  <h2 className="font-serif text-xl font-bold text-[#111111] mb-3">About {venue.name}</h2>
                  <p className="text-[#64748B] leading-relaxed">{venue.description}</p>
                  {venue.event_types?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {venue.event_types.map(t => (
                        <Badge key={t} className="bg-[#F0E6D2] text-[#111111] border-0 capitalize text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pricing Packages */}
              {pricing.packages?.length > 0 && (
                <div className="bg-white border border-slate-200 p-6 rounded-xl" data-testid="venue-packages">
                  <h2 className="font-serif text-xl font-bold text-[#111111] mb-4">Packages</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pricing.packages.map((pkg, i) => (
                      <div key={i} className={`border rounded-xl p-5 text-center ${
                        i === 1 ? 'border-[#D4AF37] bg-[#FDFBF5]' : 'border-slate-200'
                      }`}>
                        <p className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">{pkg.name}</p>
                        <p className="text-2xl font-bold text-[#111111] font-mono mt-2">{formatIndianCurrency(pkg.price)}</p>
                        <p className="text-sm text-[#64748B] mt-1">Up to {pkg.guests} guests</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl" data-testid="venue-amenities">
                <h2 className="font-serif text-xl font-bold text-[#111111] mb-4">Amenities & Facilities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(amenities).map(([key, val]) => {
                    if (key === 'rooms_available') {
                      return val > 0 ? (
                        <div key={key} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm text-[#111111]">{val} Rooms Available</span>
                        </div>
                      ) : null;
                    }
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-xl ${val ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        {val ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-slate-400 shrink-0" />}
                        <span className={`text-sm ${val ? 'text-[#111111]' : 'text-[#64748B] line-through'}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl" data-testid="venue-reviews">
                <h2 className="font-serif text-xl font-bold text-[#111111] mb-4">
                  Reviews {venue.review_count > 0 && <span className="text-[#64748B] font-normal text-base">({venue.review_count})</span>}
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-[#64748B] text-sm">No reviews yet. Be the first to review this venue.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.review_id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-[#111111] text-sm">{r.user_name}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                        {r.title && <p className="font-medium text-sm text-[#111111]">{r.title}</p>}
                        <p className="text-sm text-[#64748B] mt-1">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FAQ */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl" data-testid="venue-faq">
                <h2 className="font-serif text-xl font-bold text-[#111111] mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#D4AF37]" /> Frequently Asked Questions
                </h2>
                <div className="space-y-2">
                  {FAQS.map((faq, i) => (
                    <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                        data-testid={`faq-toggle-${i}`}
                      >
                        <span className="text-sm font-medium text-[#111111] pr-4">{faq.q}</span>
                        <ChevronRight className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                      </button>
                      {openFaq === i && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p>
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
                      className="w-full bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] font-bold py-4 text-[12px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 transition-colors"
                      onClick={() => setEnquiryOpen(true)}
                      data-testid="speak-expert-btn"
                    >
                      <Phone className="w-4 h-4" /> Speak to Our Venue Expert
                    </button>
                    <div className="flex items-center gap-4 justify-center pt-2">
                      <button className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors" data-testid="share-btn">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                      <button className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-red-400 transition-colors" data-testid="save-btn">
                        <Heart className="w-3.5 h-3.5" /> Save
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
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <p className="text-[13px] font-semibold text-white">Check Availability</p>
                      <p className="text-[11px] text-white/40">Ask our expert for real-time dates</p>
                    </div>
                  </div>
                </div>

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
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> Location
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
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#111111] text-[11px] text-[#D4AF37] hover:text-white transition-colors border-t border-white/[0.06]"
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
      <StickyMobileCTA venue={venue} onEnquire={() => setEnquiryOpen(true)} />
    </>
  );
};

export default VenuePublicPage;
