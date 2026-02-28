import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  formatDate,
  formatDateTime,
  formatIndianCurrency,
  formatIndianCurrencyFull,
  LEAD_STAGES,
  getStageBadgeClass,
  getStageLabel,
} from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Clock,
  FileText,
  Plus,
  Building2,
  Star,
  Check,
  MessageSquare,
  History,
  Upload,
  Percent,
  DollarSign,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  UserPlus,
  CreditCard,
  Shield,
  ExternalLink,
  Send,
  CalendarDays,
  RefreshCw,
  Lock,
  Unlock,
  Timer,
} from 'lucide-react';

// Lead Pipeline Stages (Updated for Managed Platform)
const MANAGED_STAGES = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { value: 'requirement_understood', label: 'Requirement Understood', color: 'bg-indigo-500' },
  { value: 'shortlisted', label: 'Venues Shortlisted', color: 'bg-purple-500' },
  { value: 'site_visit', label: 'Site Visit', color: 'bg-amber-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'booking_confirmed', label: 'Booking Confirmed', color: 'bg-green-600' },
  { value: 'lost', label: 'Lost', color: 'bg-slate-500' },
];

const NOTE_TYPES = [
  { value: 'general', label: 'General Note' },
  { value: 'negotiation', label: 'Negotiation Note' },
  { value: 'requirement', label: 'Requirement Note' },
  { value: 'internal', label: 'Internal Note' },
];

const FOLLOW_UP_TYPES = [
  { value: 'call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'In-Person Meeting' },
  { value: 'site_visit', label: 'Site Visit' },
];

const COMM_CHANNELS = [
  { value: 'call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'in_person', label: 'In Person' },
];

// Planner Assignment Component
const PlannerAssignmentSection = ({ leadId, onAssigned }) => {
  const [planners, setPlanners] = useState([]);
  const [selectedPlanner, setSelectedPlanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchPlanners = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users?role=event_planner&status=active');
        setPlanners(response.data.users || []);
      } catch (error) {
        console.error('Error fetching planners:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanners();
  }, []);

  const handleAssign = async () => {
    if (!selectedPlanner) {
      toast.error('Please select a planner');
      return;
    }
    setAssigning(true);
    try {
      await api.put(`/leads/${leadId}`, { assigned_planner_id: selectedPlanner });
      toast.success('Event planner assigned successfully!');
      onAssigned();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign planner');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-[#64748B]">Loading planners...</div>;
  }

  return (
    <div className="space-y-3">
      <Select value={selectedPlanner} onValueChange={setSelectedPlanner}>
        <SelectTrigger className="w-full" data-testid="planner-select">
          <SelectValue placeholder="Select an event planner" />
        </SelectTrigger>
        <SelectContent>
          {planners.map((planner) => (
            <SelectItem key={planner.user_id} value={planner.user_id}>
              <div className="flex items-center gap-2">
                <span>{planner.name}</span>
                {planner.email && (
                  <span className="text-xs text-[#64748B]">({planner.email})</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button 
        onClick={handleAssign} 
        disabled={!selectedPlanner || assigning}
        className="w-full bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B]"
        data-testid="assign-planner-btn"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        {assigning ? 'Assigning...' : 'Assign Event Planner'}
      </Button>
    </div>
  );
};

// Date Hold Section Component
const DateHoldSection = ({ lead, shortlistedVenues, onHoldUpdated }) => {
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('full_day');
  const [creating, setCreating] = useState(false);
  const [extending, setExtending] = useState(null);

  useEffect(() => {
    fetchHolds();
  }, [lead.lead_id]);

  const fetchHolds = async () => {
    try {
      const response = await api.get(`/leads/${lead.lead_id}/holds`);
      setHolds(response.data.holds || []);
    } catch (error) {
      console.error('Error fetching holds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHold = async () => {
    if (!selectedVenueId || !selectedDate) {
      toast.error('Please select a venue and date');
      return;
    }

    setCreating(true);
    try {
      await api.post(`/venues/${selectedVenueId}/hold-date`, {
        venue_id: selectedVenueId,
        date: selectedDate,
        lead_id: lead.lead_id,
        time_slot: selectedTimeSlot,
        expiry_hours: 24
      });
      toast.success('Date held successfully for 24 hours');
      setHoldDialogOpen(false);
      setSelectedVenueId('');
      setSelectedDate('');
      setSelectedTimeSlot('full_day');
      fetchHolds();
      onHoldUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to hold date');
    } finally {
      setCreating(false);
    }
  };

  const handleExtendHold = async (hold) => {
    setExtending(hold.hold_id);
    try {
      const response = await api.post(`/venues/${hold.venue_id}/hold-date/${hold.hold_id}/extend`, {
        extension_hours: 24
      });
      toast.success(response.data.message);
      fetchHolds();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend hold');
    } finally {
      setExtending(null);
    }
  };

  const handleReleaseHold = async (hold) => {
    try {
      await api.delete(`/venues/${hold.venue_id}/hold-date/${hold.hold_id}`);
      toast.success('Date hold released');
      fetchHolds();
      onHoldUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release hold');
    }
  };

  const formatHoursRemaining = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)} mins`;
    if (hours < 24) return `${Math.round(hours)} hrs`;
    return `${Math.round(hours / 24)} days`;
  };

  if (loading) {
    return <div className="text-center py-4 text-[#64748B]">Loading holds...</div>;
  }

  const activeHolds = holds.filter(h => h.status === 'active');

  return (
    <div className="space-y-4">
      {/* Existing Holds */}
      {activeHolds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-[#64748B] uppercase tracking-wide">Active Holds</p>
          {activeHolds.map(hold => (
            <div 
              key={hold.hold_id} 
              className={`p-3 border rounded-lg ${hold.is_expiring_soon ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-[#0B1F3B] text-sm">{hold.venue_name}</p>
                  <p className="text-xs text-[#64748B]">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {formatDate(hold.date)} • {hold.time_slot?.replace('_', ' ') || 'Full Day'}
                  </p>
                </div>
                {hold.is_expiring_soon && (
                  <Badge className="bg-amber-500 text-white text-[10px]">
                    <Timer className="w-3 h-3 mr-1" />
                    Expiring
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Clock className="w-3 h-3 text-[#64748B]" />
                <span className={hold.is_expiring_soon ? 'text-amber-700 font-medium' : 'text-[#64748B]'}>
                  {formatHoursRemaining(hold.hours_remaining || 0)} remaining
                </span>
                {hold.extension_count > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {hold.extension_count}/2 extensions
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2 mt-3">
                {(hold.extension_count || 0) < 2 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-xs h-7"
                    onClick={() => handleExtendHold(hold)}
                    disabled={extending === hold.hold_id}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${extending === hold.hold_id ? 'animate-spin' : ''}`} />
                    +24h
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleReleaseHold(hold)}
                >
                  <Unlock className="w-3 h-3 mr-1" />
                  Release
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Hold */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full"
            data-testid="hold-date-btn"
          >
            <Lock className="w-4 h-4 mr-2" />
            Hold Date for Client
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#C9A227]" />
              Hold Date for {lead.customer_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Select Venue</Label>
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger data-testid="hold-venue-select">
                  <SelectValue placeholder="Choose a shortlisted venue" />
                </SelectTrigger>
                <SelectContent>
                  {(shortlistedVenues || []).map(item => (
                    <SelectItem key={item.venue?.venue_id || item.venue_id} value={item.venue?.venue_id || item.venue_id}>
                      {item.venue?.name || item.venue_name} - {item.venue?.area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!shortlistedVenues || shortlistedVenues.length === 0) && (
                <p className="text-xs text-amber-600">Add venues to shortlist first</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="hold-date-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Time Slot</Label>
              <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full Day</SelectItem>
                  <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                  <SelectItem value="evening">Evening (6PM-12AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg text-xs text-[#64748B] space-y-1">
              <p><Clock className="w-3 h-3 inline mr-1" /> Default hold duration: <strong>24 hours</strong></p>
              <p><RefreshCw className="w-3 h-3 inline mr-1" /> Max <strong>2 extensions</strong> (24h each) allowed</p>
              <p><AlertCircle className="w-3 h-3 inline mr-1" /> Beyond that requires Admin approval</p>
            </div>
            
            <Button
              onClick={handleCreateHold}
              disabled={creating || !selectedVenueId || !selectedDate}
              className="w-full bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B]"
              data-testid="confirm-hold-btn"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-[#0B1F3B]/30 border-t-[#0B1F3B] rounded-full animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {creating ? 'Holding...' : 'Hold Date (24h)'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Info about expired holds */}
      {holds.filter(h => h.status === 'expired').length > 0 && (
        <p className="text-xs text-[#64748B]">
          {holds.filter(h => h.status === 'expired').length} expired hold(s) auto-released
        </p>
      )}
    </div>
  );
};

// Payment Collection Component
const PaymentCollectionSection = ({ lead, onPaymentCreated }) => {
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [payment, setPayment] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [commissionSettings, setCommissionSettings] = useState({
    commission_rate: 10,
    min_advance_percent: 10,
    max_advance_percent: 50
  });

  useEffect(() => {
    fetchPayment();
  }, [lead.lead_id]);

  const fetchPayment = async () => {
    try {
      const response = await api.get(`/payments/list?lead_id=${lead.lead_id}&limit=1`);
      const payments = response.data.payments || [];
      if (payments.length > 0) {
        setPayment(payments[0]);
        // Extract commission settings from payment if available
        if (payments[0].commission_rate) {
          setCommissionSettings(prev => ({
            ...prev,
            commission_rate: payments[0].commission_rate
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Calculate advance percent from input
  const advancePercent = advanceAmount && lead.deal_value 
    ? ((parseFloat(advanceAmount) / lead.deal_value) * 100).toFixed(1)
    : 0;
  
  // Calculate min/max advance amounts
  const minAdvance = lead.deal_value * (commissionSettings.min_advance_percent / 100);
  const maxAdvance = lead.deal_value * (commissionSettings.max_advance_percent / 100);
  const suggestedMin = lead.deal_value * 0.10;
  const suggestedMax = lead.deal_value * 0.30;

  // Validate advance amount
  const isAmountValid = advanceAmount && parseFloat(advanceAmount) >= minAdvance && parseFloat(advanceAmount) <= maxAdvance;
  const amountError = advanceAmount && parseFloat(advanceAmount) > 0 && !isAmountValid
    ? parseFloat(advanceAmount) < minAdvance 
      ? `Minimum ${commissionSettings.min_advance_percent}% required (${formatIndianCurrency(minAdvance)})`
      : `Maximum ${commissionSettings.max_advance_percent}% allowed (${formatIndianCurrency(maxAdvance)})`
    : null;

  const handleCreatePaymentOrder = async () => {
    const amount = parseFloat(advanceAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid advance amount');
      return;
    }
    if (amount < minAdvance) {
      toast.error(`Advance must be at least ${commissionSettings.min_advance_percent}% of deal value`);
      return;
    }
    if (amount > maxAdvance) {
      toast.error(`Advance cannot exceed ${commissionSettings.max_advance_percent}% of deal value`);
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/payments/create-order', {
        lead_id: lead.lead_id,
        amount: amount,
        description: `Advance payment for ${lead.event_type?.replace(/_/g, ' ')} booking`
      });
      setPayment(response.data);
      toast.success('Payment link generated & notification sent to customer!');
      onPaymentCreated?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment order');
    } finally {
      setCreating(false);
    }
  };

  const getPaymentStatusConfig = (status) => {
    const config = {
      awaiting_advance: { label: 'Awaiting Payment', className: 'bg-amber-500', icon: Clock },
      advance_paid: { label: 'Advance Paid', className: 'bg-emerald-600', icon: CheckCircle2 },
      payment_released: { label: 'Released to Venue', className: 'bg-blue-600', icon: Send },
      payment_failed: { label: 'Failed', className: 'bg-red-500', icon: AlertCircle },
    };
    return config[status] || { label: status, className: 'bg-slate-400', icon: Clock };
  };

  if (loadingPayment) {
    return <div className="text-center py-4 text-[#64748B]">Loading payment info...</div>;
  }

  // If payment already exists, show status
  if (payment) {
    const statusConfig = getPaymentStatusConfig(payment.status);
    const StatusIcon = statusConfig.icon;
    
    return (
      <div className="space-y-4">
        {/* Payment Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#64748B]">Payment Status</span>
          <Badge className={`${statusConfig.className} text-white flex items-center gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Payment Breakdown */}
        <div className="bg-slate-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#64748B]">Advance Amount</span>
            <span className="font-mono font-semibold text-[#0B1F3B]">
              {formatIndianCurrency(payment.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">BMV Commission ({payment.commission_rate}%)</span>
            <span className="font-mono text-[#C9A227]">
              {formatIndianCurrency(payment.commission_amount)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-[#64748B]">Net to Venue</span>
            <span className="font-mono text-emerald-600 font-semibold">
              {formatIndianCurrency(payment.net_amount_to_vendor)}
            </span>
          </div>
        </div>
        
        {/* Payment Link (if awaiting) */}
        {payment.status === 'awaiting_advance' && payment.payment_link && (
          <div className="space-y-2">
            <p className="text-xs text-[#64748B]">Share this secure payment link with the customer:</p>
            <div className="flex items-center gap-2">
              <Input 
                value={payment.payment_link} 
                readOnly 
                className="text-xs font-mono bg-slate-50"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(payment.payment_link);
                  toast.success('Payment link copied!');
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
        
        {/* Success message */}
        {payment.status === 'advance_paid' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-700">Advance Payment Received!</p>
              <p className="text-emerald-600 text-xs mt-1">
                Admin will release ₹{formatIndianCurrency(payment.net_amount_to_vendor)} to venue after verification.
              </p>
            </div>
          </div>
        )}
        
        {payment.status === 'payment_released' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700">Payment Released to Venue</p>
              <p className="text-blue-600 text-xs mt-1">
                Net amount of {formatIndianCurrency(payment.net_amount_to_vendor)} has been released.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // No payment yet - show creation form
  return (
    <div className="space-y-4">
      <div className="text-sm text-[#64748B]">
        <p>Generate a secure payment link to collect booking advance from the customer.</p>
        <p className="mt-1 text-xs">Deal Value: <span className="font-mono font-semibold text-[#0B1F3B]">{formatIndianCurrency(lead.deal_value)}</span></p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="advance-amount" className="text-sm flex items-center justify-between">
          <span>Advance Amount (₹)</span>
          {advanceAmount && parseFloat(advanceAmount) > 0 && (
            <span className={`text-xs font-mono ${isAmountValid ? 'text-emerald-600' : 'text-red-500'}`}>
              {advancePercent}% of deal
            </span>
          )}
        </Label>
        <Input
          id="advance-amount"
          type="number"
          value={advanceAmount}
          onChange={(e) => setAdvanceAmount(e.target.value)}
          placeholder="Enter advance amount"
          className={`font-mono ${amountError ? 'border-red-300 focus:ring-red-300' : ''}`}
          data-testid="advance-amount-input"
        />
        {amountError ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {amountError}
          </p>
        ) : (
          <p className="text-xs text-[#64748B]">
            Suggested: 10-30% ({formatIndianCurrency(suggestedMin)} - {formatIndianCurrency(suggestedMax)}) · 
            <span className="text-amber-600"> Max {commissionSettings.max_advance_percent}%</span>
          </p>
        )}
      </div>
      
      {/* Commission Preview */}
      {advanceAmount && parseFloat(advanceAmount) > 0 && isAmountValid && (
        <div className="bg-[#F0E6D2]/30 p-3 space-y-1 text-sm rounded-lg">
          <p className="font-medium text-[#0B1F3B]">Commission Preview ({commissionSettings.commission_rate}%):</p>
          <div className="flex justify-between text-xs">
            <span className="text-[#64748B]">BMV Platform Fee</span>
            <span className="font-mono text-[#C9A227]">{formatIndianCurrency(parseFloat(advanceAmount) * (commissionSettings.commission_rate / 100))}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#64748B]">Net to Venue</span>
            <span className="font-mono text-emerald-600">{formatIndianCurrency(parseFloat(advanceAmount) * (1 - commissionSettings.commission_rate / 100))}</span>
          </div>
        </div>
      )}
      
      <Button
        onClick={handleCreatePaymentOrder}
        disabled={creating || !advanceAmount || !isAmountValid}
        className="w-full bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B] disabled:opacity-50"
        data-testid="generate-payment-link-btn"
      >
        {creating ? (
          <div className="w-4 h-4 border-2 border-[#0B1F3B]/30 border-t-[#0B1F3B] rounded-full animate-spin mr-2" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        {creating ? 'Generating...' : 'Generate Payment Link'}
      </Button>
      
      <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
        <Shield className="w-3 h-3 text-[#C9A227]" />
        <span>Protected Payment via BookMyVenue</span>
      </div>
    </div>
  );
};

const RMLeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [venues, setVenues] = useState([]);
  const [planners, setPlanners] = useState([]);
  const isAdmin = user?.role === 'admin';

  // Dialog states
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [plannerDialogOpen, setPlannerDialogOpen] = useState(false);

  // Form states
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpDesc, setFollowUpDesc] = useState('');
  const [followUpType, setFollowUpType] = useState('call');
  const [commChannel, setCommChannel] = useState('call');
  const [commDirection, setCommDirection] = useState('outbound');
  const [commSummary, setCommSummary] = useState('');
  const [commDuration, setCommDuration] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [shortlistNotes, setShortlistNotes] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDesc, setQuoteDesc] = useState('');
  const [selectedPlannerId, setSelectedPlannerId] = useState('');
  const [plannerNotes, setPlannerNotes] = useState('');
  const [budgetSegment, setBudgetSegment] = useState('premium');

  useEffect(() => {
    fetchLead();
    fetchVenues();
    fetchPlanners();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      setLead(response.data);
    } catch (error) {
      console.error('Error fetching lead:', error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const response = await api.get('/venues?limit=100');
      setVenues(response.data);
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const fetchPlanners = async () => {
    try {
      const response = await api.get('/planners');
      setPlanners(response.data);
    } catch (error) {
      console.error('Error fetching planners:', error);
    }
  };

  const updateLeadStage = async (newStage) => {
    // Validate booking confirmation
    if (newStage === 'booking_confirmed') {
      if (!lead.deal_value) {
        toast.error('Deal value is required to confirm booking');
        return;
      }
      if (!lead.venue_commission_rate && !lead.venue_commission_flat && 
          !lead.planner_commission_rate && !lead.planner_commission_flat) {
        toast.error('At least one commission (venue or planner) must be set');
        return;
      }
    }

    setUpdating(true);
    try {
      await api.put(`/leads/${leadId}`, { stage: newStage });
      toast.success('Stage updated successfully');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update stage');
    } finally {
      setUpdating(false);
    }
  };

  const updateLeadField = async (field, value) => {
    try {
      await api.put(`/leads/${leadId}`, { [field]: value });
      setLead((prev) => ({ ...prev, [field]: value }));
      toast.success('Updated successfully');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const updateCommission = async (updates) => {
    try {
      await api.put(`/leads/${leadId}`, updates);
      fetchLead(); // Refresh to get calculated values
      toast.success('Commission updated');
    } catch (error) {
      toast.error('Failed to update commission');
    }
  };

  // ========== NOTE HANDLERS ==========
  const addNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await api.post(`/leads/${leadId}/notes`, { 
        content: noteContent,
        note_type: noteType 
      });
      setNoteContent('');
      setNoteType('general');
      setNoteDialogOpen(false);
      toast.success('Note added');
      fetchLead();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  // ========== FOLLOW-UP HANDLERS ==========
  const addFollowUp = async () => {
    if (!followUpDate || !followUpDesc.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await api.post(`/leads/${leadId}/follow-ups`, {
        scheduled_at: followUpDate,
        description: followUpDesc,
        follow_up_type: followUpType
      });
      setFollowUpDate('');
      setFollowUpDesc('');
      setFollowUpType('call');
      setFollowUpDialogOpen(false);
      toast.success('Follow-up scheduled');
      fetchLead();
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  };

  const completeFollowUp = async (followUpId, outcome) => {
    try {
      await api.put(`/leads/${leadId}/follow-ups/${followUpId}`, {
        status: 'completed',
        outcome
      });
      toast.success('Follow-up completed');
      fetchLead();
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  // ========== COMMUNICATION HANDLERS ==========
  const addCommunication = async () => {
    if (!commSummary.trim()) {
      toast.error('Please enter a summary');
      return;
    }
    try {
      await api.post(`/leads/${leadId}/communications`, {
        channel: commChannel,
        direction: commDirection,
        summary: commSummary,
        duration_minutes: commDuration ? parseInt(commDuration) : null
      });
      setCommChannel('call');
      setCommDirection('outbound');
      setCommSummary('');
      setCommDuration('');
      setCommDialogOpen(false);
      toast.success('Communication logged');
      fetchLead();
    } catch (error) {
      toast.error('Failed to log communication');
    }
  };

  // ========== SHORTLIST HANDLERS ==========
  const addToShortlist = async () => {
    if (!selectedVenueId) {
      toast.error('Please select a venue');
      return;
    }
    try {
      await api.post(`/leads/${leadId}/shortlist`, {
        venue_id: selectedVenueId,
        notes: shortlistNotes,
        proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
        status: 'proposed'
      });
      setSelectedVenueId('');
      setShortlistNotes('');
      setProposedPrice('');
      setShortlistDialogOpen(false);
      toast.success('Added to shortlist');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to shortlist');
    }
  };

  const removeFromShortlist = async (shortlistId) => {
    try {
      await api.delete(`/leads/${leadId}/shortlist/${shortlistId}`);
      toast.success('Removed from shortlist');
      fetchLead();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  // ========== QUOTE HANDLERS ==========
  const createQuote = async () => {
    if (!quoteAmount) {
      toast.error('Please enter quote amount');
      return;
    }
    try {
      await api.post(`/leads/${leadId}/quotes`, {
        quote_type: 'venue',
        entity_id: selectedVenueId || 'manual',
        amount: parseFloat(quoteAmount),
        description: quoteDesc
      });
      setQuoteAmount('');
      setQuoteDesc('');
      setQuoteDialogOpen(false);
      toast.success('Quote created');
      fetchLead();
    } catch (error) {
      toast.error('Failed to create quote');
    }
  };

  // ========== PLANNER MATCH HANDLERS ==========
  const matchPlanner = async () => {
    if (!selectedPlannerId) {
      toast.error('Please select a planner');
      return;
    }
    try {
      await api.post(`/leads/${leadId}/planner-matches`, {
        planner_id: selectedPlannerId,
        notes: plannerNotes,
        budget_segment: budgetSegment,
        status: 'suggested'
      });
      setSelectedPlannerId('');
      setPlannerNotes('');
      setBudgetSegment('premium');
      setPlannerDialogOpen(false);
      toast.success('Planner matched');
      fetchLead();
    } catch (error) {
      toast.error('Failed to match planner');
    }
  };

  // ========== EVENT COMPLETION (ADMIN ONLY) ==========
  const markEventCompleted = async () => {
    if (!isAdmin) {
      toast.error('Only admins can mark events as completed');
      return;
    }
    try {
      await api.put(`/leads/${leadId}/complete-event`);
      toast.success('Event marked as completed! Commission moved to Earned.');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark event as completed');
    }
  };

  // ========== COMMISSION COLLECTED (ADMIN ONLY) ==========
  const markCommissionCollected = async (commissionType) => {
    if (!isAdmin) {
      toast.error('Only admins can mark commission as collected');
      return;
    }
    try {
      await api.put(`/leads/${leadId}/commission-collected?commission_type=${commissionType}`);
      toast.success(`${commissionType === 'venue' ? 'Venue' : 'Planner'} commission marked as collected!`);
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark commission as collected');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading..." breadcrumbs={[{ label: 'Dashboard', href: '/rm/dashboard' }, { label: 'Lead' }]}>
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout title="Lead Not Found" breadcrumbs={[{ label: 'Dashboard', href: '/rm/dashboard' }, { label: 'Lead' }]}>
        <div className="text-center py-16">
          <p className="text-[#64748B]">Lead not found or you don't have access.</p>
          <Button onClick={() => navigate('/rm/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentStage = MANAGED_STAGES.find(s => s.value === lead.stage) || MANAGED_STAGES[0];

  return (
    <DashboardLayout
      title={`Lead: ${lead.customer_name}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/rm/dashboard' },
        { label: lead.customer_name },
      ]}
    >
      {/* Managed Platform Banner */}
      <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] text-white p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-[#C9A227]" />
          <span className="font-medium">Managed by BookMyVenue Experts</span>
          {lead.planner_required && (
            <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Planner Required
            </Badge>
          )}
        </div>
        <Badge className={`${currentStage.color} text-white px-3 py-1`}>
          {currentStage.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info + Requirement Summary */}
          <div className="bg-white border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-[#0B1F3B]">Customer Information</h2>
              {lead.contact_released ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Eye className="w-3 h-3 mr-1" /> Contact Released
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <EyeOff className="w-3 h-3 mr-1" /> Contact Protected
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <p className="text-sm text-[#64748B]">Name</p>
                  <p className="font-medium text-[#0B1F3B]">{lead.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <p className="text-sm text-[#64748B]">Email</p>
                  <a href={`mailto:${lead.customer_email}`} className="font-medium text-[#0B1F3B] hover:text-[#C9A227]">
                    {lead.customer_email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <p className="text-sm text-[#64748B]">Phone</p>
                  <a href={`tel:${lead.customer_phone}`} className="font-medium text-[#0B1F3B] hover:text-[#C9A227]">
                    {lead.customer_phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <p className="text-sm text-[#64748B]">Location</p>
                  <p className="font-medium text-[#0B1F3B]">{lead.city}{lead.area && `, ${lead.area}`}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details + Requirement Summary */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Event Requirements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-[#64748B]">Event Type</p>
                <p className="font-medium text-[#0B1F3B] capitalize">{lead.event_type?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Event Date</p>
                <p className="font-medium text-[#0B1F3B]">{lead.event_date ? formatDate(lead.event_date) : 'TBD'}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Guest Count</p>
                <p className="font-medium text-[#0B1F3B]">{lead.guest_count || 'TBD'}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Budget</p>
                <p className="font-mono font-medium text-[#0B1F3B]">
                  {lead.budget ? formatIndianCurrencyFull(lead.budget) : 'TBD'}
                </p>
              </div>
            </div>
            
            {/* Requirement Summary - Editable */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Label className="text-sm font-semibold text-[#0B1F3B]">Requirement Summary</Label>
              <Textarea
                placeholder="Enter detailed requirements understood from customer..."
                defaultValue={lead.requirement_summary || ''}
                onBlur={(e) => updateLeadField('requirement_summary', e.target.value)}
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-[#64748B] mt-1">This summary is shared with venues for better matching.</p>
            </div>
            
            {lead.preferences && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-[#64748B]">Customer's Original Preferences</p>
                <p className="text-[#0B1F3B] mt-1 italic">"{lead.preferences}"</p>
              </div>
            )}
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="shortlist" className="bg-white border border-slate-200">
            <TabsList className="w-full justify-start border-b border-slate-200 rounded-none bg-transparent h-auto p-0 flex-wrap">
              <TabsTrigger value="shortlist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Venue Shortlist ({lead.shortlist?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Quotes ({lead.quotes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="planners" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Planners ({lead.planner_matches?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="communications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Comm Log ({lead.communications?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Notes ({lead.notes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="followups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Follow-ups ({lead.follow_ups?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-4 py-3">
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Venue Shortlist Tab */}
            <TabsContent value="shortlist" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[#0B1F3B]">Venue Shortlist</h3>
                <Dialog open={shortlistDialogOpen} onOpenChange={setShortlistDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-shortlist-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Venue
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Venue to Shortlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Select Venue</Label>
                        <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choose a venue" />
                          </SelectTrigger>
                          <SelectContent>
                            {venues.map((v) => (
                              <SelectItem key={v.venue_id} value={v.venue_id}>
                                {v.name} - {v.area}, {v.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Proposed Price (Optional)</Label>
                        <Input
                          type="number"
                          placeholder="Enter negotiated price"
                          value={proposedPrice}
                          onChange={(e) => setProposedPrice(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Why is this venue a good match?"
                          value={shortlistNotes}
                          onChange={(e) => setShortlistNotes(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={addToShortlist} className="w-full">
                        Add to Shortlist
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lead.shortlist?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Venue</th>
                        <th>Location</th>
                        <th>Capacity</th>
                        <th>List Price</th>
                        <th>Proposed</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lead.shortlist.map((item) => (
                        <tr key={item.shortlist_id}>
                          <td className="font-medium text-[#0B1F3B]">{item.venue?.name || item.venue_name}</td>
                          <td>{item.venue?.area}, {item.venue?.city}</td>
                          <td>{item.venue?.capacity_min}-{item.venue?.capacity_max}</td>
                          <td className="font-mono">{formatIndianCurrency(item.venue?.pricing?.price_per_plate_veg)}/plate</td>
                          <td className="font-mono text-[#C9A227]">
                            {item.proposed_price ? formatIndianCurrencyFull(item.proposed_price) : '-'}
                          </td>
                          <td>
                            <Badge variant="outline" className="capitalize">{item.status}</Badge>
                          </td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromShortlist(item.shortlist_id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No venues shortlisted yet. Add venues to share with customer.</p>
              )}
            </TabsContent>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[#0B1F3B]">Quotes</h3>
                <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-quote-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Quote
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Quote</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Quote Amount</Label>
                        <Input
                          type="number"
                          placeholder="Total amount"
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Quote details and inclusions..."
                          value={quoteDesc}
                          onChange={(e) => setQuoteDesc(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={createQuote} className="w-full">
                        Create Quote
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lead.quotes?.length > 0 ? (
                <div className="space-y-4">
                  {lead.quotes.map((quote) => (
                    <div key={quote.quote_id} className="p-4 border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xl font-bold text-[#0B1F3B]">
                            {formatIndianCurrencyFull(quote.amount)}
                          </p>
                          <p className="text-sm text-[#64748B] mt-1">{quote.description}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">{quote.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-[#64748B]">
                        <span>By: {quote.created_by_name}</span>
                        <span>{formatDateTime(quote.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No quotes created yet.</p>
              )}
            </TabsContent>

            {/* Planners Tab */}
            <TabsContent value="planners" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[#0B1F3B]">Event Planner Matches</h3>
                <Dialog open={plannerDialogOpen} onOpenChange={setPlannerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="match-planner-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Match Planner
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Match Event Planner</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Select Planner</Label>
                        <Select value={selectedPlannerId} onValueChange={setSelectedPlannerId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choose a planner" />
                          </SelectTrigger>
                          <SelectContent>
                            {planners.map((p) => (
                              <SelectItem key={p.planner_id} value={p.planner_id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Budget Segment</Label>
                        <Select value={budgetSegment} onValueChange={setBudgetSegment}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="budget">Budget</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="luxury">Luxury</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Why is this planner a good match?"
                          value={plannerNotes}
                          onChange={(e) => setPlannerNotes(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={matchPlanner} className="w-full">
                        Match Planner
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lead.planner_matches?.length > 0 ? (
                <div className="space-y-4">
                  {lead.planner_matches.map((match) => (
                    <div key={match.match_id} className="p-4 border border-slate-200 flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
                        <Briefcase className="w-8 h-8 text-[#64748B]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#0B1F3B]">{match.planner?.name || match.planner_name}</p>
                        <p className="text-sm text-[#64748B]">{match.planner?.services?.join(', ')}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">{match.budget_segment}</Badge>
                          <Badge variant="outline" className="capitalize">{match.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No planners matched yet.</p>
              )}
            </TabsContent>

            {/* Communications Tab */}
            <TabsContent value="communications" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[#0B1F3B]">Communication Log</h3>
                <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="log-comm-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Log Communication
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log Communication</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Channel</Label>
                          <Select value={commChannel} onValueChange={setCommChannel}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMM_CHANNELS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Direction</Label>
                          <Select value={commDirection} onValueChange={setCommDirection}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inbound">Inbound</SelectItem>
                              <SelectItem value="outbound">Outbound</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={commDuration}
                          onChange={(e) => setCommDuration(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Summary</Label>
                        <Textarea
                          placeholder="What was discussed?"
                          value={commSummary}
                          onChange={(e) => setCommSummary(e.target.value)}
                          rows={4}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={addCommunication} className="w-full">
                        Log Communication
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lead.communications?.length > 0 ? (
                <div className="space-y-4">
                  {lead.communications.map((comm) => (
                    <div key={comm.comm_id} className="timeline-item">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-[#C9A227]" />
                        <span className="font-medium text-[#0B1F3B] capitalize">{comm.channel}</span>
                        <Badge variant="outline" className="text-xs capitalize">{comm.direction}</Badge>
                        {comm.duration_minutes && (
                          <span className="text-xs text-[#64748B]">{comm.duration_minutes} mins</span>
                        )}
                      </div>
                      <p className="text-[#0B1F3B]">{comm.summary}</p>
                      <p className="text-xs text-[#64748B] mt-2">
                        {comm.logged_by_name} • {formatDateTime(comm.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No communications logged yet.</p>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[#0B1F3B]">Notes</h3>
                <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-note-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Note Type</Label>
                        <Select value={noteType} onValueChange={setNoteType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Note Content</Label>
                        <Textarea
                          placeholder="Enter your note..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          rows={4}
                          className="mt-1"
                          data-testid="note-content"
                        />
                      </div>
                      <Button onClick={addNote} className="w-full" data-testid="save-note-btn">
                        Save Note
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lead.notes?.length > 0 ? (
                <div className="space-y-4">
                  {lead.notes.map((note, idx) => (
                    <div key={note.note_id || idx} className="timeline-item">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs capitalize">{note.note_type || 'general'}</Badge>
                        <span className="text-sm text-[#64748B]">
                          {note.added_by_name} • {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-[#0B1F3B]">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No notes yet</p>
              )}
            </TabsContent>

            {/* Follow-ups Tab */}
            <TabsContent value="followups" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-[#0B1F3B]">Follow-ups</h3>
                <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-followup-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Follow-up
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule Follow-up</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={followUpType} onValueChange={setFollowUpType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FOLLOW_UP_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="mt-1"
                          data-testid="followup-date"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          placeholder="What's the follow-up about?"
                          value={followUpDesc}
                          onChange={(e) => setFollowUpDesc(e.target.value)}
                          rows={3}
                          className="mt-1"
                          data-testid="followup-desc"
                        />
                      </div>
                      <Button onClick={addFollowUp} className="w-full" data-testid="save-followup-btn">
                        Schedule
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lead.follow_ups?.length > 0 ? (
                <div className="space-y-4">
                  {lead.follow_ups.map((fu, idx) => (
                    <div key={fu.follow_up_id || idx} className="flex items-start gap-4 p-4 border border-slate-200">
                      <div className={`w-10 h-10 flex items-center justify-center ${
                        fu.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        <Clock className={`w-5 h-5 ${
                          fu.status === 'completed' ? 'text-green-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#0B1F3B]">{formatDateTime(fu.scheduled_at)}</p>
                          <Badge variant="outline" className="text-xs capitalize">{fu.follow_up_type || 'call'}</Badge>
                        </div>
                        <p className="text-[#64748B] mt-1">{fu.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="capitalize">
                            {fu.status || 'pending'}
                          </Badge>
                          {fu.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeFollowUp(fu.follow_up_id, 'completed')}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No follow-ups scheduled</p>
              )}
            </TabsContent>

            {/* Activity Timeline Tab */}
            <TabsContent value="activity" className="p-6">
              <h3 className="font-semibold text-[#0B1F3B] mb-4">Activity Timeline</h3>
              {lead.activity_timeline?.length > 0 ? (
                <div className="space-y-4">
                  {lead.activity_timeline.map((activity, idx) => (
                    <div key={activity.log_id || idx} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <History className="w-4 h-4 text-[#64748B]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#0B1F3B]">
                          <span className="font-medium">{activity.performed_by_name}</span>
                          {' '}{activity.action.replace(/_/g, ' ')}
                        </p>
                        {activity.changes && Object.keys(activity.changes).length > 0 && (
                          <p className="text-xs text-[#64748B] mt-1">
                            {JSON.stringify(activity.changes)}
                          </p>
                        )}
                        <p className="text-xs text-[#64748B] mt-1">{formatDateTime(activity.performed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No activity recorded yet</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Management */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Lead Stage</h2>
            <Select value={lead.stage} onValueChange={updateLeadStage} disabled={updating}>
              <SelectTrigger data-testid="stage-select">
                <SelectValue placeholder="Change stage" />
              </SelectTrigger>
              <SelectContent>
                {MANAGED_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Stage validation warning */}
            {lead.stage !== 'booking_confirmed' && (
              <div className="mt-4 p-3 bg-slate-50 text-xs text-[#64748B]">
                <p className="font-medium text-[#0B1F3B] mb-1">To confirm booking:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={lead.deal_value ? 'text-green-600' : ''}>
                    {lead.deal_value ? '✓' : '○'} Deal value set
                  </li>
                  <li className={(lead.venue_commission_rate || lead.venue_commission_flat || lead.planner_commission_rate || lead.planner_commission_flat) ? 'text-green-600' : ''}>
                    {(lead.venue_commission_rate || lead.venue_commission_flat || lead.planner_commission_rate || lead.planner_commission_flat) ? '✓' : '○'} Commission configured
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Deal & Commission Tracking */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Deal & Commission</h2>
            <div className="space-y-4">
              {/* Deal Value */}
              <div>
                <Label className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" />
                  Deal Value
                </Label>
                <Input
                  type="number"
                  placeholder="Total booking amount"
                  defaultValue={lead.deal_value || ''}
                  onBlur={(e) => updateCommission({ deal_value: parseFloat(e.target.value) || null })}
                  className="mt-1"
                  data-testid="deal-value"
                />
              </div>

              {/* Venue Commission */}
              <div className="p-4 bg-slate-50 space-y-3">
                <p className="font-medium text-sm text-[#0B1F3B]">Venue Commission</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={lead.venue_commission_type || 'percentage'}
                      onValueChange={(v) => updateCommission({ venue_commission_type: v })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      {lead.venue_commission_type === 'flat' ? 'Amount' : 'Rate %'}
                    </Label>
                    <Input
                      type="number"
                      placeholder={lead.venue_commission_type === 'flat' ? '50000' : '10'}
                      defaultValue={lead.venue_commission_type === 'flat' ? lead.venue_commission_flat : lead.venue_commission_rate}
                      onBlur={(e) => updateCommission(
                        lead.venue_commission_type === 'flat'
                          ? { venue_commission_flat: parseFloat(e.target.value) || null }
                          : { venue_commission_rate: parseFloat(e.target.value) || null }
                      )}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                {lead.venue_commission_calculated > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-xs text-[#64748B]">Calculated</span>
                    <span className="font-mono font-bold text-[#0B1F3B]">
                      {formatIndianCurrencyFull(lead.venue_commission_calculated)}
                    </span>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Lifecycle Status</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${
                        lead.venue_commission_status === 'collected' ? 'bg-green-100 text-green-700 border-green-300' :
                        lead.venue_commission_status === 'earned' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        lead.venue_commission_status === 'confirmed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                        lead.venue_commission_status === 'projected' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lead.venue_commission_status || 'Not Set'}
                    </Badge>
                    {lead.venue_commission_age_days > 0 && (
                      <span className="text-xs text-[#64748B]">
                        {lead.venue_commission_age_days}d since confirmed
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    Projected → Confirmed → Earned → Collected
                  </p>
                </div>
              </div>

              {/* Planner Commission */}
              <div className="p-4 bg-slate-50 space-y-3">
                <p className="font-medium text-sm text-[#0B1F3B]">Planner Commission</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={lead.planner_commission_type || 'percentage'}
                      onValueChange={(v) => updateCommission({ planner_commission_type: v })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      {lead.planner_commission_type === 'flat' ? 'Amount' : 'Rate %'}
                    </Label>
                    <Input
                      type="number"
                      placeholder={lead.planner_commission_type === 'flat' ? '25000' : '5'}
                      defaultValue={lead.planner_commission_type === 'flat' ? lead.planner_commission_flat : lead.planner_commission_rate}
                      onBlur={(e) => updateCommission(
                        lead.planner_commission_type === 'flat'
                          ? { planner_commission_flat: parseFloat(e.target.value) || null }
                          : { planner_commission_rate: parseFloat(e.target.value) || null }
                      )}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                {lead.planner_commission_calculated > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-xs text-[#64748B]">Calculated</span>
                    <span className="font-mono font-bold text-[#0B1F3B]">
                      {formatIndianCurrencyFull(lead.planner_commission_calculated)}
                    </span>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Lifecycle Status</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${
                        lead.planner_commission_status === 'collected' ? 'bg-green-100 text-green-700 border-green-300' :
                        lead.planner_commission_status === 'earned' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        lead.planner_commission_status === 'confirmed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                        lead.planner_commission_status === 'projected' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lead.planner_commission_status || 'Not Set'}
                    </Badge>
                    {lead.planner_commission_age_days > 0 && (
                      <span className="text-xs text-[#64748B]">
                        {lead.planner_commission_age_days}d since confirmed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Commission Summary */}
              {(lead.venue_commission_calculated > 0 || lead.planner_commission_calculated > 0) && (
                <div className="p-4 bg-[#F0E6D2]">
                  <p className="text-sm text-[#64748B]">Total Commission</p>
                  <p className="font-mono text-2xl font-bold text-[#0B1F3B]">
                    {formatIndianCurrencyFull((lead.venue_commission_calculated || 0) + (lead.planner_commission_calculated || 0))}
                  </p>
                </div>
              )}

              {/* Admin Actions: Mark Collected */}
              {isAdmin && (lead.venue_commission_status === 'earned' || lead.planner_commission_status === 'earned') && (
                <div className="p-4 bg-blue-50 space-y-2">
                  <p className="text-xs font-semibold text-blue-700">Admin: Mark Collected</p>
                  {lead.venue_commission_status === 'earned' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => markCommissionCollected('venue')}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Venue Commission Collected
                    </Button>
                  )}
                  {lead.planner_commission_status === 'earned' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => markCommissionCollected('planner')}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Planner Commission Collected
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Planner Assignment Section - Shown when planner is required */}
          {lead.planner_required && (
            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C9A227]" />
                  Event Planning Partner
                </h2>
                {lead.stage === 'booking_confirmed' && !lead.assigned_planner_id && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    <AlertCircle className="w-3 h-3 mr-1" /> Awaiting Assignment
                  </Badge>
                )}
              </div>
              
              {lead.assigned_planner_id ? (
                <div className="bg-[#F0E6D2]/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#C9A227] rounded-full flex items-center justify-center text-white font-semibold">
                        {lead.assigned_planner_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="font-medium text-[#0B1F3B]">{lead.assigned_planner_name}</p>
                        <p className="text-sm text-[#64748B]">Event Planner • Assigned</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      <Check className="w-3 h-3 mr-1" /> Assigned
                    </Badge>
                  </div>
                </div>
              ) : lead.stage === 'booking_confirmed' ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#64748B]">
                    Venue booking confirmed. You can now assign an event planner to assist the client.
                  </p>
                  <PlannerAssignmentSection leadId={leadId} onAssigned={fetchLead} />
                </div>
              ) : (
                <div className="text-center py-6 text-[#64748B]">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Client requires event planning assistance.</p>
                  <p className="text-xs mt-1">Planner will be assigned after venue booking is confirmed.</p>
                </div>
              )}
            </div>
          )}

          {/* Event Completion (Admin Only) */}
          {lead.stage === 'booking_confirmed' && (
            <div className="bg-white border border-slate-200 p-6">
              <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Event Status</h2>
              {lead.event_completed ? (
                <div className="p-4 bg-green-50 text-center">
                  <PartyPopper className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Event Completed!</p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatDateTime(lead.event_completed_at)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-[#64748B] mb-4">
                    <p><strong>Event Date:</strong> {lead.event_date ? formatDate(lead.event_date) : 'Not set'}</p>
                    <p className="mt-1 text-xs">
                      Commission moves from Confirmed → Earned when event is marked complete.
                    </p>
                  </div>
                  {isAdmin ? (
                    <Button 
                      onClick={markEventCompleted}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="mark-event-completed"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Event Completed
                    </Button>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2">
                      Only Admin can mark event as completed
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Payment Collection - Show when booking confirmed and deal value set */}
          {lead.stage === 'booking_confirmed' && lead.deal_value && (
            <div className="bg-white border border-slate-200 p-6">
              <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#C9A227]" />
                Advance Payment
              </h2>
              <PaymentCollectionSection lead={lead} onPaymentCreated={fetchLead} />
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`tel:${lead.customer_phone}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Customer
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`mailto:${lead.customer_email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </a>
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Timeline</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Created</span>
                <span className="text-[#0B1F3B]">{formatDateTime(lead.created_at)}</span>
              </div>
              {lead.first_contacted_at && (
                <div className="flex justify-between">
                  <span className="text-[#64748B]">First Contacted</span>
                  <span className="text-[#0B1F3B]">{formatDateTime(lead.first_contacted_at)}</span>
                </div>
              )}
              {lead.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Confirmed</span>
                  <span className="text-green-600 font-medium">{formatDateTime(lead.confirmed_at)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#64748B]">Last Updated</span>
                <span className="text-[#0B1F3B]">{formatDateTime(lead.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RMLeadDetail;
