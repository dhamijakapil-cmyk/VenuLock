import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import VenueMap from '@/components/VenueMap';
import FilterBottomSheet from '@/components/FilterBottomSheet';
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
} from 'lucide-react';

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

const VenueSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // list or map
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileMapListOpen, setMobileMapListOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [missingLocationCount, setMissingLocationCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Map-specific state
  const [locationSearch, setLocationSearch] = useState(searchParams.get('location') || '');
  const [anchor, setAnchor] = useState(null);
  const [geocodingStatus, setGeocodingStatus] = useState(''); // '', 'loading', 'success', 'fallback', 'error'

  // Filter state
  const [filters, setFilters] = useState({
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
    // Amenities
    parking: searchParams.get('parking') === 'true',
    valet: searchParams.get('valet') === 'true',
    alcohol: searchParams.get('alcohol') === 'true',
    ac: searchParams.get('ac') === 'true',
    catering_inhouse: searchParams.get('catering_inhouse') === 'true',
    catering_outside: searchParams.get('catering_outside') === 'true',
    decor: searchParams.get('decor') === 'true',
    sound: searchParams.get('sound') === 'true',
  });
  
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
    setFilters({
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
    });
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

  // Mobile Venue Card - Dark theme
  const MobileVenueCard = ({ venue }) => {
    const mainImage = venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800';
    const venueLink = (venue.city_slug && venue.slug)
      ? `/venues/${venue.city_slug}/${venue.slug}`
      : (venue._citySlug && venue.slug)
      ? `/venues/${venue._citySlug}/${venue.slug}`
      : `/venues/${venue.venue_id}`;

    return (
      <Link
        to={venueLink}
        className="block bg-white/[0.03] backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 transition-all active:scale-[0.98]"
        data-testid={`venue-card-${venue.venue_id}`}
      >
        <div className="relative aspect-[16/10]">
          <img src={mainImage} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A2F]/90 via-transparent to-transparent" />
          {venue.rating > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full">
              <Star className="w-3 h-3 fill-[#C9A227] text-[#C9A227]" />
              <span className="text-xs font-bold text-[#0A1A2F]">{venue.rating.toFixed(1)}</span>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-[#C9A227] px-2 py-1 rounded-full">
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Verified</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-serif text-lg font-bold text-white line-clamp-1">{venue.name}</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-white/50 mb-3">
            <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
            <span className="text-sm">{venue.area}, {venue.city}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/50">
              <Users className="w-3.5 h-3.5" />
              <span className="text-sm">{venue.capacity_min} – {venue.capacity_max}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white/40 uppercase">From</span>
              <p className="text-lg font-bold text-[#C9A227]">
                {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
                <span className="text-xs font-normal text-white/40">/plate</span>
              </p>
            </div>
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
          <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-3 block">
            Search Location
          </Label>
          <form onSubmit={handleLocationSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Locate className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder="e.g., Jaipur Fort"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-9 pr-3 h-10 bg-white border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227]/20"
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
          <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">City</Label>
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
          <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">Area</Label>
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">Event Type</Label>
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">Venue Type</Label>
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">Setting</Label>
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">Guest Count</Label>
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-2.5 block">Minimum Rating</Label>
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
        <Label className="text-xs font-bold text-[#0B1F3B] uppercase tracking-wider mb-3 block">Amenities</Label>
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
                  ? "bg-[#0B1F3B] text-white border-[#0B1F3B]"
                  : "bg-white text-[#64748B] border-slate-200 hover:border-[#0B1F3B]"
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
    <div className="min-h-screen bg-[#FAFAF8] lg:bg-[#FAFAF8]">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MOBILE: PREMIUM DARK THEME (matches landing page)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#0A1A2F]">
        {/* Mobile Header - Dark */}
        <header className="sticky top-0 z-50 bg-[#0A1A2F]/95 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C7A14A] to-[#B5912F] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">BookMyVenue</span>
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/login')}
                className="text-white/70 text-sm font-medium"
              >
                Sign In
              </button>
              <button
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                onClick={() => setMobileFilterOpen(true)}
                data-testid="mobile-filter-btn"
              >
                <SlidersHorizontal className="w-5 h-5 text-white" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A227] text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Hero Banner */}
        <div className="relative px-5 pt-6 pb-4">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 -left-20 w-64 h-64 bg-[#C7A14A]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -right-20 w-80 h-80 bg-[#C7A14A]/8 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-[#C9A227]" />
              <span className="text-[#C9A227] text-[10px] font-semibold uppercase tracking-wider">Curated Collection</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-white mb-1">
              {filters.city ? `Venues in ${filters.city}` : 'All Venues'}
            </h1>
            <p className="text-white/50 text-sm">
              {filteredVenues.length} premium venues found
            </p>
          </div>
        </div>

        {/* Mobile Quick Filters Bar */}
        <div className="px-5 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {/* Venue Type Filter */}
            <Popover open={venueTypePopoverOpen} onOpenChange={setVenueTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    filters.venue_types?.length > 0
                      ? "bg-[#C9A227] text-white"
                      : "bg-white/10 text-white/70 border border-white/10"
                  )}
                  data-testid="venue-type-filter"
                >
                  <Building2 className="w-4 h-4" />
                  {filters.venue_types?.length > 0
                    ? `${filters.venue_types.length} Type${filters.venue_types.length > 1 ? 's' : ''}`
                    : 'Venue Type'}
                  <ChevronDown className={cn("w-4 h-4 transition-transform", venueTypePopoverOpen && "rotate-180")} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 bg-[#0A1A2F] border border-white/10 rounded-2xl shadow-2xl" align="start" sideOffset={8}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Select Venue Types</span>
                  {filters.venue_types?.length > 0 && (
                    <button onClick={clearVenueTypes} className="text-xs text-[#C9A227] font-medium">Clear All</button>
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
                          isSelected ? "bg-[#C9A227]/20 text-white" : "text-white/60 hover:bg-white/5"
                        )}
                        data-testid={`venue-type-option-${option.value}`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#C9A227]" />}
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-white/10">
                  <button
                    onClick={() => setVenueTypePopoverOpen(false)}
                    className="w-full py-3 bg-[#C9A227] text-white text-sm font-semibold rounded-xl"
                    data-testid="venue-type-apply-btn"
                  >
                    {filters.venue_types?.length > 0 ? `Apply (${filters.venue_types.length})` : 'Apply'}
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Filter */}
            <Select value={filters.sort_by} onValueChange={(v) => handleFilterChange('sort_by', v)}>
              <SelectTrigger className="h-10 px-4 rounded-full bg-white/10 border-white/10 text-white/70 text-sm min-w-[140px]" data-testid="sort-select">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1A2F] border-white/10">
                {SORT_OPTIONS.filter(opt => !opt.requiresRadius || filters.radius).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white/70 focus:bg-white/10 focus:text-white">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex rounded-full overflow-hidden bg-white/10 border border-white/10">
              <button
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-white text-[#0A1A2F]' : 'text-white/60'}`}
                onClick={() => setViewMode('list')}
                data-testid="view-list"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                className={`px-3 py-2 ${viewMode === 'map' ? 'bg-white text-[#0A1A2F]' : 'text-white/60'}`}
                onClick={() => setViewMode('map')}
                data-testid="view-map"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips - Mobile */}
        {(() => {
          const chips = buildFilterChips(filters, EVENT_TYPES, VENUE_TYPE_OPTIONS, (key, value) => {
            if (key === 'venue_types_remove') handleVenueTypeToggle(value);
            else handleFilterChange(key, value);
          });
          if (chips.length === 0) return null;
          return (
            <div className="px-5 pb-4">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10" data-testid="filter-chips">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Active:</span>
                {chips.map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1.5 bg-[#C9A227] text-white px-3 py-1 rounded-full text-xs font-medium" data-testid={`chip-${chip.key}`}>
                    {chip.label}
                    <button onClick={chip.onRemove} className="hover:text-white/70"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-xs text-red-400 font-medium ml-1" data-testid="clear-all-chips-btn">Clear</button>
              </div>
            </div>
          );
        })()}

        {/* Mobile Venue List */}
        <div className="px-5 pb-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/5 rounded-2xl overflow-hidden animate-pulse border border-white/10">
                  <div className="aspect-[16/10] bg-white/10" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-white/10 rounded-lg w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="flex justify-between pt-2">
                      <div className="h-4 bg-white/5 rounded w-24" />
                      <div className="h-6 bg-white/10 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No venues found</h3>
              <p className="text-white/50 text-sm mb-6">Try adjusting your filters</p>
              <button onClick={clearFilters} className="px-6 py-3 bg-[#C9A227] text-white rounded-xl font-semibold text-sm" data-testid="empty-clear-filters-btn">
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredVenues.map((venue) => (
                <MobileVenueCard key={venue.venue_id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="h-[60vh] bg-white/5 rounded-2xl overflow-hidden border border-white/10">
              <VenueMap
                venues={filteredVenues}
                anchor={anchor}
                radiusKm={filters.radius ? parseFloat(filters.radius) : null}
                onVenuesMissingLocation={handleMissingLocationCount}
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          DESKTOP: ORIGINAL LIGHT THEME
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">

      {/* Premium Branded Discovery Header */}
      <div className="bg-gradient-to-r from-[#0B1F3B] via-[#153055] to-[#0B1F3B] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#C9A227] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C9A227] rounded-full blur-3xl" />
        </div>
        <div className="container-main py-8 md:py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-[#C9A227]" />
                <span className="text-[#C9A227] text-xs font-semibold uppercase tracking-wider">Curated Collection</span>
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
                <div className="text-2xl md:text-3xl font-bold text-[#C9A227]">{cities.length}</div>
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
                <span className="ml-2 bg-[#C9A227] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Venue Type Multi-Select */}
            <Popover open={venueTypePopoverOpen} onOpenChange={setVenueTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "h-11 px-4 flex items-center gap-2 border rounded-xl text-sm transition-all duration-200",
                    "bg-white hover:border-slate-300 shadow-sm",
                    filters.venue_types?.length > 0
                      ? "border-[#C9A227] text-[#0B1F3B]"
                      : "border-slate-200 text-[#64748B]"
                  )}
                  data-testid="venue-type-filter"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {filters.venue_types?.length > 0
                      ? `${filters.venue_types.length} Type${filters.venue_types.length > 1 ? 's' : ''}`
                      : 'Venue Type'}
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    venueTypePopoverOpen && "rotate-180"
                  )} />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[280px] p-0 bg-white rounded-xl border-0 shadow-xl" 
                align="start"
                sideOffset={8}
              >
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0B1F3B]">Select Venue Types</span>
                  {filters.venue_types?.length > 0 && (
                    <button
                      onClick={clearVenueTypes}
                      className="text-xs text-[#C9A227] hover:text-[#0B1F3B] font-medium"
                    >
                      Clear All
                    </button>
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
                          "w-full px-3 py-2.5 flex items-center justify-between rounded-lg text-sm transition-colors",
                          isSelected
                            ? "bg-[#C9A227]/10 text-[#0B1F3B]"
                            : "hover:bg-slate-50 text-[#64748B]"
                        )}
                        data-testid={`venue-type-option-${option.value}`}
                      >
                        <span>{option.label}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#C9A227]" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <button
                    onClick={() => setVenueTypePopoverOpen(false)}
                    className="w-full h-10 bg-[#0B1F3B] text-white text-sm font-medium rounded-lg hover:bg-[#153055] transition-colors"
                    data-testid="venue-type-apply-btn"
                  >
                    {filters.venue_types?.length > 0 ? `Apply (${filters.venue_types.length} selected)` : 'Apply'}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
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
                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#0B1F3B] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
                onClick={() => setViewMode('list')}
                data-testid="view-list"
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                className={`p-2.5 transition-colors ${viewMode === 'map' ? 'bg-[#0B1F3B] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
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
              <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#C9A227]" />
                    <h2 className="font-semibold text-white text-sm">Refine Results</h2>
                  </div>
                  {activeFilterCount > 0 && (
                    <span className="bg-[#C9A227] text-[#0B1F3B] text-xs font-bold px-2 py-0.5 rounded-full">
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
              "hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 items-center justify-center w-6 h-16 bg-white border border-l-0 border-slate-200 rounded-r-lg shadow-md hover:bg-slate-50 transition-all",
              sidebarCollapsed ? "left-0" : "left-[calc(280px+1rem)]"
            )}
            style={{ marginLeft: sidebarCollapsed ? '1rem' : '0' }}
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
                      className="inline-flex items-center gap-1.5 bg-[#0B1F3B] text-white px-3 py-1.5 rounded-full text-xs font-medium"
                      data-testid={`chip-${chip.key}`}
                    >
                      {chip.label}
                      <button
                        onClick={chip.onRemove}
                        className="hover:text-[#C9A227] transition-colors ml-0.5"
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
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse shadow-sm">
                    <div className="aspect-[16/10] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-3 bg-slate-100 rounded-full w-16" />
                        <div className="h-3 bg-slate-100 rounded-full w-12" />
                      </div>
                      <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-7 bg-slate-100 rounded-full w-20" />
                        <div className="h-7 bg-slate-100 rounded-full w-16" />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-4 bg-slate-100 rounded w-24" />
                        <div className="h-10 bg-slate-200 rounded-xl w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVenues.length === 0 ? (
              // Premium Empty State
              <div className="text-center py-20 px-4 bg-white rounded-2xl border border-slate-100">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#0B1F3B] mb-3">No venues match your filters</h3>
                <p className="text-[#64748B] mb-8 max-w-md mx-auto">
                  {filters.radius
                    ? `No venues found within ${filters.radius}km. Try increasing the radius or adjusting your filters.`
                    : 'Try adjusting or clearing your filters to discover more venues.'}
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#0B1F3B] text-white font-semibold text-sm hover:bg-[#153055] transition-all shadow-lg shadow-[#0B1F3B]/20"
                  data-testid="empty-clear-filters-btn"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* List View - Premium 2 Column Grid with More Spacing */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {filteredVenues.map((venue) => (
                  <VenueCard key={venue.venue_id} venue={venue} />
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
                    <h3 className="font-semibold text-[#0B1F3B]">
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
                        className="w-full bg-[#0B1F3B] h-12 rounded-xl shadow-lg"
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
                  Showing <span className="font-semibold text-[#0B1F3B]">{filteredVenues.length}</span> venues
                  {filters.radius && anchor && (
                    <span> within <span className="font-semibold text-[#C9A227]">{filters.radius}km</span> of {anchor.label}</span>
                  )}
                </p>
              </div>
            )}
          </main>
        </div>
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
