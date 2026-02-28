import React, { useState } from 'react';
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
  Send, 
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
  Briefcase
} from 'lucide-react';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { EVENT_TYPES, cn } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Your Details', description: 'Let us know who you are' },
  { id: 2, title: 'Event Details', description: 'Tell us about your event' },
  { id: 3, title: 'Budget & Preferences', description: 'Help us find your perfect match' },
];

const EnquiryForm = ({ venue, isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [date, setDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [plannerRequired, setPlannerRequired] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: '',
    event_type: '',
    guest_count: '',
    budget: '',
    preferences: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.customer_name.trim()) {
          toast.error('Please enter your name');
          return false;
        }
        if (!formData.customer_phone.trim()) {
          toast.error('Please enter your phone number');
          return false;
        }
        if (!formData.customer_email.trim()) {
          toast.error('Please enter your email');
          return false;
        }
        return true;
      case 2:
        if (!formData.event_type) {
          toast.error('Please select an event type');
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      await api.post('/leads', {
        ...formData,
        event_date: date ? format(date, 'yyyy-MM-dd') : null,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        venue_ids: [venue.venue_id],
        city: venue.city,
        area: venue.area,
        planner_required: plannerRequired,
      });
      setSuccess(true);
      toast.success('Enquiry submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSuccess(false);
    setFormData({
      customer_name: user?.name || '',
      customer_email: user?.email || '',
      customer_phone: '',
      event_type: '',
      guest_count: '',
      budget: '',
      preferences: '',
    });
    setDate(null);
    setPlannerRequired(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Premium input styling
  const inputClassName = "h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 focus:shadow-[0_0_0_3px_rgba(201,162,39,0.1)] px-5 rounded-xl transition-all duration-200 text-[#0B1F3B] placeholder:text-[#94A3B8]";
  const selectTriggerClassName = "h-14 bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 px-5 rounded-xl transition-all duration-200";

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#064E3B]/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#0B1F3B] mb-3">
                You're All Set!
              </h3>
              <p className="text-[#64748B] mb-6 leading-relaxed">
                Thank you for your interest in <span className="font-medium text-[#0B1F3B]">{venue.name}</span>. 
                Our venue expert will reach out within 24 hours.
              </p>
              {plannerRequired && (
                <div className="bg-[#F0E6D2]/50 border border-[#C9A227]/30 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-sm text-[#0B1F3B] flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#C9A227] flex-shrink-0 mt-0.5" />
                    <span>Event planning assistance noted. We'll introduce you to curated planners after venue confirmation.</span>
                  </p>
                </div>
              )}
              <Button
                onClick={() => {
                  handleClose();
                  if (user) navigate('/my-enquiries');
                }}
                className="w-full h-14 bg-gradient-to-b from-[#0B1F3B] to-[#153055] hover:from-[#153055] hover:to-[#1a3a6a] text-white font-semibold rounded-xl shadow-lg"
                data-testid="view-enquiries-btn"
              >
                {user ? 'Track Your Request' : 'Close'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 border-0 rounded-3xl overflow-hidden bg-transparent shadow-none">
        {/* Blur overlay effect is handled by Dialog */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#C9A227]/20 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold">Speak to Our Venue Expert</h2>
                <p className="text-sm text-slate-300">{venue.name}</p>
              </div>
            </div>
            
            {/* Step Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Step {currentStep} of 3</span>
                <span className="text-[#C9A227] font-medium">{STEPS[currentStep - 1].title}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#C9A227] to-[#D4AF37] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {/* Step 1: Personal Details */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 1 ? "opacity-100 translate-x-0" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] mb-6">{STEPS[0].description}</p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <Input
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={inputClassName}
                  data-testid="enquiry-name"
                />
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
                  className={inputClassName}
                  data-testid="enquiry-phone"
                />
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
                  className={inputClassName}
                  data-testid="enquiry-email"
                />
              </div>
            </div>

            {/* Step 2: Event Details */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 2 ? "opacity-100 translate-x-0" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] mb-6">{STEPS[1].description}</p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <PartyPopper className="w-3.5 h-3.5" /> Event Type
                </label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger className={selectTriggerClassName} data-testid="enquiry-event-type">
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

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Expected Guests
                </label>
                <Input
                  name="guest_count"
                  type="number"
                  value={formData.guest_count}
                  onChange={handleChange}
                  placeholder="How many guests are you expecting?"
                  className={inputClassName}
                  data-testid="enquiry-guests"
                />
              </div>
            </div>

            {/* Step 3: Budget & Preferences */}
            <div className={cn(
              "space-y-5 transition-all duration-300",
              currentStep === 3 ? "opacity-100 translate-x-0" : "hidden"
            )}>
              <p className="text-sm text-[#64748B] mb-6">{STEPS[2].description}</p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <IndianRupee className="w-3.5 h-3.5" /> Budget (INR)
                </label>
                <Input
                  name="budget"
                  type="number"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="What's your approximate budget?"
                  className={inputClassName}
                  data-testid="enquiry-budget"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Additional Requirements
                </label>
                <Textarea
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleChange}
                  placeholder="Tell us about any specific requirements, themes, or preferences..."
                  rows={3}
                  className="bg-slate-50/80 border-0 shadow-inner shadow-slate-200/50 focus:ring-2 focus:ring-[#C9A227]/30 px-5 py-4 rounded-xl transition-all duration-200 text-[#0B1F3B] placeholder:text-[#94A3B8] resize-none"
                  data-testid="enquiry-preferences"
                />
              </div>

              {/* Event Planning Assistance Checkbox */}
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
                      I need full event planning assistance
                    </label>
                    <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                      Our expert will connect you with curated event planners after venue confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
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
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 h-14 bg-gradient-to-b from-[#D4AF37] to-[#C9A227] hover:from-[#E0BC45] hover:to-[#D4AF37] text-[#0B1F3B] font-bold rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#C9A227]/40 active:scale-[0.98]"
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
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Trust Message */}
            <p className="text-center text-xs text-[#94A3B8] mt-6">
              Our experts negotiate pricing and manage documentation on your behalf.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnquiryForm;
