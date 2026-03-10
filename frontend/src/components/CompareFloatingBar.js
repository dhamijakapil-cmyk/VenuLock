import React from 'react';
import { useCompare } from '@/context/CompareContext';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Scale } from 'lucide-react';

const CompareFloatingBar = () => {
  const { compareVenues, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();

  if (compareVenues.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111] border-t-2 border-[#D4AF37] shadow-2xl animate-slideUp pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
      data-testid="compare-floating-bar"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Venue previews */}
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Scale className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Compare</span>
          </div>
          {compareVenues.map((venue) => (
            <div
              key={venue.venue_id}
              className="flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-2 py-1 flex-shrink-0"
            >
              <img
                src={venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=100'}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-white text-xs font-medium max-w-[100px] truncate">{venue.name}</span>
              <button
                onClick={() => removeFromCompare(venue.venue_id)}
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                data-testid={`compare-remove-${venue.venue_id}`}
              >
                <X className="w-3 h-3 text-white/70" />
              </button>
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: 3 - compareVenues.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-9 h-9 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center flex-shrink-0"
            >
              <span className="text-white/20 text-xs">+</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={clearCompare}
            className="text-white/40 hover:text-white/70 text-xs font-medium transition-colors px-2"
            data-testid="compare-clear-all"
          >
            Clear
          </button>
          <button
            onClick={() => navigate('/venues/compare')}
            disabled={compareVenues.length < 2}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              compareVenues.length >= 2
                ? 'bg-[#D4AF37] text-[#111111] hover:bg-[#C4A030]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
            data-testid="compare-now-btn"
          >
            Compare {compareVenues.length}/3
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareFloatingBar;
