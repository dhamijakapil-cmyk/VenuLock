# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Custom Google OAuth, Apple Sign In, Razorpay (test mode), VAPID Push
- **Native**: Capacitor v7 (iOS wrapper)

## Architecture
- Customer App + Team Portal — single codebase, hostname-based routing
- Two deployments: PWA (web) + iOS App (Capacitor)
- Platform detection: `isCapacitor()` for iOS-only features
- Single-source contact config: `config/contact.js` → `REACT_APP_SUPPORT_PHONE`

## Domain Configuration
- **Brand**: venuloq.com | **Customer (prod)**: delhi.venuloq.com | **Test**: testing.delhi.venuloq.com | **Internal**: teams.venuloq.com

## Auth Configuration
| Platform | Order |
|----------|-------|
| PWA | Google → Email/OTP → Password |
| iOS App | Google → Apple → Email/OTP → Password |

## Current Status: Code-Complete, Pending External Dependencies

### What Is Fully Complete (Code-Verified)
- Auth hardened: 401 interceptor, visibility recheck, 20s timeout+retry on all callbacks
- Google OAuth: Full infrastructure, domain-agnostic, reads from env vars
- Apple Sign In: Full infrastructure, iOS-only via isCapacitor(), reads from env vars
- Email OTP: Primary auth on web, working with Resend
- Post-submission: "What Happens Next" 4-step timeline, RM card, WhatsApp deep link
- Push notifications: Quote received, venue shortlisted, RM assigned, all stage changes
- WhatsApp centralized: All 11 references → single config/contact.js → REACT_APP_SUPPORT_PHONE
- Domain audit: Zero hardcoded URLs, all redirects use window.location.origin
- Code is production-ready for delhi.venuloq.com without code changes

### QA Results (March 29, 2026)
- iteration_128: 24/24 PASS (auth restructure)
- iteration_129: 24/24 PASS (custom Google OAuth)
- iteration_130: 25/25 PASS (Apple Sign In)
- iteration_131: 28/28 PASS (auth hardening + journey polish)
- iteration_132: 28/28 PASS (WhatsApp centralization + final QA)
- iteration_133: 16/16 PASS (landing page hero fix, concierge boxes, compare modal)
- iteration_134: 9/9 PASS (search page filter consolidation)

### UI Fixes Applied (March 30, 2026)
- Landing page hero heading safe-area padding fix (visible on iPhone notch)
- Concierge service boxes equal height (h-full on Reveal + inner div)
- Compare feature converted from full-page to popup modal overlay
- Search page filters consolidated: Sort/Type/Filters/Guest chips in single header row
- Vibe/Style filter moved into FilterBottomSheet

### Pending External Dependencies
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` → backend env
- [ ] `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` → backend env
- [ ] `REACT_APP_SUPPORT_PHONE` → real VenuLoQ number (currently placeholder 919876543210)
- [ ] `REACT_APP_BACKEND_URL` → update to production domain
- [ ] Domain DNS: delhi.venuloq.com → production server
- [ ] Xcode: Add "Sign in with Apple" capability
- [ ] Google OAuth consent screen verification/publishing

## Test Credentials
- Customer: democustomer@venulock.in / password123
- Admin: admin@venulock.in / admin123

## Key Documents
- `frontend/PRELAUNCH_QA_CHECKLIST.md` — Device testing checklist
- `frontend/IOS_BUILD_GUIDE.md` — Xcode/TestFlight build guide

## Do NOT Start
- Facebook Login, Vendor payouts, "List Your Venue", SEO, Production Razorpay
