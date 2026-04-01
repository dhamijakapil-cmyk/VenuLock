import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Camera, FileText, MessageSquare,
  MapPin, Users, IndianRupee, Building2, Phone, Star,
  ChevronRight, Briefcase, Image, Video, FileCheck,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const SECTIONS = [
  {
    title: 'Information to Collect',
    icon: FileText,
    items: [
      { text: 'Venue name', mandatory: true },
      { text: 'Owner / contact person name', mandatory: true },
      { text: 'Primary phone number', mandatory: true },
      { text: 'Email (if available)', mandatory: false },
      { text: 'Exact location / drop a map pin', mandatory: true },
      { text: 'Venue type (banquet, hotel, farmhouse, etc.)', mandatory: true },
      { text: 'Guest capacity range (min – max)', mandatory: true },
      { text: 'Rough pricing / per-plate band', mandatory: true },
      { text: 'Indoor / outdoor / both', mandatory: true },
      { text: 'Current operating status', mandatory: false },
      { text: 'Key amenities (parking, AC, DJ, etc.)', mandatory: false, tag: 'refine later' },
    ],
  },
  {
    title: 'Commercial Questions',
    icon: Briefcase,
    items: [
      { text: 'Is the owner interested in listing on VenuLoQ?', mandatory: true },
      { text: 'Open to lead/booking commercial model?', mandatory: false },
      { text: 'Can pricing be shared or confirmed?', mandatory: false },
      { text: 'Any negotiation flexibility?', mandatory: false },
      { text: 'Is this the decision-maker or someone else?', mandatory: false },
      { text: 'Can we send an onboarding link later?', mandatory: false },
    ],
  },
  {
    title: 'Media Guidance',
    icon: Camera,
    items: [
      { text: 'Facade / entrance shot', mandatory: true },
      { text: 'Main hall / event area (wide angle)', mandatory: true },
      { text: 'Stage / dining / seating area', mandatory: true },
      { text: 'Rooms / lawn / rooftop (if relevant)', mandatory: false },
      { text: 'Parking / access points', mandatory: false },
      { text: 'Short walkthrough video (30–60s)', mandatory: false, tag: 'helpful' },
    ],
  },
  {
    title: 'Documents / Proofs',
    icon: FileCheck,
    items: [
      { text: 'Visiting card', mandatory: false, tag: 'if available' },
      { text: 'Brochure / rate card', mandatory: false, tag: 'if available' },
      { text: 'GST / company info', mandatory: false, tag: 'if shared' },
      { text: 'Menu / package sheets', mandatory: false, tag: 'if available' },
    ],
  },
];

export default function VisitPrepScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="visit-prep-screen">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/60 mb-3" data-testid="prep-back-btn">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px] font-medium" style={sans}>Back</span>
        </button>
        <h1 className="text-[20px] font-bold text-white" style={sans}>Visit Prep</h1>
        <p className="text-[12px] text-white/50 mt-1" style={sans}>
          Review this checklist before heading to the venue. Know what to capture.
        </p>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex items-center gap-4 border-b border-black/[0.05] bg-white">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#0B0B0D]" />
          <span className="text-[10px] font-bold text-[#0B0B0D]" style={sans}>Must capture</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="text-[10px] font-medium text-[#64748B]" style={sans}>If available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-[#D4B36A] bg-[#D4B36A]/10 px-1.5 py-0.5 rounded" style={sans}>refine later</span>
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 py-4 space-y-4 pb-28">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-black/[0.04]">
              <section.icon className="w-4 h-4 text-[#D4B36A]" strokeWidth={1.5} />
              <h2 className="text-[13px] font-bold text-[#0B0B0D]" style={sans}>{section.title}</h2>
            </div>
            <div className="divide-y divide-black/[0.03]">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${item.mandatory ? 'bg-[#0B0B0D]' : 'bg-slate-200'}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[12px] ${item.mandatory ? 'font-semibold text-[#0B0B0D]' : 'text-[#64748B]'}`} style={sans}>
                      {item.text}
                    </span>
                    {item.tag && (
                      <span className="ml-2 text-[9px] font-medium text-[#D4B36A] bg-[#D4B36A]/10 px-1.5 py-0.5 rounded" style={sans}>
                        {item.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}>
        <button
          onClick={() => navigate('/field/capture/new')}
          className="w-full h-12 bg-[#0B0B0D] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          data-testid="start-capture-btn"
          style={sans}
        >
          Start Venue Capture
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
