import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  Users,
  MapPin,
  Clock,
  Send,
  ChevronRight,
  StickyNote,
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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

  // Tabs: 'messages' | 'timeline' | 'notes'
  const [activeTab, setActiveTab] = useState('messages');

  // Input states
  const [messageInput, setMessageInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [leadId]);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const fetchAll = async () => {
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
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/message`, { content: messageInput.trim() });
      setMessageInput('');
      // Refresh messages
      const res = await api.get(`/workflow/${leadId}/messages`);
      setMessages(res.data?.messages || []);
      toast.success('Message sent');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setSending(true);
    try {
      await api.post(`/workflow/${leadId}/note`, { content: noteInput.trim() });
      setNoteInput('');
      setShowNoteInput(false);
      // Refresh timeline
      const res = await api.get(`/workflow/${leadId}/timeline`);
      setTimeline(res.data?.timeline || []);
      toast.success('Note added');
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setSending(false);
    }
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
    } finally {
      setSending(false);
    }
  };

  const handleMarkLost = async () => {
    if (!lead || lead.stage === 'lost') return;
    if (!window.confirm('Mark this lead as lost?')) return;
    try {
      await api.patch(`/workflow/${leadId}/stage`, {
        stage: 'lost',
        note: 'Lead marked as lost',
      });
      await fetchAll();
      toast.success('Lead marked as lost');
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const openWhatsApp = () => {
    if (!lead?.customer_phone) return;
    const phone = lead.customer_phone.replace(/\D/g, '');
    const msg = `Hi ${lead.customer_name?.split(' ')[0] || ''}! This is ${user?.name} from VenuLoQ.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const callCustomer = () => {
    if (!lead?.customer_phone) return;
    window.open(`tel:${lead.customer_phone}`, '_self');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-lg font-semibold text-slate-500">Lead not found</p>
          <Button onClick={() => navigate('/rm/dashboard')} variant="outline" className="mt-4">Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentStageIdx = STAGES.findIndex(s => s.id === lead.stage);
  const nextStage = currentStageIdx >= 0 && currentStageIdx < STAGES.length - 1 ? STAGES[currentStageIdx + 1] : null;
  const isLost = lead.stage === 'lost';
  const isComplete = lead.stage === 'payment_released';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto flex flex-col" style={{ ...sans, minHeight: 'calc(100vh - 64px)' }}>

        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-slate-100 bg-white sticky top-0 z-20">
          <button onClick={() => navigate('/rm/dashboard')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" data-testid="lead-back-btn">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-[#0B0B0D] truncate" data-testid="lead-customer-name">{lead.customer_name}</h2>
            <p className="text-[11px] text-slate-400 truncate">{lead.venue_name}{lead.city ? ` - ${lead.city}` : ''}</p>
          </div>
          {/* Quick actions */}
          <button onClick={callCustomer} className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors" data-testid="call-customer-btn">
            <Phone className="w-4 h-4 text-emerald-600" />
          </button>
          <button onClick={openWhatsApp} className="w-9 h-9 flex items-center justify-center rounded-full bg-green-50 hover:bg-green-100 transition-colors" data-testid="whatsapp-customer-btn">
            <MessageCircle className="w-4 h-4 text-green-600" />
          </button>
        </div>

        {/* Stage Progress (collapsible) */}
        <div className="px-4 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setShowProgress(!showProgress)} className="w-full flex items-center justify-between" data-testid="toggle-progress">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                isLost ? "bg-red-50 text-red-600" : isComplete ? "bg-green-50 text-green-600" : "bg-[#FFF8E7] text-[#B8962A]"
              )}>
                {lead.stage_label}
              </span>
              {!isLost && !isComplete && (
                <span className="text-[10px] text-slate-400">Step {currentStageIdx + 1} of {STAGES.length}</span>
              )}
            </div>
            {showProgress ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showProgress && (
            <div className="mt-3 space-y-1.5">
              {STAGES.map((stage, i) => {
                const isDone = i <= currentStageIdx && !isLost;
                const isCurrent = i === currentStageIdx && !isLost;
                return (
                  <div key={stage.id} className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle className={cn("w-4 h-4 flex-shrink-0", isCurrent ? "text-[#D4B36A]" : "text-emerald-500")} />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-200 flex-shrink-0" />
                    )}
                    <span className={cn("text-[12px]", isDone ? "text-[#0B0B0D] font-medium" : "text-slate-400")}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
              {isLost && (
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-[12px] text-red-600 font-medium">Lost</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Info Card */}
        <div className="px-4 py-3 bg-white border-b border-slate-100">
          <div className="grid grid-cols-2 gap-2.5">
            {lead.customer_phone && (
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{lead.customer_phone}</span>
              </div>
            )}
            {lead.customer_email && (
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <span className="text-[10px] text-slate-400">@</span>
                <span className="truncate">{lead.customer_email}</span>
              </div>
            )}
            {lead.event_date && (
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(lead.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            {lead.guest_count_range && (
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.guest_count_range} guests</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 bg-white px-4 sticky top-[52px] z-10">
          {[
            { id: 'messages', label: 'Messages', count: messages.length },
            { id: 'timeline', label: 'Timeline', count: timeline.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 text-center py-2.5 text-[13px] font-semibold border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-[#D4B36A] text-[#0B0B0D]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 text-[10px] text-slate-400">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="flex flex-col min-h-[300px]">
              <div className="flex-1 px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <MessageCircle className="w-10 h-10 text-slate-200 mb-2" />
                    <p className="text-[13px] text-slate-400">No messages yet</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">Send a message to the customer</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user?.user_id;
                    return (
                      <div key={msg.message_id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2.5",
                          isMe
                            ? "bg-[#0B0B0D] text-white rounded-br-md"
                            : "bg-slate-100 text-[#0B0B0D] rounded-bl-md"
                        )}>
                          <p className="text-[13px] leading-relaxed">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span className={cn("text-[9px]", isMe ? "text-white/30" : "text-slate-400")}>
                              {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && msg.whatsapp_status === 'pending' && (
                              <span className="text-[8px] text-[#D4B36A]/60 uppercase">WhatsApp pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[14px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] transition-all"
                    data-testid="message-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="w-11 h-11 bg-[#0B0B0D] hover:bg-[#1a1a2e] disabled:opacity-30 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    data-testid="send-message-btn"
                  >
                    <Send className="w-4.5 h-4.5 text-[#D4B36A]" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="px-4 py-4 space-y-0">
              {/* Add Note button */}
              <div className="mb-4">
                {showNoteInput ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Write a note..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] text-[#0B0B0D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] transition-all resize-none"
                      data-testid="note-textarea"
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleAddNote} disabled={!noteInput.trim() || sending} size="sm" className="bg-[#0B0B0D] hover:bg-[#1a1a2e] text-white text-[12px] h-8 rounded-lg" data-testid="save-note-btn">
                        Save Note
                      </Button>
                      <Button onClick={() => { setShowNoteInput(false); setNoteInput(''); }} variant="ghost" size="sm" className="text-[12px] h-8 text-slate-400">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNoteInput(true)}
                    className="flex items-center gap-2 text-[12px] font-semibold text-[#D4B36A] hover:text-[#B8962A] transition-colors"
                    data-testid="add-note-btn"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    Add a Note
                  </button>
                )}
              </div>

              {timeline.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Clock className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-[13px] text-slate-400">No activity yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  {timeline.map((entry, i) => {
                    const isStageChange = entry.action === 'stage_change';
                    const isMessage = entry.action === 'message_sent';
                    return (
                      <div key={entry.activity_id || i} className="relative flex gap-3 pb-4">
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 z-10 border-2 border-white",
                          isStageChange ? "bg-[#D4B36A]" : isMessage ? "bg-blue-400" : "bg-slate-300"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold text-[#0B0B0D]">{entry.created_by_name}</span>
                            <span className="text-[9px] text-slate-400 whitespace-nowrap">
                              {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{entry.detail}</p>
                          {isStageChange && entry.meta?.to && (
                            <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wider text-[#D4B36A] bg-[#FFF8E7] px-2 py-0.5 rounded-full">
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
        </div>

        {/* Bottom Action Bar */}
        {!isLost && !isComplete && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2">
            {showStageModal ? (
              <div className="flex-1 space-y-2">
                <p className="text-[11px] text-slate-500 font-medium">
                  Moving to <span className="text-[#0B0B0D] font-bold">{nextStage?.label}</span>
                </p>
                <input
                  type="text"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="Add a note (optional)..."
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                  data-testid="stage-note-input"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleAdvanceStage} disabled={sending} size="sm"
                    className="bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold text-[12px] h-9 rounded-lg flex-1"
                    data-testid="confirm-advance-btn">
                    {sending ? 'Updating...' : `Move to ${nextStage?.label}`}
                  </Button>
                  <Button onClick={() => setShowStageModal(false)} variant="ghost" size="sm" className="h-9 text-[12px] text-slate-400">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {nextStage && (
                  <Button onClick={() => setShowStageModal(true)}
                    className="flex-1 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold text-[13px] h-11 rounded-xl shadow-[0_4px_16px_rgba(212,179,106,0.25)]"
                    data-testid="advance-stage-btn">
                    Move to {nextStage.label} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <button onClick={handleMarkLost}
                  className="h-11 px-4 text-[12px] font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  data-testid="mark-lost-btn">
                  Lost
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RMLeadDetail;
