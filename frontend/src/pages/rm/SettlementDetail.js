import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, Users,
  CheckCircle2, Circle, Clock, AlertTriangle, IndianRupee,
  ShieldCheck, Send, X, Edit3, Lock, Ban,
  FileCheck, Hourglass, ShieldAlert, UserCheck,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'collection', label: 'Collection' },
  { id: 'payables', label: 'Payables' },
  { id: 'closure', label: 'Closure' },
];

const STATUS_BADGE = {
  closure_ready:                   { label: 'Closure Ready',     bg: 'bg-slate-100', text: 'text-slate-600' },
  settlement_pending:              { label: 'Pending',           bg: 'bg-blue-100', text: 'text-blue-700' },
  collection_verification_pending: { label: 'Collection Check',  bg: 'bg-cyan-100', text: 'text-cyan-700' },
  payable_commitments_pending:     { label: 'Payables Due',      bg: 'bg-amber-100', text: 'text-amber-700' },
  settlement_under_review:         { label: 'Under Review',      bg: 'bg-purple-100', text: 'text-purple-700' },
  settlement_ready:                { label: 'Ready',             bg: 'bg-emerald-100', text: 'text-emerald-700' },
  settlement_blocked:              { label: 'Blocked',           bg: 'bg-red-100', text: 'text-red-700' },
  financial_closure_completed:     { label: 'Closed',            bg: 'bg-green-100', text: 'text-green-700' },
};

const SETTLEMENT_STATUSES = [
  { value: 'closure_ready', label: 'Closure Ready' },
  { value: 'settlement_pending', label: 'Pending' },
  { value: 'collection_verification_pending', label: 'Collection Verification' },
  { value: 'payable_commitments_pending', label: 'Payables Pending' },
  { value: 'settlement_under_review', label: 'Under Review' },
  { value: 'settlement_ready', label: 'Ready' },
  { value: 'settlement_blocked', label: 'Blocked' },
];

const COLLECTION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'received', label: 'Received' },
  { value: 'verification_pending', label: 'Verification Pending' },
  { value: 'verified', label: 'Verified' },
];

const PAYABLE_COMPLETENESS = [
  { value: 'complete', label: 'Complete' },
  { value: 'partial', label: 'Partial' },
  { value: 'missing_data', label: 'Missing Data' },
];

const PAYOUT_POSTURES = [
  { value: 'payout_ready', label: 'Payout Ready' },
  { value: 'payout_not_ready', label: 'Not Ready' },
  { value: 'payout_readiness_unclear', label: 'Unclear' },
  { value: 'payout_blocked_by_dispute_or_hold', label: 'Blocked (Dispute/Hold)' },
  { value: 'payout_readiness_pending_verification', label: 'Pending Verification' },
];

const formatCurrency = (v) => {
  if (!v && v !== 0) return '--';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

export default function SettlementDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [closureGate, setClosureGate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [detailRes, closureRes] = await Promise.all([
        api.get(`/settlement/${leadId}`),
        api.get(`/settlement/${leadId}/financial-closure`).catch(() => ({ data: null })),
      ]);
      setData(detailRes.data);
      setClosureGate(closureRes.data);
    } catch (err) {
      console.error('Failed to fetch settlement:', err);
      toast.error('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const settlement = data?.settlement || {};
  const collection = settlement.collection || {};
  const payables = settlement.payables || {};
  const handoffSummary = settlement.handoff_summary || {};
  const financialClosure = settlement.financial_closure || {};
  const statusBadge = STATUS_BADGE[settlement.settlement_status] || STATUS_BADGE.closure_ready;
  const isClosed = settlement.settlement_status === 'financial_closure_completed';

  // ── Action Helpers ──

  const initiateHandoff = async () => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/handoff`, { settlement_note: '' });
      toast.success('Settlement handoff initiated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate handoff');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status, extras = {}) => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/status`, { status, ...extras });
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const updateCollection = async (payload) => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/collection`, payload);
      toast.success('Collection updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update collection');
    } finally {
      setSaving(false);
    }
  };

  const updatePayables = async (payload) => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/payables`, payload);
      toast.success('Payables updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update payables');
    } finally {
      setSaving(false);
    }
  };

  const updatePayoutReadiness = async (posture) => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/payout-readiness`, { posture });
      toast.success('Payout readiness updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update payout readiness');
    } finally {
      setSaving(false);
    }
  };

  const updateClosureCheck = async (field, value) => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/financial-closure`, { [field]: value });
      toast.success('Closure check updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update closure check');
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async (note) => {
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/note`, { note });
      toast.success('Settlement note saved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const completeFinancialClosure = async () => {
    if (!window.confirm('Complete financial closure? This action marks the case as fully settled.')) return;
    setSaving(true);
    try {
      await api.post(`/settlement/${leadId}/complete`);
      toast.success('Financial closure completed');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot complete closure — check all prerequisites');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center gap-3 px-4">
        <AlertTriangle className="w-12 h-12 text-slate-300" />
        <p className="text-[14px] font-semibold text-slate-500">Settlement not found</p>
        <button onClick={() => navigate('/team/rm/settlement')} className="text-[12px] text-[#D4B36A] font-semibold">Back to Settlement</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="settlement-detail-page">
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/team/rm/settlement')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08]" data-testid="settlement-detail-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold leading-tight truncate" data-testid="settlement-customer-name">{data.customer_name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
              {data.venue_name && <span className="truncate max-w-[50%]">{data.venue_name}</span>}
              {data.event_type && <span>{data.event_type}</span>}
              {data.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{data.city}</span>}
            </div>
          </div>
          <span className={cn("text-[9px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0", statusBadge.bg, statusBadge.text)} data-testid="settlement-status-badge">
            {statusBadge.label}
          </span>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[8px] text-white/30 uppercase tracking-wider">Amount</p>
            <p className="text-[13px] font-bold text-[#D4B36A]">{formatCurrency(data.final_amount)}</p>
          </div>
          <div className="bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[8px] text-white/30 uppercase tracking-wider">Collected</p>
            <p className="text-[13px] font-bold text-white">{formatCurrency(collection.received_amount)}</p>
          </div>
          <div className="bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[8px] text-white/30 uppercase tracking-wider">Payable</p>
            <p className="text-[13px] font-bold text-white">{formatCurrency((payables.venue_payable || 0) + (payables.vendor_payable || 0))}</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-black/[0.04] px-4 flex gap-0.5 overflow-x-auto scrollbar-hide" data-testid="settlement-tabs">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all",
              activeTab === tab.id ? "border-[#D4B36A] text-[#0B0B0D]" : "border-transparent text-slate-400"
            )} data-testid={`settlement-tab-${tab.id}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Initiate Handoff CTA */}
        {!settlement.settlement_status || settlement.settlement_status === 'closure_ready' ? (
          <div className="bg-white rounded-xl border border-black/[0.05] p-4 text-center" data-testid="handoff-initiate-section">
            <ShieldCheck className="w-10 h-10 text-[#D4B36A] mx-auto mb-2" />
            <h3 className="text-[14px] font-bold text-[#0B0B0D]">Initiate Settlement</h3>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">This event is closure-ready. Start the settlement process to begin financial closure.</p>
            <button onClick={initiateHandoff} disabled={saving}
              className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-bold rounded-xl disabled:opacity-50"
              data-testid="initiate-handoff-btn">
              {saving ? 'Initiating...' : 'Initiate Settlement Handoff'}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} settlement={settlement} handoffSummary={handoffSummary}
              isClosed={isClosed} saving={saving} updateStatus={updateStatus} updateNote={updateNote} updatePayoutReadiness={updatePayoutReadiness} />}
            {activeTab === 'collection' && <CollectionTab collection={collection} isClosed={isClosed} saving={saving} updateCollection={updateCollection} />}
            {activeTab === 'payables' && <PayablesTab payables={payables} isClosed={isClosed} saving={saving} updatePayables={updatePayables} />}
            {activeTab === 'closure' && <ClosureTab closureGate={closureGate} isClosed={isClosed} saving={saving}
              updateClosureCheck={updateClosureCheck} completeFinancialClosure={completeFinancialClosure} settlement={settlement} />}
          </>
        )}
      </div>
    </div>
  );
}


// ── Overview Tab ──

function OverviewTab({ data, settlement, handoffSummary, isClosed, saving, updateStatus, updateNote, updatePayoutReadiness }) {
  const [noteText, setNoteText] = useState(settlement.settlement_note || '');
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showPayoutSelect, setShowPayoutSelect] = useState(false);

  return (
    <>
      {/* Handoff Summary */}
      {handoffSummary.generated_at && (
        <Section title="Handoff Summary" icon={<FileCheck className="w-3.5 h-3.5" />}>
          <div className="space-y-2">
            <Row label="Generated" value={formatDate(handoffSummary.generated_at)} />
            <Row label="By" value={handoffSummary.generated_by} />
            <Row label="Venue" value={handoffSummary.booking_snapshot_venue} />
            <Row label="Booking Amount" value={formatCurrency(handoffSummary.booking_snapshot_amount)} />
            <Row label="Event Date" value={handoffSummary.event_date} />
            <Row label="Event Type" value={handoffSummary.event_type} />
            <Row label="Guest Count" value={handoffSummary.guest_count} />
            {handoffSummary.addenda_count > 0 && <Row label="Addenda" value={`${handoffSummary.addenda_count} change(s)`} />}
            {handoffSummary.major_issue && <Row label="Major Issue" value="Yes" highlight />}
            {handoffSummary.major_incidents_count > 0 && <Row label="Major Incidents" value={handoffSummary.major_incidents_count} highlight />}
          </div>
        </Section>
      )}

      {/* Status Management */}
      {!isClosed && (
        <Section title="Status" icon={<Clock className="w-3.5 h-3.5" />}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#0B0B0D]">{settlement.settlement_status?.replace(/_/g, ' ')}</span>
            <button onClick={() => setShowStatusSelect(!showStatusSelect)}
              className="text-[10px] text-[#D4B36A] font-semibold" data-testid="change-status-btn">
              Change
            </button>
          </div>
          {showStatusSelect && (
            <div className="mt-2 space-y-1" data-testid="status-select-list">
              {SETTLEMENT_STATUSES.map(s => (
                <button key={s.value} onClick={() => { updateStatus(s.value); setShowStatusSelect(false); }}
                  disabled={saving}
                  className={cn("w-full text-left px-3 py-2 text-[11px] font-medium rounded-lg transition-colors",
                    settlement.settlement_status === s.value ? 'bg-[#0B0B0D] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  )}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {settlement.waiting_reason && (
            <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg">
              <p className="text-[10px] font-semibold text-amber-700">Waiting: {settlement.waiting_reason}</p>
            </div>
          )}
          {settlement.escalation_note && (
            <div className="mt-2 px-3 py-2 bg-red-50 rounded-lg">
              <p className="text-[10px] font-semibold text-red-700">Escalation: {settlement.escalation_note}</p>
            </div>
          )}
        </Section>
      )}

      {/* Payout Readiness */}
      <Section title="Payout Readiness (Advisory)" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
        <div className="flex items-center justify-between">
          <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full",
            settlement.payout_readiness === 'payout_ready' ? 'bg-emerald-100 text-emerald-700' :
            settlement.payout_readiness === 'payout_blocked_by_dispute_or_hold' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-600'
          )}>
            {settlement.payout_readiness?.replace(/_/g, ' ') || 'Not set'}
          </span>
          {!isClosed && (
            <button onClick={() => setShowPayoutSelect(!showPayoutSelect)}
              className="text-[10px] text-[#D4B36A] font-semibold" data-testid="change-payout-btn">
              Change
            </button>
          )}
        </div>
        {showPayoutSelect && !isClosed && (
          <div className="mt-2 space-y-1" data-testid="payout-select-list">
            {PAYOUT_POSTURES.map(p => (
              <button key={p.value} onClick={() => { updatePayoutReadiness(p.value); setShowPayoutSelect(false); }}
                disabled={saving}
                className={cn("w-full text-left px-3 py-2 text-[11px] font-medium rounded-lg transition-colors",
                  settlement.payout_readiness === p.value ? 'bg-[#0B0B0D] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                )}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Owner */}
      <Section title="Settlement Owner" icon={<UserCheck className="w-3.5 h-3.5" />}>
        <p className="text-[12px] text-[#0B0B0D] font-medium">
          {settlement.owner_name || <span className="text-slate-400">Not assigned</span>}
        </p>
        {settlement.assigned_at && <p className="text-[10px] text-slate-400 mt-0.5">Assigned {formatDate(settlement.assigned_at)}</p>}
      </Section>

      {/* Settlement Note */}
      <Section title="Settlement Note" icon={<Edit3 className="w-3.5 h-3.5" />}>
        {isClosed ? (
          <p className="text-[12px] text-[#0B0B0D]">{settlement.settlement_note || 'No note'}</p>
        ) : (
          <>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add settlement notes, observations, context..."
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12px] text-[#0B0B0D] placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
              data-testid="settlement-note-textarea" />
            <button onClick={() => updateNote(noteText)} disabled={saving || !noteText.trim()}
              className="mt-2 h-8 px-4 bg-[#0B0B0D] text-white text-[11px] font-bold rounded-lg disabled:opacity-40"
              data-testid="save-note-btn">
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </>
        )}
      </Section>
    </>
  );
}


// ── Collection Tab ──

function CollectionTab({ collection, isClosed, saving, updateCollection }) {
  const [expected, setExpected] = useState(collection.expected_amount || '');
  const [received, setReceived] = useState(collection.received_amount || '');
  const [status, setStatus] = useState(collection.status || 'pending');
  const [verificationNote, setVerificationNote] = useState(collection.verification_note || '');
  const [blocker, setBlocker] = useState(collection.blocker || '');

  const handleSave = () => {
    const payload = {};
    if (expected !== '' && expected !== collection.expected_amount) payload.expected_amount = parseFloat(expected);
    if (received !== '' && received !== collection.received_amount) payload.received_amount = parseFloat(received);
    if (status !== collection.status) payload.status = status;
    if (verificationNote !== (collection.verification_note || '')) payload.verification_note = verificationNote;
    if (blocker !== (collection.blocker || '')) payload.blocker = blocker;
    if (Object.keys(payload).length === 0) { toast.info('No changes'); return; }
    updateCollection(payload);
  };

  return (
    <>
      <Section title="Collection Verification" icon={<IndianRupee className="w-3.5 h-3.5" />}>
        <div className="space-y-3">
          <FieldInput label="Expected Amount" type="number" value={expected} onChange={setExpected} disabled={isClosed} testId="collection-expected" />
          <FieldInput label="Received Amount" type="number" value={received} onChange={setReceived} disabled={isClosed} testId="collection-received" />
          <FieldSelect label="Status" value={status} onChange={setStatus} options={COLLECTION_STATUSES} disabled={isClosed} testId="collection-status" />
          <FieldInput label="Verification Note" value={verificationNote} onChange={setVerificationNote} disabled={isClosed} testId="collection-note" />
          <FieldInput label="Blocker" value={blocker} onChange={setBlocker} disabled={isClosed} testId="collection-blocker" />
        </div>
        {!isClosed && (
          <button onClick={handleSave} disabled={saving}
            className="mt-4 w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-bold rounded-xl disabled:opacity-50"
            data-testid="save-collection-btn">
            {saving ? 'Saving...' : 'Save Collection'}
          </button>
        )}
      </Section>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-black/[0.05] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Expected</span>
          <span className="text-[12px] font-bold text-[#0B0B0D]">{formatCurrency(collection.expected_amount)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-slate-500">Received</span>
          <span className="text-[12px] font-bold text-emerald-600">{formatCurrency(collection.received_amount)}</span>
        </div>
        {collection.expected_amount && collection.received_amount && (
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/[0.04]">
            <span className="text-[11px] text-slate-500">Outstanding</span>
            <span className={cn("text-[12px] font-bold",
              (collection.expected_amount - collection.received_amount) > 0 ? 'text-red-600' : 'text-emerald-600'
            )}>
              {formatCurrency(collection.expected_amount - collection.received_amount)}
            </span>
          </div>
        )}
      </div>
    </>
  );
}


// ── Payables Tab ──

function PayablesTab({ payables, isClosed, saving, updatePayables }) {
  const [venuePayable, setVenuePayable] = useState(payables.venue_payable || '');
  const [vendorPayable, setVendorPayable] = useState(payables.vendor_payable || '');
  const [completeness, setCompleteness] = useState(payables.completeness || 'missing_data');
  const [disputeHold, setDisputeHold] = useState(payables.dispute_hold || false);
  const [disputeNote, setDisputeNote] = useState(payables.dispute_note || '');

  const handleSave = () => {
    const payload = {};
    if (venuePayable !== '' && venuePayable !== payables.venue_payable) payload.venue_payable = parseFloat(venuePayable);
    if (vendorPayable !== '' && vendorPayable !== payables.vendor_payable) payload.vendor_payable = parseFloat(vendorPayable);
    if (completeness !== payables.completeness) payload.completeness = completeness;
    if (disputeHold !== payables.dispute_hold) payload.dispute_hold = disputeHold;
    if (disputeNote !== (payables.dispute_note || '')) payload.dispute_note = disputeNote;
    if (Object.keys(payload).length === 0) { toast.info('No changes'); return; }
    updatePayables(payload);
  };

  return (
    <>
      <Section title="Payable Commitments" icon={<FileCheck className="w-3.5 h-3.5" />}>
        <div className="space-y-3">
          <FieldInput label="Venue Payable" type="number" value={venuePayable} onChange={setVenuePayable} disabled={isClosed} testId="payable-venue" />
          <FieldInput label="Vendor Payable" type="number" value={vendorPayable} onChange={setVendorPayable} disabled={isClosed} testId="payable-vendor" />
          <FieldSelect label="Completeness" value={completeness} onChange={setCompleteness} options={PAYABLE_COMPLETENESS} disabled={isClosed} testId="payable-completeness" />

          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Dispute / Hold</label>
            <button onClick={() => !isClosed && setDisputeHold(!disputeHold)} disabled={isClosed}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-colors w-full",
                disputeHold ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'
              )} data-testid="dispute-hold-toggle">
              {disputeHold ? <AlertTriangle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              {disputeHold ? 'Dispute / Hold Active' : 'No Dispute / Hold'}
            </button>
          </div>

          {disputeHold && (
            <FieldInput label="Dispute Note" value={disputeNote} onChange={setDisputeNote} disabled={isClosed} testId="dispute-note" />
          )}
        </div>
        {!isClosed && (
          <button onClick={handleSave} disabled={saving}
            className="mt-4 w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-bold rounded-xl disabled:opacity-50"
            data-testid="save-payables-btn">
            {saving ? 'Saving...' : 'Save Payables'}
          </button>
        )}
      </Section>

      {/* Warnings */}
      {(payables.missing_data_warnings || []).length > 0 && (
        <Section title="Missing Data Warnings" icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}>
          <div className="space-y-1.5">
            {payables.missing_data_warnings.map((w, i) => (
              <div key={i} className="px-3 py-2 bg-amber-50 rounded-lg">
                <p className="text-[11px] text-amber-700 font-medium">{w.warning}</p>
                <p className="text-[9px] text-amber-500 mt-0.5">by {w.by} -- {formatDate(w.logged_at)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Summary */}
      <div className="bg-white rounded-xl border border-black/[0.05] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Venue Payable</span>
          <span className="text-[12px] font-bold text-[#0B0B0D]">{formatCurrency(payables.venue_payable)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-slate-500">Vendor Payable</span>
          <span className="text-[12px] font-bold text-[#0B0B0D]">{formatCurrency(payables.vendor_payable)}</span>
        </div>
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/[0.04]">
          <span className="text-[11px] text-slate-500">Total Payable</span>
          <span className="text-[12px] font-bold text-[#0B0B0D]">{formatCurrency((payables.venue_payable || 0) + (payables.vendor_payable || 0))}</span>
        </div>
      </div>
    </>
  );
}


// ── Closure Tab ──

function ClosureTab({ closureGate, isClosed, saving, updateClosureCheck, completeFinancialClosure, settlement }) {
  const checks = closureGate?.checks || [];
  const passedCount = closureGate?.passed_count || 0;
  const totalCount = closureGate?.total_count || 5;
  const allReady = closureGate?.all_ready || false;

  return (
    <>
      <Section title="Financial Closure Gate" icon={<Lock className="w-3.5 h-3.5" />}>
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#0B0B0D]">{passedCount} of {totalCount} complete</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
              allReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            )}>{allReady ? 'All Clear' : 'Incomplete'}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all",
              allReady ? 'bg-emerald-500' : 'bg-[#D4B36A]'
            )} style={{ width: `${totalCount > 0 ? (passedCount / totalCount) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2" data-testid="closure-checklist">
          {checks.map(check => (
            <button key={check.id}
              onClick={() => !isClosed && updateClosureCheck(check.id, !check.passed)}
              disabled={isClosed || saving}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left",
                check.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
              )} data-testid={`closure-check-${check.id}`}>
              {check.passed
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />}
              <span className={cn("text-[12px] font-medium flex-1",
                check.passed ? 'text-emerald-700' : 'text-slate-600'
              )}>{check.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Complete Button */}
      {!isClosed && (
        <button onClick={completeFinancialClosure} disabled={saving || !allReady}
          className={cn(
            "w-full h-12 text-[13px] font-bold rounded-xl transition-all",
            allReady ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          )} data-testid="complete-closure-btn">
          {saving ? 'Processing...' : allReady ? 'Complete Financial Closure' : `${totalCount - passedCount} check(s) remaining`}
        </button>
      )}

      {/* Closed Confirmation */}
      {isClosed && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center" data-testid="closure-complete-banner">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-[14px] font-bold text-emerald-700">Financial Closure Complete</h3>
          {settlement.closed_by_name && (
            <p className="text-[11px] text-emerald-600 mt-1">Closed by {settlement.closed_by_name}</p>
          )}
          {settlement.closed_at && (
            <p className="text-[10px] text-emerald-500 mt-0.5">{formatDate(settlement.closed_at)}</p>
          )}
        </div>
      )}
    </>
  );
}


// ── Shared Components ──

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#D4B36A]">{icon}</div>
        <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={cn("text-[11px] font-semibold", highlight ? 'text-red-600' : 'text-[#0B0B0D]')}>{value || '--'}</span>
    </div>
  );
}

function FieldInput({ label, value, onChange, type = 'text', disabled, testId }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid={testId} />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, disabled, testId }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid={testId}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
