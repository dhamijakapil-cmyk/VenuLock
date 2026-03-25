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
4. **Single codebase** — two deployments, hostname-based routing handles the rest

## Domains
- `testing.delhi.venuloq.com` → Customer App
- `teams.venuloq.com` → Team Portal

## What's Been Implemented

### Personalized Venue Recommendations (March 25, 2026)
- **"Recommended for You" section** on customer dashboard (`/my-enquiries`): Horizontal scrollable venue cards matching user preferences
- **Backend**: GET `/api/auth/recommended-venues` — Queries venues by preferred cities, scores by event type overlap + budget proximity + rating, returns top 12
- **Scoring algorithm**: Event type match (10pts), rating (2x), review count (up to 20pts), budget proximity (5-15pts)
- **UI**: Venue cards with images, star ratings, "MATCH" badges, location, per-plate pricing
- **Testing**: 100% pass - 20/20 backend tests, all frontend UI tests (iteration_125)

### Phase 2: Customer Interface — My Bookings, Reviews, Payments, Invoices (March 25, 2026)
- **My Bookings Page** (`/my-bookings`): Booking history with status badges, progress bar, expandable 8-stage timeline, venue images, filter chips (All/Active/Completed)
- **My Reviews Page** (`/my-reviews`): View submitted reviews with stats, Write Review modal (venue selection, star rating, title & content)
- **Payments Page** (`/payments`): Total paid summary card, payment history with status badges
- **Invoices Page** (`/invoices`): Invoice list with preview modal, printable invoice with VenuLoQ branding
- **Dashboard Update** (`/my-enquiries`): Quick-action buttons for all new pages
- **Backend**: GET `my-bookings`, `my-reviews`, `my-payments`, `my-invoices`
- **Testing**: 100% pass - iteration_124 and iteration_125

### Phase 1: Customer Interface (March 25, 2026)
- **Enhanced Profile Page** (`/profile`): Name, phone, email, event preferences, notification toggle
- **Dashboard Enhancement** (`/my-enquiries`): Quick action buttons, avatar navigation to profile
- **Backend**: GET/PUT `/api/auth/profile` with preferences
- **Testing**: 100% pass - 22/22 tests (iteration_123)

### Previous Work
- Guest Count Quick Filter, Splash Screen, Hostname-based routing
- Team Portal, Finance/Marketing/Operations dashboards, Payment Ledger
- Venue Acquisition E2E workflow, Notification badges
- Platform rebranding, Landing page overhaul, Mobile search redesign

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Upcoming Tasks
- **P1 - Push Notifications** — Booking confirmations, status updates, offers
- **P2 - Review Moderation** — Admin ability to approve/flag reviews

## Future Tasks (Phase 3+)
- Full Vendor Payout Module
- "List Your Venue" partner landing page
- Refactor monolithic components (LandingPage.js, VenueSearchPage.js)
- Production Razorpay integration
- SMS/WhatsApp notifications
