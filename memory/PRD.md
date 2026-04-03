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
- **System state**: FRESH START — 0 active leads, all case data archived
- **Master data intact**: 98 users, 86 venues (untouched)
- **Archive**: 141 leads + related data in `archived_*` collections (rollback available)
- **RM Capacity**: All RMs at 0/25 — fully available
- **Pilot domains**: testing.delhi.venuloq.com (customer) / teams.venuloq.com (internal)

### Pilot Go/No-Go
- **Internal Dry Run**: GO
- **Friendly Customer Pilot**: GO (email/password auth, Razorpay test mode)
- **Small Live Pilot**: CONDITIONAL (needs Razorpay prod keys + Google OAuth config)

## Blocked on User Configuration
- Google OAuth: Add production redirect URIs in GCP Console
- Razorpay: Set production RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend .env

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 3, 2026 (Current Session)
- **P0 Bug Fix: Customer Portal Empty After Enquiry** — Root cause: leads created with `customer_id` but case portal queried `customer_user_id`. Fixed by adding `customer_user_id` to lead creation (leads.py, booking.py) and expanding case_portal.py query to match both fields + email fallback. Also added `"new"` stage to STAGES arrays in CustomerHome.js and CustomerCaseDetail.js. 100% tests passed (7/7 backend, all frontend verified).

### Earlier Sessions
- 10/10 Visual Contrast Polish (unified contrast system across all customer pages)
- RM Dashboard stats bug fix (team.py: assigned_rm -> rm_id)
- Full E2E Dry Run — 42/42 endpoints PASS
- Pre-pilot test data cleanup (149 TEST_ leads purged)
- Fresh-start pilot reset — all 141 leads archived, 0 active, master data untouched
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
