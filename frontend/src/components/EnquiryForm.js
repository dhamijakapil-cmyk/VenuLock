import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  Sparkles,
  Phone,
  ArrowRight,
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
} from 'lucide-react';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RM_AVATAR_COLORS = ['bg-[#D4B36A]', 'bg-[#111111]', 'bg-[#065F46]'];

const EnquiryForm = ({ venue, isOpen, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Flow: 'assigning' → 'rm-selection' → 'phone-verify' → success
  const [currentView, setCurrentView] = useState('assigning');

  // RM state
  const [rms, setRms] = useState([]);
  const [rmsLoading, setRmsLoading] = useState(false);
  const [selectedRmId, setSelectedRmId] = useState(null);
  const [expandedRmId, setExpandedRmId] = useState(null);
  const [topPerformerIds, setTopPerformerIds] = useState({});

  // Reset everything when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('assigning');
      setSelectedRmId(null);
      setExpandedRmId(null);
      setPhoneNumber(user?.phone || '');
      setPhoneError('');
      setSuccess(false);
      setSubmittedData(null);
      setLoading(false);
    }
  }, [isOpen, user?.phone]);

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
    const msg = `Hi VenuLoQ! I'm interested in ${venue?.name || 'a venue'}. My reference: ${submittedData?.booking_id || 'N/A'}`;
    window.open(`https://wa.me/919999999999?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ═══ SUCCESS SCREEN ═══
  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none max-h-[85vh]">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-y-auto max-h-[85vh]">
            <div className="bg-[#0B0B0D] p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #D4B36A 0%, transparent 50%)' }} />
              <div className="relative">
                <div className="w-14 h-14 bg-[#D4B36A] rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-[#0B0B0D]" />
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-1">You're All Set!</h3>
                <p className="text-white/50 text-sm">Your dedicated venue expert is being assigned</p>
                {submittedData?.booking_id && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Ref</span>
                    <span className="text-sm font-mono font-bold text-[#D4B36A]" data-testid="booking-ref-id">{submittedData.booking_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-[#0B0B0D] rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#D4B36A] rounded-full flex items-center justify-center text-[#0B0B0D] font-bold text-lg flex-shrink-0">
                    {submittedData?.rm_name?.charAt(0) || 'V'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                      {selectedRmId ? 'Your Selected Expert' : 'Your Venue Expert'}
                    </p>
                    <p className="font-semibold text-base text-white">{submittedData?.rm_name || 'Expert Team'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-[#D4B36A]">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">4.9</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-[#F0E6D2]/30 border border-[#D4B36A]/15 rounded-xl">
                <div className="w-10 h-10 bg-[#D4B36A]/15 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#D4B36A]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#111111]">Callback within 30 minutes</p>
                  <p className="text-xs text-[#94A3B8]">During business hours (9 AM - 9 PM)</p>
                </div>
              </div>

              {venue && (
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={typeof venue.images?.[0] === 'string' ? venue.images[0] : venue.images?.[0]?.url || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=200'}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#111111]">{venue.name}</p>
                    <p className="text-xs text-[#94A3B8]">{venue.area ? `${venue.area}, ${venue.city}` : venue.city}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 pt-1 pb-2">
                <Button onClick={openWhatsApp} variant="outline"
                  className="w-full h-12 rounded-xl border-[#0B0B0D] text-[#0B0B0D] hover:bg-[#0B0B0D] hover:text-white font-semibold transition-all"
                  data-testid="whatsapp-btn">
                  <MessageCircle className="w-5 h-5 mr-2" /> Chat on WhatsApp
                </Button>
                <Button onClick={() => { handleClose(); if (user) navigate('/my-enquiries'); }}
                  className="w-full h-12 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold rounded-xl transition-all"
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
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none max-h-[90vh]">
        <div className="bg-[#0B0B0D] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Venue Hero */}
          <div className="relative h-32 overflow-hidden flex-shrink-0">
            <img
              src={venue?.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'}
              alt={venue?.name || 'Venue'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/70 to-transparent" />
            <div className="absolute bottom-3 left-5 right-5">
              <p className="text-[10px] text-[#E2C06E] font-bold uppercase tracking-[0.15em] mb-0.5">You're booking</p>
              <h3 className="text-[16px] font-bold text-white leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue?.name || 'Your Dream Venue'}</h3>
            </div>
          </div>

          {/* Step indicator */}
          <div className="px-5 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {['Assigning', 'Choose RM', 'Verify'].map((label, i) => {
                const stepIndex = i;
                const viewMap = { 0: 'assigning', 1: 'rm-selection', 2: 'phone-verify' };
                const currentIndex = currentView === 'assigning' ? 0 : currentView === 'rm-selection' ? 1 : 2;
                const isActive = stepIndex === currentIndex;
                const isDone = stepIndex < currentIndex;
                return (
                  <React.Fragment key={label}>
                    {i > 0 && <div className={`flex-1 h-[2px] ${isDone ? 'bg-[#E2C06E]' : 'bg-white/10'} transition-colors`} />}
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all",
                        isDone ? 'bg-[#E2C06E] text-[#0B0B0D]' :
                        isActive ? 'bg-[#E2C06E]/20 text-[#E2C06E] ring-1 ring-[#E2C06E]/40' :
                        'bg-white/5 text-white/30'
                      )}>
                        {isDone ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                      </div>
                      <span className={cn("text-[10px] font-medium", isActive ? 'text-[#E2C06E]' : isDone ? 'text-white/50' : 'text-white/20')}>
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
              <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="assigning-view">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#E2C06E]/10 flex items-center justify-center">
                    <Crown className="w-9 h-9 text-[#E2C06E]" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-[#E2C06E]/30 border-t-[#E2C06E] animate-spin" style={{ animationDuration: '1.5s' }} />
                </div>
                <h3 className="text-[18px] font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Assigning Your <span className="text-[#E2C06E]">Personal RM</span>
                </h3>
                <p className="text-[13px] text-white/40 leading-relaxed max-w-[280px]">
                  Finding the best relationship manager for your event...
                </p>
                <div className="flex items-center justify-center gap-5 mt-6">
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
                <div className="flex items-start gap-3 p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl mb-2">
                  <ShieldCheck className="w-5 h-5 text-[#E2C06E] flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-white/50 leading-relaxed">
                    <span className="font-semibold text-white/80">Your RM handles everything</span> — shortlisting venues, negotiating rates, checking availability, and coordinating end-to-end.
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
                              isSelected ? "border-[#E2C06E] bg-[#E2C06E]/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                            )}
                            data-testid={`rm-card-${rm.user_id}`}>
                            <button type="button"
                              onClick={() => setSelectedRmId(isSelected ? null : rm.user_id)}
                              className="w-full flex items-start gap-3 p-3 text-left">
                              <div className="relative flex-shrink-0">
                                {rm.picture ? (
                                  <img src={rm.picture} alt={rm.name} className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                                ) : (
                                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm", avatarColor)}>
                                    {initials}
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E2C06E] rounded-full flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-[#0B0B0D]" strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-[13px] text-white">{rm.name}</span>
                                  <span className="flex items-center gap-0.5 text-[10px] bg-[#E2C06E]/10 text-[#E2C06E] px-1.5 py-0.5 rounded-full">
                                    <Star className="w-2.5 h-2.5 fill-[#E2C06E]" />
                                    {rm.rating?.toFixed(1) || '4.8'}
                                  </span>
                                  {topPerformerIds[rm.user_id] && (
                                    <span className="text-[9px] bg-[#E2C06E] text-[#0B0B0D] px-1.5 py-0.5 rounded-full font-semibold">
                                      #{topPerformerIds[rm.user_id]} This Month
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 text-[10px] text-white/35 mt-1">
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {rm.response_time || '< 30 min'}
                                  </span>
                                  {rm.completed_events > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Award className="w-2.5 h-2.5 text-[#E2C06E]" /> {rm.completed_events}+ events
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-white/30 line-clamp-1 leading-snug mt-1">{rm.bio}</p>
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all",
                                isSelected ? "border-[#E2C06E] bg-[#E2C06E]" : "border-white/20"
                              )}>
                                {isSelected && <Check className="w-3 h-3 text-[#0B0B0D]" strokeWidth={3} />}
                              </div>
                            </button>

                            <button type="button"
                              onClick={() => setExpandedRmId(rm.user_id)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-white/[0.06] text-[11px] font-medium text-[#E2C06E]/60 hover:text-[#E2C06E] hover:bg-white/[0.02] transition-colors"
                              data-testid={`rm-view-profile-${rm.user_id}`}>
                              View Profile <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button type="button"
                      onClick={() => { setSelectedRmId(null); setCurrentView('phone-verify'); }}
                      className="w-full text-[11px] text-white/25 hover:text-[#E2C06E] text-center py-1.5 transition-colors"
                      data-testid="assign-automatically-btn">
                      Or assign automatically based on availability
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
              <div className="py-4 space-y-5" data-testid="phone-verify-view">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-full bg-[#E2C06E]/10 flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-6 h-6 text-[#E2C06E]" />
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Verify Your Number
                  </h3>
                  <p className="text-[12px] text-white/40 leading-relaxed">
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
