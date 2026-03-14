import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronLeft } from 'lucide-react';

const LOGO_URL = 'https://static.prod-images.emergentagent.com/jobs/d6aadd14-84a9-4588-ad39-9e33b5dd867e/images/bc04a69188d77aa28fae4f0b9e408fa6dba3e003e2deeee7cf3e9858abeedace.png';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
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
        navigate(roleDashboards[user.role] || from);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const afterLogin = redirectTo || '/my-enquiries';
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Hero Section */}
      <div className="flex-shrink-0 relative px-6 pt-5 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC] transition-colors z-10"
          data-testid="login-back-btn"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Subtle radial glow behind logo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#D4B36A]/[0.06] rounded-full blur-[80px]" />
        </div>

        <div className="relative flex flex-col items-center text-center pt-6">
          <img
            src={LOGO_URL}
            alt="VenuLoQ"
            className="w-[88px] h-[88px] object-contain mb-5"
            data-testid="full-brand-logo"
          />
          <h2 className="text-[22px] text-[#F4F1EC] mb-1.5 leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            Welcome to <span className="text-[#D4B36A]">VenuLoQ</span>
          </h2>
          <p className="text-[12px] text-[#F4F1EC]/40 max-w-[240px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Your smart venue booking platform
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-[#F4F1EC] rounded-t-[28px] px-6 pt-7 pb-6 flex flex-col">
        <p className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.15em] font-semibold mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Team Login
        </p>

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 border border-[#E5E0D8] bg-white hover:border-[#D4B36A] transition-all text-[13px] font-medium text-[#1A1A1A] rounded-lg"
          data-testid="google-login-btn"
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="space-y-4 flex-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username or email"
                className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                data-testid="login-email"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-10 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                data-testid="login-password"
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

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-[11px] text-[#D4B36A] hover:underline underline-offset-2 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.1em] uppercase rounded-lg group"
              data-testid="login-submit"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>

            <p className="text-center text-[12px] text-[#6E6E6E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Not a team member?{' '}
              <Link to={`/auth${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#0B0B0D] font-semibold hover:text-[#D4B36A] transition-colors">
                Customer Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
