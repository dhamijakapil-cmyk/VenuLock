# VenuLock - Product Requirements Document
## (Rebranded from BookMyVenue — Mar 2026)

## Overview
**VenuLock** is India's trusted managed venue booking platform.
**Tagline:** WE TALK. YOU LOCK.
**Mission:** Premium. Secure. Scalable.

## Brand Identity
- **Colors:** White (#FFFFFF), Off-white (#FAFAF9), Muted Gold (#C8A960), Dark (#0C0C0C), Borders (#EBEBEB/#E2E2E2)
- **Typography:** EB Garamond (headlines/serif, 400-800) + DM Sans (UI/sans-serif, variable weight) + JetBrains Mono (data)
- **Logo:** "VENU | LOCK" — font-extrabold, tracking-[0.18em], gold vertical separator (1.5px), DM Sans
- **Design Language:** Sharp corners (0px radius), uppercase CTAs with tracking, minimal decoration, Airbnb-level product discipline
- **Type System:** Labels 11px, Body 14px, Emphasis 15px, Section headings 28-34px serif, Hero 5rem serif
- **Spacing System:** Section padding py-20 lg:py-28, consistent throughout

## Original Problem Statement
Build a "managed event booking platform" named BookMyVenue. Core business model: customers submit requirements, a dedicated Relationship Manager (RM) coordinates with venues to facilitate the booking.

## User Personas
- **Customer**: Submits event requirements, interacts with RM, books venue
- **Relationship Manager (RM)**: Manages leads, coordinates with venues, handles customers
- **Admin**: Platform oversight, analytics, manages RMs and venues
- **Venue Owner**: Lists and manages venues on the platform

## Core Requirements

### Public User Journey (P0 — COMPLETED)
1. **Landing Page**: City/Near Me toggle-based discovery module
   - City mode: dropdown + "Find My Venue" → `/venues/search?city=...`
   - Near Me mode: GPS geolocation + radius selector
   - Real city data from `/api/venues/cities`
2. **Venue Listing Page** (`/venues/search`): Full venue grid with filters, sorting
3. **Venue Detail Page** (`/venues/:id`): Full venue details, photo gallery, pricing
4. **4-Layer Concierge Booking Flow**: Personal details → OTP → Choose RM → Event details → Submit

### Backend APIs (All Implemented)
- `POST /api/otp/send` + `POST /api/otp/verify`
- `POST /api/booking-requests` (with `selected_rm_id` support)
- `GET /api/rms/available?city=&limit=3`
- `GET /api/rms/top-performers?limit=3`
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
│   │   ├── admin.py, auth.py, booking.py, venues.py
│   │   ├── top_performers.py, payments.py, notifications.py
│   │   ├── leads.py, seed.py
│   └── services/
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.js (REFINED Mar 6 2026)
        │   ├── LoginPage.js (REFINED)
        │   └── [20+ other pages]
        └── index.css (REFINED Mar 6 2026)
```

## Completed Work

### Mar 6, 2026 — World-Class Marketplace UI Refinement
- Comprehensive landing page redesign for Airbnb/Uber-level product sharpness
- Header: Bolder wordmark (font-extrabold, tighter tracking)
- Hero: 5rem headline (up from 3.75rem), removed framed badge, tighter layout
- Search form: Refined borders, better field styling, subtle shadows
- Below fold: Black icon boxes, oversized step numbers, unified spacing
- Full consistency pass: unified colors, borders, shadows, spacing rhythm
- Testing: 100% pass (23/23 features, desktop + mobile)

### Previous Sessions
- Sign-in page fix & overhaul (auth bug + UI rebrand)
- Event type search bug fix (case-sensitivity)
- Homepage consistency pass
- Multiple iterative UI refinements
- Mobile conversion optimization

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / password123
- Customer: democustomer@venulock.in / password123

## Backlog

### P1 — Upcoming
- Inform user about Customer Dashboard location (/my-enquiries)

### P2 — Future
- Full Production Setup for Razorpay integration
- Automated Payouts to Venues
- AI Chatbot enhancements
- SMS Notifications integration
