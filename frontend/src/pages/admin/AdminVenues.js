import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatDate, formatIndianCurrency } from '@/lib/utils';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Users,
  Star,
} from 'lucide-react';

const AdminVenues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchVenues();
    fetchCities();
  }, [statusFilter, cityFilter]);

  const fetchVenues = async () => {
    try {
      // For admin, get all venues including pending
      const params = new URLSearchParams();
      if (cityFilter) params.set('city', cityFilter);
      
      const response = await api.get(`/my-venues`);
      let allVenues = response.data || [];
      
      // Filter by status if specified
      if (statusFilter) {
        allVenues = allVenues.filter(v => v.status === statusFilter);
      }
      
      setVenues(allVenues);
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await api.get('/cities');
      setCities(response.data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const approveVenue = async (venueId) => {
    try {
      await api.put(`/admin/venues/${venueId}/approve`);
      setVenues((prev) =>
        prev.map((v) => (v.venue_id === venueId ? { ...v, status: 'approved' } : v))
      );
      toast.success('Venue approved');
    } catch (error) {
      toast.error('Failed to approve venue');
    }
  };

  const rejectVenue = async (venueId) => {
    try {
      await api.put(`/admin/venues/${venueId}/reject`);
      setVenues((prev) =>
        prev.map((v) => (v.venue_id === venueId ? { ...v, status: 'rejected' } : v))
      );
      toast.success('Venue rejected');
    } catch (error) {
      toast.error('Failed to reject venue');
    }
  };

  const filteredVenues = venues.filter((venue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      venue.name?.toLowerCase().includes(query) ||
      venue.city?.toLowerCase().includes(query) ||
      venue.area?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500 text-white">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="Venue Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Venues' }]}
    >
      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-venues"
            />
          </div>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px]" data-testid="filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter || "__all__"} onValueChange={(v) => setCityFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px]" data-testid="filter-city">
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
      </div>

      {/* Venues Table */}
      <div className="bg-white border border-slate-200">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredVenues.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-[#64748B]">
                    No venues found
                  </td>
                </tr>
              ) : (
                filteredVenues.map((venue) => (
                  <tr key={venue.venue_id} data-testid={`venue-row-${venue.venue_id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={venue.images?.[0] || 'https://via.placeholder.com/60'}
                          alt={venue.name}
                          className="w-14 h-14 object-cover"
                        />
                        <div>
                          <p className="font-medium text-[#111111]">{venue.name}</p>
                          <p className="text-xs text-[#64748B] capitalize">
                            {venue.venue_type?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <MapPin className="w-4 h-4" />
                        {venue.area}, {venue.city}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <Users className="w-4 h-4" />
                        {venue.capacity_min}-{venue.capacity_max}
                      </div>
                    </td>
                    <td className="font-mono">
                      {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[#C8A960] fill-current" />
                        {venue.rating?.toFixed(1) || 'N/A'}
                      </div>
                    </td>
                    <td>{getStatusBadge(venue.status)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedVenue(venue);
                            setDetailsOpen(true);
                          }}
                          data-testid={`view-venue-${venue.venue_id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {venue.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => approveVenue(venue.venue_id)}
                              data-testid={`approve-venue-${venue.venue_id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => rejectVenue(venue.venue_id)}
                              data-testid={`reject-venue-${venue.venue_id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Venue Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{selectedVenue?.name}</DialogTitle>
          </DialogHeader>
          {selectedVenue && (
            <div className="space-y-4 mt-4">
              {selectedVenue.images?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedVenue.images.slice(0, 3).map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-full h-24 object-cover" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#64748B]">Location</p>
                  <p className="font-medium">{selectedVenue.area}, {selectedVenue.city}</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Address</p>
                  <p className="font-medium">{selectedVenue.address}</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Venue Type</p>
                  <p className="font-medium capitalize">{selectedVenue.venue_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Setting</p>
                  <p className="font-medium capitalize">{selectedVenue.indoor_outdoor}</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Capacity</p>
                  <p className="font-medium">{selectedVenue.capacity_min} - {selectedVenue.capacity_max} guests</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Price per Plate (Veg)</p>
                  <p className="font-medium font-mono">
                    {formatIndianCurrency(selectedVenue.pricing?.price_per_plate_veg)}
                  </p>
                </div>
              </div>
              {selectedVenue.description && (
                <div>
                  <p className="text-[#64748B] text-sm">Description</p>
                  <p className="mt-1">{selectedVenue.description}</p>
                </div>
              )}
              {selectedVenue.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      approveVenue(selectedVenue.venue_id);
                      setDetailsOpen(false);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => {
                      rejectVenue(selectedVenue.venue_id);
                      setDetailsOpen(false);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminVenues;
