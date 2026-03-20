# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" aesthetic. Includes internal team operations (HR, RM, Specialist, VAM, Venue Owner) and customer-facing venue search & booking. Frontend split into customer app and internal team portal.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
1. **Customer App (`App.js`):** Public-facing site at root URLs (`/`)
2. **Team Portal (`TeamApp.js`):** Internal portal at `/team/*`, lazy-loaded

## User Roles & Portal Access
| Role | Login | Dashboard |
|------|-------|-----------|
| Admin | `/team/login` | `/team/dashboard` → `/team/admin/dashboard` |
| HR | `/team/login` | `/team/dashboard` → `/team/hr/dashboard` |
| RM | `/team/login` | `/team/dashboard` → `/team/rm/dashboard` |
| Venue Specialist | `/team/login` | `/team/dashboard` → `/team/specialist/dashboard` |
| VAM | `/team/login` | `/team/dashboard` → `/team/vam/dashboard` |
| Venue Owner | `/team/login` | `/team/dashboard` → `/team/venue-owner/dashboard` |
| Customer | `/login` | `/my-enquiries` |

## What's Been Implemented

### Venue Owner Edit Request Workflow (Complete - March 20, 2026)
- **Backend**: New `venue_edit_requests` collection with full CRUD
  - `POST /api/venue-onboarding/edit-request` — Owner creates request
  - `GET /api/venue-onboarding/edit-requests/my` — Owner views their requests
  - `GET /api/venue-onboarding/edit-requests/pending` — VAM views pending
  - `GET /api/venue-onboarding/edit-requests/all` — VAM views all
  - `PATCH /api/venue-onboarding/edit-request/{id}/review` — VAM approve/reject
- **Frontend Owner**: "Request Changes" button on approved venues, pre-filled edit form with gold highlight on changed fields, Change Requests section with status badges
- **Frontend VAM**: "Edit Requests" tab on dashboard with pending count, diff review page (current=red vs proposed=green), approve/reject with notes
- **Auto-apply**: Approved changes automatically update the live venue document
- **Testing**: Backend 18/18, Frontend 18/18 (iteration_117)

### Venue Acquisition Workflow - E2E Verified (March 20, 2026)
- Full Specialist → VAM workflow verified within `/team` portal structure
- **Testing**: Frontend 20/20 features (iteration_116)

### Team Announcements (Complete - March 20, 2026)
- Admin CRUD at `/team/admin/announcements`, displayed on all team welcome dashboards
- **Testing**: Backend 20/20, Frontend 17/17 (iteration_115)

### Team Welcome Dashboard (Complete - March 20, 2026)
- Shared `/team/dashboard` with role-specific stats, quick actions, activity feed
- **Testing**: 100% (iteration_114)

### Frontend Application Split (Complete - March 20, 2026)
- Customer App + Team Portal separation, all links updated
- **Testing**: 100% (iteration_113)

### Previously Completed
- Employee Onboarding & HR (generalized for all roles)
- RM Lead Pipeline (9-stage)
- Booking Flow, Landing Page, Search, PWA
- Platform Rebranding (VenuLoQ)

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Venue Owner: venue@venuloq.in / venue123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
- Auth: `POST /api/auth/login`
- Team Dashboard: `GET /api/team/dashboard`
- Announcements: `GET|POST|PUT|DELETE /api/team/announcements`
- Venue Onboarding: `POST /api/venue-onboarding/create`, `PATCH /{id}/review`
- Edit Requests: `POST /api/venue-onboarding/edit-request`, `PATCH /edit-request/{id}/review`
- Venues: `GET /api/venues/featured`, `GET /api/venues/search`

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED
- AdminCities PUT/POST endpoints may not exist

## Upcoming Tasks (P1)
- None remaining from current P1 list

## Future/Backlog (P2+)
- Refactor LandingPage.js & VenuePublicPage.js into smaller components
- Razorpay production mode, SEO/OG tags, partner landing page
- Dedicated dashboards for Finance, Operations, Marketing
- SMS notifications, WhatsApp integration
- Geolocation API for venue address auto-complete
- AdminCities CRUD backend endpoints
