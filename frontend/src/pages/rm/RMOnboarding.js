import React, { useState, useRef } from 'react';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  MapPin,
  Shield,
  Camera,
  User,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sans = { fontFamily: "'DM Sans', sans-serif" };
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

/**
 * RMOnboarding — Shown after RM login when:
 * 1. must_change_password = true → Step 1: Change Password
 * 2. profile_completed = false → Step 2: Complete Profile
 * 3. verification_status = "pending" → Step 3: Awaiting Verification
 */
const RMOnboarding = () => {
  const { user, setUser, logout } = useAuth();
  const fileInputRef = useRef(null);

  // Determine starting step
  const getInitialStep = () => {
    if (user?.must_change_password) return 'password';
    if (!user?.profile_completed) return 'profile';
    return 'waiting';
  };

  const [step, setStep] = useState(getInitialStep);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile state
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergency_contact_phone || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully');
      setUser(prev => ({ ...prev, must_change_password: false }));
      setStep('profile');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfilePhoto(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !address.trim() || !emergencyName.trim() || !emergencyPhone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Upload photo if set
      if (profilePhoto && profilePhoto.startsWith('data:')) {
        await api.post('/auth/rm-profile-photo', { photo: profilePhoto });
      }

      // Update profile
      await api.put('/auth/rm-profile', {
        phone: phone.trim(),
        address: address.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
      });

      toast.success('Profile completed! Awaiting HR verification.');
      setUser(prev => ({ ...prev, profile_completed: true, phone: phone.trim() }));
      setStep('waiting');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9] flex items-center justify-center p-4" style={sans}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl text-[#0B0B0D] tracking-tight" style={{ ...serif, fontWeight: 600 }}>
            Venu<span className="text-[#D4B36A]">Lo</span>Q
          </h1>
          <p className="text-xs text-slate-400 mt-1 tracking-wider uppercase">Relationship Manager Onboarding</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['password', 'profile', 'waiting'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step === s ? "bg-[#D4B36A] text-[#0B0B0D]" :
                ['password', 'profile', 'waiting'].indexOf(step) > i ? "bg-emerald-500 text-white" :
                "bg-slate-200 text-slate-400"
              )}>
                {['password', 'profile', 'waiting'].indexOf(step) > i ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className={cn("w-8 h-0.5", ['password', 'profile', 'waiting'].indexOf(step) > i ? "bg-emerald-500" : "bg-slate-200")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Change Password */}
        {step === 'password' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="onboard-password-step">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-[#FFF8E7] flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5 text-[#D4B36A]" />
              </div>
              <h2 className="text-lg font-bold text-[#0B0B0D]">Set Your Password</h2>
              <p className="text-xs text-slate-500 mt-1">Replace your temporary password with a secure one</p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Current (Temporary) Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
                  required
                  data-testid="onboard-current-password"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
                  required
                  data-testid="onboard-new-password"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Confirm Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
                  required
                  data-testid="onboard-confirm-password"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPasswords ? 'Hide' : 'Show'} passwords
              </button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-11 rounded-xl mt-2"
                data-testid="onboard-password-submit"
              >
                {loading ? 'Saving...' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        )}

        {/* Step 2: Complete Profile */}
        {step === 'profile' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="onboard-profile-step">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-[#0B0B0D]">Complete Your Profile</h2>
              <p className="text-xs text-slate-500 mt-1">HR will review your profile before activation</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                  data-testid="onboard-photo-upload"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#D4B36A]" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 group-hover:border-[#D4B36A] transition-colors">
                      <User className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#D4B36A] rounded-full flex items-center justify-center shadow-sm">
                    <Camera className="w-3.5 h-3.5 text-[#0B0B0D]" />
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              {/* Name (read only) */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  readOnly
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm text-slate-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  <Phone className="w-3 h-3 inline mr-1" />Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]"
                  required
                  data-testid="onboard-phone"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  <MapPin className="w-3 h-3 inline mr-1" />Address *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full residential address"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A] resize-none"
                  required
                  data-testid="onboard-address"
                />
              </div>

              {/* Emergency Contact */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#D4B36A]" />
                  Emergency Contact
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 mb-0.5 block">Name *</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Contact name"
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                      required
                      data-testid="onboard-emergency-name"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 mb-0.5 block">Phone *</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30"
                      required
                      data-testid="onboard-emergency-phone"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-11 rounded-xl"
                data-testid="onboard-profile-submit"
              >
                {loading ? 'Saving...' : 'Submit for Verification'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        )}

        {/* Step 3: Awaiting Verification */}
        {step === 'waiting' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center" data-testid="onboard-waiting-step">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-[#0B0B0D] mb-2">Awaiting HR Verification</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Your profile has been submitted. HR will review and verify your details.
              You'll receive a notification once approved.
            </p>
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 mb-4">
              <p className="font-medium text-[#0B0B0D] mb-1">What happens next?</p>
              <ul className="space-y-1 text-left">
                <li className="flex items-start gap-2"><CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" /> HR reviews your profile and documents</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" /> Once approved, you can access your dashboard</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" /> You'll be notified via the app</li>
              </ul>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="text-xs text-slate-500 h-9"
              data-testid="onboard-logout"
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RMOnboarding;
