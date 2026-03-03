import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Mail, Phone, Clock, MessageCircle, ArrowLeft } from 'lucide-react';

export default function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#EAEAEA' }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 flex h-14 items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0A1A2F] transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1A2F] mb-2" data-testid="contact-heading">Contact Us</h1>
        <p className="text-sm text-[#64748B] mb-10">We're here to help with your venue booking needs.</p>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="contact-email-card">
            <div className="w-10 h-10 rounded-lg bg-[#C7A14A]/10 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-[#C7A14A]" />
            </div>
            <h3 className="text-sm font-bold text-[#0A1A2F] mb-1">Email</h3>
            <p className="text-sm text-[#64748B]">support@bookmyvenue.in</p>
            <p className="text-xs text-[#94A3B8] mt-2">We respond within 24 hours</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="contact-phone-card">
            <div className="w-10 h-10 rounded-lg bg-[#0A1A2F]/10 flex items-center justify-center mb-4">
              <Phone className="w-5 h-5 text-[#0A1A2F]" />
            </div>
            <h3 className="text-sm font-bold text-[#0A1A2F] mb-1">Phone</h3>
            <p className="text-sm text-[#64748B]">+91 98765 43210</p>
            <p className="text-xs text-[#94A3B8] mt-2">Mon–Sat, 10 AM – 7 PM IST</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="contact-whatsapp-card">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0A1A2F] mb-1">WhatsApp</h3>
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="text-sm text-[#C7A14A] hover:underline">Chat with us</a>
            <p className="text-xs text-[#94A3B8] mt-2">Quick replies during business hours</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="contact-office-card">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0A1A2F] mb-1">Office</h3>
            <p className="text-sm text-[#64748B]">Connaught Place, New Delhi 110001</p>
            <p className="text-xs text-[#94A3B8] mt-2">By appointment only</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#0A1A2F] mb-1">Send us a message</h2>
          <p className="text-xs text-[#64748B] mb-6">Fill out the form and we'll get back to you shortly.</p>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Thank you! We will get back to you soon.'); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <input type="text" placeholder="Your Name" required className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0A1A2F]" data-testid="contact-name-input" />
              <input type="email" placeholder="Your Email" required className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0A1A2F]" data-testid="contact-email-input" />
            </div>
            <input type="text" placeholder="Subject" className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0A1A2F]" data-testid="contact-subject-input" />
            <textarea placeholder="Your Message" rows={4} required className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0A1A2F] resize-none" data-testid="contact-message-input" />
            <button type="submit" className="px-6 py-3 rounded-lg bg-[#C7A14A] text-white text-sm font-semibold hover:bg-[#B5912F] transition-colors" data-testid="contact-submit-btn">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
