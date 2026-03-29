import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronLeft, Shield, Sparkles, Lock, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BG_IMG = 'https://images.unsplash.com/photo-1765834304973-8e38ed47f924?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBpbmRpYW4lMjB3ZWRkaW5nJTIwcGFsYWNlJTIwdmVudWUlMjBpbnRlcmlvciUyMGdvbGR8ZW58MHx8fHwxNzczNDcxNTk1fDA&ixlib=rb-4.1.0&q=85';

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const sans = { fontFamily: "'DM Sans', sans-serif" };

const AuthPage = () => {
  const { login, register, sendEmailOTP, verifyEmailOTP, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '';
  const from = location.state?.from?.pathname || '/';

  // Steps: 'email' → 'otp' → done | 'password-signin' | 'password-signup'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const otpRefs = useRef([]);

  // Password mode fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectTo || '/my-enquiries', { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const navigateAfterAuth = (userData) => {
    if (redirectTo) { navigate(redirectTo); return; }
    const dashboards = { admin: '/admin/dashboard', rm: '/rm/dashboard', hr: '/hr/dashboard', venue_owner: '/venue-owner/dashboard', event_planner: '/planner/dashboard', finance: '/hr/dashboard', operations: '/hr/dashboard', marketing: '/hr/dashboard', venue_specialist: '/specialist/dashboard', vam: '/vam/dashboard', customer: '/my-enquiries' };
    navigate(dashboards[userData.role] || from);
  };

  /* ── OTP Flow ── */
  const handleSendOTP = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await sendEmailOTP(trimmed);
      toast.success('Verification code sent to your email');
      setStep('otp');
      setCountdown(30);
      // If email delivery failed, show debug OTP in dev
      if (res.debug_otp) {
        toast.info(`Dev code: ${res.debug_otp}`, { duration: 15000 });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not send code. Try again.';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Please enter the full 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await verifyEmailOTP(email.trim(), code, staySignedIn);
      toast.success(res.is_new_user ? 'Account created!' : 'Welcome back!');
      navigateAfterAuth(res.user);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid code';
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  /* ── Password Flow ── */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) { toast.error('Please fill in all fields'); return; }
    if (step === 'password-signup') {
      if (!name.trim()) { toast.error('Please enter your name'); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    }
    setLoading(true);
    try {
      if (step === 'password-signup') {
        const userData = await register({ email: trimmedEmail, password, name: name.trim() });
        toast.success('Account created!');
        navigateAfterAuth(userData);
      } else {
        const userData = await login(trimmedEmail, password);
        toast.success('Welcome back!');
        navigateAfterAuth(userData);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally { setLoading(false); }
  };

  /* ── Google OAuth ── */
  const handleGoogleLogin = async () => {
    try {
      const afterLogin = redirectTo || '/my-enquiries';
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUri = window.location.origin + '/auth/google';

      // First try custom Google OAuth (VenuLoQ GCP project)
      const { data: config } = await (await import('@/context/AuthContext')).api.get('/auth/google/config');

      if (config.enabled) {
        const { data } = await (await import('@/context/AuthContext')).api.post('/auth/google/auth-url', {
          redirect_uri: redirectUri,
        });
        // Encode the intended destination in the state parameter
        const separator = data.url.includes('?') ? '&' : '?';
        window.location.href = `${data.url}${separator}state=${encodeURIComponent(afterLogin)}`;
      } else {
        // Fallback to Emergent-managed Google Auth (shows "Testing" branding)
        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
      }
    } catch {
      // Fallback to Emergent auth if backend is unreachable
      const afterLogin = redirectTo || '/my-enquiries';
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
    }
  };

  const isPasswordMode = step === 'password-signin' || step === 'password-signup';

  return (
    <div className="min-h-screen flex" style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes kenBurns { 0% { transform: scale(1); } 100% { transform: scale(1.12); } }
        .ken-burns-bg { animation: kenBurns 25s ease-in-out infinite alternate; }
      `}</style>

      {/* ===== Desktop Left Panel ===== */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#0B0B0D]">
        <img src={BG_IMG} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns-bg" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D]/90 via-[#0B0B0D]/40 to-[#0B0B0D]/60" />
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

      {/* ===== Main Content ===== */}
      <div className="w-full lg:w-[55%] relative min-h-screen flex flex-col">
        {/* Mobile background */}
        <div className="lg:hidden absolute inset-0 overflow-hidden">
          <img src={BG_IMG} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns-bg scale-110" />
          <div className="absolute inset-0 bg-[#0B0B0D]/85 backdrop-blur-sm" />
        </div>
        {/* Desktop background */}
        <div className="hidden lg:block absolute inset-0 bg-[#F4F1EC]" />

        <div className="relative z-10 flex-1 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <button
              onClick={() => {
                if (step === 'otp') { setStep('email'); setOtp(['', '', '', '', '', '']); }
                else if (isPasswordMode) { setStep('email'); }
                else { navigate(-1); }
              }}
              className="w-10 h-10 flex items-center justify-center text-white/50 lg:text-[#0B0B0D]/40 hover:text-white lg:hover:text-[#0B0B0D] rounded-full hover:bg-white/10 lg:hover:bg-[#0B0B0D]/5 transition-all"
              data-testid="auth-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 pb-8 lg:items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="w-full lg:max-w-[440px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Brand + Heading */}
                <div className="mb-7 lg:mb-8">
                  <div className="lg:hidden">
                    <h1 className="text-[36px] text-white tracking-tight leading-none" style={{ ...serif, fontWeight: 600 }} data-testid="auth-brand-logo">
                      VenuLo<span className="text-[#D4B36A]">Q</span>
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1.5 mb-6" style={sans}>Find. Compare. Lock.</p>
                    <h2 className="text-[22px] font-bold text-white" style={sans} data-testid="auth-heading">
                      {step === 'otp' ? 'Enter your code' : isPasswordMode ? (step === 'password-signup' ? 'Create Account' : 'Sign In') : 'Welcome'}
                    </h2>
                    <p className="text-[13px] text-white/40 mt-1" style={sans}>
                      {step === 'otp' ? `We sent a 6-digit code to ${email}` : isPasswordMode ? (step === 'password-signup' ? 'Create your VenuLoQ account' : 'Sign in with your password') : 'Sign in or create an account instantly'}
                    </p>
                  </div>
                  <div className="hidden lg:block text-center">
                    <h1 className="text-[36px] text-[#0B0B0D] tracking-tight leading-none" style={{ ...serif, fontWeight: 600 }}>
                      VenuLo<span className="text-[#D4B36A]">Q</span>
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-1.5 mb-5" style={sans}>Find. Compare. Lock.</p>
                    <h2 className="text-[22px] font-bold text-[#0B0B0D]" style={sans}>
                      {step === 'otp' ? 'Enter your code' : isPasswordMode ? (step === 'password-signup' ? 'Create Account' : 'Sign In') : 'Welcome'}
                    </h2>
                    <p className="text-[13px] text-slate-500 mt-1" style={sans}>
                      {step === 'otp' ? `We sent a 6-digit code to ${email}` : isPasswordMode ? (step === 'password-signup' ? 'Create your VenuLoQ account' : 'Sign in with your password') : 'Sign in or create an account instantly'}
                    </p>
                  </div>
                </div>

                {/* ═══════════════ STEP: EMAIL ═══════════════ */}
                {step === 'email' && (
                  <>
                    <form onSubmit={handleSendOTP}>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full h-[52px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-4 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                          data-testid="auth-email-input"
                          style={sans}
                          autoFocus
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-[52px] rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(212,179,106,0.35)] hover:shadow-[0_6px_28px_rgba(212,179,106,0.45)] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 text-[15px] mt-4"
                        data-testid="auth-send-otp-btn"
                        style={sans}
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                        ) : (
                          <>
                            Continue with Email
                            <ArrowRight className="w-4 h-4" strokeWidth={2} />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10 lg:border-slate-200" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 text-[10px] uppercase tracking-[0.2em] text-white/30 lg:text-slate-400 font-medium bg-transparent" style={sans}>or</span>
                      </div>
                    </div>

                    {/* Google — Secondary */}
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full bg-white/[0.06] lg:bg-white hover:bg-white/[0.12] lg:hover:bg-slate-50 border border-white/10 lg:border-slate-200 text-white/70 lg:text-[#555] font-medium h-[48px] rounded-xl flex items-center justify-center gap-2.5 transition-all text-[14px]"
                      data-testid="auth-google-btn"
                      style={sans}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    {/* Password sign-in link */}
                    <button
                      onClick={() => setStep('password-signin')}
                      className="w-full mt-3 text-center text-[13px] text-white/30 lg:text-slate-400 hover:text-[#D4B36A] transition-colors py-2"
                      data-testid="auth-password-link"
                      style={sans}
                    >
                      Sign in with password instead
                    </button>
                  </>
                )}

                {/* ═══════════════ STEP: OTP ═══════════════ */}
                {step === 'otp' && (
                  <form onSubmit={handleVerifyOTP}>
                    {/* OTP Input boxes */}
                    <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOTPPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => otpRefs.current[i] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOTPChange(i, e.target.value)}
                          onKeyDown={(e) => handleOTPKeyDown(i, e)}
                          className="w-12 h-14 text-center text-xl font-bold bg-white/[0.08] lg:bg-white border border-white/15 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-2 focus:ring-[#D4B36A]/30 rounded-xl text-white lg:text-[#0B0B0D] transition-all outline-none"
                          data-testid={`auth-otp-input-${i}`}
                          style={sans}
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    {/* Stay signed in */}
                    <label className="flex items-center gap-2.5 mb-5 cursor-pointer justify-center">
                      <input
                        type="checkbox"
                        checked={staySignedIn}
                        onChange={(e) => setStaySignedIn(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 lg:border-slate-300 text-[#D4B36A] focus:ring-[#D4B36A]/30 bg-transparent"
                        data-testid="auth-stay-signed-in"
                      />
                      <span className="text-[13px] text-white/40 lg:text-slate-500" style={sans}>Keep me signed in for 30 days</span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading || otp.join('').length !== 6}
                      className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-[52px] rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(212,179,106,0.35)] hover:shadow-[0_6px_28px_rgba(212,179,106,0.45)] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 text-[15px]"
                      data-testid="auth-verify-otp-btn"
                      style={sans}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                      ) : (
                        <>
                          Verify & Sign In
                          <ArrowRight className="w-4 h-4" strokeWidth={2} />
                        </>
                      )}
                    </button>

                    {/* Resend */}
                    <div className="text-center mt-4">
                      {countdown > 0 ? (
                        <p className="text-[13px] text-white/30 lg:text-slate-400" style={sans}>
                          Resend code in <span className="text-[#D4B36A] font-semibold">{countdown}s</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          className="text-[13px] text-[#D4B36A] hover:text-[#EDD07E] font-semibold transition-colors"
                          data-testid="auth-resend-otp"
                          style={sans}
                        >
                          Resend code
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* ═══════════════ STEP: PASSWORD ═══════════════ */}
                {isPasswordMode && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                    {step === 'password-signup' && (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                          className="w-full h-[50px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-4 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                          data-testid="auth-name-input" style={sans} />
                      </div>
                    )}
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full h-[50px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-4 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                        data-testid="auth-email-input" style={sans} required autoFocus />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={step === 'password-signup' ? 'Create a password' : 'Password'}
                        className="w-full h-[50px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-12 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                        data-testid="auth-password-input" style={sans} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 lg:text-slate-400 hover:text-white/60 lg:hover:text-slate-600 transition-colors"
                        data-testid="auth-toggle-password">
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                      </button>
                    </div>
                    {step === 'password-signup' && (
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                        <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className="w-full h-[50px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-4 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                          data-testid="auth-confirm-password-input" style={sans} required />
                      </div>
                    )}
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-[52px] rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(212,179,106,0.35)] hover:shadow-[0_6px_28px_rgba(212,179,106,0.45)] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 text-[15px] mt-1"
                      data-testid="auth-submit-btn" style={sans}>
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                      ) : (
                        <>
                          {step === 'password-signup' ? 'Create Account' : 'Sign In'}
                          <ArrowRight className="w-4 h-4" strokeWidth={2} />
                        </>
                      )}
                    </button>

                    {/* Toggle signin/signup within password mode */}
                    <p className="text-center mt-4 text-[13px] text-white/40 lg:text-slate-500" style={sans}>
                      {step === 'password-signup' ? 'Already have an account? ' : 'Need an account? '}
                      <button
                        type="button"
                        onClick={() => { setStep(step === 'password-signup' ? 'password-signin' : 'password-signup'); setPassword(''); setConfirmPassword(''); }}
                        className="text-[#D4B36A] hover:text-[#EDD07E] font-semibold transition-colors"
                        data-testid="auth-switch-mode"
                      >
                        {step === 'password-signup' ? 'Sign In' : 'Sign Up'}
                      </button>
                    </p>
                  </form>
                )}

                {/* Trust signals */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#D4B36A]/50" />
                    <span className="text-[9px] text-white/20 lg:text-slate-400 font-medium uppercase tracking-wider" style={sans}>Free forever</span>
                  </div>
                  <div className="w-px h-3 bg-white/10 lg:bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-[#D4B36A]/50" />
                    <span className="text-[9px] text-white/20 lg:text-slate-400 font-medium uppercase tracking-wider" style={sans}>No spam</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Team Login link */}
            <Link
              to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-white/15 lg:text-slate-400 hover:text-[#D4B36A] font-medium transition-colors"
              data-testid="auth-team-login-link"
              style={sans}
            >
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              Team Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
