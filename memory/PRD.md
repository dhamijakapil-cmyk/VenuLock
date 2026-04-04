# VenuLoQ - Premium Venue Booking Platform

## Product Vision
A premium hospitality-tech marketplace that connects customers with curated event venues through a concierge-style booking experience.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB (DB: test_database)
- **Auth**: JWT + Emergent-managed Google OAuth
- **Payments**: Razorpay (Test Mode)

## Design System
- **Base background**: #F6F4F0 (warm ivory / soft stone)
- **Card surfaces**: white with border-[#1A1A1A]/[0.06]
- **Text primary**: #1A1A1A (deep charcoal)
- **Premium accent**: #C4A76C (muted champagne)
- **Headings**: Cormorant Garamond (serif)
- **Body**: DM Sans (sans-serif)

## Pilot Readiness Status
- **System state**: PILOT READY
- **Security**: /api/team/* locked with TEAM_ALLOWED_ROLES whitelist
- **Data state**: Clean (0 active leads, 0 test artifacts)
- **PWA update**: Build-stamped SW + update prompt implemented

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 4, 2026 — PWA Stale-Build Fix (Pilot Stability)
**Root cause**: `sw.js` had static `CACHE_NAME = 'venuloq-v3'` that never changed between deploys. HTML shell was precached. No update detection or prompt existed. iPhone Home Screen app was trapped on stale cached builds.

**Fix (4 files)**:
- `public/sw.js`: Removed HTML from precache, navigation requests are network-first, added `SKIP_WAITING` message listener, version placeholder for build stamping
- `scripts/stamp-sw.js`: Post-build script injects unique timestamp into `build/sw.js`
- `package.json`: Build command now runs stamp script after craco build
- `public/index.html`: SW registration now detects updates (updatefound + controllerchange), shows "New version available / Update" banner, auto-reloads on SW takeover

### April 4, 2026 — Security Fix: Team Route Leakage (P0)
Added `TEAM_ALLOWED_ROLES` whitelist guard to `/api/team/dashboard`, `/announcements`, `/badge-counts`. Customer/venue_owner/event_planner get 403.

### April 4, 2026 — Internal Dry Run + Data Cleanup
Full 7-step pilot flow verified. 3 dry-run artifact leads purged. Environment confirmed clean.

### Earlier Work
- Premium Visual Refinement Pass (ivory/charcoal/gold palette)
- P0 Bug Fix: Customer Portal Empty After Enquiry
- Chat screen WhatsApp-style viewport handling
- Profile redesign, Full Platform Rebranding
- Landing Page Overhaul, Splash Screen, Premium Logo

## Backlog (FROZEN)
- All feature work, production cutovers, and backlog items remain frozen per user instruction.
