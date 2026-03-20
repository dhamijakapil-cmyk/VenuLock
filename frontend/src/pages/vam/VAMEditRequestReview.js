import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle, XCircle, ArrowRight, Send, MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const FIELD_LABELS = {
  name: 'Venue Name',
  description: 'Description',
  venue_type: 'Venue Type',
  address: 'Address',
  city: 'City',
  map_link: 'Google Maps Link',
  capacity_min: 'Min Capacity',
  capacity_max: 'Max Capacity',
  per_person_price: 'Per Person Price',
  min_spend: 'Minimum Spend',
  amenities: 'Amenities',
  vibes: 'Vibes',
};

const VAMEditRequestReview = () => {
  const { editRequestId } = useParams();
  const navigate = useNavigate();
  const [er, setEr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/venue-onboarding/edit-request/${editRequestId}`);
        setEr(res.data);
      } catch {
        toast.error('Edit request not found');
        navigate('/team/vam/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [editRequestId, navigate]);

  const handleReview = async (action) => {
    setSubmitting(true);
    try {
      await api.patch(`/venue-onboarding/edit-request/${editRequestId}/review`, {
        action,
        notes,
      });
      toast.success(action === 'approve' ? 'Edit request approved — changes applied to venue' : 'Edit request rejected');
      navigate('/team/vam/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Review Edit Request">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!er) return null;

  const isPending = er.status === 'pending';
  const statusBadge = {
    pending: { label: 'Pending Review', bg: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', bg: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', bg: 'bg-red-100 text-red-700' },
  };
  const badge = statusBadge[er.status] || statusBadge.pending;

  return (
    <DashboardLayout
      title="Review Edit Request"
      breadcrumbs={[{ label: 'Review Queue', href: '/team/vam/dashboard' }, { label: er.venue_name || 'Edit Request' }]}
    >
      <div className="max-w-2xl mx-auto" data-testid="vam-edit-request-review">
        {/* Back */}
        <button onClick={() => navigate('/team/vam/dashboard')} className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#111111] mb-4" data-testid="vam-er-back">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#111111]">{er.venue_name}</h2>
            <span className={cn("text-xs px-2 py-1 rounded-full font-bold", badge.bg)}>{badge.label}</span>
          </div>
          <p className="text-sm text-[#64748B]">
            Submitted by <span className="font-medium text-[#111111]">{er.owner_name}</span> &middot; {er.created_at ? formatDistanceToNow(new Date(er.created_at), { addSuffix: true }) : ''}
          </p>
          {er.reason && (
            <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#64748B]"><span className="font-semibold">Reason:</span> {er.reason}</p>
            </div>
          )}
        </div>

        {/* Changes Diff */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4" data-testid="changes-diff">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#0B0B0D]">Proposed Changes ({Object.keys(er.changes || {}).length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {Object.entries(er.changes || {}).map(([field, change]) => (
              <div key={field} className="p-4">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                  {FIELD_LABELS[field] || field}
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-[10px] text-red-500 font-semibold mb-1">CURRENT</p>
                    <p className="text-sm text-red-700 break-words">
                      {Array.isArray(change.old) ? change.old.join(', ') : String(change.old || '—')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-300 rotate-90 md:rotate-0" />
                  </div>
                  <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-[10px] text-emerald-500 font-semibold mb-1">PROPOSED</p>
                    <p className="text-sm text-emerald-700 break-words">
                      {Array.isArray(change.new) ? change.new.join(', ') : String(change.new || '—')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Actions */}
        {isPending && (
          <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid="vam-er-actions">
            <h3 className="text-sm font-bold text-[#0B0B0D] mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Review Action
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add review notes (optional)..."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50 resize-none mb-4"
              data-testid="vam-er-notes"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => handleReview('approve')}
                disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="vam-er-approve-btn"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                {submitting ? 'Processing...' : 'Approve Changes'}
              </Button>
              <Button
                onClick={() => handleReview('reject')}
                disabled={submitting}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                data-testid="vam-er-reject-btn"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Already reviewed */}
        {!isPending && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-[#64748B]">
              This request was <span className="font-semibold">{er.status}</span>
              {er.reviewed_at && ` ${formatDistanceToNow(new Date(er.reviewed_at), { addSuffix: true })}`}
              {er.reviewer_name && ` by ${er.reviewer_name}`}.
            </p>
            {er.reviewer_notes && (
              <p className="text-sm text-[#111111] mt-1 italic">"{er.reviewer_notes}"</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VAMEditRequestReview;
