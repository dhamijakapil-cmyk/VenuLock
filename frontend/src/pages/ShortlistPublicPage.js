import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  MapPin, Users, ThumbsUp, ThumbsDown, HelpCircle, CheckCircle2,
  AlertCircle, Clock, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const sans = { fontFamily: "'DM Sans', sans-serif" };

const PREF_CONFIG = {
  interested: { label: "I'm Interested", icon: ThumbsUp, color: 'bg-emerald-500 text-white', ring: 'ring-emerald-300' },
  maybe: { label: 'Maybe', icon: HelpCircle, color: 'bg-amber-400 text-white', ring: 'ring-amber-300' },
  not_interested: { label: 'Not For Me', icon: ThumbsDown, color: 'bg-red-400 text-white', ring: 'ring-red-300' },
};

export default function ShortlistPublicPage() {
  const { shareToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState({}); // {venue_id: {preference, comment}}
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedVenue, setExpandedVenue] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/shortlist/${shareToken}`);
      if (res.status === 404) { setError('invalid'); return; }
      if (res.status === 410) { setError('expired'); return; }
      if (!res.ok) { setError('error'); return; }
      const json = await res.json();
      setData(json);

      // Pre-fill feedback if already submitted
      if (json.feedback_received) {
        setSubmitted(true);
        const existing = {};
        json.venues.forEach(v => {
          if (v.feedback) existing[v.venue_id] = { preference: v.feedback.preference, comment: v.feedback.comment || '' };
        });
        setFeedback(existing);
      }
    } catch { setError('error'); }
    finally { setLoading(false); }
  }, [shareToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setPreference = (venueId, pref) => {
    if (submitted) return;
    setFeedback(prev => ({
      ...prev,
      [venueId]: { ...prev[venueId], preference: prev[venueId]?.preference === pref ? null : pref },
    }));
  };

  const setComment = (venueId, comment) => {
    if (submitted) return;
    setFeedback(prev => ({ ...prev, [venueId]: { ...prev[venueId], comment } }));
  };

  const handleSubmit = async () => {
    const feedbackList = Object.entries(feedback)
      .filter(([_, v]) => v.preference)
      .map(([venue_id, v]) => ({ venue_id, preference: v.preference, comment: v.comment || '' }));

    if (feedbackList.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/shortlist/${shareToken}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackList }),
      });
      if (res.ok) setSubmitted(true);
    } catch {}
    finally { setSubmitting(false); }
  };

  const feedbackCount = Object.values(feedback).filter(v => v.preference).length;

  // ── Loading / Error States ──
  if (loading) return (
    <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
    </div>
  );

  if (error === 'invalid') return <ErrorState title="Link Not Found" desc="This shortlist link is invalid or has been removed." />;
  if (error === 'expired') return <ErrorState title="Link Expired" desc="This shortlist link has expired. Please ask your VenuLoQ contact for a new one." />;
  if (error) return <ErrorState title="Something went wrong" desc="We couldn't load this shortlist. Please try again." />;

  return (
    <div className="min-h-screen bg-[#F4F1EC]" style={sans}>
      {/* Header */}
      <div className="bg-[#0B0B0D] text-white px-4 pt-[env(safe-area-inset-top,16px)] pb-5 text-center"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
        <h1 className="text-[20px] font-bold text-[#D4B36A] tracking-wide" data-testid="shortlist-header">VenuLoQ</h1>
        <p className="text-[10px] uppercase tracking-[3px] text-white/40 mt-1">Curated For You</p>
        <h2 className="text-[16px] font-semibold mt-3" data-testid="shortlist-customer-name">
          {data?.customer_name ? `Hi ${data.customer_name.split(' ')[0]},` : 'Your Venue Shortlist'}
        </h2>
        <p className="text-[12px] text-white/60 mt-1">
          {submitted ? 'Thank you for your feedback!' : `${data?.total || 0} handpicked venue${data?.total !== 1 ? 's' : ''} for your event`}
        </p>
      </div>

      {/* Submitted Banner */}
      {submitted && (
        <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2" data-testid="feedback-submitted-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-emerald-700">Preferences received</p>
            <p className="text-[10px] text-emerald-600">Your VenuLoQ representative will follow up with you shortly.</p>
          </div>
        </div>
      )}

      {/* Venue Cards */}
      <div className="px-4 py-4 pb-32 space-y-3" data-testid="shortlist-venues">
        {(data?.venues || []).map((venue, i) => {
          const fb = feedback[venue.venue_id];
          const isExpanded = expandedVenue === venue.venue_id;
          const pricing = venue.pricing?.per_person_price;

          return (
            <div key={venue.venue_id}
              className={cn("bg-white rounded-2xl border overflow-hidden transition-all",
                fb?.preference === 'interested' ? 'border-emerald-300 shadow-lg shadow-emerald-100' :
                fb?.preference === 'not_interested' ? 'border-red-200 opacity-70' :
                fb?.preference === 'maybe' ? 'border-amber-300' : 'border-black/[0.06]'
              )} data-testid={`shortlist-venue-${venue.venue_id}`}>

              {/* Image + Info */}
              <div className="relative">
                {venue.image ? (
                  <img src={venue.image} alt={venue.name} loading="lazy"
                    className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                    <span className="text-slate-400 text-3xl font-bold">{venue.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                  <h3 className="text-[15px] font-bold text-white leading-tight">{venue.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-[11px] text-white/80">
                      <MapPin className="w-3 h-3" />{venue.area || venue.city}
                    </span>
                    {(venue.capacity_min || venue.capacity_max) && (
                      <span className="flex items-center gap-0.5 text-[11px] text-white/80">
                        <Users className="w-3 h-3" />{venue.capacity_min}–{venue.capacity_max}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details (expandable) */}
              <div className="p-3">
                {pricing && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-bold text-[#0B0B0D]">
                      From INR {typeof pricing === 'number' ? pricing.toLocaleString('en-IN') : pricing}/plate
                    </span>
                    <button onClick={() => setExpandedVenue(isExpanded ? null : venue.venue_id)}
                      className="text-[10px] text-[#D4B36A] font-semibold flex items-center gap-0.5">
                      {isExpanded ? 'Less' : 'More'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <div className="mb-3 text-[11px] text-slate-500 space-y-1">
                    {venue.city && <p>City: {venue.city}</p>}
                    {venue.area && <p>Area: {venue.area}</p>}
                    {venue.capacity_min && <p>Capacity: {venue.capacity_min}–{venue.capacity_max} guests</p>}
                  </div>
                )}

                {/* Preference Buttons */}
                <div className="flex gap-1.5">
                  {Object.entries(PREF_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = fb?.preference === key;
                    return (
                      <button key={key}
                        onClick={() => setPreference(venue.venue_id, key)}
                        disabled={submitted}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold border transition-all",
                          isSelected ? `${config.color} border-transparent ring-2 ${config.ring}` : 'bg-white text-slate-500 border-slate-200',
                          submitted && 'opacity-60 cursor-default'
                        )}
                        data-testid={`pref-${key}-${venue.venue_id}`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                {/* Comment field (shows when preference selected) */}
                {fb?.preference && !submitted && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">Comment (optional)</span>
                    </div>
                    <input type="text" value={fb.comment || ''} onChange={e => setComment(venue.venue_id, e.target.value)}
                      placeholder="Any thoughts on this venue..."
                      className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-[11px] placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/30"
                      data-testid={`comment-${venue.venue_id}`} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Bar */}
      {!submitted && feedbackCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-12 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-[#D4B36A]/20"
            data-testid="submit-feedback-btn">
            {submitting ? 'Sending...' : `Submit Preferences (${feedbackCount}/${data?.total || 0})`}
          </button>
        </div>
      )}
    </div>
  );
}

function ErrorState({ title, desc }) {
  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col items-center justify-center px-6 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-slate-400" />
      </div>
      <h2 className="text-[18px] font-bold text-[#0B0B0D] mb-1">{title}</h2>
      <p className="text-[13px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
