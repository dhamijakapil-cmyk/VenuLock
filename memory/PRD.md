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
- **PWA update**: 3-layer defense — FIXED and verified under yarn start runtime

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 4, 2026 — Landing Screen Premiumization Pass

**Objective**: Refine landing screen from "good premium pilot" to "elite premium launch feel."

**17 surgical CSS/spacing changes applied to LandingPage.js:**
- Hero image opacity 0.55→0.30, scrim strengthened (from-75%/via-30%/to-95%)
- Header h-12→h-14, Sign In changed from border pill to gold text
- Headline pt-6→pt-10, mb-2→mb-4 (more breathing room)
- Subtext opacity 80→65, narrower max-width, taller line-height
- Search card surface: 0.96 opacity, lighter shadow, 70% border
- Toggle bg #E8E7E4→#F5F3EE (warmer)
- CTA: removed pulsing glow animation, static shadow, taller py
- Venue strip: pb-8→pb-14, wider card gap, halved shadows, larger text

**Result**: Calmer, richer, more controlled first impression. Content-led, not image-competing.

### April 4, 2026 — PWA Stamp Fix v3 (Final — yarn start compatible)

**Root cause**: Supervisor runs `yarn start` (dev server), not a production build. All previous stamping work targeted `build/` artifacts that are never served.

**Fix**: Modified `package.json` start script to run `scripts/stamp-dev.js` before `craco start`. On every supervisor restart:
1. Generates fresh base-36 timestamp
2. Stamps `public/sw.js` (idempotent regex replace)
3. Writes `public/version.json`
4. Writes `.env.local` with `REACT_APP_BUILD_TS`

**Result**: All 3 PWA defense layers now functional. Build pill shows real stamp. Verified with two consecutive restarts and confirmed by user on physical iPhone Home Screen.

### April 4, 2026 — Security Fix + Dry Run + Cleanup
- Team route leakage fixed (TEAM_ALLOWED_ROLES whitelist)
- 7-step dry run passed
- 3 test artifact leads purged
- Deployment health check: PASS

### Earlier Work
- Premium Visual Refinement Pass (ivory/charcoal/gold palette)
- P0 Bug Fix: Customer Portal Empty After Enquiry
- Chat screen WhatsApp-style viewport handling
- Profile redesign, Full Platform Rebranding
- Landing Page Overhaul, Splash Screen, Premium Logo

## Backlog (FROZEN)
All feature work, production cutovers, and backlog items remain frozen per user instruction.
