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
- **System state**: FRESH START — 0 active leads (test leads from debugging exist)
- **Master data intact**: 98 users, 86 venues (untouched)
- **Archive**: 141 leads + related data in `archived_*` collections
- **Pilot domains**: testing.delhi.venuloq.com (customer) / teams.venuloq.com (internal)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 3, 2026 (Current Session)
- **P0 Bug Fix: Customer Portal Empty After Enquiry** — Root cause: leads created with `customer_id` but case portal queried `customer_user_id`. Fixed by adding `customer_user_id` to lead creation (leads.py, booking.py) and expanding case_portal.py query to match both fields + email fallback. 100% tests passed (7/7 backend, all frontend).
- **UI Polish: Bottom Tab Bar** — Replaced weak thin outline icons with filled active icons (2.5 stroke), heavier 1.8 stroke inactive, 50% opacity labels (was 35%), gold bar indicator at top, 64px height, prominent My Case circular icon. 
- **UI Polish: Messages Empty State** — Premium RM card with online badge, warm gold-gradient RM avatar with green "Online" dot, "[RM] is ready to help" heading, "Typically replies within 30 min" note, 3 quick-start suggestion chips, gold-accented send button, personalized placeholder. 100% tests passed (12/12 features).

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
