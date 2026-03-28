# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR. Marketplace connecting event planners with curated venues. Internal team operations and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
- Customer App (`App.js`) + Team Portal (`TeamApp.js`) from single codebase
- Hostname-based routing in `index.js`
- Mobile-first app shell with bottom tab navigation

## What's Been Implemented

### iPhone App Conversion (March 28, 2026)
- **Bottom Tab Bar** (`BottomTabBar.js`): Persistent 5-tab navigation (Home, Explore, Saved, Requests, Profile) with gold active state, hidden on venue detail pages, desktop-hidden, safe area padding
- **Compact Mobile Header**: All mobile headers reduced from 64px to 48px (h-12), backdrop blur, safe area inset handling
- **Footer Hidden on Mobile**: `hidden md:block` — footer only shows on desktop
- **Landing Page App-ified**: Removed Stats, Testimonials, Why VenuLoQ, Final CTA, Footer from mobile. Tightened section spacing (py-20 → py-10). Keep Hero, Categories, Concierge, How It Works
- **Venue Detail Native Feel**: Breadcrumb hidden on mobile, Header hidden on mobile, sticky CTA at bottom-0 (no tab bar overlap)
- **Chat Button Repositioned**: Sits above tab bar using `calc(4.5rem + env(safe-area-inset-bottom))`, smaller on mobile (w-12 h-12)
- **Bottom Padding**: All customer pages use `app-main-content` class for tab bar clearance
- **Testing**: 100% pass - 17/17 frontend tests (iteration_126)

### Mood Filter Fix + Text Updates (March 28, 2026)
- Enriched vibe tags on 40+ venues — every city covers all 7 mood filters
- Landing page: "India" → "Delhi NCR", "Event Manager" → "Relationship Manager"

### Phase 2: Customer Interface (March 25, 2026)
- My Bookings, My Reviews, Payments, Invoices pages
- Personalized venue recommendations on dashboard
- Testing: 100% pass (iteration_125)

### Phase 1: Customer Interface (March 25, 2026)
- Enhanced Profile Page with event preferences
- Redesigned customer dashboard

### Previous Work
- Splash screen, hostname-based routing, team portal
- Finance/Marketing/Operations dashboards, platform rebranding

## Test Credentials
- Admin: admin@venulock.in / admin123
- Customer: democustomer@venulock.in / password123

## Key Components
- `BottomTabBar.js` — 5-tab persistent mobile navigation
- `StickyMobileCTA.js` — Venue detail bottom CTA (Connect + Start Planning)
- `ChatBot.js` — Floating support chat, repositioned for app shell
- `Header.js` — Shared compact header with safe area padding
- `Footer.js` — Desktop-only footer

## Upcoming Tasks
- P1: RM booking flow polish (tighter stepper, RM card previews)
- P1: My Requests page enhancement (status tracking, WhatsApp action)
- P2: Push notifications for booking status updates

## Future Tasks
- Full vendor payout module
- "List Your Venue" partner landing page
- Production Razorpay integration
- Refactor monolithic components
- SMS/WhatsApp notifications
