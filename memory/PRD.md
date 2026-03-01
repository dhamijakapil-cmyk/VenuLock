# BookMyVenue - Product Requirements Document

## Original Problem Statement
Build a scalable event venue marketplace platform for India named "BookMyVenue". The platform is a **MANAGED EVENT BOOKING PLATFORM** where Relationship Managers (RMs) handle all customer interactions and bookings.

## Core Brand Identity
- **Tagline**: "We Negotiate. You Celebrate."
- **Positioning**: India's Smart Venue Booking Platform
- **Theme**: White background, minimal gold (#C7A14A) accents for CTAs only
- **Tone**: Product-first, high clarity, commercial — with emotional warmth

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + lucide-react
- **Backend**: FastAPI + MongoDB (Motor) + APScheduler
- **Auth**: Emergent-managed Google Auth + JWT
- **Payments**: Razorpay (test mode)
- **Email**: Resend
- **Charts**: Recharts

## What's Been Implemented

### Landing Page (Latest - Feb 2026)
- White-themed, product-first homepage with emotional tagline
- Sections: Hero, Live Platform Snapshot, How It Works, Explore by City, Platform Advantage, For Venues & Event Managers, Final CTA, Footer
- Animated stat counters with IntersectionObserver
- City cards with real Unsplash images (Delhi NCR, Mumbai, Jaipur, Bangalore, Goa, Udaipur)
- Responsive design with all data-testid attributes

### Backend (Production-Hardened)
- Modular FastAPI with separated routes (admin, health, seed, legacy)
- Scheduler with distributed MongoDB locks
- ENV-gated development endpoints with X-DEV-TOKEN protection
- Weekly Admin Conversion Intelligence Email (automated + manual trigger)

### Dashboards
- Admin Dashboard with analytics
- RM Dashboard with client management
- Conversion Intelligence Page

### Other Features
- Venue discovery portal with search/filter
- Role-based authentication (Admin, RM, Customer)
- PDF generation (jsPDF + html2canvas)

## Pending Issues
- P2: React hydration warning on Conversion Intelligence Page (span inside tbody)

## Backlog / Future Tasks
- Full Production Setup for Razorpay
- Automated Payouts to Venues
- AI Features: Customer-facing chatbot, AI-driven venue recommendations
- SMS/WhatsApp Notifications integration

## Credentials
- RM: rm1@bookmyvenue.in / rm123
- Admin: admin@bookmyvenue.in / admin123

## Key Files
- `/app/frontend/src/pages/LandingPage.js` - Main landing page
- `/app/backend/server.py` - Backend entrypoint (~110 lines)
- `/app/backend/routes/` - Modular route files
- `/app/backend/scheduler/tasks.py` - Scheduled tasks
- `/app/backend/DEPLOYMENT_RUNBOOK.md` - Ops documentation
