# BookMyVenue - Product Requirements Document

## Original Problem Statement
Build a scalable event venue marketplace platform for India named "BookMyVenue". The platform is a **MANAGED EVENT BOOKING PLATFORM** where Relationship Managers (RMs) handle all customer interactions and bookings.

## Core Brand Identity
- **Positioning**: Managed venue booking marketplace — Uber-style orchestration for venue bookings
- **Headline**: "Structured Venue Booking. Managed End-to-End."
- **Model**: Customers submit requirements → RM coordinates → Structured offers → Secure booking
- **NOT** self-serve SaaS, NOT a listing portal, NOT a concierge
- **Theme**: White background, minimal gold (#C7A14A) for CTAs only, dark typography
- **Tone**: Confident, structured, process-driven, commercial, managed marketplace

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + lucide-react
- **Backend**: FastAPI + MongoDB (Motor) + APScheduler
- **Auth**: Emergent-managed Google Auth + JWT
- **Payments**: Razorpay (test mode)
- **Email**: Resend
- **Charts**: Recharts

## What's Been Implemented

### Landing Page (Latest - Mar 2026)
- Managed marketplace design with RM-centric flow
- Sections: Hero (headline + dual CTAs + 4-field search + trust strip), How It Works (4 operational steps), Why BookMyVenue (5 advantage cards), Bookings in Motion (4 live activity blocks), City Coverage (8 cities), Partner With BookMyVenue, Footer
- Process-driven copy: Submit → RM Shortlists → Structured Offers → Secure Booking
- No emotional/romantic language, no hero images, no decorative glow
- Gold accent only on CTA buttons (Start Your Booking, Get Started)

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
