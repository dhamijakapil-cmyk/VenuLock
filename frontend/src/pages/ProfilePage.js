import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ChevronLeft, User, Mail, Phone, Save, LogOut, MapPin,
  Calendar, Wallet, Bell, BellOff, Check, X
} from 'lucide-react';

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Goa'];
const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate Event', 'Cocktail Party', 'Engagement', 'Reception', 'Anniversary', 'Baby Shower'];
const BUDGET_RANGES = ['Under 1L', '1L - 3L', '3L - 5L', '5L - 10L', '10L - 25L', '25L+'];

const ChipSelect = ({ options, selected = [], onChange, label, icon: Icon }) => (
  <div>
    <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
            className={`px-3 py-1.5 text-[12px] rounded-full border transition-all duration-200 active:scale-95 ${
              isActive
                ? 'bg-[#0B0B0D] text-[#D4B36A] border-[#0B0B0D]'
                : 'bg-white text-[#555] border-[#E5E0D8] hover:border-[#D4B36A]/50'
            }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
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
      } catch {
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
        }
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchProfile();
  }, [isAuthenticated, user]);

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
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col app-main-content">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-50 bg-[#0B0B0D]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC] transition-colors" data-testid="profile-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg text-[#F4F1EC]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>My Profile</h1>
          </div>
        </header>

        {/* Avatar */}
        <div className="flex flex-col items-center pt-8 pb-6 bg-[#0B0B0D] rounded-b-[28px]">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full object-cover border-2 border-[#D4B36A]" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border-2 border-[#D4B36A] flex items-center justify-center">
              <span className="text-2xl font-bold text-[#D4B36A]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <p className="mt-3 text-[#F4F1EC] text-base font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>{user?.name}</p>
          <p className="mt-0.5 text-[#F4F1EC]/50 text-[13px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{user?.email}</p>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 pt-6 pb-10 lg:pt-10">
        {/* Desktop back + title */}
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <button onClick={() => navigate(-1)} className="text-sm text-[#64748B] hover:text-[#0B0B0D] flex items-center gap-1" data-testid="profile-back-desktop">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Info */}
            <section className="bg-white rounded-2xl p-5 border border-[#E5E0D8]/50 shadow-sm" data-testid="profile-basic-section">
              <h2 className="text-[13px] font-bold text-[#0B0B0D] uppercase tracking-wider mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>Basic Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                      className="w-full border border-[#E5E0D8] bg-white rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                      data-testid="profile-name" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px' }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                    <input type="email" value={user?.email || ''} disabled
                      className="w-full border border-[#E5E0D8] bg-[#F4F1EC] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#6E6E6E] cursor-not-allowed"
                      data-testid="profile-email" style={{ fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
                      className="w-full border border-[#E5E0D8] bg-white rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                      data-testid="profile-phone" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px' }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Event Preferences */}
            <section className="bg-white rounded-2xl p-5 border border-[#E5E0D8]/50 shadow-sm space-y-5" data-testid="profile-preferences-section">
              <h2 className="text-[13px] font-bold text-[#0B0B0D] uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>Event Preferences</h2>

              <ChipSelect label="Preferred Cities" icon={MapPin} options={CITIES} selected={preferredCities} onChange={setPreferredCities} />
              <ChipSelect label="Event Types" icon={Calendar} options={EVENT_TYPES} selected={preferredEventTypes} onChange={setPreferredEventTypes} />

              <div>
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <Wallet className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Budget Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_RANGES.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudgetRange(budgetRange === b ? '' : b)}
                      className={`px-3 py-1.5 text-[12px] rounded-full border transition-all duration-200 active:scale-95 ${
                        budgetRange === b
                          ? 'bg-[#0B0B0D] text-[#D4B36A] border-[#0B0B0D]'
                          : 'bg-white text-[#555] border-[#E5E0D8] hover:border-[#D4B36A]/50'
                      }`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                      data-testid={`budget-${b.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {budgetRange === b && <Check className="w-3 h-3 inline mr-1" />}
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white rounded-2xl p-5 border border-[#E5E0D8]/50 shadow-sm" data-testid="profile-notifications-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-[#D4B36A]" strokeWidth={1.5} />
                  ) : (
                    <BellOff className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.5} />
                  )}
                  <div>
                    <p className="text-[13px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Notifications</p>
                    <p className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Booking updates & offers</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${notificationsEnabled ? 'bg-[#D4B36A]' : 'bg-[#E5E0D8]'}`}
                  data-testid="notifications-toggle"
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notificationsEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </section>

            {/* Save + Logout */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.1em] uppercase rounded-xl"
                data-testid="profile-save-btn"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {saving ? 'Saving...' : (<><Save className="w-4 h-4" strokeWidth={1.5} /> Save Changes</>)}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-all tracking-[0.1em] uppercase rounded-xl"
                data-testid="profile-logout-btn"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
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
