import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';
import {
  Plus, MapPin, Phone, Camera, Clock, ChevronRight,
  CheckCircle2, AlertCircle, FileText, TrendingUp, 
  Circle, Search, Filter, Zap,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_MAP = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  submitted_for_review: { label: 'Submitted', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  sent_back_to_specialist: { label: 'Sent Back', color: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
  under_data_refinement: { label: 'Refining', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-400' },
  awaiting_manager_approval: { label: 'Awaiting Approval', color: 'bg-purple-50 text-purple-600', dot: 'bg-purple-400' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  owner_onboarding_pending: { label: 'Onboarding', color: 'bg-sky-50 text-sky-700', dot: 'bg-sky-400' },
  owner_onboarding_sent: { label: 'Link Sent', color: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-400' },
  owner_onboarded: { label: 'Onboarded', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  publish_ready: { label: 'Publish Ready', color: 'bg-[#D4B36A]/10 text-[#8B7330]', dot: 'bg-[#D4B36A]' },
};

export default function SpecialistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState({});

  const fetchCaptures = useCallback(async () => {
    try {
      const [capturesRes, statsRes] = await Promise.all([
        api.get('/acquisitions/?my_only=true'),
        api.get('/acquisitions/stats/summary'),
      ]);
      setCaptures(capturesRes.data.acquisitions || []);
      setStats(statsRes.data.by_status || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCaptures(); }, [fetchCaptures]);

  const filtered = filterStatus
    ? captures.filter(c => c.status === filterStatus)
    : captures;

  const draftCount = captures.filter(c => c.status === 'draft').length;
  const submittedCount = captures.filter(c => c.status === 'submitted_for_review').length;
  const sentBackCount = captures.filter(c => c.status === 'sent_back_to_specialist').length;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="specialist-dashboard">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1" style={sans}>Field Operations</p>
        <h1 className="text-[20px] font-bold text-white" style={sans}>
          Hi, {user?.name?.split(' ')[0] || 'Specialist'}
        </h1>
        <p className="text-[12px] text-white/50 mt-0.5" style={sans}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Quick Stats */}
        <div className="flex gap-2 mt-3">
          {[
            { label: 'Drafts', count: draftCount, icon: FileText, active: filterStatus === 'draft' },
            { label: 'Submitted', count: submittedCount, icon: TrendingUp, active: filterStatus === 'submitted_for_review' },
            { label: 'Sent Back', count: sentBackCount, icon: AlertCircle, active: filterStatus === 'sent_back_to_specialist' },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setFilterStatus(s.active ? '' : s.label === 'Drafts' ? 'draft' : s.label === 'Submitted' ? 'submitted_for_review' : 'sent_back_to_specialist')}
              className={`flex-1 rounded-xl px-3 py-2.5 transition-all ${
                s.active ? 'bg-[#D4B36A] text-[#0B0B0D]' : 'bg-white/[0.08] text-white/70'
              }`}
              data-testid={`stat-${s.label.toLowerCase().replace(' ','-')}`}
            >
              <div className="flex items-center gap-1.5">
                <s.icon className="w-3 h-3" strokeWidth={1.5} />
                <span className="text-[10px] font-medium" style={sans}>{s.label}</span>
              </div>
              <p className={`text-[22px] font-bold mt-0.5 ${s.active ? 'text-[#0B0B0D]' : 'text-white'}`} style={sans}>{s.count}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 -mt-3 flex gap-2">
        <button
          onClick={() => navigate('/team/field/quick')}
          className="flex-1 flex items-center justify-center gap-1.5 h-12 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-bold text-[13px] shadow-lg shadow-[#D4B36A]/20 active:scale-[0.98] transition-transform"
          data-testid="quick-capture-btn"
          style={sans}
        >
          <Zap className="w-4 h-4" strokeWidth={2.5} />
          Quick Capture
        </button>
        <button
          onClick={() => navigate('/team/field/prep')}
          className="flex items-center justify-center gap-1.5 h-12 px-4 bg-white border border-black/[0.08] text-[#0B0B0D] rounded-xl font-bold text-[12px] active:scale-[0.98] transition-transform"
          data-testid="new-capture-btn"
          style={sans}
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Full
        </button>
      </div>

      {/* Captures List */}
      <div className="px-4 mt-4 pb-24">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-bold text-[#0B0B0D]" style={sans}>
            My Captures {filterStatus && `(${STATUS_MAP[filterStatus]?.label || filterStatus})`}
          </h2>
          {filterStatus && (
            <button onClick={() => setFilterStatus('')} className="text-[10px] text-[#D4B36A] font-bold" style={sans}>
              Show All
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] text-slate-400" style={sans}>
              {filterStatus ? 'No captures in this status' : 'No venue captures yet'}
            </p>
            <p className="text-[11px] text-slate-300 mt-1" style={sans}>Tap "Quick Capture" or "Full" to start</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(cap => {
              const st = STATUS_MAP[cap.status] || STATUS_MAP.draft;
              const completeness = cap.completeness?.overall_pct || 0;
              const isQuick = cap.capture_mode === 'quick';
              return (
                <button
                  key={cap.acquisition_id}
                  onClick={() => navigate(`/team/field/capture/${cap.acquisition_id}`)}
                  className="w-full bg-white rounded-xl border border-black/[0.05] p-3.5 text-left active:bg-slate-50 transition-colors"
                  data-testid={`capture-card-${cap.acquisition_id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate" style={sans}>{cap.venue_name}</h3>
                        {isQuick && cap.status === 'draft' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#D4B36A]/10 rounded text-[8px] font-bold text-[#8B7330] flex-shrink-0" style={sans} data-testid="quick-badge">
                            <Zap className="w-2.5 h-2.5" />
                            QUICK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 text-[#64748B]" strokeWidth={1.5} />
                        <span className="text-[11px] text-[#64748B] truncate" style={sans}>
                          {cap.locality ? `${cap.locality}, ` : ''}{cap.city || 'Unknown'}
                        </span>
                      </div>
                      {cap.owner_name && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-[#64748B]" strokeWidth={1.5} />
                          <span className="text-[11px] text-[#64748B]" style={sans}>{cap.owner_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${st.color}`} style={sans}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4B36A] rounded-full transition-all" style={{ width: `${completeness}%` }} />
                        </div>
                        <span className="text-[9px] text-[#64748B] font-medium" style={sans}>{completeness}%</span>
                      </div>
                    </div>
                  </div>
                  {isQuick && cap.status === 'draft' && (
                    <div className="mt-2 px-2.5 py-1.5 bg-[#FDFBF5] rounded-lg border border-[#D4B36A]/10">
                      <p className="text-[10px] text-[#8B7330] font-medium" style={sans}>
                        Quick draft — open to complete full details before submitting
                      </p>
                    </div>
                  )}
                  {cap.status === 'sent_back_to_specialist' && cap.history?.length > 0 && (
                    <div className="mt-2 px-2.5 py-1.5 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-[10px] text-red-600 font-medium" style={sans}>
                        Feedback: {cap.history.filter(h => h.status === 'sent_back_to_specialist').pop()?.reason || 'Review needed'}
                      </p>
                    </div>
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
