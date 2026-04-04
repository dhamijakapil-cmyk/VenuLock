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
- **PWA update**: 3-layer defense (localStorage handshake + SW lifecycle + version.json poll)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 4, 2026 — PWA Stale-Build Fix v2 (Revised)

**Problem**: Previous fix had the stamp working for `sw.js` but CRA's minifier changed single quotes to double quotes in `index.html`, causing the stamp to silently fail. Additionally, the fix relied solely on SW lifecycle events, which don't reliably fire in iOS standalone mode. The OLD installed SW on user devices predated all changes, creating a bootstrapping problem.

**Root causes addressed**:
1. Stamp pattern mismatch (quotes) — fixed to use bare string replacement
2. Old SW on device has no update detection code — fixed with SW-level client.navigate() on activation
3. iOS standalone doesn't reliably fire controllerchange — fixed with localStorage version handshake (Layer 1)
4. Deploy while app is open not caught — fixed with version.json polling (Layer 3)

**Three-layer defense implemented**:
- **Layer 1 (localStorage handshake)**: Runs before anything else. Compares embedded build stamp with stored version. On mismatch: clears all caches, unregisters all SWs, hard reloads. Breaks the bootstrapping deadlock.
- **Layer 2 (SW lifecycle)**: Standard registration with updatefound/controllerchange. Auto-applies updates (skipWaiting immediately, no banner). New SW force-navigates all clients on activation.
- **Layer 3 (version.json poll)**: Every 30 seconds, fetches `/version.json?_=timestamp` (cache-busted). On version mismatch: clears caches, reloads. Catches mid-session deploys.

**Debug indicator**: Tiny `v.{stamp}` pill in top-right corner (production only). Allows user to visually verify which build is running.

**Files changed**: `public/sw.js`, `public/index.html`, `scripts/stamp-sw.js`, `package.json`

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
