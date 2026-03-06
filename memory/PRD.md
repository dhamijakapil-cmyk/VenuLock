# VenuLock - Product Requirements Document
## (Rebranded from BookMyVenue — Mar 2026)

## Overview
**VenuLock** is India's trusted managed venue booking platform.
**Tagline:** WE TALK. YOU LOCK.
**Mission:** Premium. Secure. Scalable.

## Brand Identity (V2 — Updated Mar 6 2026)
- **Colors:** #0A0A0A (primary dark), #FFFFFF (white), #FAFAF9 (off-white), #C8A960 (gold accent), #EBEBEB (borders), #888/#999/#BFBFBF (text hierarchy)
- **Typography:** EB Garamond italic (wordmark + headings), DM Sans (body/UI), JetBrains Mono (data)
- **Wordmark:** "VenuLock" — EB Garamond italic, font-medium, "Venu" white/dark + "Lock" gold, no separator
- **Design Language:** 0px radius, 1px-gap card grids, horizontal inline search bar, scroll reveal animations, dark header/footer bookend
- **Type Scale:** Hero 7rem, Section headings 40px, Card titles 16-17px, Body 14-15px, Labels 10-11px uppercase
- **Spacing:** Sections py-24 lg:py-32, headings mb-16/20, generous whitespace

## Original Problem Statement
Build a "managed event booking platform." Core model: customers submit requirements, a dedicated Relationship Manager coordinates with venues to facilitate booking.

## User Personas
- **Customer**: Submits event requirements, interacts with RM, books venue
- **Relationship Manager (RM)**: Manages leads, coordinates with venues
- **Admin**: Platform oversight, analytics, manages RMs and venues
- **Venue Owner**: Lists and manages venues on the platform

## Core Requirements

### Public User Journey (P0 — COMPLETED)
1. **Landing Page**: City/Nearby toggle-based discovery with inline horizontal search bar
2. **Venue Listing Page** (`/venues/search`): Full venue grid with filters
3. **Venue Detail Page** (`/venues/:id`): Details, gallery, pricing
4. **4-Layer Concierge Booking Flow**: Personal details → OTP → Choose RM → Event details → Submit

### Backend APIs (All Implemented)
- `POST /api/otp/send` + `POST /api/otp/verify`
- `POST /api/booking-requests`
- `GET /api/rms/available?city=&limit=3`
- `GET /api/rms/top-performers?limit=3`
- `GET /api/venues/cities`, `GET /api/venues`, `GET /api/venues/:id`

### Auth & Dashboards (COMPLETED)
- Admin, RM, Venue Owner, Customer dashboards
- Google OAuth + JWT auth

### 3rd Party Integrations
- Razorpay (test mode), Resend, Emergent Google Auth, jsPDF/html2canvas, Recharts

## Completed Work

### Mar 6, 2026 — V2 World-Class Marketplace UI (CURRENT)
- **Wordmark**: Italic serif "VenuLock" (EB Garamond) — distinctive brand logotype
- **Hero**: 7rem two-line headline, no overline badge, generous padding
- **Search bar**: Horizontal inline with label+value pattern (Airbnb-style), black CTA
- **Cards**: 1px-gap grid technique (gap-px bg-[#EBEBEB]) for clean dividers
- **Scroll animations**: Reveal component using IntersectionObserver
- **Footer**: Dark (#0A0A0A) bookend matching header
- **Typography**: Dramatic contrast (7rem → 40px → 17px → 14px → 11px)
- **Trust strip**: Minimal text-only with dot separators
- Testing: 100% pass (26/26 features, desktop + mobile)

### Previous Work
- V1 UI refinement pass (header, hero, search, consistency)
- Sign-in page fix & overhaul
- Event type search bug fix (case-sensitivity)
- Homepage consistency pass
- Mobile conversion optimization

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / password123
- Customer: democustomer@venulock.in / password123

## Backlog
### P1 — Upcoming
- Inform user about Customer Dashboard location (/my-enquiries)
### P2 — Future
- Full Razorpay production setup
- Automated Payouts to Venues
- AI Chatbot enhancements
- SMS Notifications
