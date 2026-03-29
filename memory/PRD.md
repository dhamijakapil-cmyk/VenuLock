# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR. Marketplace connecting event planners with curated venues. Internal team operations and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Custom Google OAuth (VenuLoQ GCP), Apple Sign In, Razorpay (test mode), VAPID Push Notifications
- **Native**: Capacitor v7 (iOS wrapper)

## Architecture
- Customer App (`App.js`) + Team Portal (`TeamApp.js`) from single codebase
- Hostname-based routing in `index.js`
- Mobile-first app shell with bottom tab navigation
- **Two deployments from same codebase**: PWA (web) + iOS App (Capacitor)
- Platform detection via `isCapacitor()` for iOS-only features (e.g., Apple Sign In)

## Domain Configuration
- **Brand domain**: venuloq.com
- **Customer app (prod)**: delhi.venuloq.com
- **Customer app (test)**: testing.delhi.venuloq.com
- **Internal portal**: teams.venuloq.com

## Auth Configuration
| Platform | Auth Order |
|----------|-----------|
| PWA (Web) | Google → Email/OTP → Password |
| iOS App | Google → Apple → Email/OTP → Password |

Apple Sign In only appears inside Capacitor native shell (Apple App Store requirement).

## What's Been Implemented

### Sign in with Apple + Auth Restructure (March 29, 2026)
- **Apple Sign In infrastructure**: Full OAuth flow — JWT client_secret (ES256), id_token verification via Apple public keys
- **Platform-conditional rendering**: Apple button only on iOS (Capacitor), hidden on PWA
- **Auth order**: Google (primary) → Apple (iOS only) → Email/OTP → Password (tertiary)
- **Backend routes**: `/api/auth/apple/config`, `/auth-url`, `/callback`
- **Separate deployment guide**: Updated `IOS_BUILD_GUIDE.md` with Remote vs Local build modes
- **Testing**: 100% pass — 25/25 tests (iteration_130)

### Custom Google OAuth Infrastructure (March 29, 2026)
- Backend routes: `/api/auth/google/config`, `/auth-url`, `/callback`
- Domain-agnostic code using `window.location.origin`
- Graceful fallback to Emergent Auth when credentials not configured
- **Testing**: 100% pass (iteration_129)

### Email OTP as Primary Auth (March 29, 2026)
- AuthPage rewritten with multi-step flow (main → email-entry → otp)
- RegisterPage redirects to unified /auth
- **Testing**: 100% pass (iteration_128, 129)

### Mobile UX Refinements (March 29, 2026)
- BottomTabBar notification badge (polls /api/notifications every 30s)
- Push notification permission prompt on customer dashboard
- Last activity timestamps on enquiry cards
- Activity feed endpoint: `GET /api/my-enquiries/{lead_id}/activity`

### Earlier Work (March 25-28, 2026)
- Full platform rebranding (VenuLock → VenuLoQ)
- Landing page overhaul with premium carousel
- Mobile search page redesign (horizontal cards)
- Customer Portal Phase 2 (Bookings, Reviews, Payments, Invoices)
- Personalized venue recommendations
- iPhone app conversion (Bottom Tab Bar, compact headers, safe areas)
- Capacitor iOS wrapper with icons, splash, native bridge

## Test Credentials
- Admin: admin@venulock.in / admin123
- Customer: democustomer@venulock.in / password123

## Pending User Actions
- **Google OAuth**: Inject `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into backend .env
- **Apple Sign In**: Inject `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` into backend .env
- **Domain setup**: Configure delhi.venuloq.com and testing.delhi.venuloq.com

## Upcoming Tasks
- P1: Facebook Login (secondary, under "More ways to sign in" — deferred until core launch path complete)
- P1: Push notification triggers for more business events
- P1: Post-submission journey polish (confirmation page, WhatsApp deep link)
- P1: Booking status visibility improvements

## Future Tasks
- Full vendor payout module
- "List Your Venue" partner landing page
- Production Razorpay integration
- SMS notifications via Twilio
- SEO meta tags, Open Graph, JSON-LD
