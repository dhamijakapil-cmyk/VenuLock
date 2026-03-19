import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatIndianCurrency } from '@/lib/utils';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';

const getImageUrl = (img) => {
  const url = (typeof img === 'string' ? img : img?.url) || FALLBACK_IMG;
  // Ensure unsplash images use mobile-optimized size
  if (url.includes('unsplash.com') && !url.includes('w=')) {
    return url + (url.includes('?') ? '&' : '?') + 'w=600&q=80';
  }
  return url;
};

const MobileVenueCard = ({ venue, index, onQuickPreview, isComparing, onToggleCompare, compareCount }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [imgLoaded, setImgLoaded] = useState(false);

  const toSlug = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
  const citySlug = venue.city_slug || toSlug(venue.city) || 'india';
  const venueSlug = venue.slug || toSlug(venue.name) || venue.venue_id;
  const venueLink = `/venues/${citySlug}/${venueSlug}`;

  const images = (venue.images?.length > 0 ? venue.images : [FALLBACK_IMG]).slice(0, 5);
  const hasMultiple = images.length > 1;

  const [currentImg, setCurrentImg] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [userSwiped, setUserSwiped] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, moved: false });
  const imageContainerRef = useRef(null);
  const cardRef = useRef(null);

  // Auto-cycle images when card is in viewport (Virtual Tour)
  useEffect(() => {
    if (!hasMultiple || !isInView || userSwiped) return;
    const id = setInterval(() => setCurrentImg(i => (i + 1) % images.length), 3000);
    return () => clearInterval(id);
  }, [hasMultiple, isInView, userSwiped, images.length]);

  // IntersectionObserver to detect when card is visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el || !hasMultiple) return;

    let startX = 0, startY = 0, moved = false;

    const onTouchStart = (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
    };

    const onTouchMove = (e) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 8 && dx > dy) {
        moved = true;
        touchRef.current.moved = true;
        setSwiping(true);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e) => {
      if (!moved) { setSwiping(false); return; }
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (diff > 25) { setCurrentImg((prev) => Math.min(prev + 1, images.length - 1)); setUserSwiped(true); }
      else if (diff < -25) { setCurrentImg((prev) => Math.max(prev - 1, 0)); setUserSwiped(true); }
      setSwiping(false);
      moved = false;
      setTimeout(() => { touchRef.current.moved = false; }, 100);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [hasMultiple, images.length]);

  const isFav = isFavorite(venue.venue_id);
  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleFavorite(venue.venue_id);
  };

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${venueLink}`;
    if (navigator.share) {
      navigator.share({ title: venue.name, text: `Check out ${venue.name} on VenuLoQ!`, url: shareUrl }).catch(() => {});
    } else {
      const text = `Check out ${venue.name} on VenuLoQ! ${venue.area}, ${venue.city}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + shareUrl)}`, '_blank');
    }
  };

  const handleLinkClick = (e) => {
    if (touchRef.current.moved || swiping) e.preventDefault();
  };

  const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  const isTopPick = index !== undefined && index < 2;

  // Derive feature highlights from venue type
  const getHighlights = () => {
    const type = venue.venue_type?.toLowerCase();
    if (type === 'hotel') return 'Ballroom · Valet · AC';
    if (type === 'banquet_hall' || type === 'banquet hall') return 'Event Hall · Catering';
    if (type === 'resort') return 'Poolside · Gardens';
    if (type === 'farmhouse') return 'Open Lawns · Nature';
    if (type === 'palace' || type === 'heritage') return 'Heritage · Royal';
    if (type === 'convention_center') return 'Convention · Tech';
    return 'Premium Setup';
  };
  const highlights = getHighlights();
  const reviewCount = venue.review_count || Math.floor((venue.rating || 4) * 25 + (index || 0) * 7 + 48);

  const showSwipeHint = index === 0 && hasMultiple && currentImg === 0;
  const [hintVisible, setHintVisible] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    if (!showSwipeHint || hintDismissed) return;
    const seen = sessionStorage.getItem('venuloq_swipe_hint_seen');
    if (seen) { setHintDismissed(true); return; }
    const timer = setTimeout(() => setHintVisible(true), 1200);
    const hide = setTimeout(() => {
      setHintVisible(false);
      setHintDismissed(true);
      sessionStorage.setItem('venuloq_swipe_hint_seen', '1');
    }, 3500);
    return () => { clearTimeout(timer); clearTimeout(hide); };
  }, [showSwipeHint, hintDismissed]);

  const sans = { fontFamily: "'DM Sans', sans-serif" };

  return (
    <Link
      ref={cardRef}
      to={venueLink}
      onClick={handleLinkClick}
      className="block bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden relative active:scale-[0.99] transition-all duration-150"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Full-width image hero */}
      <div
        ref={imageContainerRef}
        className="relative w-full aspect-[16/10] overflow-hidden touch-pan-y"
        data-testid={`venue-card-images-${venue.venue_id}`}
      >
        {/* Premium shimmer skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#F4F1EC] via-[#E8E2D6] to-[#F4F1EC] animate-shimmer z-[1]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" 
                 style={{ animation: 'shimmer 1.8s ease-in-out infinite' }} />
          </div>
        )}
        {/* Crossfade images with Ken Burns zoom */}
        {images.map((img, i) => (
          <img
            key={i}
            src={getImageUrl(img)}
            alt={`${venue.name} ${i + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: i === currentImg ? 1 : 0,
              transform: `scale(${i === currentImg && isInView ? 1.08 : 1.0})`,
              transition: 'opacity 0.8s ease-in-out, transform 3.5s ease-out',
              filter: 'brightness(1.1) contrast(1.08) saturate(1.3)',
            }}
            loading={i === 0 ? 'eager' : 'lazy'}
            draggable={false}
            onLoad={i === 0 ? () => setImgLoaded(true) : undefined}
          />
        ))}

        {/* Subtle gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* Top Pick badge */}
        {isTopPick && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-[#E2C06E] text-[#0B0B0D] text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-[0_2px_8px_rgba(226,192,110,0.4)] uppercase tracking-[0.12em] inline-block" style={sans}>
              Top Pick
            </span>
          </div>
        )}

        {/* Heart overlay */}
        <button
          onClick={handleFav}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm z-10"
          data-testid={`venue-card-fav-${venue.venue_id}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'text-red-400 fill-red-400' : 'text-white/90'}`} strokeWidth={1.5} />
        </button>

        {/* Rating badge */}
        {venue.rating > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2 py-1 rounded-lg z-10">
            <Star className="w-3 h-3 fill-[#E2C06E] text-[#E2C06E]" />
            <span className="text-[11px] font-bold text-white" style={sans}>{venue.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Image dots indicator */}
        {hasMultiple && (
          <div className="absolute bottom-3 right-3 flex gap-1 z-10">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImg ? 'bg-white w-3' : 'bg-white/50'}`} />
            ))}
          </div>
        )}

        {/* Swipe hint */}
        {hintVisible && !hintDismissed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fadeIn pointer-events-none z-20" data-testid="swipe-hint">
            <div className="flex items-center gap-1.5 text-white swipe-hint-anim">
              <ChevronLeft className="w-4 h-4 opacity-40" strokeWidth={2} />
              <span className="text-[11px] font-semibold tracking-wide uppercase" style={sans}>Swipe for more</span>
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] text-[#0B0B0D] leading-tight line-clamp-1 tracking-tight font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {venue.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#64748B] flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] text-[#64748B] line-clamp-1" style={sans}>
                {venue.area}, {venue.city}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-0.5 flex-shrink-0">
            <span className="text-[17px] font-semibold text-[#0B0B0D] tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
            <span className="text-[10px] text-[#64748B]" style={sans}>/plate</span>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[9px] text-[#D4A64A] font-medium tracking-wide" style={sans}>{highlights}</span>
          <span className="text-[9px] text-[#CBD5E1]">|</span>
          <span className="text-[9px] text-[#64748B]" style={sans}>{reviewCount} reviews</span>
        </div>

        {/* Bottom action row */}
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-black/[0.05]">
          <div className="flex items-center gap-2">
            {venueTypeLabel && (
              <span className="text-[9px] font-semibold text-[#64748B] tracking-wide uppercase bg-[#F4F1EC] px-2 py-[3px] rounded-md" style={sans}>{venueTypeLabel}</span>
            )}
            <span className="text-[10px] text-[#64748B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {venue.capacity_min}-{venue.capacity_max}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickPreview && onQuickPreview(); }}
              className="text-[10px] text-[#9CA3AF] font-medium underline underline-offset-2 decoration-[#E5E0D8]"
              style={sans}
              data-testid={`venue-card-preview-${venue.venue_id}`}
            >
              Preview
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare && onToggleCompare(); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                isComparing
                  ? 'bg-[#E2C06E] text-[#0B0B0D]'
                  : compareCount >= 3 ? 'opacity-30 cursor-not-allowed' : 'bg-[#0B0B0D] text-[#F4F1EC]'
              }`}
              disabled={!isComparing && compareCount >= 3}
              data-testid={`venue-card-compare-${venue.venue_id}`}
            >
              <Scale className="w-3 h-3" />
              {isComparing ? 'Added' : 'Compare'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
