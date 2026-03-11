# VenuLock - Product Requirements Document

## Original Problem Statement
Build a world-class modern marketplace for event venue booking (VenuLock). The platform serves customers looking for premium event venues in Indian cities, with role-based access for customers, venue relationship managers (RMs), and admins.

## User Personas
- **Customers**: Browse venues, compare options, submit enquiries, track booking progress
- **Relationship Managers**: Manage leads, communicate with venues, create comparison sheets
- **Admins**: Manage venues, users, and platform-wide operations
- **Venue Owners**: Manage their venue listings and availability

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Integrations**: OpenAI (chatbot), Razorpay (payments), Resend (emails), Emergent Google Auth

## What's Implemented

### Core Features (Complete)
- Authentication (JWT + Google OAuth)
- Venue search with filters (city, type, capacity, budget, amenities)
- Venue detail pages with rich information and booking cards
- Customer enquiry system (5-step form with OTP, RM selection)
- RM dashboard with lead management
- Admin dashboard with user/venue management
- AI chatbot (GPT-powered)
- Wishlist/favorites functionality
- Recently viewed venues
- Razorpay payment integration (test mode)

### Landing Page (Complete - Premium V5)
- Hero section with background image
- City tabs for quick browsing
- Price estimator widget with custom dropdowns
- Featured venues section
- Testimonials section
- Nearby venue search with geolocation

### Premium Features (Complete - March 2026)
1. Photo Lightbox with keyboard/swipe navigation
2. Skeleton Loaders + Micro-animations
3. VL VERIFIED Trust Badge
4. Venue Comparison Tool (up to 3 venues)
5. Share Comparison (shareable links)
6. Customer Enquiry Dashboard with status timeline
7. Mobile Experience (touch-friendly, responsive)

### UI/UX Enhancements (Complete - March 2026)
1. Sticky Mobile Booking CTA (positioned above platform badge)
2. Image Mosaic Grid (desktop)
3. Smart Search Bar with autocomplete
4. Customer Reviews Section (MOCKED data)
5. Social Proof Strip with animated counters
6. Dark Mode Toggle
7. Quick Preview on Hover

### Data Enhancement (Complete - March 2026)
- 5 HD Photos Per Venue (40 venues, categorized by type)

### Bug Fixes (March 2026)
- Fixed Sticky CTA overlapping with "Made with Emergent" badge (moved to bottom-[40px])
- Fixed ChatBot icon overlapping with CTA (moved to bottom-[120px] on mobile, bottom-20 on desktop)
- Added StickyMobileCTA to VenuePublicPage (was missing from /venues/:citySlug/:venueSlug)
- Enlarged heart/favorite buttons on mobile venue cards (w-9 h-9, gap-2)
- Added bottom padding to search page and venue public page for mobile
- Fixed enquiry confirmation dialog ("Track Your Request" button was hidden behind badge):
  - Made all EnquiryForm dialogs scrollable with max-h-[85vh] + overflow-y-auto
  - Compacted success dialog sections (header, RM card, callback) for mobile
  - Made intro dialog responsive (smaller hero image, tighter spacing)

## Key Routes
- `/` - Landing page
- `/venues/search` - Search with filters
- `/venues/compare` - Side-by-side comparison
- `/venues/compare/shared/:shareId` - Shared comparison view
- `/venues/:citySlug/:venueSlug` - Public venue page
- `/venue/:id` - Venue detail (authenticated)
- `/my-enquiries` - Customer enquiry dashboard
- `/admin/*` - Admin pages
- `/rm/*` - RM pages

## API Endpoints (Key)
- `GET /api/venues/search` - Search venues with filters
- `GET /api/venues/featured` - Featured venues
- `GET /api/venues/autocomplete?q=` - Autocomplete search
- `POST /api/venues/price-estimate` - Price estimator
- `POST /api/shared-comparisons` - Save comparison
- `GET /api/shared-comparisons/:shareId` - Retrieve shared comparison
- `GET /api/my-enquiries` - Customer's enquiries
- `POST /api/leads` - Create enquiry

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / password123
- Customer: testcustomer@test.com / test123

## Backlog
- P1: SEO + Structured Data for venue pages
- P1: "List Your Venue" partner landing page
- P2: Production Razorpay setup
- P2: Automated payouts to venues
- P2: AI Chatbot enhancements
- P2: SMS notifications
- P2: Make Customer Reviews dynamic (DB-backed)
