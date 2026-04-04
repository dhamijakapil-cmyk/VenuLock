import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ChevronLeft, User, Mail, Phone, Save, LogOut, MapPin,
  Calendar, Wallet, Bell, BellOff, Check, Camera, Trash2
} from 'lucide-react';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const sans = { fontFamily: "'DM Sans', sans-serif" };

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Goa'];
const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate Event', 'Cocktail Party', 'Engagement', 'Reception', 'Anniversary', 'Baby Shower'];
const BUDGET_RANGES = ['Under 1L', '1L - 3L', '3L - 5L', '5L - 10L', '10L - 25L', '25L+'];

const ChipSelect = ({ options, selected = [], onChange, label, icon: Icon }) => (
  <div>
    <label className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em] mb-2.5 flex items-center gap-1.5" style={sans}>
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
      {label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(isActive ? selected.filter(s => s !== opt) : [...selected, opt])}
            className={`px-3.5 py-2 text-[11px] rounded-xl border transition-all duration-200 active:scale-95 font-medium ${
              isActive
                ? 'bg-[#1A1A1A] text-[#C4A76C] border-[#1A1A1A] shadow-[0_2px_8px_rgba(11,11,13,0.12)]'
                : 'bg-white/80 text-[#1A1A1A]/60 border-[#1A1A1A]/[0.06] hover:border-[#C4A76C]/40'
            }`}
            style={sans}
            data-testid={`chip-${opt.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {isActive && <Check className="w-3 h-3 inline mr-1" />}
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredCities, setPreferredCities] = useState([]);
  const [preferredEventTypes, setPreferredEventTypes] = useState([]);
  const [budgetRange, setBudgetRange] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        const p = res.data;
        setName(p.name || '');
        setPhone(p.phone || '');
        setPreferredCities(p.preferred_cities || []);
        setPreferredEventTypes(p.preferred_event_types || []);
        setBudgetRange(p.budget_range || '');
        setNotificationsEnabled(p.notifications_enabled !== false);
        setPhotoUrl(p.profile_photo || p.picture || null);
      } catch {
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setPhotoUrl(user.picture || null);
        }
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchProfile();
  }, [isAuthenticated, user]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.post('/auth/profile-photo', { photo: reader.result });
        setPhotoUrl(res.data.profile_photo);
        toast.success('Photo updated');
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to upload photo');
      } finally {
        setUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = async () => {
    setUploadingPhoto(true);
    try {
      await api.delete('/auth/profile-photo');
      setPhotoUrl(null);
      toast.success('Photo removed');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        preferred_cities: preferredCities,
        preferred_event_types: preferredEventTypes,
        budget_range: budgetRange,
        notifications_enabled: notificationsEnabled,
      };
      await api.put('/auth/profile', payload);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!isAuthenticated) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-[#F6F4F0] flex flex-col app-main-content relative" style={sans}>
      {/* Premium ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1613128517587-08dc18819ebe?crop=entropy&cs=srgb&fm=jpg&w=900&q=40"
          alt="" className="w-full h-full object-cover"
          style={{ opacity: 0.18, filter: 'blur(8px) saturate(0.4) brightness(1.1)' }}
        />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(212,179,106,0.10) 0%, transparent 60%)',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F6F4F0]/20 via-transparent to-[#F6F4F0]/50" />
      </div>

      {/* Mobile Header — Premium Facebook-style cover */}
      <div className="lg:hidden relative z-10">
        {/* Cover banner image */}
        <div className="relative h-[160px] overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <img
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?crop=entropy&cs=srgb&fm=jpg&w=800&q=60"
            alt="" className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/60 via-[#1A1A1A]/30 to-[#1A1A1A]/70" />
          {/* Gold shimmer accent */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C4A76C]/[0.08] to-transparent" />

          {/* Back button + title overlay */}
          <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-5 py-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A]/40 backdrop-blur-sm text-white/80 hover:text-white transition-colors" data-testid="profile-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <p className="text-[9px] font-bold text-white/80 uppercase tracking-[0.2em] flex-1" style={sans}>My Profile</p>
          </div>
        </div>

        {/* Avatar overlapping the cover — Facebook style */}
        <div className="flex flex-col items-center -mt-[52px] relative z-20 pb-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} data-testid="profile-photo-input" />
          <div className="relative" data-testid="profile-avatar-area">
            {photoUrl ? (
              <img src={photoUrl} alt={user?.name}
                className="w-[96px] h-[96px] rounded-full object-cover border-[4px] border-[#F6F4F0] shadow-[0_8px_32px_rgba(11,11,13,0.25)]"
                data-testid="profile-photo-img" />
            ) : (
              <div className="w-[96px] h-[96px] rounded-full bg-[#1A1A1A] border-[4px] border-[#F6F4F0] flex items-center justify-center shadow-[0_8px_32px_rgba(11,11,13,0.25)]"
                data-testid="profile-initials-avatar">
                <span className="text-[36px] font-light text-[#C4A76C]" style={serif}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#C4A76C] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.25)] active:scale-95 transition-transform border-2 border-[#F6F4F0]"
              data-testid="profile-photo-upload-btn"
            >
              {uploadingPhoto
                ? <div className="w-3.5 h-3.5 border-2 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-[#1A1A1A]" strokeWidth={2} />
              }
            </button>
            {photoUrl && !uploadingPhoto && (
              <button
                onClick={handlePhotoRemove}
                className="absolute top-0 right-0 w-6 h-6 rounded-full bg-[#1A1A1A] border-2 border-[#F6F4F0] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.25)] active:scale-95 transition-transform"
                data-testid="profile-photo-remove-btn"
              >
                <Trash2 className="w-3 h-3 text-[#F6F4F0]/60" strokeWidth={2} />
              </button>
            )}
          </div>
          <p className="mt-2.5 text-[#1A1A1A] text-[18px] font-semibold" style={sans}>{user?.name}</p>
          <p className="mt-0.5 text-[#1A1A1A]/45 text-[12px]" style={sans}>{user?.email}</p>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block"><Header /></div>

      {/* Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 pt-4 pb-10 lg:pt-10 relative z-10">
        {/* Desktop back + title */}
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <button onClick={() => navigate(-1)} className="text-sm text-[#64748B] hover:text-[#1A1A1A] flex items-center gap-1" data-testid="profile-back-desktop">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white/60 rounded-[18px] animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Basic Info */}
            <section className="bg-white/90 backdrop-blur-sm rounded-[18px] p-5 border border-[#1A1A1A]/[0.04] shadow-[0_4px_20px_rgba(11,11,13,0.04)]" data-testid="profile-basic-section">
              <h2 className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em] mb-4" style={sans}>Basic Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em] mb-1.5 block" style={sans}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" strokeWidth={1.5} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                      className="w-full border border-[#1A1A1A]/[0.06] bg-white rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C4A76C] focus:ring-1 focus:ring-[#C4A76C]/20 outline-none transition-colors"
                      data-testid="profile-name" style={{ ...sans, fontSize: '16px' }} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em] mb-1.5 block" style={sans}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" strokeWidth={1.5} />
                    <input type="email" value={user?.email || ''} disabled
                      className="w-full border border-[#1A1A1A]/[0.04] bg-[#F6F4F0]/50 rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#1A1A1A]/50 cursor-not-allowed"
                      data-testid="profile-email" style={sans} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em] mb-1.5 block" style={sans}>Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" strokeWidth={1.5} />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
                      className="w-full border border-[#1A1A1A]/[0.06] bg-white rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C4A76C] focus:ring-1 focus:ring-[#C4A76C]/20 outline-none transition-colors"
                      data-testid="profile-phone" style={{ ...sans, fontSize: '16px' }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Event Preferences */}
            <section className="bg-white/90 backdrop-blur-sm rounded-[18px] p-5 border border-[#1A1A1A]/[0.04] shadow-[0_4px_20px_rgba(11,11,13,0.04)] space-y-5" data-testid="profile-preferences-section">
              <h2 className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em]" style={sans}>Event Preferences</h2>
              <ChipSelect label="Preferred Cities" icon={MapPin} options={CITIES} selected={preferredCities} onChange={setPreferredCities} />
              <ChipSelect label="Event Types" icon={Calendar} options={EVENT_TYPES} selected={preferredEventTypes} onChange={setPreferredEventTypes} />
              <div>
                <label className="text-[9px] font-bold text-[#1A1A1A]/45 uppercase tracking-[0.18em] mb-2.5 flex items-center gap-1.5" style={sans}>
                  <Wallet className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Budget Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_RANGES.map(b => (
                    <button key={b} type="button" onClick={() => setBudgetRange(budgetRange === b ? '' : b)}
                      className={`px-3.5 py-2 text-[11px] rounded-xl border transition-all duration-200 active:scale-95 font-medium ${
                        budgetRange === b
                          ? 'bg-[#1A1A1A] text-[#C4A76C] border-[#1A1A1A] shadow-[0_2px_8px_rgba(11,11,13,0.12)]'
                          : 'bg-white/80 text-[#1A1A1A]/60 border-[#1A1A1A]/[0.06] hover:border-[#C4A76C]/40'
                      }`}
                      style={sans} data-testid={`budget-${b.toLowerCase().replace(/\s+/g, '-')}`}>
                      {budgetRange === b && <Check className="w-3 h-3 inline mr-1" />}
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white/90 backdrop-blur-sm rounded-[18px] p-5 border border-[#1A1A1A]/[0.04] shadow-[0_4px_20px_rgba(11,11,13,0.04)]" data-testid="profile-notifications-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notificationsEnabled ? 'bg-[#C4A76C]/10' : 'bg-[#1A1A1A]/[0.03]'}`}>
                    {notificationsEnabled ? (
                      <Bell className="w-[18px] h-[18px] text-[#C4A76C]" strokeWidth={1.5} />
                    ) : (
                      <BellOff className="w-[18px] h-[18px] text-[#1A1A1A]/35" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]" style={sans}>Notifications</p>
                    <p className="text-[10px] text-[#1A1A1A]/45 mt-0.5" style={sans}>Booking updates & offers</p>
                  </div>
                </div>
                <button type="button" onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${notificationsEnabled ? 'bg-[#C4A76C]' : 'bg-[#1A1A1A]/10'}`}
                  data-testid="notifications-toggle">
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${notificationsEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </section>

            {/* Save + Logout */}
            <div className="space-y-3 pt-1">
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold bg-[#1A1A1A] text-[#F6F4F0] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.12em] uppercase rounded-xl shadow-[0_8px_24px_rgba(11,11,13,0.15)]"
                data-testid="profile-save-btn" style={sans}>
                {saving ? 'Saving...' : (<><Save className="w-4 h-4" strokeWidth={1.5} /> Save Changes</>)}
              </button>
              <button type="button" onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-medium text-[#1A1A1A]/45 hover:text-[#1A1A1A]/60 transition-all tracking-[0.1em] uppercase rounded-xl"
                data-testid="profile-logout-btn" style={sans}>
                <LogOut className="w-4 h-4" strokeWidth={1.5} /> Sign Out
              </button>
            </div>
          </form>
        )}
      </main>

      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
};

export default ProfilePage;
