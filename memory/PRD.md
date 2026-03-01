# BookMyVenue - Product Requirements Document

## Original Problem Statement
Build a scalable event venue marketplace platform for India named "BookMyVenue". The platform is a **MANAGED EVENT BOOKING PLATFORM** where Relationship Managers (RMs) handle all customer interactions and bookings.

## Core Brand Identity
- **Tagline**: "We Coordinate. You Celebrate."
- **Positioning**: Managed venue booking platform — structured coordination for venue bookings
- **Model**: Customers submit requirements -> RM coordinates -> Structured offers -> Secure booking
- **NOT** self-serve SaaS, NOT a listing portal, NOT just a concierge
- **Hero Theme**: Deep navy gradient (#080C18 -> #131B2E) with gold (#C7A14A) accents
- **Body Theme**: White background, minimal gold for CTAs, dark typography
- **Tone**: Confident, managed, premium, India-focused, trust-driven. Balance emotion + authority.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + lucide-react
- **Backend**: FastAPI + MongoDB (Motor) + APScheduler
- **Auth**: Emergent-managed Google Auth + JWT
- **Payments**: Razorpay (test mode)
- **Email**: Resend
- **Charts**: Recharts

## What's Been Implemented

### Landing Page (Latest - Mar 2026)
- **Hero Section**: Premium deep navy gradient with gold accents on "Coordinate" and "Celebrate"
  - Dual CTAs: "Start Your Booking" (gold) + "Talk to an Expert" (outlined)
  - Premium white search card floating on dark bg (City, Event Type, Guest Count, Event Date)
  - Trust strip: 4 items with gold check icons
  - Nav: Gold BMV logo, white text, transparent -> solid on scroll
- **Body Sections** (white/structured):
  - How It Works: 4-step operational flow (Submit -> RM Shortlists -> Structured Offers -> Secure Booking)
  - Why BookMyVenue: 5 advantage cards
  - Bookings in Motion: 4 live activity blocks with green pulse
  - City Coverage: 8 cities
  - Partner With BookMyVenue: Venue partner CTA
  - Clean footer with Platform/Company/Cities links

### Backend (Production-Hardened)
- Modular FastAPI with separated routes (admin, health, seed, legacy)
- Scheduler with distributed MongoDB locks
- ENV-gated development endpoints with X-DEV-TOKEN protection
- Weekly Admin Conversion Intelligence Email (automated + manual trigger)

### Dashboards
- Admin Dashboard with analytics, RM Dashboard, Conversion Intelligence Page

### Other Features
- Venue discovery portal, Role-based auth, PDF generation

## Pending Issues
- P2: React hydration warning on Conversion Intelligence Page

## Backlog / Future Tasks
- Full Production Setup for Razorpay
- Automated Payouts to Venues
- AI Features: Chatbot, AI-driven venue recommendations
- SMS/WhatsApp Notifications

## Credentials
- RM: rm1@bookmyvenue.in / rm123
- Admin: admin@bookmyvenue.in / admin123

## Key Files
- `/app/frontend/src/pages/LandingPage.js` - Main landing page
- `/app/backend/server.py` - Backend entrypoint
- `/app/backend/routes/` - Modular route files
- `/app/backend/scheduler/tasks.py` - Scheduled tasks
