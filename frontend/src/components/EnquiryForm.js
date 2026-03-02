import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  CheckCircle, 
  Sparkles, 
  User, 
  Phone, 
  Mail, 
  PartyPopper, 
  Users, 
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Clock,
  MessageCircle,
  Shield,
  ShieldCheck,
  Star,
  Zap,
  MapPin,
  Award,
  Languages,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { EVENT_TYPES, cn } from '@/lib/utils';
import { toast } from 'sonner';

// Guest count range options
const GUEST_COUNT_RANGES = [
  { value: '0-50', label: 'Up to 50 guests' },
  { value: '50-100', label: '50 – 100 guests' },
  { value: '100-200', label: '100 – 200 guests' },
  { value: '200-300', label: '200 – 300 guests' },
  { value: '300-500', label: '300 – 500 guests' },
  { value: '500-1000', label: '500 – 1000 guests' },
  { value: '1000+', label: '1000+ guests' },
];

// Investment range options (per user requirements)
const INVESTMENT_RANGES = [
  { value: 'under_5l', label: 'Under ₹5 Lakhs' },
  { value: '5l_10l', label: '₹5 – 10 Lakhs' },
  { value: '10l_25l', label: '₹10 – 25 Lakhs' },
  { value: '25l_plus', label: '₹25 Lakhs+' },
  { value: 'flexible', label: 'Flexible / Open to Suggestions' },
];

// Map investment ranges to budget values for backend
const INVESTMENT_TO_BUDGET = {
  'under_5l': 400000,
  '5l_10l': 700000,
  '10l_25l': 1500000,
  '25l_plus': 3000000,
  'flexible': null,
};

const STEPS = [
  { id: 1, title: 'Your Details', description: 'We assign a dedicated expert within 30 minutes.' },
  { id: 2, title: 'Verify Phone', description: 'Quick OTP verification for secure booking.' },
  { id: 3, title: 'Choose Your RM', description: 'Select your personal Relationship Manager.' },
  { id: 4, title: 'Event Details', description: 'Help us understand your celebration.' },
  { id: 5, title: 'Investment & Preferences', description: 'Final details for your perfect match.' },
];

// RM avatar colors for fallback initials
const RM_AVATAR_COLORS = ['bg-[#C9A227]', 'bg-[#0B1F3B]', 'bg-[#065F46]'];

const EnquiryForm = ({ venue, isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [date, setDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [plannerRequired, setPlannerRequired] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  // RM selection state
  const [rms, setRms] = useState([]);
  const [rmsLoading, setRmsLoading] = useState(false);
  const [selectedRmId, setSelectedRmId] = useState(null);
  const [debugOtp, setDebugOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpCountdownRef = React.useRef(null);
  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: '',
    event_type: '',
    guest_count_range: '',
    investment_range: '',
    preferences: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (!formData.customer_name.trim()) {
          errors.customer_name = 'Please enter your name';
        }
        if (!formData.customer_phone.trim()) {
          errors.customer_phone = 'Please enter your phone number';
        } else if (!/^[\d\s+\-()]{10,}$/.test(formData.customer_phone.replace(/\s/g, ''))) {
          errors.customer_phone = 'Please enter a valid phone number';
        }
        if (!formData.customer_email.trim()) {
          errors.customer_email = 'Please enter your email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
          errors.customer_email = 'Please enter a valid email address';
        }
        break;
      case 2:
        if (!otpVerified) {
          errors.otp = 'Please verify your phone number';
        }
        break;
      case 3:
        // RM selection is optional — user can skip
        break;
      case 4:
        if (!formData.event_type) {
          errors.event_type = 'Please select an event type';
        }
        break;
      case 5:
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return false;
    }
    
    return true;
  };

  const startCountdown = (seconds = 60) => {
    setOtpCountdown(seconds);
    if (otpCountdownRef.current) clearInterval(otpCountdownRef.current);
    otpCountdownRef.current = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) { clearInterval(otpCountdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const phone = formData.customer_phone.replace(/[\s\-()]/g, '');
    setOtpLoading(true);
    setOtpError('');
    setOtpValue('');
    try {
      const res = await api.post('/otp/send', { phone });
      setOtpSent(true);
      startCountdown(60);
      toast.success('OTP sent to your phone!');
      if (res.data?.debug_otp) {
        setDebugOtp(res.data.debug_otp);
      }
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Failed to send OTP');
      toast.error('Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const fetchRMs = async () => {
    setRmsLoading(true);
    try {
      const city = venue?.city || '';
      const res = await api.get(`/rms/available${city ? `?city=${encodeURIComponent(city)}` : ''}`);
      setRms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch RMs:', err);
      setRms([]);
    } finally {
      setRmsLoading(false);
    }
  };

  const verifyOtpWithValue = async (value) => {
    const phone = formData.customer_phone.replace(/[\s\-()]/g, '');
    setOtpLoading(true);
    setOtpError('');
    try {
      await api.post('/otp/verify', { phone, otp: value });
      setOtpVerified(true);
      if (otpCountdownRef.current) clearInterval(otpCountdownRef.current);
      setOtpCountdown(0);
      toast.success('Phone verified!');
      setCurrentStep(3);
      fetchRMs();
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      toast.error(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = () => verifyOtpWithValue(otpValue);

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1 && !otpVerified) {
        setCurrentStep(2);
        if (!otpSent) sendOtp();
      } else if (currentStep === 2) {
        if (otpVerified) setCurrentStep(3);
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, 5));
      }
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const startConsultation = () => {
    setShowIntro(false);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      let guestCount = null;
      if (formData.guest_count_range) {
        const parts = formData.guest_count_range.split('-');
        guestCount = parseInt(parts[0]) || 100;
      }
      
      const budget = INVESTMENT_TO_BUDGET[formData.investment_range] || null;

      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        customer_phone: formData.customer_phone.trim(),
        event_type: formData.event_type,
        event_date: date ? format(date, 'yyyy-MM-dd') : null,
        guest_count: guestCount,
        guest_count_range: formData.guest_count_range || null,
        investment_range: formData.investment_range || null,
        budget: budget,
        notes: formData.preferences.trim(),
        venue_ids: venue?.venue_id ? [venue.venue_id] : [],
        city: venue?.city || '',
        area: venue?.area || '',
        planner_required: plannerRequired,
        source: 'website',
        selected_rm_id: selectedRmId || null,
      };

      const response = await api.post('/booking-requests', payload);
      
      setSubmittedData(response.data);
      setSuccess(true);
      toast.success('Your booking request has been submitted!');
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const details = error.response.data.detail;
        if (Array.isArray(details)) {
          const fieldErrors = {};
          details.forEach((err) => {
            if (err.loc && err.loc.length > 1) {
              const fieldName = err.loc[err.loc.length - 1];
              fieldErrors[fieldName] = err.msg;
            }
          });
          setValidationErrors(fieldErrors);
          const firstErrorMsg = details[0]?.msg || 'Please check your input';
          toast.error(`Validation error: ${firstErrorMsg}`);
        } else {
          toast.error('Please check your input and try again');
        }
      } else if (error.response?.status === 403) {
        toast.error('Phone verification required. Please go back and verify.');
      } else {
        const errorMessage = error.response?.data?.detail || 'Unable to submit your request. Please try again.';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowIntro(true);
    setCurrentStep(1);
    setSuccess(false);
    setSubmittedData(null);
    setValidationErrors({});
    setOtpSent(false);
    setOtpValue('');
    setOtpVerified(false);
    setOtpError('');
    setDebugOtp('');
    setOtpCountdown(0);
    if (otpCountdownRef.current) clearInterval(otpCountdownRef.current);
    setRms([]);
    setSelectedRmId(null);
    setFormData({
      customer_name: user?.name || '',
      customer_email: user?.email || '',
      customer_phone: '',
      event_type: '',
      guest_count_range: '',
      investment_range: '',
      preferences: '',
    });
    setDate(null);
    setPlannerRequired(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const openWhatsApp = () => {
    const phone = '919876543210'; // Platform support number
    const message = encodeURIComponent(`Hi, I just submitted an enquiry for ${venue?.name || 'a venue'}. My name is ${formData.customer_name}.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Premium input styling
  const inputClassName = "h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 focus:shadow-[0_0_0_3px_rgba(201,162,39,0.1)] px-5 rounded-xl transition-all duration-200 text-[#0B1F3B] placeholder:text-[#94A3B8]";
  const inputErrorClassName = "ring-2 ring-red-300 focus:ring-red-400";
  const selectTriggerClassName = "h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 px-5 rounded-xl transition-all duration-200";

  // Success/Confirmation Screen
  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] p-8 text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-white mb-2">
                You're All Set!
              </h3>
              <p className="text-emerald-100 text-sm">
                {submittedData?.booking_id ? `Booking Ref: ${submittedData.booking_id}` : 'Your dedicated venue expert is being assigned'}
              </p>
            </div>

            {/* Confirmation Details */}
            <div className="p-6 space-y-5">
              {/* Booking Reference */}
              {submittedData?.booking_id && (
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-medium mb-1">Booking Reference</p>
                  <p className="text-xl font-bold font-mono text-[#0B1F3B] tracking-wider" data-testid="booking-ref-id">{submittedData.booking_id}</p>
                </div>
              )}

              {/* Assigned RM Card */}
              <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] rounded-2xl p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#C9A227] rounded-full flex items-center justify-center text-[#0B1F3B] font-bold text-xl">
                    {submittedData?.rm_name?.charAt(0) || 'V'}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-300 uppercase tracking-wider mb-1">
                      {selectedRmId ? 'Your Selected Expert' : 'Your Venue Expert'}
                    </p>
                    <p className="font-semibold text-lg">{submittedData?.rm_name || 'Expert Team'}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[#C9A227]">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">4.9</span>
                    </div>
                    <p className="text-xs text-slate-400">Top Rated</p>
                  </div>
                </div>
              </div>

              {/* Callback Time */}
              <div className="flex items-center gap-4 p-4 bg-[#F0E6D2]/30 rounded-xl">
                <div className="w-12 h-12 bg-[#C9A227]/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#C9A227]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0B1F3B]">Callback within 30 minutes</p>
                  <p className="text-sm text-[#64748B]">During business hours (9 AM - 9 PM)</p>
                </div>
              </div>

              {/* Venue Info */}
              {venue && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={venue.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=200'} 
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-[#0B1F3B]">{venue.name}</p>
                    <p className="text-sm text-[#64748B]">{venue.area}, {venue.city}</p>
                  </div>
                </div>
              )}

              {/* Planner Note */}
              {plannerRequired && (
                <div className="flex items-start gap-3 p-4 bg-[#F0E6D2]/50 border border-[#C9A227]/30 rounded-xl">
                  <Sparkles className="w-5 h-5 text-[#C9A227] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#0B1F3B]">
                    Event planning assistance noted. We'll connect you with curated planners after venue confirmation.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={openWhatsApp}
                  variant="outline"
                  className="w-full h-14 rounded-xl border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 font-semibold"
                  data-testid="whatsapp-btn"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Chat on WhatsApp
                </Button>
                
                <Button
                  onClick={() => {
                    handleClose();
                    if (user) navigate('/my-enquiries');
                  }}
                  className="w-full h-14 bg-gradient-to-b from-[#0B1F3B] to-[#153055] hover:from-[#153055] hover:to-[#1a3a6a] text-white font-semibold rounded-xl"
                  data-testid="view-enquiries-btn"
                >
                  {user ? 'Track Your Request' : 'Done'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Intro/Positioning Screen
  if (showIntro) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden">
            {/* Hero Image */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={venue?.images?.[0] || 'https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800'} 
                alt={venue?.name || 'Venue'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3B] via-[#0B1F3B]/60 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6">
                <p className="text-xs text-[#C9A227] font-semibold uppercase tracking-wider mb-1">You're exploring</p>
                <h3 className="font-serif text-xl font-bold text-white">{venue?.name || 'Your Dream Venue'}</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#C9A227] to-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#C9A227]/30">
                <Briefcase className="w-8 h-8 text-[#0B1F3B]" />
              </div>
              
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#0B1F3B] mb-4">
                Let's Plan This Together
              </h2>
              
              <p className="text-[#64748B] leading-relaxed mb-8">
                Our venue experts handle negotiations, availability, and paperwork on your behalf.
              </p>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-5 h-5 text-[#0B1F3B]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Best Price<br/>Guarantee</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Zap className="w-5 h-5 text-[#0B1F3B]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Response in<br/>30 minutes</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-[#0B1F3B]" />
                  </div>
                  <p className="text-xs text-[#64748B]">Dedicated<br/>Expert</p>
                </div>
              </div>

              <Button
                onClick={startConsultation}
                className="w-full h-14 bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold text-base rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.98]"
                data-testid="start-consultation-btn"
              >
                Start Consultation
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-xs text-[#94A3B8] mt-4">
                No spam. No pressure. Just expert guidance.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Multi-Step Form
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#C9A227]/20 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold">Concierge Intake</h2>
                <p className="text-sm text-slate-300">{venue?.name || 'Venue Enquiry'}</p>
              </div>
            </div>
            
            {/* Step Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Step {currentStep} of 5</span>
                <span className="text-[#C9A227] font-medium">{STEPS[currentStep - 1]?.title}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#C9A227] to-[#D4AF37] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {/* Step 1: Personal Details */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 1 ? "opacity-100" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] flex items-center gap-2 mb-6">
                <Clock className="w-4 h-4 text-[#C9A227]" />
                {STEPS[0].description}
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <Input
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={cn(inputClassName, validationErrors.customer_name && inputErrorClassName)}
                  data-testid="enquiry-name"
                />
                {validationErrors.customer_name && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.customer_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </label>
                <Input
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={cn(inputClassName, validationErrors.customer_phone && inputErrorClassName)}
                  data-testid="enquiry-phone"
                />
                {validationErrors.customer_phone && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.customer_phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <Input
                  name="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={cn(inputClassName, validationErrors.customer_email && inputErrorClassName)}
                  data-testid="enquiry-email"
                />
                {validationErrors.customer_email && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.customer_email}</p>
                )}
              </div>
            </div>

            {/* Step 2: OTP Verification */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 2 ? "opacity-100" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] flex items-center gap-2 mb-6">
                <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                {STEPS[1].description}
              </p>

              <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#C9A227]/15 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0B1F3B]">Verifying</p>
                    <p className="text-xs text-[#64748B]">{formData.customer_phone}</p>
                  </div>
                  {otpVerified && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                  )}
                </div>

                {!otpVerified && (
                  <>
                    {otpSent ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                            Enter 6-digit OTP
                          </label>
                          {otpCountdown > 0 ? (
                            <span className="text-xs text-[#64748B] tabular-nums">
                              Resend in <span className={cn("font-medium", otpCountdown <= 10 ? "text-red-500" : "text-[#C9A227]")}>{otpCountdown}s</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={sendOtp}
                              disabled={otpLoading}
                              className="text-xs text-[#C9A227] hover:underline font-medium"
                              data-testid="resend-otp-btn"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Input
                            value={otpValue}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setOtpValue(val);
                              if (otpError) setOtpError('');
                              // Auto-submit on 6 digits
                              if (val.length === 6) {
                                setTimeout(() => verifyOtpWithValue(val), 100);
                              }
                            }}
                            placeholder="······"
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className={cn(inputClassName, "flex-1 tracking-[0.4em] text-center text-2xl font-mono h-14")}
                            data-testid="otp-input"
                          />
                          <Button
                            onClick={() => verifyOtpWithValue(otpValue)}
                            disabled={otpLoading || otpValue.length < 6}
                            className="bg-[#C9A227] hover:bg-[#B08A1E] text-white rounded-xl h-14 px-6"
                            data-testid="otp-verify-btn"
                          >
                            {otpLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'Verify'}
                          </Button>
                        </div>

                        {otpError && (
                          <p className="text-xs text-red-500 flex items-center gap-1" data-testid="otp-error">
                            {otpError}
                          </p>
                        )}

                        {debugOtp && !otpError && (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <div>
                              <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium mb-0.5">Your OTP (dev mode)</p>
                              <span className="font-mono text-xl font-bold tracking-[0.3em] text-amber-800">{debugOtp}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setOtpValue(debugOtp); setTimeout(() => verifyOtpWithValue(debugOtp), 100); }}
                              className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 font-medium"
                              data-testid="autofill-otp-btn"
                            >
                              Auto-fill & Verify
                            </button>
                          </div>
                        )}

                        {otpCountdown > 0 && otpCountdown <= 30 && (
                          <p className="text-xs text-[#64748B] text-center">
                            Didn't receive? Check spam or{' '}
                            <button
                              type="button"
                              onClick={otpCountdown === 0 ? sendOtp : undefined}
                              className="text-[#C9A227]"
                            >
                              wait {otpCountdown}s to resend
                            </button>
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={sendOtp}
                        disabled={otpLoading}
                        className="w-full bg-[#0B1F3B] hover:bg-[#153055] text-white rounded-xl h-12"
                        data-testid="send-otp-btn"
                      >
                        {otpLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : 'Send OTP'}
                      </Button>
                    )}
                  </>
                )}

                {otpVerified && (
                  <p className="text-sm text-emerald-600 font-medium">Phone number verified successfully.</p>
                )}
              </div>
            </div>

            {/* Step 3: Choose Your RM */}
            <div className={cn(
              "space-y-4 transition-all duration-300",
              currentStep === 3 ? "opacity-100" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] mb-4">{STEPS[2].description}</p>

              {rmsLoading ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-[#C9A227]/30 border-t-[#C9A227] rounded-full animate-spin" />
                  <p className="text-sm text-[#64748B]">Finding the best experts for you...</p>
                </div>
              ) : rms.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-[#64748B]">Our expert team will be assigned to you shortly.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="mt-4 text-sm text-[#C9A227] hover:underline"
                    data-testid="skip-rm-btn"
                  >
                    Continue without selecting →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#64748B] mb-2">Based on your location and event type, we've selected our best-matched RMs for you.</p>
                  {rms.map((rm, index) => {
                    const isSelected = selectedRmId === rm.user_id;
                    const initials = rm.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const avatarColor = RM_AVATAR_COLORS[index % RM_AVATAR_COLORS.length];
                    return (
                      <button
                        key={rm.user_id}
                        type="button"
                        onClick={() => setSelectedRmId(isSelected ? null : rm.user_id)}
                        className={cn(
                          "w-full text-left rounded-2xl border-2 p-4 transition-all duration-200",
                          isSelected
                            ? "border-[#C9A227] bg-[#C9A227]/5 shadow-lg"
                            : "border-slate-200 bg-white hover:border-[#C9A227]/40 hover:shadow-md"
                        )}
                        data-testid={`rm-card-${rm.user_id}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar - Larger and more prominent */}
                          <div className="relative flex-shrink-0">
                            {rm.picture ? (
                              <img 
                                src={rm.picture} 
                                alt={rm.name} 
                                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md" 
                              />
                            ) : (
                              <div className={cn(
                                "w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                                avatarColor
                              )}>
                                {initials}
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A227] rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[#0B1F3B]">{rm.name}</span>
                              <span className="flex items-center gap-0.5 text-xs bg-[#C9A227]/10 text-[#8B6914] px-2 py-0.5 rounded-full">
                                <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                                {rm.rating?.toFixed(1) || '4.8'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-[#64748B] mb-2">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {rm.response_time || '< 30 min'}
                              </span>
                              {rm.completed_events > 0 && (
                                <span className="flex items-center gap-1">
                                  <Award className="w-3 h-3 text-[#C9A227]" />
                                  {rm.completed_events}+ events
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">{rm.bio}</p>
                            
                            {rm.specialties?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {rm.specialties.slice(0, 3).map(s => (
                                  <span key={s} className="text-[10px] px-2 py-0.5 bg-slate-100 text-[#64748B] rounded-full font-medium">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => { setSelectedRmId(null); setCurrentStep(4); }}
                    className="w-full text-xs text-[#64748B] hover:text-[#C9A227] text-center py-2 transition-colors"
                    data-testid="assign-automatically-btn"
                  >
                    Assign automatically based on availability
                  </button>
                </div>
              )}
            </div>

            {/* Step 4: Event Details */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 4 ? "opacity-100" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] mb-6">{STEPS[3].description}</p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <PartyPopper className="w-3.5 h-3.5" /> Event Type
                </label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, event_type: value }));
                    if (validationErrors.event_type) {
                      setValidationErrors((prev) => ({ ...prev, event_type: null }));
                    }
                  }}
                >
                  <SelectTrigger 
                    className={cn(selectTriggerClassName, validationErrors.event_type && inputErrorClassName)} 
                    data-testid="enquiry-event-type"
                  >
                    <SelectValue placeholder="What are you celebrating?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="rounded-lg">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.event_type && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.event_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Guest Count
                </label>
                <Select
                  value={formData.guest_count_range}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, guest_count_range: value }))}
                >
                  <SelectTrigger className={selectTriggerClassName} data-testid="enquiry-guests">
                    <SelectValue placeholder="How many guests are you expecting?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    {GUEST_COUNT_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value} className="rounded-lg">
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5" /> Event Date
                </label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        inputClassName,
                        "w-full flex items-center gap-3 text-left",
                        !date && "text-[#94A3B8]"
                      )}
                      data-testid="enquiry-date"
                    >
                      <CalendarIcon className="w-4 h-4 text-[#94A3B8]" />
                      {date ? format(date, 'EEEE, MMMM d, yyyy') : 'When is your event?'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white rounded-xl border-0 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        setDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Location info if available */}
              {venue?.city && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-[#C9A227]" />
                  <span className="text-sm text-[#64748B]">
                    {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
                  </span>
                </div>
              )}

              {/* Event Planning Checkbox */}
              <div className="bg-gradient-to-r from-[#F0E6D2]/50 to-[#F0E6D2]/30 border border-[#C9A227]/20 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="planner_required"
                    checked={plannerRequired}
                    onCheckedChange={setPlannerRequired}
                    className="mt-0.5 w-5 h-5 data-[state=checked]:bg-[#C9A227] data-[state=checked]:border-[#C9A227] rounded-md"
                    data-testid="planner-required-checkbox"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="planner_required"
                      className="flex items-center gap-2 text-sm font-semibold text-[#0B1F3B] cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#C9A227]" />
                      I require full event planning assistance
                    </label>
                    <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                      We'll connect you with curated planners after venue confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Investment & Preferences */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 5 ? "opacity-100" : "hidden"
            )}>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-1">Investment & Preferences</h3>
                <p className="text-sm text-[#64748B]">{STEPS[4].description}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <IndianRupee className="w-3.5 h-3.5" /> Estimated Investment Range
                </label>
                <Select
                  value={formData.investment_range}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, investment_range: value }))}
                >
                  <SelectTrigger className={selectTriggerClassName} data-testid="enquiry-investment">
                    <SelectValue placeholder="Select your investment range" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    {INVESTMENT_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value} className="rounded-lg">
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Prefer call link */}
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="text-xs text-[#C9A227] hover:text-[#B8922A] underline underline-offset-2 mt-2 inline-block"
                  data-testid="prefer-call-link"
                >
                  Prefer to discuss this on a call?
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Tell us about any specific requirements, themes, or preferences
                </label>
                <Textarea
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleChange}
                  placeholder="Any special requirements, themes, dietary needs, or preferences you'd like us to know..."
                  rows={4}
                  className="bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 px-5 py-4 rounded-xl transition-all duration-200 text-[#0B1F3B] placeholder:text-[#94A3B8] resize-none"
                  data-testid="enquiry-preferences"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && currentStep !== 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="h-14 px-6 rounded-xl border-slate-200 text-[#64748B] hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              {currentStep === 2 ? (
                /* OTP step: no Continue button — handled by verify */
                !otpVerified ? null : (
                  <Button
                    type="button"
                    onClick={() => { setCurrentStep(3); fetchRMs(); }}
                    className="flex-1 h-14 bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.98]"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )
              ) : currentStep === 3 ? (
                /* RM selection step — Continue moves to step 4 */
                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 h-14 bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.98]"
                  data-testid="rm-continue-btn"
                >
                  {selectedRmId ? 'Confirm & Continue' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : currentStep < 5 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 h-14 bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.98]"
                  data-testid="step-continue-btn"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-14 bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.98] disabled:opacity-50"
                  data-testid="submit-enquiry-btn"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#0B1F3B]/30 border-t-[#0B1F3B] rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Submit Booking Request
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Trust Message */}
            <p className="text-center text-xs text-[#94A3B8] mt-6">
              We negotiate on your behalf. No spam. No vendor calls.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnquiryForm;
