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
