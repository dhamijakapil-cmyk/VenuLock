import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { USER_ROLES } from '@/lib/utils';

const AuthCallback = () => {
  const { processGoogleSession, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Get session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('No session ID found');
          navigate('/login');
          return;
        }

        const userData = await processGoogleSession(sessionId);
        toast.success('Welcome back!');

        // Redirect based on role
        const dashboard = USER_ROLES[userData.role]?.dashboard || '/my-enquiries';
        
        // Clear the hash and navigate
        window.history.replaceState(null, '', window.location.pathname);
        navigate(dashboard, { replace: true, state: { user: userData } });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
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
