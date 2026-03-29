# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR. Marketplace connecting event planners with curated venues. Internal team operations and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Custom Google OAuth (VenuLoQ GCP), Razorpay (test mode), VAPID Push Notifications

## Architecture
- Customer App (`App.js`) + Team Portal (`TeamApp.js`) from single codebase
- Hostname-based routing in `index.js`
- Mobile-first app shell with bottom tab navigation
- Capacitor iOS wrapper for native app distribution

## Domain Configuration
- **Brand domain**: venuloq.com
- **Customer app (prod)**: delhi.venuloq.com
- **Customer app (test)**: testing.delhi.venuloq.com
- **Internal portal**: teams.venuloq.com

## What's Been Implemented

### Auth Restructure & Custom Google OAuth (March 29, 2026)
- **Email OTP as primary auth**: AuthPage rewritten — "Continue with Email" is the primary gold CTA
- **Google Auth demoted to secondary**: Below "or" divider, smaller button, less visual weight
- **Password login as tertiary**: "Sign in with password instead" link at bottom
- **Custom Google OAuth infrastructure**: Backend routes at `/api/auth/google/config`, `/api/auth/google/auth-url`, `/api/auth/google/callback` — reads from `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- **Domain-agnostic code**: Uses `window.location.origin` for redirects, works on any domain
- **Graceful fallback**: Falls back to Emergent Auth when custom credentials not configured
- **GoogleAuthCallback page**: Handles `/auth/google` callback, exchanges code with backend
- **RegisterPage**: Now redirects to unified `/auth` page
- **Testing**: 100% pass — 24/24 tests (iteration_129)

### Mobile UX Refinements (March 29, 2026)
- **BottomTabBar notification badge**: Unread count on "Requests" tab, polls every 30s
- **Push notification prompt**: Contextual banner on customer dashboard — "Get instant updates" with Enable/Dismiss
- **Last activity timestamps**: Enquiry cards show "Enquiry submitted 1w ago" from enriched API
- **Activity feed endpoint**: `GET /api/my-enquiries/{lead_id}/activity` returns customer-visible updates
- **Testing**: 100% pass — 24/24 tests (iteration_129)

### iPhone App Conversion — Second Refinement Pass (March 28, 2026)
- Slimmer Tab Bar (50px), duplicate CTA removed, tighter spacing, RM flow polish
- Testing: 100% pass — 17/17 tests (iteration_127)

### iPhone App Conversion — First Pass (March 28, 2026)
- Bottom Tab Bar, compact headers, Footer hidden on mobile
- Testing: 100% pass — 17/17 tests (iteration_126)

### Capacitor iOS Wrapper (March 28, 2026)
- Capacitor v7 initialized, app icons, splash screens, Info.plist configured
- IOS_BUILD_GUIDE.md created for Xcode compilation
- Native bridge for haptics and status bar

### Phase 2: Customer Interface (March 25, 2026)
- My Bookings, My Reviews, Payments, Invoices pages, Personalized recommendations
- Testing: 100% pass (iteration_125)

## Test Credentials
- Admin: admin@venulock.in / admin123
- Customer: democustomer@venulock.in / password123

## Google OAuth Setup (Pending User Action)
- **Status**: Infrastructure complete, credentials not yet injected
- **User action needed**: Create VenuLoQ GCP project, set up OAuth consent screen, inject GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET into backend .env
- **Production**: delhi.venuloq.com (JavaScript origin + redirect URI: /auth/google)
- **Testing**: testing.delhi.venuloq.com (JavaScript origin + redirect URI: /auth/google)
- Google branding will show "VenuLoQ" after consent screen verification and publishing

## Upcoming Tasks
- P0: User injects Google OAuth credentials → Google login shows "VenuLoQ" branding
- P1: Push notification triggers for more business events (quote received, site visit scheduled)
- P1: Enhanced post-submission journey (confirmation page, WhatsApp deep link)
- P1: Booking status visibility improvements (timeline detail, RM contact card)

## Future Tasks
- Full vendor payout module
- "List Your Venue" partner landing page
- Production Razorpay integration
- SMS notifications via Twilio
- SEO meta tags, Open Graph, JSON-LD structured data
