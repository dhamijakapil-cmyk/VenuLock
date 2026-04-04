# VenuLoQ - Premium Venue Booking Platform

## Product Vision
A premium hospitality-tech marketplace that connects customers with curated event venues through a concierge-style booking experience.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB (DB: test_database)
- **Auth**: JWT + Emergent-managed Google OAuth
- **Payments**: Razorpay (Test Mode)

## Design System (Updated April 4, 2026)
- **Base background**: #F6F4F0 (warm ivory / soft stone)
- **Card surfaces**: white with border-[#1A1A1A]/[0.06]
- **Text primary**: #1A1A1A (deep charcoal)
- **Premium accent**: #C4A76C (muted champagne)
- **Dark anchor**: #1A1A1A (used sparingly for CTAs, avatars)
- **Headings**: Cormorant Garamond (serif)
- **Body**: DM Sans (sans-serif)
- **Removed**: shimmer effects, gold gradients/glows, blurred backgrounds, glassmorphism

## Pilot Readiness Status
- **System state**: FRESH START (test leads from debugging)
- **Pilot domains**: testing.delhi.venuloq.com (customer) / teams.venuloq.com (internal)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 4, 2026 — Premium Visual Refinement Pass
**Scope**: CustomerHome.js, CustomerCaseDetail.js, LandingPage.js (mobile), plus palette alignment across all customer-facing components.

**Changes made**:
- CustomerHome: Removed blurry background + shimmer effects. Black header → warm product header. Dark case card → clean white card with gold accent bar. Clean action pills, structured Explore CTA.
- CustomerCaseDetail: Dark event hero → clean white card with gold accent bar. Progress bar gold glow removed. All section surfaces brightened. Assistance buttons refined. RM card cleaned.
- LandingPage: Muted gold across hero, carousel, and all sections. Shimmer CTA button → solid charcoal. Consistent warm palette.
- Palette across all customer files: #0B0B0D→#1A1A1A, #D4B36A→#C4A76C, #EDE9E1→#F6F4F0
- Components updated: BottomTabBar, Header, EnquiryForm, VenuePublicPage, VenueShowcase, SplashScreen, PremiumLogo, index.css

**100% regression pass** — 11/11 customer flows verified.

### April 3, 2026
- P0 Bug Fix: Customer Portal Empty After Enquiry (customer_id vs customer_user_id)
- UI Polish: Bottom Tab Bar (filled icons, gold indicator)
- UI Polish: Messages Empty State (RM card, quick chips)
- Bug Fix: Chat Compose Bar (WhatsApp-style viewport handling)
- Mobile Fit: Case Detail (tightened spacing)
- Profile Redesign: Facebook-style cover photo

### Earlier Sessions
- Full Platform Rebranding (VenuLock → VenuLoQ)
- Landing Page Overhaul (carousel, splash screen, premium logo)
- 10/10 Visual Contrast Polish, RM Dashboard bug fix
- E2E Dry Run (42/42), Pre-pilot reset (141 leads archived)
- Google OAuth routing, Profile photo upload

## Scope Held Back
- Internal/team pages (admin, RM, field dashboards) — different domain, not customer-facing
- VenuePublicPage.js — palette aligned via sed but no structural visual changes

## Follow-up Worth Doing Later
- AuthPage.js login form card could benefit from the same white-surface treatment
- VenuePublicPage.js gallery and pricing sections could use structural tightening
- PartnerPage.js, ListVenuePage.js could align with new palette if they become customer-visible

## Backlog
- P1: Phase 2 — Quick Preview modal, Recently Viewed Venues, FilterBottomSheet
- P2: Phase 3 — Refactor LandingPage.js, VenuePublicPage.js
- P2: Facebook Login, Production Google OAuth, Vendor Payout Module, SEO
