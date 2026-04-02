import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2, XCircle, AlertTriangle, Building2, MapPin,
  Users, IndianRupee, Shield, Clock, Loader2, FileText,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const sans = { fontFamily: "'DM Sans', sans-serif" };

export default function OwnerOnboardingPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Acceptance state
  const [signerName, setSignerName] = useState('');
  const [consents, setConsents] = useState({
    publish: false, commercial: false, platform_terms: false, media_usage: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/onboarding/view/${token}`)
      .then(res => {
        setData(res.data);
        if (res.data.already_completed) setAccepted(true);
        if (res.data.already_declined) setDeclined(true);
      })
      .catch(err => {
        const status = err.response?.status;
        if (status === 410) setError('expired');
        else if (status === 404) setError('invalid');
        else setError('error');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!signerName.trim()) { alert('Please enter your full name'); return; }
    if (!consents.publish) { alert('Consent to publish/list is required'); return; }
    if (!consents.platform_terms) { alert('Consent to platform terms is required'); return; }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/onboarding/accept/${token}`, {
        signer_name: signerName.trim(),
        consent_publish: consents.publish,
        consent_commercial: consents.commercial,
        consent_platform_terms: consents.platform_terms,
        consent_media_usage: consents.media_usage,
      });
      setAccepted(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Acceptance failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/onboarding/decline/${token}`, {
        reason: declineReason.trim() || undefined,
      });
      setDeclined(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Action failed');
    } finally { setSubmitting(false); }
  };

  // Error states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D4B36A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-[#64748B]" style={sans}>Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <ErrorPage icon={Clock} title="Link Expired"
        message="This onboarding link has expired. Please contact VenuLoQ for a new link."
        color="text-amber-500" />
    );
  }
  if (error === 'invalid') {
    return (
      <ErrorPage icon={XCircle} title="Invalid Link"
        message="This link is invalid or has already been used. Please check the link or contact VenuLoQ."
        color="text-red-500" />
    );
  }
  if (error) {
    return (
      <ErrorPage icon={AlertTriangle} title="Something Went Wrong"
        message="We couldn't load your onboarding page. Please try again later."
        color="text-red-500" />
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9] px-6" data-testid="onboarding-success">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0B0B0D] mb-2" style={sans}>Welcome to VenuLoQ</h1>
          <p className="text-[14px] text-[#64748B] leading-relaxed mb-4" style={sans}>
            Your venue <strong>{data?.venue_name}</strong> has been successfully onboarded.
            Our team will finalize the listing and it will be live shortly.
          </p>
          {data?.accepted_at && (
            <p className="text-[11px] text-[#9CA3AF]" style={sans}>
              Accepted by {data.signer_name || signerName} &middot; Terms v{data.terms_version}
            </p>
          )}
          <div className="mt-6 pt-4 border-t border-black/[0.06]">
            <p className="text-[11px] text-[#9CA3AF]" style={sans}>
              Questions? Contact us at support@venuloq.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Declined state
  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9] px-6" data-testid="onboarding-declined">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0B0B0D] mb-2" style={sans}>Onboarding Declined</h1>
          <p className="text-[14px] text-[#64748B] leading-relaxed" style={sans}>
            You have declined the onboarding for <strong>{data?.venue_name}</strong>.
            If this was a mistake, please contact VenuLoQ.
          </p>
        </div>
      </div>
    );
  }

  // Main onboarding flow
  const allRequired = consents.publish && consents.platform_terms && signerName.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="owner-onboarding-page">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-[#D4B36A]" />
          <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-bold" style={sans}>VenuLoQ</p>
        </div>
        <h1 className="text-[22px] font-bold text-white leading-tight" style={sans}>
          Venue Onboarding
        </h1>
        <p className="text-[13px] text-white/50 mt-1" style={sans}>
          Review and accept the listing terms for your venue
        </p>
      </div>

      <div className="px-5 py-5 space-y-5 pb-32 max-w-lg mx-auto">
        {/* Venue Summary */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4" data-testid="venue-summary">
          <h2 className="text-[16px] font-bold text-[#0B0B0D] mb-2" style={sans}>{data.venue_name}</h2>
          <div className="space-y-1.5">
            <SummaryRow icon={MapPin} value={`${data.locality || ''}, ${data.city || '—'}`} />
            <SummaryRow icon={Building2} value={data.venue_type?.replace(/_/g, ' ') || '—'} />
            <SummaryRow icon={Users} value={data.capacity_min || data.capacity_max ? `${data.capacity_min || '—'} – ${data.capacity_max || '—'} guests` : '—'} />
            {data.pricing_band_min && (
              <SummaryRow icon={IndianRupee} value={`Starting ₹${data.pricing_band_min}/plate`} />
            )}
          </div>
          {data.publishable_summary && (
            <p className="text-[12px] text-[#64748B] leading-relaxed mt-3 pt-3 border-t border-black/[0.04]" style={sans}>
              {data.publishable_summary}
            </p>
          )}
        </div>

        {/* Owner Identity */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4" data-testid="owner-identity">
          <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-2" style={sans}>
            Contact on Record
          </h3>
          <p className="text-[13px] text-[#0B0B0D] font-medium" style={sans}>{data.owner_name || '—'}</p>
          {data.owner_phone && <p className="text-[12px] text-[#64748B]" style={sans}>{data.owner_phone}</p>}
          {data.owner_email && <p className="text-[12px] text-[#64748B]" style={sans}>{data.owner_email}</p>}
        </div>

        {/* Plain-Language Summary */}
        <div className="bg-[#FFFDF5] rounded-xl border border-[#D4B36A]/20 p-4" data-testid="plain-language-summary">
          <h3 className="text-[13px] font-bold text-[#0B0B0D] mb-3" style={sans}>
            What You're Agreeing To — In Plain Language
          </h3>
          <div className="space-y-3">
            <SummaryPoint number="1" title="Venue Listing">
              VenuLoQ will create and publish a listing for <strong>{data.venue_name}</strong> on our platform.
              This includes your venue name, location, capacity, pricing, photos, and description as provided.
            </SummaryPoint>
            <SummaryPoint number="2" title="Representation">
              VenuLoQ is authorized to represent and display your venue to potential customers looking for event
              spaces in your area.
            </SummaryPoint>
            <SummaryPoint number="3" title="Lead & Booking Framework">
              VenuLoQ will share qualified customer enquiries and bookings with you. The commercial arrangement
              operates on a commission-based model — VenuLoQ earns a commission on successful bookings facilitated
              through the platform.
            </SummaryPoint>
            <SummaryPoint number="4" title="Content & Photos">
              Photos and descriptions collected during venue visits may be used in marketing materials, the platform
              listing, and promotional content for your venue.
            </SummaryPoint>
            <SummaryPoint number="5" title="Platform Terms">
              Standard platform terms apply regarding listing accuracy, booking processes, cancellation policies,
              and dispute resolution. You can review the full terms below.
            </SummaryPoint>
          </div>
        </div>

        {/* Terms & Consent */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4" data-testid="consent-area">
          <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-3" style={sans}>
            Consent & Authorization
          </h3>
          <p className="text-[10px] text-[#9CA3AF] mb-3" style={sans}>Terms Version: {data.terms_version}</p>

          <div className="space-y-3">
            <ConsentCheckbox
              checked={consents.publish}
              onChange={v => setConsents(p => ({ ...p, publish: v }))}
              label="I authorize VenuLoQ to publish and list my venue on their platform"
              required testId="consent-publish" />
            <ConsentCheckbox
              checked={consents.commercial}
              onChange={v => setConsents(p => ({ ...p, commercial: v }))}
              label="I agree to the commission-based commercial framework for bookings facilitated through VenuLoQ"
              testId="consent-commercial" />
            <ConsentCheckbox
              checked={consents.platform_terms}
              onChange={v => setConsents(p => ({ ...p, platform_terms: v }))}
              label="I accept VenuLoQ's platform terms and conditions"
              required testId="consent-terms" />
            <ConsentCheckbox
              checked={consents.media_usage}
              onChange={v => setConsents(p => ({ ...p, media_usage: v }))}
              label="I consent to VenuLoQ using photos and content for listing and promotional purposes"
              testId="consent-media" />
          </div>
        </div>

        {/* Digital Acceptance */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4" data-testid="acceptance-step">
          <h3 className="text-[12px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-3" style={sans}>
            Digital Acceptance
          </h3>
          <label className="text-[10px] font-bold text-[#0B0B0D] uppercase tracking-[0.08em] mb-1 block" style={sans}>
            Full Name (as authorization) <span className="text-[#D4B36A]">*</span>
          </label>
          <input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder={data.owner_name || "Your full name"}
            className="w-full h-11 px-3 border border-black/[0.08] rounded-xl text-[14px] outline-none focus:border-[#D4B36A]"
            data-testid="signer-name" style={sans} />
          <p className="text-[9px] text-[#9CA3AF] mt-1.5" style={sans}>
            By entering your name and clicking "Accept & Onboard", you digitally authorize the terms above.
          </p>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-5 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}>
        <div className="max-w-lg mx-auto">
          <button onClick={handleAccept} disabled={submitting || !allRequired}
            className={`w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
              allRequired
                ? 'bg-emerald-600 text-white active:scale-[0.98] shadow-lg shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            data-testid="accept-btn" style={sans}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Accept & Onboard
          </button>
          <button onClick={() => setShowDecline(!showDecline)}
            className="w-full mt-2 text-[11px] text-[#9CA3AF] font-medium text-center py-1"
            data-testid="show-decline" style={sans}>
            I don't want to proceed
          </button>
          {showDecline && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full h-16 px-3 py-2 border border-red-200 rounded-lg text-[12px] resize-none outline-none bg-white"
                data-testid="decline-reason" style={sans} />
              <button onClick={handleDecline} disabled={submitting}
                className="w-full mt-2 h-10 bg-red-500 text-white rounded-lg text-[12px] font-bold disabled:opacity-50"
                data-testid="decline-btn" style={sans}>
                Decline Onboarding
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={1.5} />
      <span className="text-[12px] text-[#64748B] capitalize" style={sans}>{value}</span>
    </div>
  );
}

function SummaryPoint({ number, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="w-5 h-5 bg-[#D4B36A]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-[#8B7330]" style={sans}>{number}</span>
      </div>
      <div>
        <h4 className="text-[12px] font-bold text-[#0B0B0D]" style={sans}>{title}</h4>
        <p className="text-[11px] text-[#64748B] leading-relaxed mt-0.5" style={sans}>{children}</p>
      </div>
    </div>
  );
}

function ConsentCheckbox({ checked, onChange, label, required, testId }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer" data-testid={testId}>
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
        checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
      }`} onClick={() => onChange(!checked)}>
        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className="text-[12px] text-[#0B0B0D] leading-relaxed" style={sans}>
        {label} {required && <span className="text-[#D4B36A]">*</span>}
      </span>
    </label>
  );
}

function ErrorPage({ icon: Icon, title, message, color }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9] px-6" data-testid="onboarding-error">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
        <h1 className="text-[22px] font-bold text-[#0B0B0D] mb-2" style={sans}>{title}</h1>
        <p className="text-[14px] text-[#64748B] leading-relaxed" style={sans}>{message}</p>
        <div className="mt-6 pt-4 border-t border-black/[0.06]">
          <p className="text-[11px] text-[#9CA3AF]" style={sans}>
            Contact VenuLoQ at support@venuloq.com for assistance
          </p>
        </div>
      </div>
    </div>
  );
}
