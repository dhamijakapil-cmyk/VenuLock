# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic. Marketplace connecting event planners with curated venues across India. Internal team operations (HR, RM, Specialist, VAM, Venue Owner, Finance, Operations, Marketing) and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
1. **Customer App (`App.js`):** Public-facing site at root URLs (`/`) with SEO meta tags
2. **Team Portal (`TeamApp.js`):** Internal portal, lazy-loaded. Accessible at `/team/*` on customer domain OR at root `/` on teams domain
3. **Hostname-based routing (`index.js`):** Detects `teams.*` domains → loads `TeamRoot.js`; otherwise → loads `App.js`
4. **TeamRoot.js:** Standalone shell for team portal with `/team/*` prefix stripping
5. **Single codebase** — two deployments, hostname-based routing handles the rest

## Domains
- `testing.delhi.venuloq.com` → Customer App
- `teams.venuloq.com` → Team Portal

## What's Been Implemented

### Phase 2: Customer Interface — My Bookings, Reviews, Payments, Invoices (March 25, 2026)
- **My Bookings Page** (`/my-bookings`): View booking history with status badges (Submitted/In Touch/In Progress/Site Visit/Finalizing/Confirmed/Cancelled), progress bar, expandable 8-stage timeline, venue images, filter chips (All/Active/Completed)
- **My Reviews Page** (`/my-reviews`): View submitted reviews with stats (total count, avg rating), Write Review modal with venue selection from bookings, star rating, title & content
- **Payments Page** (`/payments`): Total paid summary card, payment history with status badges, venue/event enrichment
- **Invoices Page** (`/invoices`): Invoice list with preview modal, printable invoice with VenuLoQ branding, download capability
- **Dashboard Update** (`/my-enquiries`): Added quick-action buttons for all new pages (My Bookings, My Reviews, Payments, Invoices)
- **Backend**: GET `/api/auth/my-bookings`, GET `/api/auth/my-reviews`, GET `/api/auth/my-payments`, GET `/api/auth/my-invoices`
- **Testing**: 100% pass - Backend 15/15 tests, Frontend all UI tests passed (iteration_124)

### Phase 1: Customer Interface (March 25, 2026)
- **Enhanced Profile Page** (`/profile`): Name, phone, email, event preferences (preferred cities, event types, budget range), notification toggle, save & logout
- **Dashboard Enhancement** (`/my-enquiries`): Added "My Profile" quick action button, clickable avatar navigating to profile
- **Backend**: GET/PUT `/api/auth/profile` with preferences (preferred_cities, preferred_event_types, budget_range, notifications_enabled)
- **Testing**: 100% pass - 22/22 tests (iteration_123)

### Guest Count Quick Filter (March 23, 2026)
- Added guest count chips (0-100, 101-250, 251-1000, 1001-2500) above vibe chips on search page
- Design agent polish: glass bg for guest chips, serif font for vibe chips, transparent action buttons

### Splash Screen (March 21-23, 2026)
- Cinematic animated splash with VenuLoQ logo, light rays, gold sparks, shimmer
- Removed static iOS PWA startup images to prevent double logo
- Shortened to 3 seconds

### Previous Work
- Hostname-based Team Portal routing, Team Login redesign
- Finance/Marketing/Operations dashboards, Payment Ledger
- Venue Acquisition E2E workflow, Notification badges
- Platform rebranding, Landing page overhaul, Mobile search redesign

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Finance: finance@venuloq.in / finance123
- Customer: democustomer@venulock.in / password123

## Upcoming Tasks
- **P1 - Personalized Venue Recommendations** — Suggest venues based on saved preferences (cities, event types, budget)
- **P1 - Push Notifications** — Booking confirmations, status updates, offers

## Future Tasks (Phase 3+)
- Full Vendor Payout Module
- "List Your Venue" partner landing page
- Refactor monolithic components (LandingPage.js, VenueSearchPage.js)
- Production Razorpay integration
- SMS/WhatsApp notifications
