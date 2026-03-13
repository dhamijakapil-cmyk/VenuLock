import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronLeft, Shield, Smartphone } from 'lucide-react';

const OTP_LENGTH = 6;

const AuthPage = () => {
  const { sendEmailOTP, verifyEmailOTP, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '';
  const from = location.state?.from?.pathname || '/';

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = redirectTo || '/my-enquiries';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const navigateAfterAuth = (userData) => {
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
      navigate(roleDashboards[userData.role] || from);
    }
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await sendEmailOTP(email);
      if (res.debug_otp) {
        setDebugOtp(res.debug_otp);
      }
      setStep('otp');
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendCooldown(30);
      toast.success('Verification code sent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
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
    setLoading(true);
    try {
      const res = await verifyEmailOTP(email, code);
      toast.success(res.is_new_user ? 'Welcome to VenuLoQ!' : 'Welcome back!');
      navigateAfterAuth(res.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
      setOtp(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === OTP_LENGTH - 1) {
      const full = newOtp.join('');
      if (full.length === OTP_LENGTH) {
        handleVerifyOTP(full);
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!paste) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    paste.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    const nextIdx = Math.min(paste.length, OTP_LENGTH - 1);
    otpRefs.current[nextIdx]?.focus();
    if (paste.length === OTP_LENGTH) {
      handleVerifyOTP(paste);
    }
  };

  const handleGoogleLogin = () => {
    const afterLogin = redirectTo || '/my-enquiries';
    const redirectUrl = window.location.origin + afterLogin;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const dmSans = { fontFamily: "'DM Sans', sans-serif" };
  const cormorant = { fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 };

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Top — Logo */}
      <div className="flex-shrink-0 relative flex items-center justify-center py-10 px-6">
        <button
          onClick={() => step === 'otp' ? setStep('email') : navigate(-1)}
          className="absolute left-4 top-4 w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC] transition-colors"
          data-testid="auth-back-btn"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <img
          src="https://customer-assets.emergentagent.com/job_d6aadd14-84a9-4588-ad39-9e33b5dd867e/artifacts/v4duq3g6_venuloq-email-signature-dark.png"
          alt="VenuLoQ"
          className="w-[180px]"
          data-testid="auth-brand-logo"
        />
      </div>

      {/* Bottom — Form on cream */}
      <div className="flex-1 bg-[#F4F1EC] rounded-t-[28px] px-6 pt-7 pb-6 flex flex-col">
        {step === 'email' ? (
          <>
            <h1 className="text-[28px] text-[#0B0B0D] mb-1" style={cormorant}>
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

            {/* Email OTP form */}
            <form onSubmit={handleSendOTP} className="flex-1 flex flex-col">
              <div className="space-y-3 flex-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full border border-[#E5E0D8] bg-white rounded-lg pl-10 pr-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                    data-testid="auth-email-input"
                    style={dmSans}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-40 transition-all tracking-[0.1em] uppercase rounded-lg group"
                  data-testid="auth-send-otp-btn"
                  style={dmSans}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#F4F1EC]/30 border-t-[#F4F1EC] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      Continue with Email OTP
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                    </>
                  )}
                </button>

                {/* Mobile OTP - Coming Soon */}
                <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-[#B0B0B0] opacity-60" style={dmSans}>
                  <Smartphone className="w-4 h-4" strokeWidth={1.5} />
                  <span>Mobile OTP</span>
                  <span className="text-[10px] bg-[#E5E0D8] text-[#9CA3AF] px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5E0D8]/60">
                <Link
                  to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                  className="flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF] hover:text-[#6E6E6E] transition-colors"
                  data-testid="auth-team-login-link"
                  style={dmSans}
                >
                  <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Admin / Team Login
                </Link>
              </div>
            </form>
          </>
        ) : (
          /* OTP Verification Step */
          <>
            <h1 className="text-[28px] text-[#0B0B0D] mb-1" style={cormorant}>
              Verify Email
            </h1>
            <p className="text-[#9CA3AF] text-[12px] mb-1" style={dmSans}>
              We sent a 6-digit code to
            </p>
            <p className="text-[#0B0B0D] text-[13px] font-semibold mb-6" style={dmSans}>
              {email}
            </p>

            {/* Debug OTP banner - only shows when Resend is not configured */}
            {debugOtp && (
              <div
                className="mb-4 px-4 py-3 bg-[#FFF8E1] border border-[#FFD54F]/40 rounded-lg"
                data-testid="auth-debug-otp-banner"
              >
                <p className="text-[11px] text-[#B8860B] font-medium" style={dmSans}>
                  Demo Mode — Your code: <span className="font-bold text-[14px] tracking-widest">{debugOtp}</span>
                </p>
              </div>
            )}

            {/* OTP Input */}
            <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOtpPaste}>
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
                  className="w-12 h-14 text-center text-[20px] font-semibold text-[#0B0B0D] bg-white border-2 border-[#E5E0D8] rounded-xl focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/20 outline-none transition-colors"
                  data-testid={`auth-otp-input-${i}`}
                  style={dmSans}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={() => handleVerifyOTP()}
              disabled={loading || otp.join('').length !== OTP_LENGTH}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-40 transition-all tracking-[0.1em] uppercase rounded-lg group"
              data-testid="auth-verify-otp-btn"
              style={dmSans}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#F4F1EC]/30 border-t-[#F4F1EC] rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>

            {/* Resend */}
            <div className="mt-4 flex justify-center">
              {resendCooldown > 0 ? (
                <p className="text-[12px] text-[#B0B0B0]" style={dmSans}>
                  Resend code in <span className="font-semibold text-[#0B0B0D]">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="text-[12px] text-[#D4B36A] font-medium hover:underline underline-offset-2 disabled:opacity-50"
                  data-testid="auth-resend-otp-btn"
                  style={dmSans}
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Change email */}
            <button
              onClick={() => { setStep('email'); setDebugOtp(null); }}
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
