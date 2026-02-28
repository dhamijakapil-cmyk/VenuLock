import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Send, CheckCircle } from 'lucide-react';
import { api } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { EVENT_TYPES, cn } from '@/lib/utils';
import { toast } from 'sonner';

const EnquiryForm = ({ venue, isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [date, setDate] = useState(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.event_type) {
      toast.error('Please fill in all required fields');
      return;
    }

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
      });
      setSuccess(true);
      toast.success('Enquiry submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#064E3B] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#0B1F3B] mb-2">
              Enquiry Submitted!
            </h3>
            <p className="text-[#64748B] mb-6">
              Thank you for your interest in {venue.name}. Our relationship manager will contact you shortly.
            </p>
            <Button
              onClick={() => {
                onClose();
                if (user) navigate('/my-enquiries');
              }}
              className="bg-[#0B1F3B] hover:bg-[#153055]"
              data-testid="view-enquiries-btn"
            >
              {user ? 'View My Enquiries' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Enquire Now</DialogTitle>
          <DialogDescription>
            Submit your enquiry for {venue.name}. Our team will get back to you within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_name">Full Name *</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                data-testid="enquiry-name"
              />
            </div>
            <div>
              <Label htmlFor="customer_phone">Phone Number *</Label>
              <Input
                id="customer_phone"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                required
                data-testid="enquiry-phone"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customer_email">Email Address *</Label>
            <Input
              id="customer_email"
              name="customer_email"
              type="email"
              value={formData.customer_email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
              data-testid="enquiry-email"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger data-testid="enquiry-event-type">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                    data-testid="enquiry-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guest_count">Expected Guests</Label>
              <Input
                id="guest_count"
                name="guest_count"
                type="number"
                value={formData.guest_count}
                onChange={handleChange}
                placeholder="e.g., 300"
                data-testid="enquiry-guests"
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget (INR)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g., 500000"
                data-testid="enquiry-budget"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="preferences">Additional Requirements</Label>
            <Textarea
              id="preferences"
              name="preferences"
              value={formData.preferences}
              onChange={handleChange}
              placeholder="Any specific requirements or preferences..."
              rows={3}
              data-testid="enquiry-preferences"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-semibold"
            disabled={loading}
            data-testid="submit-enquiry-btn"
          >
            {loading ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Enquiry
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnquiryForm;
