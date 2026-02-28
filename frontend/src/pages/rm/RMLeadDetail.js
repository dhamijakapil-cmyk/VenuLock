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
import { api } from '@/context/AuthContext';
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
} from 'lucide-react';

const RMLeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpDesc, setFollowUpDesc] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);

  useEffect(() => {
    fetchLead();
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

  const updateLeadStage = async (newStage) => {
    setUpdating(true);
    try {
      await api.put(`/leads/${leadId}`, { stage: newStage });
      setLead((prev) => ({ ...prev, stage: newStage }));
      toast.success('Stage updated successfully');
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setUpdating(false);
    }
  };

  const updateCommission = async (field, value) => {
    try {
      await api.put(`/leads/${leadId}`, { [field]: value });
      setLead((prev) => ({ ...prev, [field]: value }));
      toast.success('Updated successfully');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const addNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      const response = await api.post(`/leads/${leadId}/notes`, { content: noteContent });
      setLead((prev) => ({
        ...prev,
        notes: [...(prev.notes || []), response.data],
      }));
      setNoteContent('');
      setNoteDialogOpen(false);
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const addFollowUp = async () => {
    if (!followUpDate || !followUpDesc.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const response = await api.post(`/leads/${leadId}/follow-ups`, {
        scheduled_at: followUpDate,
        description: followUpDesc,
      });
      setLead((prev) => ({
        ...prev,
        follow_ups: [...(prev.follow_ups || []), response.data],
      }));
      setFollowUpDate('');
      setFollowUpDesc('');
      setFollowUpDialogOpen(false);
      toast.success('Follow-up scheduled');
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  };

  const updateShortlist = async (venueId, add) => {
    const newShortlist = add
      ? [...(lead.shortlisted_venues || []), venueId]
      : (lead.shortlisted_venues || []).filter((id) => id !== venueId);
    
    try {
      await api.put(`/leads/${leadId}`, { shortlisted_venues: newShortlist });
      setLead((prev) => ({ ...prev, shortlisted_venues: newShortlist }));
      toast.success(add ? 'Added to shortlist' : 'Removed from shortlist');
    } catch (error) {
      toast.error('Failed to update shortlist');
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

  return (
    <DashboardLayout
      title={`Lead: ${lead.customer_name}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/rm/dashboard' },
        { label: lead.customer_name },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info Card */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Customer Information</h2>
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

          {/* Event Details Card */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Event Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#64748B]">Event Type</p>
                <p className="font-medium text-[#0B1F3B] capitalize">{lead.event_type?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Event Date</p>
                <p className="font-medium text-[#0B1F3B]">{lead.event_date ? formatDate(lead.event_date) : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Guest Count</p>
                <p className="font-medium text-[#0B1F3B]">{lead.guest_count || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Budget</p>
                <p className="font-mono font-medium text-[#0B1F3B]">
                  {lead.budget ? formatIndianCurrencyFull(lead.budget) : 'Not specified'}
                </p>
              </div>
            </div>
            {lead.preferences && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-[#64748B]">Preferences / Notes</p>
                <p className="text-[#0B1F3B] mt-1">{lead.preferences}</p>
              </div>
            )}
          </div>

          {/* Tabs for Venues, Notes, Follow-ups */}
          <Tabs defaultValue="venues" className="bg-white border border-slate-200">
            <TabsList className="w-full justify-start border-b border-slate-200 rounded-none bg-transparent h-auto p-0">
              <TabsTrigger value="venues" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-6 py-3">
                Venues ({lead.venues?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="shortlisted" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-6 py-3">
                Shortlisted ({lead.shortlisted_venues?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-6 py-3">
                Notes ({lead.notes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="followups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A227] data-[state=active]:bg-transparent px-6 py-3">
                Follow-ups ({lead.follow_ups?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Venues Tab */}
            <TabsContent value="venues" className="p-6">
              {lead.venues?.length > 0 ? (
                <div className="space-y-4">
                  {lead.venues.map((venue) => (
                    <div key={venue.venue_id} className="flex items-center justify-between p-4 border border-slate-200">
                      <div className="flex items-center gap-4">
                        <img
                          src={venue.images?.[0] || 'https://via.placeholder.com/80'}
                          alt={venue.name}
                          className="w-20 h-20 object-cover"
                        />
                        <div>
                          <h4 className="font-semibold text-[#0B1F3B]">{venue.name}</h4>
                          <p className="text-sm text-[#64748B]">{venue.area}, {venue.city}</p>
                          <p className="text-sm font-mono text-[#0B1F3B] mt-1">
                            {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}/plate
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.shortlisted_venues?.includes(venue.venue_id) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateShortlist(venue.venue_id, false)}
                            className="text-green-600 border-green-600"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Shortlisted
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateShortlist(venue.venue_id, true)}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Shortlist
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No venues enquired</p>
              )}
            </TabsContent>

            {/* Shortlisted Tab */}
            <TabsContent value="shortlisted" className="p-6">
              {lead.shortlisted_venue_details?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Venue</th>
                        <th>Location</th>
                        <th>Capacity</th>
                        <th>Price/Plate</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lead.shortlisted_venue_details.map((venue) => (
                        <tr key={venue.venue_id}>
                          <td className="font-medium text-[#0B1F3B]">{venue.name}</td>
                          <td>{venue.area}, {venue.city}</td>
                          <td>{venue.capacity_min}-{venue.capacity_max}</td>
                          <td className="font-mono">{formatIndianCurrency(venue.pricing?.price_per_plate_veg)}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-[#C9A227] fill-current" />
                              {venue.rating?.toFixed(1) || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No venues shortlisted yet</p>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-6">
              <div className="flex justify-end mb-4">
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
                      <Textarea
                        placeholder="Enter your note..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        rows={4}
                        data-testid="note-content"
                      />
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
                      <p className="text-sm text-[#64748B] mb-1">
                        {note.added_by_name} • {formatDateTime(note.created_at)}
                      </p>
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
              <div className="flex justify-end mb-4">
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
                      <div>
                        <p className="font-medium text-[#0B1F3B]">{formatDateTime(fu.scheduled_at)}</p>
                        <p className="text-[#64748B] mt-1">{fu.description}</p>
                        <Badge variant="outline" className="mt-2 capitalize">
                          {fu.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">No follow-ups scheduled</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Management */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Lead Stage</h2>
            <div className="mb-4">
              <Badge className={`${getStageBadgeClass(lead.stage)} text-white text-lg px-4 py-2`}>
                {getStageLabel(lead.stage)}
              </Badge>
            </div>
            <Select value={lead.stage} onValueChange={updateLeadStage} disabled={updating}>
              <SelectTrigger data-testid="stage-select">
                <SelectValue placeholder="Change stage" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Tracking */}
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0B1F3B] mb-4">Commission Tracking</h2>
            <div className="space-y-4">
              <div>
                <Label>Booking Value</Label>
                <Input
                  type="number"
                  placeholder="e.g., 500000"
                  defaultValue={lead.booking_value || ''}
                  onBlur={(e) => updateCommission('booking_value', parseFloat(e.target.value) || null)}
                  className="mt-1"
                  data-testid="booking-value"
                />
              </div>
              <div>
                <Label>Commission %</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  defaultValue={lead.commission_percent || ''}
                  onBlur={(e) => updateCommission('commission_percent', parseFloat(e.target.value) || null)}
                  className="mt-1"
                  data-testid="commission-percent"
                />
              </div>
              {lead.commission_amount > 0 && (
                <div className="p-4 bg-[#F0E6D2]">
                  <p className="text-sm text-[#64748B]">Commission Amount</p>
                  <p className="font-mono text-2xl font-bold text-[#0B1F3B]">
                    {formatIndianCurrencyFull(lead.commission_amount)}
                  </p>
                </div>
              )}
              <div>
                <Label>Commission Status</Label>
                <Select
                  value={lead.commission_status || 'pending'}
                  onValueChange={(v) => updateCommission('commission_status', v)}
                >
                  <SelectTrigger className="mt-1" data-testid="commission-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

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
