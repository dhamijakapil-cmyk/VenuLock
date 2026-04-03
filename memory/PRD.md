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

### Contrast Hierarchy (Established April 2026)
| Level | On Ivory (#EDE9E1) | On Dark (#0B0B0D) |
|---|---|---|
| Primary (headings) | #0B0B0D (full) | #F4F1EC (full) |
| Secondary (body) | #0B0B0D/70 | #F4F1EC/70 |
| Tertiary (meta/labels) | #0B0B0D/45 | #F4F1EC/45-50 |
| Muted (decorative) | #0B0B0D/25 | #F4F1EC/25 |

## Customer Portal (IA)
Home → Explore → My Case → Messages → Profile

## Key Pages
- **CustomerHome**: Hero card + pills + explore banner + other bookings (zero-scroll)
- **CustomerCaseDetail**: Event hero + RM card + assistance + tabs (Messages, Shared, Payments, Timeline)
- **ProfilePage**: Dark hero + basic info + event preferences + notifications
- **AuthPage**: Google (Emergent) + email/password login
- **VenuePublicPage**: Venue detail with gallery, pricing, amenities, "Start Planning" CTA
- **VenueSearchPage**: Search with filters, mobile horizontal cards
- **RMDashboard**: Urgency strip, attention/all views, lead pipeline
- **TeamWelcome**: Role-based dashboard with stats and quick actions

## Completed Work
- Full platform rebranding (VenuLock → VenuLoQ)
- Customer Experience Reset Pass (case-centric design)
- Premium ivory/stone theme with unified contrast system
- Living golden shimmer background
- Event hero banner, concierge assistance section
- Profile page with chip selectors
- Bottom nav polish with My Case emphasis
- Google OAuth smart routing (Emergent vs custom GCP)
- /my-enquiries → /home redirect (legacy route purged)
- iPhone safe area support
- RM Dashboard stats bug fix (assigned_rm → rm_id)
- 10/10 Visual Contrast Polish across all customer pages
- **Full E2E Dry Run — 42/42 endpoints PASS** (April 3, 2026)
- **Pre-Pilot Cleanup** (April 3, 2026):
  - Purged 149 test leads (TEST_, Load Test, Dry Run)
  - Fixed stale RM name (Ravi Sharma → Vikram Reddy)
  - RM capacity restored (30 → 7/25)
  - Post-cleanup regression: 8/8 PASS

## Pilot Readiness
- **Internal Dry Run**: GO
- **Friendly Customer Pilot**: GO (email/password auth, test-mode payments)
- **Small Live Pilot**: CONDITIONAL GO (needs Razorpay prod keys + Google OAuth config)

## Blocked on User Configuration
- Google OAuth: Add production redirect URIs in GCP Console
- Razorpay: Set production RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend .env

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Backlog
- P1: Phase 2 — Quick Preview modal, Recently Viewed Venues
- P2: Phase 3 — Refactor LandingPage.js, VenuePublicPage.js
- P2: Facebook Login
- P2: Vendor Payout Module
- P2: SEO meta tags, Open Graph, structured data
