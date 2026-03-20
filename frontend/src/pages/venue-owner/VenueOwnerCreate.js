import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { EVENT_TYPES, VENUE_TYPES, INDOOR_OUTDOOR, AMENITIES } from '@/lib/utils';
import { Save, Plus, X, ImagePlus } from 'lucide-react';

const VenueOwnerCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    area: '',
    address: '',
    pincode: '',
    latitude: 28.6139,
    longitude: 77.2090,
    event_types: [],
    venue_type: '',
    indoor_outdoor: '',
    capacity_min: '',
    capacity_max: '',
    pricing: {
      price_per_plate_veg: '',
      price_per_plate_nonveg: '',
      min_spend: '',
      packages: [],
    },
    amenities: {
      parking: false,
      valet: false,
      alcohol_allowed: false,
      rooms_available: 0,
      ac: false,
      catering_inhouse: false,
      catering_outside_allowed: false,
      decor_inhouse: false,
      sound_system: false,
      dj_allowed: false,
      wifi: false,
      generator_backup: false,
    },
    images: [],
    policies: '',
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newPackage, setNewPackage] = useState({ name: '', price: '', guests: '' });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await api.get('/cities');
      setCities(response.data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePricingChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }));
  };

  const handleAmenityChange = (key, checked) => {
    setFormData((prev) => ({
      ...prev,
      amenities: { ...prev.amenities, [key]: checked },
    }));
  };

  const handleEventTypeToggle = (eventType) => {
    setFormData((prev) => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter((e) => e !== eventType)
        : [...prev.event_types, eventType],
    }));
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImageUrl.trim()],
    }));
    setNewImageUrl('');
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addPackage = () => {
    if (!newPackage.name || !newPackage.price) {
      toast.error('Please fill package name and price');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        packages: [...prev.pricing.packages, {
          ...newPackage,
          price: parseFloat(newPackage.price),
          guests: newPackage.guests ? parseInt(newPackage.guests) : null,
        }],
      },
    }));
    setNewPackage({ name: '', price: '', guests: '' });
  };

  const removePackage = (index) => {
    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        packages: prev.pricing.packages.filter((_, i) => i !== index),
      },
    }));
  };

  const handleCityChange = (cityName) => {
    setFormData((prev) => ({ ...prev, city: cityName, area: '' }));
    const city = cities.find((c) => c.name === cityName);
    setSelectedCity(city);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.address || !formData.venue_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        capacity_min: parseInt(formData.capacity_min) || 50,
        capacity_max: parseInt(formData.capacity_max) || 500,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        pricing: {
          price_per_plate_veg: parseFloat(formData.pricing.price_per_plate_veg) || null,
          price_per_plate_nonveg: parseFloat(formData.pricing.price_per_plate_nonveg) || null,
          min_spend: parseFloat(formData.pricing.min_spend) || null,
          packages: formData.pricing.packages,
        },
        amenities: {
          ...formData.amenities,
          rooms_available: parseInt(formData.amenities.rooms_available) || 0,
        },
      };

      const response = await api.post('/venues', payload);
      toast.success('Venue submitted for approval!');
      navigate('/team/venue-owner/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Add New Venue"
      breadcrumbs={[
        { label: 'Dashboard', href: '/team/venue-owner/dashboard' },
        { label: 'Add Venue' },
      ]}
    >
      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Basic Information */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Venue Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., The Grand Imperial"
                className="mt-1"
                required
                data-testid="venue-name"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your venue..."
                rows={3}
                className="mt-1"
                data-testid="venue-description"
              />
            </div>
            <div>
              <Label>Venue Type *</Label>
              <Select value={formData.venue_type} onValueChange={(v) => handleInputChange('venue_type', v)}>
                <SelectTrigger className="mt-1" data-testid="venue-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setting *</Label>
              <Select value={formData.indoor_outdoor} onValueChange={(v) => handleInputChange('indoor_outdoor', v)}>
                <SelectTrigger className="mt-1" data-testid="venue-setting">
                  <SelectValue placeholder="Select setting" />
                </SelectTrigger>
                <SelectContent>
                  {INDOOR_OUTDOOR.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>City *</Label>
              <Select value={formData.city} onValueChange={handleCityChange}>
                <SelectTrigger className="mt-1" data-testid="venue-city">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.city_id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Area</Label>
              <Select
                value={formData.area}
                onValueChange={(v) => handleInputChange('area', v)}
                disabled={!selectedCity}
              >
                <SelectTrigger className="mt-1" data-testid="venue-area">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCity?.areas?.map((area) => (
                    <SelectItem key={area.area_id} value={area.name}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Full Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Street address"
                className="mt-1"
                required
                data-testid="venue-address"
              />
            </div>
            <div>
              <Label>Pincode</Label>
              <Input
                value={formData.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value)}
                placeholder="e.g., 110001"
                className="mt-1"
                data-testid="venue-pincode"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Capacity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Guests</Label>
              <Input
                type="number"
                value={formData.capacity_min}
                onChange={(e) => handleInputChange('capacity_min', e.target.value)}
                placeholder="e.g., 50"
                className="mt-1"
                data-testid="capacity-min"
              />
            </div>
            <div>
              <Label>Maximum Guests</Label>
              <Input
                type="number"
                value={formData.capacity_max}
                onChange={(e) => handleInputChange('capacity_max', e.target.value)}
                placeholder="e.g., 500"
                className="mt-1"
                data-testid="capacity-max"
              />
            </div>
          </div>
        </div>

        {/* Event Types */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Event Types</h2>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((event) => (
              <button
                key={event.value}
                type="button"
                onClick={() => handleEventTypeToggle(event.value)}
                className={`px-4 py-2 border transition-colors ${
                  formData.event_types.includes(event.value)
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'border-slate-200 text-[#64748B] hover:border-[#111111]'
                }`}
              >
                {event.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Veg Price per Plate (₹)</Label>
              <Input
                type="number"
                value={formData.pricing.price_per_plate_veg}
                onChange={(e) => handlePricingChange('price_per_plate_veg', e.target.value)}
                placeholder="e.g., 1500"
                className="mt-1"
                data-testid="price-veg"
              />
            </div>
            <div>
              <Label>Non-Veg Price per Plate (₹)</Label>
              <Input
                type="number"
                value={formData.pricing.price_per_plate_nonveg}
                onChange={(e) => handlePricingChange('price_per_plate_nonveg', e.target.value)}
                placeholder="e.g., 2000"
                className="mt-1"
                data-testid="price-nonveg"
              />
            </div>
            <div>
              <Label>Minimum Spend (₹)</Label>
              <Input
                type="number"
                value={formData.pricing.min_spend}
                onChange={(e) => handlePricingChange('min_spend', e.target.value)}
                placeholder="e.g., 300000"
                className="mt-1"
                data-testid="min-spend"
              />
            </div>
          </div>

          {/* Packages */}
          <div className="border-t pt-4">
            <Label className="mb-2 block">Packages (Optional)</Label>
            {formData.pricing.packages.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.pricing.packages.map((pkg, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border">
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-[#64748B]">
                        ₹{pkg.price.toLocaleString('en-IN')} {pkg.guests && `• ${pkg.guests} guests`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removePackage(idx)}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Package name"
                value={newPackage.name}
                onChange={(e) => setNewPackage((p) => ({ ...p, name: e.target.value }))}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Price"
                value={newPackage.price}
                onChange={(e) => setNewPackage((p) => ({ ...p, price: e.target.value }))}
                className="w-32"
              />
              <Input
                type="number"
                placeholder="Guests"
                value={newPackage.guests}
                onChange={(e) => setNewPackage((p) => ({ ...p, guests: e.target.value }))}
                className="w-24"
              />
              <Button type="button" variant="outline" onClick={addPackage}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {AMENITIES.map((amenity) => (
              amenity.key === 'rooms_available' ? (
                <div key={amenity.key}>
                  <Label>{amenity.label}</Label>
                  <Input
                    type="number"
                    value={formData.amenities.rooms_available}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      amenities: { ...prev.amenities, rooms_available: e.target.value }
                    }))}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div key={amenity.key} className="flex items-center gap-2">
                  <Checkbox
                    id={amenity.key}
                    checked={formData.amenities[amenity.key]}
                    onCheckedChange={(checked) => handleAmenityChange(amenity.key, checked)}
                  />
                  <label htmlFor={amenity.key} className="text-sm cursor-pointer">
                    {amenity.label}
                  </label>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Images</h2>
          {formData.images.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              {formData.images.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt="" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Enter image URL"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="flex-1"
              data-testid="image-url"
            />
            <Button type="button" variant="outline" onClick={addImage}>
              <ImagePlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            Add high-quality images of your venue. Recommended: at least 5 images.
          </p>
        </div>

        {/* Policies */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Policies</h2>
          <Textarea
            value={formData.policies}
            onChange={(e) => handleInputChange('policies', e.target.value)}
            placeholder="Enter your venue policies (cancellation, booking terms, etc.)"
            rows={4}
            data-testid="venue-policies"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/team/venue-owner/dashboard')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} data-testid="submit-venue">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default VenueOwnerCreate;
