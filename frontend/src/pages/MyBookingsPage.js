import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import {
  ChevronLeft, MapPin, Calendar, Users, Clock, Star,
  CheckCircle2, Circle, FileText, User, Eye, MessageSquare,
  CreditCard, Shield, PartyPopper, Lock, Bookmark, ChevronDown,
  Search, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatIndianCurrency } from '@/lib/utils';

const STAGE_STEPS = [
  { key: 'new', label: 'Enquiry Received', icon: FileText },
  { key: 'contacted', label: 'Expert Assigned', icon: User },
  { key: 'site_visit', label: 'Site Visit', icon: Eye },
  { key: 'negotiation', label: 'Negotiation', icon: MessageSquare },
  { key: 'date_locked', label: 'Date Locked', icon: Lock },
  { key: 'deposit_made', label: 'Deposit Made', icon: CreditCard },
  { key: 'final_checks', label: 'Final Checks', icon: Shield },
  { key: 'event_executed', label: 'Event Complete', icon: PartyPopper },
];

const getStageIndex = (stage) => {
  const map = { new: 0, contacted: 1, site_visit: 2, site_visit_done: 2, negotiation: 3, proposal_sent: 3, date_locked: 4, deposit_made: 5, final_checks: 6, event_executed: 7, converted: 7, booking_confirmed: 7, won: 7, closed: -1, lost: -1 };
  return map[stage] ?? 0;
};

const BookingCard = ({ booking }) => {
  const [expanded, setExpanded] = useState(false);
  const stageIdx = getStageIndex(booking.stage);
  const isClosed = ['closed', 'lost'].includes(booking.stage);
  const isComplete = ['won', 'converted', 'event_executed', 'booking_confirmed'].includes(booking.stage);
  const progressPct = isClosed ? 0 : isComplete ? 100 : Math.round((stageIdx / (STAGE_STEPS.length - 1)) * 100);
  const primaryVenue = booking.venues?.[0];

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-[#E5E0D8]/60 shadow-sm" data-testid={`booking-${booking.lead_id}`}>
      {/* Venue image + info header */}
      <div className="relative">
        {primaryVenue?.images?.[0] ? (
          <div className="h-36 sm:h-44 overflow-hidden">
            <img src={primaryVenue.images[0]} alt={primaryVenue.name} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-br from-[#0B0B0D] to-[#1a1a2e]" />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 pt-8">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-white font-bold text-[15px] leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {primaryVenue?.name || booking.event_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Venue'}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-white/70 text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {booking.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.city}</span>}
                {booking.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(booking.event_date)}</span>}
                {(booking.guest_count || booking.guest_count_range) && (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.guest_count || booking.guest_count_range}</span>
                )}
              </div>
            </div>
            <Badge
              className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                isComplete ? 'bg-emerald-500/90 text-white' :
                isClosed ? 'bg-red-500/90 text-white' :
                'bg-[#D4B36A]/90 text-[#0B0B0D]'
              }`}
              data-testid={`booking-status-${booking.lead_id}`}
            >
              {booking.status_label || booking.stage}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress bar + expand */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 border-b border-[#E5E0D8]/40 hover:bg-[#F4F1EC]/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`booking-expand-${booking.lead_id}`}
      >
        <div className="flex-1 h-1.5 bg-[#E5E0D8]/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: isComplete ? '#10B981' : isClosed ? '#EF4444' : 'linear-gradient(90deg, #D4B36A, #F0D78C)'
            }}
          />
        </div>
        <span className="text-[11px] font-bold text-[#0B0B0D]/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {progressPct}%
        </span>
        <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Timeline */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[600px]' : 'max-h-0'}`}>
        <div className="px-4 py-4">
          <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Booking Timeline
          </p>
          {STAGE_STEPS.map((step, i) => {
            const isComp = !isClosed && stageIdx > i;
            const isCurr = !isClosed && stageIdx === i;
            const StepIcon = step.icon;
            const isLast = i === STAGE_STEPS.length - 1;
            return (
              <div key={step.key} className="flex gap-3 relative">
                {!isLast && (
                  <div className="absolute left-[13px] top-7 bottom-0 w-[2px]">
                    <div className={`w-full h-full ${isComp ? 'bg-[#D4B36A]' : 'bg-[#E5E0D8]'}`} />
                  </div>
                )}
                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCurr ? 'bg-[#D4B36A] shadow-[0_0_10px_rgba(212,179,106,0.35)]' :
                  isComp ? 'bg-[#D4B36A]' :
                  'bg-[#F4F1EC] border border-[#E5E0D8]'
                }`}>
                  <StepIcon className={`w-3 h-3 ${isComp || isCurr ? 'text-[#0B0B0D]' : 'text-[#CBD5E1]'}`} strokeWidth={2} />
                </div>
                <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
                  <span className={`text-[12px] ${
                    isCurr ? 'text-[#D4B36A] font-bold' : isComp ? 'text-[#0B0B0D] font-semibold' : 'text-[#CBD5E1]'
                  }`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {step.label}
                    {isCurr && <span className="ml-1.5 text-[8px] bg-[#D4B36A]/10 text-[#D4B36A] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Current</span>}
                    {isComp && <CheckCircle2 className="w-3 h-3 text-emerald-500 inline ml-1" />}
                  </span>
                </div>
              </div>
            );
          })}

          {booking.rm_name && (
            <div className="mt-3 p-3 bg-[#F4F1EC] rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B0B0D] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#D4B36A]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Your Expert</p>
                <p className="text-[11px] text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{booking.rm_name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Venues strip */}
      {booking.venues?.length > 1 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {booking.venues.map(v => (
            <Link key={v.venue_id} to={`/venues/${v.venue_id}`} className="flex-shrink-0 w-20">
              <img src={v.images?.[0]} alt={v.name} className="w-20 h-14 object-cover rounded-lg" loading="lazy" />
              <p className="text-[9px] text-[#64748B] truncate mt-1">{v.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/auth/my-bookings');
        setBookings(res.data.bookings || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetch();
  }, [isAuthenticated]);

  if (!isAuthenticated) { navigate('/login'); return null; }

  const filtered = filter === 'all' ? bookings
    : filter === 'active' ? bookings.filter(b => !['closed', 'lost', 'won', 'converted', 'event_executed'].includes(b.stage))
    : bookings.filter(b => ['won', 'converted', 'event_executed'].includes(b.stage));

  const filters = [
    { key: 'all', label: 'All', count: bookings.length },
    { key: 'active', label: 'Active', count: bookings.filter(b => !['closed', 'lost', 'won', 'converted', 'event_executed'].includes(b.stage)).length },
    { key: 'completed', label: 'Completed', count: bookings.filter(b => ['won', 'converted', 'event_executed'].includes(b.stage)).length },
  ];

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col app-main-content">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-50 bg-[#0B0B0D]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => navigate('/home')} className="w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC] transition-colors" data-testid="bookings-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg text-[#F4F1EC]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>My Bookings</h1>
          </div>
        </header>
      </div>
      <div className="hidden lg:block"><Header /></div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-10 lg:pt-8">
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <button onClick={() => navigate('/home')} className="text-sm text-[#64748B] hover:text-[#0B0B0D] flex items-center gap-1" data-testid="bookings-back-desktop">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-5" data-testid="bookings-filter-row">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                filter === f.key
                  ? 'bg-[#0B0B0D] text-[#D4B36A]'
                  : 'bg-white text-[#64748B] border border-[#E5E0D8] hover:border-[#D4B36A]/50'
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              data-testid={`bookings-filter-${f.key}`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-[#E5E0D8]/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8]/40" data-testid="bookings-empty">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F1EC] flex items-center justify-center">
              <Bookmark className="w-7 h-7 text-[#CBD5E1]" />
            </div>
            <h3 className="text-base font-semibold text-[#0B0B0D] mb-1.5" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </h3>
            <p className="text-sm text-[#64748B] mb-5 max-w-xs mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Start exploring venues and submit an enquiry to begin your event journey
            </p>
            <Button
              onClick={() => navigate('/venues/search')}
              className="bg-[#D4B36A] hover:bg-[#c5a45b] text-[#0B0B0D] font-semibold"
              data-testid="bookings-browse-btn"
            >
              <Search className="w-4 h-4 mr-2" /> Browse Venues
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="bookings-list">
            {filtered.map(b => <BookingCard key={b.lead_id} booking={b} />)}
          </div>
        )}
      </main>

      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
};

export default MyBookingsPage;
