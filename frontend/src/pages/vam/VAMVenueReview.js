import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, MapPin, Users,
  DollarSign, Phone, Mail, User, Image, Video, Calendar, Sparkles,
  Building2,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const VAMVenueReview = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchVenue(); }, [venueId]);

  const fetchVenue = async () => {
    try {
      const res = await api.get(`/venue-onboarding/${venueId}`);
      setVenue(res.data);
    } catch {
      toast.error('Failed to load venue');
      navigate('/vam/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action) => {
    if (action === 'request_changes' && !notes.trim()) {
      toast.error('Please provide notes for the specialist');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/venue-onboarding/${venueId}/review`, { action, notes });
      const labels = { approve: 'Approved', request_changes: 'Changes requested', reject: 'Rejected' };
      toast.success(`Venue ${labels[action]}`);
      navigate('/vam/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Venue Review">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!venue) return null;

  const isSubmitted = venue.status === 'submitted';

  return (
    <DashboardLayout
      title="Review Venue"
      breadcrumbs={[{ label: 'Acquisition Manager', href: '/vam/dashboard' }, { label: venue.name }]}
    >
      <div style={sans}>
        {/* Back button */}
        <button
          onClick={() => navigate('/vam/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B0B0D] mb-4 transition-colors"
          data-testid="vam-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        {/* Status Badge */}
        <div className={cn(
          "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold mb-4",
          venue.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
          venue.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
          venue.status === 'changes_requested' ? 'bg-orange-100 text-orange-700' :
          venue.status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-slate-100 text-slate-600'
        )}>
          {venue.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
           venue.status === 'submitted' ? <AlertTriangle className="w-3 h-3" /> : null}
          {venue.status?.replace(/_/g, ' ').toUpperCase()}
        </div>

        {/* Photo Gallery */}
        {venue.photos?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-[#0B0B0D] mb-2 flex items-center gap-1.5">
              <Image className="w-4 h-4 text-[#D4B36A]" /> Photos ({venue.photos.length})
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {venue.photos.map((p, i) => (
                <div key={p.id || i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {venue.videos?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-[#0B0B0D] mb-2 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-[#D4B36A]" /> Videos ({venue.videos.length})
            </h3>
            <div className="space-y-2">
              {venue.videos.map((v, i) => (
                <div key={v.id || i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                  <Video className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-600">{v.caption || `Video ${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Venue Details Grid */}
        <div className="space-y-4 mb-5">
          {/* Basic Info */}
          <Section title="Basic Info" icon={Building2}>
            <Row label="Name" value={venue.name} />
            <Row label="Type" value={venue.venue_type} />
            <Row label="Description" value={venue.description} />
          </Section>

          {/* Location */}
          <Section title="Location" icon={MapPin}>
            <Row label="Address" value={venue.address} />
            <Row label="City" value={venue.city} />
            {venue.map_link && <Row label="Map" value={<a href={venue.map_link} target="_blank" rel="noreferrer" className="text-[#D4B36A] hover:underline">{venue.map_link}</a>} />}
          </Section>

          {/* Capacity & Pricing */}
          <Section title="Capacity & Pricing" icon={Users}>
            <Row label="Guests" value={venue.capacity_min && venue.capacity_max ? `${venue.capacity_min} - ${venue.capacity_max}` : 'Not set'} />
            <Row label="Per Person" value={venue.per_person_price ? `Rs ${venue.per_person_price.toLocaleString()}` : 'Not set'} />
            <Row label="Min Spend" value={venue.min_spend ? `Rs ${venue.min_spend.toLocaleString()}` : 'Not set'} />
          </Section>

          {/* Features */}
          <Section title="Amenities & Vibes" icon={Sparkles}>
            <Row label="Amenities" value={venue.amenities?.length ? venue.amenities.join(', ') : 'None'} />
            <Row label="Vibes" value={venue.vibes?.length ? venue.vibes.join(', ') : 'None'} />
          </Section>

          {/* Owner Contact */}
          <Section title="Owner Contact" icon={User}>
            <Row label="Name" value={venue.owner_name} />
            <Row label="Phone" value={venue.owner_phone} />
            <Row label="Email" value={venue.owner_email} />
          </Section>

          {/* Metadata */}
          <Section title="Submission Info" icon={Calendar}>
            <Row label="Submitted by" value={venue.created_by_name} />
            <Row label="Submitted at" value={venue.submitted_at ? new Date(venue.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not submitted'} />
            {venue.reviewed_by_name && <Row label="Reviewed by" value={venue.reviewed_by_name} />}
            {venue.review_notes && <Row label="Review Notes" value={venue.review_notes} />}
          </Section>
        </div>

        {/* Review Actions — only for submitted venues */}
        {isSubmitted && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6" data-testid="vam-review-actions">
            <h3 className="text-sm font-bold text-[#0B0B0D] mb-3">Review Decision</h3>
            <div className="mb-3">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Notes for Specialist (required for changes)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add review notes, feedback, or change requests..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 resize-none"
                data-testid="vam-review-notes"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleReview('approve')}
                disabled={actionLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-lg"
                data-testid="vam-approve-btn"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve & Publish
              </Button>
              <Button
                onClick={() => handleReview('request_changes')}
                disabled={actionLoading}
                variant="outline"
                className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 h-10 rounded-lg"
                data-testid="vam-changes-btn"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" /> Request Changes
              </Button>
              <Button
                onClick={() => handleReview('reject')}
                disabled={actionLoading}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 h-10 rounded-lg px-3"
                data-testid="vam-reject-btn"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <h3 className="text-xs font-bold text-[#0B0B0D] mb-2 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-[#D4B36A]" /> {title}
    </h3>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-[10px] text-slate-400 w-20 shrink-0 pt-0.5">{label}</span>
    <span className="text-xs text-[#0B0B0D] flex-1">{value || <span className="text-slate-300">Not set</span>}</span>
  </div>
);

export default VAMVenueReview;
