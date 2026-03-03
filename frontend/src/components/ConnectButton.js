import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Phone } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/919876543210?text=Hi%2C%20I%20would%20like%20to%20book%20a%20venue.';
const PHONE_NUMBER = 'tel:+919876543210';

export const ConnectButton = ({ variant = 'primary', className = '', fullWidth = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center gap-2 font-semibold transition-all ${fullWidth ? 'w-full' : ''} ${className}`}
        data-testid="connect-btn"
      >
        <Phone className="w-4 h-4" />
        Connect
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2" data-testid="connect-options">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100"
            data-testid="connect-whatsapp"
            onClick={() => setOpen(false)}
          >
            <div className="w-9 h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#0A1A2F]">WhatsApp Chat</div>
              <div className="text-[11px] text-[#64748B]">Chat with our team</div>
            </div>
          </a>
          <a
            href={PHONE_NUMBER}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            data-testid="connect-phone"
            onClick={() => setOpen(false)}
          >
            <div className="w-9 h-9 rounded-full bg-[#0A1A2F]/10 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-[#0A1A2F]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#0A1A2F]">Quick Phone Call</div>
              <div className="text-[11px] text-[#64748B]">Speak to an expert now</div>
            </div>
          </a>
        </div>
      )}
    </div>
  );
};
