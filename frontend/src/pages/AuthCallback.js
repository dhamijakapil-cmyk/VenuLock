import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { USER_ROLES } from '@/lib/utils';

const TIMEOUT_MS = 20000;

const AuthCallback = () => {
  const { processGoogleSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const processSession = async () => {
    try {
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const sessionId = hashParams.get('session_id');

      if (!sessionId) {
        toast.error('No session ID found');
        navigate('/auth');
        return;
      }

      const userData = await processGoogleSession(sessionId);
      toast.success(`Welcome${userData?.name ? ', ' + userData.name : ''}!`);

      const searchParams = new URLSearchParams(location.search);
      const nextPath = searchParams.get('next');
      const destination = nextPath || USER_ROLES[userData?.role]?.dashboard || '/home';

      window.history.replaceState(null, '', window.location.pathname);
      navigate(destination, { replace: true });
    } catch (error) {
      console.error('[VenuLoQ] Auth callback error:', error?.message);
      const detail = error?.response?.data?.detail || 'Authentication failed';
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

    processSession().finally(() => clearTimeout(timer));
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

export default AuthCallback;
