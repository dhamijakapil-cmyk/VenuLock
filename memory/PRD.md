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
        │   ├── LandingPage.js          # City/Near Me hero (UPDATED)
        │   ├── VenueSearchPage.js      # Venue listing at /venues/search
        │   ├── VenueDetailPage.js      # Single venue detail
        │   ├── CityHubPage.js          # City grid at /venues and /venues/explore
        │   └── [admin/rm/owner dashboards]
        └── components/
            └── EnquiryForm.js          # 5-step concierge flow (UPDATED)
```

## DB Schema (Key Collections)
- `users`: role (admin/rm/venue_owner), user_id, name, email, phone, city_focus, specialties, bio, rating, response_time
- `venues`: venue_id, name, city, area, capacity, pricing, event_types, photos, status
- `leads`: booking_request_id (BMV-XXX-000001), customer_*, rm_id, rm_name, status, selected_rm_id
- `otps`: phone_number, otp, expires_at
- `counters`: sequence tracking for IDs

## Test Credentials
- Admin: admin@bookmyvenue.in / admin123
- RM: rm1@bookmyvenue.in / rm123
- Venue Owner: venue1@example.com / venue123
- Full credentials: /app/test_playbook.txt

## Prioritized Backlog

### P1 - UX Polish
- [ ] Loading skeletons on venue listing
- [ ] Error states: "no venues found", "location blocked", "OTP failed"
- [ ] Fallback UI when no RMs available
- [ ] Persist search state in URL + localStorage
- [ ] Wire up "Talk to an Expert" button site-wide

### P1 - Venue Detail CTAs
- [x] "Request Booking" opens EnquiryForm
- [x] "Request Callback" opens EnquiryForm
- [ ] "Talk to an Expert" (direct contact flow)

### P2 - Bug Fixes
- [ ] React hydration warning on ConversionIntelligencePage (span inside tbody)
- [ ] DialogTitle accessibility (VisuallyHidden) in EnquiryForm

### P3 - Future
- [ ] Razorpay production setup
- [ ] Automated payouts to venues
- [ ] AI customer chatbot
- [ ] AI venue recommendations
- [ ] SMS/WhatsApp notifications
- [ ] RM profile pages (bio, portfolio, reviews)
- [ ] Review/rating system for completed events
