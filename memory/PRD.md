# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic. Marketplace connecting event planners with curated venues across Delhi NCR and India. Internal team operations and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
- Customer App (`App.js`) + Team Portal (`TeamApp.js`) from single codebase
- Hostname-based routing in `index.js`

## What's Been Implemented

### Mood Filter Fix + Text Updates (March 28, 2026)
- Enriched vibe tags on 40+ venues across 9 cities — every city now has all 7 mood filters covered
- Landing page: "Across India" → "Across Delhi NCR", "Event Manager" → "Relationship Manager"

### Personalized Venue Recommendations (March 25, 2026)
- "Recommended for You" section on customer dashboard with preference-based scoring
- Backend: GET `/api/auth/recommended-venues`

### Phase 2: Customer Interface (March 25, 2026)
- My Bookings, My Reviews, Payments, Invoices pages
- Backend endpoints for all 4 features
- Testing: 100% pass (iteration_125)

### Phase 1: Customer Interface (March 25, 2026)
- Enhanced Profile Page with event preferences
- Redesigned customer dashboard
- Testing: 100% pass (iteration_123)

### Previous Work
- Splash screen, hostname-based routing, team portal
- Finance/Marketing/Operations dashboards
- Platform rebranding, landing page overhaul

## Test Credentials
- Admin: admin@venulock.in / admin123
- Customer: democustomer@venulock.in / password123

## Upcoming Tasks
- P1: Push notifications for booking status updates
- P2: Review moderation (admin approve/flag)

## Future Tasks
- Full vendor payout module
- "List Your Venue" partner landing page
- Refactor monolithic components
- Production Razorpay integration
- SMS/WhatsApp notifications
