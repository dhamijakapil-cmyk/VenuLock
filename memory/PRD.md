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
- `venuloq.net` → Redirect to venuloq.com (brand protection)

## What's Been Implemented

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

## Upcoming Tasks (Phase 2: Core Features)
- **Booking History & Status Tracking** — Past/upcoming bookings with status, venue details, date, payment
- **Reviews & Ratings** — 1-5 stars + text, shown on venue detail pages

## Future Tasks (Phase 3+)
- Push Notifications (booking confirmations, status updates, offers)
- Full Vendor Payout Module
- "List Your Venue" partner landing page
- Refactor monolithic components
- Production Razorpay integration
- SMS/WhatsApp notifications
