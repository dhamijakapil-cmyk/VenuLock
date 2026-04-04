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
- **App Icon**: Version C — unified gold pin silhouette with circular void on black

## Pilot Readiness Status
- **System state**: PILOT READY
- **Security**: /api/team/* locked with TEAM_ALLOWED_ROLES whitelist
- **Data state**: Clean (0 active leads, 0 test artifacts)
- **PWA update**: 3-layer defense active (debug pill removed, mechanism intact)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 4, 2026 — App Icon Refinement (Version C deployed)
- Generated 3 icon variations: A (clean arch+ring), B (minimal arch+dot), C (unified pin+void)
- User selected Version C — strongest silhouette, best 60px readability
- Exported to all 17 PWA icon sizes (16px to 1024px)
- Files replaced: icon-*.png, apple-touch-icon.png, icon-maskable-*.png, venuloq-icon-*.png

### April 4, 2026 — Debug Build Pill Removed
- Removed visible #build-pill and showDebugPanel() from public/index.html
- PWA Layers 1-3 remain fully intact and verified

### April 4, 2026 — Landing Screen Premiumization Pass
- 17 surgical CSS/spacing refinements to LandingPage.js
- Hero opacity 0.55→0.30, scrim strengthened, header elevated
- CTA glow animation removed, venue strip shadows halved

### April 4, 2026 — PWA Stamp Fix v3 (yarn start compatible)
- stamp-dev.js pre-start script generates stamp on every restart
- Verified on physical iPhone Home Screen across 2 consecutive deploys

### April 4, 2026 — Security Fix + Dry Run + Cleanup
- Team route leakage fixed, dry run passed, test artifacts purged

## Backlog (FROZEN)
All feature work, production cutovers, and backlog items remain frozen per user instruction.
