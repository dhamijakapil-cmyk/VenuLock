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
3. **Single deployment** — team accesses via `/team/login`, customer via `/`

## User Roles & Portal Access
| Role | Login | Dashboard |
|------|-------|-----------|
| Admin | `/team/login` | `/team/dashboard` → all admin tools |
| HR | `/team/login` | `/team/dashboard` → `/team/hr/dashboard` |
| RM | `/team/login` | `/team/dashboard` → `/team/rm/dashboard` |
| Venue Specialist | `/team/login` | `/team/dashboard` → `/team/specialist/dashboard` |
| VAM | `/team/login` | `/team/dashboard` → `/team/vam/dashboard` |
| Venue Owner | `/team/login` | `/team/dashboard` → `/team/venue-owner/dashboard` |
| Finance | `/team/login` | `/team/dashboard` → `/team/finance/dashboard` + `/team/finance/ledger` |
| Operations | `/team/login` | `/team/dashboard` → `/team/operations/dashboard` |
| Marketing | `/team/login` | `/team/dashboard` → `/team/marketing/dashboard` |
| Customer | `/login` | `/my-enquiries` |

## What's Been Implemented (This Session - March 20, 2026)

### Finance Payment Ledger (Complete)
- Backend: `GET /api/payments/ledger` (paginated, filterable by status/search), `GET /api/payments/ledger/export` (all data for CSV)
- Frontend: Full data table with Date, Customer, Amount, Commission, Net Vendor, Status, Reference columns
- Status filter chips (All/Pending/Captured/Released/Failed), search input, CSV export button
- **Testing**: Backend 14/14, Frontend 100% (iteration_119)

### Sidebar Notification Badges (Complete)
- `GET /api/team/badge-counts` returns role-specific pending counts, polls every 30s
- Red badges on sidebar items (Admin: pending verifications, HR: pending staff, VAM: pending reviews)

### Finance/Operations/Marketing Dashboards (Complete)
- Finance: Revenue overview, payment stats, link to Ledger
- Operations: Platform overview + Venue Onboarding Pipeline progress bars
- Marketing: Enquiry stats, Top Lead Sources, Top Cities bar charts

### SEO Meta Tags (Complete)
- `SEOHead.js`: dynamic title, OG, Twitter Card on Landing/Search/Venue pages
- JSON-LD `@type: EventVenue` on venue detail pages

### Venue Owner Edit Request Workflow (Complete)
- Owner submits change requests → VAM reviews with diff view → auto-applies on approval
- **Testing**: Backend 18/18, Frontend 18/18 (iteration_117)

### Venue Acquisition E2E Verified (Complete)
- **Testing**: Frontend 20/20 (iteration_116)

### Team Announcements (Complete)
- **Testing**: Backend 20/20, Frontend 17/17 (iteration_115)

### Team Welcome Dashboard (Complete)
- **Testing**: 100% (iteration_114)

### Frontend Application Split (Complete)
- **Testing**: 100% (iteration_113)

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Venue Owner: venue@venuloq.in / venue123
- Customer: democustomer@venulock.in / password123

## Known Issues
- Razorpay in test mode
- WhatsApp delivery MOCKED

## Future/Backlog (P3+)
- Refactor LandingPage.js & VenuePublicPage.js
- Razorpay production mode
- Partner landing page ("List Your Venue")
- SMS/WhatsApp integration
- Geolocation API for venue address auto-complete
- AdminCities CRUD backend
