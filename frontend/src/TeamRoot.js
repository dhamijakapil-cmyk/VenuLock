import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import TeamApp from '@/TeamApp';

/**
 * TeamRoot — Standalone app shell for the Team Portal.
 *
 * When the app runs on a "team.*" domain (e.g. team.venuloq.com),
 * this component renders instead of the customer App.
 *
 * It wraps TeamApp with only the providers the portal needs
 * (no customer UI like ChatBot, SplashScreen, CompareBar, etc.)
 *
 * Existing components navigate to "/team/dashboard", "/team/login", etc.
 * The StripTeamPrefix route transparently redirects those to "/dashboard",
 * "/login" — so zero changes are needed in child components.
 */

const StripTeamPrefix = () => {
  const location = useLocation();
  const cleanPath = location.pathname.replace(/^\/team/, '') || '/';
  return <Navigate to={cleanPath + location.search} replace />;
};

const TeamRoot = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Redirect legacy /team/* paths to root-level equivalents */}
          <Route path="/team/*" element={<StripTeamPrefix />} />

          {/* Mount TeamApp at root — routes resolve as /login, /dashboard, etc. */}
          <Route path="/*" element={<TeamApp />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default TeamRoot;
