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
- Customer enquiry system
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
1. **Photo Lightbox**: Full-screen Airbnb-style photo viewer with keyboard navigation (arrows + Escape), swipe gestures, zoom, and thumbnail strip
2. **Skeleton Loaders + Micro-animations**: Shimmer-effect loading states, staggered card entrance animations across search page
3. **VL VERIFIED Trust Badge**: Interactive badge with hover tooltip explaining 5-point verification process
4. **Venue Comparison Tool**: Compare up to 3 venues side-by-side from search or detail pages, floating comparison bar, dedicated comparison page with detailed table
5. **Customer Enquiry Dashboard**: Expandable enquiry cards with visual status timeline (5 stages: Received → Expert Assigned → Site Visit → Negotiation → Confirmed)
6. **Mobile Experience**: Touch-friendly lightbox with swipe, responsive comparison bar, native-like interactions

### Database
- 9 Indian cities with seeded venue data (Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Chandigarh, Kolkata, Ahmedabad, Pune)
- Venues collection with full details (pricing, amenities, images, location)

## Key Routes
- `/` - Landing page
- `/venues/search` - Search with filters
- `/venues/compare` - Side-by-side comparison
- `/venues/:citySlug/:venueSlug` - Public venue page
- `/venue/:id` - Venue detail (authenticated)
- `/my-enquiries` - Customer enquiry dashboard
- `/admin/*` - Admin pages
- `/rm/*` - RM pages

## API Endpoints (Key)
- `GET /api/venues/search` - Search venues with filters
- `GET /api/venues/featured` - Featured venues
- `POST /api/venues/price-estimate` - Price estimator
- `GET /api/my-enquiries` - Customer's enquiries
- `POST /api/leads` - Create enquiry
- `GET /api/health` - Health check

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / password123
- Customer: democustomer@venulock.in / password123

## Backlog
- P1: Production Razorpay setup
- P1: SEO + Structured Data for venue pages
- P2: Automated payouts to venues
- P2: AI Chatbot enhancements
- P2: SMS notifications
- P2: "List Your Venue" partner landing page
