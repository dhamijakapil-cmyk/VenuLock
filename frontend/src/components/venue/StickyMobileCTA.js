import React, { useState } from 'react';
import { formatIndianCurrency } from '@/lib/utils';
import { Calendar, MessageCircle, PhoneIncoming, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { VENULOQ_SUPPORT } from '@/config/contact';

const API = process.env.REACT_APP_BACKEND_URL;

const StickyMobileCTA = ({ venue, onEnquire }) => {
  const [showConnect, setShowConnect] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [callbackName, setCallbackName] = useState('');
  const [callbackPhone, setCallbackPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!venue) return null;
  const price = venue.pricing?.price_per_plate_veg;
  const whatsappNumber = venue.phone?.replace(/[^0-9]/g, '') || VENULOQ_SUPPORT.phone;
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in ${venue.name} for my upcoming event. Can you help me with availability and pricing?`);

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    if (!callbackName.trim() || !callbackPhone.trim()) {
      toast.error('Please enter your name and phone number');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/callback-request`, {
        name: callbackName.trim(),
        phone: callbackPhone.trim(),
        venue_id: venue.venue_id,
        venue_name: venue.name,
        venue_city: venue.city,
      });
      setSubmitted(true);
      toast.success("We'll call you within 30 minutes!");
      setTimeout(() => {
        setShowCallback(false);
        setShowConnect(false);
        setSubmitted(false);
        setCallbackName('');
        setCallbackPhone('');
      }, 2500);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Connect overlay */}
      {showConnect && !showCallback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" data-testid="connect-overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConnect(false)} />
          <div className="relative w-full bg-white rounded-t-2xl px-5 pt-5 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                How would you like to connect?
              </h3>
              <button onClick={() => setShowConnect(false)} className="w-8 h-8 flex items-center justify-center text-[#9CA3AF]">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-3">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border border-[#E5E0D8] rounded-xl hover:border-[#25D366] transition-colors"
                data-testid="connect-whatsapp"
              >
                <div className="w-11 h-11 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Chat on WhatsApp</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Get instant replies</p>
                </div>
              </a>
              <button
                onClick={() => setShowCallback(true)}
                className="flex items-center gap-4 p-4 border border-[#E5E0D8] rounded-xl hover:border-[#D4B36A] transition-colors w-full text-left"
                data-testid="connect-callback"
              >
                <div className="w-11 h-11 rounded-full bg-[#D4B36A]/10 flex items-center justify-center flex-shrink-0">
                  <PhoneIncoming className="w-5 h-5 text-[#D4B36A]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Request a Callback</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>We'll call you within 30 mins</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Callback form overlay */}
      {showCallback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" data-testid="callback-overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCallback(false); setShowConnect(false); }} />
          <div className="relative w-full bg-white rounded-t-2xl px-5 pt-5 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-[#D4B36A]/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-[#D4B36A]" strokeWidth={2} />
                </div>
                <h3 className="text-[18px] font-semibold text-[#0B0B0D] mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  We'll call you soon!
                </h3>
                <p className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Our venue expert will reach out within 30 minutes
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    Request a Callback
                  </h3>
                  <button onClick={() => { setShowCallback(false); setShowConnect(false); }} className="w-8 h-8 flex items-center justify-center text-[#9CA3AF]">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  For <span className="text-[#0B0B0D] font-medium">{venue.name}</span>
                </p>
                <form onSubmit={handleCallbackSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={callbackName}
                    onChange={(e) => setCallbackName(e.target.value)}
                    className="w-full border border-[#E5E0D8] bg-white rounded-lg px-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none"
                    data-testid="callback-name"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={callbackPhone}
                    onChange={(e) => setCallbackPhone(e.target.value)}
                    className="w-full border border-[#E5E0D8] bg-white rounded-lg px-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none"
                    data-testid="callback-phone"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#0B0B0D] text-[#F4F1EC] font-bold text-[12px] rounded-lg uppercase tracking-[0.1em] disabled:opacity-50 transition-all"
                    data-testid="callback-submit"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneIncoming className="w-4 h-4" strokeWidth={1.5} />}
                    {submitting ? 'Submitting...' : 'Call Me Back'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sticky bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0B0B0D]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        data-testid="sticky-mobile-cta"
      >
        <div className="flex items-center justify-between px-4 py-2.5 gap-2.5">
          <div className="min-w-0">
            {price ? (
              <>
                <p className="text-[16px] font-bold text-[#F4F1EC] leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatIndianCurrency(price)}
                  <span className="text-[10px] font-normal text-[#F4F1EC]/40"> /plate</span>
                </p>
                <p className="text-[10px] text-[#F4F1EC]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>Veg starting price</p>
              </>
            ) : (
              <p className="text-[13px] font-medium text-[#F4F1EC]">Get pricing details</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowConnect(true)}
              className="h-10 px-4 border border-[#F4F1EC]/20 bg-transparent text-[#F4F1EC] font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-[0.05em] hover:border-[#D4B36A] hover:text-[#D4B36A]"
              data-testid="sticky-connect-btn"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              Connect
            </button>
            <button
              onClick={onEnquire}
              className="h-10 px-5 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-[0.05em]"
              data-testid="sticky-enquire-btn"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
              Start Planning
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StickyMobileCTA;
