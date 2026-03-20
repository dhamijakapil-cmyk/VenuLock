# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" / "concierge" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India.

## Core Requirements
- Premium, cohesive visual identity (colors: #0B0B0D black, #F4F1EC white, #E2C06E bright gold, #D4B36A accent gold)
- Mobile-first, dense and scannable venue search experience
- Advanced filtering (city, event type, venue type, price, capacity, amenities, vibes)
- Compare Venues feature (up to 3 side-by-side)
- Quick Preview modal, Recently Viewed venues, Favourites
- PWA support with install prompt
- Concierge service experience integrated into booking flow
- Auth: Email/password + Google OAuth (Emergent-managed)
- Lead management: Enquiry creation, RM workflow, messaging
- Admin/RM/HR/Venue Owner dashboards
- RM mobile-first webapp for lead management
- RM onboarding with HR verification gate

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)
- **Fonts**: DM Sans (body), JetBrains Mono (numbers), Cormorant Garamond (logo)

## User Roles
- **Admin**: Platform operations, RM creation, venue management, analytics
- **HR**: Staff verification, onboarding oversight (hr@venuloq.in / hr123)
- **RM (Relationship Manager)**: Lead management, customer communication
- **Customer**: Venue search, enquiry, booking
- **Venue Owner**: Venue listing management

## What's Been Implemented

### RM Onboarding & HR Verification (Complete - March 20, 2026)
- **Admin → Create RM**: `POST /api/admin/create-rm` creates RM with name, email, temp password
  - Auto-sets `must_change_password=true`, `profile_completed=false`, `verification_status=pending`
  - "Create RM" button + modal added to Admin Users page (`AdminUsers.js`)
- **RM Onboarding Flow** (`RMOnboarding.js`):
  - Step 1: Force password change (`POST /api/auth/change-password`)
  - Step 2: Profile completion — phone, address, emergency contact, photo upload (`PUT /api/auth/rm-profile`, `POST /api/auth/rm-profile-photo`)
  - Step 3: "Awaiting HR Verification" holding screen
  - 3-step progress indicator with check marks for completed steps
  - `ProtectedRoute` in `App.js` intercepts RMs needing onboarding
- **Login Gate**: After profile completion, RM login blocked with 403 until HR approves
- **HR Dashboard** (`/hr/dashboard` — `HRDashboard.js`):
  - Stats cards: Pending, Verified, Rejected, Incomplete
  - Tab-based filtering of RM list
  - Expandable RM cards with full profile details
  - Approve/Reject buttons with success notifications
  - DashboardLayout sidebar with "Human Resources" branding
- **Testing**: 100% pass — 19 backend API tests + all frontend UI flows (iteration_110)

### RM Webapp & Lead Workflow (Complete)
- Backend workflow API (workflow.py): 9-stage pipeline, messaging, notes, timeline
- RM Dashboard (lead list with search + filters) and Lead Detail (messaging, stage advancement)
- 100% test pass rate (iteration_109)

### Booking Flow, Landing Page, Search, PWA (Complete)
- See previous session notes. All features stable.

## DB Schema
- **users**: `{ user_id, email, password_hash, name, role, status, must_change_password, profile_completed, verification_status, verified_by, verified_at, phone, address, emergency_contact_name, emergency_contact_phone, profile_photo, created_by, created_at, updated_at }`
- **leads**: `{ lead_id, customer_name, customer_email, customer_phone, venue_ids, city, rm_id, stage, activity_log, messages, created_at }`
- **venues**: `{ venue_id, name, slug, city, images, capacity_min, capacity_max, pricing, amenities, vibes }`

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
### Auth & Onboarding
- `POST /api/auth/login` — Login with verification gate for RMs
- `POST /api/auth/change-password` — Force password change
- `PUT /api/auth/rm-profile` — RM profile update
- `POST /api/auth/rm-profile-photo` — Base64 photo upload
- `GET /api/auth/me` — Current user with onboarding status

### Admin
- `POST /api/admin/create-rm` — Create new RM account

### HR
- `GET /api/hr/dashboard` — HR stats
- `GET /api/hr/staff` — All staff list
- `GET /api/hr/pending` — Pending verifications
- `PATCH /api/hr/verify/{user_id}` — Approve/reject RM

### RM Workflow
- `GET /api/workflow/my-leads` — RM's assigned leads
- `PATCH /api/workflow/{lead_id}/stage` — Advance lead stage
- `POST /api/workflow/{lead_id}/message` — Send message
- `POST /api/workflow/{lead_id}/note` — Add note

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED (messages stored but not sent)

## Upcoming Tasks (P1)
- WhatsApp integration via Twilio for RM-to-customer messaging

## Future/Backlog (P2+)
- Refactor LandingPage.js & VenuePublicPage.js (dedup, shared Header.js)
- Razorpay production setup
- SEO meta tags, Open Graph, JSON-LD structured data
- "List Your Venue" partner landing page
- SMS notifications (Twilio)
- Performance optimization
