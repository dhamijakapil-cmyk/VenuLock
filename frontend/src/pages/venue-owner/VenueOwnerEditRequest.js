import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Send, Info } from 'lucide-react';

const EDITABLE_FIELDS = [
  { key: 'name', label: 'Venue Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'venue_type', label: 'Venue Type', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'map_link', label: 'Google Maps Link', type: 'text' },
  { key: 'capacity_min', label: 'Min Capacity', type: 'number' },
  { key: 'capacity_max', label: 'Max Capacity', type: 'number' },
  { key: 'per_person_price', label: 'Per Person Price', type: 'number' },
  { key: 'min_spend', label: 'Minimum Spend', type: 'number' },
];

const VenueOwnerEditRequest = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changes, setChanges] = useState({});
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const res = await api.get('/my-venues');
        const venueData = (res.data || []).find(v => v.venue_id === venueId);
        if (venueData) {
          setVenue(venueData);
          // Pre-populate with current values
          const initial = {};
          EDITABLE_FIELDS.forEach(f => {
            initial[f.key] = venueData[f.key] ?? '';
          });
          setChanges(initial);
        } else {
          toast.error('Venue not found');
          navigate('/team/venue-owner/dashboard');
        }
      } catch {
        toast.error('Failed to load venue');
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [venueId, navigate]);

  const hasChanges = () => {
    if (!venue) return false;
    return EDITABLE_FIELDS.some(f => {
      const current = venue[f.key] ?? '';
      const updated = changes[f.key] ?? '';
      return String(current) !== String(updated);
    });
  };

  const getChangedFields = () => {
    if (!venue) return {};
    const diff = {};
    EDITABLE_FIELDS.forEach(f => {
      const current = venue[f.key] ?? '';
      const updated = changes[f.key] ?? '';
      if (String(current) !== String(updated)) {
        diff[f.key] = f.type === 'number' ? Number(updated) : updated;
      }
    });
    return diff;
  };

  const handleSubmit = async () => {
    if (!hasChanges()) {
      toast.error('No changes detected');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/venue-onboarding/edit-request', {
        venue_id: venueId,
        changes: getChangedFields(),
        reason,
      });
      toast.success('Edit request submitted for review');
      navigate('/team/venue-owner/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Request Changes" breadcrumbs={[{ label: 'My Venues', href: '/team/venue-owner/dashboard' }, { label: 'Loading...' }]}>
        <div className="max-w-2xl mx-auto space-y-4">
          {[1,2,3].map(i => <div key={i} className="bg-white border border-slate-200 rounded-xl h-16 animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Request Changes"
      breadcrumbs={[{ label: 'My Venues', href: '/team/venue-owner/dashboard' }, { label: venue?.name || 'Edit Request' }]}
    >
      <div className="max-w-2xl mx-auto" data-testid="edit-request-page">
        {/* Back + Header */}
        <button onClick={() => navigate('/team/venue-owner/dashboard')} className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#111111] mb-4" data-testid="edit-request-back">
          <ArrowLeft className="w-4 h-4" />
          Back to My Venues
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-semibold text-[#111111] mb-1">{venue?.name}</h2>
          <p className="text-sm text-[#64748B]">
            Edit the fields below. Your changes will be sent to our acquisitions team for review.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Changes are not applied immediately. Once approved by the team, they will reflect on your public venue page.
          </p>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4 mb-6">
          {EDITABLE_FIELDS.map(field => {
            const currentVal = venue?.[field.key] ?? '';
            const newVal = changes[field.key] ?? '';
            const isChanged = String(currentVal) !== String(newVal);

            return (
              <div key={field.key} className={`bg-white border rounded-xl p-4 transition-all ${isChanged ? 'border-[#D4B36A] ring-1 ring-[#D4B36A]/20' : 'border-slate-200'}`}>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  {field.label}
                  {isChanged && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0E6D2] text-[#111111] normal-case tracking-normal">Changed</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={newVal}
                    onChange={(e) => setChanges({ ...changes, [field.key]: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50 resize-none"
                    data-testid={`field-${field.key}`}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={newVal}
                    onChange={(e) => setChanges({ ...changes, [field.key]: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50"
                    data-testid={`field-${field.key}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Reason */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">Reason for Changes (Optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Updated capacity after recent renovation..."
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50 resize-none"
            data-testid="edit-request-reason"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/team/venue-owner/dashboard')} data-testid="edit-request-cancel-btn">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges() || submitting}
            className="bg-[#111111] hover:bg-[#333333] text-white disabled:opacity-40"
            data-testid="edit-request-submit-btn"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueOwnerEditRequest;
