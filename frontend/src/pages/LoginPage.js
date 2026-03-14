import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { User, Lock, Eye, EyeOff, ArrowRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d6aadd14-84a9-4588-ad39-9e33b5dd867e/artifacts/ob5cd1jx_0B10E960-B7CD-4302-9CC9-469B618F0266.png';

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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
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

  const handleCardMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -4, y: x * 4 });
  };
  const handleCardLeave = () => setTilt({ x: 0, y: 0 });

  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
  const sans = { fontFamily: "'DM Sans', sans-serif" };

  return (
    <div className="min-h-screen flex" style={{ minHeight: '100dvh' }}>
      {/* ===== Left — Abstract Dark/Gold (desktop) ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0B0B0D]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#101B36] via-[#0B0B0D] to-[#0B0B0D]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 25% 50%, rgba(212,179,106,0.12) 0%, transparent 60%),
                              radial-gradient(ellipse at 75% 30%, rgba(212,179,106,0.06) 0%, transparent 40%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,179,106,1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(212,179,106,1) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute bottom-16 left-12 right-12 z-10">
          <div className="h-px w-16 bg-[#D4B36A] mb-6" />
          <p className="text-3xl text-white/90 leading-snug" style={{ ...serif, fontWeight: 500 }}>
            Team Portal
          </p>
          <p className="text-sm text-white/40 mt-4" style={sans}>
            Manage venues, bookings, and client relationships
          </p>
        </div>
      </div>

      {/* ===== Right — Login Card ===== */}
      <div className="w-full lg:w-1/2 bg-[#F4F1EC] min-h-screen flex flex-col items-center justify-center px-6 py-10 lg:px-12 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-5 top-5 w-10 h-10 flex items-center justify-center text-[#101B36]/40 hover:text-[#101B36] rounded-full hover:bg-[#101B36]/5 transition-all"
          data-testid="login-back-btn"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <motion.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="overflow-hidden rounded-xl shadow-2xl"
            onMouseMove={handleCardMove}
            onMouseLeave={handleCardLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.2s ease-out',
              transformStyle: 'preserve-3d',
            }}
            data-testid="login-card"
          >
            {/* ── Dark Header ── */}
            <div className="bg-[#0B0B0D] px-8 pt-8 pb-6 text-center">
              <img
                src={LOGO_URL}
                alt="VenuLoQ"
                className="h-14 mx-auto mb-5 opacity-90"
                data-testid="full-brand-logo"
              />
              <h1 className="text-[22px] text-white" style={{ ...serif, fontWeight: 500 }}>
                Team Portal
              </h1>
              <p className="text-[13px] text-white/40 mt-1.5" style={sans}>
                Admin, RM & Venue Manager access
              </p>
            </div>

            {/* ── White Body ── */}
            <div className="bg-white px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Username or email"
                    className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-none pl-10 pr-4 text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                    data-testid="login-email"
                    style={sans}
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-none pl-10 pr-10 text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                    data-testid="login-password"
                    style={sans}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    data-testid="login-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4B36A] hover:bg-[#B59550] text-[#0B0B0D] font-medium h-12 rounded-none transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,179,106,0.39)] hover:shadow-[0_6px_20px_rgba(212,179,106,0.23)] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm"
                  data-testid="login-submit"
                  style={sans}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Customer Sign In link */}
        <p className="mt-8 text-sm text-slate-500" style={sans}>
          Not a team member?{' '}
          <Link
            to={`/auth${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="text-[#D4B36A] hover:text-[#B59550] font-medium transition-colors"
            data-testid="login-customer-link"
          >
            Customer Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
