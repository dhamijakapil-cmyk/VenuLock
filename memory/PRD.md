# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India.

## Core Requirements
- Premium, cohesive visual identity (colors: #0B0B0D black, #F4F1EC white, #E2C06E bright gold, #D4B36A accent gold)
- Mobile-first, dense and scannable venue search experience
- Advanced filtering (city, event type, venue type, price, capacity, amenities)
- Compare Venues feature (up to 3 side-by-side)
- Quick Preview modal for venue details without leaving search
- Recently Viewed venues section
- Wishlist Collections — save venues to named collections, share publicly
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
- "Made with Emergent" watermark removed

### Phase 2: Complete (High-Value Features + Performance)
- **Card Declutter**: Heart-only on image (outline), removed share/eye clutter
- **"Preview" text link**: Subtle text at bottom of each card triggers Quick Preview
- **Quick Preview Modal**: Rich bottom sheet with image carousel, amenities, price, "View Details" CTA
- **Compare Venues**: Select up to 3, floating bar with name chips, full comparison sheet
- **Recently Viewed**: 150px thumbnail cards, localStorage-based, appears after visiting venues
- **Infinite Scroll**: 20 venues per batch with "Show more venues" button
- **Dynamic Header**: "Curated Venues · N across 9 cities"
- **Visual Hierarchy**: Gold divider between FEATURED and ALL VENUES

### Phase 3: Complete (Wishlist Collections)
- **Collection Picker Modal**: Heart button opens bottom sheet to save venue to collections
- **Collections CRUD**: Create, rename, delete collections; add/remove venues
- **Collections Page** (`/collections`): Visual grid of user's collections with cover images
- **Collection Detail Page** (`/collections/:id`): Venues in collection with remove, share, public toggle
- **Shared Collections** (`/collections/shared/:token`): Public shareable link, no auth required
- **Header Integration**: FolderHeart icon in desktop nav, "My Collections" in dropdown and mobile menu
- **Backend**: Full REST API at `/api/collections` with auth, sharing, bulk add

### Deployment Fixes
- JWT secret extended to 39 bytes (was 23)
- Startup migration moved to asyncio background task
- Scheduler wrapped in try/except
- SENDER_EMAIL properly quoted

### Visual & Brightness Enhancements (Latest)
- **Crossfading Hero Slideshow**: 5 diverse venue images cycling every 4s with 1.8s fade transition + Ken Burns slow zoom effect
- **Brightness Pass**: Hero image opacity 45%→55%, lightened gradient overlays, warm gold radial glow
- **Gold Luminosity Boost**: Primary gold brightened to `#E2C06E` with glow shadows on all CTA buttons
- **Text Readability**: Nav links 45%→60%, subtitles 70%→80%, stat labels 35%→45%
- **Ambient Glow**: Stats/CTA dark sections now have 2x stronger warm gold radial backgrounds
- **Search Page Refresh**: Warmer banner gradient, brighter sidebar, consistent `#E2C06E` gold across all accents
- **Elite Event Photos**: Top 10 venue images replaced with aspirational event photography (blue-lit ballrooms, candlelit ceremonies, fairy light weddings, outdoor string light dinners, pink-lit stages, oceanside receptions)
- **Vertical Card Redesign**: Mobile venue cards switched from tiny horizontal (130x130 thumbnail) to full-width vertical layout (16:10 hero image), making photos the centerpiece
- **Virtual Tour**: Cards auto-cycle through photos every 3s with crossfade + Ken Burns zoom when in viewport; pauses on manual swipe
- **PWA Setup**: Full Progressive Web App with branded VQ monogram icon (all sizes), service worker v2 for caching, install prompt banner for mobile users, iOS & Android splash screens

### Key Components
- `VenueSearchPage.js` — Main search page with all state management
- `MobileVenueCard.js` — Premium card with heart→collection picker, Preview, Compare
- `MobileQuickPreview.js` — Rich bottom sheet preview modal
- `CollectionPickerModal.js` — Bottom sheet for saving venues to collections
- `CompareSheet.js` — Side-by-side venue comparison
- `FilterBottomSheet.jsx` — Comprehensive mobile filter interface
- `RecentlyViewedVenues.js` — localStorage-based recently viewed strip
- `CollectionsPage.js` — User's collections grid
- `CollectionDetailPage.js` — Single collection with venues
- `SharedCollectionPage.js` — Public shared collection view

## DB Schema
- **venues**: `{ venue_id, name, slug, city, city_slug, images, capacity_min, capacity_max, pricing, amenities, rating, ... }`
- **users**: `{ user_id, email, password_hash, name, role, ... }`
- **collections**: `{ collection_id, user_id, name, venue_ids[], share_token, is_public, created_at, updated_at }`
- **enquiries**: `{ customer_name, customer_email, venue_id, ... }`

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
