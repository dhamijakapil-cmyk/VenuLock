import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatIndianCurrency, EVENT_TYPES } from '@/lib/utils';
import {
  User,
  Edit,
  Plus,
  X,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ImagePlus,
} from 'lucide-react';

const PlannerDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    services: [],
    price_range_min: '',
    price_range_max: '',
    cities: [],
    portfolio_images: [],
    phone: '',
  });
  
  const [newCity, setNewCity] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, citiesRes] = await Promise.all([
        api.get('/my-planner-profile'),
        api.get('/cities'),
      ]);
      
      setProfile(profileRes.data);
      setAvailableCities(citiesRes.data || []);
      
      if (profileRes.data) {
        setFormData({
          name: profileRes.data.name || '',
          description: profileRes.data.description || '',
          services: profileRes.data.services || [],
          price_range_min: profileRes.data.price_range_min || '',
          price_range_max: profileRes.data.price_range_max || '',
          cities: profileRes.data.cities || [],
          portfolio_images: profileRes.data.portfolio_images || [],
          phone: profileRes.data.phone || '',
        });
      }
    } catch (error) {
      // No profile yet
      const citiesRes = await api.get('/cities');
      setAvailableCities(citiesRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const addCity = () => {
    if (!newCity || formData.cities.includes(newCity)) return;
    setFormData((prev) => ({
      ...prev,
      cities: [...prev.cities, newCity],
    }));
    setNewCity('');
  };

  const removeCity = (city) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.filter((c) => c !== city),
    }));
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      portfolio_images: [...prev.portfolio_images, newImageUrl.trim()],
    }));
    setNewImageUrl('');
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      portfolio_images: prev.portfolio_images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter your business name');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price_range_min: parseFloat(formData.price_range_min) || null,
        price_range_max: parseFloat(formData.price_range_max) || null,
      };

      await api.post('/planners', payload);
      toast.success(profile ? 'Profile updated!' : 'Profile submitted for approval!');
      fetchData();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      title="Partner Console"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !profile ? (
        /* No Profile Yet */
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-20 h-20 bg-[#F0E6D2] rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-[#C8A960]" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#111111] mb-4">
            Create Your Planner Profile
          </h2>
          <p className="text-[#64748B] mb-8">
            Set up your event planner profile to start receiving enquiries from customers.
            Your profile will be reviewed by our team before going live.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="create-profile-btn">
                <Plus className="w-5 h-5 mr-2" />
                Create Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Planner Profile</DialogTitle>
              </DialogHeader>
              <ProfileForm
                formData={formData}
                setFormData={setFormData}
                availableCities={availableCities}
                newCity={newCity}
                setNewCity={setNewCity}
                newImageUrl={newImageUrl}
                setNewImageUrl={setNewImageUrl}
                handleServiceToggle={handleServiceToggle}
                addCity={addCity}
                removeCity={removeCity}
                addImage={addImage}
                removeImage={removeImage}
                handleSubmit={handleSubmit}
                saving={saving}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* Profile Exists */
        <div className="max-w-4xl">
          {/* Status Banner */}
          <div className={`p-4 mb-6 border ${
            profile.status === 'approved' ? 'bg-green-50 border-green-200' :
            profile.status === 'pending' ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusBadge(profile.status)}
                <span className="text-sm text-[#64748B]">
                  {profile.status === 'approved' && 'Your profile is live and visible to customers.'}
                  {profile.status === 'pending' && 'Your profile is under review. We\'ll notify you once approved.'}
                  {profile.status === 'rejected' && 'Your profile was not approved. Please contact support.'}
                </span>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <ProfileForm
                    formData={formData}
                    setFormData={setFormData}
                    availableCities={availableCities}
                    newCity={newCity}
                    setNewCity={setNewCity}
                    newImageUrl={newImageUrl}
                    setNewImageUrl={setNewImageUrl}
                    handleServiceToggle={handleServiceToggle}
                    addCity={addCity}
                    removeCity={removeCity}
                    addImage={addImage}
                    removeImage={removeImage}
                    handleSubmit={handleSubmit}
                    saving={saving}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white border border-slate-200 p-6">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-24 h-24 bg-[#F0E6D2] flex items-center justify-center text-3xl font-serif font-bold text-[#C8A960]">
                {profile.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-2xl font-bold text-[#111111] mb-2">{profile.name}</h2>
                {profile.description && (
                  <p className="text-[#64748B] mb-3">{profile.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  {profile.phone && (
                    <span className="text-[#64748B]">Phone: {profile.phone}</span>
                  )}
                  {profile.price_range_min && profile.price_range_max && (
                    <span className="text-[#64748B]">
                      Price Range: {formatIndianCurrency(profile.price_range_min)} - {formatIndianCurrency(profile.price_range_max)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Services */}
            {profile.services?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-[#111111] mb-2">Services Offered</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.services.map((service) => (
                    <Badge key={service} variant="outline" className="capitalize">
                      {service.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Cities */}
            {profile.cities?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-[#111111] mb-2">Cities Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.cities.map((city) => (
                    <Badge key={city} className="bg-[#F0E6D2] text-[#111111]">
                      <MapPin className="w-3 h-3 mr-1" />
                      {city}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio_images?.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#111111] mb-2">Portfolio</h3>
                <div className="grid grid-cols-4 gap-4">
                  {profile.portfolio_images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Portfolio ${idx + 1}`}
                      className="w-full h-24 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// Profile Form Component
const ProfileForm = ({
  formData,
  setFormData,
  availableCities,
  newCity,
  setNewCity,
  newImageUrl,
  setNewImageUrl,
  handleServiceToggle,
  addCity,
  removeCity,
  addImage,
  removeImage,
  handleSubmit,
  saving,
}) => {
  return (
    <div className="space-y-6 mt-4">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Business Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Dream Events Co."
            className="mt-1"
            data-testid="planner-name"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Tell us about your services..."
            rows={3}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            className="mt-1"
          />
        </div>
      </div>

      {/* Services */}
      <div>
        <Label className="mb-2 block">Services Offered</Label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((event) => (
            <button
              key={event.value}
              type="button"
              onClick={() => handleServiceToggle(event.value)}
              className={`px-3 py-1.5 text-sm border transition-colors ${
                formData.services.includes(event.value)
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'border-slate-200 text-[#64748B] hover:border-[#111111]'
              }`}
            >
              {event.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Min Price (₹)</Label>
          <Input
            type="number"
            value={formData.price_range_min}
            onChange={(e) => setFormData((prev) => ({ ...prev, price_range_min: e.target.value }))}
            placeholder="e.g., 50000"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Max Price (₹)</Label>
          <Input
            type="number"
            value={formData.price_range_max}
            onChange={(e) => setFormData((prev) => ({ ...prev, price_range_max: e.target.value }))}
            placeholder="e.g., 500000"
            className="mt-1"
          />
        </div>
      </div>

      {/* Cities */}
      <div>
        <Label className="mb-2 block">Cities Covered</Label>
        {formData.cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.cities.map((city) => (
              <Badge key={city} className="bg-[#F0E6D2] text-[#111111] pr-1">
                {city}
                <button onClick={() => removeCity(city)} className="ml-2 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            className="flex-1 border border-slate-200 px-3 py-2 bg-[#F9F9F7]"
          >
            <option value="">Select city</option>
            {availableCities.map((city) => (
              <option key={city.city_id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={addCity}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Portfolio Images */}
      <div>
        <Label className="mb-2 block">Portfolio Images</Label>
        {formData.portfolio_images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            {formData.portfolio_images.map((url, idx) => (
              <div key={idx} className="relative">
                <img src={url} alt="" className="w-full h-16 object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
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
            <ImagePlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full" disabled={saving} data-testid="save-profile-btn">
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};

export default PlannerDashboard;
