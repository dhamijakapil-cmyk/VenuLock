import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Phone, MessageCircle, Mail, FileText, Clock, Send,
  CheckCircle2, Circle, AlertTriangle, ChevronDown,
  CalendarClock, X, Copy, ArrowRight, Ban,
  PhoneOff, PhoneMissed, UserCheck, MessageSquare,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

// ── Constants ────────────────────────────────────────────────────────────────

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected', icon: '✓', color: 'text-emerald-600' },
  { value: 'no_answer', label: 'No Answer', icon: '—', color: 'text-slate-500' },
  { value: 'busy', label: 'Busy', icon: '—', color: 'text-amber-600' },
  { value: 'wrong_number', label: 'Wrong Number', icon: '✕', color: 'text-red-600' },
  { value: 'customer_asked_for_callback', label: 'Callback Requested', icon: '↩', color: 'text-blue-600' },
  { value: 'interested', label: 'Interested', icon: '★', color: 'text-emerald-600' },
  { value: 'not_interested', label: 'Not Interested', icon: '✕', color: 'text-red-600' },
  { value: 'waiting_for_family_discussion', label: 'Waiting on Family', icon: '⏳', color: 'text-amber-600' },
  { value: 'visit_requested', label: 'Visit Requested', icon: '→', color: 'text-blue-600' },
  { value: 'quote_requested', label: 'Quote Requested', icon: '→', color: 'text-blue-600' },
  { value: 'negotiation_discussion', label: 'Negotiation Talk', icon: '⇄', color: 'text-purple-600' },
  { value: 'closed_progressed', label: 'Progressed / Closed', icon: '✓', color: 'text-emerald-600' },
];

const MESSAGE_OUTCOMES = [
  { value: 'message_sent', label: 'Message Sent', color: 'text-blue-600' },
  { value: 'customer_replied', label: 'Customer Replied', color: 'text-emerald-600' },
  { value: 'customer_acknowledged', label: 'Acknowledged', color: 'text-emerald-600' },
  { value: 'no_response_yet', label: 'No Response Yet', color: 'text-slate-500' },
  { value: 'waiting_for_customer_reply', label: 'Waiting for Reply', color: 'text-amber-600' },
  { value: 'information_shared', label: 'Info Shared', color: 'text-blue-600' },
  { value: 'shortlist_shared', label: 'Shortlist Shared', color: 'text-blue-600' },
  { value: 'quote_shared', label: 'Quote Shared', color: 'text-blue-600' },
  { value: 'visit_details_shared', label: 'Visit Details Shared', color: 'text-blue-600' },
];

const COMM_STATUS_LABELS = {
  never_contacted: { label: 'Never Contacted', color: 'bg-slate-100 text-slate-600', icon: Circle },
  follow_up_due: { label: 'Follow-up Due', color: 'bg-amber-100 text-amber-700', icon: Clock },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  waiting_on_customer: { label: 'Waiting on Customer', color: 'bg-blue-100 text-blue-700', icon: Clock },
  waiting_on_rm: { label: 'Waiting on You', color: 'bg-purple-100 text-purple-700', icon: UserCheck },
  recently_contacted: { label: 'Recently Contacted', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  no_response: { label: 'No Response', color: 'bg-orange-100 text-orange-700', icon: PhoneMissed },
  blocked_unreachable: { label: 'Unreachable', color: 'bg-red-100 text-red-700', icon: Ban },
};

const CHANNEL_ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  note: FileText,
  template: MessageSquare,
  follow_up: CalendarClock,
};

const ACTION_LABELS = {
  call_initiated: 'Call',
  whatsapp_opened: 'WhatsApp',
  email_sent: 'Email Sent',
  note_logged: 'Note',
  call_outcome_logged: 'Call Outcome',
  message_outcome_logged: 'Message Outcome',
  template_used: 'Template Used',
  follow_up_scheduled: 'Follow-up Set',
  follow_up_completed: 'Follow-up Done',
  follow_up_cancelled: 'Follow-up Cancelled',
  status_updated: 'Status Updated',
};


// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function CommunicationConsole({ caseData, onRefresh }) {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: 'call_outcome' | 'message_outcome' | 'follow_up' | 'template' | 'note' }
  const [saving, setSaving] = useState(false);

  const leadId = caseData?.lead_id;
  const phone = caseData?.customer_phone;
  const email = caseData?.customer_email;
  const hasPhone = !!phone;
  const hasEmail = !!email;

  const fetchData = useCallback(async () => {
    if (!leadId) return;
    try {
      const [tlRes, tmplRes] = await Promise.all([
        api.get(`/communication/${leadId}/timeline`),
        api.get('/communication/templates'),
      ]);
      setTimeline(tlRes.data.timeline || []);
      setTemplates(tmplRes.data.templates || []);
    } catch (err) {
      console.error('Failed to fetch communication data:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const commStatus = caseData?.communication_status || 'never_contacted';
  const statusConfig = COMM_STATUS_LABELS[commStatus] || COMM_STATUS_LABELS.never_contacted;
  const StatusIcon = statusConfig.icon;

  // ── Channel Actions ──

  const handleCall = async () => {
    if (!hasPhone) return;
    // Log action
    try {
      await api.post(`/communication/${leadId}/log`, {
        channel: 'call', action_type: 'call_initiated',
        summary: `Called ${phone}`,
      });
    } catch {}
    // Open tel link
    window.open(`tel:${phone}`, '_self');
    // Prompt outcome
    setTimeout(() => setModal({ type: 'call_outcome' }), 1500);
    onRefresh?.();
  };

  const handleWhatsApp = async (prefillMessage) => {
    if (!hasPhone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = prefillMessage
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(prefillMessage)}`
      : `https://wa.me/${cleanPhone}`;
    try {
      await api.post(`/communication/${leadId}/log`, {
        channel: 'whatsapp', action_type: 'whatsapp_opened',
        summary: prefillMessage ? 'WhatsApp opened with template' : 'WhatsApp opened',
      });
    } catch {}
    window.open(url, '_blank');
    setTimeout(() => setModal({ type: 'message_outcome' }), 1500);
    onRefresh?.();
  };

  const handleEmail = async () => {
    if (!hasEmail) return;
    try {
      await api.post(`/communication/${leadId}/log`, {
        channel: 'email', action_type: 'email_sent',
        summary: `Email to ${email}`,
      });
    } catch {}
    window.open(`mailto:${email}`, '_self');
    onRefresh?.();
  };

  const logOutcome = async (channel, outcome, note, followUp) => {
    setSaving(true);
    try {
      const action_type = channel === 'call' ? 'call_outcome_logged' : 'message_outcome_logged';
      const payload = {
        channel,
        action_type,
        outcome,
        summary: CALL_OUTCOMES.find(o => o.value === outcome)?.label || MESSAGE_OUTCOMES.find(o => o.value === outcome)?.label || outcome,
        note: note || undefined,
      };
      if (followUp) {
        payload.next_follow_up_at = followUp;
      }
      // Auto waiting states
      if (['customer_asked_for_callback', 'waiting_for_family_discussion'].includes(outcome)) {
        payload.waiting_state = 'waiting_on_customer';
      }
      if (['no_response_yet', 'waiting_for_customer_reply'].includes(outcome)) {
        payload.waiting_state = 'waiting_on_customer';
      }

      const res = await api.post(`/communication/${leadId}/log`, payload);
      toast.success('Outcome logged');
      setModal(null);
      fetchData();
      onRefresh?.();

      // Show workflow prompts
      if (res.data.prompts?.length > 0) {
        const prompt = res.data.prompts[0];
        toast.info(prompt.message, { duration: 5000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to log outcome');
    } finally {
      setSaving(false);
    }
  };

  const scheduleFollowUp = async (scheduledAt, description, waitingState) => {
    setSaving(true);
    try {
      await api.post(`/communication/${leadId}/follow-up`, {
        scheduled_at: scheduledAt,
        description: description || 'Follow-up',
        waiting_state: waitingState || 'none',
      });
      toast.success('Follow-up scheduled');
      setModal(null);
      fetchData();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  const logNote = async (noteText) => {
    setSaving(true);
    try {
      await api.post(`/communication/${leadId}/log`, {
        channel: 'note', action_type: 'note_logged',
        summary: noteText.substring(0, 50) + (noteText.length > 50 ? '...' : ''),
        note: noteText,
      });
      toast.success('Note logged');
      setModal(null);
      fetchData();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to log note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" style={sans} data-testid="communication-console">
      {/* ── Contact Card ── */}
      <div className="bg-white rounded-xl border border-black/[0.05] p-4" data-testid="contact-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-wider">Contact</h3>
          <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1", statusConfig.color)} data-testid="comm-status-badge">
            <StatusIcon className="w-2.5 h-2.5" />
            {statusConfig.label}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Name</span>
            <span className="text-[11px] font-semibold text-[#0B0B0D]">{caseData.customer_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Phone</span>
            <span className={cn("text-[11px] font-semibold", hasPhone ? 'text-[#0B0B0D]' : 'text-slate-300')}>
              {phone || 'Not available'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Email</span>
            <span className={cn("text-[11px] font-semibold", hasEmail ? 'text-[#0B0B0D]' : 'text-slate-300')}>
              {email || 'Not available'}
            </span>
          </div>
          {caseData.last_contacted_at && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Last Contact</span>
              <span className="text-[11px] font-semibold text-[#0B0B0D]">{formatDate(caseData.last_contacted_at)}</span>
            </div>
          )}
          {caseData.next_follow_up_at && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Next Follow-up</span>
              <span className={cn("text-[11px] font-semibold",
                commStatus === 'overdue' ? 'text-red-600' : 'text-[#0B0B0D]'
              )}>{formatDate(caseData.next_follow_up_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-3 gap-2" data-testid="comm-quick-actions">
        <ActionButton icon={Phone} label="Call" color="bg-emerald-500" onClick={handleCall} disabled={!hasPhone} disabledReason={!hasPhone ? 'No phone number' : undefined} testId="action-call" />
        <ActionButton icon={MessageCircle} label="WhatsApp" color="bg-green-500" onClick={() => handleWhatsApp()} disabled={!hasPhone} disabledReason={!hasPhone ? 'No phone number' : undefined} testId="action-whatsapp" />
        <ActionButton icon={Mail} label="Email" color="bg-blue-500" onClick={handleEmail} disabled={!hasEmail} disabledReason={!hasEmail ? 'No email' : undefined} testId="action-email" />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <SmallAction icon={MessageSquare} label="Template" onClick={() => setModal({ type: 'template' })} disabled={!hasPhone} testId="action-template" />
        <SmallAction icon={FileText} label="Log Note" onClick={() => setModal({ type: 'note' })} testId="action-note" />
        <SmallAction icon={Phone} label="Log Call" onClick={() => setModal({ type: 'call_outcome' })} testId="action-log-call" />
        <SmallAction icon={CalendarClock} label="Follow-up" onClick={() => setModal({ type: 'follow_up' })} testId="action-follow-up" />
      </div>

      {/* ── Timeline ── */}
      <div className="bg-white rounded-xl border border-black/[0.05] p-4" data-testid="comm-timeline">
        <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-wider mb-3">Communication Timeline</h3>
        {timeline.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">No communication yet</p>
          </div>
        ) : (
          <div className="space-y-0" data-testid="timeline-entries">
            {timeline.map((entry, i) => (
              <TimelineEntry key={entry.id} entry={entry} isLast={i === timeline.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === 'call_outcome' && (
        <OutcomeModal type="call" outcomes={CALL_OUTCOMES} onSubmit={(o, n, fu) => logOutcome('call', o, n, fu)}
          onClose={() => setModal(null)} saving={saving} />
      )}
      {modal?.type === 'message_outcome' && (
        <OutcomeModal type="message" outcomes={MESSAGE_OUTCOMES} onSubmit={(o, n, fu) => logOutcome('whatsapp', o, n, fu)}
          onClose={() => setModal(null)} saving={saving} />
      )}
      {modal?.type === 'follow_up' && (
        <FollowUpModal onSubmit={scheduleFollowUp} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal?.type === 'template' && (
        <TemplateModal templates={templates} caseData={caseData} user={user}
          onSend={(msg) => handleWhatsApp(msg)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'note' && (
        <NoteModal onSubmit={logNote} onClose={() => setModal(null)} saving={saving} />
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function ActionButton({ icon: Icon, label, color, onClick, disabled, disabledReason, testId }) {
  return (
    <div className="relative group">
      <button onClick={onClick} disabled={disabled}
        className={cn(
          "w-full flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-[0.97]",
          disabled ? 'bg-slate-50 opacity-50 cursor-not-allowed' : `${color} text-white shadow-sm`
        )} data-testid={testId}>
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-semibold">{label}</span>
      </button>
      {disabled && disabledReason && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-slate-400 whitespace-nowrap">
          {disabledReason}
        </div>
      )}
    </div>
  );
}

function SmallAction({ icon: Icon, label, onClick, disabled, testId }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all",
        disabled ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed' : 'bg-white border-black/[0.05] hover:bg-slate-50 active:scale-[0.97]'
      )} data-testid={testId}>
      <Icon className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-[9px] font-semibold text-slate-600">{label}</span>
    </button>
  );
}

function TimelineEntry({ entry, isLast }) {
  const ChannelIcon = CHANNEL_ICONS[entry.channel] || FileText;
  const isCall = entry.channel === 'call';
  const isFollowUp = entry.channel === 'follow_up';

  const outcomeConfig = isCall
    ? CALL_OUTCOMES.find(o => o.value === entry.outcome)
    : MESSAGE_OUTCOMES.find(o => o.value === entry.outcome);

  return (
    <div className="flex gap-3" data-testid={`timeline-entry-${entry.id}`}>
      {/* Dot + Line */}
      <div className="flex flex-col items-center">
        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
          isFollowUp ? 'bg-amber-100' : isCall ? 'bg-emerald-100' : 'bg-blue-100'
        )}>
          <ChannelIcon className={cn("w-3.5 h-3.5",
            isFollowUp ? 'text-amber-600' : isCall ? 'text-emerald-600' : 'text-blue-600'
          )} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-200 min-h-[16px]" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#0B0B0D]">
            {ACTION_LABELS[entry.action_type] || entry.action_type?.replace(/_/g, ' ')}
          </span>
          <span className="text-[9px] text-slate-400 flex-shrink-0">{formatTimeAgo(entry.timestamp)}</span>
        </div>

        {entry.outcome && outcomeConfig && (
          <span className={cn("text-[10px] font-semibold", outcomeConfig.color)}>
            {outcomeConfig.label}
          </span>
        )}

        {entry.summary && !entry.outcome && (
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{entry.summary}</p>
        )}

        {entry.note && entry.note !== entry.summary && (
          <p className="text-[10px] text-slate-400 mt-0.5 italic line-clamp-2">{entry.note}</p>
        )}

        {entry.next_follow_up_at && (
          <div className="flex items-center gap-1 mt-1">
            <CalendarClock className="w-2.5 h-2.5 text-amber-500" />
            <span className="text-[9px] text-amber-600 font-semibold">Follow-up: {formatDate(entry.next_follow_up_at)}</span>
          </div>
        )}

        <span className="text-[9px] text-slate-300 block mt-0.5">by {entry.performed_by_name}</span>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════════════════

function ModalBackdrop({ children, onClose, title, testId }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" data-testid={testId}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
          <h3 className="text-[14px] font-bold text-[#0B0B0D]">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100" data-testid="modal-close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function OutcomeModal({ type, outcomes, onSubmit, onClose, saving }) {
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');

  const needsFollowUp = ['customer_asked_for_callback', 'waiting_for_family_discussion',
    'shortlist_shared', 'quote_shared', 'visit_details_shared',
    'no_response_yet', 'waiting_for_customer_reply'].includes(selected);

  return (
    <ModalBackdrop title={type === 'call' ? 'Log Call Outcome' : 'Log Message Outcome'} onClose={onClose} testId="outcome-modal">
      <div className="space-y-3">
        <p className="text-[11px] text-slate-500 font-medium">What happened?</p>
        <div className="grid grid-cols-2 gap-1.5" data-testid="outcome-options">
          {outcomes.map(o => (
            <button key={o.value} onClick={() => setSelected(o.value)}
              className={cn(
                "text-left px-3 py-2.5 rounded-lg border text-[11px] font-semibold transition-all",
                selected === o.value
                  ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )} data-testid={`outcome-${o.value}`}>
              <span className={cn("mr-1", selected === o.value ? '' : o.color)}>{o.icon || '•'}</span>
              {o.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Any details about the conversation..."
            className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[12px] text-[#0B0B0D] placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
            data-testid="outcome-note" />
        </div>

        {(needsFollowUp || showFollowUp) && (
          <div>
            <label className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1 block">
              {needsFollowUp ? 'Follow-up recommended' : 'Schedule Follow-up'}
            </label>
            <input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
              data-testid="outcome-followup-date" />
          </div>
        )}

        {!needsFollowUp && !showFollowUp && (
          <button onClick={() => setShowFollowUp(true)}
            className="text-[10px] text-[#D4B36A] font-semibold flex items-center gap-1">
            <CalendarClock className="w-3 h-3" /> Add follow-up
          </button>
        )}

        <button onClick={() => onSubmit(selected, note, followUpDate || undefined)}
          disabled={saving || !selected}
          className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-bold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform"
          data-testid="outcome-submit">
          {saving ? 'Saving...' : 'Log Outcome'}
        </button>
      </div>
    </ModalBackdrop>
  );
}

function FollowUpModal({ onSubmit, onClose, saving }) {
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [waiting, setWaiting] = useState('none');

  return (
    <ModalBackdrop title="Schedule Follow-up" onClose={onClose} testId="follow-up-modal">
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">When</label>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
            data-testid="followup-date" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="e.g. Check if customer decided on venue"
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
            data-testid="followup-desc" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Waiting On</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: 'none', label: 'None' },
              { value: 'waiting_on_customer', label: 'Customer' },
              { value: 'waiting_on_rm', label: 'Me (RM)' },
              { value: 'callback_requested', label: 'Callback' },
            ].map(w => (
              <button key={w.value} onClick={() => setWaiting(w.value)}
                className={cn(
                  "px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all",
                  waiting === w.value ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-slate-600 border-slate-200'
                )} data-testid={`waiting-${w.value}`}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => onSubmit(date, desc, waiting)}
          disabled={saving || !date}
          className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-bold rounded-xl disabled:opacity-40"
          data-testid="followup-submit">
          {saving ? 'Saving...' : 'Schedule Follow-up'}
        </button>
      </div>
    </ModalBackdrop>
  );
}

function TemplateModal({ templates, caseData, user, onSend, onClose }) {
  const [selectedTmpl, setSelectedTmpl] = useState(null);
  const [rendered, setRendered] = useState('');

  const renderTemplate = (tmpl) => {
    let body = tmpl.body;
    body = body.replace(/\{\{customer_name\}\}/g, caseData.customer_name || '');
    body = body.replace(/\{\{rm_name\}\}/g, user?.name || '');
    body = body.replace(/\{\{venue_name\}\}/g, '');
    body = body.replace(/\{\{company_name\}\}/g, 'VenuLoQ');
    body = body.replace(/\{\{shortlist_link\}\}/g, '');
    body = body.replace(/\{\{quote_summary\}\}/g, '');
    body = body.replace(/\{\{visit_datetime\}\}/g, '');
    setSelectedTmpl(tmpl);
    setRendered(body);
  };

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(rendered);
    toast.success('Copied to clipboard');
  };

  return (
    <ModalBackdrop title="Send Template" onClose={onClose} testId="template-modal">
      {!selectedTmpl ? (
        <div className="space-y-1.5" data-testid="template-list">
          {templates.map(tmpl => (
            <button key={tmpl.template_id} onClick={() => renderTemplate(tmpl)}
              className="w-full text-left px-3 py-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
              data-testid={`template-${tmpl.template_id}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#0B0B0D]">{tmpl.name}</span>
                <span className="text-[9px] text-slate-400 capitalize">{tmpl.category?.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{tmpl.body.substring(0, 80)}...</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3" data-testid="template-preview">
          <div className="flex items-center justify-between">
            <button onClick={() => { setSelectedTmpl(null); setRendered(''); }}
              className="text-[10px] text-[#D4B36A] font-semibold">Back to templates</button>
            <span className="text-[10px] text-slate-400">{selectedTmpl.name}</span>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
            <p className="text-[12px] text-emerald-900 whitespace-pre-wrap leading-relaxed">{rendered}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyToClipboard}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600"
              data-testid="template-copy">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button onClick={() => { onSend(rendered); onClose(); }}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-green-500 rounded-lg text-[11px] font-bold text-white"
              data-testid="template-send-wa">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
          </div>
        </div>
      )}
    </ModalBackdrop>
  );
}

function NoteModal({ onSubmit, onClose, saving }) {
  const [noteText, setNoteText] = useState('');

  return (
    <ModalBackdrop title="Log Note" onClose={onClose} testId="note-modal">
      <div className="space-y-3">
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note about this case..."
          className="w-full h-28 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12px] text-[#0B0B0D] placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
          data-testid="note-textarea" autoFocus />
        <button onClick={() => onSubmit(noteText)}
          disabled={saving || !noteText.trim()}
          className="w-full h-10 bg-[#0B0B0D] text-white text-[12px] font-bold rounded-xl disabled:opacity-40"
          data-testid="note-submit">
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </ModalBackdrop>
  );
}


// ── Utilities ──

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatTimeAgo(d) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}
