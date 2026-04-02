import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import {
  ArrowLeft, ChevronRight, MapPin, User, Clock, Zap,
  CheckCircle2, XCircle, AlertCircle, FileText, Camera,
  IndianRupee, Wrench,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STATUS_TABS = [
  { value: 'under_data_refinement', label: 'Refining' },
  { value: 'awaiting_manager_approval', label: 'Ready' },
  { value: 'sent_back_to_specialist', label: 'Sent Back' },
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

const PILL = {
  complete: 'bg-emerald-50 text-emerald-700',
  incomplete: 'bg-red-50 text-red-600',
  weak: 'bg-amber-50 text-amber-700',
  partial: 'bg-amber-50 text-amber-700',
  missing: 'bg-slate-100 text-slate-500',
};

function Pill({ label, value }) {
  const Icon = value === 'complete' ? CheckCircle2 : value === 'missing' || value === 'incomplete' ? XCircle : AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${PILL[value] || PILL.missing}`} style={sans}>
      <Icon className="w-2.5 h-2.5" />{label}
    </span>
  );
}

export default function DataTeamQueue() {
  const navigate = useNavigate();
  const [acquisitions, setAcquisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('under_data_refinement');
  const [stats, setStats] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get(`/acquisitions/?status=${tab}`),
        api.get('/acquisitions/stats/summary'),
      ]);
      setAcquisitions(listRes.data.acquisitions || []);
      setStats(statsRes.data.by_status || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="data-team-queue">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pt-3 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <button onClick={() => navigate('/team/dashboard')} className="flex items-center gap-1.5 text-white/50 mb-2" data-testid="dt-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px]" style={sans}>Dashboard</span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-4 h-4 text-[#D4B36A]" />
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]" style={sans}>Data Refinement</p>
        </div>
        <h1 className="text-[20px] font-bold text-white" style={sans}>Refinement Queue</h1>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          {STATUS_TABS.map(s => {
            const count = stats[s.value] || 0;
            return (
              <button key={s.value} onClick={() => setTab(s.value)}
                className={`flex-1 rounded-xl px-2 py-2 transition-all ${
                  tab === s.value ? 'bg-[#D4B36A] text-[#0B0B0D]' : 'bg-white/[0.08] text-white/70'
                }`} data-testid={`dt-tab-${s.value}`}>
                <span className="text-[9px] font-medium block" style={sans}>{s.label}</span>
                <span className={`text-[20px] font-bold ${tab === s.value ? 'text-[#0B0B0D]' : 'text-white'}`} style={sans}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4 pb-8">
        <h2 className="text-[13px] font-bold text-[#0B0B0D] mb-2" style={sans}>
          {STATUS_TABS.find(s => s.value === tab)?.label} ({acquisitions.length})
        </h2>

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
              const photoCount = acq.photos?.length || 0;
              const missingCount = (acq.completeness?.mandatory?.total || 8) - (acq.completeness?.mandatory?.filled || 0);
              // Find the handoff timestamp
              const handoff = acq.history?.find(h =>
                h.action?.includes('under_data_refinement') || h.status === 'under_data_refinement'
              );
              return (
                <button key={acq.acquisition_id}
                  onClick={() => navigate(`/team/field/refine/${acq.acquisition_id}`)}
                  className="w-full bg-white rounded-xl border border-black/[0.05] p-3.5 text-left active:bg-slate-50 transition-colors"
                  data-testid={`dt-card-${acq.acquisition_id}`}>
                  <div className="flex items-start justify-between gap-2">
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
                          {acq.created_by_name || 'Specialist'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                  </div>

                  {/* Posture + indicators */}
                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    <Pill label="Fields" value={p.mandatory} />
                    <Pill label="Media" value={p.media} />
                    <Pill label="Commercial" value={p.commercial} />
                    {missingCount > 0 && (
                      <span className="text-[8px] font-bold text-red-500 ml-1" style={sans}>{missingCount} missing</span>
                    )}
                    {photoCount === 0 && (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-500 ml-1" style={sans}>
                        <Camera className="w-2.5 h-2.5" /> No photos
                      </span>
                    )}
                  </div>

                  {handoff?.timestamp && (
                    <p className="text-[9px] text-[#9CA3AF] mt-1.5" style={sans}>
                      Handed off {new Date(handoff.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
