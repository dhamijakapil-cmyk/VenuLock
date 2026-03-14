import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, ChevronLeft, Shield, X, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d6aadd14-84a9-4588-ad39-9e33b5dd867e/artifacts/ob5cd1jx_0B10E960-B7CD-4302-9CC9-469B618F0266.png';
const HERO_IMG = 'https://images.unsplash.com/photo-1765834304973-8e38ed47f924?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBpbmRpYW4lMjB3ZWRkaW5nJTIwcGFsYWNlJTIwdmVudWUlMjBpbnRlcmlvciUyMGdvbGR8ZW58MHx8fHwxNzczNDcxNTk1fDA&ixlib=rb-4.1.0&q=85';

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
const FacebookIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const XIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#000000">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const AuthPage = () => {
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '';
  const from = location.state?.from?.pathname || '/';

  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectTo || '/my-enquiries', { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  const navigateAfterAuth = (userData) => {
    if (redirectTo) { navigate(redirectTo); return; }
    const dashboards = { admin: '/admin/dashboard', rm: '/rm/dashboard', venue_owner: '/venue-owner/dashboard', event_planner: '/planner/dashboard', customer: '/my-enquiries' };
    navigate(dashboards[userData.role] || from);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error('Please fill in all fields'); return; }

    if (mode === 'signup') {
      if (!name.trim()) { toast.error('Please enter your name'); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const userData = await register({ email: email.trim(), password, name: name.trim() });
        toast.success('Account created! Check your email to verify.');
        navigateAfterAuth(userData);
      } else {
        const userData = await login(email.trim(), password);
        toast.success('Welcome back!');
        navigateAfterAuth(userData);
      }
    } catch (error) {
      const msg = error.response?.data?.detail || (mode === 'signup' ? 'Registration failed' : 'Invalid email or password');
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    const afterLogin = redirectTo || '/my-enquiries';
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  const handleComingSoon = (provider) => {
    toast.info(`${provider} sign in coming soon!`);
  };

  const handleCardMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -4, y: x * 4 });
  };
  const handleCardLeave = () => setTilt({ x: 0, y: 0 });

  const switchMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setPassword('');
    setConfirmPassword('');
  };

  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
  const sans = { fontFamily: "'DM Sans', sans-serif" };

  const isSignUp = mode === 'signup';
  const headingText = isSignUp ? 'Create Account' : 'Sign In';
  const subtitleText = isSignUp ? 'Join VenuLoQ today' : 'Welcome back';

  return (
    <div className="min-h-screen flex" style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes kenBurns { 0% { transform: scale(1); } 100% { transform: scale(1.12); } }
        .ken-burns-img { animation: kenBurns 25s ease-in-out infinite alternate; }
      `}</style>

      {/* ===== Left — Immersive Image (desktop only) ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0B0B0D]">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns-img" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D]/80 via-[#0B0B0D]/30 to-[#0B0B0D]/50" />
        <div className="absolute bottom-16 left-12 right-12 z-10">
          <div className="h-px w-16 bg-[#D4B36A] mb-6" />
          <p className="text-3xl text-white/90 leading-snug" style={{ ...serif, fontWeight: 500 }}>
            Where Every Celebration<br />
            Finds Its <span className="text-[#D4B36A]">Perfect Stage</span>
          </p>
          <p className="text-sm text-white/40 mt-4" style={sans}>
            Discover and book extraordinary venues across India
          </p>
        </div>
      </div>

      {/* ===== Right / Main Content ===== */}
      <div className="w-full lg:w-1/2 bg-[#F4F1EC] min-h-screen flex flex-col relative">
        <div className="flex items-center justify-between px-5 pt-5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-[#101B36]/40 hover:text-[#101B36] rounded-full hover:bg-[#101B36]/5 transition-all"
            data-testid="auth-back-btn"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-[#101B36]/30 hover:text-[#101B36] rounded-full hover:bg-[#101B36]/5 transition-all"
            data-testid="auth-close-btn"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:items-center lg:justify-center px-7 pb-8 lg:px-12 overflow-y-auto">
          {/* ── MOBILE: Text wordmark ── */}
          <div className="lg:hidden mt-2 mb-6">
            <h1 className="text-[32px] text-[#0B0B0D] tracking-tight leading-none" style={{ ...serif, fontWeight: 600 }} data-testid="auth-brand-logo">
              VenuLo<span className="text-[#D4B36A]">Q</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mt-1.5" style={sans}>Find. Compare. Lock.</p>
          </div>

          <motion.div
            className="w-full lg:max-w-[440px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            key={mode}
          >
            <div
              className="lg:overflow-hidden lg:rounded-xl lg:shadow-2xl"
              onMouseMove={handleCardMove}
              onMouseLeave={handleCardLeave}
              style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: 'transform 0.2s ease-out',
                transformStyle: 'preserve-3d',
              }}
              data-testid="auth-card"
            >
              {/* ── Desktop Dark Header ── */}
              <div className="hidden lg:block bg-[#0B0B0D] px-10 pt-10 pb-8 text-center">
                <img src={LOGO_URL} alt="VenuLoQ" className="h-20 mx-auto mb-6 opacity-90" />
                <h1 className="text-[26px] text-white" style={{ ...serif, fontWeight: 500 }}>{headingText}</h1>
                <p className="text-[13px] text-white/40 mt-2" style={sans}>{subtitleText}</p>
              </div>

              {/* ── Mobile Heading ── */}
              <div className="lg:hidden mb-5">
                <h2 className="text-[26px] text-[#0B0B0D]" style={{ ...serif, fontWeight: 600 }} data-testid="auth-heading">
                  {headingText}
                </h2>
                <p className="text-[14px] text-slate-500 mt-1" style={sans}>{subtitleText}</p>
              </div>

              {/* ── Form Body ── */}
              <div className="lg:bg-white lg:px-10 lg:py-10">
                {/* Social Buttons */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium h-[52px] lg:h-12 rounded-full lg:rounded-none flex items-center justify-center gap-3 transition-all text-[15px] lg:text-sm shadow-sm lg:shadow-none"
                  data-testid="auth-google-btn"
                  style={sans}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleComingSoon('Facebook')}
                    className="flex-1 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium h-[46px] lg:h-11 rounded-full lg:rounded-none flex items-center justify-center gap-2 transition-all text-[13px] lg:text-xs"
                    data-testid="auth-facebook-btn"
                    style={sans}
                  >
                    <FacebookIcon />
                    <span className="hidden sm:inline">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleComingSoon('X')}
                    className="flex-1 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium h-[46px] lg:h-11 rounded-full lg:rounded-none flex items-center justify-center gap-2 transition-all text-[13px] lg:text-xs"
                    data-testid="auth-x-btn"
                    style={sans}
                  >
                    <XIcon />
                    <span className="hidden sm:inline">Continue with X</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#F4F1EC] lg:bg-white px-4 text-[11px] uppercase tracking-[0.2em] text-slate-400 font-medium" style={sans}>or</span>
                  </div>
                </div>

                {/* Email + Password Form */}
                <form onSubmit={handleSubmit}>
                  {isSignUp && (
                    <div className="mb-4">
                      <label className="text-[13px] font-bold text-[#0B0B0D] mb-2 block lg:hidden" style={sans}>Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 lg:left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] lg:w-4 lg:h-4 text-slate-400" strokeWidth={1.5} />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full h-[52px] lg:h-12 bg-white lg:bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-xl lg:rounded-none pl-12 lg:pl-10 pr-4 text-[15px] lg:text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                          data-testid="auth-name-input"
                          style={sans}
                          autoFocus={isSignUp}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-[13px] font-bold text-[#0B0B0D] mb-2 block lg:hidden" style={sans}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 lg:left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] lg:w-4 lg:h-4 text-slate-400" strokeWidth={1.5} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                        className="w-full h-[52px] lg:h-12 bg-white lg:bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-xl lg:rounded-none pl-12 lg:pl-10 pr-4 text-[15px] lg:text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                        data-testid="auth-email-input"
                        style={sans}
                        autoFocus={!isSignUp}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[13px] font-bold text-[#0B0B0D] mb-2 block lg:hidden" style={sans}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 lg:left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] lg:w-4 lg:h-4 text-slate-400" strokeWidth={1.5} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isSignUp ? 'Create a password' : 'Your password'}
                        className="w-full h-[52px] lg:h-12 bg-white lg:bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-xl lg:rounded-none pl-12 lg:pl-10 pr-12 text-[15px] lg:text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                        data-testid="auth-password-input"
                        style={sans}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        data-testid="auth-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="mb-4">
                      <label className="text-[13px] font-bold text-[#0B0B0D] mb-2 block lg:hidden" style={sans}>Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 lg:left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] lg:w-4 lg:h-4 text-slate-400" strokeWidth={1.5} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full h-[52px] lg:h-12 bg-white lg:bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-xl lg:rounded-none pl-12 lg:pl-10 pr-4 text-[15px] lg:text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                          data-testid="auth-confirm-password-input"
                          style={sans}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#D4B36A] hover:bg-[#B59550] text-[#0B0B0D] font-semibold lg:font-medium h-[52px] lg:h-12 rounded-xl lg:rounded-none transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,179,106,0.39)] hover:shadow-[0_6px_20px_rgba(212,179,106,0.23)] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 text-[15px] lg:text-sm mt-2"
                    data-testid="auth-submit-btn"
                    style={sans}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                    ) : (
                      <>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </form>

                {/* Toggle Sign In / Sign Up */}
                <p className="text-center mt-6 text-[14px] text-slate-500" style={sans}>
                  {isSignUp ? 'Already have an account? ' : 'New to VenuLoQ? '}
                  <button
                    onClick={switchMode}
                    className="text-[#D4B36A] hover:text-[#B59550] font-semibold transition-colors"
                    data-testid="auth-switch-mode"
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Admin Login Link */}
          <Link
            to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="mt-6 flex items-center justify-center gap-2 text-[14px] text-[#D4B36A] hover:text-[#B59550] font-medium transition-colors"
            data-testid="auth-team-login-link"
            style={sans}
          >
            <Shield className="w-4 h-4" strokeWidth={1.5} />
            Admin / RM / Venue Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
