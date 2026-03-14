import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const images = (venue.images?.length > 0 ? venue.images : [FALLBACK_IMG]).slice(0, 5);
  const hasMultiple = images.length > 1;

  const [currentImg, setCurrentImg] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, moved: false });
  const imageContainerRef = useRef(null);

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
      if (diff > 25) setCurrentImg((prev) => Math.min(prev + 1, images.length - 1));
      else if (diff < -25) setCurrentImg((prev) => Math.max(prev - 1, 0));
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
    const text = `Check out ${venue.name} on VenuLoQ! ${venue.area}, ${venue.city}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleLinkClick = (e) => {
    if (touchRef.current.moved || swiping) e.preventDefault();
  };

  const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  const isTopPick = index !== undefined && index < 2;

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
      to={venueLink}
      onClick={handleLinkClick}
      className="flex bg-white rounded-xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden active:shadow-none transition-all"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Swipable Image */}
      <div
        ref={imageContainerRef}
        className="relative w-[118px] h-[118px] m-[6px] flex-shrink-0 overflow-hidden rounded-lg touch-pan-y"
        data-testid={`venue-card-images-${venue.venue_id}`}
      >
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

        {/* Top Pick — refined gold accent */}
        {isTopPick && (
          <div className="absolute top-1.5 left-1.5 bg-[#D4B36A] px-2 py-[3px] rounded-[3px] shadow-sm">
            <span className="text-[7px] font-bold text-[#0B0B0D] uppercase tracking-[0.12em]" style={sans}>Top Pick</span>
          </div>
        )}

        {/* Heart — Airbnb-style overlay on image */}
        <button
          onClick={handleFav}
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full shadow-sm z-10"
          data-testid={`venue-card-fav-${venue.venue_id}`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#0B0B0D]/30'}`} strokeWidth={isFav ? 2 : 1.5} />
        </button>

        {/* Rating — smaller pill */}
        {venue.rating > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-[3px] bg-white/90 px-1.5 py-[2px] rounded-sm">
            <Star className="w-2.5 h-2.5 fill-[#0B0B0D] text-[#0B0B0D]" />
            <span className="text-[10px] font-bold text-[#0B0B0D]" style={sans}>{venue.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-[3px]" data-testid={`venue-card-dots-${venue.venue_id}`}>
            {images.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === currentImg ? 'w-1.5 h-1.5 bg-white' : 'w-1 h-1 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Swipe hint */}
        {hintVisible && !hintDismissed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fadeIn pointer-events-none" data-testid="swipe-hint">
            <div className="flex items-center gap-1 text-white swipe-hint-anim">
              <ChevronLeft className="w-3.5 h-3.5 opacity-40" strokeWidth={2} />
              <span className="text-[10px] font-semibold tracking-wide uppercase" style={sans}>Swipe</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-2.5 pr-3 pl-1">
        {/* Venue name */}
        <h3 className="text-[14px] text-[#0B0B0D] leading-tight line-clamp-1 tracking-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
          {venue.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-[#64748B] flex-shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] text-[#64748B] line-clamp-1" style={sans}>
            {venue.area}, {venue.city}
          </span>
        </div>

        {/* Price — prominent, right below location */}
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[15px] font-medium text-[#0B0B0D] tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
          </span>
          <span className="text-[10px] text-[#9CA3AF]" style={sans}>/plate</span>
        </div>

        {/* Tags + share */}
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-2">
            {venueTypeLabel && (
              <span className="text-[8px] font-semibold text-[#64748B] tracking-wide uppercase bg-[#F4F1EC] px-1.5 py-[2px] rounded" style={sans}>{venueTypeLabel}</span>
            )}
            <span className="flex items-center gap-0.5 text-[#64748B] text-[10px]" style={sans}>
              <Users className="w-3 h-3" strokeWidth={1.5} />
              {venue.capacity_min}-{venue.capacity_max}
            </span>
          </div>
          <button
            onClick={handleShare}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F4F1EC] transition-colors"
            data-testid={`venue-card-share-${venue.venue_id}`}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-[#64748B]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueCard;
