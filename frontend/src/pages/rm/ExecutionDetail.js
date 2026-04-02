import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, Users,
  CheckCircle2, Circle, Clock, AlertTriangle, Package, UserCheck,
  ShieldCheck, Plus, Send, X, Edit3, IndianRupee, Lock,
  FileWarning, ClipboardList, Handshake, ChevronDown,
  Hourglass, Building2, Zap,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const TABS = [
  { id: 'handoff', label: 'Handoff' },
  { id: 'team', label: 'Team' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'changes', label: 'Changes' },
];

const HANDOFF_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_preparation', label: 'In Preparation' },
  { value: 'ready', label: 'Ready' },
];

const STATUS_BADGE = {
  no_handoff:      { label: 'No Handoff',    bg: 'bg-slate-100', text: 'text-slate-600' },
  pending:         { label: 'Pending',        bg: 'bg-amber-100', text: 'text-amber-700' },
  assigned:        { label: 'Assigned',       bg: 'bg-blue-100', text: 'text-blue-700' },
  acknowledged:    { label: 'Acknowledged',   bg: 'bg-violet-100', text: 'text-violet-700' },
  in_preparation:  { label: 'In Prep',        bg: 'bg-cyan-100', text: 'text-cyan-700' },
  ready:           { label: 'Ready',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const READINESS_BG = {
  not_started: 'bg-slate-50 border-slate-200',
  in_progress: 'bg-blue-50 border-blue-200',
  blocked: 'bg-red-50 border-red-200',
  ready: 'bg-emerald-50 border-emerald-200',
};

const CR_TYPE_LABEL = {
  customer_requirement: 'Customer Req',
  venue_change: 'Venue Change',
  commercial_change: 'Commercial',
  schedule_change: 'Schedule',
  special_requirement: 'Special Req',
};

const CR_STATUS_COLOR = {
  open: 'bg-red-50 text-red-600',
  under_review: 'bg-amber-50 text-amber-600',
  approved: 'bg-blue-50 text-blue-600',
  rejected: 'bg-slate-100 text-slate-500',
  implemented: 'bg-emerald-50 text-emerald-600',
};

export default function ExecutionDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('handoff');
  const [modal, setModal] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/execution/${leadId}/handoff`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch execution data:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Execution data not found</p>
      </div>
    );
  }

  const snapshot = data.booking_snapshot || {};
  const execution = data.execution || {};
  const readiness = data.pre_event_readiness || {};
  const hasHandoff = !!snapshot.snapshot_locked_at;
  const handoffStatus = hasHandoff ? (execution.handoff_status || 'pending') : 'no_handoff';
  const statusBadge = STATUS_BADGE[handoffStatus] || STATUS_BADGE.no_handoff;

  return (
    <div className="min-h-screen bg-[#F8F7F4]" style={sans} data-testid="execution-detail-page">
      {/* Sticky Header */}
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
              {data.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{data.city}</span>}
            </div>
          </div>
          {data.customer_phone && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => window.open(`tel:${data.customer_phone}`, '_self')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20" data-testid="exec-call-btn">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button onClick={() => window.open(`https://wa.me/${data.customer_phone?.replace(/\D/g, '')}`, '_blank')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20" data-testid="exec-wa-btn">
                <MessageCircle className="w-3.5 h-3.5 text-green-400" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full", statusBadge.bg, statusBadge.text)} data-testid="exec-status-badge">
            {statusBadge.label}
          </span>
          {data.event_date && (
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{formatDate(data.event_date)}
            </span>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-[calc(env(safe-area-inset-top,12px)+88px)] z-10 bg-white border-b border-black/[0.05] px-2">
        <div className="flex" data-testid="exec-detail-tabs">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all text-center",
                activeTab === tab.id ? 'border-[#D4B36A] text-[#0B0B0D]' : 'border-transparent text-slate-400'
              )} data-testid={`exec-tab-${tab.id}`}>
              {tab.label}
              {tab.id === 'checklist' && (
                <span className={cn("ml-1 text-[9px] px-1.5 rounded-full",
                  readiness.posture === 'ready' ? 'bg-emerald-100 text-emerald-600' :
                  readiness.posture === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                )}>{readiness.done || 0}/{readiness.total || 0}</span>
              )}
              {tab.id === 'changes' && data.change_requests?.length > 0 && (
                <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1.5 rounded-full">
                  {data.change_requests.filter(c => c.status === 'open').length || data.change_requests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4 pb-24">
        {activeTab === 'handoff' && <HandoffTab data={data} snapshot={snapshot} hasHandoff={hasHandoff} onRefresh={fetchData} setModal={setModal} />}
        {activeTab === 'team' && <TeamTab data={data} execution={execution} hasHandoff={hasHandoff} onRefresh={fetchData} setModal={setModal} />}
        {activeTab === 'checklist' && <ChecklistTab data={data} readiness={readiness} onRefresh={fetchData} setModal={setModal} />}
        {activeTab === 'changes' && <ChangesTab data={data} onRefresh={fetchData} setModal={setModal} />}
      </div>

      {modal && <ModalOverlay modal={modal} setModal={setModal} leadId={leadId} onRefresh={fetchData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HANDOFF TAB
   ═══════════════════════════════════════════════════════════════ */
function HandoffTab({ data, snapshot, hasHandoff, onRefresh, setModal }) {
  if (!hasHandoff) {
    return (
      <div className="space-y-4" data-testid="handoff-tab">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <Package className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-[13px] font-bold text-amber-800">Handoff Not Created</p>
          <p className="text-[11px] text-amber-600 mt-1">Create a handoff package to lock the booking snapshot and begin execution prep.</p>
          <button onClick={() => setModal({ type: 'create_handoff' })}
            className="mt-3 px-4 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1.5"
            data-testid="create-handoff-btn">
            <Package className="w-3.5 h-3.5" /> Create Handoff Package
          </button>
        </div>

        {/* Still show customer info */}
        <Section title="Customer">
          <InfoRow label="Name" value={data.customer_name} />
          <InfoRow label="Phone" value={data.customer_phone} />
          <InfoRow label="Email" value={data.customer_email} />
          <InfoRow label="Event" value={data.event_type} />
          <InfoRow label="Date" value={formatDate(data.event_date)} />
          <InfoRow label="City" value={data.city} />
          <InfoRow label="RM" value={data.rm_name} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="handoff-tab">
      {/* Locked Snapshot */}
      <Section title="Booking Snapshot">
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-emerald-50 rounded-lg">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-600">Locked on {formatDate(snapshot.snapshot_locked_at)}</span>
        </div>
        <div className="space-y-1.5">
          <InfoRow label="Venue" value={snapshot.venue_name} highlight />
          <InfoRow label="Venue City" value={snapshot.venue_city} />
          <InfoRow label="Event Date" value={formatDate(snapshot.event_date)} />
          <InfoRow label="Event Time" value={snapshot.event_time} />
          <InfoRow label="Guest Count" value={snapshot.guest_count} />
          <InfoRow label="Event Type" value={snapshot.event_type} />
          {snapshot.final_amount && <InfoRow label="Final Amount" value={`₹${snapshot.final_amount?.toLocaleString()}`} highlight />}
          {snapshot.amount_per_plate && <InfoRow label="Per Plate" value={`₹${snapshot.amount_per_plate?.toLocaleString()}`} />}
          {snapshot.inclusions && <InfoRow label="Inclusions" value={snapshot.inclusions} />}
          {snapshot.exclusions && <InfoRow label="Exclusions" value={snapshot.exclusions} />}
          {snapshot.special_terms && <InfoRow label="Special Terms" value={snapshot.special_terms} />}
        </div>
      </Section>

      {/* Customer Requirements + Promises */}
      {(snapshot.customer_requirements || snapshot.special_promises) && (
        <Section title="Key Notes">
          {snapshot.customer_requirements && (
            <div className="p-2.5 bg-blue-50 rounded-lg mb-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Customer Requirements</p>
              <p className="text-[12px] text-blue-800">{snapshot.customer_requirements}</p>
            </div>
          )}
          {snapshot.special_promises && (
            <div className="p-2.5 bg-amber-50 rounded-lg mb-2">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Promises Made</p>
              <p className="text-[12px] text-amber-800">{snapshot.special_promises}</p>
            </div>
          )}
          {snapshot.rm_handoff_notes && (
            <div className="p-2.5 bg-[#D4B36A]/[0.06] rounded-lg">
              <p className="text-[10px] font-bold text-[#8B7A3E] uppercase tracking-wider mb-0.5">RM Handoff Notes</p>
              <p className="text-[12px] text-[#0B0B0D]">{snapshot.rm_handoff_notes}</p>
            </div>
          )}
        </Section>
      )}

      {/* Customer Info */}
      <Section title="Customer Contact">
        <InfoRow label="Name" value={data.customer_name} />
        <InfoRow label="Phone" value={data.customer_phone} />
        <InfoRow label="Email" value={data.customer_email} />
        <InfoRow label="RM" value={data.rm_name} />
        <InfoRow label="Confirmed" value={formatDate(data.confirmed_at)} />
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEAM TAB
   ═══════════════════════════════════════════════════════════════ */
function TeamTab({ data, execution, hasHandoff, onRefresh, setModal }) {
  if (!hasHandoff) {
    return (
      <div className="text-center py-12" data-testid="team-tab">
        <UserCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[12px] text-slate-400">Create handoff package first to assign team</p>
      </div>
    );
  }

  const handoffStatus = execution.handoff_status || 'pending';

  return (
    <div className="space-y-4" data-testid="team-tab">
      {/* Handoff Status Flow */}
      <Section title="Handoff Status">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1" data-testid="handoff-status-flow">
          {HANDOFF_STATUSES.map((s, i) => {
            const isActive = s.value === handoffStatus;
            const idx = HANDOFF_STATUSES.findIndex(h => h.value === handoffStatus);
            const isDone = i < idx;
            return (
              <div key={s.value} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold",
                  isDone ? 'bg-emerald-100 text-emerald-600' :
                  isActive ? 'bg-[#D4B36A] text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  {isDone ? '✓' : i + 1}
                </div>
                {isActive && <span className="text-[9px] font-semibold text-[#0B0B0D]">{s.label}</span>}
                {i < HANDOFF_STATUSES.length - 1 && <div className={cn("w-3 h-0.5 rounded-full", isDone ? 'bg-emerald-300' : 'bg-slate-200')} />}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Execution Owner */}
      <Section title="Execution Owner">
        {execution.owner_id ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-[14px]">
              {execution.owner_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#0B0B0D]">{execution.owner_name}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>Assigned {formatDate(execution.assigned_at)}</span>
                {execution.acknowledged_at && (
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Acknowledged
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <UserCheck className="w-8 h-8 text-slate-200 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">No execution owner assigned</p>
          </div>
        )}
        <button onClick={() => setModal({ type: 'assign_owner' })}
          className="mt-3 w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg"
          data-testid="assign-owner-btn">
          <UserCheck className="w-3.5 h-3.5" /> {execution.owner_id ? 'Reassign' : 'Assign'} Owner
        </button>
      </Section>

      {/* Supporting Team */}
      {execution.supporting_team?.length > 0 && (
        <Section title="Supporting Team">
          <div className="space-y-1.5">
            {execution.supporting_team.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  {m.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#0B0B0D]">{m.name}</p>
                  {m.role && <p className="text-[9px] text-slate-400">{m.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Handoff Actions */}
      {handoffStatus === 'assigned' && (
        <button onClick={() => setModal({ type: 'acknowledge' })}
          className="w-full flex items-center justify-center gap-1.5 h-10 bg-violet-600 text-white text-[12px] font-semibold rounded-xl"
          data-testid="acknowledge-btn">
          <Handshake className="w-4 h-4" /> Acknowledge Handoff
        </button>
      )}
      {['acknowledged', 'in_preparation'].includes(handoffStatus) && (
        <button onClick={() => setModal({ type: 'update_handoff_status', currentStatus: handoffStatus })}
          className="w-full flex items-center justify-center gap-1.5 h-10 bg-[#D4B36A] text-[#0B0B0D] text-[12px] font-semibold rounded-xl"
          data-testid="update-handoff-status-btn">
          <Zap className="w-4 h-4" /> Update Handoff Status
        </button>
      )}
      {execution.handoff_notes && (
        <Section title="Handoff Notes">
          <p className="text-[11px] text-slate-600 whitespace-pre-wrap">{execution.handoff_notes}</p>
        </Section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHECKLIST TAB
   ═══════════════════════════════════════════════════════════════ */
function ChecklistTab({ data, readiness, onRefresh, setModal }) {
  const items = data.checklist || [];
  const [updating, setUpdating] = useState(null);

  const toggleItem = async (item) => {
    setUpdating(item.checklist_id);
    const newStatus = item.status === 'done' ? 'pending' : 'done';
    try {
      await api.put(`/execution/${data.lead_id}/checklist/${item.checklist_id}`, { status: newStatus });
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    } finally {
      setUpdating(null);
    }
  };

  const groupedByCategory = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="checklist-tab">
      {/* Readiness Posture */}
      <div className={cn("p-4 rounded-xl border", READINESS_BG[readiness.posture] || 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-bold text-[#0B0B0D]">Pre-Event Readiness</h3>
          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase",
            readiness.posture === 'ready' ? 'bg-emerald-200 text-emerald-800' :
            readiness.posture === 'blocked' ? 'bg-red-200 text-red-800' :
            readiness.posture === 'in_progress' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
          )} data-testid="readiness-posture">{readiness.posture?.replace(/_/g, ' ') || 'Not Started'}</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500",
            readiness.posture === 'ready' ? 'bg-emerald-500' :
            readiness.posture === 'blocked' ? 'bg-red-400' : 'bg-[#D4B36A]'
          )} style={{ width: `${readiness.total ? (readiness.done / readiness.total) * 100 : 0}%` }} data-testid="checklist-progress" />
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px]">
          <span className="text-emerald-600 font-semibold">{readiness.done || 0} done</span>
          <span className="text-slate-500">{readiness.pending || 0} pending</span>
          {readiness.blocked > 0 && <span className="text-red-500 font-semibold">{readiness.blocked} blocked</span>}
        </div>
      </div>

      {/* Add Item */}
      <button onClick={() => setModal({ type: 'add_checklist' })}
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg"
        data-testid="add-checklist-btn">
        <Plus className="w-3.5 h-3.5" /> Add Checklist Item
      </button>

      {/* Grouped Items */}
      {Object.entries(groupedByCategory).map(([category, catItems]) => (
        <div key={category}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {category.replace(/_/g, ' ')}
          </p>
          <div className="space-y-1.5">
            {catItems.map(item => (
              <div key={item.checklist_id} className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl border transition-all",
                item.status === 'done' ? 'bg-emerald-50/50 border-emerald-200' :
                item.status === 'blocked' ? 'bg-red-50/50 border-red-200' : 'bg-white border-black/[0.05]'
              )} data-testid={`checklist-item-${item.checklist_id}`}>
                <button onClick={() => toggleItem(item)} disabled={updating === item.checklist_id}
                  className="mt-0.5 flex-shrink-0">
                  {item.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : item.status === 'blocked' ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-medium", item.status === 'done' ? 'text-emerald-700 line-through' : 'text-[#0B0B0D]')}>
                    {item.item}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.assigned_to_name && <span className="text-[9px] text-slate-400">{item.assigned_to_name}</span>}
                    {item.due_date && (
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />{formatDate(item.due_date)}
                      </span>
                    )}
                    {item.notes && <span className="text-[9px] text-slate-400 truncate max-w-[50%]">{item.notes}</span>}
                  </div>
                </div>
                <button onClick={() => setModal({ type: 'update_checklist', item })}
                  className="text-slate-300 hover:text-[#D4B36A] flex-shrink-0"
                  data-testid={`edit-checklist-${item.checklist_id}`}>
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8">
          <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-1" />
          <p className="text-[12px] text-slate-400">No checklist items. Create a handoff first.</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHANGES TAB
   ═══════════════════════════════════════════════════════════════ */
function ChangesTab({ data, onRefresh, setModal }) {
  const crs = data.change_requests || [];

  return (
    <div className="space-y-3" data-testid="changes-tab">
      <button onClick={() => setModal({ type: 'add_change_request' })}
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-[#0B0B0D] text-white text-[11px] font-semibold rounded-lg"
        data-testid="add-cr-btn">
        <Plus className="w-3.5 h-3.5" /> Log Change Request
      </button>

      {crs.length === 0 ? (
        <div className="text-center py-8">
          <FileWarning className="w-8 h-8 text-slate-200 mx-auto mb-1" />
          <p className="text-[12px] text-slate-400">No change requests logged</p>
        </div>
      ) : (
        crs.map(cr => (
          <div key={cr.cr_id} className={cn(
            "bg-white rounded-xl border p-3.5",
            cr.status === 'open' ? 'border-red-200 bg-red-50/20' : 'border-black/[0.05]'
          )} data-testid={`cr-${cr.cr_id}`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block mb-1",
                  CR_STATUS_COLOR[cr.status] || 'bg-slate-100 text-slate-500'
                )}>{cr.status}</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ml-1">
                  {CR_TYPE_LABEL[cr.cr_type] || cr.cr_type}
                </span>
              </div>
              <span className="text-[9px] text-slate-400">{formatDate(cr.created_at)}</span>
            </div>
            <p className="text-[12px] text-[#0B0B0D] mt-1.5">{cr.description}</p>
            {cr.impact && <p className="text-[10px] text-orange-600 mt-1">Impact: {cr.impact}</p>}
            {cr.requested_by_name && <p className="text-[9px] text-slate-400 mt-0.5">Requested by: {cr.requested_by_name}</p>}
            {cr.resolution && (
              <div className="mt-2 p-2 bg-emerald-50 rounded-lg">
                <p className="text-[10px] text-emerald-700"><strong>Resolution:</strong> {cr.resolution}</p>
                <p className="text-[9px] text-emerald-600 mt-0.5">by {cr.resolved_by_name} · {formatDate(cr.resolved_at)}</p>
              </div>
            )}
            {['open', 'under_review'].includes(cr.status) && (
              <button onClick={() => setModal({ type: 'resolve_cr', cr })}
                className="mt-2 text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1"
                data-testid={`resolve-cr-${cr.cr_id}`}>
                <Edit3 className="w-3 h-3" /> Resolve
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODAL OVERLAY
   ═══════════════════════════════════════════════════════════════ */
function ModalOverlay({ modal, setModal, leadId, onRefresh }) {
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      switch (modal.type) {
        case 'create_handoff':
          await api.post(`/execution/${leadId}/handoff`, {
            venue_name: form.venue_name,
            event_time: form.event_time,
            customer_requirements: form.customer_requirements,
            rm_handoff_notes: form.rm_handoff_notes,
            special_promises: form.special_promises,
          });
          break;
        case 'assign_owner':
          await api.post(`/execution/${leadId}/assign`, {
            owner_id: form.owner_id || `user_${Date.now()}`,
            owner_name: form.owner_name,
            supporting_team: form.team_member_name ? [{ name: form.team_member_name, role: form.team_member_role }] : [],
            handoff_notes: form.handoff_notes,
          });
          break;
        case 'acknowledge':
          await api.post(`/execution/${leadId}/acknowledge`, { notes: form.notes });
          break;
        case 'update_handoff_status': {
          const nextStatus = modal.currentStatus === 'acknowledged' ? 'in_preparation' : 'ready';
          await api.post(`/execution/${leadId}/handoff-status`, { status: form.status || nextStatus });
          break;
        }
        case 'add_checklist':
          await api.post(`/execution/${leadId}/checklist`, {
            item: form.item,
            category: form.category || 'other',
            assigned_to_name: form.assigned_to_name,
            due_date: form.due_date,
            notes: form.notes,
          });
          break;
        case 'update_checklist':
          await api.put(`/execution/${leadId}/checklist/${modal.item.checklist_id}`, {
            status: form.status,
            notes: form.notes,
            assigned_to_name: form.assigned_to_name,
            due_date: form.due_date,
          });
          break;
        case 'add_change_request':
          await api.post(`/execution/${leadId}/change-requests`, {
            cr_type: form.cr_type,
            description: form.description,
            impact: form.impact,
            requested_by_name: form.requested_by_name,
          });
          break;
        case 'resolve_cr':
          await api.put(`/execution/${leadId}/change-requests/${modal.cr.cr_id}`, {
            status: form.status || 'implemented',
            resolution: form.resolution,
          });
          break;
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

  const titles = {
    create_handoff: 'Create Handoff Package',
    assign_owner: 'Assign Execution Owner',
    acknowledge: 'Acknowledge Handoff',
    update_handoff_status: 'Update Status',
    add_checklist: 'Add Checklist Item',
    update_checklist: 'Update Checklist Item',
    add_change_request: 'Log Change Request',
    resolve_cr: 'Resolve Change Request',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setModal(null)} data-testid="exec-modal-overlay">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-black/[0.05] px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-[14px] font-bold text-[#0B0B0D]" data-testid="exec-modal-title">{titles[modal.type] || 'Action'}</h3>
          <button onClick={() => setModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100" data-testid="exec-modal-close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3" style={sans}>
          {modal.type === 'create_handoff' && (
            <>
              <FInput label="Venue Name" value={form.venue_name} onChange={v => set('venue_name', v)} testId="input-hoff-venue" />
              <FInput label="Event Time" value={form.event_time} onChange={v => set('event_time', v)} placeholder="e.g. 18:00" testId="input-hoff-time" />
              <FInput label="Customer Requirements" value={form.customer_requirements} onChange={v => set('customer_requirements', v)} testId="input-hoff-reqs" />
              <FInput label="Special Promises" value={form.special_promises} onChange={v => set('special_promises', v)} testId="input-hoff-promises" />
              <FInput label="RM Handoff Notes" value={form.rm_handoff_notes} onChange={v => set('rm_handoff_notes', v)} testId="input-hoff-notes" />
            </>
          )}
          {modal.type === 'assign_owner' && (
            <>
              <FInput label="Owner Name" value={form.owner_name} onChange={v => set('owner_name', v)} testId="input-owner-name" />
              <FInput label="Team Member Name (optional)" value={form.team_member_name} onChange={v => set('team_member_name', v)} testId="input-team-name" />
              <FInput label="Team Member Role (optional)" value={form.team_member_role} onChange={v => set('team_member_role', v)} testId="input-team-role" />
              <FInput label="Handoff Notes" value={form.handoff_notes} onChange={v => set('handoff_notes', v)} testId="input-assign-notes" />
            </>
          )}
          {modal.type === 'acknowledge' && (
            <FInput label="Notes (optional)" value={form.notes} onChange={v => set('notes', v)} testId="input-ack-notes" />
          )}
          {modal.type === 'update_handoff_status' && (
            <FSelect label="New Status" value={form.status} onChange={v => set('status', v)}
              options={HANDOFF_STATUSES.filter(s => {
                const idx = HANDOFF_STATUSES.findIndex(h => h.value === modal.currentStatus);
                return HANDOFF_STATUSES.indexOf(s) > idx;
              }).map(s => ({ value: s.value, label: s.label }))} testId="select-handoff-status" />
          )}
          {modal.type === 'add_checklist' && (
            <>
              <FInput label="Task" value={form.item} onChange={v => set('item', v)} testId="input-chk-item" />
              <FSelect label="Category" value={form.category} onChange={v => set('category', v)}
                options={['venue_coordination','customer_communication','logistics','vendor_management','documentation','payment','other'].map(c => ({ value: c, label: c.replace(/_/g, ' ') }))} testId="select-chk-category" />
              <FInput label="Assigned To" value={form.assigned_to_name} onChange={v => set('assigned_to_name', v)} testId="input-chk-assigned" />
              <FInput label="Due Date" type="date" value={form.due_date} onChange={v => set('due_date', v)} testId="input-chk-due" />
              <FInput label="Notes" value={form.notes} onChange={v => set('notes', v)} testId="input-chk-notes" />
            </>
          )}
          {modal.type === 'update_checklist' && (
            <>
              <p className="text-[12px] text-[#0B0B0D] font-medium bg-slate-50 p-2.5 rounded-lg">{modal.item?.item}</p>
              <FSelect label="Status" value={form.status} onChange={v => set('status', v)}
                options={['pending','in_progress','done','blocked','na'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} testId="select-chk-status" />
              <FInput label="Assigned To" value={form.assigned_to_name} onChange={v => set('assigned_to_name', v)} testId="input-upd-assigned" />
              <FInput label="Due Date" type="date" value={form.due_date} onChange={v => set('due_date', v)} testId="input-upd-due" />
              <FInput label="Notes" value={form.notes} onChange={v => set('notes', v)} testId="input-upd-notes" />
            </>
          )}
          {modal.type === 'add_change_request' && (
            <>
              <FSelect label="Type" value={form.cr_type} onChange={v => set('cr_type', v)}
                options={[
                  { value: 'customer_requirement', label: 'Customer Requirement' },
                  { value: 'venue_change', label: 'Venue Change' },
                  { value: 'commercial_change', label: 'Commercial Change' },
                  { value: 'schedule_change', label: 'Schedule Change' },
                  { value: 'special_requirement', label: 'Special Requirement' },
                ]} testId="select-cr-type" />
              <FInput label="Description" value={form.description} onChange={v => set('description', v)} testId="input-cr-desc" />
              <FInput label="Impact" value={form.impact} onChange={v => set('impact', v)} testId="input-cr-impact" />
              <FInput label="Requested By" value={form.requested_by_name} onChange={v => set('requested_by_name', v)} testId="input-cr-by" />
            </>
          )}
          {modal.type === 'resolve_cr' && (
            <>
              <FSelect label="Status" value={form.status} onChange={v => set('status', v)}
                options={[
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'implemented', label: 'Implemented' },
                ]} testId="select-cr-resolve-status" />
              <FInput label="Resolution" value={form.resolution} onChange={v => set('resolution', v)} testId="input-cr-resolution" />
            </>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-black/[0.05] px-4 py-3">
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
            data-testid="exec-modal-submit">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED
   ═══════════════════════════════════════════════════════════════ */
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.05] p-4">
      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={cn("text-[12px] text-right max-w-[60%] truncate", highlight ? 'font-bold text-[#0B0B0D]' : 'font-medium text-[#0B0B0D]')}>{value}</span>
    </div>
  );
}

function FInput({ label, value, onChange, type = 'text', placeholder, testId }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
        data-testid={testId} />
    </div>
  );
}

function FSelect({ label, value, onChange, options, testId }) {
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

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
