import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  X,
  Clock,
  AlertCircle,
  Building2,
} from 'lucide-react';

const AVAILABILITY_COLORS = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200',
  tentative: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
  blocked: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
  booked: 'bg-blue-100 text-blue-700 border-blue-300',
};

const AVAILABILITY_LABELS = {
  available: 'Available',
  tentative: 'Tentative',
  blocked: 'Blocked',
  booked: 'Booked',
};

const TIME_SLOTS = [
  { value: 'full_day', label: 'Full Day' },
  { value: 'morning', label: 'Morning (6AM-12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM-6PM)' },
  { value: 'evening', label: 'Evening (6PM-12AM)' },
];

const VenueAvailabilityCalendar = () => {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('blocked');
  const [bulkTimeSlot, setBulkTimeSlot] = useState('full_day');
  const [bulkNotes, setBulkNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      fetchAvailability();
    }
  }, [selectedVenue, currentMonth]);

  const fetchVenues = async () => {
    try {
      const response = await api.get('/my-venues');
      // /my-venues returns array directly, not {venues: []}
      const venueList = Array.isArray(response.data) ? response.data : (response.data.venues || []);
      setVenues(venueList);
      if (venueList.length > 0) {
        setSelectedVenue(venueList[0]);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedVenue) return;
    
    try {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const response = await api.get(`/venues/${selectedVenue.venue_id}/availability?month=${monthStr}`);
      
      // Convert array to object keyed by date
      const availMap = {};
      (response.data.slots || []).forEach(slot => {
        availMap[slot.date] = slot;
      });
      setAvailability(availMap);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    const dateStr = formatDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't allow selecting past dates
    if (date < today) return;
    
    // Don't allow modifying booked dates
    if (availability[dateStr]?.status === 'booked') {
      toast.error('Cannot modify booked dates');
      return;
    }
    
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      }
      return [...prev, dateStr];
    });
  };

  const handleBulkUpdate = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date');
      return;
    }
    
    setSaving(true);
    try {
      await api.post(`/venues/${selectedVenue.venue_id}/availability/bulk`, {
        dates: selectedDates,
        status: bulkStatus,
        time_slot: bulkTimeSlot,
        notes: bulkNotes
      });
      
      toast.success(`Updated ${selectedDates.length} dates`);
      setDialogOpen(false);
      setSelectedDates([]);
      setBulkNotes('');
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setSelectedDates([]);
  };

  if (loading) {
    return (
      <DashboardLayout title="Availability Calendar" breadcrumbs={[{ label: 'Venue Owner' }, { label: 'Calendar' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (venues.length === 0) {
    return (
      <DashboardLayout title="Availability Calendar" breadcrumbs={[{ label: 'Venue Owner' }, { label: 'Calendar' }]}>
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#111111] mb-2">No Venues Found</h2>
          <p className="text-[#64748B]">You don't have any venues registered yet.</p>
        </div>
      </DashboardLayout>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <DashboardLayout 
      title="Availability Calendar" 
      breadcrumbs={[{ label: 'Venue Owner' }, { label: 'Calendar' }]}
    >
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Venue Selector */}
          <div className="flex items-center gap-4">
            <Select 
              value={selectedVenue?.venue_id} 
              onValueChange={(id) => setSelectedVenue(venues.find(v => v.venue_id === id))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(venue => (
                  <SelectItem key={venue.venue_id} value={venue.venue_id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            {Object.entries(AVAILABILITY_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded ${AVAILABILITY_COLORS[status].split(' ')[0]}`} />
                <span className="text-[#64748B]">{label}</span>
              </div>
            ))}
          </div>
          
          {/* Actions */}
          {selectedDates.length > 0 && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-[#F5C84C] hover:bg-[#B8922A] text-[#111111]"
            >
              Update {selectedDates.length} Date{selectedDates.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-slate-200">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-serif text-xl font-semibold text-[#111111]">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-[#64748B] py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-20" />;
              }
              
              const dateStr = formatDate(date);
              const slot = availability[dateStr];
              const status = slot?.status || 'available';
              const isPast = date < today;
              const isSelected = selectedDates.includes(dateStr);
              const isToday = date.toDateString() === today.toDateString();
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  disabled={isPast}
                  className={`
                    h-20 p-2 rounded-lg border-2 text-left transition-all relative
                    ${isPast ? 'bg-slate-50 text-slate-300 cursor-not-allowed border-transparent' :
                      isSelected ? 'ring-2 ring-[#F5C84C] ring-offset-2' :
                      AVAILABILITY_COLORS[status]}
                    ${isToday ? 'ring-2 ring-blue-400' : ''}
                  `}
                  data-testid={`calendar-day-${dateStr}`}
                >
                  <span className={`text-sm font-semibold ${isPast ? 'text-slate-300' : ''}`}>
                    {date.getDate()}
                  </span>
                  
                  {!isPast && status !== 'available' && (
                    <div className="mt-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${
                        status === 'tentative' ? 'bg-amber-200 text-amber-800' :
                        status === 'blocked' ? 'bg-red-200 text-red-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {AVAILABILITY_LABELS[status]}
                      </Badge>
                    </div>
                  )}
                  
                  {slot?.hold_id && (
                    <Clock className="absolute bottom-1 right-1 w-3 h-3 text-amber-600" />
                  )}
                  
                  {isSelected && (
                    <Check className="absolute top-1 right-1 w-4 h-4 text-[#F5C84C]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
        {Object.entries(AVAILABILITY_LABELS).map(([status, label]) => {
          const count = Object.values(availability).filter(s => s.status === status).length;
          return (
            <div key={status} className="bg-white border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-[#111111]">{count}</p>
              <p className="text-sm text-[#64748B]">{label} Days</p>
            </div>
          );
        })}
      </div>

      {/* Bulk Update Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Update Availability</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-[#64748B]">
              Update {selectedDates.length} selected date{selectedDates.length > 1 ? 's' : ''}
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111111]">Status</label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="tentative">Tentative</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111111]">Time Slot</label>
              <Select value={bulkTimeSlot} onValueChange={setBulkTimeSlot}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111111]">Notes (Optional)</label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add a note..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUpdate} 
              disabled={saving}
              className="bg-[#F5C84C] hover:bg-[#B8922A] text-[#111111]"
            >
              {saving ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default VenueAvailabilityCalendar;
