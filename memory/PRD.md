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
- **Customer**: Venue search, enquiry, booking
- **Venue Owner / Event Planner / Finance / Operations / Marketing**: Future expansion roles

## What's Been Implemented

### Employee Onboarding & HR Document Management (Complete - March 20, 2026)
- **Admin → Create Employee**: `POST /api/admin/create-employee` creates any role (rm, hr, venue_owner, event_planner, finance, operations, marketing) with temp password
  - "Create Employee" button + modal with role dropdown in Admin Users page
- **Employee Onboarding Flow** (`RMOnboarding.js`):
  - Works for ALL managed roles (not just RMs)
  - Step 1: Force password change
  - Step 2: Profile completion (phone, address, emergency contact, photo)
  - Step 3: Awaiting HR verification
  - Login gate blocks ALL managed roles until HR approves
- **HR Document Management**:
  - 7-item standard checklist: ID Proof, Offer Letter, Bank Details, Address Proof, Emergency Contact Form, Educational Certificates, Background Verification
  - HR uploads documents per employee (`POST /api/hr/employee/{user_id}/documents`)
  - HR marks each document verified (`PATCH /api/hr/employee/{user_id}/documents/{doc_id}`)
  - Document preview (inline images), re-upload, delete functionality
  - Progress bar showing X/7 verified
- **HR Dashboard** (`/hr/dashboard` → `/hr/employee/{userId}`):
  - Stats cards: Pending, Verified, Rejected, Incomplete
  - All managed roles shown with color-coded role badges
  - Document count (X/7) per employee
  - Click-through to employee detail page with full document checklist
  - Approve/Reject buttons per employee
- **Testing**: Backend 100% (20 tests), Frontend 100% (iteration_111)

### RM Webapp & Lead Workflow (Complete)
- Backend: 9-stage pipeline, messaging, notes, timeline
- Frontend: Mobile-first RM dashboard + lead detail pages
- Testing: 100% (iteration_109)

### Booking Flow, Landing Page, Search, PWA (Complete)

## DB Schema
- **users**: `{ user_id, email, password_hash, name, role, status, must_change_password, profile_completed, verification_status, verified_by, verified_at, phone, address, emergency_contact_name, emergency_contact_phone, profile_photo, created_by, created_at }`
- **onboarding_documents**: `{ doc_id, user_id, doc_type, file_name, file_data (base64), status (pending/verified), notes, uploaded_by, uploaded_by_name, uploaded_at, verified_by, verified_by_name, verified_at }`
- **leads, venues, favorites, push_subscriptions**: See previous versions

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Key API Endpoints
### Employee Management
- `POST /api/admin/create-employee` — Admin creates any employee type
- `POST /api/auth/change-password` — Force password change
- `PUT /api/auth/rm-profile` — Employee profile update (all roles)
- `POST /api/auth/rm-profile-photo` — Profile photo upload

### HR & Documents
- `GET /api/hr/dashboard` — HR stats (all roles)
- `GET /api/hr/staff` — All staff (filterable by role, status)
- `GET /api/hr/pending` — Pending verifications
- `PATCH /api/hr/verify/{user_id}` — Approve/reject employee
- `GET /api/hr/document-types` — Standard 7-item checklist template
- `GET /api/hr/employee/{user_id}/documents` — Employee document checklist
- `POST /api/hr/employee/{user_id}/documents` — Upload document
- `PATCH /api/hr/employee/{user_id}/documents/{doc_id}` — Mark verified/pending
- `DELETE /api/hr/employee/{user_id}/documents/{doc_id}` — Delete document

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
- Build dedicated dashboards for Finance, Operations, Marketing roles
- Performance optimization
