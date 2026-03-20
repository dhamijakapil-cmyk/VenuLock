import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Team Login (eagerly loaded — it's the entry point)
import TeamLogin from '@/pages/team/TeamLogin';

// Onboarding (eagerly loaded — intercepts before dashboard)
import RMOnboarding from '@/pages/rm/RMOnboarding';

// Lazy-loaded team pages — none of this code loads for customers
const TeamWelcome = React.lazy(() => import('@/pages/team/TeamWelcome'));
const RMDashboard = React.lazy(() => import('@/pages/rm/RMDashboard'));
const RMLeadDetail = React.lazy(() => import('@/pages/rm/RMLeadDetail'));
const RMMyPerformance = React.lazy(() => import('@/pages/rm/RMMyPerformance'));

const HRDashboard = React.lazy(() => import('@/pages/hr/HRDashboard'));
const HREmployeeDetail = React.lazy(() => import('@/pages/hr/HREmployeeDetail'));

const SpecialistDashboard = React.lazy(() => import('@/pages/specialist/SpecialistDashboard'));
const VenueForm = React.lazy(() => import('@/pages/specialist/VenueForm'));

const VAMDashboard = React.lazy(() => import('@/pages/vam/VAMDashboard'));
const VAMVenueReview = React.lazy(() => import('@/pages/vam/VAMVenueReview'));
const VAMEditRequestReview = React.lazy(() => import('@/pages/vam/VAMEditRequestReview'));

const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('@/pages/admin/AdminUsers'));
const AdminVenues = React.lazy(() => import('@/pages/admin/AdminVenues'));
const AdminLeads = React.lazy(() => import('@/pages/admin/AdminLeads'));
const AdminCities = React.lazy(() => import('@/pages/admin/AdminCities'));
const PaymentManagement = React.lazy(() => import('@/pages/admin/PaymentManagement'));
const PaymentAnalytics = React.lazy(() => import('@/pages/admin/PaymentAnalytics'));
const ControlRoom = React.lazy(() => import('@/pages/admin/ControlRoom'));
const RMPerformanceAnalytics = React.lazy(() => import('@/pages/admin/RMPerformanceAnalytics'));
const ConversionIntelligencePage = React.lazy(() => import('@/pages/admin/ConversionIntelligencePage'));
const ChannelPerformancePage = React.lazy(() => import('@/pages/admin/ChannelPerformancePage'));
const AdminAnnouncements = React.lazy(() => import('@/pages/admin/AdminAnnouncements'));

const VenueOwnerDashboard = React.lazy(() => import('@/pages/venue-owner/VenueOwnerDashboard'));
const VenueOwnerCreate = React.lazy(() => import('@/pages/venue-owner/VenueOwnerCreate'));
const VenueOwnerEdit = React.lazy(() => import('@/pages/venue-owner/VenueOwnerEdit'));
const VenueOwnerEditRequest = React.lazy(() => import('@/pages/venue-owner/VenueOwnerEditRequest'));
const VenueAvailabilityCalendar = React.lazy(() => import('@/pages/venue-owner/VenueAvailabilityCalendar'));

const PlannerDashboard = React.lazy(() => import('@/pages/planner/PlannerDashboard'));

const FinanceDashboard = React.lazy(() => import('@/pages/finance/FinanceDashboard'));
const FinanceLedger = React.lazy(() => import('@/pages/finance/FinanceLedger'));
const OperationsDashboard = React.lazy(() => import('@/pages/operations/OperationsDashboard'));
const MarketingDashboard = React.lazy(() => import('@/pages/marketing/MarketingDashboard'));

// Loading spinner for lazy chunks
const TeamLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FAFBF9]">
    <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
  </div>
);

// Team-specific protected route
const TeamProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <TeamLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/team/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/team/login" replace />;
  }

  // Intercept employees who need onboarding
  const managedRoles = ['rm', 'hr', 'venue_owner', 'event_planner', 'finance', 'operations', 'marketing', 'venue_specialist', 'vam'];
  if (managedRoles.includes(user?.role)) {
    const needsOnboarding = user.must_change_password || !user.profile_completed || user.verification_status === 'pending';
    if (needsOnboarding) {
      return <RMOnboarding />;
    }
  }

  return children;
};

const TeamApp = () => {
  return (
    <Suspense fallback={<TeamLoader />}>
      <Routes>
        {/* Team Login */}
        <Route path="/login" element={<TeamLogin />} />

        {/* Team Welcome Dashboard — shared entry point for all roles */}
        <Route path="/dashboard" element={
          <TeamProtectedRoute allowedRoles={['admin', 'rm', 'hr', 'venue_specialist', 'vam', 'venue_owner', 'event_planner', 'finance', 'operations', 'marketing']}>
            <TeamWelcome />
          </TeamProtectedRoute>
        } />

        {/* RM Routes */}
        <Route path="/rm/dashboard" element={<TeamProtectedRoute allowedRoles={['rm', 'admin']}><RMDashboard /></TeamProtectedRoute>} />
        <Route path="/rm/leads/:leadId" element={<TeamProtectedRoute allowedRoles={['rm', 'admin']}><RMLeadDetail /></TeamProtectedRoute>} />
        <Route path="/rm/my-performance" element={<TeamProtectedRoute allowedRoles={['rm', 'admin']}><RMMyPerformance /></TeamProtectedRoute>} />

        {/* HR Routes */}
        <Route path="/hr/dashboard" element={<TeamProtectedRoute allowedRoles={['hr', 'admin']}><HRDashboard /></TeamProtectedRoute>} />
        <Route path="/hr/employee/:userId" element={<TeamProtectedRoute allowedRoles={['hr', 'admin']}><HREmployeeDetail /></TeamProtectedRoute>} />

        {/* Venue Specialist Routes */}
        <Route path="/specialist/dashboard" element={<TeamProtectedRoute allowedRoles={['venue_specialist', 'admin']}><SpecialistDashboard /></TeamProtectedRoute>} />
        <Route path="/specialist/venue/:venueId" element={<TeamProtectedRoute allowedRoles={['venue_specialist', 'admin']}><VenueForm /></TeamProtectedRoute>} />

        {/* VAM Routes */}
        <Route path="/vam/dashboard" element={<TeamProtectedRoute allowedRoles={['vam', 'admin']}><VAMDashboard /></TeamProtectedRoute>} />
        <Route path="/vam/venue/:venueId" element={<TeamProtectedRoute allowedRoles={['vam', 'admin']}><VAMVenueReview /></TeamProtectedRoute>} />
        <Route path="/vam/edit-request/:editRequestId" element={<TeamProtectedRoute allowedRoles={['vam', 'admin']}><VAMEditRequestReview /></TeamProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<TeamProtectedRoute allowedRoles={['admin']}><AdminDashboard /></TeamProtectedRoute>} />
        <Route path="/admin/users" element={<TeamProtectedRoute allowedRoles={['admin']}><AdminUsers /></TeamProtectedRoute>} />
        <Route path="/admin/venues" element={<TeamProtectedRoute allowedRoles={['admin']}><AdminVenues /></TeamProtectedRoute>} />
        <Route path="/admin/leads" element={<TeamProtectedRoute allowedRoles={['admin']}><AdminLeads /></TeamProtectedRoute>} />
        <Route path="/admin/cities" element={<TeamProtectedRoute allowedRoles={['admin']}><AdminCities /></TeamProtectedRoute>} />
        <Route path="/admin/payments" element={<TeamProtectedRoute allowedRoles={['admin']}><PaymentManagement /></TeamProtectedRoute>} />
        <Route path="/admin/payments/analytics" element={<TeamProtectedRoute allowedRoles={['admin']}><PaymentAnalytics /></TeamProtectedRoute>} />
        <Route path="/admin/control-room" element={<TeamProtectedRoute allowedRoles={['admin']}><ControlRoom /></TeamProtectedRoute>} />
        <Route path="/admin/rm-analytics" element={<TeamProtectedRoute allowedRoles={['admin']}><RMPerformanceAnalytics /></TeamProtectedRoute>} />
        <Route path="/admin/conversion-intelligence" element={<TeamProtectedRoute allowedRoles={['admin']}><ConversionIntelligencePage /></TeamProtectedRoute>} />
        <Route path="/admin/channel-performance" element={<TeamProtectedRoute allowedRoles={['admin']}><ChannelPerformancePage /></TeamProtectedRoute>} />
        <Route path="/admin/announcements" element={<TeamProtectedRoute allowedRoles={['admin']}><AdminAnnouncements /></TeamProtectedRoute>} />

        {/* Venue Owner Routes */}
        <Route path="/venue-owner/dashboard" element={<TeamProtectedRoute allowedRoles={['venue_owner', 'admin']}><VenueOwnerDashboard /></TeamProtectedRoute>} />
        <Route path="/venue-owner/create" element={<TeamProtectedRoute allowedRoles={['venue_owner', 'admin']}><VenueOwnerCreate /></TeamProtectedRoute>} />
        <Route path="/venue-owner/edit/:venueId" element={<TeamProtectedRoute allowedRoles={['venue_owner', 'admin']}><VenueOwnerEdit /></TeamProtectedRoute>} />
        <Route path="/venue-owner/edit-request/:venueId" element={<TeamProtectedRoute allowedRoles={['venue_owner', 'admin']}><VenueOwnerEditRequest /></TeamProtectedRoute>} />
        <Route path="/venue-owner/calendar" element={<TeamProtectedRoute allowedRoles={['venue_owner', 'admin']}><VenueAvailabilityCalendar /></TeamProtectedRoute>} />

        {/* Event Planner Routes */}
        <Route path="/planner/dashboard" element={<TeamProtectedRoute allowedRoles={['event_planner', 'admin']}><PlannerDashboard /></TeamProtectedRoute>} />

        {/* Finance, Operations, Marketing Routes */}
        <Route path="/finance/dashboard" element={<TeamProtectedRoute allowedRoles={['finance', 'admin']}><FinanceDashboard /></TeamProtectedRoute>} />
        <Route path="/finance/ledger" element={<TeamProtectedRoute allowedRoles={['finance', 'admin']}><FinanceLedger /></TeamProtectedRoute>} />
        <Route path="/operations/dashboard" element={<TeamProtectedRoute allowedRoles={['operations', 'admin']}><OperationsDashboard /></TeamProtectedRoute>} />
        <Route path="/marketing/dashboard" element={<TeamProtectedRoute allowedRoles={['marketing', 'admin']}><MarketingDashboard /></TeamProtectedRoute>} />

        {/* Catch all — redirect to team login */}
        <Route path="*" element={<Navigate to="/team/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default TeamApp;
