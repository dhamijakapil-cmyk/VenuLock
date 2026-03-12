import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Save, Plus, X, ImagePlus, HelpCircle } from 'lucide-react';

const VenueOwnerEdit = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  
  const [formData, setFormData] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newPackage, setNewPackage] = useState({ name: '', price: '', guests: '' });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  useEffect(() => {
    fetchData();
  }, [venueId]);

  const fetchData = async () => {
    try {
      const [venueRes, citiesRes] = await Promise.all([
        api.get(`/venues/${venueId}`),
        api.get('/cities'),
      ]);
      
      const venue = venueRes.data;
      setCities(citiesRes.data || []);
      
      const city = citiesRes.data?.find((c) => c.name === venue.city);
      setSelectedCity(city);
      
      setFormData({
        name: venue.name || '',
        description: venue.description || '',
        city: venue.city || '',
        area: venue.area || '',
        address: venue.address || '',
        pincode: venue.pincode || '',
        latitude: venue.latitude || 28.6139,
        longitude: venue.longitude || 77.2090,
        event_types: venue.event_types || [],
        venue_type: venue.venue_type || '',
        indoor_outdoor: venue.indoor_outdoor || '',
        capacity_min: venue.capacity_min || '',
        capacity_max: venue.capacity_max || '',
        pricing: {
          price_per_plate_veg: venue.pricing?.price_per_plate_veg || '',
          price_per_plate_nonveg: venue.pricing?.price_per_plate_nonveg || '',
          min_spend: venue.pricing?.min_spend || '',
          packages: venue.pricing?.packages || [],
        },
        amenities: venue.amenities || {
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
        images: venue.images || [],
        policies: venue.policies || '',
        faqs: venue.faqs || [],
      });
    } catch (error) {
      console.error('Error fetching venue:', error);
      toast.error('Failed to load venue');
    } finally {
      setLoading(false);
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

  const addFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error('Please fill both question and answer');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: newFaq.question.trim(), answer: newFaq.answer.trim() }],
    }));
    setNewFaq({ question: '', answer: '' });
  };

  const removeFaq = (index) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const handleCityChange = (cityName) => {
    setFormData((prev) => ({ ...prev, city: cityName, area: '' }));
    const city = cities.find((c) => c.name === cityName);
    setSelectedCity(city);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        pincode: formData.pincode,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        event_types: formData.event_types,
        venue_type: formData.venue_type,
        indoor_outdoor: formData.indoor_outdoor,
        capacity_min: parseInt(formData.capacity_min) || 50,
        capacity_max: parseInt(formData.capacity_max) || 500,
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
        images: formData.images,
        policies: formData.policies,
        faqs: formData.faqs || [],
      };

      await api.put(`/venues/${venueId}`, payload);
      toast.success('Venue updated successfully!');
      navigate('/venue-owner/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update venue');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <DashboardLayout title="Edit Venue" breadcrumbs={[{ label: 'Dashboard', href: '/venue-owner/dashboard' }, { label: 'Edit Venue' }]}>
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Edit: ${formData.name}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/venue-owner/dashboard' },
        { label: 'Edit Venue' },
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
                className="mt-1"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Venue Type *</Label>
              <Select value={formData.venue_type} onValueChange={(v) => handleInputChange('venue_type', v)}>
                <SelectTrigger className="mt-1">
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
                <SelectTrigger className="mt-1">
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

        {/* Location (Read-only city) */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input value={formData.city} disabled className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label>Area</Label>
              <Input value={formData.area} disabled className="mt-1 bg-slate-50" />
            </div>
            <div className="md:col-span-2">
              <Label>Full Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="mt-1"
                required
              />
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
                className="mt-1"
              />
            </div>
            <div>
              <Label>Maximum Guests</Label>
              <Input
                type="number"
                value={formData.capacity_max}
                onChange={(e) => handleInputChange('capacity_max', e.target.value)}
                className="mt-1"
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
                className="mt-1"
              />
            </div>
            <div>
              <Label>Non-Veg Price per Plate (₹)</Label>
              <Input
                type="number"
                value={formData.pricing.price_per_plate_nonveg}
                onChange={(e) => handlePricingChange('price_per_plate_nonveg', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Minimum Spend (₹)</Label>
              <Input
                type="number"
                value={formData.pricing.min_spend}
                onChange={(e) => handlePricingChange('min_spend', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Packages */}
          <div className="border-t pt-4">
            <Label className="mb-2 block">Packages</Label>
            {formData.pricing.packages.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.pricing.packages.map((pkg, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border">
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-[#64748B]">
                        ₹{pkg.price?.toLocaleString('en-IN')} {pkg.guests && `• ${pkg.guests} guests`}
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
                    className="mt-1"
                  />
                </div>
              ) : (
                <div key={amenity.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-${amenity.key}`}
                    checked={formData.amenities[amenity.key]}
                    onCheckedChange={(checked) => handleAmenityChange(amenity.key, checked)}
                  />
                  <label htmlFor={`edit-${amenity.key}`} className="text-sm cursor-pointer">
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
            />
            <Button type="button" variant="outline" onClick={addImage}>
              <ImagePlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Policies */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold text-[#111111] mb-4">Policies</h2>
          <Textarea
            value={formData.policies}
            onChange={(e) => handleInputChange('policies', e.target.value)}
            rows={4}
          />
        </div>

        {/* FAQs */}
        <div className="bg-white border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-[#D4B36A]" />
            <h2 className="font-serif text-lg font-semibold text-[#111111]">Frequently Asked Questions</h2>
          </div>
          <p className="text-sm text-[#64748B] mb-4">
            Add custom FAQs to help customers learn more about your venue. These will appear on your venue's public page.
          </p>
          
          {formData.faqs && formData.faqs.length > 0 && (
            <div className="space-y-3 mb-4">
              {formData.faqs.map((faq, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-[#111111] mb-1">Q: {faq.question}</p>
                      <p className="text-sm text-[#64748B]">A: {faq.answer}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFaq(idx)} className="flex-shrink-0">
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-3 p-4 bg-[#F9F9F7] border border-dashed border-slate-300 rounded-lg">
            <div>
              <Label>Question</Label>
              <Input
                placeholder="e.g., Do you allow outside decorators?"
                value={newFaq.question}
                onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea
                placeholder="e.g., Yes, we allow outside decorators with prior approval. Please coordinate with our events team."
                value={newFaq.answer}
                onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <Button type="button" variant="outline" onClick={addFaq} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/venue-owner/dashboard')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default VenueOwnerEdit;
