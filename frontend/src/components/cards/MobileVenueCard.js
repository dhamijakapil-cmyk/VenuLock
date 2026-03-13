import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, Crown, Share2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatIndianCurrency } from '@/lib/utils';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';

const getImageUrl = (img) => (typeof img === 'string' ? img : img?.url) || FALLBACK_IMG;

const MobileVenueCard = ({ venue, index, onQuickPreview }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const toSlug = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
  const citySlug = venue.city_slug || toSlug(venue.city) || 'india';
  const venueSlug = venue.slug || toSlug(venue.name) || venue.venue_id;
  const venueLink = `/venues/${citySlug}/${venueSlug}`;

  // Images — cap at 5 for performance
  const images = (venue.images?.length > 0 ? venue.images : [FALLBACK_IMG]).slice(0, 5);
  const hasMultiple = images.length > 1;

  // Swipe state
  const [currentImg, setCurrentImg] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, moved: false });
  const imageContainerRef = useRef(null);

  // Attach non-passive touch listeners for swipe (React handlers are passive by default)
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
        e.preventDefault(); // works because { passive: false }
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e) => {
      if (!moved) {
        setSwiping(false);
        return;
      }
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (diff > 25) {
        setCurrentImg((prev) => Math.min(prev + 1, images.length - 1));
      } else if (diff < -25) {
        setCurrentImg((prev) => Math.max(prev - 1, 0));
      }
      setSwiping(false);
      moved = false;
      // Keep touchRef.moved true briefly so the Link click handler can block navigation
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
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleFavorite(venue.venue_id);
  };

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${venueLink}`;
    const text = `Check out ${venue.name} on VenuLoQ! ${venue.area}, ${venue.city}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleQuickPreview = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickPreview?.();
  };

  // Block link navigation if user just swiped
  const handleLinkClick = (e) => {
    if (touchRef.current.moved || swiping) {
      e.preventDefault();
    }
  };

  const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  const isTopPick = index !== undefined && index < 2;

  // Swipe hint — show only on first card, first session visit, if multiple images
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

  return (
    <Link
      to={venueLink}
      onClick={handleLinkClick}
      className="flex gap-3.5 bg-white border-b border-[#E5E0D8]/60 py-4 active:bg-[#F4F1EC]/50 transition-colors"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Swipable Image */}
      <div
        ref={imageContainerRef}
        className="relative w-[130px] h-[130px] flex-shrink-0 overflow-hidden rounded-lg touch-pan-y"
        data-testid={`venue-card-images-${venue.venue_id}`}
      >
        {/* Image strip */}
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ width: `${images.length * 100}%`, transform: `translateX(-${currentImg * (100 / images.length)}%)` }}
        >
          {images.map((img, i) => (
            <img
              key={i}
              src={getImageUrl(img)}
              alt={`${venue.name} ${i + 1}`}
              className="h-full object-cover flex-shrink-0"
              style={{ width: `${100 / images.length}%` }}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          ))}
        </div>

        {/* Top Pick badge */}
        {isTopPick && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-[#0B0B0D]/80 backdrop-blur-sm px-1.5 py-0.5">
            <Crown className="w-2.5 h-2.5 text-[#D4B36A]" strokeWidth={1.5} />
            <span className="text-[7px] font-bold text-[#D4B36A] uppercase tracking-[0.1em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Top</span>
          </div>
        )}

        {/* Rating */}
        {venue.rating > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-white/95 px-1.5 py-0.5 rounded-sm">
            <Star className="w-2.5 h-2.5 fill-[#0B0B0D] text-[#0B0B0D]" />
            <span className="text-[10px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1" data-testid={`venue-card-dots-${venue.venue_id}`}>
            {images.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === currentImg
                    ? 'w-1.5 h-1.5 bg-white'
                    : 'w-1 h-1 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Swipe hint overlay */}
        {hintVisible && !hintDismissed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fadeIn pointer-events-none" data-testid="swipe-hint">
            <div className="flex items-center gap-1 text-white swipe-hint-anim">
              <ChevronLeft className="w-3.5 h-3.5 opacity-40" strokeWidth={2} />
              <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>Swipe</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="text-[15px] text-[#0B0B0D] leading-snug line-clamp-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            {venue.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-[#9CA3AF] flex-shrink-0" strokeWidth={1.5} />
            <span className="text-[11px] text-[#6E6E6E] line-clamp-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {venue.area}, {venue.city}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {venueTypeLabel && (
              <span className="text-[9px] font-medium text-[#6E6E6E] tracking-wide uppercase bg-[#F4F1EC] px-1.5 py-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venueTypeLabel}</span>
            )}
            <span className="flex items-center gap-0.5 text-[#9CA3AF] text-[10px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <Users className="w-3 h-3" strokeWidth={1.5} />
              {venue.capacity_min}-{venue.capacity_max}
            </span>
          </div>
        </div>

        {/* Bottom row — price + actions */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <span className="text-[15px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
            <span className="text-[9px] text-[#9CA3AF] ml-0.5">/plate</span>
          </div>
          <div className="flex items-center gap-1">
            {onQuickPreview && (
              <button
                onClick={handleQuickPreview}
                className="w-8 h-8 flex items-center justify-center"
                data-testid={`venue-card-preview-${venue.venue_id}`}
              >
                <Eye className="w-3.5 h-3.5 text-[#D5D0C8]" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center"
              data-testid={`venue-card-share-${venue.venue_id}`}
            >
              <Share2 className="w-3.5 h-3.5 text-[#D5D0C8]" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleFav}
              className="w-8 h-8 flex items-center justify-center"
              data-testid={`venue-card-fav-${venue.venue_id}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#D5D0C8]'}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
