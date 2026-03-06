import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();

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

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16" data-testid="terms-content">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] mb-2">Terms of Service</h1>
        <p className="text-xs text-[#94A3B8] mb-8">Last updated: March 2026</p>

        <div className="prose prose-sm max-w-none text-[#374151] space-y-6">
          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">By accessing and using VenuLock, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">2. Platform Services</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">VenuLock is a managed venue booking platform that connects customers with verified event venues through dedicated Relationship Managers. We facilitate the discovery, comparison, negotiation, and booking of venues for events.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">3. User Accounts</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate and complete information during registration. You agree to notify us immediately of any unauthorized access to your account.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">4. Booking & Payments</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">All venue bookings are subject to availability and venue confirmation. Payments are processed securely through our platform using escrow-based protection. Advance payments are held until the booking is confirmed by both parties. Cancellation and refund policies vary by venue and will be communicated during the booking process.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">5. Venue Listings</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">While we verify venue information to the best of our ability, VenuLock does not guarantee the accuracy of all venue details, photos, or pricing. Final terms are confirmed between you and the venue through your assigned Relationship Manager.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">6. User Conduct</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">You agree not to misuse the platform, submit fraudulent bookings, harass venue partners or staff, or use the platform for any unlawful purpose. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">7. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">VenuLock acts as an intermediary between customers and venue partners. We are not liable for any disputes between customers and venues, or for any damages arising from the use of venue services. Our liability is limited to the platform service fee collected.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">8. Modifications</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">We reserve the right to modify these terms at any time. Changes will be posted on this page with an updated date. Continued use of the platform constitutes acceptance of modified terms.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">9. Governing Law</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of New Delhi.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">10. Contact</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">For questions regarding these terms, contact us at legal@venulock.in or through our Contact page.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
