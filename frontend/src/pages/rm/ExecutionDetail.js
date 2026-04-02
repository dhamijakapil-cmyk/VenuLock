import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, Users,
  CheckCircle2, Circle, Clock, AlertTriangle, Package, UserCheck,
  ShieldCheck, Plus, Send, X, Edit3, IndianRupee, Lock,
  FileWarning, ClipboardList, Handshake, Play, CircleAlert,
  PartyPopper, Hourglass, Zap,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const TABS = [
  { id: 'handoff', label: 'Handoff' },
  { id: 'team', label: 'Team' },
  { id: 'checklist', label: 'Prep' },
  { id: 'eventday', label: 'Event Day' },
  { id: 'changes', label: 'Changes' },
  { id: 'closure', label: 'Closure' },
];

const HANDOFF_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_preparation', label: 'In Preparation' },
  { value: 'ready', label: 'Ready' },
];

const EXEC_STATUSES = [
  { value: 'handoff_pending', label: 'Handoff Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_preparation', label: 'In Prep' },
  { value: 'ready_for_event', label: 'Ready' },
  { value: 'event_live', label: 'Live' },
  { value: 'issue_active', label: 'Issue' },
  { value: 'event_completed', label: 'Completed' },
  { value: 'closure_note_pending', label: 'Closure Pending' },
  { value: 'closure_ready', label: 'Closed' },
];

const STATUS_BADGE = {
  handoff_pending:       { label: 'No Handoff',     bg: 'bg-slate-100', text: 'text-slate-600' },
  no_handoff:            { label: 'No Handoff',     bg: 'bg-slate-100', text: 'text-slate-600' },
  assigned:              { label: 'Assigned',        bg: 'bg-blue-100', text: 'text-blue-700' },
  in_preparation:        { label: 'In Prep',         bg: 'bg-cyan-100', text: 'text-cyan-700' },
  ready_for_event:       { label: 'Ready',           bg: 'bg-emerald-100', text: 'text-emerald-700' },
  event_live:            { label: 'Event Live',      bg: 'bg-green-100', text: 'text-green-700' },
  issue_active:          { label: 'Issue Active',    bg: 'bg-red-100', text: 'text-red-700' },
  event_completed:       { label: 'Completed',       bg: 'bg-violet-100', text: 'text-violet-700' },
  closure_note_pending:  { label: 'Closure Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  closure_ready:         { label: 'Closed',          bg: 'bg-slate-200', text: 'text-slate-700' },
};

const CR_TYPE_LABEL = {
  customer_requirement: 'Customer Req', venue_change: 'Venue', commercial_change: 'Commercial',
  schedule_change: 'Schedule', special_requirement: 'Special',
};
const CR_STATUS_COLOR = {
  open: 'bg-red-50 text-red-600', under_review: 'bg-amber-50 text-amber-600',
  approved: 'bg-blue-50 text-blue-600', rejected: 'bg-slate-100 text-slate-500', implemented: 'bg-emerald-50 text-emerald-600',
};

const SEVERITY_COLOR = {
  low: 'bg-blue-50 text-blue-600', medium: 'bg-amber-50 text-amber-600',
  high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700',
};

export default function ExecutionDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [eventDayData, setEventDayData] = useState(null);
  const [closureData, setClosureData] = useState(null);
  const [addenda, setAddenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('handoff');
  const [modal, setModal] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [handoff, eventDay, closure, addendaRes] = await Promise.all([
        api.get(`/execution/${leadId}/handoff`),
        api.get(`/execution/${leadId}/event-day`).catch(() => ({ data: null })),
        api.get(`/execution/${leadId}/closure`).catch(() => ({ data: null })),
        api.get(`/execution/${leadId}/addenda`).catch(() => ({ data: { addenda: [] } })),
      ]);
      setData(handoff.data);
      setEventDayData(eventDay.data);
      setClosureData(closure.data);
      setAddenda(addendaRes.data?.addenda || []);
    } catch (err) {
      console.error('Failed to fetch execution data:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>;
  if (!data) return <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center"><p className="text-[14px] text-slate-500">Not found</p></div>;

  const snapshot = data.booking_snapshot || {};
  const execution = data.execution || {};
  const readiness = data.pre_event_readiness || {};
  const execStatus = data.execution_status || 'handoff_pending';
  const hasHandoff = !!snapshot.snapshot_locked_at;
  const statusBadge = STATUS_BADGE[execStatus] || STATUS_BADGE.handoff_pending;

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="execution-detail-page">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,12px)] pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/team/rm/execution')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08]" data-testid="exec-detail-back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold truncate" data-testid="exec-customer-name">{data.customer_name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              {snapshot.venue_name && <span>{snapshot.venue_name}</span>}
              {data.event_type && <span>{data.event_type}</span>}
            </div>
          </div>
          {data.customer_phone && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => window.open(`tel:${data.customer_phone}`, '_self')} className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20" data-testid="exec-call-btn">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button onClick={() => window.open(`https://wa.me/${data.customer_phone?.replace(/\D/g, '')}`, '_blank')} className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20" data-testid="exec-wa-btn">
                <MessageCircle className="w-3.5 h-3.5 text-green-400" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full", statusBadge.bg, statusBadge.text)} data-testid="exec-status-badge">{statusBadge.label}</span>
          {data.event_date && <span className="text-[10px] text-white/40 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(data.event_date)}</span>}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-[calc(env(safe-area-inset-top,12px)+88px)] z-10 bg-white border-b border-black/[0.05] px-1">
        <div className="flex overflow-x-auto scrollbar-hide" data-testid="exec-detail-tabs">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-shrink-0 px-2.5 py-2.5 text-[11px] font-semibold border-b-2 transition-all text-center",
                activeTab === tab.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400'
              )} data-testid={`exec-tab-${tab.id}`}>
              {tab.label}
              {tab.id === 'checklist' && readiness.done !== undefined && (
                <span className={cn("ml-1 text-[9px] px-1.5 rounded-full", readiness.posture === 'ready' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}>{readiness.done}/{readiness.total}</span>
              )}
              {tab.id === 'eventday' && eventDayData?.open_incidents > 0 && (
                <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1.5 rounded-full">{eventDayData.open_incidents}</span>
              )}
              {tab.id === 'changes' && (data.change_requests?.filter(c => c.status === 'open').length > 0 || addenda.length > 0) && (
                <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1.5 rounded-full">{data.change_requests?.filter(c => c.status === 'open').length + addenda.length}</span>
              )}
              {tab.id === 'closure' && closureData && (
                <span className={cn("ml-1 text-[9px] px-1.5 rounded-full", closureData.all_ready ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}>{closureData.passed_count}/{closureData.total_count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-24">
        {activeTab === 'handoff' && <HandoffTab data={data} snapshot={snapshot} hasHandoff={hasHandoff} setModal={setModal} />}
        {activeTab === 'team' && <TeamTab data={data} execution={execution} hasHandoff={hasHandoff} execStatus={execStatus} setModal={setModal} />}
        {activeTab === 'checklist' && <ChecklistTab data={data} readiness={readiness} onRefresh={fetchData} setModal={setModal} />}
        {activeTab === 'eventday' && <EventDayTab data={data} eventDayData={eventDayData} execStatus={execStatus} onRefresh={fetchData} setModal={setModal} />}
        {activeTab === 'changes' && <ChangesTab data={data} addenda={addenda} onRefresh={fetchData} setModal={setModal} />}
        {activeTab === 'closure' && <ClosureTab data={data} closureData={closureData} execStatus={execStatus} onRefresh={fetchData} />}
      </div>

      {modal && <ModalOverlay modal={modal} setModal={setModal} leadId={leadId} onRefresh={fetchData} />}
    </div>
  );
}

/* ═══════════════════════════ HANDOFF TAB ═══════════════════════════ */
function HandoffTab({ data, snapshot, hasHandoff, setModal }) {
  if (!hasHandoff) {
    return (
      <div className="space-y-4" data-testid="handoff-tab">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <Package className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-[13px] font-bold text-amber-800">Handoff Not Created</p>
          <p className="text-[11px] text-amber-600 mt-1">Create a handoff package to lock the booking snapshot.</p>
          <button onClick={() => setModal({ type: 'create_handoff' })} className="mt-3 px-4 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1.5" data-testid="create-handoff-btn">
            <Package className="w-3.5 h-3.5" /> Create Handoff
          </button>
        </div>
        <Section title="Customer"><InfoRow label="Name" value={data.customer_name} /><InfoRow label="Event" value={data.event_type} /><InfoRow label="Date" value={formatDate(data.event_date)} /><InfoRow label="City" value={data.city} /></Section>
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid="handoff-tab">
      <Section title="Booking Snapshot">
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-emerald-50 rounded-lg">
          <Lock className="w-3 h-3 text-emerald-500" /><span className="text-[10px] font-semibold text-emerald-600">Locked {formatDate(snapshot.snapshot_locked_at)}</span>
        </div>
        <InfoRow label="Venue" value={snapshot.venue_name} hl /><InfoRow label="City" value={snapshot.venue_city} />
        <InfoRow label="Event Date" value={formatDate(snapshot.event_date)} /><InfoRow label="Time" value={snapshot.event_time} />
        <InfoRow label="Guests" value={snapshot.guest_count} /><InfoRow label="Type" value={snapshot.event_type} />
        {snapshot.final_amount && <InfoRow label="Amount" value={`₹${snapshot.final_amount?.toLocaleString()}`} hl />}
        {snapshot.amount_per_plate && <InfoRow label="Per Plate" value={`₹${snapshot.amount_per_plate?.toLocaleString()}`} />}
        {snapshot.inclusions && <InfoRow label="Inclusions" value={snapshot.inclusions} />}
        {snapshot.exclusions && <InfoRow label="Exclusions" value={snapshot.exclusions} />}
      </Section>
      {(snapshot.customer_requirements || snapshot.special_promises || snapshot.rm_handoff_notes) && (
        <Section title="Key Notes">
          {snapshot.customer_requirements && <NoteBlock color="blue" label="Customer Requirements" text={snapshot.customer_requirements} />}
          {snapshot.special_promises && <NoteBlock color="amber" label="Promises" text={snapshot.special_promises} />}
          {snapshot.rm_handoff_notes && <NoteBlock color="gold" label="RM Handoff Notes" text={snapshot.rm_handoff_notes} />}
        </Section>
      )}
      <Section title="Customer"><InfoRow label="Name" value={data.customer_name} /><InfoRow label="Phone" value={data.customer_phone} /><InfoRow label="Email" value={data.customer_email} /><InfoRow label="RM" value={data.rm_name} /></Section>
    </div>
  );
}

/* ═══════════════════════════ TEAM TAB ═══════════════════════════ */
function TeamTab({ data, execution, hasHandoff, execStatus, setModal }) {
  if (!hasHandoff) return <EmptyState icon={<UserCheck className="w-10 h-10" />} text="Create handoff first" />;
  const hs = execution.handoff_status || 'pending';
  return (
    <div className="space-y-4" data-testid="team-tab">
      <Section title="Execution Status">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1" data-testid="exec-status-flow">
          {EXEC_STATUSES.map((s, i) => {
            const idx = EXEC_STATUSES.findIndex(e => e.value === execStatus);
            const isActive = s.value === execStatus;
            const isDone = i < idx;
            return (
              <div key={s.value} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold",
                  isDone ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-[#D4B36A] text-white' : 'bg-slate-100 text-slate-400'
                )}>{isDone ? '✓' : i + 1}</div>
                {isActive && <span className="text-[8px] font-semibold text-[#0B0B0D] whitespace-nowrap">{s.label}</span>}
                {i < EXEC_STATUSES.length - 1 && <div className={cn("w-2 h-0.5 rounded-full", isDone ? 'bg-emerald-300' : 'bg-slate-200')} />}
              </div>
            );
          })}
        </div>
        <button onClick={() => setModal({ type: 'update_exec_status', current: execStatus })}
          className="mt-3 w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg" data-testid="update-exec-status-btn">
          <Zap className="w-3.5 h-3.5" /> Update Status
        </button>
      </Section>
      <Section title="Execution Owner">
        {execution.owner_id ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-[14px]">{execution.owner_name?.charAt(0)?.toUpperCase() || '?'}</div>
            <div className="flex-1"><p className="text-[13px] font-bold text-[#0B0B0D]">{execution.owner_name}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500"><span>Assigned {formatDate(execution.assigned_at)}</span>
                {execution.acknowledged_at && <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Ack</span>}
              </div></div>
          </div>
        ) : <EmptyState icon={<UserCheck className="w-8 h-8" />} text="No owner assigned" />}
        <button onClick={() => setModal({ type: 'assign_owner' })} className="mt-3 w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg" data-testid="assign-owner-btn">
          <UserCheck className="w-3.5 h-3.5" /> {execution.owner_id ? 'Reassign' : 'Assign'} Owner
        </button>
      </Section>
      {execution.supporting_team?.length > 0 && (
        <Section title="Team">{execution.supporting_team.map((m, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg mb-1">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div><p className="text-[11px] font-semibold text-[#0B0B0D]">{m.name}</p>{m.role && <p className="text-[9px] text-slate-400">{m.role}</p>}</div>
          </div>
        ))}</Section>
      )}
      {hs === 'assigned' && <button onClick={() => setModal({ type: 'acknowledge' })} className="w-full flex items-center justify-center gap-1.5 h-10 bg-violet-600 text-white text-[12px] font-semibold rounded-xl" data-testid="acknowledge-btn"><Handshake className="w-4 h-4" /> Acknowledge</button>}
    </div>
  );
}

/* ═══════════════════════════ CHECKLIST (PREP) TAB ═══════════════════════════ */
function ChecklistTab({ data, readiness, onRefresh, setModal }) {
  const items = data.checklist || [];
  const [updating, setUpdating] = useState(null);
  const toggleItem = async (item) => {
    setUpdating(item.checklist_id);
    try { await api.put(`/execution/${data.lead_id}/checklist/${item.checklist_id}`, { status: item.status === 'done' ? 'pending' : 'done' }); await onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed'); }
    finally { setUpdating(null); }
  };
  const grouped = items.reduce((acc, item) => { const c = item.category || 'other'; if (!acc[c]) acc[c] = []; acc[c].push(item); return acc; }, {});
  const RCOLOR = { not_started: 'bg-slate-50 border-slate-200', in_progress: 'bg-blue-50 border-blue-200', blocked: 'bg-red-50 border-red-200', ready: 'bg-emerald-50 border-emerald-200' };
  return (
    <div className="space-y-4" data-testid="checklist-tab">
      <div className={cn("p-4 rounded-xl border", RCOLOR[readiness.posture] || 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-bold text-[#0B0B0D]">Pre-Event Readiness</h3>
          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase",
            readiness.posture === 'ready' ? 'bg-emerald-200 text-emerald-800' : readiness.posture === 'blocked' ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'
          )} data-testid="readiness-posture">{readiness.posture?.replace(/_/g, ' ') || 'Not Started'}</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", readiness.posture === 'ready' ? 'bg-emerald-500' : 'bg-[#D4B36A]')} style={{ width: `${readiness.total ? (readiness.done / readiness.total) * 100 : 0}%` }} /></div>
      </div>
      <button onClick={() => setModal({ type: 'add_checklist' })} className="w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg" data-testid="add-checklist-btn"><Plus className="w-3.5 h-3.5" /> Add Item</button>
      {Object.entries(grouped).map(([cat, citems]) => (
        <div key={cat}><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{cat.replace(/_/g, ' ')}</p>
          <div className="space-y-1.5">{citems.map(item => (
            <div key={item.checklist_id} className={cn("flex items-start gap-2.5 p-3 rounded-xl border", item.status === 'done' ? 'bg-emerald-50/50 border-emerald-200' : item.status === 'blocked' ? 'bg-red-50/50 border-red-200' : 'bg-white border-black/[0.05]')} data-testid={`chk-${item.checklist_id}`}>
              <button onClick={() => toggleItem(item)} disabled={updating === item.checklist_id} className="mt-0.5 flex-shrink-0">
                {item.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : item.status === 'blocked' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Circle className="w-5 h-5 text-slate-300" />}
              </button>
              <div className="flex-1 min-w-0"><p className={cn("text-[12px] font-medium", item.status === 'done' ? 'text-emerald-700 line-through' : 'text-[#0B0B0D]')}>{item.item}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">{item.assigned_to_name && <span className="text-[9px] text-slate-400">{item.assigned_to_name}</span>}{item.due_date && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{formatDate(item.due_date)}</span>}</div>
              </div>
              <button onClick={() => setModal({ type: 'update_checklist', item })} className="text-slate-300 hover:text-[#D4B36A] flex-shrink-0"><Edit3 className="w-3.5 h-3.5" /></button>
            </div>
          ))}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════ EVENT DAY TAB ═══════════════════════════ */
function EventDayTab({ data, eventDayData, execStatus, onRefresh, setModal }) {
  const ed = data.event_day || {};
  const timeline = eventDayData?.timeline || [];
  const incidents = eventDayData?.incidents || [];
  const openInc = incidents.filter(i => ['open', 'investigating'].includes(i.status));

  const isLiveOrBeyond = ['event_live', 'issue_active', 'event_completed', 'closure_note_pending', 'closure_ready'].includes(execStatus);

  return (
    <div className="space-y-4" data-testid="eventday-tab">
      {/* Go Live action */}
      {!isLiveOrBeyond && (
        <button onClick={() => setModal({ type: 'go_live' })} className="w-full flex items-center justify-center gap-2 h-11 bg-green-600 text-white text-[13px] font-bold rounded-xl active:scale-[0.98]" data-testid="go-live-btn">
          <Play className="w-4 h-4" /> Go Live — Start Event
        </button>
      )}

      {/* Setup Status */}
      <Section title="Setup & Readiness">
        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Setup Status</span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
              ed.setup_status === 'complete' ? 'bg-emerald-100 text-emerald-700' : ed.setup_status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            )}>{ed.setup_status || 'not started'}</span></div>
          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Venue Ready</span>
            {ed.venue_readiness_confirmed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}</div>
          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Customer Ready</span>
            {ed.customer_readiness_confirmed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}</div>
        </div>
        <button onClick={() => setModal({ type: 'update_setup' })} className="mt-3 w-full flex items-center justify-center gap-1.5 h-8 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-lg" data-testid="update-setup-btn">
          <Edit3 className="w-3 h-3" /> Update Setup
        </button>
      </Section>

      {/* Active Issues */}
      {openInc.length > 0 && (
        <Section title={`Active Issues (${openInc.length})`}>
          {openInc.map(inc => (
            <div key={inc.incident_id} className="p-2.5 bg-red-50 border border-red-200 rounded-lg mb-2">
              <div className="flex items-center gap-2"><span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase", SEVERITY_COLOR[inc.severity])}>{inc.severity}</span>
                <span className="text-[10px] text-slate-500">{inc.incident_type?.replace(/_/g, ' ')}</span></div>
              <p className="text-[12px] text-red-800 mt-1">{inc.description}</p>
              {inc.owner_name && <p className="text-[9px] text-red-600 mt-0.5">Owner: {inc.owner_name}</p>}
              <button onClick={() => setModal({ type: 'update_incident', incident: inc })} className="mt-1 text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1" data-testid={`resolve-inc-${inc.incident_id}`}>
                <Edit3 className="w-3 h-3" /> Update
              </button>
            </div>
          ))}
        </Section>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => setModal({ type: 'add_timeline' })} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[10px] font-semibold rounded-lg" data-testid="add-timeline-btn"><Plus className="w-3 h-3" /> Note</button>
        <button onClick={() => setModal({ type: 'add_incident' })} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-red-600 text-white text-[10px] font-semibold rounded-lg" data-testid="add-incident-btn"><CircleAlert className="w-3 h-3" /> Issue</button>
        {isLiveOrBeyond && !['event_completed', 'closure_note_pending', 'closure_ready'].includes(execStatus) && (
          <button onClick={() => setModal({ type: 'complete_event' })} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-violet-600 text-white text-[10px] font-semibold rounded-lg" data-testid="complete-event-btn"><PartyPopper className="w-3 h-3" /> Complete</button>
        )}
      </div>

      {/* Timeline */}
      <Section title="Timeline">
        {timeline.length === 0 ? <p className="text-[11px] text-slate-400 text-center py-4">No entries yet</p> : (
          <div className="space-y-2">{timeline.map(entry => (
            <div key={entry.entry_id} className="flex gap-2.5">
              <div className="flex flex-col items-center"><div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                entry.entry_type === 'issue_raised' ? 'bg-red-400' : entry.entry_type === 'issue_resolved' ? 'bg-emerald-400' : entry.entry_type === 'milestone' ? 'bg-[#D4B36A]' : 'bg-slate-300'
              )} /><div className="w-0.5 flex-1 bg-slate-100" /></div>
              <div className="pb-3 min-w-0"><p className="text-[11px] text-[#0B0B0D]">{entry.content}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{entry.created_by_name} · {formatTime(entry.created_at)}</p>
              </div>
            </div>
          ))}</div>
        )}
      </Section>

      {/* All Incidents */}
      {incidents.length > 0 && (
        <Section title={`All Incidents (${incidents.length})`}>
          {incidents.map(inc => (
            <div key={inc.incident_id} className={cn("p-2.5 rounded-lg border mb-2", inc.status === 'resolved' ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30')} data-testid={`inc-${inc.incident_id}`}>
              <div className="flex items-center gap-2"><span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase", SEVERITY_COLOR[inc.severity])}>{inc.severity}</span>
                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600')}>{inc.status}</span></div>
              <p className="text-[11px] text-[#0B0B0D] mt-1">{inc.description}</p>
              {inc.action_taken && <p className="text-[10px] text-slate-500 mt-0.5">Action: {inc.action_taken}</p>}
              {inc.resolution && <p className="text-[10px] text-emerald-600 mt-0.5">Resolution: {inc.resolution}</p>}
              {['open', 'investigating'].includes(inc.status) && (
                <button onClick={() => setModal({ type: 'update_incident', incident: inc })} className="mt-1 text-[10px] text-[#D4B36A] font-semibold"><Edit3 className="w-3 h-3 inline" /> Update</button>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

/* ═══════════════════════════ CHANGES + ADDENDA TAB ═══════════════════════════ */
function ChangesTab({ data, addenda, onRefresh, setModal }) {
  const crs = data.change_requests || [];
  return (
    <div className="space-y-4" data-testid="changes-tab">
      {/* Addenda Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commitment Addenda ({addenda.length})</h3>
          <button onClick={() => setModal({ type: 'add_addendum' })} className="text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1" data-testid="add-addendum-btn"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {addenda.length === 0 ? <p className="text-[11px] text-slate-400 bg-white rounded-xl border border-black/[0.05] p-4 text-center">No addenda. Original commitment unchanged.</p> : (
          addenda.map(a => (
            <div key={a.addendum_id} className="bg-white rounded-xl border border-blue-200 p-3.5 mb-2" data-testid={`addendum-${a.addendum_id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-blue-600">v{a.version}</span>
                <span className="text-[9px] text-slate-400">{formatDate(a.created_at)}</span>
              </div>
              <p className="text-[11px] font-semibold text-[#0B0B0D]">{a.field_changed}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px]">
                <span className="text-red-500 line-through">{a.original_value || '—'}</span>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 font-semibold">{a.new_value}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">Reason: {a.reason}</p>
              <p className="text-[9px] text-slate-400">by {a.approved_by_name} · {CR_TYPE_LABEL[a.change_type] || a.change_type}</p>
            </div>
          ))
        )}
      </div>

      {/* Change Requests */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Change Requests ({crs.length})</h3>
          <button onClick={() => setModal({ type: 'add_change_request' })} className="text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1" data-testid="add-cr-btn"><Plus className="w-3 h-3" /> Log</button>
        </div>
        {crs.length === 0 ? <p className="text-[11px] text-slate-400 bg-white rounded-xl border border-black/[0.05] p-4 text-center">No change requests</p> : (
          crs.map(cr => (
            <div key={cr.cr_id} className={cn("bg-white rounded-xl border p-3.5 mb-2", cr.status === 'open' ? 'border-red-200' : 'border-black/[0.05]')} data-testid={`cr-${cr.cr_id}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", CR_STATUS_COLOR[cr.status])}>{cr.status}</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{CR_TYPE_LABEL[cr.cr_type] || cr.cr_type}</span>
                <span className="text-[9px] text-slate-400 ml-auto">{formatDate(cr.created_at)}</span>
              </div>
              <p className="text-[12px] text-[#0B0B0D]">{cr.description}</p>
              {cr.impact && <p className="text-[10px] text-orange-600 mt-1">Impact: {cr.impact}</p>}
              {cr.resolution && <div className="mt-1.5 p-2 bg-emerald-50 rounded-lg"><p className="text-[10px] text-emerald-700">{cr.resolution}</p></div>}
              {['open', 'under_review'].includes(cr.status) && (
                <button onClick={() => setModal({ type: 'resolve_cr', cr })} className="mt-1.5 text-[10px] text-[#D4B36A] font-semibold"><Edit3 className="w-3 h-3 inline" /> Resolve</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ CLOSURE TAB ═══════════════════════════ */
function ClosureTab({ data, closureData, execStatus, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [noteVal, setNoteVal] = useState('');

  const toggleCheck = async (checkId, val) => {
    setSaving(true);
    try { await api.post(`/execution/${data.lead_id}/closure`, { [checkId]: !val }); await onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveNote = async () => {
    if (!noteVal.trim()) return;
    setSaving(true);
    try { await api.post(`/execution/${data.lead_id}/closure`, { closure_note: noteVal }); await onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const closeEvent = async () => {
    if (!window.confirm('Close this event? All checks must pass.')) return;
    setClosing(true);
    try { await api.post(`/execution/${data.lead_id}/close`); await onRefresh(); }
    catch (err) { alert(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response?.data?.detail)); }
    finally { setClosing(false); }
  };

  if (!closureData) return <EmptyState icon={<Lock className="w-10 h-10" />} text="Complete the event first" />;

  const allReady = closureData.all_ready;
  const canClose = allReady && ['event_completed', 'closure_note_pending'].includes(execStatus);

  return (
    <div className="space-y-4" data-testid="closure-tab">
      <div className="bg-white rounded-xl border border-black/[0.05] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-[#0B0B0D]">Closure Readiness</h3>
          <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", allReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')} data-testid="closure-status">
            {closureData.passed_count}/{closureData.total_count} {allReady ? 'Ready' : 'Pending'}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", allReady ? 'bg-emerald-500' : 'bg-[#D4B36A]')} style={{ width: `${(closureData.passed_count / closureData.total_count) * 100}%` }} data-testid="closure-progress" />
        </div>
      </div>

      <div className="space-y-2">
        {closureData.checks.map(check => (
          check.id === 'closure_note' ? (
            <div key={check.id} className={cn("p-3.5 rounded-xl border", check.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-black/[0.05]')} data-testid={`closure-check-${check.id}`}>
              <div className="flex items-center gap-3 mb-2">
                {check.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
                <span className={cn("text-[12px] font-medium", check.passed ? 'text-emerald-700' : 'text-[#0B0B0D]')}>{check.label}</span>
              </div>
              {closureData.closure?.closure_note ? (
                <p className="text-[11px] text-slate-600 ml-8 bg-slate-50 p-2 rounded-lg">{closureData.closure.closure_note}</p>
              ) : (
                <div className="ml-8 flex gap-2">
                  <input type="text" value={noteVal} onChange={e => setNoteVal(e.target.value)} placeholder="Add closure note..."
                    className="flex-1 h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[11px]" data-testid="closure-note-input" />
                  <button onClick={saveNote} disabled={saving} className="px-3 h-8 bg-[#0B0B0D] text-white text-[10px] font-semibold rounded-lg" data-testid="save-closure-note">Save</button>
                </div>
              )}
            </div>
          ) : (
            <button key={check.id} onClick={() => toggleCheck(check.id, check.passed)} disabled={saving}
              className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                check.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-black/[0.05]'
              )} data-testid={`closure-check-${check.id}`}>
              {check.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
              <span className={cn("text-[12px] font-medium", check.passed ? 'text-emerald-700' : 'text-[#0B0B0D]')}>{check.label}</span>
            </button>
          )
        ))}
      </div>

      {execStatus === 'closure_ready' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <Lock className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-[14px] font-bold text-emerald-700">Event Closed</p>
        </div>
      ) : (
        <button onClick={closeEvent} disabled={!canClose || closing}
          className={cn("w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[13px] font-bold transition-all",
            canClose ? 'bg-emerald-600 text-white active:scale-[0.98]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )} data-testid="close-event-btn">
          {closing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            canClose ? <><Lock className="w-4 h-4" /> Close Event</> : <><Lock className="w-4 h-4" /> {!allReady ? 'Complete all checks' : 'Complete event first'}</>}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════ MODAL ═══════════════════════════ */
function ModalOverlay({ modal, setModal, leadId, onRefresh }) {
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      switch (modal.type) {
        case 'create_handoff': await api.post(`/execution/${leadId}/handoff`, { venue_name: form.venue_name, event_time: form.event_time, customer_requirements: form.customer_requirements, rm_handoff_notes: form.rm_handoff_notes, special_promises: form.special_promises }); break;
        case 'assign_owner': await api.post(`/execution/${leadId}/assign`, { owner_id: form.owner_id || `user_${Date.now()}`, owner_name: form.owner_name, supporting_team: form.team_name ? [{ name: form.team_name, role: form.team_role }] : [], handoff_notes: form.handoff_notes }); break;
        case 'acknowledge': await api.post(`/execution/${leadId}/acknowledge`, { notes: form.notes }); break;
        case 'update_exec_status': await api.post(`/execution/${leadId}/execution-status`, { status: form.status, note: form.note }); break;
        case 'go_live': await api.post(`/execution/${leadId}/execution-status`, { status: 'event_live', note: form.note || 'Event started' }); break;
        case 'update_setup': await api.post(`/execution/${leadId}/event-day/setup`, { setup_status: form.setup_status, venue_readiness_confirmed: form.venue_ready === 'true', customer_readiness_confirmed: form.customer_ready === 'true', note: form.note }); break;
        case 'add_timeline': await api.post(`/execution/${leadId}/event-day/timeline`, { entry_type: form.entry_type || 'note', content: form.content }); break;
        case 'add_incident': await api.post(`/execution/${leadId}/incidents`, { incident_type: form.incident_type, severity: form.severity, description: form.description, owner_name: form.owner_name }); break;
        case 'update_incident': await api.put(`/execution/${leadId}/incidents/${modal.incident.incident_id}`, { status: form.status, action_taken: form.action_taken, resolution: form.resolution, closure_impact: form.closure_impact }); break;
        case 'complete_event': await api.post(`/execution/${leadId}/complete`, { major_issue: form.major_issue === 'true', completion_note: form.completion_note, post_event_actions: form.post_event_actions }); break;
        case 'add_checklist': await api.post(`/execution/${leadId}/checklist`, { item: form.item, category: form.category || 'other', assigned_to_name: form.assigned_to_name, due_date: form.due_date, notes: form.notes }); break;
        case 'update_checklist': await api.put(`/execution/${leadId}/checklist/${modal.item.checklist_id}`, { status: form.status, notes: form.notes, assigned_to_name: form.assigned_to_name, due_date: form.due_date }); break;
        case 'add_change_request': await api.post(`/execution/${leadId}/change-requests`, { cr_type: form.cr_type, description: form.description, impact: form.impact, requested_by_name: form.requested_by_name }); break;
        case 'resolve_cr': await api.put(`/execution/${leadId}/change-requests/${modal.cr.cr_id}`, { status: form.status || 'implemented', resolution: form.resolution }); break;
        case 'add_addendum': await api.post(`/execution/${leadId}/addendum`, { linked_cr_id: form.linked_cr_id, change_type: form.change_type, field_changed: form.field_changed, original_value: form.original_value, new_value: form.new_value, reason: form.reason }); break;
        default: break;
      }
      await onRefresh();
      setModal(null);
    } catch (err) { alert(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response?.data?.detail)); }
    finally { setSubmitting(false); }
  };

  const titles = {
    create_handoff: 'Create Handoff', assign_owner: 'Assign Owner', acknowledge: 'Acknowledge', update_exec_status: 'Update Status',
    go_live: 'Go Live', update_setup: 'Update Setup', add_timeline: 'Add Note', add_incident: 'Log Issue',
    update_incident: 'Update Issue', complete_event: 'Complete Event', add_checklist: 'Add Task', update_checklist: 'Update Task',
    add_change_request: 'Log Change Request', resolve_cr: 'Resolve CR', add_addendum: 'Add Addendum',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setModal(null)} data-testid="exec-modal">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-black/[0.05] px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-[14px] font-bold text-[#0B0B0D]" data-testid="exec-modal-title">{titles[modal.type]}</h3>
          <button onClick={() => setModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100" data-testid="exec-modal-close"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="px-4 py-4 space-y-3" style={sans}>
          {modal.type === 'create_handoff' && (<><FI label="Venue Name" v={form.venue_name} s={v => set('venue_name', v)} tid="hoff-venue" /><FI label="Event Time" v={form.event_time} s={v => set('event_time', v)} tid="hoff-time" /><FI label="Customer Requirements" v={form.customer_requirements} s={v => set('customer_requirements', v)} tid="hoff-reqs" /><FI label="Promises" v={form.special_promises} s={v => set('special_promises', v)} tid="hoff-promises" /><FI label="RM Notes" v={form.rm_handoff_notes} s={v => set('rm_handoff_notes', v)} tid="hoff-notes" /></>)}
          {modal.type === 'assign_owner' && (<><FI label="Owner Name" v={form.owner_name} s={v => set('owner_name', v)} tid="owner-name" /><FI label="Team Member" v={form.team_name} s={v => set('team_name', v)} tid="team-name" /><FI label="Team Role" v={form.team_role} s={v => set('team_role', v)} tid="team-role" /><FI label="Notes" v={form.handoff_notes} s={v => set('handoff_notes', v)} tid="assign-notes" /></>)}
          {modal.type === 'acknowledge' && <FI label="Notes" v={form.notes} s={v => set('notes', v)} tid="ack-notes" />}
          {modal.type === 'update_exec_status' && (<><FS label="Status" v={form.status} s={v => set('status', v)} opts={EXEC_STATUSES.filter(s => { const i = EXEC_STATUSES.findIndex(e => e.value === modal.current); return EXEC_STATUSES.indexOf(s) > i; }).map(s => ({ value: s.value, label: s.label }))} tid="exec-status" /><FI label="Note" v={form.note} s={v => set('note', v)} tid="exec-note" /></>)}
          {modal.type === 'go_live' && <FI label="Note (optional)" v={form.note} s={v => set('note', v)} tid="live-note" />}
          {modal.type === 'update_setup' && (<><FS label="Setup Status" v={form.setup_status} s={v => set('setup_status', v)} opts={[{value:'not_started',label:'Not Started'},{value:'in_progress',label:'In Progress'},{value:'complete',label:'Complete'}]} tid="setup-status" /><FS label="Venue Ready" v={form.venue_ready} s={v => set('venue_ready', v)} opts={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} tid="venue-ready" /><FS label="Customer Ready" v={form.customer_ready} s={v => set('customer_ready', v)} opts={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} tid="customer-ready" /><FI label="Note" v={form.note} s={v => set('note', v)} tid="setup-note" /></>)}
          {modal.type === 'add_timeline' && (<><FS label="Type" v={form.entry_type} s={v => set('entry_type', v)} opts={['note','setup','milestone','customer_update','vendor_update'].map(t => ({value:t,label:t.replace(/_/g,' ')}))} tid="tl-type" /><FI label="Content" v={form.content} s={v => set('content', v)} tid="tl-content" /></>)}
          {modal.type === 'add_incident' && (<><FS label="Type" v={form.incident_type} s={v => set('incident_type', v)} opts={['vendor_issue','venue_issue','customer_issue','logistics_issue','quality_issue','safety_issue','other'].map(t => ({value:t,label:t.replace(/_/g,' ')}))} tid="inc-type" /><FS label="Severity" v={form.severity} s={v => set('severity', v)} opts={['low','medium','high','critical'].map(t => ({value:t,label:t}))} tid="inc-severity" /><FI label="Description" v={form.description} s={v => set('description', v)} tid="inc-desc" /><FI label="Owner" v={form.owner_name} s={v => set('owner_name', v)} tid="inc-owner" /></>)}
          {modal.type === 'update_incident' && (<><FS label="Status" v={form.status} s={v => set('status', v)} opts={['investigating','resolved','escalated'].map(t => ({value:t,label:t}))} tid="inc-upd-status" /><FI label="Action Taken" v={form.action_taken} s={v => set('action_taken', v)} tid="inc-action" /><FI label="Resolution" v={form.resolution} s={v => set('resolution', v)} tid="inc-resolution" /><FI label="Closure Impact" v={form.closure_impact} s={v => set('closure_impact', v)} tid="inc-impact" /></>)}
          {modal.type === 'complete_event' && (<><FS label="Major Issue?" v={form.major_issue} s={v => set('major_issue', v)} opts={[{value:'false',label:'No'},{value:'true',label:'Yes'}]} tid="major-issue" /><FI label="Completion Note" v={form.completion_note} s={v => set('completion_note', v)} tid="completion-note" /><FI label="Post-Event Actions" v={form.post_event_actions} s={v => set('post_event_actions', v)} tid="post-actions" /></>)}
          {modal.type === 'add_checklist' && (<><FI label="Task" v={form.item} s={v => set('item', v)} tid="chk-item" /><FS label="Category" v={form.category} s={v => set('category', v)} opts={['venue_coordination','customer_communication','logistics','vendor_management','documentation','payment','other'].map(c => ({value:c,label:c.replace(/_/g,' ')}))} tid="chk-cat" /><FI label="Assigned To" v={form.assigned_to_name} s={v => set('assigned_to_name', v)} tid="chk-assign" /><FI label="Due Date" v={form.due_date} s={v => set('due_date', v)} t="date" tid="chk-due" /></>)}
          {modal.type === 'update_checklist' && (<><FS label="Status" v={form.status} s={v => set('status', v)} opts={['pending','in_progress','done','blocked','na'].map(s => ({value:s,label:s.replace(/_/g,' ')}))} tid="chk-status" /><FI label="Notes" v={form.notes} s={v => set('notes', v)} tid="chk-notes" /></>)}
          {modal.type === 'add_change_request' && (<><FS label="Type" v={form.cr_type} s={v => set('cr_type', v)} opts={[{value:'customer_requirement',label:'Customer Req'},{value:'venue_change',label:'Venue'},{value:'commercial_change',label:'Commercial'},{value:'schedule_change',label:'Schedule'},{value:'special_requirement',label:'Special'}]} tid="cr-type" /><FI label="Description" v={form.description} s={v => set('description', v)} tid="cr-desc" /><FI label="Impact" v={form.impact} s={v => set('impact', v)} tid="cr-impact" /><FI label="Requested By" v={form.requested_by_name} s={v => set('requested_by_name', v)} tid="cr-by" /></>)}
          {modal.type === 'resolve_cr' && (<><FS label="Status" v={form.status} s={v => set('status', v)} opts={[{value:'under_review',label:'Under Review'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'},{value:'implemented',label:'Implemented'}]} tid="cr-res-status" /><FI label="Resolution" v={form.resolution} s={v => set('resolution', v)} tid="cr-resolution" /></>)}
          {modal.type === 'add_addendum' && (<><FS label="Change Type" v={form.change_type} s={v => set('change_type', v)} opts={[{value:'customer_requirement',label:'Customer Req'},{value:'venue_change',label:'Venue'},{value:'commercial_change',label:'Commercial'},{value:'schedule_change',label:'Schedule'},{value:'special_requirement',label:'Special'}]} tid="add-type" /><FI label="Field Changed" v={form.field_changed} s={v => set('field_changed', v)} tid="add-field" /><FI label="Original Value" v={form.original_value} s={v => set('original_value', v)} tid="add-orig" /><FI label="New Value" v={form.new_value} s={v => set('new_value', v)} tid="add-new" /><FI label="Reason" v={form.reason} s={v => set('reason', v)} tid="add-reason" /></>)}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-black/[0.05] px-4 py-3">
          <button onClick={handleSubmit} disabled={submitting} className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50" data-testid="exec-modal-submit">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════ SHARED ═══════ */
function Section({ title, children }) { return <div className="bg-white rounded-xl border border-black/[0.05] p-4"><h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>{children}</div>; }
function InfoRow({ label, value, hl }) { if (!value && value !== 0) return null; return <div className="flex items-center justify-between py-1"><span className="text-[11px] text-slate-400">{label}</span><span className={cn("text-[12px] text-right max-w-[60%] truncate", hl ? 'font-bold text-[#0B0B0D]' : 'font-medium text-[#0B0B0D]')}>{value}</span></div>; }
function EmptyState({ icon, text }) { return <div className="text-center py-8"><div className="text-slate-200 mx-auto mb-2 flex justify-center">{icon}</div><p className="text-[12px] text-slate-400">{text}</p></div>; }
function NoteBlock({ color, label, text }) { const bg = color === 'blue' ? 'bg-blue-50' : color === 'amber' ? 'bg-amber-50' : 'bg-[#D4B36A]/[0.06]'; const tc = color === 'blue' ? 'text-blue-600' : color === 'amber' ? 'text-amber-600' : 'text-[#8B7A3E]'; const tb = color === 'blue' ? 'text-blue-800' : color === 'amber' ? 'text-amber-800' : 'text-[#0B0B0D]'; return <div className={cn("p-2.5 rounded-lg mb-2", bg)}><p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", tc)}>{label}</p><p className={cn("text-[12px]", tb)}>{text}</p></div>; }
function FI({ label, v, s, t = 'text', tid }) { return <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label><input type={t} value={v || ''} onChange={e => s(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30" data-testid={tid} /></div>; }
function FS({ label, v, s, opts, tid }) { return <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label><select value={v || ''} onChange={e => s(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30" data-testid={tid}><option value="">Select...</option>{opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } }
function formatTime(d) { if (!d) return ''; try { const dt = new Date(d); return `${dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`; } catch { return d; } }
