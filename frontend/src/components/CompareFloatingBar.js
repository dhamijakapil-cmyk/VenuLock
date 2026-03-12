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
      className="fixed left-0 right-0 z-[60] bg-[#111111]/95 backdrop-blur-md border-t border-[#D4B36A]/50 shadow-2xl animate-slideUp"
      style={{ bottom: '48px' }}
      data-testid="compare-floating-bar"
    >
      <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2 md:gap-4">
        {/* Left: count + thumbnails */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => navigate('/venues/compare')}
            disabled={compareVenues.length < 2}
            className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all flex-shrink-0 ${
              compareVenues.length >= 2
                ? 'bg-[#D4B36A] text-[#111111] hover:bg-[#C4A030]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
            data-testid="compare-now-btn"
          >
            <Scale className="w-3.5 h-3.5" />
            Compare {compareVenues.length}/3
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {/* Venue thumbnails - hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {compareVenues.map((venue) => (
              <div key={venue.venue_id} className="relative flex-shrink-0">
                <img
                  src={venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=100'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border-2 border-[#D4B36A]/40"
                />
                <button
                  onClick={() => removeFromCompare(venue.venue_id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                  data-testid={`compare-remove-${venue.venue_id}`}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: clear */}
        <button
          onClick={clearCompare}
          className="text-white/40 hover:text-white/70 text-xs font-medium transition-colors px-1 flex-shrink-0"
          data-testid="compare-clear-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default CompareFloatingBar;
