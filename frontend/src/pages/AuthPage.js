import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronLeft, Shield, Smartphone, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const OTP_LENGTH = 6;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d6aadd14-84a9-4588-ad39-9e33b5dd867e/artifacts/ob5cd1jx_0B10E960-B7CD-4302-9CC9-469B618F0266.png';
const HERO_IMG = 'https://images.unsplash.com/photo-1765834304973-8e38ed47f924?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBpbmRpYW4lMjB3ZWRkaW5nJTIwcGFsYWNlJTIwdmVudWUlMjBpbnRlcmlvciUyMGdvbGR8ZW58MHx8fHwxNzczNDcxNTk1fDA&ixlib=rb-4.1.0&q=85';

const getErrorMsg = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || fallback;
  return fallback;
};

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AuthPage = () => {
  const { sendEmailOTP, verifyEmailOTP, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '';
  const from = location.state?.from?.pathname || '/';

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [autoFilling, setAutoFilling] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const otpRefs = useRef([]);
  const autoFillTimerRef = useRef(null);
  const pendingAutoFill = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectTo || '/my-enquiries', { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'otp' && pendingAutoFill.current) {
      const code = pendingAutoFill.current;
      pendingAutoFill.current = null;
      startAutoFill(code);
    }
    return () => {
      if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateAfterAuth = useCallback((userData) => {
    if (redirectTo) {
      navigate(redirectTo);
    } else {
      const dashboards = {
        admin: '/admin/dashboard',
        rm: '/rm/dashboard',
        venue_owner: '/venue-owner/dashboard',
        event_planner: '/planner/dashboard',
        customer: '/my-enquiries',
      };
      navigate(dashboards[userData.role] || from);
    }
  }, [navigate, redirectTo, from]);

  const doVerify = useCallback(async (emailAddr, code, stay) => {
    setLoading(true);
    try {
      const res = await verifyEmailOTP(emailAddr, code, stay);
      toast.success(res.is_new_user ? 'Welcome to VenuLoQ!' : 'Welcome back!');
      navigateAfterAuth(res.user);
    } catch (error) {
      toast.error(getErrorMsg(error, 'Verification failed'));
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
      setAutoFilling(false);
    }
  }, [verifyEmailOTP, navigateAfterAuth]);

  const startAutoFill = useCallback((code) => {
    setAutoFilling(true);
    const digits = code.split('');
    let i = 0;
    const fillNext = () => {
      if (i < digits.length) {
        const idx = i;
        setOtp(prev => { const next = [...prev]; next[idx] = digits[idx]; return next; });
        i++;
        autoFillTimerRef.current = setTimeout(fillNext, 110);
      } else {
        autoFillTimerRef.current = setTimeout(() => doVerify(email, code, staySignedIn), 500);
      }
    };
    autoFillTimerRef.current = setTimeout(fillNext, 1200);
  }, [doVerify, email, staySignedIn]);

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await sendEmailOTP(trimmed);
      if (res.debug_otp) pendingAutoFill.current = res.debug_otp;
      setStep('otp');
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendCooldown(30);
      toast.success(res.sent ? 'Verification code sent — check your inbox' : 'Verification code sent!');
    } catch (error) {
      toast.error(getErrorMsg(error, 'Failed to send verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue) => {
    const code = otpValue || otp.join('');
    if (code.length !== OTP_LENGTH) { toast.error('Please enter the full 6-digit code'); return; }
    await doVerify(email, code, staySignedIn);
  };

  const handleOtpChange = (index, value) => {
    if (autoFilling) return;
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (value && index === OTP_LENGTH - 1) {
      const full = newOtp.join('');
      if (full.length === OTP_LENGTH) handleVerifyOTP(full);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (autoFilling) return;
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handleVerifyOTP();
  };

  const handleOtpPaste = (e) => {
    if (autoFilling) return;
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!paste) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    paste.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    if (paste.length === OTP_LENGTH) handleVerifyOTP(paste);
  };

  const handleGoogleLogin = () => {
    const afterLogin = redirectTo || '/my-enquiries';
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  const handleBack = () => {
    if (step === 'otp') {
      if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
      setAutoFilling(false);
      setStep('email');
      setOtp(Array(OTP_LENGTH).fill(''));
      pendingAutoFill.current = null;
    } else {
      navigate(-1);
    }
  };

  const handleResend = () => {
    if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
    setAutoFilling(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    handleSendOTP();
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
      <style>{`
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.12); }
        }
        .ken-burns-img { animation: kenBurns 25s ease-in-out infinite alternate; }
      `}</style>

      {/* ===== Left — Immersive Image (desktop) ===== */}
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

      {/* ===== Right — Auth Card ===== */}
      <div className="w-full lg:w-1/2 bg-[#F4F1EC] min-h-screen flex flex-col items-center justify-center px-6 py-10 lg:px-12 relative">
        <button
          onClick={handleBack}
          className="absolute left-5 top-5 w-10 h-10 flex items-center justify-center text-[#101B36]/40 hover:text-[#101B36] rounded-full hover:bg-[#101B36]/5 transition-all"
          data-testid="auth-back-btn"
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
            data-testid="auth-card"
          >
            {/* ── Dark Header ── */}
            <div className="bg-[#0B0B0D] px-8 pt-8 pb-6 text-center">
              <img
                src={LOGO_URL}
                alt="VenuLoQ"
                className="h-14 mx-auto mb-5 opacity-90"
                data-testid="auth-brand-logo"
              />
              <h1 className="text-[22px] text-white" style={{ ...serif, fontWeight: 500 }}>
                {step === 'email' ? 'Welcome' : 'Verify Email'}
              </h1>
              <p className="text-[13px] text-white/40 mt-1.5" style={sans}>
                {step === 'email' ? 'Sign in or create your account' : `Code sent to ${email}`}
              </p>
            </div>

            {/* ── White Body ── */}
            <div className="bg-white px-8 py-8">
              {step === 'email' ? (
                <>
                  {/* Google */}
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium h-12 rounded-none flex items-center justify-center gap-3 transition-all"
                    data-testid="auth-google-btn"
                    style={sans}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium" style={sans}>or</span>
                    </div>
                  </div>

                  {/* Email Form */}
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#101B36] focus:ring-1 focus:ring-[#101B36] rounded-none pl-10 pr-4 text-sm text-[#101B36] placeholder:text-slate-400 transition-all outline-none"
                        data-testid="auth-email-input"
                        style={sans}
                        autoFocus
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full bg-[#D4B36A] hover:bg-[#B59550] text-[#0B0B0D] font-medium h-12 rounded-none transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,179,106,0.39)] hover:shadow-[0_6px_20px_rgba(212,179,106,0.23)] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm"
                      data-testid="auth-send-otp-btn"
                      style={sans}
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                      ) : (
                        <>
                          Continue with Email
                          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStaySignedIn(s => !s)}
                      className="flex items-center gap-2.5 w-full pt-1 group"
                      data-testid="auth-stay-signed-in"
                    >
                      <div className={`w-4 h-4 border flex items-center justify-center transition-all ${
                        staySignedIn ? 'bg-[#101B36] border-[#101B36]' : 'bg-white border-slate-300 group-hover:border-slate-400'
                      }`}>
                        {staySignedIn && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                      </div>
                      <span className="text-xs text-slate-500" style={sans}>Stay signed in for 30 days</span>
                    </button>
                  </form>

                  <div className="flex items-center justify-center gap-2 pt-6 text-xs text-slate-300" style={sans}>
                    <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Mobile OTP</span>
                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 font-medium">Coming Soon</span>
                  </div>
                </>
              ) : (
                <>
                  {!autoFilling && (
                    <p className="text-xs text-slate-400 text-center mb-5" style={sans} data-testid="auth-check-inbox-hint">
                      Check your inbox and spam folder
                    </p>
                  )}

                  <div className="flex justify-center gap-3 mb-6" onPaste={handleOtpPaste} data-testid="auth-otp-container">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-lg font-semibold border-2 rounded-none outline-none transition-all ${
                          digit
                            ? 'bg-slate-50 border-[#D4B36A] text-[#101B36]'
                            : 'bg-white border-slate-200 text-[#101B36] focus:border-[#101B36]'
                        }`}
                        data-testid={`auth-otp-input-${i}`}
                        style={sans}
                        autoFocus={i === 0 && !autoFilling}
                        readOnly={autoFilling}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleVerifyOTP()}
                    disabled={loading || otp.join('').length !== OTP_LENGTH || autoFilling}
                    className="w-full bg-[#D4B36A] hover:bg-[#B59550] text-[#0B0B0D] font-medium h-12 rounded-none transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,179,106,0.39)] hover:shadow-[0_6px_20px_rgba(212,179,106,0.23)] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm"
                    data-testid="auth-verify-otp-btn"
                    style={sans}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                    ) : autoFilling ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] rounded-full animate-spin" />
                        Receiving code...
                      </span>
                    ) : (
                      <>
                        Verify & Continue
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>

                  <div className="mt-5 flex items-center justify-center">
                    {resendCooldown > 0 ? (
                      <p className="text-xs text-slate-400" style={sans}>
                        Resend code in <span className="font-semibold text-[#101B36]">{resendCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={loading}
                        className="text-xs text-[#D4B36A] font-medium hover:text-[#B59550] transition-colors disabled:opacity-50"
                        data-testid="auth-resend-otp-btn"
                        style={sans}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleBack}
                    className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors mx-auto block"
                    data-testid="auth-change-email-btn"
                    style={sans}
                  >
                    Use a different email
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Admin Login Link */}
        <Link
          to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
          className="mt-8 flex items-center gap-2 text-sm text-[#D4B36A] hover:text-[#B59550] font-medium transition-colors"
          data-testid="auth-team-login-link"
          style={sans}
        >
          <Shield className="w-4 h-4" strokeWidth={1.5} />
          Admin / RM / Venue Login
        </Link>
      </div>
    </div>
  );
};

export default AuthPage;
