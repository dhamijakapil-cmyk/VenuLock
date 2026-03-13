import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ChevronLeft, User, Mail, Phone, Save, LogOut } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name: name.trim(), phone: phone.trim() || null });
      // Update local user context
      if (res.data) {
        const stored = localStorage.getItem('token');
        if (stored) {
          localStorage.setItem('user', JSON.stringify(res.data));
        }
        window.location.reload();
      }
      toast.success('Profile updated');
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

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F1EC]">
      {/* Mobile layout */}
      <div className="lg:hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#0B0B0D]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC] transition-colors"
              data-testid="profile-back-btn"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg text-[#F4F1EC]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
              My Profile
            </h1>
          </div>
        </header>

        {/* Profile Avatar */}
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
          <p className="mt-3 text-[#F4F1EC] text-base font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>{user?.email}</p>
          <span className="mt-1 text-[10px] font-bold text-[#D4B36A] uppercase tracking-[0.15em] bg-[#D4B36A]/10 px-3 py-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {user?.role}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-5 pt-6 pb-8 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                data-testid="profile-name"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full border border-[#E5E0D8] bg-[#F4F1EC] rounded-lg pl-10 pr-4 py-3 text-[13px] text-[#6E6E6E] cursor-not-allowed"
                data-testid="profile-email"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                data-testid="profile-phone"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.1em] uppercase rounded-lg"
            data-testid="profile-save-btn"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {saving ? 'Saving...' : (
              <>
                <Save className="w-4 h-4" strokeWidth={1.5} />
                Save Changes
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-all tracking-[0.1em] uppercase rounded-lg"
            data-testid="profile-logout-btn"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sign Out
          </button>
        </form>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <Header />
        <div className="container-main py-10 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#111111] mb-6 transition-colors" data-testid="profile-back-btn-desktop">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#111111] to-[#153055] px-6 py-6 flex items-center gap-4">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#D4B36A]" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-[#D4B36A] flex items-center justify-center">
                  <span className="text-xl font-bold text-[#D4B36A]">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
              )}
              <div>
                <h1 className="text-white font-serif text-xl font-bold">{user?.name}</h1>
                <p className="text-white/60 text-sm">{user?.email}</p>
              </div>
            </div>
            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                    className="w-full border border-slate-200 bg-white rounded-lg pl-10 pr-4 py-3 text-sm text-[#1A1A1A] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                    data-testid="profile-name-desktop" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                  <input type="email" value={user?.email || ''} disabled
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg pl-10 pr-4 py-3 text-sm text-[#6E6E6E] cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
                    className="w-full border border-slate-200 bg-white rounded-lg pl-10 pr-4 py-3 text-sm text-[#1A1A1A] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                    data-testid="profile-phone-desktop" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-[#111111] text-white hover:bg-[#153055] disabled:opacity-50 transition-all rounded-xl"
                  data-testid="profile-save-btn-desktop">
                  <Save className="w-4 h-4" strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleLogout}
                  className="px-6 py-3 text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-all rounded-xl"
                  data-testid="profile-logout-btn-desktop">
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default ProfilePage;
