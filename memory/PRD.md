# VenuLock - Product Requirements Document
## (Rebranded from BookMyVenue — Mar 2026)

## Overview
**VenuLock** is India's trusted managed venue booking platform.
**Tagline:** WE TALK. YOU LOCK.
**Mission:** Premium. Secure. Scalable.

## Brand Identity
- **Colors:** White (#FFFFFF), Muted Gold (#C8A960), Dark (#111111), Black (#000000)
- **Typography:** Poppins / Montserrat
- **Logo:** "Venu" (white/silver) + "Lock" (gold) with VL shield/pin icon

## Original Problem Statement
Build a "managed event booking platform" named BookMyVenue. Core business model: customers submit requirements, a dedicated Relationship Manager (RM) coordinates with venues to facilitate the booking.

## User Personas
- **Customer**: Submits event requirements, interacts with RM, books venue
- **Relationship Manager (RM)**: Manages leads, coordinates with venues, handles customers
- **Admin**: Platform oversight, analytics, manages RMs and venues
- **Venue Owner**: Lists and manages venues on the platform

## Core Requirements

### Public User Journey (P0 — COMPLETED Feb 2026)
1. **Landing Page**: City/Near Me toggle-based discovery module
   - City mode: dropdown + "Explore Venues" → `/venues/search?city=...`
   - Near Me mode: GPS geolocation + radius selector (2/5/10/20/50km)
   - Real city data from `/api/venues/cities`
2. **Venue Listing Page** (`/venues/search`): Full venue grid with filters, sorting
   - **PREMIUM UI (COMPLETED Mar 2026)**: Branded discovery header, elevated filter sidebar, 2-column grid
3. **Venue Detail Page** (`/venues/:id`): Full venue details, photo gallery, pricing
4. **4-Layer Concierge Booking Flow**:
   - Layer 1: Personal details (name, phone, email)
   - Layer 2: OTP phone verification
   - Layer 3: Choose Your RM (3 cards from `/api/rms/available`)
   - Layer 4: Event details (type, date, guest count, budget)
   - Layer 5: Investment preferences + submit
   - Selected RM stored on booking request

### Backend APIs (All Implemented)
- `POST /api/otp/send` + `POST /api/otp/verify`
- `POST /api/booking-requests` (with `selected_rm_id` support)
- `GET /api/rms/available?city=&limit=3`
- `GET /api/rms/top-performers?limit=3` — Public endpoint, returns top 3 RMs ranked by events closed (auto-calculated from leads data)
- `GET /api/venues/cities`
- `GET /api/venues` (listing with filters)
- `GET /api/venues/:id`

### Auth & Role Dashboards (COMPLETED)
- Admin dashboard: leads, analytics, venue management, RM management
- RM dashboard: assigned leads, pipeline management
- Venue Owner dashboard: venue listing management
- Google OAuth + JWT auth

### 3rd Party Integrations
- Razorpay: Payment processing (test mode)
- Resend: Email notifications
- Emergent-managed Google Auth
- jsPDF/html2canvas: PDF generation
- Recharts: Analytics charts

## Architecture
```
/app/
├── backend/
│   ├── server.py
│   ├── routes/
│   │   ├── admin.py       # Admin APIs
│   │   ├── auth.py        # Auth (JWT + Google OAuth)
│   │   ├── booking.py     # OTP, booking requests, RMs available
│   │   ├── top_performers.py # GET /rms/top-performers (public, auto-ranked)
│   │   ├── venues.py      # Venue CRUD + cities + search
│   │   ├── payments.py    # Razorpay
│   │   ├── notifications.py # Resend email
│   │   ├── leads.py       # Lead management
│   │   └── seed.py        # Data seeding
│   └── services/
│       ├── admin_conversion_email_service.py
│       └── rm_analytics_service.py
└── frontend/
    └── src/
        ├── App.js
        ├── pages/
        │   ├── LandingPage.js          # City/Near Me hero
        │   ├── VenueSearchPage.js      # Premium venue search (UPDATED)
        │   ├── VenueDetailPage.js      # Single venue detail (refactored: 1321->901 lines)
        │   ├── CityHubPage.js          # City grid at /venues and /venues/explore
        │   ├── ListVenuePage.jsx       # B2B: List Your Venue
        │   ├── PartnerPage.jsx         # B2B: Partner With Us
        │   └── [admin/rm/owner dashboards]
        └── components/
            ├── EnquiryForm.js          # 5-step concierge flow
            ├── VenueCard.js            # Premium venue card (UPDATED)
            ├── FilterBottomSheet.jsx   # Mobile filter UI
            └── venue/
                ├── GalleryModal.js     # Photos/Video/360° gallery (extracted)
                └── EMICalculator.js    # EMI calculator teaser+modal (extracted)
```

## DB Schema (Key Collections)
- `users`: role (admin/rm/venue_owner), user_id, name, email, phone, city_focus, specialties, bio, rating, response_time
- `venues`: venue_id, name, city, area, capacity, pricing, event_types, photos, status
- `leads`: booking_request_id (BMV-XXX-000001), customer_*, rm_id, rm_name, status, selected_rm_id
- `otps`: phone_number, otp, expires_at
- `counters`: sequence tracking for IDs
- `venue_applications`: B2B lead capture for venue owners
- `partner_applications`: B2B lead capture for event companies

## Test Credentials
- Admin: admin@bookmyvenue.in / admin123
- RM: rm1@bookmyvenue.in / rm123
- Venue Owner: venue@bookmyvenue.in / venue123
- Full credentials: /app/test_playbook.txt

## Completed Work (Mar 2026)

### Top Performers of the Month (Landing Page)
- [x] New public API endpoint `GET /api/rms/top-performers` — auto-ranks RMs by events closed (confirmed + completed leads)
- [x] Replaced static RM profiles section with dynamic "Top Performers" section on landing page
- [x] Clean light design with gold accent on #1 card, crown icon, sparkles, elevated scaling
- [x] Shows events closed, leads managed, rating, languages — all live from database
- [x] Filters out test RM accounts automatically

### Branding Migration: BookMyVenue → VenuLock (Mar 2026)
- [x] Text: BookMyVenue → VenuLock, BMV → VL, bookmyvenue → venulock (all files)
- [x] Colors: Gold #C7A14A/#C9A227 → #F5C84C, Navy #0B1F3B/#0A1A2F → #111111
- [x] Logo: New SVG with gold VL pin icon + "Venu"/"Lock" split text
- [x] Font: Added Poppins & Montserrat as primary fonts
- [x] Tagline: "WE TALK. YOU LOCK." across hero, footer, login, register, RM dashboard
- [x] Page title: "VenuLock | WE TALK. YOU LOCK."
- [x] Email domains: @bookmyvenue.in → @venulock.in
- [x] VL VERIFIED badges on venue cards (was BMV VERIFIED)
- [x] All backend references updated (chatbot, emails, configs)
- [x] Zero BookMyVenue text remaining. Fully tested: 100% (12/12)

### Connect Button with WhatsApp/Phone Options (Mar 2026)
- [x] Replaced "Request Callback" / "Talk to Expert" with reusable "Connect" button across 3 pages
- [x] Click shows dropdown: "WhatsApp Chat" (opens wa.me) and "Quick Phone Call" (tel: link)
- [x] Applied to: Landing page CTA, Venue Detail sidebar, My Enquiries page
- [x] Outside-click dismissal, clean icons, fully tested: 100% (7/7 tests passed)

### Footer Links Fix & New Pages (Mar 2026)
- [x] Fixed all broken footer links — replaced `<a href="#">` with React Router `navigate()`
- [x] Created 4 new pages: Contact (with form), Support (with FAQ accordion), Privacy Policy, Terms of Service
- [x] Fixed "How It Works" anchor scroll with `id="how-it-works"`
- [x] All city links properly navigate to venue search with query params
- [x] Fully tested: 100% (12/12 link + page tests passed)

### RM Motivation Features (Mar 2026)
- [x] **RM Dashboard Badge**: Top Performer banner on RM dashboard showing rank, events closed, leads managed
- [x] **Shareable Achievement Card**: Branded card with photo, name, rank, stats — downloadable as PNG via html2canvas
- [x] **Booking Flow Trust Signal**: "#X This Month" badge on RM selection cards during booking flow (EnquiryForm step 3)
- [x] Fully tested: 100% backend + 100% frontend (landing page, RM dashboard, booking flow)

### AI Chatbot ("BMV Concierge")
- [x] Backend endpoint `POST /api/chatbot/chat` using OpenAI for contextual venue assistance
- [x] Floating chat widget component on all pages

### City Selection Dropdown
- [x] Simple non-searchable `<select>` dropdown with Delhi sub-regions

### Premium Venue Search Page UI
- [x] Branded Discovery Header with gradient background, "CURATED COLLECTION" badge, venue/city stats
- [x] Elevated Filter Sidebar with "Refine Results" header, card-based design
- [x] Spacious 2-column venue grid (lg:grid-cols-2) with enhanced VenueCard
- [x] "BMV VERIFIED" badges on venue cards
- [x] Fixed activeFilterCount bug (empty array was truthy)

### FAQ Section on Venue Detail Page
- [x] Added new "FAQ" tab with 8 dynamically generated questions based on venue data
- [x] Corporate Premium styling with dark navy header and gold accents
- [x] Accordion-style expandable FAQ items with smooth animations
- [x] "Ask an Expert" CTA button for further inquiries
- [x] Fully responsive design (mobile + desktop)
- [x] Custom FAQs from venue owners merge with default FAQs

### Custom FAQ Management for Venue Owners
- [x] FAQ management section in VenueOwnerEdit page
- [x] Add/remove custom FAQs with question and answer fields
- [x] FAQs stored in venue document and displayed on public venue page

### Premium Demo Content - 20 High-Class Delhi NCR Venues (Updated Mar 2026)
**Five Star Hotels:**
- The Imperial New Delhi (4.9★) - ₹5.5k/plate
- The Oberoi New Delhi (4.9★) - ₹6k/plate  
- Taj Palace New Delhi (4.8★) - ₹4.5k/plate
- ITC Maurya New Delhi (4.8★) - ₹5k/plate
- The Leela Palace New Delhi (4.9★) - ₹5.5k/plate
- The Leela Ambience Gurgaon (4.8★) - ₹4.5k/plate
- Hyatt Regency Gurgaon (4.7★) - ₹3.5k/plate
- JW Marriott Aerocity (4.8★) - ₹4k/plate
- Crowne Plaza Noida (4.5★) - ₹2.5k/plate

**Premium Banquet Halls:**
- The Grand Ballroom GK (4.7★) - ₹2.5k/plate
- Crystal Banquets Dwarka (4.6★) - ₹1.8k/plate
- Royal Heritage Banquets (4.5★) - ₹1.6k/plate

**Luxury Farmhouses:**
- The Roseate Gardens, Gurgaon (4.7★) - ₹1.5k/plate
- The Grand Farmhouse Chattarpur (4.6★) - ₹1.4k/plate
- Paradise Farms Manesar (4.5★) - ₹1.2k/plate
- The Umrao (4.7★) - ₹2.2k/plate

**Rooftop Venues:**
- Sky Lounge Cyber Hub (4.8★) - ₹2.5k/plate
- The Terrace CP (4.7★) - ₹3k/plate

**Resorts:**
- Jaypee Greens Golf Resort (4.6★) - ₹2k/plate
- Radisson Blu Greater Noida (4.5★) - ₹2.2k/plate

**HD Images:** All venues feature stunning HD photos - crystal chandeliers, elegant ballrooms, outdoor fairy lights, pool setups

### Corporate Premium Theme - Admin/RM Dashboards (Verified Mar 2026)
- [x] Admin Dashboard - Clean stats cards, gold accents, navy headers
- [x] Conversion Intelligence Page - Funnel charts, leak point alerts
- [x] RM Dashboard - Kanban pipeline view, earnings summary
- [x] Login/Register Pages - Split-screen Corporate Premium design

### Media Gallery on Venue Detail Page (Completed Mar 2026)
- [x] Full-screen photo gallery modal with Photos/Video/360° Tour tabs
- [x] Photo grid view with click-to-expand full-screen viewer
- [x] Full-screen viewer with prev/next navigation and thumbnail strip
- [x] Video tab: Professional placeholder with venue background, "Request Video Tour" CTA
- [x] 360° tab: Immersive placeholder with pulsing icon, "Start Virtual Tour" and "Book Site Visit" CTAs
- [x] Gallery buttons on hero image (desktop & mobile)
- [x] Accessible DialogTitle, aria-describedby on all modals
- [x] Mobile z-index fix for gallery button above venue info overlay
- [x] Removed dead VirtualTourSection component

### Virtual Venue Tours (Added Mar 2026)
- [x] New "Virtual Tour" tab on Venue Detail Page
- [x] Video player with play button overlay
- [x] Tour Highlights tags (Main Hall, Stage Area, etc.)
- [x] "Schedule Visit" CTA for in-person tours
- [x] Dynamic thumbnail based on venue type

### EMI Calculator / Payment Plans (Added Mar 2026)
- [x] Interactive loan amount slider (₹1L - ₹50L range)
- [x] Tenure selection buttons (6, 12, 18, 24, 36 months)
- [x] Real-time EMI calculation at 12% p.a.
- [x] Expandable details showing principal, interest, total
- [x] Trust badges (No Processing Fee, Quick Approval, etc.)
- [x] "Check EMI Eligibility" CTA
- [x] Partner bank logos (Bajaj Finserv, HDFC, ICICI)

### Favorites Page (Completed Mar 2026)
- [x] New `/favorites` page with venue card grid (name, city, area, rating, type, price, capacity)
- [x] Remove individual favorites (trash icon) and "Clear All" button
- [x] Empty state with "No favorites yet" message and "Browse Venues" CTA
- [x] Heart icon in header navigation bar for quick access
- [x] "My Favorites" link in user dropdown menu
- [x] Backend: POST /api/venues/batch endpoint for efficient multi-venue fetching

### Customer Dashboard Redesign (Completed Mar 2026)
- [x] Welcome header with user profile picture/icon, first name, and email
- [x] Quick stats cards: Enquiries count (with active highlighted), Saved venues count, Recently Viewed count
- [x] Quick action buttons: Browse Venues, My Favorites, Talk to Expert (WhatsApp)
- [x] My Favorites section: Top 4 favorited venues with images, ratings, "View All" link
- [x] Recently Viewed section: Last 4 visited venues from localStorage
- [x] Enhanced booking requests list with status badges, location, date, guest count, assigned RM
- [x] Empty state for no bookings with "Discover Venues" CTA
- [x] Fully mobile-responsive at 375px

### Account-Based Favorites System (Completed Mar 2026)
- [x] FavoritesContext provides shared state across all components
- [x] Backend API: GET/POST/DELETE /api/favorites + POST /api/favorites/merge
- [x] Auth gate: Heart click when not logged in → redirects to /login?redirect=currentPage
- [x] Login/Register pages handle ?redirect param → redirect back after auth
- [x] Smart merge: localStorage favorites merged into DB on first login, then cleared
- [x] Heart buttons on all venue cards (desktop VenueCard + mobile MobileVenueCard)
- [x] Prominent "Save to Favorites" button in venue detail sidebar
- [x] Favorites persist across devices/sessions via MongoDB

### Admin/RM Dashboard Mobile Polish (Completed Mar 2026)
- [x] Reduced content padding on mobile (p-3 sm:p-6)
- [x] Reduced breadcrumb area padding on mobile (px-4 sm:px-6 py-3 sm:py-4)
- [x] Verified hamburger menu, sidebar toggle, overlay all work at 375px
- [x] All 11 admin nav items accessible via mobile sidebar

### Recently Viewed Venues (Completed Mar 2026)
- [x] Track venue visits in localStorage (key: 'bmv_recently_viewed', max 10 items)
- [x] Horizontal scroll strip with venue thumbnails, name, city/area, rating, venue_type badge, price
- [x] Displayed on Venue Search page (/venues/search) and CityHub page (/venues)
- [x] Scroll arrows for navigation, click navigates to venue detail
- [x] Current venue excluded from strip when viewing a venue detail page

### Mobile Responsiveness Audit (Completed Mar 2026)
- [x] Gallery modal: flex layout fix for mobile (no empty space above tabs)
- [x] Gallery fullscreen viewer: prev/next and thumbnail strip work at 375px
- [x] Landing page: hero, city selector, CTAs render correctly at 375px
- [x] Search page: filter toggle, venue cards render properly at 375px
- [x] Venue detail: hero, tabs, booking CTAs display correctly at 375px
- [x] CityHub: city cards and layout work at 375px

### WhatsApp Booking Confirmation (Completed Mar 2026)
- [x] Enhanced WhatsApp deep link on confirmation screen with full booking details
- [x] Message includes: Booking Reference, Venue Name, Event Type, Event Date, Assigned RM Name, Customer Name
- [x] Button label updated to "Get Confirmation on WhatsApp"
- [x] Works via wa.me deep link (no 3rd party API needed)

### localStorage Filter Persistence on Venue Search (Completed Mar 2026)
- [x] Filters auto-saved to localStorage (`bmv_search_filters` key) on every change
- [x] On page load: URL params take priority → then localStorage → then defaults
- [x] "Clear All" removes filters from state, URL, and localStorage
- [x] Works across navigation (leave venue search → visit venue detail → return → filters restored)

## Prioritized Backlog

### P1 - UX Polish
- [x] Loading skeletons on venue listing (DONE)
- [x] Error states: "no venues found" (DONE)
- [x] Fallback UI when no RMs available (DONE - shows "Our expert team will be assigned" + "Continue without selecting" link)
- [x] Persist search state in URL + localStorage (DONE Mar 2026 - filters auto-save to localStorage, restored on return, URL params take priority, Clear All wipes localStorage)
- [ ] Wire up "Talk to an Expert" button site-wide

### P1 - Venue Detail CTAs
- [x] "Request Booking" opens EnquiryForm
- [x] "Request Callback" opens EnquiryForm
- [ ] "Talk to an Expert" (direct contact flow)

### P1 - FAQ Section (COMPLETED Mar 2026)
- [x] FAQ tab on Venue Detail Page with Corporate Premium styling
- [x] Dynamic FAQ content based on venue data (capacity, catering, parking, etc.)
- [x] Accordion-style expandable questions with gold chevron accents
- [x] Dark navy header with gold icon accent
- [x] "Ask an Expert" CTA in FAQ footer
- [x] Mobile-responsive design

### P2 - Bug Fixes
- [x] React hydration warning on ConversionIntelligencePage — Root cause: Emergent platform instrumentation (`emergent-main.js`) wraps `.map()` in `<span>` inside `<tbody>`. NOT a code bug, platform-level issue. No fix needed.
- [x] DialogTitle accessibility (VisuallyHidden) in gallery and EMI modals — FIXED Mar 2026

### P3 - Future
- [ ] Razorpay production setup
- [ ] Automated payouts to venues
- [ ] AI venue recommendations
- [ ] SMS/WhatsApp notifications
- [ ] RM profile pages (bio, portfolio, reviews)
- [ ] Review/rating system for completed events

### City Search Dropdown (Completed Mar 2026)
- [x] Replaced city pill buttons with searchable dropdown on landing page
- [x] Type-ahead filtering: type to filter cities in real-time
- [x] "All Cities" option at top of dropdown
- [x] Selected city shows as dismissible badge
- [x] Works on both mobile (375px) and desktop (1920px)
- [x] Dropdown closes on selection or outside click

### AI Customer Support Chatbot (Completed Mar 2026)
- [x] Floating chat widget (bottom-right corner) available on all pages
- [x] Powered by GPT-4o-mini via emergentintegrations library
- [x] Multi-turn conversation support with session persistence
- [x] System prompt with BookMyVenue knowledge (venues, pricing, process)
- [x] Quick suggestion buttons for common questions
- [x] Welcome message on open
- [x] Chat messages logged to MongoDB (chat_messages collection)
- [x] Backend: POST /api/chatbot/message endpoint
