# VenuLock - Product Requirements Document

## Problem Statement
VenuLock is a premium venue booking marketplace for the Indian market. It connects event organizers with verified venues for weddings, corporate events, parties, and more. The platform offers transparent pricing, side-by-side venue comparison, and dedicated relationship managers.

## Core Features (Implemented)
- **Landing Page**: Premium, investor-ready homepage with dark hero section, floating search card, trust badges, featured venues, how it works, testimonials, browse by city/type
- **Venue Search**: Search by city, event type, guest count, budget, setting (indoor/outdoor), nearby location
- **Venue Detail Pages**: Full venue info, image galleries, pricing, amenities, enquiry forms
- **User Authentication**: JWT-based auth + Emergent Google Auth
- **Enquiry System**: Users can enquire about venues, track enquiries
- **Admin Dashboard**: Venue management, user management, leads, analytics
- **RM Dashboard**: Relationship manager tools
- **AI Chatbot**: OpenAI GPT-4 powered concierge
- **Venue Comparison**: Side-by-side comparison with sharing
- **Favorites**: Save and manage favorite venues

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn/UI + Framer Motion
- Backend: FastAPI + MongoDB
- Integrations: OpenAI GPT-4, Razorpay (test mode), Resend, Emergent Google Auth, jsPDF, html2canvas, lucide-react, Recharts

## Recent Changes (March 2026)
### Micro-Interactions & Animations (Completed)
- **Hero parallax** — Background image shifts subtly on scroll (0.25x rate, capped at 200px)
- **Staggered hero text entrance** — Tagline, headline, subtitle, search card fade-up with 150ms delays
- **Floating search card** — Gentle 6s infinite float animation
- **CTA button shimmer** — Gold gradient sweep animation on hover (Find My Venue + Start Booking)
- **Stats gold accent lines** — Gold underline animates on scroll reveal for each stat
- **Stats & CTA radial glow** — Subtle radial gradient backgrounds on dark sections
- **Header scroll transition** — Desktop header becomes more opaque as user scrolls

### 8-Point UI/UX Priority Fixes (Completed)
1. **Chatbot button repositioned** — `bottom-[110px] lg:bottom-8` prevents overlap with Emergent badge and StickyMobileCTA on mobile
2. **Search card spacing improved** — Increased padding (p-7 sm:p-9 lg:p-11) and gaps between form elements
3. **Guest capacity on venue cards** — Shows capacity badge (e.g., "50-1500") with Users icon alongside price
4. **Venue card hierarchy improved** — Price + capacity in bordered separator row, clear Name > Location > Price/Capacity > Amenities > CTA flow
5. **Section spacing increased** — All major sections py-20 lg:py-28 (was py-16 lg:py-24)
6. **Hero overlay darker** — Image opacity 0.18 (was 0.22), gradient 80%/50% (was 70%/30%)
7. **Trust icons & section cards stronger** — Larger icon containers (w-14 h-14), borders, bolder accent colors (#B89B4A)
8. **Clickable city & venue type cards** — Hover lift effects, circular arrow indicators, ChevronRight on hover

### Previous Session
- Full homepage redesign (premium startup aesthetic)
- 18-point UI/UX polish
- Registration flow fix
- Enquiry form mobile fix
- Mobile UI overlap fixes
- Venue image seeding

## Key Files
- `frontend/src/pages/LandingPage.js` — Main landing page (700+ lines)
- `frontend/src/components/ChatBot.js` — AI chatbot with floating button
- `frontend/src/components/venue/StickyMobileCTA.js` — Mobile sticky CTA
- `backend/server.py` — FastAPI server
- `backend/routes/venues.py` — Venue API routes

## Upcoming Tasks (Prioritized)
### P1
- SEO + Structured Data (meta tags, Open Graph, JSON-LD schema)
- "List Your Venue" Partner Landing Page

### P2
- Razorpay production setup
- Automated payouts to venues
- AI Chatbot enhancements
- SMS Notifications

### Refactoring
- Break down LandingPage.js into smaller components (HeroSection, FeaturedVenues, HowItWorks, etc.)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / password123
- Customer: democustomer@venulock.in / password123

## Project Health
- Broken: None
- Mocked: Razorpay (test mode)
