import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const AdminCities = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [expandedCity, setExpandedCity] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    areas: [],
  });
  const [newArea, setNewArea] = useState({ name: '', pincode: '' });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await api.get('/venues/cities');
      setCities(response.data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.state) {
      toast.error('Please fill in city name and state');
      return;
    }

    try {
      if (editingCity) {
        await api.put(`/cities/${editingCity.city_id}`, formData);
        toast.success('City updated');
      } else {
        await api.post('/cities', formData);
        toast.success('City added');
      }
      fetchCities();
      resetForm();
    } catch (error) {
      toast.error('Failed to save city');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', state: '', areas: [] });
    setNewArea({ name: '', pincode: '' });
    setEditingCity(null);
    setDialogOpen(false);
  };

  const openEditDialog = (city) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      state: city.state,
      areas: city.areas || [],
    });
    setDialogOpen(true);
  };

  const addArea = () => {
    if (!newArea.name) {
      toast.error('Please enter area name');
      return;
    }
    const areaId = `area_${Date.now()}`;
    setFormData((prev) => ({
      ...prev,
      areas: [...prev.areas, { ...newArea, area_id: areaId }],
    }));
    setNewArea({ name: '', pincode: '' });
  };

  const removeArea = (areaId) => {
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.filter((a) => a.area_id !== areaId),
    }));
  };

  return (
    <DashboardLayout
      title="City Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/team/admin/dashboard' }, { label: 'Cities' }]}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-[#64748B]">
          Manage cities and areas for venue listings
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              data-testid="add-city-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add City
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCity ? 'Edit City' : 'Add City'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>City Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Delhi"
                  className="mt-1"
                  data-testid="city-name"
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="e.g., Delhi"
                  className="mt-1"
                  data-testid="city-state"
                />
              </div>
              
              {/* Areas */}
              <div>
                <Label>Areas</Label>
                <div className="mt-2 space-y-2">
                  {formData.areas.map((area) => (
                    <div
                      key={area.area_id}
                      className="flex items-center justify-between p-2 bg-slate-50 border"
                    >
                      <div>
                        <p className="font-medium text-sm">{area.name}</p>
                        {area.pincode && (
                          <p className="text-xs text-[#64748B]">PIN: {area.pincode}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArea(area.area_id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Area name"
                    value={newArea.name}
                    onChange={(e) => setNewArea((prev) => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder="PIN"
                    value={newArea.pincode}
                    onChange={(e) => setNewArea((prev) => ({ ...prev, pincode: e.target.value }))}
                    className="w-24"
                  />
                  <Button variant="outline" onClick={addArea}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" data-testid="save-city-btn">
                {editingCity ? 'Update City' : 'Add City'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cities List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#111111] mb-2">No cities yet</h3>
            <p className="text-[#64748B]">Add your first city to get started</p>
          </div>
        ) : (
          cities.map((city) => (
            <div
              key={city.city_id}
              className="bg-white border border-slate-200"
              data-testid={`city-${city.city_id}`}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedCity(expandedCity === city.city_id ? null : city.city_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F0E6D2] flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#D4B36A]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111111]">{city.name}</h3>
                    <p className="text-sm text-[#64748B]">
                      {city.state} • {city.areas?.length || 0} areas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(city);
                    }}
                    data-testid={`edit-city-${city.city_id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {expandedCity === city.city_id ? (
                    <ChevronUp className="w-5 h-5 text-[#64748B]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#64748B]" />
                  )}
                </div>
              </div>

              {/* Expanded Areas */}
              {expandedCity === city.city_id && city.areas?.length > 0 && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {city.areas.map((area) => (
                      <div
                        key={area.area_id}
                        className="bg-white p-3 border border-slate-200"
                      >
                        <p className="font-medium text-sm text-[#111111]">{area.name}</p>
                        {area.pincode && (
                          <p className="text-xs text-[#64748B]">PIN: {area.pincode}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCities;
