import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';

/**
 * Handles the Google OAuth callback.
 * Google redirects here with ?code=... after user authorizes.
 * We exchange the code via our backend for a JWT token.
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
const GoogleAuthCallback = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processGoogleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const nextPath = searchParams.get('state') || '/my-enquiries';

        if (error) {
          toast.error('Google sign-in was cancelled');
          navigate('/auth');
          return;
        }

        if (!code) {
          toast.error('No authorization code received');
          navigate('/auth');
          return;
        }

        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUri = window.location.origin + '/auth/google';

        const response = await api.post('/auth/google/callback', {
          code,
          redirect_uri: redirectUri,
        });

        const { token, user: userData } = response.data;
        if (token) {
          localStorage.setItem('token', token);
        }
        setUser(userData);
        toast.success(`Welcome${userData?.name ? ', ' + userData.name : ''}!`);

        // Clean URL and navigate
        window.history.replaceState(null, '', '/auth/google');
        navigate(nextPath, { replace: true });
      } catch (err) {
        console.error('[VenuLoQ] Google OAuth callback error:', err?.message, err?.response?.data);
        toast.error(err?.response?.data?.detail || 'Google sign-in failed. Please try again.');
        navigate('/auth');
      }
    };

    processGoogleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#D4B36A] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Completing sign in...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
