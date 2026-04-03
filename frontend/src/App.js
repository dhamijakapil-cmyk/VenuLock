import React, { useRef, useEffect, useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, api } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CompareProvider } from "@/context/CompareContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";

// Customer Pages
import LandingPage from "@/pages/LandingPage";
import VenueSearchPage from "@/pages/VenueSearchPage";
import CityVenuesPage from "@/pages/CityVenuesPage";
import CityHubPage from "@/pages/CityHubPage";
import VenuePublicPage from "@/pages/VenuePublicPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import GoogleAuthCallback from "@/pages/GoogleAuthCallback";
import AppleAuthCallback from "@/pages/AppleAuthCallback";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import MyEnquiriesPage from "@/pages/MyEnquiriesPage";
import ProfilePage from "@/pages/ProfilePage";
import MyBookingsPage from "@/pages/MyBookingsPage";
import MyReviewsPage from "@/pages/MyReviewsPage";
import PaymentsPage from "@/pages/PaymentsPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ComparisonSheetPublic from "@/pages/ComparisonSheetPublic";
import CustomerCaseList from "@/pages/CustomerCaseList";
import CustomerCaseDetail from "@/pages/CustomerCaseDetail";
import CustomerHome from "@/pages/CustomerHome";
import OwnerOnboardingPage from "@/pages/field/OwnerOnboardingPage";
const ShortlistPublicPage = React.lazy(() => import("@/pages/ShortlistPublicPage"));
import VenueComparePage from "@/pages/VenueComparePage";
import SharedComparePage from "@/pages/SharedComparePage";
import CompareFloatingBar from "@/components/CompareFloatingBar";
import ListVenuePage from "@/pages/ListVenuePage";
import PartnerPage from "@/pages/PartnerPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ContactPage from "@/pages/ContactPage";
import SupportPage from "@/pages/SupportPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
const CapacityDashboard = React.lazy(() => import("@/pages/CapacityDashboard"));
import ChatBot from "@/components/ChatBot";
import InstallPrompt from "@/components/ui/InstallPrompt";
import BottomTabBar from "@/components/BottomTabBar";
import { isCapacitor } from "@/utils/platform";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Team Portal — lazy loaded (separate code bundle)
const TeamApp = React.lazy(() => import('@/TeamApp'));

// Customer Protected Route (simple — team protection is in TeamApp)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#64748B]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Smart router: venue_id params resolve to slug-based URL, city slugs go to city page
const VenueOrCityPage = () => {
  const { param } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (param && param.startsWith("venue_")) {
      // Look up venue to redirect to slug-based URL
      setLoading(true);
      api.get(`/venues/${param}`)
        .then(res => {
          const v = res.data;
          const toSlug = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
          const citySlug = v.city_slug || toSlug(v.city) || 'india';
          const venueSlug = v.slug || toSlug(v.name) || param;
          navigate(`/venues/${citySlug}/${venueSlug}`, { replace: true });
        })
        .catch(() => {
          // Fallback: try mock data
          import('@/data/mockVenues').then(mod => {
            const mock = mod.default.find(m => m.venue_id === param);
            if (mock) {
              navigate(`/venues/${mock.city_slug}/${mock.slug}`, { replace: true });
            } else {
              navigate('/venues/search', { replace: true });
            }
          });
        })
        .finally(() => setLoading(false));
    }
  }, [param, navigate]);

  if (param && param.startsWith("venue_")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC]">
        <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
      </div>
    );
  }

  return <CityVenuesPage />;
};

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// App Router with session_id detection
// Hide customer-only floating UI when on team portal routes
function CustomerOnlyUI() {
  const location = useLocation();
  if (location.pathname.startsWith('/team')) return null;
  if (location.pathname.startsWith('/onboarding')) return null;
  if (location.pathname.startsWith('/shortlist')) return null;
  // Hide bottom tab on venue detail pages (they have their own sticky CTA) and case detail (has own sticky CTA)
  const hideTabBar = /^\/venues\/[^/]+\/[^/]+$/.test(location.pathname) || /^\/my-cases\/.+/.test(location.pathname);
  // Hide chatbot on case detail pages (its FAB conflicts with Message RM CTA)
  const hideChatBot = /^\/my-cases\/.+/.test(location.pathname) || location.pathname === '/home';
  return (
    <>
      <CompareFloatingBar />
      {!hideChatBot && <ChatBot />}
      <InstallPrompt />
      {!hideTabBar && <BottomTabBar />}
    </>
  );
}

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={
        <ProtectedRoute allowedRoles={['customer', 'admin']}>
          <CustomerHome />
        </ProtectedRoute>
      } />
      <Route path="/venues" element={<CityHubPage />} />
      <Route path="/venues/search" element={<VenueSearchPage />} />
      <Route path="/venues/compare" element={<VenueComparePage />} />
      <Route path="/venues/compare/shared/:shareId" element={<SharedComparePage />} />
      <Route path="/venues/explore" element={<CityHubPage />} />
      <Route path="/list-your-venue" element={<ListVenuePage />} />
      <Route path="/partner" element={<PartnerPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      {/* Collections routes removed — using simple Favorites */}
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/venues/:citySlug/:venueSlug" element={<VenuePublicPage />} />
      <Route path="/venues/:param" element={<VenueOrCityPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/google" element={<GoogleAuthCallback />} />
      <Route path="/auth/apple" element={<AppleAuthCallback />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Customer Routes */}
      <Route
        path="/my-enquiries"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <MyEnquiriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin', 'rm', 'venue_owner', 'event_planner']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-reviews"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <MyReviewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      
      {/* Customer Case Portal */}
      <Route
        path="/my-cases"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <CustomerCaseList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-cases/:caseId"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <CustomerCaseDetail />
          </ProtectedRoute>
        }
      />

      {/* Public Comparison Sheet */}
      <Route path="/comparison/:sheetId" element={<ComparisonSheetPublic />} />

      {/* Public Owner Onboarding — tokenized, no login required */}
      <Route path="/onboarding/:token" element={<OwnerOnboardingPage />} />

      {/* Public Shortlist — tokenized, customer views curated venues */}
      <Route path="/shortlist/:shareToken" element={
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>}>
          <ShortlistPublicPage />
        </React.Suspense>
      } />

      {/* Team Portal — internal dashboards. In production on venuloq.com,
           redirect to teams.venuloq.com. In staging/preview, render inline. */}
      <Route path="/team/capacity" element={
        <React.Suspense fallback={<div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>}>
          <CapacityDashboard />
        </React.Suspense>
      } />
      <Route path="/team/*" element={<TeamPortalGate />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

// Team Portal gate: In production, redirect to teams.venuloq.com.
// In staging/preview, render TeamApp inline for development convenience.
function TeamPortalGate() {
  const hostname = window.location.hostname;
  const isProduction = hostname === 'venuloq.com' || hostname === 'delhi.venuloq.com';

  if (isProduction) {
    // Redirect to the team domain, preserving the path after /team
    const teamPath = window.location.pathname.replace(/^\/team/, '') || '/';
    window.location.href = `https://teams.venuloq.com${teamPath}${window.location.search}`;
    return null;
  }

  // Staging/preview: render inline
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" /></div>}>
      <TeamApp />
    </React.Suspense>
  );
}

// Silent push notification subscriber
function PushSubscriber() {
  usePushNotifications();
  return null;
}

// Swap PWA manifest and icons for team portal routes
function TeamPWAMeta() {
  const location = useLocation();
  useEffect(() => {
    const isTeam = location.pathname.startsWith('/team');
    const manifest = document.querySelector('link[rel="manifest"]');
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');

    if (manifest) {
      manifest.href = isTeam ? '/team-manifest.json' : '/manifest.json';
    }
    if (appleTouchIcon) {
      appleTouchIcon.href = isTeam ? '/team-apple-touch-icon.png' : '/apple-touch-icon.png';
    }
  }, [location.pathname]);
  return null;
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (window.location.pathname.startsWith('/team')) return false;
    if (window.location.pathname.startsWith('/onboarding')) return false;
    if (window.location.pathname.startsWith('/shortlist')) return false;
    if (sessionStorage.getItem('venuloq_loaded')) return false;
    return true;
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('venuloq_loaded', '1');
    setShowSplash(false);
  }, []);

  return (
    <AuthProvider>
      <FavoritesProvider>
        <CompareProvider>
          <ThemeProvider>
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            <BrowserRouter>
              <AppRouter />
              <CustomerOnlyUI />
              <TeamPWAMeta />
              <PushSubscriber />
              <Toaster position="top-right" richColors />
            </BrowserRouter>
          </ThemeProvider>
        </CompareProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

export default App;
