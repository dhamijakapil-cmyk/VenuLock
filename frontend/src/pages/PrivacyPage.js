import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16" data-testid="privacy-content">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] mb-2">Privacy Policy</h1>
        <p className="text-xs text-[#94A3B8] mb-8">Last updated: March 2026</p>

        <div className="prose prose-sm max-w-none text-[#374151] space-y-6">
          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">We collect personal information that you provide directly to us, including your name, email address, phone number, and event details when you submit a booking request or create an account. We also collect usage data such as pages visited, time spent on the platform, and device information.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">2. How We Use Your Information</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">Your information is used to provide our venue booking services, assign Relationship Managers, communicate about your enquiries, process payments, and improve our platform. We may also send you relevant updates about venues and offers.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">3. Information Sharing</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">We share your event requirements with venue partners and Relationship Managers to facilitate your booking. We do not sell your personal information to third parties. Payment information is processed securely through our payment partners (Razorpay) and is never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">4. Data Security</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">We implement industry-standard security measures to protect your data, including encryption in transit (SSL/TLS), secure database storage, and access controls. Our payment processing is handled through PCI-DSS compliant partners.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">5. Cookies & Tracking</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">We use cookies and similar technologies to maintain your session, remember preferences, and analyze platform usage. You can manage cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">6. Your Rights</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">You have the right to access, correct, or delete your personal data. You may also opt out of marketing communications at any time. To exercise these rights, contact us at privacy@venulock.in.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">7. Contact</h2>
            <p className="text-sm leading-relaxed text-[#64748B]">For privacy-related inquiries, please contact us at privacy@venulock.in or through our Contact page.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
