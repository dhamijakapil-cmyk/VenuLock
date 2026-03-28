import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm VenuLoQ's AI Concierge. How can I help you find the perfect venue today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Show chat button on mobile only after scrolling past the hero
  useEffect(() => {
    const onScroll = () => setShowOnMobile(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chatbot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't process that. Please try again or reach out via WhatsApp." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button — hidden on mobile until user scrolls past hero */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="chatbot-toggle-btn"
          className={`fixed z-[9999] w-12 h-12 rounded-full bg-[#0B0B0D] text-[#D4B36A] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 right-4 lg:right-5 lg:bottom-8 lg:w-14 lg:h-14 lg:opacity-100 lg:translate-y-0 ${showOnMobile ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none lg:pointer-events-auto'}`}
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))', boxShadow: '0 4px 20px rgba(10,26,47,0.35)' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div
          data-testid="chatbot-window"
          className="fixed right-4 z-[9999] w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-200px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 lg:right-5 lg:bottom-24 lg:max-h-[calc(100vh-100px)]"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Header */}
          <div className="bg-[#111111] px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#D4B36A]/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#D4B36A]" />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">VL Concierge</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-white/60">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              data-testid="chatbot-close-btn"
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F9FAFB]" data-testid="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-[#111111] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#D4B36A]" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#111111] text-white rounded-br-md'
                      : 'bg-white text-[#374151] border border-slate-100 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#D4B36A]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#D4B36A]" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#111111] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#D4B36A]" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-slate-100 bg-white" data-testid="chatbot-suggestions">
              {['Venue pricing?', 'How booking works?', 'EMI options?', 'Cities available?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-slate-200 text-[#64748B] hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 focus-within:border-[#111111]/30 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                data-testid="chatbot-input"
                className="flex-1 bg-transparent text-sm text-[#374151] placeholder:text-slate-400 outline-none py-1.5"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                data-testid="chatbot-send-btn"
                className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#153055] transition-colors flex-shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
