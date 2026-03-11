import React from 'react';
import { Star, ThumbsUp, CheckCircle2 } from 'lucide-react';

const REVIEWS = [
  { name: 'Priya & Arjun', event: 'Wedding', rating: 5, text: 'Absolutely magical venue! The team at VenuLock helped us find the perfect place for our wedding. The decorations were stunning and the food was incredible.', date: '2 months ago', verified: true, helpful: 24 },
  { name: 'Rahul M.', event: 'Corporate Event', rating: 4.5, text: 'Excellent venue for our annual company gala. Professional staff, great ambiance, and the pricing was very competitive. Would definitely book again.', date: '1 month ago', verified: true, helpful: 18 },
  { name: 'Sneha K.', event: 'Engagement', rating: 5, text: 'We had our engagement ceremony here and it was perfect! The venue coordinator was so helpful in planning every detail. The photos came out beautifully.', date: '3 weeks ago', verified: true, helpful: 12 },
  { name: 'Vikram & Meera', event: 'Reception', rating: 4, text: 'Great venue with beautiful interiors. The catering options were diverse and tasty. Only minor issue was parking but the valet service made up for it.', date: '1 month ago', verified: false, helpful: 9 },
];

const ReviewStars = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'fill-[#D4AF37] text-[#D4AF37]' : i < rating ? 'fill-[#D4AF37]/50 text-[#D4AF37]' : 'text-slate-200'}`}
      />
    ))}
  </div>
);

const CustomerReviews = ({ venueName, rating, reviewCount }) => {
  return (
    <div className="py-8" data-testid="customer-reviews-section">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#111111]">Guest Reviews</h3>
          <div className="flex items-center gap-2 mt-1">
            <ReviewStars rating={rating || 4.5} />
            <span className="text-sm font-bold text-[#111111]">{rating?.toFixed(1) || '4.5'}</span>
            <span className="text-sm text-[#64748B]">({reviewCount || REVIEWS.length} reviews)</span>
          </div>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Ambiance', score: 4.8 },
            { label: 'Food & Catering', score: 4.6 },
            { label: 'Staff', score: 4.7 },
            { label: 'Value for Money', score: 4.3 },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-lg font-bold text-[#111111]">{item.score}</p>
              <p className="text-xs text-[#64748B]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-5">
        {REVIEWS.map((review, i) => (
          <div key={i} className="pb-5 border-b border-slate-100 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#111111] to-[#1a3a5c] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{review.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#111111]">{review.name}</span>
                    {review.verified && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">{review.event} · {review.date}</p>
                </div>
              </div>
              <ReviewStars rating={review.rating} />
            </div>
            <p className="text-sm text-[#64748B] leading-relaxed ml-[52px]">{review.text}</p>
            <div className="ml-[52px] mt-2">
              <button className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#111111] transition-colors">
                <ThumbsUp className="w-3 h-3" /> Helpful ({review.helpful})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerReviews;
