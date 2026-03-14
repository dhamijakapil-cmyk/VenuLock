import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
  const sans = { fontFamily: "'DM Sans', sans-serif" };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found.');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        // Refresh user data so email_verified updates
        if (user) {
          await checkAuth();
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'Verification failed. The link may be expired.');
      }
    };
    verify();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center px-6" style={{ minHeight: '100dvh' }}>
      <motion.div
        className="w-full max-w-[400px] text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-[32px] text-[#0B0B0D] tracking-tight leading-none mb-8" style={{ ...serif, fontWeight: 600 }}>
          VenuLo<span className="text-[#D4B36A]">Q</span>
        </h1>

        {status === 'verifying' && (
          <div data-testid="verify-loading">
            <Loader2 className="w-10 h-10 text-[#D4B36A] animate-spin mx-auto mb-4" />
            <p className="text-[15px] text-slate-600" style={sans}>Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div data-testid="verify-success">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-[22px] text-[#0B0B0D] mb-2" style={{ ...serif, fontWeight: 600 }}>
              Email Verified
            </h2>
            <p className="text-[14px] text-slate-500 mb-8" style={sans}>
              Your account is now fully set up. You can start exploring and booking venues.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-[#D4B36A] hover:bg-[#B59550] text-[#0B0B0D] font-semibold h-[52px] px-10 rounded-xl transition-all text-[15px]"
              data-testid="verify-continue-btn"
              style={sans}
            >
              Start Exploring
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div data-testid="verify-error">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-[22px] text-[#0B0B0D] mb-2" style={{ ...serif, fontWeight: 600 }}>
              Verification Failed
            </h2>
            <p className="text-[14px] text-slate-500 mb-8" style={sans}>
              {errorMsg}
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center bg-[#D4B36A] hover:bg-[#B59550] text-[#0B0B0D] font-semibold h-[52px] px-10 rounded-xl transition-all text-[15px]"
              data-testid="verify-signin-btn"
              style={sans}
            >
              Go to Sign In
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
