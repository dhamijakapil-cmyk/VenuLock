import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { api } from '@/context/AuthContext';
import { formatDate, getStageLabel, getStageBadgeClass, formatIndianCurrency } from '@/lib/utils';
import { Search, Calendar, MapPin, Users, ArrowRight } from 'lucide-react';

const MyEnquiriesPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const response = await api.get('/my-enquiries');
        setEnquiries(response.data);
      } catch (error) {
        console.error('Error fetching enquiries:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEnquiries();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header />

      <div className="container-main py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-[#0B1F3B] mb-2">My Enquiries</h1>
          <p className="text-[#64748B]">Track the status of all your venue enquiries</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 border border-slate-200">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-6 skeleton w-1/3" />
                    <div className="h-4 skeleton w-1/2" />
                    <div className="h-4 skeleton w-1/4" />
                  </div>
                  <div className="h-8 w-24 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-[#0B1F3B] mb-2">No enquiries yet</h3>
            <p className="text-[#64748B] mb-6">
              Start exploring venues and submit your first enquiry
            </p>
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 bg-[#0B1F3B] text-white px-6 py-3 font-medium hover:bg-[#153055] transition-colors"
            >
              Browse Venues
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enquiries.map((enquiry) => (
              <div
                key={enquiry.lead_id}
                className="bg-white p-6 border border-slate-200 hover:border-[#C9A227]/30 transition-colors"
                data-testid={`enquiry-${enquiry.lead_id}`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-serif text-lg font-semibold text-[#0B1F3B]">
                        {enquiry.event_type?.replace(/_/g, ' ').charAt(0).toUpperCase() + 
                         enquiry.event_type?.replace(/_/g, ' ').slice(1)} Venue
                      </h3>
                      <Badge className={`${getStageBadgeClass(enquiry.stage)} text-white`}>
                        {getStageLabel(enquiry.stage)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <MapPin className="w-4 h-4" />
                        <span>{enquiry.city}{enquiry.area && `, ${enquiry.area}`}</span>
                      </div>
                      {enquiry.event_date && (
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(enquiry.event_date)}</span>
                        </div>
                      )}
                      {enquiry.guest_count && (
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <Users className="w-4 h-4" />
                          <span>{enquiry.guest_count} guests</span>
                        </div>
                      )}
                      {enquiry.budget && (
                        <div className="text-[#64748B]">
                          Budget: {formatIndianCurrency(enquiry.budget)}
                        </div>
                      )}
                    </div>

                    {enquiry.venue_ids?.length > 0 && (
                      <p className="mt-3 text-sm text-[#64748B]">
                        {enquiry.venue_ids.length} venue(s) enquired
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[#64748B] mb-2">
                      Submitted on {formatDate(enquiry.created_at)}
                    </p>
                    {enquiry.rm_name && (
                      <p className="text-sm text-[#0B1F3B]">
                        RM: {enquiry.rm_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyEnquiriesPage;
