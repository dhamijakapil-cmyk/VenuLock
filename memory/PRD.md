# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR. Marketplace connecting event planners with curated venues.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Custom Google OAuth, Apple Sign In, Razorpay (test mode), VAPID Push Notifications
- **Native**: Capacitor v7 (iOS wrapper)

## Architecture
- Customer App + Team Portal from single codebase (hostname-based routing)
- **Two deployments**: PWA (web) + iOS App (Capacitor)
- Platform detection: `isCapacitor()` for iOS-only features

## Domain Configuration
- **Brand**: venuloq.com
- **Customer (prod)**: delhi.venuloq.com
- **Customer (test)**: testing.delhi.venuloq.com
- **Internal portal**: teams.venuloq.com

## Auth Configuration
| Platform | Auth Order |
|----------|-----------|
| PWA | Google → Email/OTP → Password |
| iOS App | Google → Apple → Email/OTP → Password |

## What's Been Implemented

### Auth Hardening — Launch Ready (March 29, 2026)
- **401 response interceptor**: Auto-logout on expired tokens via `venuloq:session-expired` event
- **Visibility change listener**: Rechecks auth when app regains focus (returning users, waking from background)
- **OAuth callback timeout + retry**: All 3 callback pages (Google/Apple/Emergent) have 20s timeout with "Try Again" error UI
- **Session skip during callbacks**: Auth check skips during OAuth redirect flows to prevent race conditions
- **Testing**: 100% pass — 28/28 tests (iteration_131)

### Post-Submission Journey Polish (March 29, 2026)
- **"What Happens Next" timeline**: 4-step visual timeline in success screen (Callback → Shortlist → Site Visit → Negotiation)
- **Improved RM contact card**: Shows selected/assigned expert with photo, name, rating
- **Better WhatsApp deep link**: Uses RM's phone number if available, pre-filled personalized message with booking reference
- **Booking reference prominent**: Styled in monospace gold in a glass-morphism pill
- **Testing**: Verified in code review and component tests

### Push Notification Milestones (March 29, 2026)
- **New triggers added**:
  - Quote received → In-app notification + push ("VenuLoQ — Quote Received")
  - Venue shortlisted → In-app + push ("VenuLoQ — New Venue Option")
  - RM assigned/changed → In-app + push ("VenuLoQ — Expert Assigned")
- **Existing triggers preserved**: contacted, site_visit, negotiation, booking_confirmed
- **Improved stage messages**: More personal, reassuring copy

### Apple Sign In (March 29, 2026)
- Full OAuth infrastructure: JWT client_secret (ES256), id_token verification
- Platform-conditional: Only renders inside Capacitor iOS app
- Backend: `/api/auth/apple/config`, `/auth-url`, `/callback`

### Custom Google OAuth (March 29, 2026)
- Backend: `/api/auth/google/config`, `/auth-url`, `/callback`
- Domain-agnostic, falls back to Emergent Auth

### Earlier Work
- Mobile-native UI conversion (Bottom Tab Bar, compact headers, safe areas)
- Capacitor iOS wrapper (icons, splash, Info.plist, native bridge)
- Customer Portal Phase 2 (Bookings, Reviews, Payments, Invoices, Recommendations)
- Full platform rebranding (VenuLock → VenuLoQ)

## Test Credentials
- Customer: democustomer@venulock.in / password123
- Admin: admin@venulock.in / admin123

## Pending User Actions
- Inject `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` into backend .env
- Inject `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` into backend .env
- Configure delhi.venuloq.com domain
- Add "Sign in with Apple" capability in Xcode

## Upcoming Tasks
- P1: Facebook Login (secondary, deferred from V1 launch)
- P1: Production domain setup and deployment

## Future Tasks (NOT for now)
- Vendor payout module
- "List Your Venue" partner landing page
- Production Razorpay
- SMS notifications
- SEO meta tags
