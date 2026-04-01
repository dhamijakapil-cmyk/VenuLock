import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Zap, MapPin, Camera, Save, Building2, Users,
  Phone, ChevronDown, AlertTriangle, CheckCircle2, Loader2, X,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const VENUE_TYPES = [
  'banquet_hall', 'hotel', 'farmhouse', 'resort', 'villa', 'rooftop',
  'garden', 'temple', 'palace', 'club', 'convention_center', 'restaurant', 'other',
];

const INTEREST_LEVELS = [
  { value: 'hot', label: 'Hot', color: 'bg-emerald-500 text-white' },
  { value: 'warm', label: 'Warm', color: 'bg-amber-400 text-white' },
  { value: 'cold', label: 'Cold', color: 'bg-blue-400 text-white' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-400 text-white' },
];

const CAPACITY_PRESETS = [
  { label: '< 100', min: 0, max: 100 },
  { label: '100-300', min: 100, max: 300 },
  { label: '300-500', min: 300, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000+', min: 1000, max: 2000 },
];

export default function QuickCaptureScreen() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDupeWarning, setShowDupeWarning] = useState(false);
  const [skipDupeCheck, setSkipDupeCheck] = useState(false);
  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const dupeTimerRef = useRef(null);

  const [form, setForm] = useState({
    venue_name: '', owner_name: '', owner_phone: '',
    city: '', locality: '', venue_type: '',
    capacity_min: '', capacity_max: '',
    owner_interest: '',
    pricing_band_min: '', notes: '', next_followup_date: '',
    latitude: null, longitude: null,
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Dedupe check on venue_name + phone blur
  const checkDuplicate = useCallback(async () => {
    if (skipDupeCheck) return;
    const name = form.venue_name.trim();
    if (name.length < 3) return;
    try {
      const res = await api.post('/acquisitions/check-duplicate', {
        venue_name: name,
        owner_phone: form.owner_phone.trim() || undefined,
        locality: form.locality.trim() || undefined,
      });
      const dupes = res.data.duplicates || [];
      setDuplicates(dupes);
      if (dupes.length > 0) setShowDupeWarning(true);
    } catch {}
  }, [form.venue_name, form.owner_phone, form.locality, skipDupeCheck]);

  const debouncedDupeCheck = useCallback((field) => {
    if (dupeTimerRef.current) clearTimeout(dupeTimerRef.current);
    dupeTimerRef.current = setTimeout(() => checkDuplicate(), 800);
  }, [checkDuplicate]);

  const setCapacity = (preset) => {
    set('capacity_min', preset.min.toString());
    set('capacity_max', preset.max.toString());
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('GPS not available'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('latitude', pos.coords.latitude);
        set('longitude', pos.coords.longitude);
        toast.success('Location pinned');
      },
      () => toast.error('Location denied'),
      { enableHighAccuracy: true }
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(file);
  };

  const saveQuickCapture = async () => {
    // Validate required fields
    const missing = [];
    if (!form.venue_name.trim()) missing.push('Venue Name');
    if (!form.owner_name.trim()) missing.push('Contact Name');
    if (!form.owner_phone.trim()) missing.push('Phone');
    if (!form.city.trim()) missing.push('City');
    if (!form.locality.trim() && !form.latitude) missing.push('Locality or GPS');
    if (!form.venue_type) missing.push('Venue Type');
    if (!form.capacity_min && !form.capacity_max) missing.push('Capacity');
    if (!form.owner_interest) missing.push('Interest Level');

    if (missing.length > 0) {
      toast.error(`Fill required: ${missing.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        capture_mode: 'quick',
        capacity_min: form.capacity_min ? parseInt(form.capacity_min) : undefined,
        capacity_max: form.capacity_max ? parseInt(form.capacity_max) : undefined,
        pricing_band_min: form.pricing_band_min ? parseFloat(form.pricing_band_min) : undefined,
      };
      Object.keys(payload).forEach(k => {
        if (payload[k] === '' || payload[k] === undefined || payload[k] === null) delete payload[k];
      });

      const res = await api.post('/acquisitions/', payload);
      const acqId = res.data.acquisition_id;

      // Upload photo if taken
      if (photo && acqId) {
        const fd = new FormData();
        fd.append('files', photo);
        try {
          await api.post(`/acquisitions/${acqId}/photos`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {}
      }

      toast.success('Quick capture saved');
      navigate('/team/field');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const selectedCapacity = CAPACITY_PRESETS.find(
    p => p.min.toString() === form.capacity_min && p.max.toString() === form.capacity_max
  );

  return (
    <div className="min-h-screen bg-[#FAFBF9]" data-testid="quick-capture-screen">
      {/* Header */}
      <div className="bg-[#0B0B0D] px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 8px) + 12px)' }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/team/field')} className="flex items-center gap-1.5 text-white/60" data-testid="quick-back">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[11px]" style={sans}>Back</span>
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#D4B36A]/20 rounded-full">
            <Zap className="w-3 h-3 text-[#D4B36A]" />
            <span className="text-[10px] font-bold text-[#D4B36A]" style={sans}>QUICK MODE</span>
          </div>
        </div>
        <h1 className="text-[20px] font-bold text-white" style={sans}>Quick Capture</h1>
        <p className="text-[11px] text-white/50 mt-0.5" style={sans}>Fast draft — complete details later</p>
      </div>

      {/* Duplicate Warning */}
      {showDupeWarning && duplicates.length > 0 && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3" data-testid="dupe-warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-amber-800" style={sans}>Possible duplicate found</p>
              {duplicates.map(d => (
                <p key={d.acquisition_id} className="text-[10px] text-amber-700 mt-0.5" style={sans}>
                  {d.venue_name} — {d.locality || d.city || ''} ({d.status}) [{d.match_reasons?.join(', ')}]
                </p>
              ))}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowDupeWarning(false); setSkipDupeCheck(true); }}
                  className="text-[10px] font-bold text-amber-800 underline" style={sans}>
                  Continue anyway
                </button>
                <button onClick={() => navigate('/team/field')}
                  className="text-[10px] font-bold text-amber-600" style={sans}>
                  Go back
                </button>
              </div>
            </div>
            <button onClick={() => setShowDupeWarning(false)} className="text-amber-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Form — single scrollable screen */}
      <div className="px-4 py-4 space-y-4 pb-28">
        {/* Venue Name */}
        <QField label="Venue Name" required>
          <input value={form.venue_name}
            onChange={e => set('venue_name', e.target.value)}
            onBlur={debouncedDupeCheck}
            placeholder="e.g. Royal Garden Banquet"
            className="qinput" data-testid="q-venue-name" />
        </QField>

        {/* Venue Type — horizontal scroll */}
        <QField label="Venue Type" required>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {VENUE_TYPES.map(t => (
              <button key={t} onClick={() => set('venue_type', t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                  form.venue_type === t ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#64748B] border-slate-200'
                }`} style={sans} data-testid={`q-type-${t}`}>
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </QField>

        {/* Contact Row */}
        <div className="grid grid-cols-2 gap-3">
          <QField label="Contact Name" required>
            <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
              placeholder="Owner name" className="qinput" data-testid="q-owner-name" />
          </QField>
          <QField label="Phone" required>
            <input value={form.owner_phone}
              onChange={e => set('owner_phone', e.target.value)}
              onBlur={debouncedDupeCheck}
              placeholder="98765 43210" type="tel" className="qinput" data-testid="q-phone" />
          </QField>
        </div>

        {/* Location Row */}
        <div className="grid grid-cols-2 gap-3">
          <QField label="City" required>
            <input value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="Delhi" className="qinput" data-testid="q-city" />
          </QField>
          <QField label="Locality" required={!form.latitude}>
            <input value={form.locality}
              onChange={e => set('locality', e.target.value)}
              onBlur={debouncedDupeCheck}
              placeholder="Area name" className="qinput" data-testid="q-locality" />
          </QField>
        </div>

        {/* GPS Pin */}
        <button onClick={getLocation}
          className={`w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[12px] font-medium border transition-all ${
            form.latitude ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-[#64748B]'
          }`} style={sans} data-testid="q-gps-btn">
          <MapPin className="w-3.5 h-3.5" />
          {form.latitude ? `Pinned: ${form.latitude.toFixed(4)}, ${form.longitude?.toFixed(4)}` : 'Drop GPS Pin (optional if locality filled)'}
        </button>

        {/* Capacity — quick tap presets */}
        <QField label="Capacity Range" required>
          <div className="flex gap-1.5 flex-wrap">
            {CAPACITY_PRESETS.map(p => (
              <button key={p.label} onClick={() => setCapacity(p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                  selectedCapacity === p ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#64748B] border-slate-200'
                }`} style={sans} data-testid={`q-cap-${p.label.replace(/[^a-z0-9]/gi,'')}`}>
                {p.label}
              </button>
            ))}
          </div>
        </QField>

        {/* Interest Level */}
        <QField label="Interest Level" required>
          <div className="grid grid-cols-4 gap-1.5">
            {INTEREST_LEVELS.map(il => (
              <button key={il.value} onClick={() => set('owner_interest', il.value)}
                className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                  form.owner_interest === il.value ? il.color + ' border-transparent' : 'bg-white text-[#64748B] border-slate-200'
                }`} style={sans} data-testid={`q-interest-${il.value}`}>
                {il.label}
              </button>
            ))}
          </div>
        </QField>

        {/* Divider */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px bg-black/[0.06]" />
          <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em]" style={sans}>Optional</span>
          <div className="flex-1 h-px bg-black/[0.06]" />
        </div>

        {/* Rough Price */}
        <QField label="Starting Price/Plate">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9CA3AF]">₹</span>
            <input value={form.pricing_band_min} onChange={e => set('pricing_band_min', e.target.value)}
              placeholder="1500" type="number" inputMode="numeric" className="qinput pl-7" data-testid="q-price" />
          </div>
        </QField>

        {/* Quick Photo */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()}
          className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed transition-all ${
            photo ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
          }`} data-testid="q-photo-btn">
          {photo ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[12px] font-medium text-emerald-700 truncate max-w-[200px]" style={sans}>{photo.name}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-[#D4B36A]" />
              <span className="text-[12px] font-medium text-[#64748B]" style={sans}>Quick Photo</span>
            </>
          )}
        </button>

        {/* Follow-up + Notes */}
        <div className="grid grid-cols-2 gap-3">
          <QField label="Follow-up Date">
            <input type="date" value={form.next_followup_date} onChange={e => set('next_followup_date', e.target.value)}
              className="qinput text-[12px]" data-testid="q-followup" />
          </QField>
          <QField label="Quick Note">
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Any note..." className="qinput" data-testid="q-notes" />
          </QField>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}>
        <button onClick={saveQuickCapture} disabled={saving}
          className="w-full h-12 bg-[#D4B36A] text-[#0B0B0D] rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-[#D4B36A]/20"
          data-testid="q-save-btn" style={sans}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Save Quick Capture
        </button>
        <p className="text-[9px] text-center text-[#9CA3AF] mt-1.5" style={sans}>
          Saves as draft — complete full details later to submit for review
        </p>
      </div>

      <style>{`
        .qinput {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          font-size: 13px;
          color: #0B0B0D;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .qinput:focus { border-color: #D4B36A; }
        .qinput::placeholder { color: #9CA3AF; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function QField({ label, required, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-bold text-[#0B0B0D] mb-1 uppercase tracking-[0.1em]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
        {required && <span className="text-[#D4B36A]">*</span>}
      </label>
      {children}
    </div>
  );
}
