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
- Team login at `/team/login` with all roles redirecting to shared `/team/dashboard`
- All team navigation links prefixed with `/team/`
- Sidebar includes `Home` link to `/team/dashboard` for all roles

## User Roles & Portal Access
| Role | Portal Entry | Welcome Dashboard | Role Dashboard |
|------|-------------|-------------------|----------------|
| Admin | `/team/login` | `/team/dashboard` | `/team/admin/dashboard` |
| HR | `/team/login` | `/team/dashboard` | `/team/hr/dashboard` |
| RM | `/team/login` | `/team/dashboard` | `/team/rm/dashboard` |
| Venue Specialist | `/team/login` | `/team/dashboard` | `/team/specialist/dashboard` |
| VAM | `/team/login` | `/team/dashboard` | `/team/vam/dashboard` |
| Venue Owner | `/team/login` | `/team/dashboard` | `/team/venue-owner/dashboard` |
| Event Planner | `/team/login` | `/team/dashboard` | `/team/planner/dashboard` |
| Customer | `/login` | N/A | `/my-enquiries` |

## What's Been Implemented

### Team Announcements (Complete - March 20, 2026)
- **Backend CRUD** (`/api/team/announcements`): Create, read, update, delete announcements (admin-only for write ops)
- **DB Collection**: `team_announcements` with fields: announcement_id, title, body, type (info/success/warning/urgent), pinned, active, created_by, created_by_name, created_at, expires_at
- **Admin Management Page** (`/team/admin/announcements`): Full CRUD UI with type selector, pin toggle, expiry dates, hide/show, delete with confirmation
- **Welcome Dashboard Integration**: All active announcements display as color-coded cards on every team member's `/team/dashboard`
- **Sorting**: Pinned announcements always appear first, then newest
- **Access Control**: Admin can manage; all team members can view active announcements
- **Testing**: Backend 20/20, Frontend 17/17 (iteration_115)

### Team Welcome Dashboard (Complete - March 20, 2026)
- Shared landing page at `/team/dashboard` for all team roles after login
- Backend endpoint `GET /api/team/dashboard` returns role-specific data
- Personalized greeting, role-specific quick stats, quick action buttons, recent activity feed
- **Testing**: 100% pass rate (iteration_114)

### Frontend Application Split (Complete - March 20, 2026)
- Customer App (`App.js`) and Team Portal (`TeamApp.js`) separated
- All navigation links updated with `/team/` prefix
- **Testing**: 100% pass rate (iteration_113)

### Venue Acquisition Workflow (Complete)
### Employee Onboarding & HR (Complete)
### RM Webapp & Lead Workflow (Complete)
### Booking Flow, Landing Page, Search, PWA (Complete)

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
- `POST /api/auth/login`
- `GET /api/team/dashboard` — Team welcome dashboard (role-specific)
- `GET /api/team/announcements` — Active announcements
- `GET /api/team/announcements/all` — All announcements (admin)
- `POST /api/team/announcements` — Create announcement (admin)
- `PUT /api/team/announcements/{id}` — Update announcement (admin)
- `DELETE /api/team/announcements/{id}` — Delete announcement (admin)
- `GET /api/venues/featured`, `GET /api/venues/search`, `GET /api/venues/cities`
- `POST /api/venue-onboarding/create`, `PATCH /api/venue-onboarding/{id}/review`

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED
- AdminCities PUT/POST endpoints may not exist

## Upcoming Tasks (P1)
- Full E2E test of Venue Acquisition workflow within /team structure
- Venue Owner Portal: edit approved venues, submit change requests for VAM approval

## Future/Backlog (P2+)
- Refactor LandingPage.js & VenuePublicPage.js
- Razorpay production, SEO, partner landing page
- Dedicated dashboards for Finance, Operations, Marketing
- SMS notifications, WhatsApp integration via Twilio
- AdminCities CRUD backend endpoints
