# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic. Marketplace connecting event planners with curated venues across India. Internal team operations (HR, RM, Specialist, VAM, Venue Owner, Finance, Operations, Marketing) and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
1. **Customer App (`App.js`):** Public-facing site at root URLs (`/`) with SEO meta tags, OG, JSON-LD
2. **Team Portal (`TeamApp.js`):** Internal portal at `/team/*`, lazy-loaded, with badge notifications

## User Roles & Portal Access
| Role | Login | Dashboard |
|------|-------|-----------|
| Admin | `/team/login` | `/team/dashboard` → `/team/admin/dashboard` |
| HR | `/team/login` | `/team/dashboard` → `/team/hr/dashboard` |
| RM | `/team/login` | `/team/dashboard` → `/team/rm/dashboard` |
| Venue Specialist | `/team/login` | `/team/dashboard` → `/team/specialist/dashboard` |
| VAM | `/team/login` | `/team/dashboard` → `/team/vam/dashboard` |
| Venue Owner | `/team/login` | `/team/dashboard` → `/team/venue-owner/dashboard` |
| Finance | `/team/login` | `/team/dashboard` → `/team/finance/dashboard` |
| Operations | `/team/login` | `/team/dashboard` → `/team/operations/dashboard` |
| Marketing | `/team/login` | `/team/dashboard` → `/team/marketing/dashboard` |
| Customer | `/login` | `/my-enquiries` |

## What's Been Implemented

### P2 Features (Complete - March 20, 2026)

#### Sidebar Notification Badges
- Backend `GET /api/team/badge-counts` returns role-specific pending counts
- Red badge indicators on sidebar nav items (polls every 30s)
- Admin: pending verifications, new leads. HR: pending verifications. VAM: pending reviews. RM: active pipeline. Specialist: changes requested. Venue Owner: reviewed requests.

#### Finance Dashboard (`/team/finance/dashboard`)
- Revenue overview from `/api/payments/stats/summary`: Total Revenue, Total Payments, Pending, Won Deals
- Recent payments table

#### Operations Dashboard (`/team/operations/dashboard`)  
- Platform Overview: Live Venues, Total Leads, Team Members, Pending Approvals
- Venue Onboarding Pipeline with progress bars (Drafts/In Review/Approved)

#### Marketing Dashboard (`/team/marketing/dashboard`)
- Total Enquiries, Listed Venues, Active Cities
- Top Lead Sources with bar charts
- Top Cities by Enquiry Volume with bar charts

#### SEO Meta Tags
- `SEOHead.js` component: dynamic title, OG, Twitter Card meta tags
- Landing Page: "Premium Venue Marketplace | VenuLoQ"
- Search Page: "Venues in {city} | VenuLoQ" (dynamic)
- Venue Detail Page: "{venue.name} - {city} | VenuLoQ" + JSON-LD `@type: EventVenue`

### P1 Features (Complete)
- Venue Owner Edit Request Workflow (Owner → VAM review → auto-apply)
- Venue Acquisition E2E verified within `/team` portal
- Team Announcements (Admin CRUD, all team see on welcome)
- Team Welcome Dashboard (role-specific stats, quick actions)
- Frontend Application Split (Customer App + Team Portal)

### Core Features (Complete)
- Employee Onboarding & HR, RM Lead Pipeline, Booking Flow, Landing Page, Search, PWA

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Venue Owner: venue@venuloq.in / venue123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
- `GET /api/team/badge-counts` — Sidebar badge counts
- `GET /api/team/dashboard` — Welcome dashboard data
- `GET|POST|PUT|DELETE /api/team/announcements`
- `POST /api/venue-onboarding/edit-request`, `PATCH /edit-request/{id}/review`
- `GET /api/payments/stats/summary` — Payment stats
- `GET /api/leads` — Lead listing
- `GET /api/admin/stats` — Platform stats

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED
- Finance "Recent Payments" section shows empty (needs dedicated payment list endpoint)

## Future/Backlog (P3+)
- Refactor LandingPage.js & VenuePublicPage.js into smaller components
- Razorpay production mode
- Partner landing page ("List Your Venue")
- SMS notifications, WhatsApp integration
- Geolocation API for venue address auto-complete
- AdminCities CRUD backend endpoints
- Finance: detailed payment history with filters
