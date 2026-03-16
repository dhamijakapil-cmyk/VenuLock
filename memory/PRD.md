# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India.

## Core Requirements
- Premium, cohesive visual identity (colors: #0B0B0D black, #F4F1EC white, #D4B36A gold)
- Mobile-first, dense and scannable venue search experience
- Advanced filtering (city, event type, venue type, price, capacity, amenities)
- Compare Venues feature (up to 3 side-by-side)
- Quick Preview modal for venue details without leaving search
- Recently Viewed venues section
- Infinite scroll performance optimization
- Auth: Email/password + Google OAuth (Emergent-managed)
- Lead management: Enquiry creation and tracking
- Admin/RM dashboards

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)
- **Fonts**: DM Sans (body), JetBrains Mono (numbers), Cormorant Garamond (logo)

## What's Been Implemented

### Phase 1: Complete (UX Polish & Bug Fixes)
- Full platform rebranding (VenuLock -> VenuLoQ)
- Premium landing page with interactive carousel, splash screen, serif logo
- Mobile search page: horizontal card layout, glass-morphism header, HD images (79 venues)
- Filter system: Sort, Venue Type multi-select, full FilterBottomSheet
- All login flows working (Admin, RM, Customer)
- "Made with Emergent" watermark removed from index.html

### Phase 2: Complete (High-Value Features + Performance)
- **Card Declutter**: Heart-only on image (outline style), removed share/eye icon clutter
- **"Preview" text link**: Subtle underlined text at bottom of each card triggers Quick Preview
- **Quick Preview Modal**: Rich bottom sheet with image carousel, amenities, price, "View Details" CTA
- **Compare Venues**: Select up to 3 venues, floating bar with name chips, full comparison sheet
- **Recently Viewed**: Horizontal scroll of 150px thumbnail cards, localStorage-based tracking
- **Infinite Scroll**: 20 venues per batch with "Show more venues (N remaining)" button
- **Dynamic Header**: "Curated Venues · N across 9 cities" with context-aware city filtering
- **Visual Hierarchy**: Gold divider between FEATURED and ALL VENUES sections

### Deployment Fixes
- JWT secret extended to 39 bytes (was 23, below 32-byte minimum)
- Startup migration moved to asyncio background task (was blocking 20-60s against Atlas)
- Scheduler wrapped in try/except (was crashing server on failure)
- SENDER_EMAIL properly quoted in .env

### Key Components
- `VenueSearchPage.js` - Main search page with all state management
- `MobileVenueCard.js` - Premium horizontal card with Preview + Compare
- `MobileQuickPreview.js` - Rich bottom sheet preview modal
- `CompareSheet.js` - Full-screen side-by-side venue comparison
- `FilterBottomSheet.jsx` - Comprehensive mobile filter interface
- `RecentlyViewedVenues.js` - localStorage-based recently viewed strip (150px thumbnails)
- `LandingPage.js` - Premium hero, venue showcase carousel
- `SplashScreen.js` - One-time animated splash

## Test Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Upcoming Tasks (P1)
- Password reset flow
- Post-deployment auth flow testing on production URL

## Future/Backlog (P2-P4)
- Refactor monolithic components (LandingPage, VenuePublicPage)
- Facebook & X OAuth integration
- "List Your Venue" partner page
- SEO meta tags, Open Graph, JSON-LD structured data
- Razorpay production setup
- SMS/WhatsApp integration (Twilio)
- Lazy image loading optimization
- Search autocomplete with text indexes
