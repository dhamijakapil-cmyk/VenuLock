import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';

/**
 * Handles the Apple Sign In OAuth callback.
 * Apple redirects here with ?code=... after user authorizes.
 * We exchange the code via our backend for a JWT token.
 * REMINDER: DO NOT HARDCODE THE URL OR ADD FALLBACKS.
 */
const AppleAuthCallback = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAppleCallback = async () => {
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

        // Parse user data if present (Apple only sends this on first sign-in)
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
        if (token) {
          localStorage.setItem('token', token);
        }
        setUser(authUser);
        toast.success(`Welcome${authUser?.name ? ', ' + authUser.name : ''}!`);

        window.history.replaceState(null, '', '/auth/apple');
        navigate(state || '/my-enquiries', { replace: true });
      } catch (err) {
        console.error('[VenuLoQ] Apple OAuth callback error:', err?.message, err?.response?.data);
        toast.error(err?.response?.data?.detail || 'Apple sign-in failed. Please try again.');
        navigate('/auth');
      }
    };

    processAppleCallback();
  }, []);

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
