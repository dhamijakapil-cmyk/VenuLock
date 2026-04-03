import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';

const TIMEOUT_MS = 20000;

const AppleAuthCallback = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const processCallback = async () => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');
      const userParam = searchParams.get('user');

      if (error) {
        toast.error('Apple sign-in was cancelled');
        navigate('/auth');
        return;
      }
      if (!code) {
        toast.error('No authorization code received');
        navigate('/auth');
        return;
      }

      let userData = null;
      if (userParam) {
        try { userData = JSON.parse(decodeURIComponent(userParam)); } catch {}
      }

      const redirectUri = window.location.origin + '/auth/apple';

      const response = await api.post('/auth/apple/callback', {
        code,
        redirect_uri: redirectUri,
        user: userData,
      });

      const { token, user: authUser } = response.data;
      if (token) localStorage.setItem('token', token);
      setUser(authUser);
      toast.success(`Welcome${authUser?.name ? ', ' + authUser.name : ''}!`);
      window.history.replaceState(null, '', '/auth/apple');
      navigate(state || '/home', { replace: true });
    } catch (err) {
      console.error('[VenuLoQ] Apple OAuth callback error:', err?.message);
      const detail = err?.response?.data?.detail || 'Apple sign-in failed';
      setErrorMsg(detail);
      setFailed(true);
    }
  };

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const timer = setTimeout(() => {
      if (!failed) { setErrorMsg('Sign-in is taking too long'); setFailed(true); }
    }, TIMEOUT_MS);

    processCallback().finally(() => clearTimeout(timer));
  }, []);

  if (failed) {
    return (
      <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center px-6">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-[15px] font-semibold text-[#0B0B0D] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sign-in failed</p>
          <p className="text-[13px] text-[#64748B] mb-5">{errorMsg}</p>
          <button onClick={() => navigate('/auth')}
            className="px-6 py-2.5 bg-[#0B0B0D] text-white rounded-xl text-[13px] font-semibold hover:bg-[#1a1a1a] transition-colors"
            data-testid="auth-retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#0B0B0D] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Completing sign in...</p>
      </div>
    </div>
  );
};

export default AppleAuthCallback;
