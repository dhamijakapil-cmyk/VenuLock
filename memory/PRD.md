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
### Final Premium Mobile UI Cleanup Pass (Completed)
- **CTA consistency** — All 4 gold buttons solid #B8963F white text, zero shimmer/gradient anywhere
- **Hero card elegance** — border-white/80 + softer shadow (12px blur vs 16px) for definition without bulk
- **Dropdown polish** — Larger tap targets (py-3.5), max-h-64, smooth scroll, z-[100] overlay
- **Category clutter** — Hover arrows hidden on mobile (hidden lg:block), only appear on desktop hover
- **Stats refinement** — 32px mobile / 48px desktop, tighter gap-8 mobile
- **Step numbers** — 48px mobile / 72px desktop, reduced visual noise
- **Spacing normalized** — All section heading margins mb-10 lg:mb-14; trust badges gap-5 mobile; How It Works gap-6 mobile
- **Mobile CTA** — 420px above fold (390×844), no scrolling needed

### Hero & Mobile UX Premium Refinement (Completed)
- **Dropdown overlay fix** — Removed overflow-hidden from hero section (moved to parallax container), z-[100] on dropdown, z-20 on hero content wrapper, removed z-10 from trust badges. Dropdown now overlays above all sections
- **Label removed** — No "WHERE ARE YOU CELEBRATING?", just "Select your city" placeholder
- **Toggle refined** — White active tab with subtle shadow, inactive #AAA text, warm gray background
- **CTA solid gold** — #B8963F with white text, no shimmer/gradient, subtle shadow
- **Card weight reduced** — max-w-480px, tighter padding (p-5 sm:p-7 lg:p-8)
- **Hero spacing** — pt-12, pb-8 for more breathing room between headline and card
- **Trust badges** — z-10 for proper layering below dropdown
- **Mobile CTA** — 413px above fold (390×844 viewport)

### Premium Minimal Hero Redesign (Completed)
- **Simplified search card** — Removed Event Type, Guest Count, Advanced Filters from hero (moved to results page)
- **City mode** — Single dropdown "Where are you celebrating?" + CTA
- **Near Me mode** — Message + "Use My Location" button + location-aware CTA
- **Solid gold CTA** — #CFA43A, no shimmer/gradient, subtle shadow, rounded corners
- **Clean toggle** — Pill-style City/Near Me switcher with bg-[#F5F4F0] background
- **Narrower card** — max-w-[520px] (was 820px) for focused Airbnb-like feel
- **More vertical spacing** — pt-10/28/36, pb-6/12/16, generous gaps throughout
- **Mobile CTA at 435px** — 408px above the fold on 390×844 viewport

### Mobile Hero CTA Optimization (Completed)
- **CTA above fold** — "Find My Perfect Venue" button at 529px on 390×844 mobile (315px above fold)
- **Mobile-only compact layout** — Hidden tagline, subtitle, trust line via `hidden sm:block`; reduced pt/pb/gaps; card padding p-4; field gaps gap-3
- **Microcopy added** — "Free venue matching. No booking fees." below CTA
- **Chat button scroll-gated** — Hidden on mobile until user scrolls 600px to avoid overlap
- **Tab text shortened** — "Nearby" instead of "Use My Location" on mobile
- **Float animation** — Disabled on mobile (`sm:animate-float-card`)
- **Desktop unchanged** — All elements still visible at sm+ breakpoints

### Final Premium UI Cleanup Pass (Completed)
- **Spacing consistency** — Normalized all section py to 20/28 pattern; trust badges py-16/20; grid gaps harmonized
- **Typography hierarchy** — All section headings: text-[24px] sm:[28px] lg:[34px]; gold labels tracking-[0.2em]; body text normalized to 13-14px
- **Button polish** — Shimmer gradient on all gold CTAs (header, search, final CTA, mobile menu); arrow icons in venue CTA + nav links
- **Card polish** — Why VenuLock cards: gold left accent bar; venue cards: hover lift + stronger shadow; testimonials: flex-col equal height
- **Mobile responsiveness** — Category cards responsive padding (p-4/p-5/p-6); icon sizing (w-10/12/14); tighter gaps (2.5/3/4)
- **Template feel reduced** — Gold accent bars, micro-trust line in hero, varied link styles (ArrowRight vs ChevronRight), radial glows on dark sections
- **Conversion clarity** — Hero micro-trust line ("Trusted by 1,800+ events · 500+ verified venues"); tighter CTA copy; stronger visual weight on primary actions

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
- RM: rm1@venulock.in / rm123
- Venue Owner: venue@venulock.in / venue123
- Customer: democustomer@venulock.in / password123

## Project Health
- Broken: None
- Mocked: Razorpay (test mode)
