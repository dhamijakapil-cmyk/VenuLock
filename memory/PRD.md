# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" / "concierge" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India. Transform the experience to feel exclusive, aspirational, and effortless.

## Core Requirements
- Premium, cohesive visual identity (colors: #0B0B0D black, #F4F1EC white, #E2C06E bright gold, #D4B36A accent gold)
- Mobile-first, dense and scannable venue search experience
- Advanced filtering (city, event type, venue type, price, capacity, amenities)
- Compare Venues feature (up to 3 side-by-side)
- Quick Preview modal for venue details without leaving search
- Recently Viewed venues section
- Simple Favourites system (replaced Collections)
- PWA support with install prompt
- Concierge service experience integrated into booking flow
- Cinematic splash screen with 3D-style animated logo
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
- Mobile search page redesign: vertical cards with virtual tour, glass-morphism header
- Filter system: Sort, Venue Type multi-select, full FilterBottomSheet
- All login flows working (Admin, RM, Customer)

### Phase 2: Complete (High-Value Features + Performance)
- Card Declutter: Heart-only on image, removed share/eye clutter
- Quick Preview Modal: Rich bottom sheet with image carousel, amenities, price
- Compare Venues: Select up to 3, floating bar, full comparison sheet
- Recently Viewed: 150px thumbnail cards, localStorage-based
- Infinite Scroll: 20 venues per batch with "Show more venues" button
- Dynamic Header: "Curated Venues - N across 9 cities"
- Visual Hierarchy: Gold divider between FEATURED and ALL VENUES

### Phase 3: Complete (Collections -> Favourites Simplification)
- Removed Collections feature from frontend UI
- Implemented simple Favourites system with FavoritesContext
- Heart icon toggle adds/removes from favourites directly
- Backend /api/favorites endpoints (GET, POST, DELETE, merge)

### Visual & Concierge Enhancements (Complete)
- Crossfading Hero Slideshow: 5 images with Ken Burns zoom effect
- Brightness Pass: Luminous gold (#E2C06E), warmer ambient glows
- Elite Event Photos: Top venue images replaced with aspirational event photography
- Vertical Card Redesign: Full-width hero images with virtual tour (auto-cycling)
- PWA Setup: Branded icons, service worker, install prompt
- Concierge Modal: 12-service checklist with animated checkmarks, integrated into booking flow
- Cinematic Splash Screen: 3D metallic logo with letter reveals, light rings, particles

### Logged-In UI Overhaul (Complete - March 19, 2026)
- **Landing Page Mobile Header**: Shows "Welcome, [name]" in gold when logged in, "Sign In" when not
- **Landing Page Hamburger Menu**: Authenticated menu shows user info (avatar + name + email), Browse Venues, My Favourites, My Enquiries, Profile, and Sign Out. Non-authenticated shows Browse Venues + Get Started CTA
- **Search Page Mobile Header**: Shows user avatar when logged in
- **Favourites Tab**: Clickable tab on both Landing and Search pages (only when user has favorites), navigates to /favorites
- **Shared Header.js**: Desktop/shared header correctly shows Welcome message, Profile dropdown, and Favourites link
- **Bug Fix**: Fixed LandingPage.js useAuth() destructuring (was missing `user` and `logout`)

### Key Components
- `LandingPage.js` — Landing page with custom mobile header (separate from shared Header.js)
- `VenueSearchPage.js` — Main search page with all state management
- `MobileVenueCard.js` — Premium vertical card with heart, Preview, Compare
- `MobileQuickPreview.js` — Rich bottom sheet preview modal
- `ConciergeModal.js` — 12-service concierge experience
- `EnquiryForm.js` — Booking flow with concierge intro step
- `CompareSheet.js` — Side-by-side venue comparison
- `FilterBottomSheet.jsx` — Comprehensive mobile filter interface
- `RecentlyViewedVenues.js` — localStorage-based recently viewed strip
- `SplashScreen.js` — Cinematic animated splash screen
- `InstallPrompt.js` — PWA install banner
- `Header.js` — Shared header for non-landing pages
- `FavoritesContext.js` — Favourites state management with API + localStorage

## DB Schema
- **venues**: `{ venue_id, name, slug, city, city_slug, images, capacity_min, capacity_max, pricing, amenities, rating, ... }`
- **users**: `{ user_id, email, password_hash, name, role, ... }`
- **favorites**: `{ user_id, venue_ids[] }`
- **collections**: `{ collection_id, user_id, name, venue_ids[], share_token, is_public }` (DEPRECATED - frontend removed)
- **enquiries**: `{ customer_name, customer_email, venue_id, ... }`

## Test Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Known Issues
- LandingPage.js has its own custom mobile header (not using shared Header.js) - works correctly but is a refactoring candidate
- Razorpay is in test mode
- Facebook & X OAuth buttons show "Coming Soon"

## Upcoming Tasks (P1)
- PWA Push Notifications for enquiry status updates
- Database cleanup: Remove deprecated `collections` routes and DB collection

## Future/Backlog (P2-P4)
- Refactor monolithic LandingPage.js to use shared Header.js
- Refactor VenuePublicPage.js into smaller components
- Smart Discovery Engine ("If you like these venues...")
- Password reset functionality
- SMS/WhatsApp integration (Twilio)
- Facebook & X OAuth integration
- "List Your Venue" partner landing page
- SEO meta tags, Open Graph, JSON-LD structured data
- Razorpay production setup
- Performance optimization (DB query tuning, text indexes)
