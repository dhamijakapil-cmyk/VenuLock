# VenuLock - Product Requirements Document

## Original Problem Statement
Build a world-class modern marketplace for event venue booking (VenuLock). The platform serves customers looking for premium event venues in Indian cities, with role-based access for customers, venue relationship managers (RMs), and admins.

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Integrations**: OpenAI (chatbot), Razorpay (payments - test mode), Resend (emails), Emergent Google Auth

## What's Implemented

### Homepage Redesign (Complete - March 2026)
Premium startup-style landing page with:
- **Dark cinematic hero** — venue background, gold "VenuLock" branding, "We Negotiate. You Celebrate." headline
- **Floating white search card** — City / Use My Location tabs, City / Event Type / Guest Count dropdowns, expandable advanced filters (budget, setting), "Find My Venue" CTA
- **Trust badges strip** — Verified Venues, Transparent Pricing, Smart Comparison, Booking Assistance
- **Featured venue categories** — Hotels, Banquet Halls, Farmhouses, Resorts
- **Featured venues grid** — 4 cards with HD images, pricing, amenities, verified badge, View Details CTA
- **How it works** — 3 numbered steps
- **Why VenuLock** — 3 value proposition cards
- **Stats section** — Animated counters (500+ venues, 150+ planners, 4.8 rating, 1800+ events)
- **Browse by City** — City cards with venue counts
- **Testimonials** — 3 customer review cards
- **Final CTA banner** — "Ready to lock your venue?"
- **Dark premium footer** — Logo, Platform links, Company links, Top Cities
- **Mobile-first responsive** — Separate mobile/desktop headers, stacked layouts
- **Tested**: 100% pass rate (21/21 features, iteration_65)

### Core Features (Complete)
- Authentication (JWT + Google OAuth)
- Venue search with filters (city, type, capacity, budget, amenities)
- Venue detail pages with rich information and booking cards
- Customer enquiry system (5-step form with OTP, RM selection)
- RM dashboard with lead management
- Admin dashboard with user/venue management
- AI chatbot (GPT-powered)
- Wishlist/favorites, Recently viewed
- Razorpay payment integration (test mode)
- Photo Lightbox, Skeleton Loaders, VL Verified Badge
- Venue Comparison Tool + Shareable links
- Customer Enquiry Dashboard with status timeline
- Sticky Mobile CTA, Image Mosaic, Smart Search, Reviews (mocked), Dark Mode, Quick Preview on Hover
- 5 HD photos per venue (40 venues, categorized by type)

### Bug Fixes (March 2026)
- Fixed Sticky CTA / ChatBot / "Made with Emergent" overlap on mobile
- Fixed enquiry confirmation dialog scrolling (Track Your Request button)
- Fixed registration error message (now shows "Email already registered" with Sign In link)

## Key Routes
- `/` - Premium landing page (redesigned)
- `/venues/search` - Search with filters
- `/venues/compare` - Side-by-side comparison
- `/venues/:citySlug/:venueSlug` - Public venue page
- `/my-enquiries` - Customer enquiry dashboard
- `/admin/*` - Admin pages
- `/rm/*` - RM pages

## Credentials
- Admin: admin@bookmyvenue.in / admin123
- RM: rm1@bookmyvenue.in / password123
- Customer: testcustomer@test.com / test123

## Backlog
- P1: SEO + Structured Data (meta tags, Open Graph, JSON-LD)
- P1: "List Your Venue" partner landing page
- P2: Production Razorpay setup
- P2: Automated payouts to venues
- P2: AI Chatbot enhancements
- P2: SMS notifications
- P2: Make Customer Reviews dynamic (DB-backed)
