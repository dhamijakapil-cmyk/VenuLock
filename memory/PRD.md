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

## Domain Configuration
- **Brand**: venuloq.com | **Customer (prod)**: delhi.venuloq.com | **Test**: testing.delhi.venuloq.com | **Internal**: teams.venuloq.com

## Auth Configuration
| Platform | Order |
|----------|-------|
| PWA | Google → Email/OTP → Password |
| iOS App | Google → Apple → Email/OTP → Password |

## Current Status: Launch-Readiness Validation Complete

### Code-Complete Features
- Auth hardened: 401 interceptor, visibility recheck, 20s timeout+retry on all callbacks
- Post-submission journey: "What Happens Next" 4-step timeline, improved WhatsApp deep link with RM phone
- Push notification milestones: quote received, venue shortlisted, RM assigned, stage changes
- Apple Sign In: Full OAuth infrastructure (iOS only)
- Custom Google OAuth: Full infrastructure (domain-agnostic)
- Domain audit: Zero hardcoded production URLs, all redirects use window.location.origin

### QA Results (March 29, 2026)
- Backend: 11/11 endpoint checks PASS
- Frontend: 8/8 visual + interaction checks PASS
- Testing Agent: 28/28 automated tests PASS (iteration_131)
- Domain audit: Clean — no hardcoded preview URLs in production paths
- Placeholder WhatsApp numbers flagged for replacement

### Pending External Dependencies
- [ ] Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Apple Sign In credentials (`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`)
- [ ] Domain DNS: delhi.venuloq.com → production server
- [ ] Xcode: Add "Sign in with Apple" capability
- [ ] Replace placeholder WhatsApp numbers (919999999999, 919876543210)
- [ ] Google OAuth consent screen verification/publishing

## Test Credentials
- Customer: democustomer@venulock.in / password123
- Admin: admin@venulock.in / admin123

## Documents
- `/app/frontend/PRELAUNCH_QA_CHECKLIST.md` — Full pre-launch testing checklist
- `/app/frontend/IOS_BUILD_GUIDE.md` — Xcode/TestFlight build instructions

## Future Tasks (NOT for now)
- Facebook Login (secondary)
- Vendor payout module
- "List Your Venue" page
- Production Razorpay
- SMS notifications
- SEO meta tags
