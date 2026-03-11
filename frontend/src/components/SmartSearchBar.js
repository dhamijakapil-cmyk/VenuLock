import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Building2, X } from 'lucide-react';
import { api } from '@/context/AuthContext';

const SmartSearchBar = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/venues/autocomplete?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data || []);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (item) => {
    if (item.type === 'venue') {
      const link = item.city_slug && item.slug
        ? `/venues/${item.city_slug}/${item.slug}`
        : `/venues/${item.venue_id}`;
      navigate(link);
    } else if (item.type === 'city') {
      navigate(`/venues/search?city=${encodeURIComponent(item.name)}`);
    }
    setQuery('');
    setSuggestions([]);
    setFocused(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/venues/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setFocused(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center bg-white/10 backdrop-blur-sm border transition-all ${
          focused ? 'border-[#D4AF37] bg-white/15' : 'border-white/20'
        }`}>
          <Search className="w-5 h-5 text-white/40 ml-4 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search by city, venue name, or area..."
            className="w-full bg-transparent text-white text-sm py-4 px-3 placeholder-white/40 focus:outline-none"
            data-testid="smart-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); }}
              className="mr-3 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
          <button
            type="submit"
            className="mr-2 px-5 py-2 bg-[#D4AF37] hover:bg-[#C4A030] text-[#111111] text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
            data-testid="smart-search-submit"
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 shadow-2xl z-50 max-h-[300px] overflow-y-auto" data-testid="search-suggestions">
          {suggestions.map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              onMouseDown={() => handleSelect(item)}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                {item.type === 'city' ? (
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                ) : (
                  <Building2 className="w-4 h-4 text-white/60" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                <p className="text-white/40 text-xs truncate">
                  {item.type === 'city' ? 'City' : `${item.area}, ${item.city}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {loading && focused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <div className="w-4 h-4 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
            Searching...
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearchBar;
