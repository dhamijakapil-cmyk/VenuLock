import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { USER_ROLES } from '@/lib/utils';

const AuthCallback = () => {
  const { processGoogleSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Get session_id from URL fragment
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

        // Read the intended destination from the ?next= query param
        const searchParams = new URLSearchParams(location.search);
        const nextPath = searchParams.get('next');

        // Determine where to redirect
        const destination = nextPath || USER_ROLES[userData?.role]?.dashboard || '/my-enquiries';

        // Clean the URL and navigate
        window.history.replaceState(null, '', window.location.pathname);
        navigate(destination, { replace: true });
      } catch (error) {
        console.error('[VenuLoQ] Auth callback error:', error?.message, error?.response?.data);
        toast.error('Authentication failed. Please try again.');
        navigate('/auth');
      }
    };

    processSession();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-[#64748B]">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
