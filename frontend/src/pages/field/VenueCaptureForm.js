import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronRight, ChevronLeft, MapPin, Camera, Save,
  Send, X, Plus, Building2, Users, IndianRupee, Phone, Mail,
  FileText, CheckCircle2, Loader2, Image as ImageIcon,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STEPS = [
  { id: 'basics', label: 'Basics', icon: Building2 },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'capacity', label: 'Capacity & Price', icon: IndianRupee },
  { id: 'media', label: 'Photos', icon: Camera },
  { id: 'notes', label: 'Notes & Outcome', icon: FileText },
];

const VENUE_TYPES = [
  'banquet_hall', 'hotel', 'farmhouse', 'resort', 'villa', 'rooftop',
  'garden', 'temple', 'palace', 'club', 'convention_center', 'restaurant', 'other',
];

const INTEREST_LEVELS = [
  { value: 'hot', label: 'Hot', color: 'bg-emerald-500' },
  { value: 'warm', label: 'Warm', color: 'bg-amber-400' },
  { value: 'cold', label: 'Cold', color: 'bg-blue-400' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-400' },
];

const OUTCOMES = ['Interested — send onboarding link', 'Interested — needs follow-up', 'Maybe — revisit later', 'Not interested', 'Owner unavailable'];

export default function VenueCaptureForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id && id !== 'new';
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acqId, setAcqId] = useState(isEdit ? id : null);
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    venue_name: '', owner_name: '', owner_phone: '', owner_email: '',
    city: '', locality: '', address: '', latitude: null, longitude: null,
    venue_type: '', capacity_min: '', capacity_max: '',
    indoor_outdoor: '', pricing_band_min: '', pricing_band_max: '',
    event_types: [], amenity_tags: [], vibe_tags: [],
    notes: '', meeting_outcome: '', owner_interest: '',
    next_followup_date: '', is_decision_maker: null,
    negotiation_flexibility: '', commercial_model_open: null,
  });

  // Load existing acquisition for edit
  useEffect(() => {
    if (isEdit) {
      api.get(`/acquisitions/${id}`).then(res => {
        const d = res.data;
        setForm(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(d).filter(([k]) => k in prev).map(([k, v]) => [k, v ?? prev[k]])),
          capacity_min: d.capacity_min?.toString() || '',
          capacity_max: d.capacity_max?.toString() || '',
          pricing_band_min: d.pricing_band_min?.toString() || '',
          pricing_band_max: d.pricing_band_max?.toString() || '',
        }));
        setPhotos(d.photos || []);
        setAcqId(d.acquisition_id);
      }).catch(err => { toast.error('Failed to load capture'); navigate('/field'); });
    }
  }, [isEdit, id, navigate]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const saveDraft = async () => {
    if (!form.venue_name.trim()) { toast.error('Venue name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity_min: form.capacity_min ? parseInt(form.capacity_min) : undefined,
        capacity_max: form.capacity_max ? parseInt(form.capacity_max) : undefined,
        pricing_band_min: form.pricing_band_min ? parseFloat(form.pricing_band_min) : undefined,
        pricing_band_max: form.pricing_band_max ? parseFloat(form.pricing_band_max) : undefined,
      };
      // Remove empty strings
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });

      if (acqId) {
        await api.put(`/acquisitions/${acqId}`, payload);
        toast.success('Draft saved');
      } else {
        const res = await api.post('/acquisitions/', payload);
        setAcqId(res.data.acquisition_id);
        toast.success('Draft created');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!acqId) { await saveDraft(); }
    setSubmitting(true);
    try {
      // Save latest first
      const payload = {
        ...form,
        capacity_min: form.capacity_min ? parseInt(form.capacity_min) : undefined,
        capacity_max: form.capacity_max ? parseInt(form.capacity_max) : undefined,
        pricing_band_min: form.pricing_band_min ? parseFloat(form.pricing_band_min) : undefined,
        pricing_band_max: form.pricing_band_max ? parseFloat(form.pricing_band_max) : undefined,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });
      if (acqId) await api.put(`/acquisitions/${acqId}`, payload);
      else {
        const res = await api.post('/acquisitions/', payload);
        setAcqId(res.data.acquisition_id);
      }

      const currentId = acqId || (await api.get('/acquisitions/?my_only=true')).data.acquisitions[0]?.acquisition_id;
      await api.post(`/acquisitions/${currentId}/status`, { new_status: 'submitted_for_review' });
      toast.success('Submitted for review!');
      navigate('/field');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (!acqId) { toast.error('Save draft first before uploading photos'); return; }

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await api.post(`/acquisitions/${acqId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(prev => [...prev, ...(res.data.photos || [])]);
      toast.success(`${res.data.uploaded} photo(s) uploaded`);
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('latitude', pos.coords.latitude);
        set('longitude', pos.coords.longitude);
        toast.success('Location captured');
      },
      () => toast.error('Location access denied'),
      { enableHighAccuracy: true }
    );
  };

  const stepContent = () => {
    switch (STEPS[step].id) {
      case 'basics': return (
        <div className="space-y-4">
          <Field label="Venue Name" required>
            <input value={form.venue_name} onChange={e => set('venue_name', e.target.value)}
              placeholder="e.g. Royal Garden Banquet" className="input-field" data-testid="field-venue-name" />
          </Field>
          <Field label="Venue Type" required>
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPES.map(t => (
                <button key={t} onClick={() => set('venue_type', t)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                    form.venue_type === t ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#64748B] border-slate-200'
                  }`} style={sans} data-testid={`type-${t}`}>
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Owner / Contact Name" required>
            <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
              placeholder="Full name" className="input-field" data-testid="field-owner-name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" required>
              <input value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)}
                placeholder="98765 43210" type="tel" className="input-field" data-testid="field-phone" />
            </Field>
            <Field label="Email">
              <input value={form.owner_email} onChange={e => set('owner_email', e.target.value)}
                placeholder="owner@email.com" type="email" className="input-field" data-testid="field-email" />
            </Field>
          </div>
          <Field label="Indoor / Outdoor">
            <div className="flex gap-2">
              {['indoor', 'outdoor', 'both'].map(o => (
                <button key={o} onClick={() => set('indoor_outdoor', o)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all capitalize ${
                    form.indoor_outdoor === o ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#64748B] border-slate-200'
                  }`} style={sans} data-testid={`setting-${o}`}>
                  {o}
                </button>
              ))}
            </div>
          </Field>
        </div>
      );

      case 'location': return (
        <div className="space-y-4">
          <Field label="City" required>
            <input value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="e.g. Delhi" className="input-field" data-testid="field-city" />
          </Field>
          <Field label="Locality / Area" required>
            <input value={form.locality} onChange={e => set('locality', e.target.value)}
              placeholder="e.g. Karol Bagh" className="input-field" data-testid="field-locality" />
          </Field>
          <Field label="Full Address">
            <textarea value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Complete address..." className="input-field min-h-[70px] resize-none" data-testid="field-address" />
          </Field>
          <Field label="GPS Location">
            <button onClick={getLocation}
              className="w-full flex items-center justify-center gap-2 h-11 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-[#0B0B0D] active:bg-slate-50 transition-colors"
              data-testid="capture-gps-btn" style={sans}>
              <MapPin className="w-4 h-4 text-[#D4B36A]" />
              {form.latitude ? `${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}` : 'Capture Current Location'}
            </button>
          </Field>
        </div>
      );

      case 'capacity': return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Guests" required>
              <input value={form.capacity_min} onChange={e => set('capacity_min', e.target.value)}
                placeholder="50" type="number" inputMode="numeric" className="input-field" data-testid="field-cap-min" />
            </Field>
            <Field label="Max Guests" required>
              <input value={form.capacity_max} onChange={e => set('capacity_max', e.target.value)}
                placeholder="500" type="number" inputMode="numeric" className="input-field" data-testid="field-cap-max" />
            </Field>
          </div>
          <p className="text-[10px] text-[#64748B] -mt-2" style={sans}>Approximate range is fine. Can refine later.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price/plate from (₹)" required>
              <input value={form.pricing_band_min} onChange={e => set('pricing_band_min', e.target.value)}
                placeholder="1500" type="number" inputMode="numeric" className="input-field" data-testid="field-price-min" />
            </Field>
            <Field label="Price/plate to (₹)">
              <input value={form.pricing_band_max} onChange={e => set('pricing_band_max', e.target.value)}
                placeholder="3000" type="number" inputMode="numeric" className="input-field" data-testid="field-price-max" />
            </Field>
          </div>
          <p className="text-[10px] text-[#64748B] -mt-2" style={sans}>Rough band is enough. Owner can confirm later.</p>
        </div>
      );

      case 'media': return (
        <div className="space-y-4">
          <p className="text-[11px] text-[#64748B]" style={sans}>
            {acqId ? 'Tap to upload venue photos from camera or gallery.' : 'Save draft first, then upload photos.'}
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment"
            onChange={handlePhotoUpload} className="hidden" />
          <button onClick={() => acqId ? fileInputRef.current?.click() : toast.error('Save draft first')}
            className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 active:bg-slate-50 transition-colors"
            data-testid="upload-photos-btn">
            <Camera className="w-6 h-6 text-[#D4B36A]" />
            <span className="text-[12px] font-medium text-[#64748B]" style={sans}>Tap to add photos</span>
          </button>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={p.url?.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${p.url}` : p.url}
                    alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="bg-[#FDFBF5] rounded-xl border border-[#D4B36A]/15 p-3">
            <p className="text-[10px] font-bold text-[#8B7330] mb-1" style={sans}>Photo Guide</p>
            <div className="space-y-1">
              {['Facade / entrance', 'Main hall / event area', 'Stage / seating', 'Outdoor area (if any)'].map(g => (
                <div key={g} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#D4B36A]" />
                  <span className="text-[10px] text-[#64748B]" style={sans}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      case 'notes': return (
        <div className="space-y-4">
          <Field label="Owner Interest Level" required>
            <div className="flex gap-2">
              {INTEREST_LEVELS.map(il => (
                <button key={il.value} onClick={() => set('owner_interest', il.value)}
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                    form.owner_interest === il.value
                      ? `${il.color} text-white border-transparent`
                      : 'bg-white text-[#64748B] border-slate-200'
                  }`} style={sans} data-testid={`interest-${il.value}`}>
                  {il.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Meeting Outcome">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {OUTCOMES.map(o => (
                <button key={o} onClick={() => set('meeting_outcome', o)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                    form.meeting_outcome === o ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#64748B] border-slate-200'
                  }`} style={sans}>
                  {o}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes / Observations">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Anything useful from the visit..." className="input-field min-h-[100px] resize-none" data-testid="field-notes" />
          </Field>
          <Field label="Next Follow-up Date">
            <input type="date" value={form.next_followup_date} onChange={e => set('next_followup_date', e.target.value)}
              className="input-field" data-testid="field-followup" />
          </Field>
          <Field label="Is this the decision-maker?">
            <div className="flex gap-2">
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => set('is_decision_maker', v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                    form.is_decision_maker === v ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#64748B] border-slate-200'
                  }`} style={sans}>
                  {v ? 'Yes' : 'No / Unsure'}
                </button>
              ))}
            </div>
          </Field>
        </div>
      );

      default: return null;
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="venue-capture-form">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/field')} className="flex items-center gap-1.5 text-white/60" data-testid="capture-back">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[11px]" style={sans}>Back</span>
          </button>
          <button onClick={saveDraft} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-white/80 text-[11px] font-medium active:bg-white/20 transition-colors"
            data-testid="save-draft-btn" style={sans}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Draft
          </button>
        </div>
        <h1 className="text-[18px] font-bold text-white" style={sans}>
          {isEdit ? 'Edit Capture' : 'New Venue Capture'}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-black/[0.05] px-4 py-2.5">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                  active ? 'bg-[#0B0B0D] text-white' : done ? 'bg-[#D4B36A]/10 text-[#8B7330]' : 'text-[#9CA3AF]'
                }`} style={sans}>
                <Icon className="w-3 h-3" strokeWidth={1.5} />
                <span className="hidden sm:inline">{s.label}</span>
                {i < STEPS.length - 1 && <span className="text-slate-300 ml-1">{'>'}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-0.5 mt-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-[#D4B36A]' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 py-4 pb-28">
        <h2 className="text-[15px] font-bold text-[#0B0B0D] mb-3" style={sans}>
          {STEPS[step].label}
        </h2>
        {stepContent()}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3 flex gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-xl active:bg-slate-50 transition-colors"
            data-testid="step-back">
            <ChevronLeft className="w-5 h-5 text-[#64748B]" />
          </button>
        )}
        {!isLastStep ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 h-12 bg-[#0B0B0D] text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            data-testid="step-next" style={sans}>
            Next: {STEPS[step + 1]?.label}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submitForReview} disabled={submitting}
            className="flex-1 h-12 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            data-testid="submit-review-btn" style={sans}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for Review
          </button>
        )}
      </div>

      <style>{`
        .input-field {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 12px;
          font-size: 14px;
          color: #0B0B0D;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: #D4B36A; }
        .input-field::placeholder { color: #9CA3AF; }
        textarea.input-field { padding: 12px 14px; height: auto; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[11px] font-bold text-[#0B0B0D] mb-1.5 uppercase tracking-[0.1em]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
        {required && <span className="text-[#D4B36A]">*</span>}
      </label>
      {children}
    </div>
  );
}
