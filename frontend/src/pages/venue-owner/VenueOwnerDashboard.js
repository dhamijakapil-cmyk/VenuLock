import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { formatDate, formatIndianCurrency, getStageBadgeClass, getStageLabel } from '@/lib/utils';
import {
  Plus,
  Building2,
  Eye,
  Edit,
  FileText,
  TrendingUp,
  Clock,
  Star,
  MapPin,
  Users,
} from 'lucide-react';

const VenueOwnerDashboard = () => {
  const [venues, setVenues] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const venuesRes = await api.get('/my-venues');
      setVenues(venuesRes.data || []);
      
      // Fetch enquiries for each venue
      const allEnquiries = [];
      for (const venue of venuesRes.data || []) {
        try {
          const enquiriesRes = await api.get(`/venue-enquiries/${venue.venue_id}`);
          allEnquiries.push(...(enquiriesRes.data || []).map(e => ({ ...e, venue_name: venue.name })));
        } catch (e) {
          // Skip if error
        }
      }
      setEnquiries(allEnquiries);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvedVenues = venues.filter(v => v.status === 'approved').length;
  const pendingVenues = venues.filter(v => v.status === 'pending').length;
  const totalEnquiries = enquiries.length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white">Live</Badge>;
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
      title="Partner Console"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Venues</p>
              <p className="stat-value">{venues.length}</p>
            </div>
            <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#C9A227]" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Live Venues</p>
              <p className="stat-value text-green-600">{approvedVenues}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pending Approval</p>
              <p className="stat-value text-amber-600">{pendingVenues}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Enquiries</p>
              <p className="stat-value text-blue-600">{totalEnquiries}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Venue CTA */}
      <div className="flex justify-end mb-6">
        <Button asChild data-testid="add-venue-btn">
          <Link to="/venue-owner/create">
            <Plus className="w-4 h-4 mr-2" />
            Add New Venue
          </Link>
        </Button>
      </div>

      {/* My Venues */}
      <div className="bg-white border border-slate-200 mb-8">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">My Venues</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#0B1F3B] mb-2">No venues yet</h3>
            <p className="text-[#64748B] mb-4">Add your first venue to start receiving enquiries</p>
            <Button asChild>
              <Link to="/venue-owner/create">
                <Plus className="w-4 h-4 mr-2" />
                Add Venue
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {venues.map((venue) => (
              <div
                key={venue.venue_id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                data-testid={`venue-${venue.venue_id}`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={venue.images?.[0] || 'https://via.placeholder.com/80'}
                    alt={venue.name}
                    className="w-20 h-20 object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#0B1F3B]">{venue.name}</h3>
                      {getStatusBadge(venue.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {venue.area}, {venue.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {venue.capacity_min}-{venue.capacity_max}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[#C9A227]" />
                        {venue.rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm font-mono mt-1">
                      {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}/plate
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/venues/${venue.venue_id}`}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/venue-owner/edit/${venue.venue_id}`}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Enquiries */}
      <div className="bg-white border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">Recent Client Cases</h2>
        </div>
        {enquiries.length === 0 ? (
          <div className="text-center py-12 text-[#64748B]">
            No client cases yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Venue</th>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.slice(0, 10).map((enquiry) => (
                  <tr key={enquiry.lead_id}>
                    <td>
                      <p className="font-medium text-[#0B1F3B]">{enquiry.customer_name}</p>
                      <p className="text-sm text-[#64748B]">{enquiry.customer_email}</p>
                    </td>
                    <td>{enquiry.venue_name}</td>
                    <td className="capitalize">{enquiry.event_type?.replace(/_/g, ' ')}</td>
                    <td>{enquiry.event_date ? formatDate(enquiry.event_date) : '--'}</td>
                    <td>
                      <Badge className={`${getStageBadgeClass(enquiry.stage)} text-white`}>
                        {getStageLabel(enquiry.stage)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueOwnerDashboard;
