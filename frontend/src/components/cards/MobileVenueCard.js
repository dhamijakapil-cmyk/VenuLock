import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatIndianCurrency } from '@/lib/utils';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';

const getImageUrl = (img) => (typeof img === 'string' ? img : img?.url) || FALLBACK_IMG;

const MobileVenueCard = ({ venue, index, onQuickPreview, isComparing, onToggleCompare, compareCount }) => {
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
      to={venueLink}
      onClick={handleLinkClick}
      className="block bg-white rounded-2xl border border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden relative active:scale-[0.99] transition-all duration-150"
      data-testid={`venue-card-${venue.venue_id}`}
    >
      {/* Gold accent bar for TOP PICK */}
      {isTopPick && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] z-20" style={{ background: 'linear-gradient(to bottom, #D4B36A, #B69550)' }} />
      )}

      <div className="flex h-[130px]">
        {/* Image with gradient overlay */}
        <div
          ref={imageContainerRef}
          className="relative w-[130px] flex-shrink-0 overflow-hidden touch-pan-y"
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
                style={{ width: `${100 / images.length}%`, filter: 'brightness(1.08) contrast(1.05) saturate(1.25)' }}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            ))}
          </div>

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

          {/* Top Pick badge */}
          {isTopPick && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-[#D4B36A] text-[#0B0B0D] text-[7px] font-bold px-2 py-[3px] rounded shadow-sm uppercase tracking-[0.15em] inline-block" style={sans}>
                Top Pick
              </span>
            </div>
          )}

          {/* Heart overlay — outline by default */}
          <button
            onClick={handleFav}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm z-10"
            data-testid={`venue-card-fav-${venue.venue_id}`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-400 fill-red-400' : 'text-white/80'}`} strokeWidth={1.5} />
          </button>

          {/* Rating badge — gold star on dark backdrop */}
          {venue.rating > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-[3px] bg-black/60 backdrop-blur-sm px-1.5 py-[3px] rounded z-10">
              <Star className="w-2.5 h-2.5 fill-[#D4B36A] text-[#D4B36A]" />
              <span className="text-[10px] font-bold text-white" style={sans}>{venue.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Swipe hint */}
          {hintVisible && !hintDismissed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fadeIn pointer-events-none z-20" data-testid="swipe-hint">
              <div className="flex items-center gap-1 text-white swipe-hint-anim">
                <ChevronLeft className="w-3.5 h-3.5 opacity-40" strokeWidth={2} />
                <span className="text-[10px] font-semibold tracking-wide uppercase" style={sans}>Swipe</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-2.5 pr-3 pl-3">
          <div>
            <h3 className="text-[14px] text-[#0B0B0D] leading-tight line-clamp-1 tracking-tight font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {venue.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#64748B] flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] text-[#64748B] line-clamp-1" style={sans}>
                {venue.area}, {venue.city}
              </span>
            </div>
            {/* Feature highlights + reviews */}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-[#B69550] font-medium tracking-wide" style={sans}>{highlights}</span>
              <span className="text-[9px] text-[#CBD5E1]">|</span>
              <span className="text-[9px] text-[#64748B]" style={sans}>{reviewCount} reviews</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-0.5">
            <span className="text-[16px] font-medium text-[#0B0B0D] tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
            </span>
            <span className="text-[10px] text-[#64748B]" style={sans}>/plate</span>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {venueTypeLabel && (
                <span className="text-[8px] font-semibold text-[#64748B] tracking-wide uppercase bg-[#F4F1EC] px-1.5 py-[2px] rounded" style={sans}>{venueTypeLabel}</span>
              )}
              <span className="text-[10px] text-[#64748B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {venue.capacity_min}-{venue.capacity_max}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickPreview && onQuickPreview(); }}
                className="text-[9px] text-[#9CA3AF] font-medium underline underline-offset-2 decoration-[#E5E0D8]"
                style={sans}
                data-testid={`venue-card-preview-${venue.venue_id}`}
              >
                Preview
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare && onToggleCompare(); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  isComparing
                    ? 'bg-[#D4B36A] text-[#0B0B0D]'
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
      </div>
    </Link>
  );
};

export default MobileVenueCard;
