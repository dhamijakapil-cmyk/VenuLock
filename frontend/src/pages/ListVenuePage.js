import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Building2, MapPin, Users, Phone, Mail, Globe, FileText, CheckCircle2, ChevronRight, Star, IndianRupee, Zap } from 'lucide-react';

const VENUE_TYPES = [
  'Banquet Hall', 'Farmhouse', 'Hotel', 'Rooftop', 'Convention Centre',
  'Resort', 'Clubhouse', 'Restaurant', 'Palace / Heritage', 'Other',
];

const CITIES = ['Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur', 'Other'];

const BENEFITS = [
  { icon: Zap, title: 'Instant Lead Pipeline', desc: 'Get qualified enquiries from verified customers actively looking for venues.' },
  { icon: Star, title: 'Dedicated RM Support', desc: 'Our Relationship Managers handle negotiations, site visits, and customer communication.' },
  { icon: IndianRupee, title: 'Zero Upfront Cost', desc: 'List for free. We charge a small commission only on confirmed bookings.' },
  { icon: CheckCircle2, title: 'Verified Badge', desc: 'All listed venues get a "Managed by BMV" badge — building trust with customers.' },
];

export default function ListVenuePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState('');
  const [form, setForm] = useState({
    venue_name: '',
    owner_name: '',
    phone: '',
    email: '',
    city: '',
    venue_type: '',
    capacity_min: '',
    capacity_max: '',
    description: '',
    website: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.venue_name || !form.owner_name || !form.phone || !form.email || !form.city) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        capacity_min: form.capacity_min ? parseInt(form.capacity_min) : null,
        capacity_max: form.capacity_max ? parseInt(form.capacity_max) : null,
      };
      const res = await api.post('/venue-applications', payload);
      setAppId(res.data.app_id);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 bg-white";

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header />

      {/* Hero */}
      <div className="bg-[#111111] text-white pt-16 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-[#D4B36A] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Building2 className="h-3.5 w-3.5" />
            For Venue Owners
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-4">
            List Your Venue on VenuLoQ
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Reach thousands of customers planning weddings, corporate events, and celebrations.
            We bring you qualified leads — you focus on hosting unforgettable events.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-12">

        {/* Left: Benefits */}
        <div className="space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#111111] mb-2">Why list with us?</h2>
            <p className="text-[#64748B]">Join 50+ premium venues already growing their bookings through VenuLoQ.</p>
          </div>

          <div className="space-y-5">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D4B36A]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-[#D4B36A]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111111] text-sm mb-1">{b.title}</h3>
                    <p className="text-[#64748B] text-sm">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#111111] rounded-2xl p-6 text-white">
            <p className="text-[#D4B36A] text-xs font-semibold uppercase tracking-wider mb-2">How it works</p>
            {['Submit your application', 'Our team reviews & approves (2 days)', 'Get listed & start receiving leads', 'We negotiate — you host'].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="w-6 h-6 rounded-full bg-[#D4B36A]/20 text-[#D4B36A] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span className="text-sm text-slate-300">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-3xl shadow-xl shadow-black/[0.06] p-8">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#111111] mb-2">Application Received!</h3>
              <p className="text-[#64748B] mb-2">We'll review your venue and get back to you within 2 business days.</p>
              <p className="text-xs text-[#9CA3AF] mb-8">Reference: <span className="font-mono font-medium">{appId}</span></p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111111] text-white text-sm font-medium hover:bg-[#153055] transition-colors"
              >
                Back to Home <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#111111] mb-1">Venue Details</h3>
                <p className="text-[#64748B] text-sm">Fill in your venue information below.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">
                    Venue Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <input value={form.venue_name} onChange={e => set('venue_name', e.target.value)} placeholder="e.g. The Grand Palace" className={`${inputCls} pl-10`} data-testid="venue-name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">
                    City <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <select value={form.city} onChange={e => set('city', e.target.value)} className={`${inputCls} pl-10 appearance-none`} data-testid="venue-city">
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">Venue Type</label>
                  <select value={form.venue_type} onChange={e => set('venue_type', e.target.value)} className={`${inputCls} appearance-none`} data-testid="venue-type-select">
                    <option value="">Select type</option>
                    {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">Capacity Range</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
                      <input type="number" value={form.capacity_min} onChange={e => set('capacity_min', e.target.value)} placeholder="Min" className={`${inputCls} pl-8`} data-testid="capacity-min" />
                    </div>
                    <div className="flex items-center text-[#9CA3AF] text-sm">–</div>
                    <input type="number" value={form.capacity_max} onChange={e => set('capacity_max', e.target.value)} placeholder="Max" className={`${inputCls} w-20`} data-testid="capacity-max" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F3F4F6] pt-4">
                <h4 className="text-xs font-semibold text-[#374151] uppercase tracking-wider mb-3">Your Contact</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Your Name <span className="text-red-400">*</span></label>
                    <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Full name" className={inputCls} data-testid="owner-name" />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Phone <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                      <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" className={`${inputCls} pl-10`} data-testid="owner-phone" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Email <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@venue.com" className={`${inputCls} pl-10`} data-testid="owner-email" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Website (optional)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                      <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourvenue.com" className={`${inputCls} pl-10`} data-testid="venue-website" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#64748B] block mb-1.5">Brief Description (optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tell us about your venue — ambiance, specialties, unique features..." className={`${inputCls} pl-10 resize-none`} data-testid="venue-description" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#D4B36A] hover:bg-[#B5912F] text-white font-semibold text-sm transition-colors disabled:opacity-60"
                data-testid="submit-venue-application"
              >
                {loading ? 'Submitting...' : 'Submit Venue Application'}
              </button>

              <p className="text-center text-xs text-[#9CA3AF]">
                Our team reviews every application. You'll hear from us within 2 business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
