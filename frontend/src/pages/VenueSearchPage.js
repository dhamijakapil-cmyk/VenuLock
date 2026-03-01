import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import VenueMap from '@/components/VenueMap';
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
  Building2,
  Check,
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
  
  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // list or map
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileMapListOpen, setMobileMapListOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [missingLocationCount, setMissingLocationCount] = useState(0);

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

  // Fetch venues
  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          // Skip venue_types array - handle separately
          if (key === 'venue_types') return;
          if (value && value !== '' && value !== false) {
            params.set(key, value.toString());
          }
        });
        
        // Add venue_types as comma-separated string
        if (filters.venue_types?.length > 0) {
          params.set('venue_types', filters.venue_types.join(','));
        }
        
        // Add lat/lng from URL params or anchor for distance calculation
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
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
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
    ([key, value]) => value && value !== '' && value !== false && key !== 'sort_by'
  ).length + (locationSearch ? 1 : 0);

  const selectedCity = cities.find((c) => c.city === filters.city);

  const handleMissingLocationCount = useCallback((count) => {
    setMissingLocationCount(count);
  }, []);

  // Filter sidebar component
  const FilterSidebar = ({ showLocationSearch = true }) => (
    <div className="space-y-6">
      {/* Location Search (for map) */}
      {showLocationSearch && (
        <div>
          <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">
            Search Location
          </Label>
          <form onSubmit={handleLocationSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Locate className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder="e.g., Jaipur Fort"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-9 pr-3"
                data-testid="location-search"
              />
            </div>
            <Button type="submit" size="icon" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </form>
          {geocodingStatus === 'success' && anchor && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {anchor.label}
            </p>
          )}
          {geocodingStatus === 'error' && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Location not found
            </p>
          )}
        </div>
      )}

      {/* Radius Filter */}
      {showLocationSearch && (
        <div>
          <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">
            Search Radius
          </Label>
          <Select 
            value={filters.radius || '__all__'} 
            onValueChange={(v) => handleFilterChange('radius', v)}
          >
            <SelectTrigger data-testid="filter-radius">
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
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">City</Label>
        <Select value={filters.city || '__all__'} onValueChange={(v) => handleFilterChange('city', v)}>
          <SelectTrigger data-testid="filter-city">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.city_id} value={city.name}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Area */}
      {selectedCity && selectedCity.areas?.length > 0 && (
        <div>
          <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">Area</Label>
          <Select value={filters.area || '__all__'} onValueChange={(v) => handleFilterChange('area', v)}>
            <SelectTrigger data-testid="filter-area">
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
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">Event Type</Label>
        <Select value={filters.event_type || '__all__'} onValueChange={(v) => handleFilterChange('event_type', v)}>
          <SelectTrigger data-testid="filter-event-type">
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
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">Venue Type</Label>
        <Select value={filters.venue_type || '__all__'} onValueChange={(v) => handleFilterChange('venue_type', v)}>
          <SelectTrigger data-testid="filter-venue-type">
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
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">Setting</Label>
        <Select value={filters.indoor_outdoor || '__all__'} onValueChange={(v) => handleFilterChange('indoor_outdoor', v)}>
          <SelectTrigger>
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
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">Guest Count</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.guest_min}
            onChange={(e) => handleFilterChange('guest_min', e.target.value)}
            data-testid="filter-guest-min"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.guest_max}
            onChange={(e) => handleFilterChange('guest_max', e.target.value)}
            data-testid="filter-guest-max"
          />
        </div>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">
          Price per Plate
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.price_min}
            onChange={(e) => handleFilterChange('price_min', e.target.value)}
            data-testid="filter-price-min"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.price_max}
            onChange={(e) => handleFilterChange('price_max', e.target.value)}
            data-testid="filter-price-max"
          />
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">Minimum Rating</Label>
        <Select value={filters.rating_min || '__all__'} onValueChange={(v) => handleFilterChange('rating_min', v)}>
          <SelectTrigger>
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

      {/* Amenities */}
      <div>
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-3 block">Amenities</Label>
        <div className="space-y-3">
          {[
            { key: 'parking', label: 'Parking' },
            { key: 'valet', label: 'Valet Parking' },
            { key: 'alcohol', label: 'Alcohol Allowed' },
            { key: 'ac', label: 'Air Conditioning' },
            { key: 'catering_inhouse', label: 'In-house Catering' },
            { key: 'catering_outside', label: 'Outside Catering' },
            { key: 'decor', label: 'In-house Decor' },
            { key: 'sound', label: 'Sound System' },
          ].map((amenity) => (
            <div key={amenity.key} className="flex items-center gap-2">
              <Checkbox
                id={`amenity-${amenity.key}`}
                checked={filters[amenity.key]}
                onCheckedChange={(checked) => handleFilterChange(amenity.key, checked)}
              />
              <label
                htmlFor={`amenity-${amenity.key}`}
                className="text-sm text-[#64748B] cursor-pointer"
              >
                {amenity.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={clearFilters}
          data-testid="clear-filters"
        >
          <X className="w-4 h-4 mr-2" />
          Clear All Filters ({activeFilterCount})
        </Button>
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
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header />

      <div className="container-main py-6">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#0B1F3B]">
              {filters.city || 'All'} Venues
              {filters.event_type && ` for ${EVENT_TYPES.find((e) => e.value === filters.event_type)?.label}`}
            </h1>
            <p className="text-[#64748B]">
              {filteredVenues.length} venues found
              {filters.radius && anchor && ` within ${filters.radius}km of ${anchor.label}`}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Mobile Filter Button */}
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden flex-1" data-testid="mobile-filter-btn">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-[#0B1F3B] text-white text-xs px-2 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterSidebar showLocationSearch={viewMode === 'map'} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Venue Type Multi-Select */}
            <Popover open={venueTypePopoverOpen} onOpenChange={setVenueTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "h-10 px-4 flex items-center gap-2 border rounded-lg text-sm transition-all duration-200",
                    "bg-white hover:border-slate-300",
                    filters.venue_types?.length > 0
                      ? "border-[#C9A227] text-[#0B1F3B]"
                      : "border-slate-200 text-[#64748B]"
                  )}
                  data-testid="venue-type-filter"
                >
                  <Building2 className="w-4 h-4" />
                  <span>
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
                    className="w-full h-9 bg-[#0B1F3B] text-white text-sm font-medium rounded-lg hover:bg-[#153055] transition-colors"
                    data-testid="venue-type-apply-btn"
                  >
                    {filters.venue_types?.length > 0 ? `Apply (${filters.venue_types.length} selected)` : 'Apply'}
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={filters.sort_by} onValueChange={(v) => handleFilterChange('sort_by', v)}>
              <SelectTrigger className="w-[200px]" data-testid="sort-select">
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
            <div className="flex border border-slate-200 rounded-md overflow-hidden">
              <button
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#0B1F3B] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
                onClick={() => setViewMode('list')}
                data-testid="view-list"
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                className={`p-2 transition-colors ${viewMode === 'map' ? 'bg-[#0B1F3B] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
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
        <div className="flex gap-6">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block w-[280px] flex-shrink-0">
            <div className="filter-sidebar bg-white p-6 border border-slate-200 sticky top-24">
              <h2 className="font-semibold text-[#0B1F3B] mb-6">Filter Venues</h2>
              <FilterSidebar showLocationSearch={viewMode === 'map'} />
            </div>
          </aside>

          {/* Results Area */}
          <main className="flex-1 min-w-0">
            {/* Active Venue Type Filter Chips */}
            {filters.venue_types?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-[#64748B]">Venue types:</span>
                {filters.venue_types.map((venueType) => {
                  const option = VENUE_TYPE_OPTIONS.find(opt => opt.value === venueType);
                  return (
                    <span
                      key={venueType}
                      className="inline-flex items-center gap-1.5 bg-[#C9A227]/10 text-[#0B1F3B] px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {option?.label || venueType}
                      <button
                        onClick={() => removeVenueType(venueType)}
                        className="hover:text-[#C9A227] transition-colors"
                        aria-label={`Remove ${option?.label || venueType}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
                <button
                  onClick={clearVenueTypes}
                  className="text-sm text-[#64748B] hover:text-[#C9A227] font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white overflow-hidden">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 skeleton w-1/3" />
                      <div className="h-6 skeleton w-2/3" />
                      <div className="h-4 skeleton w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVenues.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#0B1F3B] mb-2">No venues found</h3>
                <p className="text-[#64748B] mb-6">
                  {filters.radius 
                    ? `No venues within ${filters.radius}km of your search location. Try increasing the radius.`
                    : 'Try adjusting your filters to see more results'
                  }
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              /* List View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVenues.map((venue) => (
                  <VenueCard key={venue.venue_id} venue={venue} />
                ))}
              </div>
            ) : (
              /* Map View - Split Layout */
              <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-280px)] min-h-[500px]">
                {/* Map */}
                <div className="flex-1 lg:flex-[2] bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <VenueMap
                    venues={filteredVenues}
                    anchor={anchor}
                    radiusKm={filters.radius ? parseFloat(filters.radius) : null}
                    onVenuesMissingLocation={handleMissingLocationCount}
                    className="w-full h-full"
                  />
                </div>
                
                {/* Venue List (desktop) */}
                <div className="hidden lg:block lg:flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-[#0B1F3B]">
                      {filteredVenues.length} Venues
                    </h3>
                    {anchor && (
                      <p className="text-xs text-[#64748B] mt-1">
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
                        className="w-full bg-[#0B1F3B]"
                        data-testid="mobile-venue-list-btn"
                      >
                        <List className="w-4 h-4 mr-2" />
                        View {filteredVenues.length} Venues as List
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh] overflow-hidden rounded-t-xl">
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

            {/* Anchor Info (for debugging/demo) */}
            {viewMode === 'map' && anchor && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#64748B]">
                <strong>Map Anchor:</strong> {anchor.label} ({anchor.lat.toFixed(4)}, {anchor.lng.toFixed(4)})
                <span className="mx-2">|</span>
                <strong>Source:</strong> {locationSearch ? 'Location Search' : filters.city ? 'City Center Fallback' : 'Default (Delhi NCR)'}
                {filters.radius && (
                  <>
                    <span className="mx-2">|</span>
                    <strong>Radius:</strong> {filters.radius}km
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VenueSearchPage;
