import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VenueCard from '@/components/VenueCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { api } from '@/context/AuthContext';
import {
  EVENT_TYPES,
  VENUE_TYPES,
  INDOOR_OUTDOOR,
  AMENITIES,
  SORT_OPTIONS,
  formatIndianCurrency,
} from '@/lib/utils';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  List,
  Map,
  X,
  ChevronDown,
} from 'lucide-react';

const VenueSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // list or map
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    area: searchParams.get('area') || '',
    event_type: searchParams.get('event_type') || '',
    venue_type: searchParams.get('venue_type') || '',
    indoor_outdoor: searchParams.get('indoor_outdoor') || '',
    guest_min: searchParams.get('guest_min') || '',
    guest_max: searchParams.get('guest_max') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
    rating_min: searchParams.get('rating_min') || '',
    sort_by: searchParams.get('sort_by') || 'popular',
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

  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [guestRange, setGuestRange] = useState([50, 1000]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get('/cities');
        setCities(response.data);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '' && value !== false) {
            params.set(key, value.toString());
          }
        });

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
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== '' && value !== false) {
      newParams.set(key, value.toString());
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      area: '',
      event_type: '',
      venue_type: '',
      indoor_outdoor: '',
      guest_min: '',
      guest_max: '',
      price_min: '',
      price_max: '',
      rating_min: '',
      sort_by: 'popular',
      parking: false,
      valet: false,
      alcohol: false,
      ac: false,
      catering_inhouse: false,
      catering_outside: false,
      decor: false,
      sound: false,
    });
    setSearchParams({});
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && value !== '' && value !== false && key !== 'sort_by'
  ).length;

  const selectedCity = cities.find((c) => c.name === filters.city);

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* City */}
      <div>
        <Label className="text-sm font-semibold text-[#0B1F3B] mb-2 block">City</Label>
        <Select value={filters.city} onValueChange={(v) => handleFilterChange('city', v)}>
          <SelectTrigger data-testid="filter-city">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Cities</SelectItem>
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
          <Select value={filters.area} onValueChange={(v) => handleFilterChange('area', v)}>
            <SelectTrigger data-testid="filter-area">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
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
        <Select value={filters.event_type} onValueChange={(v) => handleFilterChange('event_type', v)}>
          <SelectTrigger data-testid="filter-event-type">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Events</SelectItem>
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
        <Select value={filters.venue_type} onValueChange={(v) => handleFilterChange('venue_type', v)}>
          <SelectTrigger data-testid="filter-venue-type">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
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
        <Select value={filters.indoor_outdoor} onValueChange={(v) => handleFilterChange('indoor_outdoor', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any</SelectItem>
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
        <Select value={filters.rating_min} onValueChange={(v) => handleFilterChange('rating_min', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any</SelectItem>
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
            <p className="text-[#64748B]">{totalResults} venues found</p>
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
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select value={filters.sort_by} onValueChange={(v) => handleFilterChange('sort_by', v)}>
              <SelectTrigger className="w-[180px]" data-testid="sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex border border-slate-200">
              <button
                className={`p-2 ${viewMode === 'list' ? 'bg-[#0B1F3B] text-white' : 'text-[#64748B]'}`}
                onClick={() => setViewMode('list')}
                data-testid="view-list"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                className={`p-2 ${viewMode === 'map' ? 'bg-[#0B1F3B] text-white' : 'text-[#64748B]'}`}
                onClick={() => setViewMode('map')}
                data-testid="view-map"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block w-[280px] flex-shrink-0">
            <div className="filter-sidebar bg-white p-6 border border-slate-200">
              <h2 className="font-semibold text-[#0B1F3B] mb-6">Filter Venues</h2>
              <FilterSidebar />
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1">
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
            ) : venues.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#0B1F3B] mb-2">No venues found</h3>
                <p className="text-[#64748B] mb-6">Try adjusting your filters to see more results</p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                  <VenueCard key={venue.venue_id} venue={venue} />
                ))}
              </div>
            ) : (
              <div className="map-container bg-slate-100 flex items-center justify-center">
                <p className="text-[#64748B]">Map view coming soon...</p>
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
