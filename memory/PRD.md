# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR. Marketplace connecting event planners with curated venues. Internal team operations and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
- Customer App (`App.js`) + Team Portal (`TeamApp.js`) from single codebase
- Hostname-based routing in `index.js`
- Mobile-first app shell with bottom tab navigation

## What's Been Implemented

### iPhone App Conversion — Second Refinement Pass (March 28, 2026)
- **Slimmer Tab Bar**: Reduced from 56px → 50px with 18px icons and 8px labels
- **Duplicate CTA Removed**: Venue detail CTA sidebar hidden on mobile (sticky CTA is sole action point)
- **Tighter Spacing**: Hero pt-6→pt-4, search filter gap-2.5→2, sticky CTA py-3→py-2.5, results header compact
- **RM Flow Polish**: Compact pill stepper (w-4 h-4), strong auto-assign button (Zap icon + border), tighter RM cards (p-3), smaller phone verify icon (w-12), compact success header (w-12 checkmark)
- **Chat Button**: Precise positioning at calc(62px + safe-area) above tab bar
- **Accessibility**: Added DialogTitle to all modal dialogs
- **Testing**: 100% pass - 17/17 tests (iteration_127)

### iPhone App Conversion — First Pass (March 28, 2026)
- Bottom Tab Bar (Home, Explore, Saved, Requests, Profile), hidden on venue detail
- Compact mobile headers (48px), Footer hidden on mobile
- Landing page stripped of web-only sections, chat button repositioned
- Testing: 100% pass - 17/17 tests (iteration_126)

### Phase 2: Customer Interface (March 25, 2026)
- My Bookings, My Reviews, Payments, Invoices pages, Personalized recommendations
- Testing: 100% pass (iteration_125)

### Phase 1: Customer Interface (March 25, 2026)
- Enhanced Profile Page with event preferences, redesigned dashboard

## Test Credentials
- Admin: admin@venulock.in / admin123
- Customer: democustomer@venulock.in / password123

## Upcoming Tasks
- P1: Explore/listing screen native refinements (search bar behavior, card interactions)
- P1: My Requests page enhancement (status tracker, WhatsApp action)
- P2: Push notifications for booking status updates

## Future Tasks
- Full vendor payout module
- "List Your Venue" partner landing page
- Production Razorpay integration
- Refactor monolithic components
- SMS/WhatsApp notifications
