import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft, Search, ChevronRight, Camera, FileText, IndianRupee,
  MapPin, Phone, User, Clock, Zap, Filter, CheckCircle2, XCircle,
  AlertCircle, Image as ImageIcon,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'submitted_for_review', label: 'Submitted' },
  { value: 'sent_back_to_specialist', label: 'Sent Back' },
  { value: 'under_data_refinement', label: 'Refining' },
  { value: 'rejected', label: 'Rejected' },
];

function posture(completeness) {
  if (!completeness) return { mandatory: 'missing', media: 'missing', commercial: 'missing', followup: 'missing' };
  const m = completeness.mandatory;
  const med = completeness.media;
  const c = completeness.commercial;
  const f = completeness.followup;
  return {
    mandatory: m?.complete ? 'complete' : 'incomplete',
    media: med?.complete ? 'complete' : med?.count > 0 ? 'weak' : 'missing',
    commercial: c?.complete ? 'complete' : c?.filled > 0 ? 'partial' : 'missing',
    followup: f?.complete ? 'complete' : f?.filled > 0 ? 'partial' : 'missing',
  };
}

const POSTURE_STYLE = {
  complete: 'bg-emerald-50 text-emerald-700',
  incomplete: 'bg-red-50 text-red-600',
  weak: 'bg-amber-50 text-amber-700',
  partial: 'bg-amber-50 text-amber-700',
  missing: 'bg-slate-100 text-slate-500',
};

function PosturePill({ label, value }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${POSTURE_STYLE[value] || POSTURE_STYLE.missing}`} style={sans}>
      {value === 'complete' ? <CheckCircle2 className="w-2.5 h-2.5" /> : value === 'missing' || value === 'incomplete' ? <XCircle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

export default function TeamLeadQueue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [acquisitions, setAcquisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted_for_review');
  const [stats, setStats] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const [listRes, statsRes] = await Promise.all([
        api.get(`/acquisitions/${params}`),
        api.get('/acquisitions/stats/summary'),
      ]);
      setAcquisitions(listRes.data.acquisitions || []);
      setStats(statsRes.data.by_status || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submittedCount = stats.submitted_for_review || 0;
  const sentBackCount = stats.sent_back_to_specialist || 0;
  const refiningCount = stats.under_data_refinement || 0;
  const rejectedCount = stats.rejected || 0;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="team-lead-queue">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <button onClick={() => navigate('/team/dashboard')} className="flex items-center gap-1.5 text-white/50 mb-2" data-testid="queue-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px]" style={sans}>Dashboard</span>
        </button>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]" style={sans}>Acquisition Review</p>
        <h1 className="text-[20px] font-bold text-white" style={sans}>Review Queue</h1>

        {/* Stats row */}
        <div className="flex gap-2 mt-3">
          {[
            { label: 'To Review', count: submittedCount, filter: 'submitted_for_review' },
            { label: 'Sent Back', count: sentBackCount, filter: 'sent_back_to_specialist' },
            { label: 'Refining', count: refiningCount, filter: 'under_data_refinement' },
            { label: 'Rejected', count: rejectedCount, filter: 'rejected' },
          ].map(s => (
            <button key={s.label}
              onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
              className={`flex-1 rounded-xl px-2 py-2 transition-all ${
                statusFilter === s.filter ? 'bg-[#D4B36A] text-[#0B0B0D]' : 'bg-white/[0.08] text-white/70'
              }`} data-testid={`stat-${s.filter}`}>
              <span className="text-[9px] font-medium block" style={sans}>{s.label}</span>
              <span className={`text-[20px] font-bold ${statusFilter === s.filter ? 'text-[#0B0B0D]' : 'text-white'}`} style={sans}>{s.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4 pb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-bold text-[#0B0B0D]" style={sans}>
            {STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label || 'All'} ({acquisitions.length})
          </h2>
          {statusFilter && (
            <button onClick={() => setStatusFilter('')} className="text-[10px] text-[#D4B36A] font-bold" style={sans}>Show All</button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : acquisitions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] text-slate-400" style={sans}>No records in this queue</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {acquisitions.map(acq => {
              const p = posture(acq.completeness);
              const isQuick = acq.capture_mode === 'quick';
              const submitted = acq.history?.find(h => h.status === 'submitted_for_review');
              const submittedAt = submitted?.timestamp;
              return (
                <button key={acq.acquisition_id}
                  onClick={() => navigate(`/team/field/review/${acq.acquisition_id}`)}
                  className="w-full bg-white rounded-xl border border-black/[0.05] p-3.5 text-left active:bg-slate-50 transition-colors"
                  data-testid={`review-card-${acq.acquisition_id}`}>
                  {/* Row 1: Name + Status */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate" style={sans}>{acq.venue_name}</h3>
                        {isQuick && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#D4B36A]/10 rounded text-[8px] font-bold text-[#8B7330] flex-shrink-0" style={sans}>
                            <Zap className="w-2.5 h-2.5" /> QUICK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[10px] text-[#64748B]" style={sans}>
                          <MapPin className="w-3 h-3" strokeWidth={1.5} />
                          {acq.locality ? `${acq.locality}, ` : ''}{acq.city || '—'}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#64748B]" style={sans}>
                          <User className="w-3 h-3" strokeWidth={1.5} />
                          {acq.created_by_name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                  </div>

                  {/* Row 2: Posture pills */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <PosturePill label="Fields" value={p.mandatory} />
                    <PosturePill label="Media" value={p.media} />
                    <PosturePill label="Commercial" value={p.commercial} />
                    <PosturePill label="Notes" value={p.followup} />
                  </div>

                  {/* Row 3: Timestamp */}
                  {submittedAt && (
                    <p className="text-[9px] text-[#9CA3AF] mt-1.5" style={sans}>
                      Submitted {new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
