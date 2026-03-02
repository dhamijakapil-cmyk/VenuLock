# BookMyVenue - Product Requirements Document

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
- [ ] AI customer chatbot
- [ ] AI venue recommendations
- [ ] SMS/WhatsApp notifications
- [ ] RM profile pages (bio, portfolio, reviews)
- [ ] Review/rating system for completed events
