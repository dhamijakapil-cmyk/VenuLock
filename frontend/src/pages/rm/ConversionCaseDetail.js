import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, Users as UsersIcon,
  ChevronRight, ChevronDown, CheckCircle2, Circle, Clock, AlertTriangle,
  FileText, Eye, Handshake, ShieldCheck, Plus, Send, X, Edit3,
  Building2, IndianRupee, Star, RotateCcw, Lock,
} from 'lucide-react';

import CommunicationConsole from './CommunicationConsole';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'comms', label: 'Comms' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'visits', label: 'Visits' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'readiness', label: 'Readiness' },
];

const STAGE_PIPELINE = [
  { key: 'enquiry_received', label: 'Enquiry', alts: ['new'] },
  { key: 'requirement_qualified', label: 'Qualified', alts: ['contacted'] },
  { key: 'venues_shortlisted', label: 'Shortlisted', alts: ['shortlisted'] },
  { key: 'quote_requested', label: 'Quote Req' },
  { key: 'quote_received', label: 'Quote In' },
  { key: 'site_visit_planned', label: 'Visit Plan', alts: ['site_visit'] },
  { key: 'site_visit_completed', label: 'Visit Done' },
  { key: 'negotiation_in_progress', label: 'Negotiation', alts: ['negotiation'] },
  { key: 'commercial_accepted', label: 'Accepted' },
  { key: 'booking_confirmation_pending', label: 'Booking Pending' },
  { key: 'booking_confirmed', label: 'Confirmed' },
];

export default function ConversionCaseDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState(null);

  const fetchCase = useCallback(async () => {
    try {
      const [caseRes, readinessRes] = await Promise.all([
        api.get(`/conversion/cases/${leadId}`),
        api.get(`/conversion/cases/${leadId}/booking-readiness`),
      ]);
      setCaseData(caseRes.data);
      setReadiness(readinessRes.data);
    } catch (err) {
      console.error('Failed to fetch case:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] font-semibold text-slate-500">Case not found</p>
          <button onClick={() => navigate(-1)} className="mt-2 text-[12px] text-[#D4B36A] font-medium">Go back</button>
        </div>
      </div>
    );
  }

  const stage = caseData.stage || '';
  const meta = caseData.conversion_meta || {};

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="conversion-detail-page">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/team/rm/conversion')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08]" data-testid="detail-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold truncate" data-testid="detail-customer-name">{caseData.customer_name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              {caseData.event_type && <span>{caseData.event_type}</span>}
              {caseData.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{caseData.city}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {caseData.customer_phone && (
              <>
                <button onClick={() => window.open(`tel:${caseData.customer_phone}`, '_self')}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20" data-testid="detail-call-btn">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <button onClick={() => {
                  const p = caseData.customer_phone.replace(/\D/g, '');
                  window.open(`https://wa.me/${p}`, '_blank');
                }} className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20" data-testid="detail-wa-btn">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stage badge + blocker/overdue */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#D4B36A]/20 text-[#D4B36A]" data-testid="detail-stage-badge">
            {caseData.stage_label || stage}
          </span>
          {meta.blocker && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 flex items-center gap-1" data-testid="detail-blocker-badge">
              <AlertTriangle className="w-3 h-3" /> {meta.blocker}
            </span>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-[calc(env(safe-area-inset-top,12px)+88px)] z-10 bg-white border-b border-black/[0.05] px-2">
        <div className="flex overflow-x-auto scrollbar-hide" data-testid="detail-tabs">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0",
                activeTab === tab.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400 hover:text-slate-600'
              )} data-testid={`tab-${tab.id}`}>
              {tab.label}
              {tab.id === 'shortlist' && caseData.shortlist?.length > 0 && (
                <span className="ml-1 text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{caseData.shortlist.length}</span>
              )}
              {tab.id === 'quotes' && caseData.quotes?.length > 0 && (
                <span className="ml-1 text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{caseData.quotes.length}</span>
              )}
              {tab.id === 'comms' && caseData.communication_status && caseData.communication_status !== 'never_contacted' && (
                <span className={cn("ml-1 text-[9px] px-1.5 rounded-full font-bold",
                  caseData.communication_status === 'overdue' ? 'bg-red-100 text-red-600' :
                  caseData.communication_status === 'follow_up_due' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                )}>!</span>
              )}
              {tab.id === 'visits' && caseData.site_visits?.length > 0 && (
                <span className="ml-1 text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{caseData.site_visits.length}</span>
              )}
              {tab.id === 'negotiation' && caseData.negotiations?.length > 0 && (
                <span className="ml-1 text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{caseData.negotiations.length}</span>
              )}
              {tab.id === 'readiness' && readiness && (
                <span className={cn("ml-1 text-[9px] px-1.5 rounded-full",
                  readiness.all_ready ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                )}>{readiness.passed_count}/{readiness.total_count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4 pb-24">
        {activeTab === 'overview' && <OverviewTab caseData={caseData} meta={meta} stage={stage} onRefresh={fetchCase} setModal={setModal} />}
        {activeTab === 'comms' && <CommunicationConsole caseData={caseData} onRefresh={fetchCase} />}
        {activeTab === 'shortlist' && <ShortlistTab caseData={caseData} onRefresh={fetchCase} setModal={setModal} />}
        {activeTab === 'quotes' && <QuotesTab caseData={caseData} onRefresh={fetchCase} setModal={setModal} />}
        {activeTab === 'visits' && <VisitsTab caseData={caseData} onRefresh={fetchCase} setModal={setModal} />}
        {activeTab === 'negotiation' && <NegotiationTab caseData={caseData} onRefresh={fetchCase} setModal={setModal} />}
        {activeTab === 'readiness' && <ReadinessTab caseData={caseData} readiness={readiness} onRefresh={fetchCase} />}
      </div>

      {/* Modals */}
      {modal && <ModalOverlay modal={modal} setModal={setModal} leadId={leadId} onRefresh={fetchCase} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════════ */
function OverviewTab({ caseData, meta, stage, onRefresh, setModal }) {
  return (
    <div className="space-y-4" data-testid="overview-tab">
      {/* Customer Info */}
      <Section title="Customer">
        <div className="space-y-2">
          <InfoRow label="Name" value={caseData.customer_name} />
          <InfoRow label="Phone" value={caseData.customer_phone} />
          <InfoRow label="Email" value={caseData.customer_email} />
          <InfoRow label="Event" value={caseData.event_type} />
          <InfoRow label="Date" value={formatDate(caseData.event_date)} />
          <InfoRow label="Guests" value={caseData.guest_count} />
          <InfoRow label="City / Area" value={[caseData.city, caseData.area].filter(Boolean).join(' / ')} />
          {caseData.budget && <InfoRow label="Budget" value={`₹${caseData.budget?.toLocaleString()}/plate`} />}
        </div>
      </Section>

      {/* Stage Pipeline */}
      <Section title="Stage Progression">
        <StagePipeline currentStage={stage} />
        <button onClick={() => setModal({ type: 'stage_change', leadId: caseData.lead_id, currentStage: stage })}
          className="mt-3 w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg active:scale-[0.98] transition-transform"
          data-testid="advance-stage-btn">
          <ChevronRight className="w-3.5 h-3.5" /> Advance Stage
        </button>
      </Section>

      {/* Conversion Meta */}
      {(meta.next_action || meta.blocker || meta.next_followup) && (
        <Section title="Current State">
          {meta.next_action && (
            <div className="p-2.5 bg-[#D4B36A]/[0.06] rounded-lg mb-2">
              <p className="text-[10px] font-bold text-[#8B7A3E] uppercase tracking-wider mb-0.5">Next Action</p>
              <p className="text-[12px] text-[#0B0B0D]">{meta.next_action}</p>
            </div>
          )}
          {meta.blocker && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg mb-2">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Blocker</p>
              <p className="text-[12px] text-orange-800">{meta.blocker}</p>
            </div>
          )}
          {meta.next_followup && (
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Follow-up</p>
              <p className="text-[12px] text-blue-800">{meta.next_followup}</p>
            </div>
          )}
        </Section>
      )}

      {/* Follow-ups */}
      {caseData.follow_ups?.length > 0 && (
        <Section title="Follow-ups">
          <div className="space-y-1.5">
            {caseData.follow_ups.map(fu => (
              <div key={fu.follow_up_id} className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-lg border",
                fu.status === 'pending' ? 'border-amber-200 bg-amber-50/50' : 'border-black/[0.04] bg-white'
              )}>
                {fu.status === 'pending' ? <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#0B0B0D] font-medium truncate">{fu.description}</p>
                  <p className="text-[9px] text-slate-400">{formatDate(fu.scheduled_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHORTLIST TAB
   ═══════════════════════════════════════════════════════════════ */
function ShortlistTab({ caseData, onRefresh, setModal }) {
  const shortlist = caseData.shortlist || [];

  const statusColors = {
    suggested: 'bg-slate-100 text-slate-600',
    liked: 'bg-emerald-50 text-emerald-600',
    maybe: 'bg-amber-50 text-amber-600',
    rejected: 'bg-red-50 text-red-600',
    quote_requested: 'bg-blue-50 text-blue-600',
    quote_received: 'bg-blue-100 text-blue-700',
    visit_planned: 'bg-purple-50 text-purple-600',
    visit_completed: 'bg-purple-100 text-purple-700',
    in_negotiation: 'bg-orange-50 text-orange-600',
    accepted: 'bg-emerald-100 text-emerald-700',
    dropped: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-3" data-testid="shortlist-tab">
      {shortlist.length === 0 ? (
        <EmptyState icon={<Building2 className="w-8 h-8" />} text="No venues shortlisted yet" />
      ) : (
        shortlist.map(item => (
          <div key={item.shortlist_id} className="bg-white rounded-xl border border-black/[0.05] p-3.5" data-testid={`shortlist-item-${item.shortlist_id}`}>
            <div className="flex items-start gap-2.5">
              {item.venue?.images?.[0] ? (
                <img src={item.venue.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-[#0B0B0D] truncate">{item.venue_name || item.venue?.name || 'Unknown Venue'}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.venue?.city && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{item.venue.city}
                    </span>
                  )}
                  {item.venue?.capacity_max && (
                    <span className="text-[10px] text-slate-400">{item.venue.capacity_max} pax</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", statusColors[item.status] || 'bg-slate-100 text-slate-500')}>
                {(item.status || 'suggested').replace(/_/g, ' ')}
              </span>
              {item.proposed_price && (
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <IndianRupee className="w-2.5 h-2.5" />{item.proposed_price?.toLocaleString()}
                </span>
              )}
            </div>
            {item.customer_feedback && (
              <p className="text-[10px] text-slate-500 mt-1.5 italic">"{item.customer_feedback}"</p>
            )}
            <button onClick={() => setModal({ type: 'shortlist_status', shortlistId: item.shortlist_id, leadId: caseData.lead_id, current: item.status })}
              className="mt-2 text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1"
              data-testid={`update-shortlist-${item.shortlist_id}`}>
              <Edit3 className="w-3 h-3" /> Update Status
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUOTES TAB
   ═══════════════════════════════════════════════════════════════ */
function QuotesTab({ caseData, onRefresh, setModal }) {
  const quotes = caseData.quotes || [];

  const statusColors = {
    requested: 'bg-blue-50 text-blue-600',
    received: 'bg-emerald-50 text-emerald-600',
    revised: 'bg-amber-50 text-amber-600',
    expired: 'bg-slate-100 text-slate-500',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-50 text-red-600',
  };

  return (
    <div className="space-y-3" data-testid="quotes-tab">
      <button onClick={() => setModal({ type: 'add_quote', leadId: caseData.lead_id, shortlist: caseData.shortlist })}
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg active:scale-[0.98]"
        data-testid="add-quote-btn">
        <Plus className="w-3.5 h-3.5" /> Request / Log Quote
      </button>
      {quotes.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />} text="No quotes yet" />
      ) : (
        quotes.map(q => (
          <div key={q.quote_id} className="bg-white rounded-xl border border-black/[0.05] p-3.5" data-testid={`quote-${q.quote_id}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#0B0B0D]">{q.venue_name || 'Venue Quote'}</h4>
                <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1", statusColors[q.status] || 'bg-slate-100 text-slate-500')}>
                  {q.status}
                </span>
              </div>
              {q.amount && (
                <p className="text-[14px] font-bold text-[#0B0B0D]">₹{q.amount?.toLocaleString()}</p>
              )}
            </div>
            {q.amount_per_plate && (
              <p className="text-[10px] text-slate-500 mt-1">₹{q.amount_per_plate?.toLocaleString()} per plate</p>
            )}
            {q.inclusions && <p className="text-[10px] text-slate-500 mt-1 truncate">Includes: {q.inclusions}</p>}
            {q.valid_until && <p className="text-[9px] text-slate-400 mt-1">Valid until: {formatDate(q.valid_until)}</p>}
            {/* Revision history */}
            {q.revision_history?.length > 1 && (
              <div className="mt-2 pt-2 border-t border-black/[0.04]">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">History ({q.revision_history.length})</p>
                {q.revision_history.slice(-3).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[9px] text-slate-500 py-0.5">
                    <span className="text-slate-400">{formatDate(h.timestamp)}</span>
                    <span>{h.action}</span>
                    {h.by && <span className="text-slate-400">by {h.by}</span>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal({ type: 'update_quote', leadId: caseData.lead_id, quote: q })}
              className="mt-2 text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1"
              data-testid={`update-quote-${q.quote_id}`}>
              <Edit3 className="w-3 h-3" /> Update Quote
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VISITS TAB
   ═══════════════════════════════════════════════════════════════ */
function VisitsTab({ caseData, onRefresh, setModal }) {
  const visits = caseData.site_visits || [];

  const statusColors = {
    requested: 'bg-blue-50 text-blue-600',
    proposed: 'bg-sky-50 text-sky-600',
    scheduled: 'bg-violet-50 text-violet-600',
    completed: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-red-50 text-red-600',
  };

  return (
    <div className="space-y-3" data-testid="visits-tab">
      <button onClick={() => setModal({ type: 'add_visit', leadId: caseData.lead_id, shortlist: caseData.shortlist })}
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg active:scale-[0.98]"
        data-testid="add-visit-btn">
        <Plus className="w-3.5 h-3.5" /> Schedule Visit
      </button>
      {visits.length === 0 ? (
        <EmptyState icon={<Eye className="w-8 h-8" />} text="No site visits yet" />
      ) : (
        visits.map(v => (
          <div key={v.visit_id} className="bg-white rounded-xl border border-black/[0.05] p-3.5" data-testid={`visit-${v.visit_id}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#0B0B0D]">{v.venue_name || 'Site Visit'}</h4>
                <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1", statusColors[v.status] || 'bg-slate-100 text-slate-500')}>
                  {v.status}
                </span>
              </div>
              {(v.scheduled_date || v.proposed_date) && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{formatDate(v.scheduled_date || v.proposed_date)}
                </span>
              )}
            </div>
            {v.outcome && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                <p className="text-[10px] font-semibold text-slate-600">Outcome: {v.outcome}</p>
              </div>
            )}
            {v.customer_notes && <p className="text-[10px] text-slate-500 mt-1 italic">Customer: "{v.customer_notes}"</p>}
            {v.rm_notes && <p className="text-[10px] text-slate-500 mt-0.5">RM note: {v.rm_notes}</p>}
            {v.history?.length > 1 && (
              <div className="mt-2 pt-2 border-t border-black/[0.04]">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">History</p>
                {v.history.slice(-3).map((h, i) => (
                  <div key={i} className="text-[9px] text-slate-500 py-0.5">{h.action} — {h.by} · {formatDate(h.timestamp)}</div>
                ))}
              </div>
            )}
            <button onClick={() => setModal({ type: 'update_visit', leadId: caseData.lead_id, visit: v })}
              className="mt-2 text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1"
              data-testid={`update-visit-${v.visit_id}`}>
              <Edit3 className="w-3 h-3" /> Update Visit
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEGOTIATION TAB
   ═══════════════════════════════════════════════════════════════ */
function NegotiationTab({ caseData, onRefresh, setModal }) {
  const negotiations = caseData.negotiations || [];

  const statusColors = {
    started: 'bg-blue-50 text-blue-600',
    counter_sent: 'bg-amber-50 text-amber-600',
    counter_received: 'bg-sky-50 text-sky-600',
    waiting_venue: 'bg-purple-50 text-purple-600',
    waiting_customer: 'bg-violet-50 text-violet-600',
    blocked: 'bg-red-50 text-red-600',
    agreed: 'bg-emerald-50 text-emerald-600',
    abandoned: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-3" data-testid="negotiation-tab">
      <button onClick={() => setModal({ type: 'add_negotiation', leadId: caseData.lead_id, shortlist: caseData.shortlist })}
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg active:scale-[0.98]"
        data-testid="add-negotiation-btn">
        <Plus className="w-3.5 h-3.5" /> Start Negotiation
      </button>
      {negotiations.length === 0 ? (
        <EmptyState icon={<Handshake className="w-8 h-8" />} text="No negotiations yet" />
      ) : (
        negotiations.map(n => (
          <div key={n.neg_id} className="bg-white rounded-xl border border-black/[0.05] p-3.5" data-testid={`neg-${n.neg_id}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#0B0B0D]">{n.venue_name || 'Negotiation'}</h4>
                <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1", statusColors[n.status] || 'bg-slate-100 text-slate-500')}>
                  {(n.status || '').replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            {(n.latest_ask || n.latest_offer) && (
              <div className="flex items-center gap-4 mt-2">
                {n.latest_ask && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Venue Ask</p>
                    <p className="text-[13px] font-bold text-[#0B0B0D]">₹{n.latest_ask?.toLocaleString()}</p>
                  </div>
                )}
                {n.latest_offer && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Our Offer</p>
                    <p className="text-[13px] font-bold text-[#D4B36A]">₹{n.latest_offer?.toLocaleString()}</p>
                  </div>
                )}
                {n.latest_ask && n.latest_offer && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Gap</p>
                    <p className="text-[13px] font-bold text-orange-500">₹{Math.abs(n.latest_ask - n.latest_offer).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
            {n.blocked_reason && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[10px] text-red-700"><strong>Blocked:</strong> {n.blocked_reason}</p>
              </div>
            )}
            {n.counter_history?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/[0.04]">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Counter History</p>
                {n.counter_history.slice(-3).map((h, i) => (
                  <div key={i} className="text-[9px] text-slate-500 py-0.5 flex gap-2">
                    <span className="text-slate-400">{formatDate(h.timestamp)}</span>
                    <span>{h.note || `Ask: ₹${h.ask?.toLocaleString() || '–'} / Offer: ₹${h.offer?.toLocaleString() || '–'}`}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal({ type: 'update_negotiation', leadId: caseData.lead_id, neg: n })}
              className="mt-2 text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1"
              data-testid={`update-neg-${n.neg_id}`}>
              <Edit3 className="w-3 h-3" /> Update
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   READINESS TAB
   ═══════════════════════════════════════════════════════════════ */
function ReadinessTab({ caseData, readiness, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const toggleCheck = async (checkId, currentVal) => {
    setSaving(true);
    try {
      await api.post(`/conversion/cases/${caseData.lead_id}/booking-readiness`, { [checkId]: !currentVal });
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const confirmBooking = async () => {
    if (!window.confirm('Confirm this booking? All readiness checks must pass.')) return;
    setConfirming(true);
    try {
      await api.post(`/conversion/cases/${caseData.lead_id}/confirm-booking`);
      await onRefresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setConfirming(false);
    }
  };

  if (!readiness) return null;

  const allReady = readiness.all_ready;
  const stage = caseData.stage;
  const canConfirm = allReady && ['commercial_accepted', 'booking_confirmation_pending'].includes(stage);

  return (
    <div className="space-y-4" data-testid="readiness-tab">
      {/* Progress */}
      <div className="bg-white rounded-xl border border-black/[0.05] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-[#0B0B0D]">Booking Readiness Gate</h3>
          <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full",
            allReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          )} data-testid="readiness-status">
            {readiness.passed_count}/{readiness.total_count} {allReady ? 'Ready' : 'Pending'}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500",
            allReady ? 'bg-emerald-500' : 'bg-[#D4B36A]'
          )} style={{ width: `${(readiness.passed_count / readiness.total_count) * 100}%` }} data-testid="readiness-progress" />
        </div>
      </div>

      {/* Checks */}
      <div className="space-y-2">
        {readiness.checks.map(check => (
          <button key={check.id} onClick={() => toggleCheck(check.id, check.passed)} disabled={saving}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
              check.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-black/[0.05] hover:border-[#D4B36A]/30'
            )} data-testid={`readiness-check-${check.id}`}>
            {check.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
            )}
            <span className={cn("text-[12px] font-medium", check.passed ? 'text-emerald-700' : 'text-[#0B0B0D]')}>
              {check.label}
            </span>
          </button>
        ))}
      </div>

      {/* Confirm Booking */}
      {stage === 'booking_confirmed' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-[14px] font-bold text-emerald-700">Booking Confirmed</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{formatDate(caseData.confirmed_at)}</p>
        </div>
      ) : (
        <button onClick={confirmBooking} disabled={!canConfirm || confirming}
          className={cn(
            "w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[13px] font-bold transition-all",
            canConfirm
              ? 'bg-emerald-600 text-white active:scale-[0.98] hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )} data-testid="confirm-booking-btn">
          {confirming ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : canConfirm ? (
            <>
              <ShieldCheck className="w-4 h-4" /> Confirm Booking
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> {!allReady ? 'Complete all checks first' : 'Not at booking stage yet'}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODAL OVERLAY
   ═══════════════════════════════════════════════════════════════ */
function ModalOverlay({ modal, setModal, leadId, onRefresh }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      switch (modal.type) {
        case 'stage_change': {
          await api.post(`/conversion/cases/${leadId}/stage`, {
            stage: formData.stage,
            reason: formData.reason,
            blocker: formData.blocker,
            next_action: formData.next_action,
            next_followup: formData.next_followup,
          });
          break;
        }
        case 'shortlist_status': {
          await api.post(`/conversion/cases/${modal.leadId}/shortlist/${modal.shortlistId}/status`, {
            status: formData.status,
            customer_feedback: formData.customer_feedback,
            rm_notes: formData.rm_notes,
          });
          break;
        }
        case 'add_quote': {
          await api.post(`/conversion/cases/${modal.leadId}/quotes`, {
            venue_id: formData.venue_id,
            venue_name: formData.venue_name,
            status: formData.status || 'requested',
            amount_per_plate: formData.amount_per_plate ? parseFloat(formData.amount_per_plate) : null,
            total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
            inclusions: formData.inclusions,
            note: formData.note,
          });
          break;
        }
        case 'update_quote': {
          await api.post(`/conversion/cases/${modal.leadId}/quotes`, {
            venue_id: modal.quote.venue_id,
            venue_name: modal.quote.venue_name,
            status: formData.status || modal.quote.status,
            amount_per_plate: formData.amount_per_plate ? parseFloat(formData.amount_per_plate) : modal.quote.amount_per_plate,
            total_amount: formData.total_amount ? parseFloat(formData.total_amount) : modal.quote.amount,
            inclusions: formData.inclusions,
            note: formData.note,
          });
          break;
        }
        case 'add_visit': {
          await api.post(`/conversion/cases/${modal.leadId}/visits`, {
            venue_id: formData.venue_id,
            venue_name: formData.venue_name,
            status: formData.status || 'requested',
            proposed_date: formData.proposed_date,
            rm_notes: formData.rm_notes,
          });
          break;
        }
        case 'update_visit': {
          await api.post(`/conversion/cases/${modal.leadId}/visits/${modal.visit.visit_id}`, {
            venue_id: modal.visit.venue_id,
            status: formData.status || modal.visit.status,
            scheduled_date: formData.scheduled_date,
            outcome: formData.outcome,
            customer_notes: formData.customer_notes,
            rm_notes: formData.rm_notes,
          });
          break;
        }
        case 'add_negotiation': {
          await api.post(`/conversion/cases/${modal.leadId}/negotiation`, {
            venue_id: formData.venue_id,
            venue_name: formData.venue_name,
            status: formData.status || 'started',
            latest_ask: formData.latest_ask ? parseFloat(formData.latest_ask) : null,
            latest_offer: formData.latest_offer ? parseFloat(formData.latest_offer) : null,
            counter_note: formData.counter_note,
          });
          break;
        }
        case 'update_negotiation': {
          await api.post(`/conversion/cases/${modal.leadId}/negotiation/${modal.neg.neg_id}`, {
            venue_id: modal.neg.venue_id,
            status: formData.status || modal.neg.status,
            latest_ask: formData.latest_ask ? parseFloat(formData.latest_ask) : null,
            latest_offer: formData.latest_offer ? parseFloat(formData.latest_offer) : null,
            counter_note: formData.counter_note,
            blocked_reason: formData.blocked_reason,
            next_followup: formData.next_followup,
          });
          break;
        }
        default: break;
      }
      await onRefresh();
      setModal(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
  const shortlistVenues = modal.shortlist || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setModal(null)} data-testid="modal-overlay">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-black/[0.05] px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-[14px] font-bold text-[#0B0B0D]" data-testid="modal-title">{getModalTitle(modal.type)}</h3>
          <button onClick={() => setModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100" data-testid="modal-close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3" style={sans}>
          {/* Stage Change */}
          {modal.type === 'stage_change' && (
            <>
              <ModalSelect label="New Stage" value={formData.stage} onChange={v => set('stage', v)}
                options={STAGE_PIPELINE.map(s => ({ value: s.key, label: s.label }))} testId="select-stage" />
              <ModalInput label="Reason" value={formData.reason} onChange={v => set('reason', v)} testId="input-reason" />
              <ModalInput label="Next Action" value={formData.next_action} onChange={v => set('next_action', v)} testId="input-next-action" />
              <ModalInput label="Blocker (if any)" value={formData.blocker} onChange={v => set('blocker', v)} testId="input-blocker" />
            </>
          )}

          {/* Shortlist Status */}
          {modal.type === 'shortlist_status' && (
            <>
              <ModalSelect label="Status" value={formData.status} onChange={v => set('status', v)}
                options={['suggested','liked','maybe','rejected','quote_requested','quote_received','visit_planned','visit_completed','in_negotiation','accepted','dropped'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} testId="select-shortlist-status" />
              <ModalInput label="Customer Feedback" value={formData.customer_feedback} onChange={v => set('customer_feedback', v)} testId="input-feedback" />
              <ModalInput label="RM Notes" value={formData.rm_notes} onChange={v => set('rm_notes', v)} testId="input-rm-notes" />
            </>
          )}

          {/* Add/Update Quote */}
          {(modal.type === 'add_quote' || modal.type === 'update_quote') && (
            <>
              {modal.type === 'add_quote' && shortlistVenues.length > 0 && (
                <ModalSelect label="Venue" value={formData.venue_id} onChange={v => {
                  const found = shortlistVenues.find(s => s.venue_id === v);
                  set('venue_id', v); set('venue_name', found?.venue_name || found?.venue?.name || '');
                }} options={shortlistVenues.map(s => ({ value: s.venue_id, label: s.venue_name || s.venue?.name || s.venue_id }))} testId="select-quote-venue" />
              )}
              <ModalSelect label="Status" value={formData.status || modal.quote?.status} onChange={v => set('status', v)}
                options={['requested','received','revised','expired','accepted','rejected'].map(s => ({ value: s, label: s }))} testId="select-quote-status" />
              <ModalInput label="Per Plate (₹)" value={formData.amount_per_plate} onChange={v => set('amount_per_plate', v)} type="number" testId="input-per-plate" />
              <ModalInput label="Total Amount (₹)" value={formData.total_amount} onChange={v => set('total_amount', v)} type="number" testId="input-total" />
              <ModalInput label="Inclusions" value={formData.inclusions} onChange={v => set('inclusions', v)} testId="input-inclusions" />
              <ModalInput label="Note" value={formData.note} onChange={v => set('note', v)} testId="input-quote-note" />
            </>
          )}

          {/* Add/Update Visit */}
          {(modal.type === 'add_visit' || modal.type === 'update_visit') && (
            <>
              {modal.type === 'add_visit' && shortlistVenues.length > 0 && (
                <ModalSelect label="Venue" value={formData.venue_id} onChange={v => {
                  const found = shortlistVenues.find(s => s.venue_id === v);
                  set('venue_id', v); set('venue_name', found?.venue_name || found?.venue?.name || '');
                }} options={shortlistVenues.map(s => ({ value: s.venue_id, label: s.venue_name || s.venue?.name || s.venue_id }))} testId="select-visit-venue" />
              )}
              <ModalSelect label="Status" value={formData.status || modal.visit?.status} onChange={v => set('status', v)}
                options={['requested','proposed','scheduled','completed','cancelled'].map(s => ({ value: s, label: s }))} testId="select-visit-status" />
              <ModalInput label={modal.type === 'add_visit' ? 'Proposed Date' : 'Scheduled Date'} value={formData.proposed_date || formData.scheduled_date}
                onChange={v => { set('proposed_date', v); set('scheduled_date', v); }} type="date" testId="input-visit-date" />
              {modal.type === 'update_visit' && (
                <ModalInput label="Outcome" value={formData.outcome} onChange={v => set('outcome', v)} testId="input-outcome" />
              )}
              <ModalInput label="RM Notes" value={formData.rm_notes} onChange={v => set('rm_notes', v)} testId="input-visit-notes" />
            </>
          )}

          {/* Add/Update Negotiation */}
          {(modal.type === 'add_negotiation' || modal.type === 'update_negotiation') && (
            <>
              {modal.type === 'add_negotiation' && shortlistVenues.length > 0 && (
                <ModalSelect label="Venue" value={formData.venue_id} onChange={v => {
                  const found = shortlistVenues.find(s => s.venue_id === v);
                  set('venue_id', v); set('venue_name', found?.venue_name || found?.venue?.name || '');
                }} options={shortlistVenues.map(s => ({ value: s.venue_id, label: s.venue_name || s.venue?.name || s.venue_id }))} testId="select-neg-venue" />
              )}
              <ModalSelect label="Status" value={formData.status || modal.neg?.status} onChange={v => set('status', v)}
                options={['started','counter_sent','counter_received','waiting_venue','waiting_customer','blocked','agreed','abandoned'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} testId="select-neg-status" />
              <ModalInput label="Venue Ask (₹)" value={formData.latest_ask} onChange={v => set('latest_ask', v)} type="number" testId="input-ask" />
              <ModalInput label="Our Offer (₹)" value={formData.latest_offer} onChange={v => set('latest_offer', v)} type="number" testId="input-offer" />
              <ModalInput label="Note" value={formData.counter_note} onChange={v => set('counter_note', v)} testId="input-counter-note" />
              {modal.type === 'update_negotiation' && (
                <>
                  <ModalInput label="Blocked Reason" value={formData.blocked_reason} onChange={v => set('blocked_reason', v)} testId="input-blocked-reason" />
                  <ModalInput label="Next Follow-up" value={formData.next_followup} onChange={v => set('next_followup', v)} type="date" testId="input-neg-followup" />
                </>
              )}
            </>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-black/[0.05] px-4 py-3">
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
            data-testid="modal-submit-btn">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] p-4">
      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[12px] text-[#0B0B0D] font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-8">
      <div className="text-slate-200 mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="text-[12px] text-slate-400">{text}</p>
    </div>
  );
}

function StagePipeline({ currentStage }) {
  const currentIdx = STAGE_PIPELINE.findIndex(s =>
    s.key === currentStage || s.alts?.includes(currentStage)
  );

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1" data-testid="stage-pipeline">
      {STAGE_PIPELINE.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const isLost = currentStage === 'lost';
        return (
          <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold",
              isLost ? 'bg-red-100 text-red-500' :
              isDone ? 'bg-emerald-100 text-emerald-600' :
              isActive ? 'bg-[#D4B36A] text-white' : 'bg-slate-100 text-slate-400'
            )}>
              {isDone ? '✓' : i + 1}
            </div>
            {isActive && <span className="text-[9px] font-semibold text-[#0B0B0D]">{s.label}</span>}
            {i < STAGE_PIPELINE.length - 1 && <div className={cn("w-3 h-0.5 rounded-full", isDone ? 'bg-emerald-300' : 'bg-slate-200')} />}
          </div>
        );
      })}
    </div>
  );
}

function ModalInput({ label, value, onChange, type = 'text', testId }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
        data-testid={testId} />
    </div>
  );
}

function ModalSelect({ label, value, onChange, options, testId }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
        data-testid={testId}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function getModalTitle(type) {
  const titles = {
    stage_change: 'Advance Stage',
    shortlist_status: 'Update Shortlist Status',
    add_quote: 'Request / Log Quote',
    update_quote: 'Update Quote',
    add_visit: 'Schedule Site Visit',
    update_visit: 'Update Visit',
    add_negotiation: 'Start Negotiation',
    update_negotiation: 'Update Negotiation',
  };
  return titles[type] || 'Action';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}
