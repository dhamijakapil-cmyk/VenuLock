import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronLeft, Shield, Sparkles, Lock, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isCapacitor } from '@/utils/platform';

const BG_IMG = 'https://images.unsplash.com/photo-1765834304973-8e38ed47f924?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBpbmRpYW4lMjB3ZWRkaW5nJTIwcGFsYWNlJTIwdmVudWUlMjBpbnRlcmlvciUyMGdvbGR8ZW58MHx8fHwxNzczNDcxNTk1fDA&ixlib=rb-4.1.0&q=85';

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
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

  // Steps: 'main' → 'otp' → done | 'email-entry' | 'password-signin' | 'password-signup'
  const [step, setStep] = useState('main');
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
      navigate(redirectTo || '/home', { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const navigateAfterAuth = (userData) => {
    if (redirectTo) { navigate(redirectTo); return; }
    const dashboards = { admin: '/admin/dashboard', rm: '/rm/dashboard', hr: '/hr/dashboard', venue_owner: '/venue-owner/dashboard', event_planner: '/planner/dashboard', finance: '/hr/dashboard', operations: '/hr/dashboard', marketing: '/hr/dashboard', venue_specialist: '/specialist/dashboard', vam: '/vam/dashboard', customer: '/home' };
    navigate(dashboards[userData.role] || from);
  };

  /* ── Social Auth Handlers ── */
  // Domains where custom GCP OAuth redirect URIs are registered
  const GCP_OAUTH_DOMAINS = ['venuloq.com', 'www.venuloq.com', 'delhi.venuloq.com'];

  const handleGoogleLogin = async () => {
    const afterLogin = redirectTo || '/home';
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const useCustomGCP = GCP_OAUTH_DOMAINS.includes(hostname);

    if (useCustomGCP) {
      // Production: use custom GCP OAuth (redirect URIs are registered)
      try {
        const redirectUri = origin + '/auth/google';
        const { data: config } = await api.get('/auth/google/config');
        if (config.enabled) {
          const { data } = await api.post('/auth/google/auth-url', { redirect_uri: redirectUri });
          const sep = data.url.includes('?') ? '&' : '?';
          window.location.href = `${data.url}${sep}state=${encodeURIComponent(afterLogin)}`;
          return;
        }
      } catch { /* fall through to Emergent auth */ }
    }

    // Default: Emergent-managed Google Auth (works on any domain)
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  const handleAppleLogin = async () => {
    try {
      const afterLogin = redirectTo || '/home';
      const redirectUri = window.location.origin + '/auth/apple';
      const { data: config } = await api.get('/auth/apple/config');
      if (config.enabled) {
        const { data } = await api.post('/auth/apple/auth-url', {
          redirect_uri: redirectUri,
          state: afterLogin,
        });
        window.location.href = data.url;
      } else {
        toast.error('Apple Sign In is not yet available');
      }
    } catch {
      toast.error('Apple Sign In is not yet available');
    }
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
      if (res.debug_otp) {
        toast.info(`Dev code: ${res.debug_otp}`, { duration: 15000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not send code. Try again.');
    } finally { setLoading(false); }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); }
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
      toast.error(err.response?.data?.detail || 'Invalid code');
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

  const goBack = () => {
    if (step === 'otp') { setStep('email-entry'); setOtp(['', '', '', '', '', '']); }
    else if (step === 'email-entry' || step === 'password-signin' || step === 'password-signup') { setStep('main'); }
    else { navigate(-1); }
  };

  const isPasswordMode = step === 'password-signin' || step === 'password-signup';

  // Heading text per step
  const headings = {
    main: { title: 'Welcome', sub: 'Sign in or create an account' },
    'email-entry': { title: 'Continue with Email', sub: "We'll send you a one-time code" },
    otp: { title: 'Enter your code', sub: `We sent a 6-digit code to ${email}` },
    'password-signin': { title: 'Sign In', sub: 'Sign in with your password' },
    'password-signup': { title: 'Create Account', sub: 'Create your VenuLoQ account' },
  };
  const h = headings[step] || headings.main;

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
          <p className="text-sm text-white/40 mt-4" style={sans}>Discover and book extraordinary venues across India</p>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="w-full lg:w-[55%] relative min-h-screen flex flex-col">
        <div className="lg:hidden absolute inset-0 overflow-hidden">
          <img src={BG_IMG} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns-bg scale-110" />
          <div className="absolute inset-0 bg-[#0B0B0D]/85 backdrop-blur-sm" />
        </div>
        <div className="hidden lg:block absolute inset-0 bg-[#F4F1EC]" />

        <div className="relative z-10 flex-1 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center px-5 pt-5 pb-2">
            <button onClick={goBack}
              className="w-10 h-10 flex items-center justify-center text-white/50 lg:text-[#0B0B0D]/40 hover:text-white lg:hover:text-[#0B0B0D] rounded-full hover:bg-white/10 lg:hover:bg-[#0B0B0D]/5 transition-all"
              data-testid="auth-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 pb-8 lg:items-center">
            <AnimatePresence mode="wait">
              <motion.div key={step} className="w-full lg:max-w-[440px]"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

                {/* Brand + Heading */}
                <div className="mb-7 lg:mb-8">
                  {[false, true].map((isDesktop) => (
                    <div key={isDesktop ? 'd' : 'm'} className={isDesktop ? 'hidden lg:block text-center' : 'lg:hidden'}>
                      <h1 className={`text-[36px] tracking-tight leading-none ${isDesktop ? 'text-[#0B0B0D]' : 'text-white'}`} style={{ ...serif, fontWeight: 600 }} data-testid="auth-brand-logo">
                        VenuLo<span className="text-[#D4B36A]">Q</span>
                      </h1>
                      <p className={`text-[10px] uppercase tracking-[0.2em] mt-1.5 mb-6 ${isDesktop ? 'text-slate-400' : 'text-white/30'}`} style={sans}>Find. Compare. Lock.</p>
                      <h2 className={`text-[22px] font-bold ${isDesktop ? 'text-[#0B0B0D]' : 'text-white'}`} style={sans} data-testid="auth-heading">{h.title}</h2>
                      <p className={`text-[13px] mt-1 ${isDesktop ? 'text-slate-500' : 'text-white/40'}`} style={sans}>{h.sub}</p>
                    </div>
                  ))}
                </div>

                {/* ═══════ STEP: MAIN (Social buttons + Email entry) ═══════ */}
                {step === 'main' && (
                  <>
                    {/* 1. Continue with Google — Primary */}
                    <button onClick={handleGoogleLogin}
                      className="w-full bg-white hover:bg-slate-50 border border-white/15 lg:border-slate-200 text-[#333] font-semibold h-[52px] rounded-xl flex items-center justify-center gap-2.5 transition-all text-[15px] shadow-sm"
                      data-testid="auth-google-btn" style={sans}>
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    {/* 2. Sign in with Apple — Only on native iOS (Capacitor) */}
                    {isCapacitor() && (
                      <button onClick={handleAppleLogin}
                        className="w-full mt-3 bg-[#000000] hover:bg-[#1a1a1a] text-white font-semibold h-[52px] rounded-xl flex items-center justify-center gap-2.5 transition-all text-[15px] shadow-sm"
                        data-testid="auth-apple-btn" style={sans}>
                        <AppleIcon />
                        Sign in with Apple
                      </button>
                    )}

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10 lg:border-slate-200" /></div>
                      <div className="relative flex justify-center">
                        <span className="px-4 text-[10px] uppercase tracking-[0.2em] text-white/30 lg:text-slate-400 font-medium" style={sans}>or</span>
                      </div>
                    </div>

                    {/* 3. Continue with Email / OTP */}
                    <button onClick={() => setStep('email-entry')}
                      className="w-full bg-white/[0.08] lg:bg-white hover:bg-white/[0.12] lg:hover:bg-slate-50 border border-white/10 lg:border-slate-200 text-white/80 lg:text-[#555] font-medium h-[50px] rounded-xl flex items-center justify-center gap-2.5 transition-all text-[14px]"
                      data-testid="auth-email-btn" style={sans}>
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      Continue with Email
                    </button>

                    {/* Password sign-in link */}
                    <button onClick={() => setStep('password-signin')}
                      className="w-full mt-3 text-center text-[13px] text-white/25 lg:text-slate-400 hover:text-[#D4B36A] transition-colors py-2"
                      data-testid="auth-password-link" style={sans}>
                      Sign in with password instead
                    </button>
                  </>
                )}

                {/* ═══════ STEP: EMAIL ENTRY ═══════ */}
                {step === 'email-entry' && (
                  <form onSubmit={handleSendOTP}>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full h-[52px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-4 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                        data-testid="auth-email-input" style={sans} autoFocus required />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-[52px] rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(212,179,106,0.35)] hover:shadow-[0_6px_28px_rgba(212,179,106,0.45)] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 text-[15px] mt-4"
                      data-testid="auth-send-otp-btn" style={sans}>
                      {loading ? <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" /> : <><span>Send Verification Code</span><ArrowRight className="w-4 h-4" strokeWidth={2} /></>}
                    </button>
                  </form>
                )}

                {/* ═══════ STEP: OTP ═══════ */}
                {step === 'otp' && (
                  <form onSubmit={handleVerifyOTP}>
                    <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOTPPaste}>
                      {otp.map((digit, i) => (
                        <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1}
                          value={digit} onChange={(e) => handleOTPChange(i, e.target.value)} onKeyDown={(e) => handleOTPKeyDown(i, e)}
                          className="w-12 h-14 text-center text-xl font-bold bg-white/[0.08] lg:bg-white border border-white/15 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-2 focus:ring-[#D4B36A]/30 rounded-xl text-white lg:text-[#0B0B0D] transition-all outline-none"
                          data-testid={`auth-otp-input-${i}`} style={sans} autoFocus={i === 0} />
                      ))}
                    </div>
                    <label className="flex items-center gap-2.5 mb-5 cursor-pointer justify-center">
                      <input type="checkbox" checked={staySignedIn} onChange={(e) => setStaySignedIn(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 lg:border-slate-300 text-[#D4B36A] focus:ring-[#D4B36A]/30 bg-transparent" data-testid="auth-stay-signed-in" />
                      <span className="text-[13px] text-white/40 lg:text-slate-500" style={sans}>Keep me signed in for 30 days</span>
                    </label>
                    <button type="submit" disabled={loading || otp.join('').length !== 6}
                      className="w-full bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold h-[52px] rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(212,179,106,0.35)] hover:shadow-[0_6px_28px_rgba(212,179,106,0.45)] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 text-[15px]"
                      data-testid="auth-verify-otp-btn" style={sans}>
                      {loading ? <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" /> : <><span>Verify & Sign In</span><ArrowRight className="w-4 h-4" strokeWidth={2} /></>}
                    </button>
                    <div className="text-center mt-4">
                      {countdown > 0 ? (
                        <p className="text-[13px] text-white/30 lg:text-slate-400" style={sans}>Resend code in <span className="text-[#D4B36A] font-semibold">{countdown}s</span></p>
                      ) : (
                        <button type="button" onClick={handleSendOTP} className="text-[13px] text-[#D4B36A] hover:text-[#EDD07E] font-semibold transition-colors" data-testid="auth-resend-otp" style={sans}>Resend code</button>
                      )}
                    </div>
                  </form>
                )}

                {/* ═══════ STEP: PASSWORD ═══════ */}
                {isPasswordMode && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                    {step === 'password-signup' && (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                          className="w-full h-[50px] bg-white/[0.08] lg:bg-white border border-white/10 lg:border-slate-200 focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30 rounded-xl pl-12 pr-4 text-[15px] text-white lg:text-[#0B0B0D] placeholder:text-white/30 lg:placeholder:text-slate-400 transition-all outline-none"
                          data-testid="auth-name-input" style={sans} />
                      </div>
                    )}
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 lg:text-slate-400" strokeWidth={1.5} />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
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
                      {loading ? <div className="w-5 h-5 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" /> : <><span>{step === 'password-signup' ? 'Create Account' : 'Sign In'}</span><ArrowRight className="w-4 h-4" strokeWidth={2} /></>}
                    </button>
                    <p className="text-center mt-4 text-[13px] text-white/40 lg:text-slate-500" style={sans}>
                      {step === 'password-signup' ? 'Already have an account? ' : 'Need an account? '}
                      <button type="button"
                        onClick={() => { setStep(step === 'password-signup' ? 'password-signin' : 'password-signup'); setPassword(''); setConfirmPassword(''); }}
                        className="text-[#D4B36A] hover:text-[#EDD07E] font-semibold transition-colors"
                        data-testid="auth-switch-mode">
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
            <Link to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-white/15 lg:text-slate-400 hover:text-[#D4B36A] font-medium transition-colors"
              data-testid="auth-team-login-link" style={sans}>
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
