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
    <div>
      <label className="text-[10px] font-bold tracking-[0.2em] text-[#6E6E6E] uppercase block mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
        <input
          className="w-full border-0 border-b border-[#E5E0D8] bg-transparent pl-7 pb-3 pt-1 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-0 focus:outline-none transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          {...props}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col lg:flex-row">
      {/* Left - Full bleed image */}
      <div className="lg:w-[52%] relative overflow-hidden min-h-[200px] lg:min-h-screen">
        <img
          src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80"
          alt="Luxury event"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D]/90 via-[#0B0B0D]/50 to-[#0B0B0D]/20" />
        
        <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-10">
          <BrandLogo size="md" dark={true} linkTo="/" />
          
          <div className="hidden lg:block pb-8">
            <p className="text-[10px] font-bold tracking-[0.3em] text-[#D4B36A] uppercase mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Find. Compare. Lock.
            </p>
            <h2 className="text-4xl xl:text-5xl text-white leading-[1.15]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}>
              Start Your Journey
            </h2>
            <p className="text-white/50 text-sm mt-4 max-w-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Create an account to save venues, track enquiries, and get personalized recommendations.
            </p>
          </div>

          <div className="lg:hidden pb-2">
            <h2 className="text-2xl text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}>
              Create Account
            </h2>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-6 py-8 lg:px-12 lg:py-0 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <h1 className="text-3xl lg:text-4xl text-[#0B0B0D] mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            Sign Up
          </h1>
          <p className="text-[#6E6E6E] text-[13px] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Join VenuLoQ today
          </p>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-[#E5E0D8] bg-white hover:border-[#D4B36A] transition-all text-[13px] font-medium text-[#1A1A1A]"
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

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E0D8]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#F4F1EC] px-4 text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Or register with email
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

            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#6E6E6E] uppercase block mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                I am a
              </label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="h-11 border-0 border-b border-[#E5E0D8] rounded-none bg-transparent px-0 focus:ring-0 text-[14px]" data-testid="register-role" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer looking for venues</SelectItem>
                  <SelectItem value="venue_owner">Venue Owner</SelectItem>
                  <SelectItem value="event_planner">Event Planner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#6E6E6E] uppercase block mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full border-0 border-b border-[#E5E0D8] bg-transparent pl-7 pr-8 pb-3 pt-1 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-0 focus:outline-none transition-colors"
                  required
                  data-testid="register-password"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6E6E6E] transition-colors"
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
              className="w-full flex items-center justify-center gap-2 py-4 mt-2 text-[11px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.15em] uppercase group"
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

          <p className="text-center mt-8 text-[13px] text-[#6E6E6E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
