import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, Check, Building2, MapPin, Users, DollarSign,
  Sparkles, Camera, Video, User, Send, X, Plus, Trash2, Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Building2 },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'capacity', label: 'Capacity & Price', icon: Users },
  { id: 'features', label: 'Amenities & Vibes', icon: Sparkles },
  { id: 'media', label: 'Photos & Videos', icon: Camera },
  { id: 'contact', label: 'Owner Contact', icon: User },
  { id: 'review', label: 'Review & Submit', icon: Send },
];

const VenueForm = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const isNew = venueId === 'new';
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ venue_types: [], amenities: [], vibes: [] });
  const [createdId, setCreatedId] = useState(isNew ? null : venueId);
  const [venueStatus, setVenueStatus] = useState('draft');
  const [reviewNotes, setReviewNotes] = useState('');

  const [form, setForm] = useState({
    name: '', venue_type: '', description: '',
    address: '', city: '', map_link: '',
    capacity_min: '', capacity_max: '', per_person_price: '', min_spend: '',
    amenities: [], vibes: [],
    photos: [], videos: [],
    owner_name: '', owner_phone: '', owner_email: '',
  });

  useEffect(() => {
    api.get('/venue-onboarding/options').then(r => setOptions(r.data)).catch(() => {});
    if (!isNew) loadVenue();
  }, []);

  const loadVenue = async () => {
    try {
      const res = await api.get(`/venue-onboarding/${venueId}`);
      const v = res.data;
      setForm({
        name: v.name || '', venue_type: v.venue_type || '', description: v.description || '',
        address: v.address || '', city: v.city || '', map_link: v.map_link || '',
        capacity_min: v.capacity_min || '', capacity_max: v.capacity_max || '',
        per_person_price: v.per_person_price || '', min_spend: v.min_spend || '',
        amenities: v.amenities || [], vibes: v.vibes || [],
        photos: v.photos || [], videos: v.videos || [],
        owner_name: v.owner_name || '', owner_phone: v.owner_phone || '', owner_email: v.owner_email || '',
      });
      setVenueStatus(v.status || 'draft');
      setReviewNotes(v.review_notes || '');
      setCreatedId(v.venue_onboarding_id);
    } catch {
      toast.error('Failed to load venue');
      navigate('/team/specialist/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }));
  const toggleList = (field, item) => {
    setForm(p => ({
      ...p,
      [field]: p[field].includes(item) ? p[field].filter(i => i !== item) : [...p[field], item],
    }));
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      if (!createdId) {
        const res = await api.post('/venue-onboarding/create', form);
        setCreatedId(res.data.venue_onboarding_id);
        toast.success('Draft saved');
      } else {
        await api.put(`/venue-onboarding/${createdId}`, form);
        toast.success('Saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Auto-save before advancing
    await saveProgress();
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is too large (max 5MB)`); continue; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (createdId) {
          try {
            await api.post(`/venue-onboarding/${createdId}/media`, {
              type: 'photo', file_data: ev.target.result, caption: file.name,
            });
            const res = await api.get(`/venue-onboarding/${createdId}`);
            setForm(p => ({ ...p, photos: res.data.photos || [] }));
          } catch { toast.error('Upload failed'); }
        } else {
          setForm(p => ({
            ...p, photos: [...p.photos, { id: `tmp_${Date.now()}`, url: ev.target.result, caption: file.name }],
          }));
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (createdId) {
          try {
            await api.post(`/venue-onboarding/${createdId}/media`, {
              type: 'video', file_data: ev.target.result, caption: file.name,
            });
            const res = await api.get(`/venue-onboarding/${createdId}`);
            setForm(p => ({ ...p, videos: res.data.videos || [] }));
          } catch { toast.error('Upload failed'); }
        } else {
          setForm(p => ({
            ...p, videos: [...p.videos, { id: `tmp_${Date.now()}`, url: ev.target.result, caption: file.name }],
          }));
        }
      };
      reader.readAsDataURL(file);
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeMedia = async (mediaId, type) => {
    if (createdId && !mediaId.startsWith('tmp_')) {
      try {
        await api.delete(`/venue-onboarding/${createdId}/media/${mediaId}`);
      } catch { toast.error('Failed to remove'); return; }
    }
    setForm(p => ({
      ...p,
      [type]: p[type].filter(m => m.id !== mediaId),
    }));
  };

  const handleSubmit = async () => {
    if (!createdId) { toast.error('Please save the venue first'); return; }
    setSaving(true);
    try {
      await api.put(`/venue-onboarding/${createdId}`, form);
      await api.post(`/venue-onboarding/${createdId}/submit`);
      toast.success('Venue submitted for review!');
      navigate('/team/specialist/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  const isEditable = venueStatus === 'draft' || venueStatus === 'changes_requested';
  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-[#FAFBF9]" style={sans}>
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => navigate('/team/specialist/dashboard')} className="text-slate-500 hover:text-[#0B0B0D]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0B0B0D] truncate">{form.name || 'New Venue'}</p>
          <p className="text-[10px] text-slate-400">{currentStep.label} — Step {step + 1} of {STEPS.length}</p>
        </div>
        {isEditable && (
          <button onClick={saveProgress} disabled={saving} className="text-xs text-[#D4B36A] font-bold">
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100">
        <div className="h-full bg-[#D4B36A] transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Review Notes Banner */}
      {venueStatus === 'changes_requested' && reviewNotes && (
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
          <p className="font-bold mb-0.5">Changes Requested by Manager:</p>
          <p>{reviewNotes}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="px-4 py-5 pb-28">
        {/* Step 1: Basic Info */}
        {step === 0 && (
          <div className="space-y-4" data-testid="step-basic">
            <InputField label="Venue Name *" value={form.name} onChange={v => update('name', v)} placeholder="e.g. Royal Orchid Palace" disabled={!isEditable} testId="venue-name" />
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Venue Type</label>
              <div className="flex flex-wrap gap-2">
                {options.venue_types.map(t => (
                  <button
                    key={t}
                    onClick={() => isEditable && update('venue_type', t)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-all",
                      form.venue_type === t ? "bg-[#0B0B0D] text-white border-[#0B0B0D]" : "bg-white border-slate-200 text-slate-600"
                    )}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Description</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe the venue, its specialties, and ambiance..."
                rows={4}
                disabled={!isEditable}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] resize-none disabled:opacity-50"
                data-testid="venue-description"
              />
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-location">
            <InputField label="Address *" value={form.address} onChange={v => update('address', v)} placeholder="Full venue address" disabled={!isEditable} testId="venue-address" />
            <InputField label="City *" value={form.city} onChange={v => update('city', v)} placeholder="e.g. Mumbai" disabled={!isEditable} testId="venue-city" />
            <InputField label="Google Maps Link" value={form.map_link} onChange={v => update('map_link', v)} placeholder="https://maps.google.com/..." disabled={!isEditable} testId="venue-map" />
          </div>
        )}

        {/* Step 3: Capacity & Pricing */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-capacity">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Min Guests" type="number" value={form.capacity_min} onChange={v => update('capacity_min', parseInt(v) || '')} placeholder="100" disabled={!isEditable} testId="venue-cap-min" />
              <InputField label="Max Guests" type="number" value={form.capacity_max} onChange={v => update('capacity_max', parseInt(v) || '')} placeholder="500" disabled={!isEditable} testId="venue-cap-max" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Per Person Price" type="number" value={form.per_person_price} onChange={v => update('per_person_price', parseInt(v) || '')} placeholder="2500" disabled={!isEditable} testId="venue-price" />
              <InputField label="Minimum Spend" type="number" value={form.min_spend} onChange={v => update('min_spend', parseInt(v) || '')} placeholder="250000" disabled={!isEditable} testId="venue-min-spend" />
            </div>
          </div>
        )}

        {/* Step 4: Amenities & Vibes */}
        {step === 3 && (
          <div className="space-y-5" data-testid="step-features">
            <div>
              <label className="text-xs font-bold text-[#0B0B0D] mb-2 block">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {options.amenities.map(a => (
                  <button
                    key={a}
                    onClick={() => isEditable && toggleList('amenities', a)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-all",
                      form.amenities.includes(a) ? "bg-[#D4B36A] text-[#0B0B0D] border-[#D4B36A] font-bold" : "bg-white border-slate-200 text-slate-600"
                    )}
                    data-testid={`amenity-${a}`}
                  >{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B0B0D] mb-2 block">Vibes</label>
              <div className="flex flex-wrap gap-2">
                {options.vibes.map(v => (
                  <button
                    key={v}
                    onClick={() => isEditable && toggleList('vibes', v)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-all",
                      form.vibes.includes(v) ? "bg-[#0B0B0D] text-white border-[#0B0B0D] font-bold" : "bg-white border-slate-200 text-slate-600"
                    )}
                    data-testid={`vibe-${v}`}
                  >{v}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Photos & Videos */}
        {step === 4 && (
          <div className="space-y-5" data-testid="step-media">
            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0B0B0D]">Photos ({form.photos.length})</label>
                {isEditable && (
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="text-xs h-8 rounded-lg" data-testid="upload-photos-btn">
                    <Plus className="w-3 h-3 mr-1" /> Add Photos
                  </Button>
                )}
              </div>
              {form.photos.length === 0 ? (
                <button
                  onClick={() => isEditable && fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-[#D4B36A] hover:text-[#D4B36A] transition-colors"
                  data-testid="photo-dropzone"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">Tap to add venue photos</span>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {form.photos.map((p, i) => (
                    <div key={p.id || i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[8px] bg-[#D4B36A] text-[#0B0B0D] px-1.5 py-0.5 rounded font-bold">COVER</span>
                      )}
                      {isEditable && (
                        <button
                          onClick={() => removeMedia(p.id, 'photos')}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0B0B0D]">Videos ({form.videos.length})</label>
                {isEditable && (
                  <Button size="sm" variant="outline" onClick={() => videoInputRef.current?.click()} className="text-xs h-8 rounded-lg" data-testid="upload-videos-btn">
                    <Plus className="w-3 h-3 mr-1" /> Add Videos
                  </Button>
                )}
              </div>
              {form.videos.length === 0 ? (
                <button
                  onClick={() => isEditable && videoInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-[#D4B36A] hover:text-[#D4B36A] transition-colors"
                  data-testid="video-dropzone"
                >
                  <Video className="w-5 h-5 mb-1" />
                  <span className="text-xs">Add venue walkthrough videos</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {form.videos.map((v, i) => (
                    <div key={v.id || i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2">
                      <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center">
                        <Video className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="flex-1 text-xs text-slate-600 truncate">{v.caption || `Video ${i + 1}`}</span>
                      {isEditable && (
                        <button onClick={() => removeMedia(v.id, 'videos')} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} />
          </div>
        )}

        {/* Step 6: Owner Contact */}
        {step === 5 && (
          <div className="space-y-4" data-testid="step-contact">
            <InputField label="Venue Owner Name" value={form.owner_name} onChange={v => update('owner_name', v)} placeholder="e.g. Raj Patel" disabled={!isEditable} testId="owner-name" />
            <InputField label="Phone Number" type="tel" value={form.owner_phone} onChange={v => update('owner_phone', v)} placeholder="9876543210" disabled={!isEditable} testId="owner-phone" />
            <InputField label="Email" type="email" value={form.owner_email} onChange={v => update('owner_email', v)} placeholder="owner@venue.in" disabled={!isEditable} testId="owner-email" />
          </div>
        )}

        {/* Step 7: Review */}
        {step === 6 && (
          <div className="space-y-4" data-testid="step-review">
            <ReviewSection title="Basic Info">
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Type" value={form.venue_type} />
              <ReviewRow label="Description" value={form.description} />
            </ReviewSection>
            <ReviewSection title="Location">
              <ReviewRow label="Address" value={form.address} />
              <ReviewRow label="City" value={form.city} />
            </ReviewSection>
            <ReviewSection title="Capacity & Pricing">
              <ReviewRow label="Guests" value={form.capacity_min && form.capacity_max ? `${form.capacity_min} - ${form.capacity_max}` : ''} />
              <ReviewRow label="Per Person" value={form.per_person_price ? `Rs ${form.per_person_price}` : ''} />
              <ReviewRow label="Min Spend" value={form.min_spend ? `Rs ${form.min_spend}` : ''} />
            </ReviewSection>
            <ReviewSection title="Features">
              <ReviewRow label="Amenities" value={form.amenities.join(', ')} />
              <ReviewRow label="Vibes" value={form.vibes.join(', ')} />
            </ReviewSection>
            <ReviewSection title="Media">
              <ReviewRow label="Photos" value={`${form.photos.length} uploaded`} />
              <ReviewRow label="Videos" value={`${form.videos.length} uploaded`} />
              {form.photos.length > 0 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto">
                  {form.photos.slice(0, 6).map((p, i) => (
                    <img key={i} src={p.url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ))}
                </div>
              )}
            </ReviewSection>
            <ReviewSection title="Owner Contact">
              <ReviewRow label="Name" value={form.owner_name} />
              <ReviewRow label="Phone" value={form.owner_phone} />
              <ReviewRow label="Email" value={form.owner_email} />
            </ReviewSection>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 z-20">
        {step > 0 && (
          <Button variant="outline" onClick={handleBack} className="h-11 px-4 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1">
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={saving} className="w-full h-11 bg-[#0B0B0D] hover:bg-[#1a1a1a] text-white rounded-xl font-bold" data-testid="next-step-btn">
              {saving ? 'Saving...' : 'Continue'} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : isEditable ? (
            <Button onClick={handleSubmit} disabled={saving} className="w-full h-11 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] rounded-xl font-bold" data-testid="submit-venue-btn">
              {saving ? 'Submitting...' : 'Submit for Review'} <Send className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <div className="text-center text-xs text-slate-400">This venue is currently under review</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable components
const InputField = ({ label, value, onChange, placeholder, type = 'text', disabled, testId }) => (
  <div>
    <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] disabled:opacity-50"
      data-testid={testId}
    />
  </div>
);

const ReviewSection = ({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3">
    <h4 className="text-xs font-bold text-[#0B0B0D] mb-2">{title}</h4>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const ReviewRow = ({ label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-[10px] text-slate-400 w-20 shrink-0">{label}</span>
    <span className="text-xs text-[#0B0B0D] flex-1">{value || <span className="text-slate-300">Not set</span>}</span>
  </div>
);

export default VenueForm;
