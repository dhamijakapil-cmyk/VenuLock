import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ChevronLeft, Star, MapPin, Calendar, Send, X, PenLine, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

const StarRating = ({ rating, onRate, size = 'md', interactive = false }) => {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(i)}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
          data-testid={`star-${i}`}
        >
          <Star
            className={`${sizeClass} ${
              i <= (hovered || rating)
                ? 'text-[#D4B36A] fill-[#D4B36A]'
                : 'text-[#E5E0D8]'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
};

const ReviewCard = ({ review }) => (
  <div className="bg-white rounded-2xl border border-[#E5E0D8]/60 shadow-sm overflow-hidden" data-testid={`review-${review.review_id}`}>
    <div className="flex gap-3 p-4">
      {review.venue_image && (
        <img src={review.venue_image} alt={review.venue_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {review.venue_name}
        </h3>
        {review.venue_city && (
          <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <MapPin className="w-3 h-3" />{review.venue_city}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <StarRating rating={review.rating} size="sm" />
          <span className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {formatDate(review.created_at)}
          </span>
        </div>
      </div>
    </div>
    {review.title && (
      <div className="px-4 pb-1">
        <p className="text-[13px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{review.title}</p>
      </div>
    )}
    <div className="px-4 pb-4">
      <p className="text-[13px] text-[#555] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {review.content}
      </p>
    </div>
  </div>
);

const WriteReviewModal = ({ bookings, onClose, onSubmit }) => {
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Flatten all venues from bookings
  const venues = [];
  bookings.forEach(b => {
    (b.venues || []).forEach(v => {
      if (!venues.find(x => x.venue_id === v.venue_id)) {
        venues.push(v);
      }
    });
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVenue) { toast.error('Please select a venue'); return; }
    if (rating === 0) { toast.error('Please select a rating'); return; }
    if (!content.trim()) { toast.error('Please write your review'); return; }
    setSubmitting(true);
    try {
      await api.post(`/venues/${selectedVenue.venue_id}/reviews`, {
        venue_id: selectedVenue.venue_id,
        rating,
        title: title.trim() || null,
        content: content.trim(),
      });
      toast.success('Review submitted!');
      onSubmit();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        data-testid="write-review-modal"
      >
        <div className="sticky top-0 bg-white border-b border-[#E5E0D8]/40 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-[16px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Write a Review</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F4F1EC] flex items-center justify-center" data-testid="close-review-modal">
            <X className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Venue Selection */}
          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Select Venue
            </label>
            {venues.length === 0 ? (
              <p className="text-[13px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No venues found in your bookings. Submit an enquiry first.
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {venues.map(v => (
                  <button
                    key={v.venue_id}
                    type="button"
                    onClick={() => setSelectedVenue(v)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      selectedVenue?.venue_id === v.venue_id
                        ? 'border-[#D4B36A] bg-[#D4B36A]/10'
                        : 'border-[#E5E0D8] bg-white hover:border-[#D4B36A]/40'
                    }`}
                    data-testid={`venue-select-${v.venue_id}`}
                  >
                    {v.images?.[0] && <img src={v.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                    <span className="text-[12px] font-medium text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{v.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Your Rating
            </label>
            <StarRating rating={rating} onRate={setRating} size="lg" interactive />
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Sum up your experience"
              className="w-full border border-[#E5E0D8] bg-white rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px' }}
              data-testid="review-title-input"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Your Review
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your experience with this venue..."
              rows={4}
              className="w-full border border-[#E5E0D8] bg-white rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none resize-none"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px' }}
              data-testid="review-content-input"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedVenue || rating === 0 || !content.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-40 transition-all tracking-[0.1em] uppercase rounded-xl"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            data-testid="submit-review-btn"
          >
            {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Review</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const MyReviewsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    try {
      const [revRes, bookRes] = await Promise.all([
        api.get('/auth/my-reviews'),
        api.get('/auth/my-bookings'),
      ]);
      setReviews(revRes.data.reviews || []);
      setBookings(bookRes.data.bookings || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col app-main-content">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-50 bg-[#0B0B0D]">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/home')} className="w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC]" data-testid="reviews-back-btn">
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <h1 className="text-lg text-[#F4F1EC]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>My Reviews</h1>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-9 h-9 rounded-full bg-[#D4B36A] flex items-center justify-center"
              data-testid="write-review-btn-mobile"
            >
              <PenLine className="w-4 h-4 text-[#0B0B0D]" strokeWidth={2} />
            </button>
          </div>
        </header>
      </div>
      <div className="hidden lg:block"><Header /></div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-10 lg:pt-8">
        <div className="hidden lg:flex items-center justify-between mb-6">
          <button onClick={() => navigate('/home')} className="text-sm text-[#64748B] hover:text-[#0B0B0D] flex items-center gap-1" data-testid="reviews-back-desktop">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-[#D4B36A] hover:bg-[#c5a45b] text-[#0B0B0D] font-semibold"
            data-testid="write-review-btn-desktop"
          >
            <PenLine className="w-4 h-4 mr-2" /> Write a Review
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-white rounded-xl border border-[#E5E0D8]/60 p-4 text-center" data-testid="reviews-total-stat">
            <p className="text-2xl font-bold text-[#0B0B0D]">{reviews.length}</p>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Reviews</p>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-[#E5E0D8]/60 p-4 text-center" data-testid="reviews-avg-stat">
            <p className="text-2xl font-bold text-[#D4B36A]">
              {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '—'}
            </p>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Avg Rating</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-[#E5E0D8]/40" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8]/40" data-testid="reviews-empty">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F1EC] flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-[#CBD5E1]" />
            </div>
            <h3 className="text-base font-semibold text-[#0B0B0D] mb-1.5" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>No reviews yet</h3>
            <p className="text-sm text-[#64748B] mb-5 max-w-xs mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Share your experience and help others find the perfect venue
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-[#D4B36A] hover:bg-[#c5a45b] text-[#0B0B0D] font-semibold"
              data-testid="write-first-review-btn"
            >
              <PenLine className="w-4 h-4 mr-2" /> Write Your First Review
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="reviews-list">
            {reviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
          </div>
        )}
      </main>

      <div className="hidden lg:block"><Footer /></div>
      {showModal && <WriteReviewModal bookings={bookings} onClose={() => setShowModal(false)} onSubmit={fetchData} />}
    </div>
  );
};

export default MyReviewsPage;
