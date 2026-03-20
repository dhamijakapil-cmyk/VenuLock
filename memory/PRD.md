# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" / "concierge" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India. Includes internal team operations (HR, RM, Specialist, VAM) and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture (Updated March 20, 2026)
The frontend is split into two separate applications:
1. **Customer App (`App.js`):** Public-facing site for venue search & booking at root URLs (`/`)
2. **Team Portal (`TeamApp.js`):** Internal employee portal at `/team/*` URLs, lazy-loaded

### Key Architecture Decisions
- `TeamApp.js` is lazy-loaded via `React.lazy()` so customer-facing pages never load team code
- Customer-only UI (ChatBot, CompareFloatingBar, InstallPrompt) hidden on `/team/*` routes
- Splash screen bypassed for `/team/*` routes
- Team login at `/team/login` with role-based redirect to dashboards
- All team navigation links prefixed with `/team/`

## User Roles
- **Admin**: Platform operations, employee creation, venue management, analytics → `/team/admin/dashboard`
- **HR**: Staff verification, document management → `/team/hr/dashboard`
- **RM**: Lead management, customer communication → `/team/rm/dashboard`
- **Venue Specialist**: Field agent, venue onboarding → `/team/specialist/dashboard`
- **VAM**: Reviews/approves venue submissions → `/team/vam/dashboard`
- **Venue Owner**: Venue profile management → `/team/venue-owner/dashboard`
- **Event Planner**: Future expansion → `/team/planner/dashboard`
- **Customer**: Venue search, enquiry, booking → `/` (root)

## What's Been Implemented

### Frontend Application Split (Complete - March 20, 2026)
- Created `TeamApp.js` with all team routes under `/team/*` prefix
- Created `TeamLogin.js` at `/team/login` for team authentication
- Updated all navigation links, breadcrumbs, and redirects across all team pages
- Customer-only UI hidden on team routes
- Splash screen bypass for team routes
- Auth protection: unauthenticated `/team/*` access → `/team/login`
- Fixed double-login bug in TeamLogin.js
- **Testing**: 100% pass rate (13/13 tests) - iteration_113

### Venue Acquisition Workflow (Complete)
- Two roles: `venue_specialist` and `vam`
- Backend (`venue_onboarding.py`): Full REST API for venue lifecycle
- Specialist Dashboard + 7-Step Venue Form (mobile-first)
- VAM Dashboard + Review Page

### Employee Onboarding & HR (Complete)
- Admin creates employees with temp passwords
- Onboarding flow: password change → profile → HR verification
- HR document checklist (7 items)

### RM Webapp & Lead Workflow (Complete)
- 9-stage pipeline, messaging, notes, timeline

### Booking Flow, Landing Page, Search, PWA (Complete)

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
- `POST /api/auth/login` — Authentication
- `GET /api/venues/featured` — Featured venues
- `GET /api/venues/search` — Venue search
- `GET /api/venues/cities` — Cities list
- `POST /api/venue-onboarding/create` — Specialist creates draft
- `GET /api/venue-onboarding/my-submissions` — Specialist's venues
- `PATCH /api/venue-onboarding/{id}/review` — VAM approve/reject

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED
- AdminCities PUT/POST endpoints may not exist (GET works via /api/venues/cities)

## Upcoming Tasks (P1)
- Full E2E test of Venue Acquisition workflow within /team structure
- Venue Owner Portal: edit approved venues, submit change requests for VAM approval

## Future/Backlog (P2+)
- Refactor LandingPage.js & VenuePublicPage.js
- Razorpay production, SEO, partner landing page
- Dedicated dashboards for Finance, Operations, Marketing
- SMS notifications, WhatsApp integration via Twilio
