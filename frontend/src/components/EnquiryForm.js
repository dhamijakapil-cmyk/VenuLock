import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  Sparkles,
  Phone,
  ArrowRight,
  ArrowLeft,
  Clock,
  MessageCircle,
  Shield,
  ShieldCheck,
  Star,
  Users,
  MapPin,
  Award,
  ChevronRight,
  ChevronDown,
  Crown,
  Check,
  Zap,
  LogIn,
} from 'lucide-react';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VENULOQ_SUPPORT } from '@/config/contact';

const RM_AVATAR_COLORS = ['bg-[#D4B36A]', 'bg-[#111111]', 'bg-[#065F46]'];

const CONCIERGE_SERVICES = [
  { label: 'Venue Selection & Negotiation' },
  { label: 'Decor & Theme Design' },
  { label: 'Catering & Menu Planning' },
  { label: 'DJ & Live Music' },
  { label: 'Artists & Entertainment' },
  { label: 'Photography & Videography' },
  { label: 'Mehendi & Sangeet' },
  { label: 'Makeup & Styling' },
  { label: 'Guest Management & RSVP' },
  { label: 'Travel & Stay Arrangements' },
  { label: 'Budget Planning & Tracking' },
  { label: 'Day-of Coordination' },
];

const EnquiryForm = ({ venue, isOpen, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Flow: 'intro' → 'assigning' → 'rm-selection' → 'phone-verify' → success
  const [currentView, setCurrentView] = useState('intro');

  // Concierge checklist animation
  const [visibleChecks, setVisibleChecks] = useState(0);

  // RM state
  const [rms, setRms] = useState([]);
  const [rmsLoading, setRmsLoading] = useState(false);
  const [selectedRmId, setSelectedRmId] = useState(null);
  const [expandedRmId, setExpandedRmId] = useState(null);
  const [topPerformerIds, setTopPerformerIds] = useState({});

  // Reset everything when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('intro');
      setVisibleChecks(0);
      setSelectedRmId(null);
      setExpandedRmId(null);
      setPhoneNumber(user?.phone || '');
      setPhoneError('');
      setSuccess(false);
      setSubmittedData(null);
      setLoading(false);
    }
  }, [isOpen, user?.phone]);

  // Animate checklist items in intro
  useEffect(() => {
    if (isOpen && currentView === 'intro' && visibleChecks < CONCIERGE_SERVICES.length) {
      const t = setTimeout(() => setVisibleChecks(v => v + 1), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, currentView, visibleChecks]);

  // Auto-advance from "assigning" after 2.5s + load RMs
  useEffect(() => {
    if (isOpen && currentView === 'assigning') {
      loadRMs();
      const timer = setTimeout(() => setCurrentView('rm-selection'), 2500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentView]);

  const loadRMs = async () => {
    setRmsLoading(true);
    try {
      const [rmRes, topRes] = await Promise.all([
        api.get(`/rms/available${venue?.city ? `?city=${encodeURIComponent(venue.city)}` : ''}`),
        api.get('/rms/top-performers').catch(() => ({ data: [] })),
      ]);
      setRms(rmRes.data || []);
      const topMap = {};
      (topRes.data || []).forEach((p, i) => { topMap[p.user_id] = i + 1; });
      setTopPerformerIds(topMap);
    } catch {
      setRms([]);
    }
    setRmsLoading(false);
  };

  const handleClose = () => {
    onClose();
  };

  const handleBack = () => {
    if (currentView === 'phone-verify') setCurrentView('rm-selection');
    else if (currentView === 'rm-selection') setCurrentView('intro');
    else if (currentView === 'assigning') setCurrentView('intro');
    else handleClose();
  };

  const handlePhoneSubmit = async () => {
    const phone = phoneNumber.replace(/\D/g, '');
    if (phone.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    setPhoneError('');
    setLoading(true);

    try {
      const bookingGuests = localStorage.getItem('booking_guests') || '';
      const bookingDate = localStorage.getItem('booking_date') || '';

      const selectedRm = rms.find(r => r.user_id === selectedRmId);
      const payload = {
        customer_name: user?.name || 'Guest',
        customer_email: user?.email || '',
        customer_phone: phoneNumber,
        guest_count_range: bookingGuests || null,
        event_date: bookingDate || null,
        venue_ids: venue?.venue_id ? [venue.venue_id] : [],
        city: venue?.city || '',
        area: venue?.area || '',
        selected_rm_id: selectedRmId || null,
        source: 'website',
      };

      const res = await api.post('/leads', payload);
      setSubmittedData({
        booking_id: res.data?.lead_id,
        rm_name: selectedRm?.name || res.data?.rm_name || 'Expert Team',
        rm_picture: selectedRm?.picture || null,
        rm_rating: selectedRm?.rating || 4.9,
      });
      setSuccess(true);
      toast.success('Your booking request has been submitted!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setPhoneError(typeof msg === 'string' ? msg : 'Something went wrong.');
      toast.error('Failed to submit. Please try again.');
    }
    setLoading(false);
  };

  const openWhatsApp = () => {
    const rmPhone = submittedData?.rm_phone || VENULOQ_SUPPORT.phone;
    const msg = `Hi${submittedData?.rm_name ? ' ' + submittedData.rm_name.split(' ')[0] : ''}! I'm ${user?.name || 'interested'} — booking ref: ${submittedData?.booking_id || 'N/A'} for ${venue?.name || 'a venue'}. Looking forward to your call!`;
    window.open(`https://wa.me/${rmPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ═══ SUCCESS SCREEN ═══
  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none max-h-[85vh]">
          <DialogTitle className="sr-only">Booking Confirmation</DialogTitle>
          <div className="bg-[#F8F6F1] rounded-3xl shadow-2xl shadow-black/10 overflow-y-auto max-h-[85vh]">
            {/* Hero header */}
            <div className="bg-[#0B0B0D] p-5 sm:p-6 text-center relative overflow-hidden rounded-b-[28px]">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #D4B36A 0%, transparent 50%)' }} />
              <div className="relative">
                <div className="w-12 h-12 bg-[#D4B36A] rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_24px_rgba(212,179,106,0.3)]">
                  <CheckCircle className="w-6 h-6 text-[#0B0B0D]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>You're All Set!</h3>
                <p className="text-white/45 text-[13px]">Your dedicated venue expert is ready to help</p>
                {submittedData?.booking_id && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Ref</span>
                    <span className="text-sm font-mono font-bold text-[#D4B36A]" data-testid="booking-ref-id">{submittedData.booking_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              {/* RM Card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.04]">
                <div className="flex items-center gap-3">
                  {submittedData?.rm_picture ? (
                    <img src={submittedData.rm_picture} alt={submittedData?.rm_name} className="w-12 h-12 rounded-full object-cover border-2 border-[#D4B36A]/30 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-[#0B0B0D] rounded-full flex items-center justify-center text-[#D4B36A] font-bold text-lg flex-shrink-0">
                      {submittedData?.rm_name?.charAt(0) || 'V'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-0.5 font-medium">
                      {selectedRmId ? 'Your Selected Expert' : 'Your Venue Expert'}
                    </p>
                    <p className="font-bold text-[15px] text-[#111]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{submittedData?.rm_name || 'Expert Team'}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#FFF8E7] px-2.5 py-1 rounded-full flex-shrink-0">
                    <Star className="w-3.5 h-3.5 text-[#D4B36A] fill-[#D4B36A]" />
                    <span className="text-sm font-bold text-[#111]">{submittedData?.rm_rating?.toFixed(1) || '4.9'}</span>
                  </div>
                </div>
              </div>

              {/* What Happens Next — Timeline */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.04]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>What happens next</p>
                <div className="space-y-0">
                  {[
                    { label: 'Callback within 30 min', sub: 'During business hours (9 AM – 9 PM)', active: true, done: false },
                    { label: 'Venue options shortlisted', sub: 'Curated to your budget & preferences', active: false, done: false },
                    { label: 'Site visit arranged', sub: 'We coordinate everything for you', active: false, done: false },
                    { label: 'Best deal negotiated', sub: 'Transparent pricing, no hidden costs', active: false, done: false },
                  ].map((step, i, arr) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.active ? 'bg-[#D4B36A] shadow-[0_0_12px_rgba(212,179,106,0.4)]' : 'bg-[#F0EDE7] border border-[#E5E1D8]'}`}>
                          {step.active ? (
                            <Clock className="w-3 h-3 text-[#0B0B0D]" />
                          ) : (
                            <span className="text-[9px] font-bold text-[#94A3B8]">{i + 1}</span>
                          )}
                        </div>
                        {i < arr.length - 1 && <div className="w-px h-7 bg-[#E5E1D8] my-0.5" />}
                      </div>
                      <div className={`pb-3 ${i === arr.length - 1 ? 'pb-0' : ''}`}>
                        <p className={`text-[13px] font-semibold leading-tight ${step.active ? 'text-[#0B0B0D]' : 'text-[#94A3B8]'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.label}</p>
                        <p className="text-[11px] text-[#B0A898] mt-0.5">{step.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Venue info */}
              {venue && (
                <div className="flex items-center gap-3 p-3.5 bg-white rounded-xl shadow-sm border border-black/[0.04]">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={typeof venue.images?.[0] === 'string' ? venue.images[0] : venue.images?.[0]?.url || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=200'}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#111]">{venue.name}</p>
                    <p className="text-xs text-[#94A3B8]">{venue.area ? `${venue.area}, ${venue.city}` : venue.city}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2.5 pt-1 pb-1">
                <Button onClick={openWhatsApp} variant="outline"
                  className="w-full h-12 rounded-xl border-[#0B0B0D] text-[#0B0B0D] hover:bg-[#0B0B0D] hover:text-white font-semibold transition-all"
                  data-testid="whatsapp-btn">
                  <MessageCircle className="w-5 h-5 mr-2" /> Chat on WhatsApp
                </Button>
                <Button onClick={() => { handleClose(); if (user) navigate('/my-enquiries'); }}
                  className="w-full h-12 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(212,179,106,0.3)]"
                  data-testid="view-enquiries-btn">
                  Track Your Request
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══ MAIN MODAL ═══

  // Auth gate: if not signed in, show sign-in prompt
  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none max-h-[90vh]">
          <DialogTitle className="sr-only">Sign In Required</DialogTitle>
          <div className="bg-[#0B0B0D] rounded-3xl shadow-2xl overflow-hidden" data-testid="auth-gate-view">
            <div className="relative h-36 overflow-hidden">
              <img src={venue?.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'} alt={venue?.name || 'Venue'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/70 to-transparent" />
              <div className="absolute bottom-3 left-5 right-5">
                <p className="text-[10px] text-[#E2C06E] font-bold uppercase tracking-[0.15em] mb-0.5">You're booking</p>
                <h3 className="text-[16px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue?.name || 'Your Dream Venue'}</h3>
              </div>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E2C06E]/10 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-7 h-7 text-[#E2C06E]" />
              </div>
              <h3 className="text-[18px] font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Sign In to <span className="text-[#E2C06E]">Start Planning</span>
              </h3>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[300px] mx-auto mb-6">
                Create a free account or sign in to get a dedicated venue expert assigned to your event.
              </p>
              <Button onClick={() => { handleClose(); navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`); }}
                className="w-full h-12 bg-[#E2C06E] hover:bg-[#EDD07E] text-[#0B0B0D] font-bold text-[13px] uppercase tracking-[0.06em] rounded-xl shadow-[0_4px_20px_rgba(226,192,110,0.3)] transition-all"
                data-testid="auth-gate-signin-btn">
                Sign In / Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-[9px] text-white/20 text-center mt-3">Free account. No spam. No pressure.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══ CONCIERGE INTRO VIEW ═══
  if (currentView === 'intro') {
    const allChecked = visibleChecks >= CONCIERGE_SERVICES.length;
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none max-h-[90vh]">
          <DialogTitle className="sr-only">Start Planning</DialogTitle>
          <div className="bg-[#0B0B0D] rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]" data-testid="concierge-intro">
            {/* Venue Hero */}
            <div className="relative h-36 overflow-hidden">
              <img src={venue?.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'} alt={venue?.name || 'Venue'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/70 to-transparent" />
              <button type="button" onClick={handleClose} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all z-10" data-testid="back-btn-intro">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-5 right-5">
                <p className="text-[10px] text-[#E2C06E] font-bold uppercase tracking-[0.15em] mb-0.5">You're booking</p>
                <h3 className="text-[16px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue?.name || 'Your Dream Venue'}</h3>
              </div>
            </div>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E2C06E] to-[#D4B36A] flex items-center justify-center shadow-[0_2px_12px_rgba(226,192,110,0.3)]">
                  <Crown className="w-4.5 h-4.5 text-[#0B0B0D]" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    We'll Assign You a <span className="text-[#E2C06E]">Personal RM</span>
                  </h2>
                  <p className="text-[11px] text-white/40 mt-0.5">Your dedicated Relationship Manager will handle:</p>
                </div>
              </div>
            </div>

            {/* Services Checklist - 2 columns */}
            <div className="px-5 pb-3">
              <div className="grid grid-cols-2 gap-x-2 gap-y-0">
                {CONCIERGE_SERVICES.map((service, i) => {
                  const isChecked = i < visibleChecks;
                  return (
                    <div key={service.label}
                      className="flex items-center gap-2 py-[7px] border-b border-white/[0.04] last:border-0"
                      style={{
                        opacity: isChecked ? 1 : 0.2,
                        transform: isChecked ? 'translateX(0)' : 'translateX(-4px)',
                        transition: 'all 0.25s ease-out',
                      }}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isChecked ? 'bg-[#E2C06E] shadow-[0_0_6px_rgba(226,192,110,0.35)]' : 'bg-white/10'}`}>
                        {isChecked && <Check className="w-2 h-2 text-[#0B0B0D]" strokeWidth={3.5} />}
                      </div>
                      <span className="text-[11px] text-white/75 font-medium leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {service.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Zero cost badge */}
            <div className={`px-5 pb-3 transition-all duration-500 ${allChecked ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <div className="flex items-center gap-2 bg-[#E2C06E]/10 border border-[#E2C06E]/20 rounded-xl px-4 py-2.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E2C06E] flex-shrink-0" />
                <span className="text-[11px] text-[#E2C06E] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  All 12 services included — Zero extra charge
                </span>
              </div>
            </div>

            {/* Trust row + CTA */}
            <div className="px-5 pb-5 pt-1">
              <div className="flex items-center justify-center gap-5 mb-3">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] text-white/35 font-medium">Best Price</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] text-white/35 font-medium">30 Min Response</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] text-white/35 font-medium">Dedicated Expert</span>
                </div>
              </div>
              <Button onClick={() => setCurrentView('assigning')}
                className="w-full h-12 bg-[#E2C06E] hover:bg-[#EDD07E] text-[#0B0B0D] font-bold text-[13px] uppercase tracking-[0.06em] rounded-xl shadow-[0_4px_20px_rgba(226,192,110,0.3)] hover:shadow-[0_4px_28px_rgba(226,192,110,0.5)] transition-all active:scale-[0.98]"
                data-testid="start-consultation-btn"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Continue to Book <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-[9px] text-white/25 text-center mt-2">No spam. No pressure. Just expert guidance.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══ FLOW STEPS (assigning → rm-selection → phone-verify) ═══
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none max-h-[90vh]">
        <DialogTitle className="sr-only">Book Your Venue</DialogTitle>
        <div className="bg-[#0B0B0D] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Venue Hero */}
          <div className="relative h-32 overflow-hidden flex-shrink-0">
            <img
              src={venue?.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'}
              alt={venue?.name || 'Venue'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/70 to-transparent" />
            <button type="button" onClick={handleBack} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all z-10" data-testid="back-btn-flow">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-5 right-5">
              <p className="text-[10px] text-[#E2C06E] font-bold uppercase tracking-[0.15em] mb-0.5">You're booking</p>
              <h3 className="text-[16px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue?.name || 'Your Dream Venue'}</h3>
            </div>
          </div>

          {/* Step indicator — compact pill-style */}
          <div className="px-5 pt-3 pb-1.5 flex-shrink-0">
            <div className="flex items-center gap-1">
              {['Assigning', 'Choose RM', 'Verify'].map((label, i) => {
                const currentIndex = currentView === 'assigning' ? 0 : currentView === 'rm-selection' ? 1 : 2;
                const isActive = i === currentIndex;
                const isDone = i < currentIndex;
                return (
                  <React.Fragment key={label}>
                    {i > 0 && <div className={`flex-1 h-[1.5px] ${isDone ? 'bg-[#E2C06E]' : 'bg-white/8'} transition-colors`} />}
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-all",
                        isDone ? 'bg-[#E2C06E] text-[#0B0B0D]' :
                        isActive ? 'bg-[#E2C06E]/20 text-[#E2C06E] ring-1 ring-[#E2C06E]/40' :
                        'bg-white/5 text-white/25'
                      )}>
                        {isDone ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : i + 1}
                      </div>
                      <span className={cn("text-[9px] font-medium", isActive ? 'text-[#E2C06E]' : isDone ? 'text-white/45' : 'text-white/15')}>
                        {label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">

            {/* ─── VIEW: ASSIGNING RM ─── */}
            {currentView === 'assigning' && (
              <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="assigning-view">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#E2C06E]/10 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-[#E2C06E]" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-[#E2C06E]/30 border-t-[#E2C06E] animate-spin" style={{ animationDuration: '1.5s' }} />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Assigning Your <span className="text-[#E2C06E]">Personal RM</span>
                </h3>
                <p className="text-[12px] text-white/40 leading-relaxed max-w-[260px]">
                  Finding the best relationship manager for your event...
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] text-white/35 font-medium">Best Price</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] text-white/35 font-medium">30 Min Response</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] text-white/35 font-medium">Dedicated Expert</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── VIEW: RM SELECTION ─── */}
            {currentView === 'rm-selection' && (
              <div className="py-3 space-y-3" data-testid="rm-selection-view">
                <div className="flex items-start gap-3 p-3 bg-white/[0.06] border border-white/[0.08] rounded-xl mb-2">
                  <ShieldCheck className="w-5 h-5 text-[#E2C06E] flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-white/60 leading-relaxed">
                    <span className="font-semibold text-white/90">Your RM handles everything</span> — shortlisting venues, negotiating rates, checking availability, and coordinating end-to-end.
                  </div>
                </div>

                {rmsLoading ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="w-8 h-8 border-2 border-[#E2C06E]/30 border-t-[#E2C06E] rounded-full animate-spin" />
                    <p className="text-sm text-white/40">Finding the best experts...</p>
                  </div>
                ) : rms.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-white/50">Our expert team will be assigned to you shortly.</p>
                    <button type="button" onClick={() => setCurrentView('phone-verify')}
                      className="mt-3 text-sm text-[#E2C06E] hover:underline" data-testid="skip-rm-btn">
                      Continue without selecting
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {rms.map((rm, index) => {
                        const isSelected = selectedRmId === rm.user_id;
                        const initials = rm.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        const avatarColor = RM_AVATAR_COLORS[index % RM_AVATAR_COLORS.length];
                        return (
                          <div key={rm.user_id}
                            className={cn(
                              "rounded-xl border transition-all duration-200 overflow-hidden",
                              isSelected ? "border-[#E2C06E] bg-[#E2C06E]/[0.08] shadow-[0_0_0_1px_rgba(226,192,110,0.2)]" : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
                            )}
                            data-testid={`rm-card-${rm.user_id}`}>
                            <button type="button"
                              onClick={() => setSelectedRmId(isSelected ? null : rm.user_id)}
                              className="w-full flex items-start gap-2.5 p-3 text-left">
                              <div className="relative flex-shrink-0">
                                {rm.picture ? (
                                  <img src={rm.picture} alt={rm.name} className={cn("w-12 h-12 rounded-xl object-cover", isSelected ? "border-2 border-[#E2C06E]/50 shadow-[0_0_8px_rgba(226,192,110,0.2)]" : "border border-white/15")} />
                                ) : (
                                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm", avatarColor)}>
                                    {initials}
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#E2C06E] rounded-full flex items-center justify-center shadow-sm">
                                    <Check className="w-2.5 h-2.5 text-[#0B0B0D]" strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-[14px] text-white">{rm.name}</span>
                                  <span className="flex items-center gap-0.5 text-[10px] bg-[#E2C06E]/15 text-[#E2C06E] px-1.5 py-0.5 rounded-full">
                                    <Star className="w-2.5 h-2.5 fill-[#E2C06E]" />
                                    {rm.rating?.toFixed(1) || '4.8'}
                                  </span>
                                  {topPerformerIds[rm.user_id] && (
                                    <span className="text-[9px] bg-[#E2C06E] text-[#0B0B0D] px-1.5 py-0.5 rounded-full font-semibold">
                                      #{topPerformerIds[rm.user_id]} This Month
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 text-[10px] text-white/55 mt-1">
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {rm.response_time || '< 30 min'}
                                  </span>
                                  {rm.completed_events > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Award className="w-2.5 h-2.5 text-[#E2C06E]" /> {rm.completed_events}+ events
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-white/50 line-clamp-1 leading-snug mt-1">{rm.bio}</p>
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all",
                                isSelected ? "border-[#E2C06E] bg-[#E2C06E]" : "border-white/25"
                              )}>
                                {isSelected && <Check className="w-3 h-3 text-[#0B0B0D]" strokeWidth={3} />}
                              </div>
                            </button>

                            <button type="button"
                              onClick={() => setExpandedRmId(rm.user_id)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-white/[0.08] text-[11px] font-medium text-[#E2C06E]/70 hover:text-[#E2C06E] hover:bg-white/[0.03] transition-colors"
                              data-testid={`rm-view-profile-${rm.user_id}`}>
                              View Profile <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button type="button"
                      onClick={() => { setSelectedRmId(null); setCurrentView('phone-verify'); }}
                      className="w-full flex items-center justify-center gap-2 py-3 mt-1 border border-[#E2C06E]/20 rounded-xl text-[12px] font-semibold text-[#E2C06E]/80 hover:text-[#E2C06E] hover:border-[#E2C06E]/40 hover:bg-[#E2C06E]/[0.05] transition-all"
                      data-testid="assign-automatically-btn">
                      <Zap className="w-3.5 h-3.5" /> Auto-assign best available RM
                    </button>
                  </>
                )}

                {/* RM Profile Bottom Sheet */}
                {(() => {
                  const profileRm = rms.find(r => r.user_id === expandedRmId);
                  if (!profileRm) return null;
                  const isSelected = selectedRmId === profileRm.user_id;
                  const initials = profileRm.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const rmIndex = rms.findIndex(r => r.user_id === profileRm.user_id);
                  const avatarColor = RM_AVATAR_COLORS[rmIndex % RM_AVATAR_COLORS.length];
                  return (
                    <div className="fixed inset-0 z-[9999]" onClick={() => setExpandedRmId(null)}>
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center pt-3 pb-1">
                          <div className="w-10 h-1 bg-slate-300 rounded-full" />
                        </div>
                        <div className="overflow-y-auto max-h-[calc(80vh-16px)]">
                          <div className="bg-gradient-to-r from-[#111111] to-[#1a1a2e] p-5">
                            <div className="flex items-center gap-4">
                              {profileRm.picture ? (
                                <img src={profileRm.picture} alt={profileRm.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
                              ) : (
                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl", avatarColor)}>
                                  {initials}
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-white">{profileRm.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="flex items-center gap-1 text-xs bg-white/15 text-white px-2 py-0.5 rounded-full">
                                    <Star className="w-3 h-3 text-[#D4B36A] fill-[#D4B36A]" /> {profileRm.rating?.toFixed(1) || '4.8'}
                                  </span>
                                  {topPerformerIds[profileRm.user_id] && (
                                    <span className="text-[10px] bg-[#D4B36A] text-[#0B0B0D] px-2 py-0.5 rounded-full font-semibold">
                                      #{topPerformerIds[profileRm.user_id]} This Month
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button type="button" onClick={() => setExpandedRmId(null)}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                                <ChevronDown className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
                            {[
                              { val: profileRm.rating?.toFixed(1) || '4.8', label: 'Rating' },
                              { val: `${profileRm.completed_events || '50'}+`, label: 'Events' },
                              { val: profileRm.response_time || '<30m', label: 'Response' },
                            ].map((s, i) => (
                              <div key={s.label} className={cn("text-center py-3", i < 2 && "border-r border-slate-100")}>
                                <div className="text-lg font-bold text-[#111111]">{s.val}</div>
                                <div className="text-[10px] text-[#64748B] uppercase tracking-wide">{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="p-5 space-y-4">
                            <div>
                              <h4 className="text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">About</h4>
                              <p className="text-sm text-[#64748B] leading-relaxed">{profileRm.bio}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">How they help you</h4>
                              <div className="space-y-2">
                                {[
                                  { icon: <MapPin className="w-3.5 h-3.5 text-[#D4B36A]" />, text: 'Shortlists the best venues matching your needs' },
                                  { icon: <Shield className="w-3.5 h-3.5 text-[#D4B36A]" />, text: 'Negotiates rates and locks the best deal for you' },
                                  { icon: <Clock className="w-3.5 h-3.5 text-[#D4B36A]" />, text: 'Handles all coordination from visit to booking' },
                                ].map((item, i) => (
                                  <div key={i} className="flex items-start gap-2.5">
                                    <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                                    <p className="text-xs text-[#64748B] leading-relaxed">{item.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {profileRm.specialties?.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">Specialties</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {profileRm.specialties.map(s => (
                                    <span key={s} className="text-xs px-3 py-1 bg-slate-100 text-[#64748B] rounded-full">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button type="button"
                              onClick={() => { setSelectedRmId(profileRm.user_id); setExpandedRmId(null); }}
                              className={cn(
                                "w-full py-3.5 rounded-xl text-sm font-bold transition-all",
                                isSelected ? "bg-[#D4B36A] text-[#0B0B0D]" : "bg-[#111111] text-white hover:bg-[#1a1a2e]"
                              )}
                              data-testid={`rm-select-profile-${profileRm.user_id}`}>
                              {isSelected ? 'Selected' : 'Select This RM'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Continue button */}
                {rms.length > 0 && (
                  <Button onClick={() => setCurrentView('phone-verify')}
                    className="w-full h-12 bg-[#E2C06E] hover:bg-[#EDD07E] text-[#0B0B0D] font-bold text-[13px] uppercase tracking-[0.06em] rounded-xl shadow-[0_4px_20px_rgba(226,192,110,0.3)] transition-all active:scale-[0.98] mt-2"
                    data-testid="rm-continue-btn">
                    {selectedRmId ? 'Confirm & Continue' : 'Continue'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}

            {/* ─── VIEW: PHONE VERIFY ─── */}
            {currentView === 'phone-verify' && (
              <div className="py-3 space-y-4" data-testid="phone-verify-view">
                <div className="text-center mb-1">
                  <div className="w-12 h-12 rounded-full bg-[#E2C06E]/10 flex items-center justify-center mx-auto mb-2.5">
                    <Phone className="w-5 h-5 text-[#E2C06E]" />
                  </div>
                  <h3 className="text-[16px] font-bold text-white mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Verify Your Number
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Your RM will call you on this number
                  </p>
                </div>

                {/* User info summary */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/35 uppercase tracking-wider">Name</span>
                    <span className="text-[13px] text-white font-medium">{user?.name || 'Guest'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/35 uppercase tracking-wider">Email</span>
                    <span className="text-[13px] text-white font-medium truncate ml-4">{user?.email || '-'}</span>
                  </div>
                  {venue && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/35 uppercase tracking-wider">Venue</span>
                      <span className="text-[13px] text-[#E2C06E] font-medium truncate ml-4">{venue.name}</span>
                    </div>
                  )}
                </div>

                {/* Phone input */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Mobile Number
                  </label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                    placeholder="+91 98765 43210"
                    className="h-14 bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:ring-2 focus:ring-[#E2C06E]/30 focus:border-[#E2C06E]/40 rounded-xl px-5 text-[15px]"
                    data-testid="phone-input"
                  />
                  {phoneError && (
                    <p className="text-xs text-red-400 mt-1">{phoneError}</p>
                  )}
                </div>

                {/* Submit */}
                <Button onClick={handlePhoneSubmit} disabled={loading}
                  className="w-full h-12 bg-[#E2C06E] hover:bg-[#EDD07E] text-[#0B0B0D] font-bold text-[13px] uppercase tracking-[0.06em] rounded-xl shadow-[0_4px_20px_rgba(226,192,110,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                  data-testid="submit-enquiry-btn">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Confirm & Connect Me
                    </>
                  )}
                </Button>

                <p className="text-[9px] text-white/20 text-center">
                  No spam. No pressure. Just expert guidance.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnquiryForm;
