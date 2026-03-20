# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build and iteratively refine a comprehensive venue booking platform with a premium "hospitality-tech" / "concierge" aesthetic. The platform serves as a marketplace connecting event planners with curated venues across India.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## User Roles
- **Admin**: Platform operations, employee creation, venue management, analytics
- **HR**: Staff verification, document management, onboarding oversight
- **RM**: Lead management, customer communication
- **Venue Specialist**: Field agent, visits venues, fills onboarding form (mobile-first)
- **VAM (Venue Acquisition Manager)**: Reviews/approves venue submissions
- **Customer**: Venue search, enquiry, booking
- **Venue Owner**: Venue profile management (post-approval)
- **Event Planner / Finance / Operations / Marketing**: Future expansion roles

## What's Been Implemented

### Venue Acquisition Workflow (Complete - March 20, 2026)
- **Two new roles**: `venue_specialist` (field agent) and `vam` (Venue Acquisition Manager)
- **Backend** (`/app/backend/routes/venue_onboarding.py`):
  - Full REST API: create, read, update, delete, media upload/remove, submit, review
  - Venue statuses: draft → submitted → approved / changes_requested / rejected
  - On approval, auto-publishes to main venues collection with proper schema
  - Validation: submit requires name, city, at least 1 photo
  - Specialist can only see/edit their own venues
  - VAM notifications on new submissions, Specialist notifications on review decisions
- **Specialist Dashboard** (mobile-first, `/specialist/dashboard`):
  - Stats bar (Drafts, In Review, Approved, Changes), filter chips, venue cards with thumbnails
  - Floating + button to add new venue
  - Click venue card to edit
- **7-Step Venue Form** (`/specialist/venue/new` or `/:id`):
  - Step 1: Basic Info (name, venue type selector, description)
  - Step 2: Location (address, city, Google Maps link)
  - Step 3: Capacity & Pricing (min/max guests, per person price, min spend)
  - Step 4: Amenities & Vibes (17 amenities, 12 vibes — tap to toggle)
  - Step 5: Photos & Videos (upload, preview, remove, COVER badge on first photo)
  - Step 6: Owner Contact (name, phone, email)
  - Step 7: Review & Submit (summary of all fields)
  - Auto-save on each step advance, progress bar, review notes banner for changes_requested
- **VAM Dashboard** (`/vam/dashboard`):
  - DashboardLayout with sidebar, stats cards (Pending, Approved, Changes Sent, Rejected)
  - Click-through to full venue review page
- **VAM Review Page** (`/vam/venue/:id`):
  - Full venue details with photo gallery, all sections
  - Review decision: Approve & Publish / Request Changes (with notes) / Reject
- **Testing**: Backend 100% (26 tests), Frontend 100% (iteration_112)

### Employee Onboarding & HR (Complete)
- Admin creates any employee type (9 roles) with temp password
- Onboarding flow: password change → profile completion → HR verification
- HR document checklist (7 items), upload, verify per employee
- HR Dashboard with stats, employee list, detail page

### RM Webapp & Lead Workflow (Complete)
- 9-stage pipeline, messaging, notes, timeline
- Mobile-first RM dashboard + lead detail

### Booking Flow, Landing Page, Search, PWA (Complete)

## DB Schema
- **venue_onboarding**: `{ venue_onboarding_id, status, name, venue_type, description, address, city, map_link, capacity_min, capacity_max, per_person_price, min_spend, amenities[], vibes[], photos[{id, url, caption}], videos[{id, url, caption}], owner_name, owner_phone, owner_email, created_by, created_by_name, submitted_at, reviewed_by, review_notes, published_venue_id, created_at }`
- **users**: `{ user_id, email, password_hash, name, role, status, must_change_password, profile_completed, verification_status, ... }`
- **onboarding_documents**: `{ doc_id, user_id, doc_type, file_name, file_data, status, ... }`
- **venues, leads, lead_activity, lead_messages, favorites, push_subscriptions**: See previous versions

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
### Venue Onboarding
- `POST /api/venue-onboarding/create` — Specialist creates draft
- `GET /api/venue-onboarding/my-submissions` — Specialist's venues
- `GET /api/venue-onboarding/{id}` — Full venue details
- `PUT /api/venue-onboarding/{id}` — Update draft
- `POST /api/venue-onboarding/{id}/media` — Add photo/video
- `DELETE /api/venue-onboarding/{id}/media/{media_id}` — Remove media
- `POST /api/venue-onboarding/{id}/submit` — Submit for review
- `GET /api/venue-onboarding/review-queue` — VAM pending queue
- `PATCH /api/venue-onboarding/{id}/review` — Approve/reject/changes
- `GET /api/venue-onboarding/options` — Venue types, amenities, vibes
- `GET /api/venue-onboarding/stats` — Dashboard stats

## Known Issues
- Razorpay is in test mode
- WhatsApp delivery is MOCKED

## Upcoming Tasks (P1)
- WhatsApp integration via Twilio for RM-to-customer messaging
- Venue Owner portal: edit approved venue, submit changes for VAM approval

## Future/Backlog (P2+)
- Refactor LandingPage.js & VenuePublicPage.js
- Razorpay production, SEO, partner landing page
- Dedicated dashboards for Finance, Operations, Marketing
- SMS notifications
