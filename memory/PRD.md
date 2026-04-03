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
- **System state**: FRESH START (test leads from debugging)
- **Pilot domains**: testing.delhi.venuloq.com (customer) / teams.venuloq.com (internal)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 3, 2026 (Current Session)
- **P0 Bug Fix: Customer Portal Empty After Enquiry** — Field mismatch `customer_id` vs `customer_user_id`. Fixed across leads.py, booking.py, case_portal.py. 100% tests.
- **UI Polish: Bottom Tab Bar** — Filled active icons, heavier stroke, 50% opacity, gold bar, 64px. 100% tests.
- **UI Polish: Messages Empty State** — RM card with online badge, gold avatar, quick chips, gold send. 100% tests.
- **Bug Fix: Chat Compose Bar** — Restructured to flex layout with visualViewport keyboard handler. Fixed iOS scroll.
- **Mobile Fit: Case Detail Overview** — Tightened spacing (p-4, space-y-3.5, compact RM card, reduced stage progress bar). All content now fits 390x844 viewport without scrolling. 100% tests (13/13).
- **Profile Redesign: Facebook-style Cover** — Replaced cheap black background with premium venue banner photo. Avatar (96px) overlaps cover with 4px border. Camera/trash buttons. Name/email on light background below. 100% tests.

### Earlier Sessions
- 10/10 Visual Contrast Polish, RM Dashboard bug fix, E2E Dry Run (42/42)
- Pre-pilot cleanup and fresh-start lead reset (141 leads archived)
- Google OAuth routing for pilot domain, Customer profile photo upload
- Full Platform Rebranding (VenuLock -> VenuLoQ)
- Landing Page Overhaul, Mobile Search Page Redesign

## Backlog
- P1: Phase 2 — Quick Preview modal, Recently Viewed Venues, FilterBottomSheet
- P2: Phase 3 — Refactor LandingPage.js, VenuePublicPage.js
- P2: Facebook Login, Production Google OAuth, Vendor Payout Module, SEO
