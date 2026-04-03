# VenuLoQ - Premium Venue Booking Platform

## Product Vision
A premium hospitality-tech marketplace that connects customers with curated event venues through a concierge-style booking experience.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB (DB: test_database)
- **Auth**: JWT + Emergent-managed Google OAuth
- **Payments**: Razorpay (Test Mode)
- **Email**: Resend via Emergent integrations

## Design System
- **Background**: #EDE9E1 (warm ivory/stone)
- **Dark surfaces**: #0B0B0D
- **Gold accent**: #D4B36A
- **Headings**: Cormorant Garamond (serif)
- **Body**: DM Sans (sans-serif)

## Pilot Readiness Status
- **System state**: FRESH START — test leads from debugging exist
- **Master data intact**: 98 users, 86 venues (untouched)
- **Archive**: 141 leads + related data in `archived_*` collections
- **Pilot domains**: testing.delhi.venuloq.com (customer) / teams.venuloq.com (internal)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 3, 2026 (Current Session)
- **P0 Bug Fix: Customer Portal Empty After Enquiry** — Root cause: leads created with `customer_id` but case portal queried `customer_user_id`. Fixed across leads.py, booking.py, case_portal.py. 100% tests passed.
- **UI Polish: Bottom Tab Bar** — Filled active icons, heavier stroke, 50% opacity inactive labels, gold bar indicator, 64px height, prominent My Case circular icon. 100% tests passed.
- **UI Polish: Messages Empty State** — Premium RM card with online badge, gold-gradient avatar, "[RM] is ready to help" heading, quick-start chips, gold send button. 100% tests passed.
- **Bug Fix: Chat Compose Bar Layout** — Restructured MessagesSection from flow-based (mt-auto) to proper chat layout (flex scrollable messages + fixed compose bar). Added iOS visualViewport keyboard handler to prevent page scroll. Set textarea font-size to 16px to prevent iOS auto-zoom. Reduced parent padding-bottom in messages mode.

### Earlier Sessions
- 10/10 Visual Contrast Polish (unified contrast across all customer pages)
- RM Dashboard stats bug fix (team.py: assigned_rm -> rm_id)
- Full E2E Dry Run — 42/42 endpoints PASS
- Pre-pilot cleanup and fresh-start lead reset (141 leads archived)
- Google OAuth routing for pilot domain testing.delhi.venuloq.com
- Customer profile photo upload/remove (base64 storage)
- Full Platform Rebranding (VenuLock -> VenuLoQ)
- Landing Page Overhaul (VenueShowcase carousel, SplashScreen, PremiumLogo)
- Mobile Search Page Redesign (horizontal card layout, filter chips, Top Pick badges)

## Backlog
- P1: Phase 2 — Quick Preview modal, Recently Viewed Venues, FilterBottomSheet
- P2: Phase 3 — Refactor LandingPage.js, VenuePublicPage.js
- P2: Facebook Login
- P2: Production Google OAuth (venuloq.com, www.venuloq.com)
- P2: Vendor Payout Module
- P2: SEO meta tags, Open Graph, structured data
