import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, Phone, MessageCircle, Calendar, Users, MapPin,
  Clock, Send, ChevronRight, StickyNote, CheckCircle, Circle,
  AlertCircle, ChevronDown, ChevronUp, AlertTriangle, X,
  Timer, Flag, Clipboard, Star,
} from 'lucide-react';

const STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'site_visit', label: 'Site Visit' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'booked', label: 'Booked' },
  { id: 'deposit_paid', label: 'Deposit Paid' },
  { id: 'event_done', label: 'Event Done' },
  { id: 'full_payment', label: 'Full Payment' },
  { id: 'payment_released', label: 'Released' },
];

const sans = { fontFamily: "'DM Sans', sans-serif" };

const RMLeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [messageInput, setMessageInput] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // Action modals
  const [actionModal, setActionModal] = useState(null); // 'note' | 'meeting' | 'request_time' | 'escalate'
  const [noteInput, setNoteInput] = useState('');
  const [meetingForm, setMeetingForm] = useState({ outcome: '', summary: '', next_action: '', follow_up_date: '' });
  const [requestTimeForm, setRequestTimeForm] = useState({ reason: '', days_requested: 3 });
  const [escalateForm, setEscalateForm] = useState({ reason: '', severity: 'medium' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, msgRes, tlRes] = await Promise.all([
        api.get(`/workflow/${leadId}`),
        api.get(`/workflow/${leadId}/messages`),
        api.get(`/workflow/${leadId}/timeline`),
      ]);
      setLead(leadRes.data);
      setMessages(msgRes.data?.messages || []);
      setTimeline(tlRes.data?.timeline || []);
    } catch (err) {
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/message`, { content: messageInput.trim() });
      setMessageInput('');
      const res = await api.get(`/workflow/${leadId}/messages`);
      setMessages(res.data?.messages || []);
      toast.success('Message sent');
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/note`, { content: noteInput.trim() });
      setNoteInput('');
      setActionModal(null);
      await fetchAll();
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
    finally { setSending(false); }
  };

  const handleMeetingOutcome = async () => {
    if (!meetingForm.outcome || !meetingForm.summary.trim()) {
      toast.error('Outcome and summary are required');
      return;
    }
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/meeting-outcome`, {
        outcome: meetingForm.outcome,
        summary: meetingForm.summary.trim(),
        next_action: meetingForm.next_action.trim() || null,
        follow_up_date: meetingForm.follow_up_date || null,
      });
      setMeetingForm({ outcome: '', summary: '', next_action: '', follow_up_date: '' });
      setActionModal(null);
      await fetchAll();
      toast.success('Meeting outcome logged');
    } catch { toast.error('Failed to log meeting'); }
    finally { setSending(false); }
  };

  const handleRequestTime = async () => {
    if (!requestTimeForm.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/request-time`, {
        reason: requestTimeForm.reason.trim(),
        days_requested: requestTimeForm.days_requested,
      });
      setRequestTimeForm({ reason: '', days_requested: 3 });
      setActionModal(null);
      await fetchAll();
      toast.success('Time extension requested');
    } catch { toast.error('Failed to request time'); }
    finally { setSending(false); }
  };

  const handleEscalate = async () => {
    if (!escalateForm.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/escalate`, {
        reason: escalateForm.reason.trim(),
        severity: escalateForm.severity,
      });
      setEscalateForm({ reason: '', severity: 'medium' });
      setActionModal(null);
      await fetchAll();
      toast.success('Blocker escalated');
    } catch { toast.error('Failed to escalate'); }
    finally { setSending(false); }
  };

  const handleResolveBLocker = async () => {
    try {
      await api.post(`/workflow/${leadId}/resolve-blocker`);
      await fetchAll();
      toast.success('Blocker resolved');
    } catch { toast.error('Failed to resolve blocker'); }
  };

  const handleAdvanceStage = async () => {
    if (!lead) return;
    const currentIdx = STAGES.findIndex(s => s.id === lead.stage);
    if (currentIdx < 0 || currentIdx >= STAGES.length - 1) return;
    const nextStage = STAGES[currentIdx + 1];
    setSending(true);
    try {
      await api.patch(`/workflow/${leadId}/stage`, {
        stage: nextStage.id,
        note: stageNote.trim() || null,
      });
      setStageNote('');
      setShowStageModal(false);
      await fetchAll();
      toast.success(`Moved to ${nextStage.label}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : detail?.message || 'Cannot advance stage');
    } finally { setSending(false); }
  };

  const handleMarkLost = async () => {
    if (!lead || lead.stage === 'lost') return;
    if (!window.confirm('Mark this lead as lost?')) return;
    try {
      await api.patch(`/workflow/${leadId}/stage`, { stage: 'lost', note: 'Marked as lost' });
      await fetchAll();
      toast.success('Lead marked as lost');
    } catch { toast.error('Failed'); }
  };

  const openWhatsApp = () => {
    if (!lead?.customer_phone) return;
    const phone = lead.customer_phone.replace(/\D/g, '');
    const msg = `Hi ${lead.customer_name?.split(' ')[0] || ''}! This is ${user?.name} from VenuLoQ.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const callCustomer = () => { if (lead?.customer_phone) window.open(`tel:${lead.customer_phone}`, '_self'); };

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
    </div>
  );

  if (!lead) return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center px-4">
      <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
      <p className="text-lg font-semibold text-slate-500">Lead not found</p>
      <button onClick={() => navigate('/team/rm/dashboard')} className="mt-4 px-4 py-2 rounded-lg bg-slate-100 text-[13px] font-semibold text-slate-600">Go Back</button>
    </div>
  );

  const currentStageIdx = STAGES.findIndex(s => s.id === lead.stage);
  const nextStage = currentStageIdx >= 0 && currentStageIdx < STAGES.length - 1 ? STAGES[currentStageIdx + 1] : null;
  const isLost = lead.stage === 'lost';
  const isComplete = lead.stage === 'payment_released';
  const hasBlocker = lead.blocker?.active;

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col" style={sans}>
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-slate-100 sticky top-0 z-20"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
        <button onClick={() => navigate('/team/rm/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" data-testid="lead-back-btn">
          <ArrowLeft className="w-4.5 h-4.5 text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-[#0B0B0D] truncate" data-testid="lead-customer-name">{lead.customer_name}</h2>
          <p className="text-[10px] text-slate-400 truncate">{lead.venue_name}{lead.city ? ` — ${lead.city}` : ''}</p>
        </div>
        <button onClick={callCustomer} className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-50" data-testid="call-customer-btn">
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
        </button>
        <button onClick={openWhatsApp} className="w-8 h-8 flex items-center justify-center rounded-full bg-green-50" data-testid="whatsapp-customer-btn">
          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
        </button>
      </div>

      {/* Blocker Banner */}
      {hasBlocker && (
        <div className="mx-3 mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2" data-testid="blocker-banner">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-orange-700">Blocker Active ({lead.blocker.severity})</p>
            <p className="text-[10px] text-orange-600 mt-0.5">{lead.blocker.reason}</p>
          </div>
          <button onClick={handleResolveBLocker} className="text-[9px] font-bold text-orange-600 bg-white px-2 py-1 rounded-lg border border-orange-200 flex-shrink-0"
            data-testid="resolve-blocker-btn">
            Resolve
          </button>
        </div>
      )}

      {/* Overdue Banner */}
      {lead.is_overdue && !hasBlocker && (
        <div className="mx-3 mt-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2" data-testid="overdue-banner">
          <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-red-700 flex-1">Follow-up overdue</p>
          <span className="text-[10px] text-red-500">{fmtShort(lead.next_follow_up?.scheduled_at)}</span>
        </div>
      )}

      {/* Stage Progress (collapsible) */}
      <div className="mx-3 mt-2 bg-white rounded-xl border border-black/[0.04] overflow-hidden">
        <button onClick={() => setShowProgress(!showProgress)} className="w-full flex items-center justify-between px-3.5 py-2.5" data-testid="toggle-progress">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              isLost ? "bg-red-50 text-red-600" : isComplete ? "bg-green-50 text-green-600" : "bg-[#FFF8E7] text-[#B8962A]"
            )}>{lead.stage_label}</span>
            {!isLost && !isComplete && (
              <span className="text-[9px] text-slate-400">Step {currentStageIdx + 1}/{STAGES.length}</span>
            )}
          </div>
          {showProgress ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>
        {showProgress && (
          <div className="px-3.5 pb-3 space-y-1">
            {STAGES.map((stage, i) => {
              const isDone = i <= currentStageIdx && !isLost;
              const isCurrent = i === currentStageIdx && !isLost;
              return (
                <div key={stage.id} className="flex items-center gap-2">
                  {isDone ? <CheckCircle className={cn("w-3.5 h-3.5 flex-shrink-0", isCurrent ? "text-[#D4B36A]" : "text-emerald-500")} /> : <Circle className="w-3.5 h-3.5 text-slate-200 flex-shrink-0" />}
                  <span className={cn("text-[11px]", isDone ? "text-[#0B0B0D] font-medium" : "text-slate-400")}>{stage.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Info Card */}
      <div className="mx-3 mt-2 bg-white rounded-xl border border-black/[0.04] p-3.5">
        <div className="grid grid-cols-2 gap-2">
          {lead.customer_phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Phone className="w-3 h-3 text-slate-400" /><span className="truncate">{lead.customer_phone}</span>
            </div>
          )}
          {lead.customer_email && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="text-[9px] text-slate-400">@</span><span className="truncate">{lead.customer_email}</span>
            </div>
          )}
          {lead.event_date && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{new Date(lead.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
          {lead.guest_count_range && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Users className="w-3 h-3 text-slate-400" /><span>{lead.guest_count_range} guests</span>
            </div>
          )}
          {lead.event_type && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Star className="w-3 h-3 text-slate-400" /><span className="truncate">{lead.event_type}</span>
            </div>
          )}
          {lead.budget && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="text-[9px] text-slate-400">INR</span><span className="truncate">{lead.budget}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="mx-3 mt-2 flex gap-1.5" data-testid="quick-actions">
        <ActionBtn icon={<StickyNote className="w-3.5 h-3.5" />} label="Note" onClick={() => setActionModal('note')} testId="action-note" />
        <ActionBtn icon={<Clipboard className="w-3.5 h-3.5" />} label="Meeting" onClick={() => setActionModal('meeting')} testId="action-meeting" />
        <ActionBtn icon={<Timer className="w-3.5 h-3.5" />} label="More Time" onClick={() => setActionModal('request_time')} testId="action-request-time" />
        <ActionBtn icon={<Flag className="w-3.5 h-3.5" />} label="Escalate" color="orange" onClick={() => setActionModal('escalate')} testId="action-escalate" />
      </div>

      {/* Tab Bar */}
      <div className="flex mx-3 mt-3 bg-white rounded-xl border border-black/[0.04] overflow-hidden">
        {[
          { id: 'timeline', label: 'Activity', count: timeline.length },
          { id: 'messages', label: 'Messages', count: messages.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex-1 text-center py-2 text-[12px] font-semibold transition-colors",
              activeTab === tab.id ? "bg-[#0B0B0D] text-white" : "text-slate-400 hover:text-slate-600"
            )} data-testid={`tab-${tab.id}`}>
            {tab.label} <span className="text-[9px] opacity-50">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 mx-3 mt-2 mb-28">
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl border border-black/[0.04] p-3.5">
            {timeline.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[12px] text-slate-400">No activity yet</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />
                {timeline.map((entry, i) => {
                  const iconColor = entry.action === 'stage_change' ? 'bg-[#D4B36A]'
                    : entry.action === 'meeting_outcome' ? 'bg-purple-400'
                    : entry.action === 'blocker_escalated' ? 'bg-orange-400'
                    : entry.action === 'time_extension_requested' ? 'bg-blue-400'
                    : entry.action === 'message_sent' ? 'bg-blue-400'
                    : entry.action === 'blocker_resolved' ? 'bg-emerald-400'
                    : 'bg-slate-300';
                  return (
                    <div key={entry.activity_id || i} className="relative flex gap-2.5 pb-3.5">
                      <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 z-10 border-2 border-white", iconColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-[#0B0B0D]">{entry.created_by_name}</span>
                          <span className="text-[8px] text-slate-400 whitespace-nowrap">{fmtRelative(entry.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{entry.detail}</p>
                        {entry.action === 'stage_change' && entry.meta?.to && (
                          <span className="inline-block mt-1 text-[8px] font-semibold uppercase text-[#D4B36A] bg-[#FFF8E7] px-1.5 py-0.5 rounded-full">
                            {entry.meta.from} &rarr; {entry.meta.to}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl border border-black/[0.04] flex flex-col" style={{ minHeight: 200 }}>
            <div className="flex-1 p-3 space-y-2.5">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-400">No messages yet</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.user_id;
                  return (
                    <div key={msg.message_id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-2xl px-3 py-2",
                        isMe ? "bg-[#0B0B0D] text-white rounded-br-md" : "bg-slate-100 text-[#0B0B0D] rounded-bl-md")}>
                        <p className="text-[12px] leading-relaxed">{msg.content}</p>
                        <span className={cn("text-[8px] block text-right mt-0.5", isMe ? "text-white/30" : "text-slate-400")}>
                          {fmtTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-slate-100 p-2.5 flex gap-2">
              <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                data-testid="message-input" />
              <button onClick={handleSendMessage} disabled={!messageInput.trim() || sending}
                className="w-9 h-9 bg-[#0B0B0D] disabled:opacity-30 rounded-lg flex items-center justify-center" data-testid="send-message-btn">
                <Send className="w-3.5 h-3.5 text-[#D4B36A]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {!isLost && !isComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          {showStageModal ? (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-medium">
                Moving to <span className="text-[#0B0B0D] font-bold">{nextStage?.label}</span>
              </p>
              <input type="text" value={stageNote} onChange={e => setStageNote(e.target.value)}
                placeholder="Add a note (optional)..."
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[12px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                data-testid="stage-note-input" />
              <div className="flex items-center gap-2">
                <button onClick={handleAdvanceStage} disabled={sending}
                  className="flex-1 h-10 bg-[#D4B36A] text-[#0B0B0D] font-bold text-[12px] rounded-xl active:scale-[0.98]"
                  data-testid="confirm-advance-btn">
                  {sending ? 'Updating...' : `Move to ${nextStage?.label}`}
                </button>
                <button onClick={() => setShowStageModal(false)} className="h-10 px-3 text-[11px] text-slate-400">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {nextStage && (
                <button onClick={() => setShowStageModal(true)}
                  className="flex-1 h-11 bg-[#D4B36A] text-[#0B0B0D] font-bold text-[12px] rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-[#D4B36A]/20 active:scale-[0.98]"
                  data-testid="advance-stage-btn">
                  Move to {nextStage.label} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={handleMarkLost}
                className="h-11 px-3 text-[11px] font-medium text-red-400 hover:text-red-600 rounded-xl"
                data-testid="mark-lost-btn">
                Lost
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== Action Modals ===== */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-4 pb-8" onClick={e => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[#0B0B0D]">
                {actionModal === 'note' && 'Add Note'}
                {actionModal === 'meeting' && 'Log Meeting Outcome'}
                {actionModal === 'request_time' && 'Request More Time'}
                {actionModal === 'escalate' && 'Escalate Blocker'}
              </h3>
              <button onClick={() => setActionModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Note Modal */}
            {actionModal === 'note' && (
              <div className="space-y-3">
                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  placeholder="Write your note..." rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 resize-none"
                  data-testid="note-textarea" />
                <button onClick={handleAddNote} disabled={!noteInput.trim() || sending}
                  className="w-full h-11 bg-[#0B0B0D] text-white font-bold text-[13px] rounded-xl disabled:opacity-30"
                  data-testid="save-note-btn">
                  {sending ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            )}

            {/* Meeting Outcome Modal */}
            {actionModal === 'meeting' && (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Outcome</p>
                  <div className="flex gap-1.5" data-testid="meeting-outcome-options">
                    {[
                      { id: 'positive', label: 'Positive', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                      { id: 'neutral', label: 'Neutral', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                      { id: 'negative', label: 'Negative', color: 'bg-red-50 text-red-600 border-red-200' },
                      { id: 'no_show', label: 'No Show', color: 'bg-amber-50 text-amber-600 border-amber-200' },
                    ].map(o => (
                      <button key={o.id}
                        onClick={() => setMeetingForm(f => ({ ...f, outcome: o.id }))}
                        className={cn("flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all",
                          meetingForm.outcome === o.id ? o.color + ' ring-2 ring-offset-1 ring-[#D4B36A]/50' : 'bg-white text-slate-400 border-slate-200'
                        )}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={meetingForm.summary} onChange={e => setMeetingForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="Meeting summary..." rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 resize-none"
                  data-testid="meeting-summary" />
                <input type="text" value={meetingForm.next_action} onChange={e => setMeetingForm(f => ({ ...f, next_action: e.target.value }))}
                  placeholder="Next action (optional)"
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                  data-testid="meeting-next-action" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">Follow-up Date (optional)</p>
                  <input type="date" value={meetingForm.follow_up_date} onChange={e => setMeetingForm(f => ({ ...f, follow_up_date: e.target.value }))}
                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-[13px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                    data-testid="meeting-followup-date" />
                </div>
                <button onClick={handleMeetingOutcome} disabled={!meetingForm.outcome || !meetingForm.summary.trim() || sending}
                  className="w-full h-11 bg-[#0B0B0D] text-white font-bold text-[13px] rounded-xl disabled:opacity-30"
                  data-testid="save-meeting-btn">
                  {sending ? 'Saving...' : 'Log Meeting Outcome'}
                </button>
              </div>
            )}

            {/* Request More Time Modal */}
            {actionModal === 'request_time' && (
              <div className="space-y-3">
                <textarea value={requestTimeForm.reason} onChange={e => setRequestTimeForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Why do you need more time? (Required)" rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 resize-none"
                  data-testid="request-time-reason" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Days Requested</p>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 5, 7].map(d => (
                      <button key={d}
                        onClick={() => setRequestTimeForm(f => ({ ...f, days_requested: d }))}
                        className={cn("flex-1 py-2 rounded-lg text-[12px] font-semibold border transition-all",
                          requestTimeForm.days_requested === d
                            ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]'
                            : 'bg-white text-slate-500 border-slate-200'
                        )}>{d}d</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleRequestTime} disabled={!requestTimeForm.reason.trim() || sending}
                  className="w-full h-11 bg-blue-600 text-white font-bold text-[13px] rounded-xl disabled:opacity-30"
                  data-testid="submit-request-time-btn">
                  {sending ? 'Submitting...' : 'Request More Time'}
                </button>
              </div>
            )}

            {/* Escalate Blocker Modal */}
            {actionModal === 'escalate' && (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Severity</p>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'low', label: 'Low', color: 'bg-amber-50 text-amber-600 border-amber-200' },
                      { id: 'medium', label: 'Medium', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                      { id: 'high', label: 'High', color: 'bg-red-50 text-red-600 border-red-200' },
                    ].map(s => (
                      <button key={s.id}
                        onClick={() => setEscalateForm(f => ({ ...f, severity: s.id }))}
                        className={cn("flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all",
                          escalateForm.severity === s.id ? s.color + ' ring-2 ring-offset-1 ring-[#D4B36A]/50' : 'bg-white text-slate-400 border-slate-200'
                        )}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <textarea value={escalateForm.reason} onChange={e => setEscalateForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="What's blocking this case? (Required)" rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 resize-none"
                  data-testid="escalate-reason" />
                <button onClick={handleEscalate} disabled={!escalateForm.reason.trim() || sending}
                  className="w-full h-11 bg-orange-500 text-white font-bold text-[13px] rounded-xl disabled:opacity-30"
                  data-testid="submit-escalate-btn">
                  {sending ? 'Escalating...' : 'Escalate Blocker'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---- Sub-Components ---- */

function ActionBtn({ icon, label, color = 'default', onClick, testId }) {
  const base = color === 'orange'
    ? 'bg-orange-50 text-orange-600 border-orange-100'
    : 'bg-white text-slate-600 border-black/[0.04]';
  return (
    <button onClick={onClick}
      className={cn("flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all active:scale-[0.97]", base)}
      data-testid={testId}>
      {icon}
      <span className="text-[9px] font-semibold">{label}</span>
    </button>
  );
}

/* ---- Helpers ---- */

function fmtRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffHrs = Math.floor(Math.abs(now - d) / 3600000);
  if (now - d < 0) return `In ${diffHrs < 24 ? diffHrs + 'h' : Math.floor(diffHrs / 24) + 'd'}`;
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const dd = Math.floor(diffHrs / 24);
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtTime(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function fmtShort(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}

export default RMLeadDetail;
