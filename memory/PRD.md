# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" / "concierge" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India. Transform the experience to feel exclusive, aspirational, and effortless.

## Core Requirements
- Premium, cohesive visual identity (colors: #0B0B0D black, #F4F1EC white, #E2C06E bright gold, #D4B36A accent gold)
- Mobile-first, dense and scannable venue search experience
- Advanced filtering (city, event type, venue type, price, capacity, amenities, vibes)
- Compare Venues feature (up to 3 side-by-side)
- Quick Preview modal for venue details without leaving search
- Recently Viewed venues section
- Simple Favourites system
- PWA support with install prompt
- Concierge service experience integrated into booking flow
- Cinematic splash screen with 3D-style animated logo
- Auth: Email/password + Google OAuth (Emergent-managed)
- Lead management: Enquiry creation, RM workflow, messaging
- Admin/RM/Venue Owner dashboards
- RM mobile-first webapp for lead management

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)
- **Fonts**: DM Sans (body), JetBrains Mono (numbers), Cormorant Garamond (logo)

## What's Been Implemented

### RM Webapp & Lead Workflow (Complete - March 20, 2026)
- **Backend Workflow API** (`/app/backend/routes/workflow.py`):
  - 9-stage linear pipeline: new -> contacted -> site_visit -> negotiation -> booked -> deposit_paid -> event_done -> full_payment -> payment_released (+ lost)
  - Endpoints: GET /api/workflow/my-leads, GET /api/workflow/stages, GET /api/workflow/{lead_id}, PATCH /api/workflow/{lead_id}/stage, POST /api/workflow/{lead_id}/note, GET /api/workflow/{lead_id}/timeline, POST /api/workflow/{lead_id}/message, GET /api/workflow/{lead_id}/messages
  - Stage transitions enforced sequentially for RMs, admin can skip
  - Customer push notifications on each stage change
  - RM push notification on new lead assignment
- **RM Dashboard** (`/app/frontend/src/pages/rm/RMDashboard.js`):
  - Mobile-first lead list with search, stage filter chips
  - Lead cards show customer name, venue, city, stage badge, event date, guest count, timestamps
  - Greeting header with lead count badge
- **RM Lead Detail** (`/app/frontend/src/pages/rm/RMLeadDetail.js`):
  - Customer info card (phone, email, event date, guests)
  - Collapsible stage progress indicator (step X of 9)
  - Messages tab with chat-style UI, send message functionality
  - Timeline tab with activity log (stage changes, notes, messages)
  - Add notes functionality
  - Stage advancement with optional note
  - Mark as Lost functionality
  - Quick action buttons: Call customer, WhatsApp (wa.me link)
  - Back navigation to dashboard
- **Testing**: 100% pass rate on all 17 backend API tests and all frontend UI tests (iteration_109)
- **Note**: WhatsApp delivery is MOCKED - messages stored in DB but not sent to WhatsApp

### Booking Flow Overhaul (Complete)
- EnquiryForm.js rewritten: Concierge Intro -> Assigning RM -> RM Selection -> Phone Verify -> Auto-Submit
- Auth gate on "Start Planning" button
- Landing Page search card: City -> Guest Count -> Event Date progressive disclosure

### Landing Page & Visual Identity (Complete)
- Full platform rebranding (VenuLock -> VenuLoQ)
- Premium hero section with crossfading slideshow, Ken Burns zoom
- Interactive venue carousel (VenueShowcase.js)
- Cinematic splash screen (SplashScreen.js)
- Premium serif logo (PremiumLogo.js)
- Vibe-based filtering for venues

### Search & Discovery (Complete)
- Vertical card layout with virtual tour (auto-cycling images)
- Quick Preview modal, Compare Venues, Recently Viewed
- Advanced filters: Sort, Venue Type, Vibe, City, Capacity
- Infinite scroll with "Show more venues"

### PWA & Notifications (Complete)
- Push notifications (VAPID), notification bell, auto-polling
- PWA setup with branded icons, service worker, install prompt

## DB Schema
- **venues**: `{ venue_id, name, slug, city, city_slug, images, capacity_min, capacity_max, pricing, amenities, rating, vibes, ... }`
- **users**: `{ user_id, email, password_hash, name, role, phone, picture, rating, ... }`
- **leads**: `{ lead_id, customer_name, customer_email, customer_phone, guest_count_range, event_date, venue_ids, city, rm_id, rm_name, stage, created_at, updated_at, ... }`
- **lead_activity**: `{ activity_id, lead_id, action, detail, meta, created_by, created_by_name, created_at }`
- **lead_messages**: `{ message_id, lead_id, sender_id, sender_name, sender_role, content, channel, whatsapp_status, created_at }`
- **lead_notes**: `{ note_id, lead_id, content, note_type, created_by, created_by_name, created_at }`
- **favorites**: `{ user_id, venue_ids[] }`
- **push_subscriptions**: `{ user_id, endpoint, keys, created_at }`

## Test Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED (messages stored but not sent)
- Facebook & X OAuth buttons show "Coming Soon"

## Upcoming Tasks (P1)
- WhatsApp integration via Twilio for RM-to-customer messaging

## Future/Backlog (P2+)
- Refactor LandingPage.js & VenuePublicPage.js (dedup, shared Header.js)
- Razorpay production setup
- SEO meta tags, Open Graph, JSON-LD structured data
- "List Your Venue" partner landing page
- SMS notifications (Twilio)
- Facebook & X OAuth integration
- Performance optimization (DB query tuning, text indexes)
