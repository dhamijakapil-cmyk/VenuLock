import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Mail, Phone, HelpCircle, ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'How does VenuLock work?', a: 'VenuLock is a managed booking platform. You tell us your event requirements, and our dedicated Relationship Manager finds, compares, and negotiates the best venue options for you.' },
  { q: 'Is there a fee for using the platform?', a: 'There is no fee for customers. VenuLock earns a commission from venues on confirmed bookings, so our service is completely free for you.' },
  { q: 'How do I track my booking?', a: 'After submitting a booking request, you can track your enquiry status by logging in and visiting the "My Enquiries" section in your dashboard.' },
  { q: 'Can I cancel or modify a booking?', a: 'Yes. Contact your assigned Relationship Manager to discuss modifications or cancellations. Cancellation terms depend on the venue\'s policy and how far the event date is.' },
  { q: 'How are payments handled?', a: 'Payments are processed securely through our platform. We use an escrow system where funds are held until the booking is confirmed by both parties.' },
  { q: 'How do I list my venue on VenuLock?', a: 'Visit the "List Your Venue" page and submit your venue details. Our team will review your application within 2 business days.' },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = React.useState(null);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#EAEAEA' }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 flex h-14 items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#111111] transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] mb-2" data-testid="support-heading">Help & Support</h1>
        <p className="text-sm text-[#64748B] mb-10">Find answers to common questions or reach out to our team.</p>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <a href="mailto:support@venulock.in" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#C8A960] transition-colors text-center" data-testid="support-email-action">
            <Mail className="w-6 h-6 text-[#C8A960] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#111111]">Email Support</h3>
            <p className="text-xs text-[#64748B] mt-1">support@venulock.in</p>
          </a>
          <a href="tel:+919876543210" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#C8A960] transition-colors text-center" data-testid="support-phone-action">
            <Phone className="w-6 h-6 text-[#111111] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#111111]">Call Us</h3>
            <p className="text-xs text-[#64748B] mt-1">+91 98765 43210</p>
          </a>
          <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-400 transition-colors text-center" data-testid="support-whatsapp-action">
            <MessageCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#111111]">WhatsApp</h3>
            <p className="text-xs text-[#64748B] mt-1">Quick chat support</p>
          </a>
        </div>

        {/* FAQ */}
        <h2 className="text-lg font-bold text-[#111111] mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2" data-testid="faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                data-testid={`faq-item-${i}`}
              >
                <span className="text-sm font-semibold text-[#111111] pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#64748B] flex-shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === i && (
                <div className="px-5 pb-4 text-sm text-[#64748B] leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
