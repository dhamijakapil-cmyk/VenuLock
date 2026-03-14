import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronLeft, Shield, Smartphone, Check } from 'lucide-react';

const OTP_LENGTH = 6;

const getErrorMsg = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || fallback;
  return fallback;
};

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
  const otpRefs = useRef([]);
  const autoFillTimerRef = useRef(null);
  const pendingAutoFill = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectTo || '/my-enquiries', { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Trigger auto-fill when we enter OTP step with a pending code
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
        setOtp(prev => {
          const next = [...prev];
          next[idx] = digits[idx];
          return next;
        });
        i++;
        autoFillTimerRef.current = setTimeout(fillNext, 110);
      } else {
        // All digits filled — verify after a brief pause
        autoFillTimerRef.current = setTimeout(() => {
          doVerify(email, code, staySignedIn);
        }, 500);
      }
    };

    // Start filling after a 1.2s delay (simulates "receiving email")
    autoFillTimerRef.current = setTimeout(fillNext, 1200);
  }, [doVerify, email, staySignedIn]);

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await sendEmailOTP(trimmed);

      // Only queue auto-fill if email delivery failed (debug fallback)
      if (res.debug_otp) {
        pendingAutoFill.current = res.debug_otp;
      }

      setStep('otp');
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendCooldown(30);

      if (res.sent) {
        toast.success('Verification code sent — check your inbox');
      } else {
        toast.success('Verification code sent!');
      }
    } catch (error) {
      const msg = getErrorMsg(error, 'Failed to send verification code');
      if (error?.response?.status === 429) {
        toast.error(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue) => {
    const code = otpValue || otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    await doVerify(email, code, staySignedIn);
  };

  const handleOtpChange = (index, value) => {
    if (autoFilling) return;
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    if (value && index === OTP_LENGTH - 1) {
      const full = newOtp.join('');
      if (full.length === OTP_LENGTH) handleVerifyOTP(full);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (autoFilling) return;
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
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
    // Redirect to /auth/callback which processes the session_id, then forwards to afterLogin
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

  const dmSans = { fontFamily: "'DM Sans', sans-serif" };
  const cormorant = { fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 };

  const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d6aadd14-84a9-4588-ad39-9e33b5dd867e/artifacts/ob5cd1jx_0B10E960-B7CD-4302-9CC9-469B618F0266.png';

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex flex-col" style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0); }
          25% { transform: perspective(800px) rotateY(5deg) rotateX(2deg) translateY(-3px); }
          50% { transform: perspective(800px) rotateY(0deg) rotateX(-1deg) translateY(-1px); }
          75% { transform: perspective(800px) rotateY(-5deg) rotateX(1deg) translateY(-4px); }
        }
        .logo-3d {
          animation: logoFloat 8s ease-in-out infinite;
          transform-style: preserve-3d;
        }
      `}</style>

      <button
        onClick={handleBack}
        className="absolute left-4 top-4 w-9 h-9 flex items-center justify-center text-[#F4F1EC]/40 hover:text-[#F4F1EC] transition-colors z-10"
        data-testid="auth-back-btn"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Hero — Real Logo on Black */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-6">
        <div className="logo-3d w-full" data-testid="auth-brand-logo">
          <img
            src={LOGO_URL}
            alt="VenuLoQ"
            className="w-full h-auto"
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-[15px] text-[#F4F1EC]/70" style={{ ...cormorant, fontWeight: 400 }}>
            Welcome to <span className="text-[#D4B36A] font-semibold">VenuLoQ</span>
          </p>
          <p className="text-[10px] text-[#F4F1EC]/25 tracking-[0.15em] uppercase mt-1" style={dmSans}>
            Your smart venue booking platform
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 bg-[#F4F1EC] rounded-t-[28px] px-6 pt-7 pb-6 flex flex-col">
        {step === 'email' ? (
          /* ==================== EMAIL STEP ==================== */
          <>
            <h1 className="text-[28px] text-[#0B0B0D] mb-1" style={cormorant} data-testid="auth-welcome-title">
              Welcome
            </h1>
            <p className="text-[#9CA3AF] text-[12px] mb-6" style={dmSans}>
              Sign in or create an account instantly
            </p>

            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 border border-[#E5E0D8] bg-white hover:border-[#D4B36A] transition-all text-[13px] font-medium text-[#1A1A1A] rounded-lg"
              data-testid="auth-google-btn"
              style={dmSans}
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
                <span className="bg-[#F4F1EC] px-4 text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF] font-medium" style={dmSans}>
                  or
                </span>
              </div>
            </div>

            <form onSubmit={handleSendOTP} className="flex-1 flex flex-col">
              <div className="space-y-3 flex-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full border border-[#E5E0D8] bg-[#FAFAF8] rounded-xl pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                    data-testid="auth-email-input"
                    style={dmSans}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-40 transition-all tracking-[0.1em] uppercase rounded-xl group"
                  data-testid="auth-send-otp-btn"
                  style={dmSans}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#F4F1EC]/30 border-t-[#F4F1EC] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      Continue with Email
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                    </>
                  )}
                </button>

                {/* Stay signed in */}
                <button
                  type="button"
                  onClick={() => setStaySignedIn(s => !s)}
                  className="flex items-center gap-2.5 w-full py-2 group"
                  data-testid="auth-stay-signed-in"
                >
                  <div className={`w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all duration-200 ${staySignedIn ? 'bg-[#0B0B0D] border-[#0B0B0D]' : 'bg-white border-[#D5D0C8] group-hover:border-[#B0B0B0]'}`}>
                    {staySignedIn && <Check className="w-3 h-3 text-[#F4F1EC]" strokeWidth={2.5} />}
                  </div>
                  <span className="text-[12px] text-[#6E6E6E]" style={dmSans}>Stay signed in for 30 days</span>
                </button>

                {/* Mobile OTP */}
                <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-[#C5C0B8]" style={dmSans}>
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Mobile OTP</span>
                  <span className="text-[9px] bg-[#E5E0D8] text-[#A09A90] px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5E0D8]/60">
                <Link
                  to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                  className="flex items-center justify-center gap-2 py-3 bg-[#0B0B0D]/[0.04] hover:bg-[#0B0B0D]/[0.08] rounded-xl text-[12px] text-[#0B0B0D]/60 hover:text-[#0B0B0D] font-semibold transition-all"
                  data-testid="auth-team-login-link"
                  style={dmSans}
                >
                  <Shield className="w-4 h-4" strokeWidth={1.5} />
                  Admin / RM / Venue Login
                </Link>
              </div>
            </form>
          </>
        ) : (
          /* ==================== OTP STEP ==================== */
          <>
            <h1 className="text-[28px] text-[#0B0B0D] mb-1" style={cormorant} data-testid="auth-verify-title">
              Verify Email
            </h1>
            <p className="text-[#6E6E6E] text-[12px] mb-1" style={dmSans}>
              Enter the 6-digit code sent to
            </p>
            <p className="text-[#0B0B0D] text-[13px] font-semibold mb-2" style={dmSans} data-testid="auth-otp-email-display">
              {email}
            </p>
            {!autoFilling && (
              <p className="text-[#9CA3AF] text-[11px] mb-4" style={dmSans} data-testid="auth-check-inbox-hint">
                Check your inbox and spam folder
              </p>
            )}

            {/* OTP Inputs */}
            <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOtpPaste} data-testid="auth-otp-container">
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
                  className={`w-12 h-14 text-center text-[20px] font-semibold text-[#0B0B0D] border-2 rounded-xl outline-none transition-all duration-200 ${
                    digit
                      ? 'bg-[#0B0B0D]/[0.03] border-[#D4B36A] ring-1 ring-[#D4B36A]/20'
                      : 'bg-white border-[#E5E0D8] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20'
                  }`}
                  data-testid={`auth-otp-input-${i}`}
                  style={dmSans}
                  autoFocus={i === 0 && !autoFilling}
                  readOnly={autoFilling}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={() => handleVerifyOTP()}
              disabled={loading || otp.join('').length !== OTP_LENGTH || autoFilling}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-40 transition-all tracking-[0.1em] uppercase rounded-lg group"
              data-testid="auth-verify-otp-btn"
              style={dmSans}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#F4F1EC]/30 border-t-[#F4F1EC] rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : autoFilling ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#F4F1EC]/30 border-t-[#F4F1EC] rounded-full animate-spin" />
                  Receiving code...
                </span>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>

            {/* Resend / Timer */}
            <div className="mt-4 flex items-center justify-center">
              {resendCooldown > 0 ? (
                <p className="text-[12px] text-[#B0B0B0]" style={dmSans}>
                  Resend code in <span className="font-semibold text-[#0B0B0D]">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-[12px] text-[#D4B36A] font-medium hover:underline underline-offset-2 disabled:opacity-50"
                  data-testid="auth-resend-otp-btn"
                  style={dmSans}
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              onClick={handleBack}
              className="mt-3 text-[11px] text-[#9CA3AF] hover:text-[#6E6E6E] transition-colors mx-auto block"
              data-testid="auth-change-email-btn"
              style={dmSans}
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
