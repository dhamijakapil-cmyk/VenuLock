import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'customer';
  const redirectTo = searchParams.get('redirect') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      });
      toast.success('Account created successfully!');
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        const roleDashboards = {
          admin: '/admin/dashboard',
          rm: '/rm/dashboard',
          venue_owner: '/venue-owner/dashboard',
          event_planner: '/planner/dashboard',
          customer: '/my-enquiries',
        };
        navigate(roleDashboards[user.role] || '/');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Registration failed';
      if (errorMsg.toLowerCase().includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.', {
          action: { label: 'Sign In', onClick: () => navigate('/login') },
          duration: 6000,
        });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const afterLogin = redirectTo || '/my-enquiries';
    const redirectUrl = window.location.origin + afterLogin;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const InputField = ({ icon: Icon, label, ...props }) => (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
      <input
        className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        {...props}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex flex-col lg:flex-row" style={{ minHeight: '100dvh' }}>
      {/* Top — Full logo on dark background */}
      <div className="lg:w-[52%] flex-shrink-0 flex items-center justify-center py-8 px-6 lg:min-h-screen">
        <div className="flex flex-col items-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_d6aadd14-84a9-4588-ad39-9e33b5dd867e/artifacts/v4duq3g6_venuloq-email-signature-dark.png"
            alt="VenuLoQ"
            className="w-[160px] lg:w-[240px]"
            data-testid="full-brand-logo"
          />
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 bg-[#F4F1EC] rounded-t-[28px] lg:rounded-none px-6 py-7 lg:px-12 lg:py-0 lg:flex lg:items-center lg:justify-center overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[28px] text-[#0B0B0D] mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            Create Account
          </h1>
          <p className="text-[#9CA3AF] text-[12px] mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Join VenuLoQ today
          </p>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 border border-[#E5E0D8] bg-white hover:border-[#D4B36A] transition-all text-[13px] font-medium text-[#1A1A1A] rounded-lg"
            data-testid="google-register-btn"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E0D8]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#F4F1EC] px-4 text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              icon={User}
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
              data-testid="register-name"
            />

            <InputField
              icon={Mail}
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              data-testid="register-email"
            />

            <InputField
              icon={Phone}
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              data-testid="register-phone"
            />

            <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="h-11 border border-[#E5E0D8] rounded-lg bg-white px-3 focus:ring-1 focus:ring-[#D4B36A]/20 text-[13px]" data-testid="register-role" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <SelectValue placeholder="I am a..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer looking for venues</SelectItem>
                  <SelectItem value="venue_owner">Venue Owner</SelectItem>
                  <SelectItem value="event_planner">Event Planner</SelectItem>
                </SelectContent>
              </Select>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password (min. 6 characters)"
                  className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-10 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                  required
                  data-testid="register-password"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6E6E6E] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <InputField
              icon={Lock}
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              data-testid="register-confirm-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.1em] uppercase rounded-lg group"
              data-testid="register-submit"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading ? 'Creating account...' : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-5 pb-8 text-[12px] text-[#6E6E6E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Already have an account?{' '}
            <Link to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#0B0B0D] font-semibold hover:text-[#D4B36A] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
