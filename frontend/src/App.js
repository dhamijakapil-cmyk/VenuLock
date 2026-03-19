import React, { useRef, useEffect, useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, api } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CompareProvider } from "@/context/CompareContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";

// Pages
import LandingPage from "@/pages/LandingPage";
import VenueSearchPage from "@/pages/VenueSearchPage";
import CityVenuesPage from "@/pages/CityVenuesPage";
import CityHubPage from "@/pages/CityHubPage";
import VenuePublicPage from "@/pages/VenuePublicPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import MyEnquiriesPage from "@/pages/MyEnquiriesPage";
import ProfilePage from "@/pages/ProfilePage";
import ComparisonSheetPublic from "@/pages/ComparisonSheetPublic";
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
import ChatBot from "@/components/ChatBot";
import InstallPrompt from "@/components/ui/InstallPrompt";

// RM Pages
import RMDashboard from "@/pages/rm/RMDashboard";
import RMLeadDetail from "@/pages/rm/RMLeadDetail";
import RMMyPerformance from "@/pages/rm/RMMyPerformance";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminVenues from "@/pages/admin/AdminVenues";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminCities from "@/pages/admin/AdminCities";
import PaymentManagement from "@/pages/admin/PaymentManagement";
import PaymentAnalytics from "@/pages/admin/PaymentAnalytics";
import ControlRoom from "@/pages/admin/ControlRoom";
import RMPerformanceAnalytics from "@/pages/admin/RMPerformanceAnalytics";
import ConversionIntelligencePage from "@/pages/admin/ConversionIntelligencePage";
import ChannelPerformancePage from "@/pages/admin/ChannelPerformancePage";

// Venue Owner Pages
import VenueOwnerDashboard from "@/pages/venue-owner/VenueOwnerDashboard";
import VenueOwnerCreate from "@/pages/venue-owner/VenueOwnerCreate";
import VenueOwnerEdit from "@/pages/venue-owner/VenueOwnerEdit";
import VenueAvailabilityCalendar from "@/pages/venue-owner/VenueAvailabilityCalendar";

// Event Planner Pages
import PlannerDashboard from "@/pages/planner/PlannerDashboard";

// Protected Route Component
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
      
      {/* Public Comparison Sheet */}
      <Route path="/comparison/:sheetId" element={<ComparisonSheetPublic />} />

      {/* RM Routes */}
      <Route
        path="/rm/dashboard"
        element={
          <ProtectedRoute allowedRoles={['rm', 'admin']}>
            <RMDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rm/leads/:leadId"
        element={
          <ProtectedRoute allowedRoles={['rm', 'admin']}>
            <RMLeadDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rm/my-performance"
        element={
          <ProtectedRoute allowedRoles={['rm', 'admin']}>
            <RMMyPerformance />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/venues"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminVenues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leads"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLeads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cities"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminCities />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PaymentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PaymentAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/control-room"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ControlRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rm-analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RMPerformanceAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/conversion-intelligence"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ConversionIntelligencePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/channel-performance"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ChannelPerformancePage />
          </ProtectedRoute>
        }
      />

      {/* Venue Owner Routes */}
      <Route
        path="/venue-owner/dashboard"
        element={
          <ProtectedRoute allowedRoles={['venue_owner', 'admin']}>
            <VenueOwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue-owner/create"
        element={
          <ProtectedRoute allowedRoles={['venue_owner', 'admin']}>
            <VenueOwnerCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue-owner/edit/:venueId"
        element={
          <ProtectedRoute allowedRoles={['venue_owner', 'admin']}>
            <VenueOwnerEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue-owner/calendar"
        element={
          <ProtectedRoute allowedRoles={['venue_owner', 'admin']}>
            <VenueAvailabilityCalendar />
          </ProtectedRoute>
        }
      />

      {/* Event Planner Routes */}
      <Route
        path="/planner/dashboard"
        element={
          <ProtectedRoute allowedRoles={['event_planner', 'admin']}>
            <PlannerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first visit per session
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
              <CompareFloatingBar />
              <ChatBot />
              <InstallPrompt />
              <Toaster position="top-right" richColors />
            </BrowserRouter>
          </ThemeProvider>
        </CompareProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

export default App;
