import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import VenueQuickPreview from '@/components/VenueQuickPreview';
import VenueMap from '@/components/VenueMap';
import FilterBottomSheet from '@/components/FilterBottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import RecentlyViewedVenues from '@/components/venue/RecentlyViewedVenues';
import { VenueCardSkeleton } from '@/components/venue/Skeletons';
import VLVerifiedBadge from '@/components/venue/VLVerifiedBadge';
import { useCompare } from '@/context/CompareContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { api } from '@/context/AuthContext';
import {
  EVENT_TYPES,
  VENUE_TYPES,
  VENUE_TYPE_OPTIONS,
  INDOOR_OUTDOOR,
  SORT_OPTIONS,
  formatIndianCurrency,
  cn,
} from '@/lib/utils';
import { buildFilterChips, cleanFilters, applyClientFilters, DEFAULT_FILTERS } from '@/utils/filterUtils';
import mockVenuesData from '@/data/mockVenues';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  List,
  Map,
  X,
  Locate,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Check,
  Wifi,
  WifiOff,
  Sparkles,
  Calendar,
  Users,
  Crown,
  Star,
  Heart,
  Scale,
} from 'lucide-react';

const FAVORITES_KEY = 'favoriteVenues';

// City center coordinates (fallback for geocoding)
const CITY_CENTERS = {
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Gurgaon': { lat: 28.4595, lng: 77.0266 },
  'Noida': { lat: 28.5355, lng: 77.3910 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
};

// Known landmarks for demo/testing
const KNOWN_LOCATIONS = {
  'jaipur fort': { lat: 26.9855, lng: 75.8513, label: 'Jaipur Fort (Amber Fort)' },
  'amber fort': { lat: 26.9855, lng: 75.8513, label: 'Amber Fort, Jaipur' },
  'india gate': { lat: 28.6129, lng: 77.2295, label: 'India Gate, Delhi' },
  'connaught place': { lat: 28.6315, lng: 77.2167, label: 'Connaught Place, Delhi' },
  'cyber hub': { lat: 28.4949, lng: 77.0887, label: 'Cyber Hub, Gurgaon' },
  'kingdom of dreams': { lat: 28.4678, lng: 77.0756, label: 'Kingdom of Dreams, Gurgaon' },
};

// Radius options in kilometers
const RADIUS_OPTIONS = [
  { value: '__all__', label: 'Any Distance' },
  { value: '1', label: '1 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
];

// Simple geocoding function (uses known locations + city centers)
const geocodeLocation = async (searchText) => {
  if (!searchText) return null;
  
  const searchLower = searchText.toLowerCase().trim();
  
  // Check known locations first
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (searchLower.includes(key)) {
      return coords;
    }
  }
  
  // Check city centers
  for (const [city, coords] of Object.entries(CITY_CENTERS)) {
    if (searchLower.includes(city.toLowerCase())) {
      return { ...coords, label: `${city} City Center` };
    }
  }
  
  // Try OpenStreetMap Nominatim API for other locations
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        label: data[0].display_name.split(',')[0],
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const FILTER_STORAGE_KEY = 'vl_search_filters';

const getInitialFilters = (searchParams) => {
  const hasUrlFilters = Array.from(searchParams.keys()).some(k => k !== 'sort_by');
  let saved = null;
  if (!hasUrlFilters) {
    try { saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY)); } catch {}
  }
  const src = hasUrlFilters ? null : saved;
  return {
    city: searchParams.get('city') || src?.city || '',
    area: searchParams.get('area') || src?.area || '',
    event_type: searchParams.get('event_type') || src?.event_type || '',
    venue_type: searchParams.get('venue_type') || src?.venue_type || '',
    venue_types: searchParams.get('venue_types')?.split(',').filter(Boolean) || src?.venue_types || [],
    indoor_outdoor: searchParams.get('indoor_outdoor') || src?.indoor_outdoor || '',
    guest_min: searchParams.get('guest_min') || src?.guest_min || '',
    guest_max: searchParams.get('guest_max') || src?.guest_max || '',
    price_min: searchParams.get('price_min') || src?.price_min || '',
    price_max: searchParams.get('price_max') || src?.price_max || '',
    rating_min: searchParams.get('rating_min') || src?.rating_min || '',
    sort_by: searchParams.get('sort_by') || src?.sort_by || 'popular',
    radius: searchParams.get('radius') || src?.radius || '',
    parking: searchParams.get('parking') === 'true' || (src?.parking ?? false),
    valet: searchParams.get('valet') === 'true' || (src?.valet ?? false),
    alcohol: searchParams.get('alcohol') === 'true' || (src?.alcohol ?? false),
    ac: searchParams.get('ac') === 'true' || (src?.ac ?? false),
    catering_inhouse: searchParams.get('catering_inhouse') === 'true' || (src?.catering_inhouse ?? false),
    catering_outside: searchParams.get('catering_outside') === 'true' || (src?.catering_outside ?? false),
    decor: searchParams.get('decor') === 'true' || (src?.decor ?? false),
    sound: searchParams.get('sound') === 'true' || (src?.sound ?? false),
  };
};

const VenueSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const { isAuthenticated, user } = useAuth();

  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileMapListOpen, setMobileMapListOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [missingLocationCount, setMissingLocationCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Map-specific state
  const [locationSearch, setLocationSearch] = useState(searchParams.get('location') || '');
  const [anchor, setAnchor] = useState(null);
  const [geocodingStatus, setGeocodingStatus] = useState('');

  // Filter state — URL params take priority, then localStorage, then defaults
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));

  // Persist filters to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);
  
  // Venue type multi-select popover state
  const [venueTypePopoverOpen, setVenueTypePopoverOpen] = useState(false);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get('/venues/cities');
        setCities(response.data);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Geocode when location search or city changes
  useEffect(() => {
    const updateAnchor = async () => {
      // Priority: locationSearch > city filter > default
      if (locationSearch) {
        setGeocodingStatus('loading');
        const result = await geocodeLocation(locationSearch);
        if (result) {
          setAnchor(result);
          setGeocodingStatus('success');
        } else {
          setAnchor(null);
          setGeocodingStatus('error');
        }
      } else if (filters.city && CITY_CENTERS[filters.city]) {
        setAnchor({
          ...CITY_CENTERS[filters.city],
          label: `${filters.city} City Center`
        });
        setGeocodingStatus('fallback');
      } else {
        // Default to Delhi NCR
        setAnchor({
          lat: 28.6139,
          lng: 77.2090,
          label: 'Delhi NCR'
        });
        setGeocodingStatus('fallback');
      }
    };
    
    updateAnchor();
  }, [locationSearch, filters.city]);

  // Fetch venues (with backend health detection + mock fallback)
  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        // Health check on first load
        let isOnline = backendOnline;
        try {
          await api.get('/health');
          isOnline = true;
          setBackendOnline(true);
        } catch {
          isOnline = false;
          setBackendOnline(false);
        }

        if (!isOnline) {
          // Offline: client-side filter mock data
          const filtered = applyClientFilters(mockVenuesData, filters);
          setVenues(filtered);
          setTotalResults(filtered.length);
          return;
        }

        // Online: build clean params and call API
        const params = cleanFilters(filters);

        // Add lat/lng from URL params or anchor
        const urlLat = searchParams.get('lat');
        const urlLng = searchParams.get('lng');
        if (urlLat && urlLng) {
          params.set('lat', urlLat);
          params.set('lng', urlLng);
        } else if (anchor?.lat && anchor?.lng && filters.radius) {
          params.set('lat', anchor.lat.toString());
          params.set('lng', anchor.lng.toString());
        }

        const response = await api.get(`/venues?${params.toString()}`);
        setVenues(response.data);
        setTotalResults(response.data.length);
      } catch (error) {
        console.error('Error fetching venues:', error);
        // Fallback to mock on error
        const filtered = applyClientFilters(mockVenuesData, filters);
        setVenues(filtered);
        setTotalResults(filtered.length);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, anchor, searchParams]);

  // Filter venues by radius (client-side for MVP)
  const filteredVenues = useMemo(() => {
    if (!filters.radius || !anchor?.lat || !anchor?.lng) {
      return venues;
    }
    
    const radiusKm = parseFloat(filters.radius);
    return venues.filter(venue => {
      if (!venue.latitude || !venue.longitude) return false;
      const distance = calculateDistance(
        anchor.lat, anchor.lng,
        parseFloat(venue.latitude), parseFloat(venue.longitude)
      );
      return distance <= radiusKm;
    });
  }, [venues, filters.radius, anchor]);

  const handleFilterChange = (key, value) => {
    const actualValue = value === '__all__' ? '' : value;
    setFilters((prev) => ({ ...prev, [key]: actualValue }));
    
    const newParams = new URLSearchParams(searchParams);
    if (actualValue && actualValue !== '' && actualValue !== false) {
      newParams.set(key, actualValue.toString());
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Handle venue type multi-select toggle
  const handleVenueTypeToggle = (venueType) => {
    setFilters((prev) => {
      const currentTypes = prev.venue_types || [];
      const newTypes = currentTypes.includes(venueType)
        ? currentTypes.filter(t => t !== venueType)
        : [...currentTypes, venueType];
      
      // Update URL params
      const newParams = new URLSearchParams(searchParams);
      if (newTypes.length > 0) {
        newParams.set('venue_types', newTypes.join(','));
      } else {
        newParams.delete('venue_types');
      }
      setSearchParams(newParams);
      
      return { ...prev, venue_types: newTypes };
    });
  };

  // Clear all venue types
  const clearVenueTypes = () => {
    setFilters((prev) => ({ ...prev, venue_types: [] }));
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('venue_types');
    setSearchParams(newParams);
  };

  // Remove single venue type chip
  const removeVenueType = (venueType) => {
    handleVenueTypeToggle(venueType);
  };

  const handleLocationSearch = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (locationSearch) {
      newParams.set('location', locationSearch);
    } else {
      newParams.delete('location');
    }
    setSearchParams(newParams);
  };

  // Apply filters from bottom sheet (batch apply)
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    // Sync URL params
    const params = cleanFilters(newFilters);
    // Preserve lat/lng/location from URL
    ['lat', 'lng', 'location', 'radius'].forEach(k => {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  // Remove a single filter chip
  const handleRemoveFilterChip = (key, value) => {
    if (key === 'venue_types_remove') {
      handleVenueTypeToggle(value);
      return;
    }
    handleFilterChange(key, value);
  };

  const clearFilters = () => {
    const defaultFilters = {
      city: '',
      area: '',
      event_type: '',
      venue_type: '',
      venue_types: [],
      indoor_outdoor: '',
      guest_min: '',
      guest_max: '',
      price_min: '',
      price_max: '',
      rating_min: '',
      sort_by: 'popular',
      radius: '',
      parking: false,
      valet: false,
      alcohol: false,
      ac: false,
      catering_inhouse: false,
      catering_outside: false,
      decor: false,
      sound: false,
    };
    setFilters(defaultFilters);
    setLocationSearch('');
    setSearchParams({});
    try { localStorage.removeItem(FILTER_STORAGE_KEY); } catch {}
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === 'sort_by') return false;
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== '' && value !== false;
    }
  ).length + (locationSearch ? 1 : 0);

  const selectedCity = cities.find((c) => c.city === filters.city);

  const handleMissingLocationCount = useCallback((count) => {
    setMissingLocationCount(count);
  }, []);

  // Mobile Venue Card - Corporate Premium (light theme)
  const MobileVenueCard = ({ venue, index }) => {
    const mainImage = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
    const venueLink = (venue.city_slug && venue.slug)
      ? `/venues/${venue.city_slug}/${venue.slug}`
      : (venue._citySlug && venue.slug)
      ? `/venues/${venue._citySlug}/${venue.slug}`
      : `/venues/${venue.venue_id}`;

    const { isAuthenticated } = useAuth();
    const { isFavorite, toggleFavorite } = useFavorites();
    const { isInCompare, addToCompare, removeFromCompare } = useCompare();
    const isFav = isFavorite(venue.venue_id);
    const isCompared = isInCompare(venue.venue_id);
    const handleFav = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      toggleFavorite(venue.venue_id);
    };
    const handleCompare = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isCompared) removeFromCompare(venue.venue_id);
      else addToCompare(venue);
    };

    const venueTypeLabel = venue.venue_type ? venue.venue_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
    const isTopPick = index !== undefined && index < 2;

    return (
      <Link
        to={venueLink}
        className={`flex bg-white rounded-xl overflow-hidden border transition-all active:scale-[0.98] ${isTopPick ? 'border-[#D4B36A]/25 shadow-[0_2px_12px_rgba(212,179,106,0.08)]' : 'border-slate-200/80 shadow-sm'}`}
        data-testid={`venue-card-${venue.venue_id}`}
      >
        {/* Image - left side */}
        <div className="relative w-[130px] flex-shrink-0">
          <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
          {isTopPick && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#0B0B0D]/75 backdrop-blur-sm px-2 py-0.5 rounded">
              <Crown className="w-2.5 h-2.5 text-[#D4B36A]" />
              <span className="text-[8px] font-semibold text-[#D4B36A] uppercase tracking-wider">Top Pick</span>
            </div>
          )}
          {venue.rating > 0 && (
            <div className={`absolute ${isTopPick ? 'bottom-2' : 'top-2'} left-2 flex items-center gap-0.5 bg-[#111]/75 backdrop-blur-sm px-1.5 py-0.5 rounded`}>
              <Star className="w-2.5 h-2.5 fill-[#D4B36A] text-[#D4B36A]" />
              <span className="text-[10px] font-bold text-white">{venue.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Info - right side */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-bold text-[#111] line-clamp-1 leading-snug">{venue.name}</h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleCompare}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isCompared ? 'bg-[#D4B36A]/15 border border-[#D4B36A]/40' : 'border border-slate-200'
                  }`}
                  data-testid={`mobile-card-compare-${venue.venue_id}`}
                >
                  <Scale className={`w-3 h-3 ${isCompared ? 'text-[#D4B36A]' : 'text-[#94A3B8]'}`} />
                </button>
                <button
                  onClick={handleFav}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isFav ? 'bg-red-50 border border-red-200' : 'border border-slate-200'
                  }`}
                  data-testid={`venue-card-fav-${venue.venue_id}`}
                >
                  <Heart className={`w-3 h-3 ${isFav ? 'text-red-500 fill-red-500' : 'text-[#94A3B8]'}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#64748B] mt-1">
              <MapPin className="w-3 h-3 text-[#D4B36A] flex-shrink-0" />
              <span className="text-[11px] line-clamp-1">{venue.area}, {venue.city}</span>
            </div>
            {venueTypeLabel && (
              <span className="inline-block mt-1.5 text-[9px] font-semibold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded">{venueTypeLabel}</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80">
            <div className="flex items-center gap-1 text-[#94A3B8]">
              <Users className="w-3 h-3" />
              <span className="text-[10px] font-medium">{venue.capacity_min}–{venue.capacity_max}</span>
            </div>
            <p className="text-[13px] font-bold text-[#D4B36A]">
              {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
              <span className="text-[9px] font-normal text-[#94A3B8] ml-0.5">/plate</span>
            </p>
          </div>
        </div>
      </Link>
    );
  };

  // Premium Filter sidebar component with elevated design
  const FilterSidebar = ({ showLocationSearch = true }) => (
    <div className="space-y-5">
      {/* Location Search (for map) */}
      {showLocationSearch && (
        <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
          <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-3 block">
            Search Location
          </Label>
          <form onSubmit={handleLocationSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Locate className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder="e.g., Jaipur Fort"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-9 pr-3 h-10 bg-white border-slate-200 focus:border-[#D4B36A] focus:ring-[#D4B36A]/20"
                data-testid="location-search"
              />
            </div>
            <Button type="submit" size="icon" variant="outline" className="h-10 w-10 border-slate-200">
              <Search className="w-4 h-4" />
            </Button>
          </form>
          {geocodingStatus === 'success' && anchor && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md">
              <MapPin className="w-3 h-3" />
              {anchor.label}
            </p>
          )}
          {geocodingStatus === 'error' && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-md">
              <AlertCircle className="w-3 h-3" />
              Location not found
            </p>
          )}
        </div>
      )}

      {/* Radius Filter */}
      {showLocationSearch && (
        <div>
          <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">
            Search Radius
          </Label>
          <Select 
            value={filters.radius || '__all__'} 
            onValueChange={(v) => handleFilterChange('radius', v)}
          >
            <SelectTrigger data-testid="filter-radius" className="h-10 bg-white border-slate-200">
              <SelectValue placeholder="Any Distance" />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* City */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">City</Label>
        <Select value={filters.city || '__all__'} onValueChange={(v) => handleFilterChange('city', v)}>
          <SelectTrigger data-testid="filter-city" className="h-10 bg-white border-slate-200">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.slug || city.city} value={city.city}>
                {city.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Area */}
      {selectedCity && selectedCity.areas?.length > 0 && (
        <div>
          <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">Area</Label>
          <Select value={filters.area || '__all__'} onValueChange={(v) => handleFilterChange('area', v)}>
            <SelectTrigger data-testid="filter-area" className="h-10 bg-white border-slate-200">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Areas</SelectItem>
              {selectedCity.areas.map((area) => (
                <SelectItem key={area.area_id} value={area.name}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Event Type */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">Event Type</Label>
        <Select value={filters.event_type || '__all__'} onValueChange={(v) => handleFilterChange('event_type', v)}>
          <SelectTrigger data-testid="filter-event-type" className="h-10 bg-white border-slate-200">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Events</SelectItem>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Venue Type */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">Venue Type</Label>
        <Select value={filters.venue_type || '__all__'} onValueChange={(v) => handleFilterChange('venue_type', v)}>
          <SelectTrigger data-testid="filter-venue-type" className="h-10 bg-white border-slate-200">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {VENUE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Indoor/Outdoor */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">Setting</Label>
        <Select value={filters.indoor_outdoor || '__all__'} onValueChange={(v) => handleFilterChange('indoor_outdoor', v)}>
          <SelectTrigger className="h-10 bg-white border-slate-200">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Any</SelectItem>
            {INDOOR_OUTDOOR.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guest Count */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">Guest Count</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.guest_min}
            onChange={(e) => handleFilterChange('guest_min', e.target.value)}
            data-testid="filter-guest-min"
            className="h-10 bg-white border-slate-200"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.guest_max}
            onChange={(e) => handleFilterChange('guest_max', e.target.value)}
            data-testid="filter-guest-max"
            className="h-10 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">
          Price per Plate
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min ₹"
            value={filters.price_min}
            onChange={(e) => handleFilterChange('price_min', e.target.value)}
            data-testid="filter-price-min"
            className="h-10 bg-white border-slate-200"
          />
          <Input
            type="number"
            placeholder="Max ₹"
            value={filters.price_max}
            onChange={(e) => handleFilterChange('price_max', e.target.value)}
            data-testid="filter-price-max"
            className="h-10 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5 block">Minimum Rating</Label>
        <Select value={filters.rating_min || '__all__'} onValueChange={(v) => handleFilterChange('rating_min', v)}>
          <SelectTrigger className="h-10 bg-white border-slate-200">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Any</SelectItem>
            <SelectItem value="3">3+ Stars</SelectItem>
            <SelectItem value="3.5">3.5+ Stars</SelectItem>
            <SelectItem value="4">4+ Stars</SelectItem>
            <SelectItem value="4.5">4.5+ Stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amenities - Elevated Card Style */}
      <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
        <Label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-3 block">Amenities</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'parking', label: 'Parking' },
            { key: 'valet', label: 'Valet' },
            { key: 'alcohol', label: 'Alcohol' },
            { key: 'ac', label: 'AC' },
            { key: 'catering_inhouse', label: 'Catering' },
            { key: 'decor', label: 'Decor' },
          ].map((amenity) => (
            <button
              key={amenity.key}
              onClick={() => handleFilterChange(amenity.key, !filters[amenity.key])}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all",
                filters[amenity.key]
                  ? "bg-[#111111] text-white border-[#111111]"
                  : "bg-white text-[#64748B] border-slate-200 hover:border-[#111111]"
              )}
            >
              {filters[amenity.key] && <Check className="w-3 h-3" />}
              {amenity.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full h-11 rounded-xl border-2 border-slate-200 text-sm font-semibold text-[#64748B] hover:border-red-300 hover:text-red-500 transition-all flex items-center justify-center gap-2"
          data-testid="clear-filters"
        >
          <X className="w-4 h-4" />
          Clear All ({activeFilterCount})
        </button>
      )}
    </div>
  );

  // Venue list component (for reuse in split view)
  const VenueList = ({ venues, compact = false }) => (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
      {venues.map((venue) => (
        <VenueCard key={venue.venue_id} venue={venue} compact={compact} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MOBILE: CORPORATE PREMIUM HYBRID - Light base with dark accents
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#FAFAF8]">
        {/* Mobile Header - Clean white */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#111111] to-[#1a3a5c] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#D4B36A]" />
              </div>
              <span className="text-[#111111] font-bold text-base">VenuLoQ</span>
            </button>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <button onClick={() => navigate(user?.role === 'customer' ? '/my-enquiries' : '/admin')} className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center" data-testid="mobile-user-avatar">
                  <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </button>
              ) : (
                <button onClick={() => navigate('/login')} className="text-sm font-medium text-[#64748B]" data-testid="mobile-signin-btn">
                  Sign In
                </button>
              )}
              <button
                className="relative w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center"
                onClick={() => setMobileFilterOpen(true)}
                data-testid="mobile-filter-btn"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#64748B]" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D4B36A] text-[8px] font-bold text-[#0B0B0D] rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Compact Header */}
        <div className="bg-[#111111] px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">
              {filters.city ? `Venues in ${filters.city}` : 'Explore Venues'}
            </h1>
            <p className="text-white/40 text-[11px] mt-0.5 tracking-wide">
              {filteredVenues.length} verified {filters.event_type ? filters.event_type.toLowerCase() : ''} spaces
            </p>
          </div>
        </div>

        {/* Light Content Area */}
        <div className="px-4 py-3 pb-16">
          {/* Quick-Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-hide -mx-4 px-4" data-testid="quick-filter-chips">
            {[
              { label: 'Wedding', param: 'event_type', value: 'Wedding' },
              { label: 'Corporate', param: 'event_type', value: 'Corporate Event' },
              { label: 'Reception', param: 'event_type', value: 'Reception' },
              { label: 'Birthday', param: 'event_type', value: 'Birthday' },
              { label: 'Under ₹2K', param: 'max_budget', value: '2000' },
              { label: '500+ Guests', param: 'min_capacity', value: '500' },
              { label: 'Luxury', param: 'venue_types_quick', value: 'five_star_hotel' },
            ].map((chip) => {
              const isActive = chip.param === 'event_type' ? filters.event_type === chip.value
                : chip.param === 'max_budget' ? filters.price_max === chip.value
                : chip.param === 'min_capacity' ? filters.capacity_min === chip.value
                : chip.param === 'venue_types_quick' ? filters.venue_types?.includes(chip.value)
                : false;
              return (
                <button
                  key={chip.label}
                  onClick={() => {
                    if (chip.param === 'event_type') handleFilterChange('event_type', isActive ? '' : chip.value);
                    else if (chip.param === 'max_budget') handleFilterChange('price_max', isActive ? '' : chip.value);
                    else if (chip.param === 'min_capacity') handleFilterChange('capacity_min', isActive ? '' : chip.value);
                    else if (chip.param === 'venue_types_quick') handleVenueTypeToggle(chip.value);
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]'
                      : 'bg-white text-[#555] border-slate-200 hover:border-slate-300'
                  }`}
                  data-testid={`quick-chip-${chip.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Filters Row */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
            {/* Venue Type Filter */}
            <Popover open={venueTypePopoverOpen} onOpenChange={setVenueTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all border",
                    filters.venue_types?.length > 0
                      ? "bg-[#D4B36A] text-[#0B0B0D] border-[#D4B36A]"
                      : "bg-white text-[#555] border-slate-200"
                  )}
                  data-testid="mobile-venue-type-filter"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {filters.venue_types?.length > 0 ? `${filters.venue_types.length} Types` : 'Venue Type'}
                  <ChevronDown className={cn("w-4 h-4 transition-transform", venueTypePopoverOpen && "rotate-180")} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 bg-white border border-slate-200 rounded-2xl shadow-xl" align="start" sideOffset={8}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#111111]">Select Venue Types</span>
                  {filters.venue_types?.length > 0 && (
                    <button onClick={clearVenueTypes} className="text-xs text-[#D4B36A] font-semibold">Clear</button>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto p-2">
                  {VENUE_TYPE_OPTIONS.map((option) => {
                    const isSelected = filters.venue_types?.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleVenueTypeToggle(option.value)}
                        className={cn(
                          "w-full px-3 py-3 flex items-center justify-between rounded-xl text-sm transition-colors",
                          isSelected ? "bg-[#D4B36A]/10 text-[#111111] font-medium" : "text-[#64748B] hover:bg-slate-50"
                        )}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#D4B36A]" />}
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <button
                    onClick={() => setVenueTypePopoverOpen(false)}
                    className="w-full py-3 bg-[#111111] text-white text-sm font-semibold rounded-xl"
                  >
                    Apply
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Filter */}
            <Select value={filters.sort_by} onValueChange={(v) => handleFilterChange('sort_by', v)}>
              <SelectTrigger className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-[#555] text-[12px] min-w-[120px]" data-testid="mobile-sort-select">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {SORT_OPTIONS.filter(opt => !opt.requiresRadius || filters.radius).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex rounded-lg overflow-hidden bg-white border border-slate-200">
              <button
                className={`px-2.5 py-2 transition-colors ${viewMode === 'list' ? 'bg-[#111111] text-white' : 'text-[#94A3B8]'}`}
                onClick={() => setViewMode('list')}
                data-testid="mobile-view-list"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                className={`px-2.5 py-2 transition-colors ${viewMode === 'map' ? 'bg-[#111111] text-white' : 'text-[#94A3B8]'}`}
                onClick={() => setViewMode('map')}
                data-testid="mobile-view-map"
              >
                <Map className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(() => {
            const chips = buildFilterChips(filters, EVENT_TYPES, VENUE_TYPE_OPTIONS, (key, value) => {
              if (key === 'venue_types_remove') handleVenueTypeToggle(value);
              else handleFilterChange(key, value);
            });
            if (chips.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white rounded-xl border border-slate-100" data-testid="mobile-filter-chips">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Active:</span>
                {chips.map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1.5 bg-[#111111] text-white px-3 py-1.5 rounded-full text-xs font-medium">
                    {chip.label}
                    <button onClick={chip.onRemove}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-xs text-red-500 font-semibold ml-1">Clear</button>
              </div>
            );
          })()}

          {/* Venue List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-2">No venues found</h3>
              <p className="text-[#64748B] text-sm mb-6">Try adjusting your filters</p>
              <button onClick={clearFilters} className="px-6 py-3 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-semibold text-sm" data-testid="mobile-empty-clear-btn">
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredVenues.map((venue, idx) => (
                <MobileVenueCard key={venue.venue_id} venue={venue} index={idx} />
              ))}
            </div>
          ) : (
            <div className="h-[60vh] bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <VenueMap
                venues={filteredVenues}
                anchor={anchor}
                radiusKm={filters.radius ? parseFloat(filters.radius) : null}
                onVenuesMissingLocation={handleMissingLocationCount}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Results Footer */}
          {!loading && filteredVenues.length > 0 && (
            <p className="text-center text-sm text-[#64748B] mt-6">
              Showing <span className="font-semibold text-[#111111]">{filteredVenues.length}</span> venues
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          DESKTOP: ORIGINAL LIGHT THEME
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">

      {/* Premium Branded Discovery Header */}
      <div className="bg-gradient-to-r from-[#111111] via-[#153055] to-[#111111] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#D4B36A] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#D4B36A] rounded-full blur-3xl" />
        </div>
        <div className="container-main py-8 md:py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-[#D4B36A]" />
                <span className="text-[#D4B36A] text-xs font-semibold uppercase tracking-wider">Curated Collection</span>
              </div>
              <h1 className="font-serif text-2xl md:text-4xl font-bold text-white mb-2">
                {filters.city ? `Venues in ${filters.city}` : 'Discover Perfect Venues'}
              </h1>
              <p className="text-white/70 text-sm md:text-base max-w-xl">
                {filters.event_type 
                  ? `${filteredVenues.length} handpicked venues for your ${EVENT_TYPES.find((e) => e.value === filters.event_type)?.label || 'event'}`
                  : `${filteredVenues.length} premium venues, each personally verified by our team`
                }
              </p>
            </div>
            {/* Quick Stats */}
            <div className="flex items-center gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{filteredVenues.length}</div>
                <div className="text-white/60 text-xs uppercase tracking-wide">Venues</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[#D4B36A]">{cities.length}</div>
                <div className="text-white/60 text-xs uppercase tracking-wide">Cities</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main py-6 md:py-8">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Mobile Filter Button → opens FilterBottomSheet */}
            <Button
              variant="outline"
              className="md:hidden flex-1 h-11 bg-white border-slate-200"
              onClick={() => setMobileFilterOpen(true)}
              data-testid="mobile-filter-btn"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-[#D4B36A] text-[#0B0B0D] text-xs px-2 py-0.5 rounded-full font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Sort */}
            <Select value={filters.sort_by} onValueChange={(v) => handleFilterChange('sort_by', v)}>
              <SelectTrigger className="w-[160px] sm:w-[180px] h-11 bg-white border-slate-200 rounded-xl shadow-sm" data-testid="sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.filter(opt => {
                  // Only show distance option when radius search is active
                  if (opt.requiresRadius) {
                    const hasRadius = filters.radius || searchParams.get('radius') || searchParams.get('lat');
                    return hasRadius;
                  }
                  return true;
                }).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#111111] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
                onClick={() => setViewMode('list')}
                data-testid="view-list"
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                className={`p-2.5 transition-colors ${viewMode === 'map' ? 'bg-[#111111] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
                onClick={() => setViewMode('map')}
                data-testid="view-map"
                title="Map View"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Desktop Filter Sidebar - Elevated Card Design */}
          <aside className={cn(
            "hidden md:block flex-shrink-0 transition-all duration-300",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"
          )}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 sticky top-24 overflow-hidden">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-[#111111] to-[#153055] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#D4B36A]" />
                    <h2 className="font-semibold text-white text-sm">Refine Results</h2>
                  </div>
                  {activeFilterCount > 0 && (
                    <span className="bg-[#D4B36A] text-[#111111] text-xs font-bold px-2 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
              </div>
              {/* Sidebar Content */}
              <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                <FilterSidebar showLocationSearch={viewMode === 'map'} />
              </div>
            </div>
          </aside>

          {/* Sidebar Toggle for Desktop */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "hidden md:flex items-center justify-center w-6 h-16 bg-white border border-slate-200 rounded-r-lg shadow-md hover:bg-slate-50 transition-all z-40",
              sidebarCollapsed ? "sticky top-24 self-start ml-0" : "sticky top-24 self-start -ml-4"
            )}
            data-testid="sidebar-toggle"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4 text-[#64748B]" /> : <ChevronLeft className="w-4 h-4 text-[#64748B]" />}
          </button>

          {/* Results Area */}
          <main className="flex-1 min-w-0">
            {/* Active Filter Chips — ALL active filters */}
            {(() => {
              const chips = buildFilterChips(filters, EVENT_TYPES, VENUE_TYPE_OPTIONS, (key, value) => {
                if (key === 'venue_types_remove') {
                  handleVenueTypeToggle(value);
                } else {
                  handleFilterChange(key, value);
                }
              });
              if (chips.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-white rounded-xl border border-slate-100" data-testid="filter-chips">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mr-2">Active:</span>
                  {chips.map(chip => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1.5 bg-[#111111] text-white px-3 py-1.5 rounded-full text-xs font-medium"
                      data-testid={`chip-${chip.key}`}
                    >
                      {chip.label}
                      <button
                        onClick={chip.onRemove}
                        className="hover:text-[#D4B36A] transition-colors ml-0.5"
                        aria-label={`Remove ${chip.label} filter`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors ml-2"
                    data-testid="clear-all-chips-btn"
                  >
                    Clear all
                  </button>
                </div>
              );
            })()}
            
            {loading ? (
              // Premium Skeleton Cards - 2 Column Grid
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <VenueCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredVenues.length === 0 ? (
              // Premium Empty State
              <div className="text-center py-20 px-4 bg-white rounded-2xl border border-slate-100">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#111111] mb-3">No venues match your filters</h3>
                <p className="text-[#64748B] mb-8 max-w-md mx-auto">
                  {filters.radius
                    ? `No venues found within ${filters.radius}km. Try increasing the radius or adjusting your filters.`
                    : 'Try adjusting or clearing your filters to discover more venues.'}
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#111111] text-white font-semibold text-sm hover:bg-[#153055] transition-all shadow-lg shadow-[#111111]/20"
                  data-testid="empty-clear-filters-btn"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* List View - Premium 2 Column Grid with Stagger Animation */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 stagger-grid">
                {filteredVenues.map((venue) => (
                  <VenueQuickPreview key={venue.venue_id} venue={venue}>
                    <VenueCard venue={venue} />
                  </VenueQuickPreview>
                ))}
              </div>
            ) : (
              /* Map View - Split Layout */
              <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-280px)] min-h-[500px]">
                {/* Map */}
                <div className="flex-1 lg:flex-[2] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <VenueMap
                    venues={filteredVenues}
                    anchor={anchor}
                    radiusKm={filters.radius ? parseFloat(filters.radius) : null}
                    onVenuesMissingLocation={handleMissingLocationCount}
                    className="w-full h-full"
                  />
                </div>
                
                {/* Venue List (desktop) */}
                <div className="hidden lg:block lg:flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="font-semibold text-[#111111]">
                      {filteredVenues.length} Venues
                    </h3>
                    {anchor && (
                      <p className="text-xs text-[#64748B] mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Near: {anchor.label}
                      </p>
                    )}
                  </div>
                  <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-4">
                    {filteredVenues.map((venue) => (
                      <VenueCard key={venue.venue_id} venue={venue} compact />
                    ))}
                  </div>
                </div>

                {/* Mobile Bottom Drawer Toggle */}
                <div className="lg:hidden">
                  <Sheet open={mobileMapListOpen} onOpenChange={setMobileMapListOpen}>
                    <SheetTrigger asChild>
                      <Button 
                        className="w-full bg-[#111111] h-12 rounded-xl shadow-lg"
                        data-testid="mobile-venue-list-btn"
                      >
                        <List className="w-4 h-4 mr-2" />
                        View {filteredVenues.length} Venues as List
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh] overflow-hidden rounded-t-2xl">
                      <SheetHeader>
                        <SheetTitle>
                          {filteredVenues.length} Venues
                          {anchor && <span className="text-sm font-normal text-[#64748B] ml-2">near {anchor.label}</span>}
                        </SheetTitle>
                      </SheetHeader>
                      <div className="overflow-y-auto h-[calc(100%-60px)] mt-4 space-y-4">
                        {filteredVenues.map((venue) => (
                          <VenueCard key={venue.venue_id} venue={venue} compact />
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            )}

            {/* Results info footer */}
            {!loading && filteredVenues.length > 0 && viewMode === 'list' && (
              <div className="mt-8 text-center">
                <p className="text-sm text-[#64748B]">
                  Showing <span className="font-semibold text-[#111111]">{filteredVenues.length}</span> venues
                  {filters.radius && anchor && (
                    <span> within <span className="font-semibold text-[#D4B36A]">{filters.radius}km</span> of {anchor.label}</span>
                  )}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Recently Viewed Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RecentlyViewedVenues />
      </div>

      {/* Desktop Footer */}
      <Footer />
      </div>

      {/* FilterBottomSheet — mobile only */}
      <FilterBottomSheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        cities={cities}
      />

      {/* Offline Banner */}
      {!backendOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-2.5 rounded-full shadow-lg" data-testid="offline-banner">
          <WifiOff className="w-3.5 h-3.5" />
          Showing demo venues — connect to load live data
        </div>
      )}
    </div>
  );
};

export default VenueSearchPage;
