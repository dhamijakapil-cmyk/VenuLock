import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F4F1EC]" style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0); }
          25% { transform: perspective(800px) rotateY(6deg) rotateX(2deg) translateY(-4px); }
          50% { transform: perspective(800px) rotateY(0deg) rotateX(-2deg) translateY(-2px); }
          75% { transform: perspective(800px) rotateY(-6deg) rotateX(1deg) translateY(-6px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .logo-3d {
          animation: logoFloat 8s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .gold-shimmer {
          background: linear-gradient(90deg, #D4B36A 0%, #F5E6B8 40%, #D4B36A 60%, #B8943A 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s ease-in-out infinite;
        }
        .fade-up { animation: fadeSlideUp 0.6s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.25s; }
        .fade-up-3 { animation-delay: 0.4s; }
      `}</style>

      <button
        onClick={() => navigate(-1)}
        className="fixed left-4 top-4 w-9 h-9 flex items-center justify-center text-[#0B0B0D]/40 hover:text-[#0B0B0D] transition-colors z-10"
        data-testid="login-back-btn"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Hero — Animated Logo */}
      <div className="pt-14 pb-6 px-6 flex flex-col items-center text-center">
        {/* 3D floating logo block */}
        <div className="logo-3d mb-6" data-testid="full-brand-logo">
          {/* Arch icon */}
          <svg width="56" height="64" viewBox="0 0 56 64" fill="none" className="mx-auto mb-3">
            <path d="M4 64V20C4 9 15 2 28 2C41 2 52 9 52 20V64" stroke="#D4B36A" strokeWidth="3" fill="none" />
            <path d="M16 64V28C16 22 21 17 28 17C35 17 40 22 40 28V64" stroke="#D4B36A" strokeWidth="2" fill="none" />
            <circle cx="28" cy="42" r="3.5" fill="#D4B36A" />
            <line x1="28" y1="46" x2="28" y2="56" stroke="#D4B36A" strokeWidth="2" />
          </svg>
          {/* Wordmark */}
          <div className="flex items-baseline justify-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            <span className="text-[36px] font-semibold text-[#0B0B0D] tracking-tight">VenuLo</span>
            <span className="text-[36px] font-bold gold-shimmer tracking-tight">Q</span>
          </div>
          <p className="text-[8px] tracking-[0.35em] uppercase text-[#0B0B0D]/30 mt-1 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Find &middot; Compare &middot; Lock
          </p>
        </div>

        {/* Welcome text */}
        <div className="w-8 h-[1px] bg-[#D4B36A]/40 mb-4 fade-up fade-up-1" />
        <h2 className="text-[18px] text-[#0B0B0D]/80 mb-1 fade-up fade-up-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}>
          Welcome to <span className="text-[#0B0B0D] font-semibold">VenuLoQ</span>
        </h2>
        <p className="text-[11px] text-[#0B0B0D]/30 tracking-[0.1em] uppercase fade-up fade-up-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Your smart venue booking platform
        </p>
      </div>

      {/* Form Card */}
      <div className="mx-4 bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] px-6 pt-6 pb-5 mb-6 fade-up fade-up-3">
        <p className="text-[10px] text-[#0B0B0D]/30 uppercase tracking-[0.2em] font-semibold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Team Login
        </p>

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 border border-[#E5E0D8] bg-white hover:border-[#D4B36A]/50 transition-all text-[13px] font-medium text-[#1A1A1A] rounded-xl"
          data-testid="google-login-btn"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E0D8]" /></div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-[9px] uppercase tracking-[0.2em] text-[#B0B0B0] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]" strokeWidth={1.5} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username or email"
                className="w-full border border-[#E5E0D8] bg-[#FAFAF8] rounded-xl pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                data-testid="login-email"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]" strokeWidth={1.5} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-[#E5E0D8] bg-[#FAFAF8] rounded-xl pl-10 pr-10 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                data-testid="login-password"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0B0B0] hover:text-[#6E6E6E] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-5 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.1em] uppercase rounded-xl group"
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
        </form>
      </div>

      <p className="text-center text-[12px] text-[#0B0B0D]/35 pb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Not a team member?{' '}
        <Link to={`/auth${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#0B0B0D] font-semibold hover:text-[#D4B36A] transition-colors">
          Customer Sign In
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
