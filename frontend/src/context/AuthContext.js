import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle expired/invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Don't auto-logout on login/register/callback attempts
      const authPaths = ['/auth/login', '/auth/register', '/auth/google-session', '/auth/google/callback', '/auth/apple/callback', '/auth/email-otp/verify'];
      const isAuthRoute = authPaths.some(p => url.includes(p));
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        // Dispatch a custom event that the provider can listen for
        window.dispatchEvent(new Event('venuloq:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Skip auth check during OAuth callback flows
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    const path = window.location.pathname;
    if (path.startsWith('/auth/google') || path.startsWith('/auth/apple') || path.startsWith('/auth/callback')) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
      } else {
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for session expiry events from the interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };
    window.addEventListener('venuloq:session-expired', handleSessionExpired);
    return () => window.removeEventListener('venuloq:session-expired', handleSessionExpired);
  }, []);

  // Recheck auth when app regains focus (returning user, waking from background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        // Lightweight check — only verify token is still valid
        api.get('/auth/me').then(res => setUser(res.data)).catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const sendEmailOTP = async (email) => {
    const response = await api.post('/auth/email-otp/send', { email });
    return response.data;
  };

  const verifyEmailOTP = async (email, otp, staySignedIn = true) => {
    const response = await api.post('/auth/email-otp/verify', { email, otp, stay_signed_in: staySignedIn });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return response.data;
  };

  const processGoogleSession = async (sessionId) => {
    const response = await api.post('/auth/google-session', { session_id: sessionId });
    const { token, user: userData } = response.data;
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    sendEmailOTP,
    verifyEmailOTP,
    processGoogleSession,
    checkAuth,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { api, API_URL };
export default AuthContext;
