import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // No token = not authenticated, skip API call
        setUser(null);
      } else {
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
    } catch (e) {
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
