import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';

const ROLE_DASHBOARDS = {
  admin: '/team/dashboard',
  rm: '/team/dashboard',
  hr: '/team/dashboard',
  venue_specialist: '/team/dashboard',
  vam: '/team/dashboard',
  venue_owner: '/team/dashboard',
  event_planner: '/team/dashboard',
  finance: '/team/dashboard',
  operations: '/team/dashboard',
  marketing: '/team/dashboard',
};

const TeamLogin = () => {
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const dash = ROLE_DASHBOARDS[user.role];
      if (dash) navigate(dash, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const userData = await login(email.trim(), password);
      const dash = ROLE_DASHBOARDS[userData.role];
      if (dash) {
        navigate(dash, { replace: true });
      } else {
        toast.error('This account does not have team portal access');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#0C0E13',
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,179,106,0.06) 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, rgba(212,179,106,0.03) 0%, transparent 40%)
        `,
      }}
      data-testid="team-login-page"
    >
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-28 h-28 rounded-2xl bg-gradient-to-b from-[#1a1c23] to-[#12141a] border border-[#2a2c35] flex items-center justify-center shadow-lg shadow-black/30 overflow-hidden">
            <img
              src="/team-logo-original.png"
              alt="VenuLoQ Team"
              className="w-[88px] h-auto object-contain"
              data-testid="team-login-logo"
            />
          </div>
          <h1
            className="text-2xl text-white tracking-tight font-semibold"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            data-testid="team-login-title"
          >
            Team Portal
          </h1>
          <p className="text-[13px] text-slate-500 mt-1.5 tracking-wide">
            VenuLoQ Internal Operations
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-7 border border-[#1e2028] shadow-2xl shadow-black/40"
          style={{
            background: 'linear-gradient(135deg, #14161c 0%, #111318 100%)',
          }}
          data-testid="team-login-card"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#1e2028]">
            <div className="w-9 h-9 rounded-lg bg-[#D4B36A]/10 flex items-center justify-center ring-1 ring-[#D4B36A]/20">
              <Lock className="w-4 h-4 text-[#D4B36A]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white" data-testid="team-login-card-title">
                Staff Sign In
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Admin, HR, RM, Finance, Specialist & more
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="team-login-form">
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1.5 block tracking-wider uppercase">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@venuloq.in"
                className="w-full h-11 bg-[#0C0E13] border border-[#23252e] rounded-xl px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]/50 transition-all duration-200"
                required
                autoFocus
                data-testid="team-login-email"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1.5 block tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 bg-[#0C0E13] border border-[#23252e] rounded-xl px-4 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/30 focus:border-[#D4B36A]/50 transition-all duration-200"
                  required
                  data-testid="team-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  data-testid="team-login-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? '#3a3520'
                  : 'linear-gradient(135deg, #D4B36A 0%, #B89A4E 100%)',
                color: '#0C0E13',
              }}
              data-testid="team-login-submit"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0C0E13]/30 border-t-[#0C0E13] rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px] text-slate-600">
            Internal access only — authorized personnel
          </p>
          <p className="text-[11px] text-slate-700">
            Contact your administrator for access credentials
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamLogin;
