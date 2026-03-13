# VenuLoQ - Product Requirements Document

## Overview
VenuLoQ is a full-stack venue booking marketplace (React/FastAPI/MongoDB) for premium event venues in India. Features managed bookings with dedicated Relationship Managers.

## Brand Identity
- **Colors**: `#0B0B0D` (black), `#F4F1EC` (white), `#D4B36A` (gold)
- **Typography**: Cormorant Garamond (logo), system fonts (body)
- **Logo**: Premium serif treatment via PremiumLogo.js

## Core Architecture
```
Frontend: React + Tailwind + Shadcn/UI (port 3000)
Backend: FastAPI + MongoDB (port 8001)
Auth: JWT + Emergent Google OAuth
Payments: Razorpay (test mode)
```

## Completed Features

### Phase 1: Platform Rebranding & UX Polish (DONE)
- Full rebrand from VenuLock to VenuLoQ
- Landing page: hero, venue carousel, splash screen, search card
- Mobile search: horizontal cards, quick filters, Top Pick badges, list/map toggle
- Concierge intake: 4-step form (removed budget step), RM profile bottom sheets
- All login flows (Admin, RM, Customer) functional
- Platform-wide consistent styling

### Image Handling (March 2026)
- All image components handle both string and object `{url: "..."}` formats
- Fixed across: MobileVenueCard, VenueCard, LandingPage, VenueComparisonSheet, VenueMap

### Offline/Mock Data Fallback (March 2026)
- Mock venues have proper `city_slug`, `slug` fields for routing
- VenuePublicPage, CityVenuesPage, CityHubPage all fall back to mock data when backend is unreachable
- Demo banner hidden when venues are loaded

### Map View Toggle Fix (March 2026)
- View toggle pinned outside scrollable filter container

### Venue Card Click (March 2026)
- Entire card clickable on landing page (not just CTA button)

## Upcoming Tasks
- P1: Quick Preview modal, Recently Viewed Venues, FilterBottomSheet
- P2: Refactor LandingPage.js and VenuePublicPage.js
- P2: Standardize API responses/error handling
- Partner landing page, SEO, Razorpay production, automated payouts, SMS notifications

## Key Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Project Health
- Broken: None
- Mocked: Razorpay (test mode)
- Deployment: Passed health check, ready for production
