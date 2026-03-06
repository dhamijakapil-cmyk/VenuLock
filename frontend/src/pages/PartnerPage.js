import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Handshake, MapPin, Users, Phone, Mail, Globe, FileText, CheckCircle2, ChevronRight, TrendingUp, ShieldCheck, Sparkles, Briefcase } from 'lucide-react';

const CITIES = ['Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Goa', 'Udaipur', 'Pan India', 'Other'];

const TEAM_SIZES = ['1–5', '6–15', '16–50', '50+'];
const EVENTS_PER_YEAR = ['1–10', '11–30', '31–100', '100+'];

const SERVICES = [
  'Wedding Planning', 'Corporate Events', 'Birthday / Social', 'Conference & Seminars',
  'Product Launches', 'Destination Events', 'Décor & Styling', 'Catering',
];

const PERKS = [
  { icon: TrendingUp, title: 'Access to Premium Venues', desc: 'Get priority access to our entire network of 500+ verified venues across India.' },
  { icon: ShieldCheck, title: 'Guaranteed Commissions', desc: 'Earn a competitive commission on every booking facilitated through VenuLock.' },
  { icon: Sparkles, title: 'Co-branded Marketing', desc: 'Get featured on our platform — reach customers actively searching for planners.' },
  { icon: Briefcase, title: 'Dedicated Account Manager', desc: 'A dedicated VenuLock account manager handles all coordination on your behalf.' },
];

export default function PartnerPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: '',
    service_area: '',
    team_size: '',
    events_per_year: '',
    description: '',
    website: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (s) => setSelectedServices(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_name || !form.phone || !form.email || !form.city) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/partner-applications', { ...form, services_offered: selectedServices });
      setAppId(res.data.app_id);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A960]/30 bg-white";

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Header />

      {/* Hero */}
      <div className="bg-[#111111] text-white pt-16 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-[#C8A960] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Handshake className="h-3.5 w-3.5" />
            For Event Companies
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-4">
            Partner with VenuLock
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Join our network of event management partners and unlock access to a curated pipeline of
            qualified customers, premium venues, and co-marketing opportunities.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-12">

        {/* Left: Perks */}
        <div className="space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#111111] mb-2">Why partner with us?</h2>
            <p className="text-[#64748B]">We're building India's most trusted managed event marketplace — and we want you on the journey.</p>
          </div>

          <div className="space-y-5">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#C8A960]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-[#C8A960]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111111] text-sm mb-1">{p.title}</h3>
                    <p className="text-[#64748B] text-sm">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-[#C8A960]/10 to-[#C8A960]/5 border border-[#C8A960]/20 rounded-2xl p-6">
            <p className="text-[#111111] font-semibold text-sm mb-3">Who should apply?</p>
            {[
              'Wedding & event planning companies',
              'Décor, catering, and vendor firms',
              'Corporate event management agencies',
              'Freelance event professionals with a team',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#C8A960] flex-shrink-0" />
                <span className="text-[#374151] text-sm">{item}</span>
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
              <h3 className="font-serif text-2xl font-bold text-[#111111] mb-2">We'll Be in Touch!</h3>
              <p className="text-[#64748B] mb-2">Your partnership application is under review. Expect a call within 2 business days.</p>
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
                <h3 className="font-serif text-xl font-bold text-[#111111] mb-1">Tell Us About Your Company</h3>
                <p className="text-[#64748B] text-sm">We review every application personally.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">Company Name <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Your company name" className={`${inputCls} pl-10`} data-testid="company-name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">Primary City <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <select value={form.city} onChange={e => set('city', e.target.value)} className={`${inputCls} pl-10 appearance-none`} data-testid="partner-city">
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] block mb-1.5">Team Size</label>
                  <div className="flex gap-2 flex-wrap">
                    {TEAM_SIZES.map(s => (
                      <button key={s} type="button" onClick={() => set('team_size', s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.team_size === s ? 'bg-[#111111] text-white border-[#111111]' : 'border-[#E5E7EB] text-[#374151] hover:border-[#C8A960]'}`}
                        data-testid={`team-size-${s}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] block mb-1.5">Events Per Year</label>
                  <div className="flex gap-2 flex-wrap">
                    {EVENTS_PER_YEAR.map(e => (
                      <button key={e} type="button" onClick={() => set('events_per_year', e)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.events_per_year === e ? 'bg-[#111111] text-white border-[#111111]' : 'border-[#E5E7EB] text-[#374151] hover:border-[#C8A960]'}`}
                        data-testid={`events-${e}`}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="text-xs text-[#64748B] block mb-2">Services Offered</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(s => (
                    <button key={s} type="button" onClick={() => toggleService(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedServices.includes(s) ? 'bg-[#C8A960] text-white border-[#C8A960]' : 'border-[#E5E7EB] text-[#374151] hover:border-[#C8A960]'}`}
                      data-testid={`service-${s.toLowerCase().replace(/\s/g, '-')}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F3F4F6] pt-4">
                <h4 className="text-xs font-semibold text-[#374151] uppercase tracking-wider mb-3">Contact Details</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Contact Name <span className="text-red-400">*</span></label>
                    <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Your name" className={inputCls} data-testid="contact-name" />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Phone <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                      <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" className={`${inputCls} pl-10`} data-testid="partner-phone" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Email <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" className={`${inputCls} pl-10`} data-testid="partner-email" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1.5">Website (optional)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                      <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourcompany.com" className={`${inputCls} pl-10`} data-testid="partner-website" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#64748B] block mb-1.5">About Your Company (optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tell us about your work, typical clients, and what makes your company stand out..." className={`${inputCls} pl-10 resize-none`} data-testid="partner-description" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#C8A960] hover:bg-[#B5912F] text-white font-semibold text-sm transition-colors disabled:opacity-60"
                data-testid="submit-partner-application"
              >
                {loading ? 'Submitting...' : 'Submit Partnership Application'}
              </button>

              <p className="text-center text-xs text-[#9CA3AF]">
                We personally review every application and respond within 2 business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
