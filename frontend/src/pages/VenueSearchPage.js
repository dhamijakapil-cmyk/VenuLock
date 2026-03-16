import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import VenueQuickPreview from '@/components/VenueQuickPreview';
import VenueMap from '@/components/VenueMap';
import FilterBottomSheet from '@/components/FilterBottomSheet';
import CompareSheet from '@/components/CompareSheet';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import RecentlyViewedVenues from '@/components/venue/RecentlyViewedVenues';
import CollectionPickerModal from '@/components/CollectionPickerModal';
import { toast } from 'sonner';
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
import { buildFilterChips, cleanFilters, DEFAULT_FILTERS } from '@/utils/filterUtils';
import MobileVenueCard from '@/components/cards/MobileVenueCard';
import MobileQuickPreview from '@/components/cards/MobileQuickPreview';
import BrandLogo from '@/components/BrandLogo';
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
  Briefcase,
  Gift,
  Wallet,
  PartyPopper,
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

const getInitialFilters = (searchParams) => {
  // Only use URL params — no localStorage auto-restore (was causing stale filters to appear)
  return {
    city: searchParams.get('city') || '',
    area: searchParams.get('area') || '',
    event_type: searchParams.get('event_type') || '',
    venue_type: searchParams.get('venue_type') || '',
    venue_types: searchParams.get('venue_types')?.split(',').filter(Boolean) || [],
    indoor_outdoor: searchParams.get('indoor_outdoor') || '',
    guest_min: searchParams.get('guest_min') || '',
    guest_max: searchParams.get('guest_max') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
    rating_min: searchParams.get('rating_min') || '',
    sort_by: searchParams.get('sort_by') || 'popular',
    radius: searchParams.get('radius') || '',
    parking: searchParams.get('parking') === 'true',
    valet: searchParams.get('valet') === 'true',
    alcohol: searchParams.get('alcohol') === 'true',
    ac: searchParams.get('ac') === 'true',
    catering_inhouse: searchParams.get('catering_inhouse') === 'true',
    catering_outside: searchParams.get('catering_outside') === 'true',
    decor: searchParams.get('decor') === 'true',
    sound: searchParams.get('sound') === 'true',
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
  const [fetchError, setFetchError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileMapListOpen, setMobileMapListOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [missingLocationCount, setMissingLocationCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickPreviewVenue, setQuickPreviewVenue] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [compareVenues, setCompareVenues] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [collectionPickerVenue, setCollectionPickerVenue] = useState(null);

  const toggleCompare = (venue) => {
    setCompareVenues(prev => {
      const exists = prev.find(v => v.venue_id === venue.venue_id);
      if (exists) return prev.filter(v => v.venue_id !== venue.venue_id);
      if (prev.length >= 3) return prev;
      return [...prev, venue];
    });
  };
  const removeFromCompare = (venueId) => setCompareVenues(prev => prev.filter(v => v.venue_id !== venueId));

  // Map-specific state
  const [locationSearch, setLocationSearch] = useState(searchParams.get('location') || '');
  const [anchor, setAnchor] = useState(null);
  const [geocodingStatus, setGeocodingStatus] = useState('');

  // Filter state — URL params only (no localStorage auto-restore)
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));
  
  // Venue type multi-select popover state
  const [venueTypePopoverOpen, setVenueTypePopoverOpen] = useState(false);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async (retryCount = 0) => {
      try {
        const response = await api.get('/venues/cities');
        setCities(response.data);
      } catch (error) {
        console.error('Error fetching cities:', error);
        if (retryCount < 3) {
          setTimeout(() => fetchCities(retryCount + 1), (retryCount + 1) * 2000);
        }
      }
    };
    fetchCities(0);
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

  // Fetch venues from API — NO mock fallback (always show real data or error)
  useEffect(() => {
    const fetchVenues = async (retryCount = 0) => {
      setLoading(true);
      setFetchError(null);
      try {
        // Build clean params and call API directly
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

        // Build the URL cleanly — always include limit
        params.set('limit', '200');
        const queryString = params.toString();
        const response = await api.get(`/venues?${queryString}`);
        const data = response.data;
        if (Array.isArray(data)) {
          setVenues(data);
          setTotalResults(data.length);
          setBackendOnline(true);
        } else {
          console.error('[VenuLoQ] Unexpected API response format:', typeof data, data);
          setVenues([]);
          setTotalResults(0);
          setBackendOnline(false);
          setFetchError('Unexpected response from server. Please try again.');
        }
        setLoading(false);
      } catch (error) {
        console.error('[VenuLoQ] Error fetching venues:', error?.message, error?.response?.status, error?.response?.data);
        // Progressive retry — handles deployment restarts (up to ~12s total)
        if (retryCount < 3) {
          const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
          console.log(`[VenuLoQ] Retrying venue fetch in ${delay/1000}s (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => fetchVenues(retryCount + 1), delay);
          return; // Keep spinner during retry
        }
        setVenues([]);
        setTotalResults(0);
        setBackendOnline(false);
        setFetchError(
          error?.response?.status === 0 || !error?.response
            ? 'Unable to connect to server. Please check your connection and try again.'
            : `Server error (${error.response.status}). Please try again.`
        );
        setLoading(false);
      }
    };
    fetchVenues(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, anchor, searchParams]);

  // Filter venues by radius + text search (client-side)
  const filteredVenues = useMemo(() => {
    let result = venues;
    
    if (filters.radius && anchor?.lat && anchor?.lng) {
      const radiusKm = parseFloat(filters.radius);
      result = result.filter(venue => {
        if (!venue.latitude || !venue.longitude) return false;
        const distance = calculateDistance(
          anchor.lat, anchor.lng,
          parseFloat(venue.latitude), parseFloat(venue.longitude)
        );
        return distance <= radiusKm;
      });
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(v => 
        v.name?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.area?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [venues, filters.radius, anchor, searchQuery]);

  // Reset visible count when filters/search change
  useEffect(() => { setVisibleCount(20); }, [filters, searchQuery]);

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

  // MobileVenueCard is now imported from @/components/cards/MobileVenueCard

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
      <div className="lg:hidden min-h-screen bg-[#F4F1EC]">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/[0.05]">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <BrandLogo size="sm" linkTo="/" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search venues, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-[#F4F1EC] rounded-full text-[12px] text-[#0B0B0D] placeholder-[#9CA3AF] border-none focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                data-testid="mobile-search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" data-testid="mobile-search-clear">
                  <X className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
              )}
            </div>
            {isAuthenticated ? (
              <button onClick={() => navigate(user?.role === 'customer' ? '/my-enquiries' : '/admin')} className="w-8 h-8 bg-[#0B0B0D] rounded-full flex items-center justify-center flex-shrink-0" data-testid="mobile-user-avatar">
                <span className="text-[#F4F1EC] text-[10px] font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </button>
            ) : (
              <button onClick={() => navigate('/auth')} className="text-[11px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] flex-shrink-0 whitespace-nowrap" data-testid="mobile-signin-btn" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Sign In
              </button>
            )}
          </div>
        </header>

        <div className="px-4 pb-14 bg-[#F4F1EC]">
          <div className="flex items-baseline justify-between pt-3 pb-2">
            <h1 className="text-[16px] text-[#0B0B0D] tracking-tight font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {filters.city ? `Venues in ${filters.city}` : 'Curated Venues'}
            </h1>
            <span className="text-[#64748B] text-[10px] font-medium tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {loading ? '...' : `${filteredVenues.length} across ${cities.length || 9} cities`}
            </span>
          </div>
          <div className="flex items-center gap-2 pb-3" data-testid="quick-filter-chips">
            {/* Sort — compact popover */}
            <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 h-9 text-[11px] font-semibold whitespace-nowrap transition-all border tracking-wide rounded-full",
                    filters.sort_by !== 'popular'
                      ? "bg-[#0B0B0D] text-white border-[#0B0B0D]"
                      : "bg-white text-[#0B0B0D] border-black/10 hover:border-[#D4B36A] shadow-sm"
                  )}
                  data-testid="mobile-sort-btn"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Sort
                  <ChevronDown className={cn("w-3 h-3 transition-transform", sortPopoverOpen && "rotate-180")} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 bg-white border border-black/[0.06] rounded-2xl shadow-xl" align="start" sideOffset={8}>
                <div className="px-4 py-3.5 border-b border-slate-100">
                  <span className="text-[14px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sort By</span>
                </div>
                <div className="p-2">
                  {SORT_OPTIONS.filter(opt => !opt.requiresRadius || filters.radius).map((opt) => {
                    const isSelected = filters.sort_by === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { handleFilterChange('sort_by', opt.value); setSortPopoverOpen(false); }}
                        className={cn(
                          "w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-[13px] transition-colors",
                          isSelected ? "bg-[#0B0B0D]/[0.04]" : "hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                          isSelected ? "border-[#0B0B0D]" : "border-[#CBD5E1]"
                        )}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#0B0B0D]" />}
                        </div>
                        <span className={cn("text-left", isSelected ? "text-[#0B0B0D] font-semibold" : "text-[#64748B]")} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Venue Type Filter */}
            <Popover open={venueTypePopoverOpen} onOpenChange={setVenueTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 h-9 text-[11px] font-semibold whitespace-nowrap transition-all border tracking-wide rounded-full",
                    filters.venue_types?.length > 0
                      ? "bg-[#0B0B0D] text-white border-[#0B0B0D]"
                      : "bg-white text-[#0B0B0D] border-black/10 hover:border-[#D4B36A] shadow-sm"
                  )}
                  data-testid="mobile-venue-type-filter"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {filters.venue_types?.length > 0 ? `${filters.venue_types.length} Types` : 'Type'}
                  <ChevronDown className={cn("w-3 h-3 transition-transform", venueTypePopoverOpen && "rotate-180")} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-white border border-black/[0.06] rounded-2xl shadow-xl" align="start" sideOffset={8}>
                <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Select Venue Types</span>
                  {filters.venue_types?.length > 0 && (
                    <button onClick={clearVenueTypes} className="text-[11px] text-[#D4B36A] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
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
                          "w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-[13px] transition-colors",
                          isSelected ? "bg-[#0B0B0D]/[0.04]" : "hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                          isSelected ? "bg-[#0B0B0D] border-[#0B0B0D]" : "border-[#CBD5E1]"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className={cn("text-left", isSelected ? "text-[#0B0B0D] font-semibold" : "text-[#64748B]")} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <button
                    onClick={() => setVenueTypePopoverOpen(false)}
                    className="w-full py-2.5 bg-[#0B0B0D] text-white text-[13px] font-semibold rounded-xl transition-colors hover:bg-[#1a1a1f]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Apply
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filters — opens full bottom sheet */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className={cn(
                "flex items-center gap-1 px-3.5 h-9 text-[11px] font-semibold whitespace-nowrap transition-all border tracking-wide rounded-full",
                (filters.event_type || filters.price_max || filters.capacity_min || (filters.venue_types?.length > 0))
                  ? "bg-[#0B0B0D] text-white border-[#0B0B0D]"
                  : "bg-white text-[#0B0B0D] border-black/10 hover:border-[#D4B36A] shadow-sm"
              )}
              data-testid="mobile-more-filters"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>

          {/* Active Filter Chips */}
          {(() => {
            const chips = buildFilterChips(filters, EVENT_TYPES, VENUE_TYPE_OPTIONS, (key, value) => {
              if (key === 'venue_types_remove') handleVenueTypeToggle(value);
              else handleFilterChange(key, value);
            });
            if (chips.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="mobile-filter-chips">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Active:</span>
                {chips.map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1.5 bg-[#0B0B0D] text-[#F4F1EC] px-3 py-1.5 text-[10px] font-medium tracking-wide uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {chip.label}
                    <button onClick={chip.onRemove} className="hover:text-[#D4B36A] transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-[10px] text-[#D4B36A] hover:text-[#B69550] font-medium ml-1 transition-colors tracking-wide uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>Clear all</button>
              </div>
            );
          })()}

          {/* Recently Viewed — mobile */}
          <RecentlyViewedVenues variant="mobile" />

          {/* Venue List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8]" data-testid="mobile-fetch-error">
              <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-300" />
              </div>
              <h3 className="text-xl font-bold text-[#0B0B0D] mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Connection Issue</h3>
              <p className="text-[#6E6E6E] text-sm mb-6 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>{fetchError}</p>
              <button 
                onClick={() => { setFetchError(null); setLoading(true); setFilters(prev => ({...prev})); }}
                className="px-6 py-3 bg-[#0B0B0D] text-[#F4F1EC] font-semibold text-sm tracking-wide uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                data-testid="mobile-retry-btn"
              >
                Try Again
              </button>
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
            <div className="space-y-3">
              {filteredVenues.slice(0, visibleCount).map((venue, idx) => (
                <React.Fragment key={venue.venue_id}>
                  {idx === 0 && (
                    <div className="flex items-center gap-2" data-testid="featured-section-label">
                      <div className="w-[3px] h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #D4B36A, #B69550)' }} />
                      <span className="text-[11px] font-bold text-[#0B0B0D] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Featured</span>
                    </div>
                  )}
                  {idx === 2 && (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-[#E5E0D8] to-transparent my-2" />
                      <div className="flex items-center gap-2 pt-1" data-testid="all-venues-section-label">
                        <div className="w-[3px] h-4 rounded-full bg-[#CBD5E1]" />
                        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>All Venues</span>
                      </div>
                    </>
                  )}
                  <MobileVenueCard
                    venue={venue}
                    index={idx}
                    onQuickPreview={() => setQuickPreviewVenue(venue)}
                    isComparing={compareVenues.some(v => v.venue_id === venue.venue_id)}
                    onToggleCompare={() => toggleCompare(venue)}
                    compareCount={compareVenues.length}
                    onSaveToCollection={() => {
                      if (!isAuthenticated) {
                        toast('Sign in to save venues', { action: { label: 'Sign In', onClick: () => navigate('/auth') } });
                        return;
                      }
                      setCollectionPickerVenue(venue);
                    }}
                  />
                </React.Fragment>
              ))}
              {/* Load More */}
              {visibleCount < filteredVenues.length && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  className="w-full py-3.5 mt-2 text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.12em] border border-black/10 rounded-xl bg-white hover:bg-[#F4F1EC] transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  data-testid="load-more-btn"
                >
                  Show more venues ({filteredVenues.length - visibleCount} remaining)
                </button>
              )}
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

        {/* Floating Compare Bar */}
        {compareVenues.length > 0 && !compareOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden" data-testid="compare-floating-bar">
            <div className="mx-4 mb-4 bg-[#0B0B0D] rounded-2xl px-3 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                {compareVenues.map((v) => (
                  <button
                    key={v.venue_id}
                    onClick={() => removeFromCompare(v.venue_id)}
                    className="flex items-center gap-1 bg-white/10 pl-2.5 pr-1.5 py-1.5 rounded-full shrink-0 max-w-[130px] group"
                    data-testid={`compare-chip-${v.venue_id}`}
                  >
                    <span className="text-[10px] text-white/80 font-medium truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {v.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                    <X className="w-3 h-3 text-white/40 group-hover:text-white/80 flex-shrink-0 transition-colors" strokeWidth={2} />
                  </button>
                ))}
                {compareVenues.length < 3 && (
                  <div className="w-7 h-7 rounded-full border border-dashed border-white/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-white/25 font-bold">+</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setCompareOpen(true)}
                className="bg-[#D4B36A] text-[#0B0B0D] text-[11px] font-bold px-4 py-2.5 rounded-xl flex-shrink-0 ml-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                data-testid="compare-now-btn"
              >
                Compare ({compareVenues.length})
              </button>
            </div>
          </div>
        )}

        {/* Compare Sheet */}
        {compareOpen && (
          <CompareSheet
            venues={compareVenues}
            onClose={() => setCompareOpen(false)}
            onRemove={(id) => {
              removeFromCompare(id);
              if (compareVenues.length <= 1) setCompareOpen(false);
            }}
          />
        )}

        {/* Collection Picker Modal */}
        {collectionPickerVenue && (
          <CollectionPickerModal
            venue={collectionPickerVenue}
            onClose={() => setCollectionPickerVenue(null)}
          />
        )}
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
            ) : fetchError ? (
              // Error State
              <div className="text-center py-20 px-4 bg-white rounded-2xl border border-slate-100" data-testid="desktop-fetch-error">
                <div className="w-24 h-24 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-12 h-12 text-red-300" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#111111] mb-3">Unable to Load Venues</h3>
                <p className="text-[#64748B] mb-8 max-w-md mx-auto">{fetchError}</p>
                <button
                  onClick={() => { setFetchError(null); setLoading(true); setFilters(prev => ({...prev})); }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#111111] text-white font-semibold text-sm hover:bg-[#153055] transition-all shadow-lg shadow-[#111111]/20"
                  data-testid="desktop-retry-btn"
                >
                  Try Again
                </button>
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

      {/* Offline Banner - shown when backend is unreachable */}
      {!backendOnline && !loading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-2.5 rounded-full shadow-lg" data-testid="offline-banner">
          <WifiOff className="w-3.5 h-3.5" />
          Unable to reach server — showing cached results
        </div>
      )}

      {/* Mobile Quick Preview Modal */}
      <MobileQuickPreview
        venue={quickPreviewVenue}
        open={!!quickPreviewVenue}
        onClose={() => setQuickPreviewVenue(null)}
      />
    </div>
  );
};

export default VenueSearchPage;
