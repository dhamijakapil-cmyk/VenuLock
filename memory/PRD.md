# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic for Delhi NCR.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB (Motor async)
- **Integrations**: Resend (email), Custom Google OAuth, Apple Sign In, Razorpay (test mode), VAPID Push
- **Native**: Capacitor v7 (iOS wrapper)

## Architecture
- Customer App + Team Portal — single codebase, hostname-based routing
- Two deployments: PWA (web) + iOS App (Capacitor)
- Platform detection: `isCapacitor()` for iOS-only features
- Single-source contact config: `config/contact.js` -> `REACT_APP_SUPPORT_PHONE`

## Domain Configuration
- **Brand**: venuloq.com | **Customer (prod)**: delhi.venuloq.com | **Test**: testing.delhi.venuloq.com | **Internal**: teams.venuloq.com

## Current Status: Field Workflow Phases 1–11 Complete

### Phase 10: Commercial Conversion Workflow — COMPLETE
- Single source of truth on `leads` collection (no dual-truth)
- 12-stage pipeline: enquiry_received → booking_confirmed | lost
- Case intake discipline, action-first case list, 6-tab detail (Overview/Shortlist/Quotes/Visits/Negotiation/Readiness)
- Booking readiness gate: 6 checks required before confirm
- Full audit logging on all actions
- Testing: 37/38 backend, 100% frontend (iteration_145)

### Phase 11: Booking Commitment + Execution Handoff — COMPLETE (April 2026)
**Part 1 — Booking handoff package**
- `POST /api/execution/{lead_id}/handoff` creates structured handoff: selected venue, final commercial snapshot, event date/time, guest count, event type, customer requirements, promises, RM handoff notes
- Auto-resolves venue/quote/negotiation data from shortlist and quotes collections
- Snapshot is immutable once locked (`snapshot_locked_at`)

**Part 2 — Confirmed booking snapshot**
- Locks: chosen venue, accepted commercial terms (final_amount, per_plate, inclusions/exclusions), booking date, event type, guest count
- Stored on leads doc as `booking_snapshot` — not loosely editable, change requests required for modifications

**Part 3 — Execution owner / team assignment**
- `POST /api/execution/{lead_id}/assign` — assign execution owner + optional supporting team
- `POST /api/execution/{lead_id}/acknowledge` — handoff acknowledgement
- `POST /api/execution/{lead_id}/handoff-status` — progression: pending → assigned → acknowledged → in_preparation → ready
- Full audit trail on all assignment/status changes

**Part 4 — Pre-event workflow**
- 8 default checklist items auto-created on handoff (venue_coordination, customer_communication, logistics, payment)
- Custom items addable via `POST /api/execution/{lead_id}/checklist`
- Status per item: pending | in_progress | done | blocked | na
- Auto-computed readiness posture: not_started | in_progress | blocked | ready
- Readiness synced back to leads doc for dashboard visibility

**Part 5 — Change request discipline**
- 5 structured types: customer_requirement, venue_change, commercial_change, schedule_change, special_requirement
- CR statuses: open → under_review → approved/rejected/implemented
- Each CR logs: description, impact, requested_by, resolution, resolved_by
- Full audit trail

**Part 6 — Internal visibility**
- `GET /api/execution/dashboard` — confirmed bookings sorted by: approaching soon → blocked → no_handoff → days_until_event
- Summary counts: total, no_handoff, pending, assigned, in_preparation, ready, blocked, approaching_soon
- Approaching soon alert (events within 7 days)

**Files created/changed:**
- `backend/routes/execution.py` — NEW: 14 endpoints
- `backend/server.py` — Wired execution_router + legacy backfill migration
- `frontend/src/pages/rm/ExecutionDashboard.js` — NEW: Dashboard with summary strip, filters, event cards
- `frontend/src/pages/rm/ExecutionDetail.js` — NEW: 4-tab detail (Handoff/Team/Checklist/Changes) + 8 modals
- `frontend/src/TeamApp.js` — Added routes /team/rm/execution, /team/rm/execution/:leadId
- `frontend/src/pages/rm/RMDashboard.js` — Added Execution quick-access icon

**Legacy cleanup:** Startup migration backfills `booking_readiness` and `conversion_meta` on all leads missing these fields.

**Testing:** 38/38 backend, 100% frontend (iteration_146)

### QA Results
- iteration_145: 37/38 backend + 100% frontend PASS (Commercial Conversion Phase 10)
- iteration_146: 38/38 backend + 100% frontend PASS (Booking Commitment + Execution Handoff Phase 11)

### Pending External Dependencies
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` -> backend env
- [ ] `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` -> backend env
- [ ] `REACT_APP_SUPPORT_PHONE` -> real VenuLoQ number
- [ ] `REACT_APP_BACKEND_URL` -> update to production domain
- [ ] Xcode: Add "Sign in with Apple" capability
- [ ] Google OAuth consent screen verification

## Test Credentials
- Specialist: specialist@venuloq.in / test123 (venue_specialist)
- Team Lead: teamlead@venuloq.in / test123 (vam)
- Data Team: datateam@venuloq.in / test123 (data_team)
- Manager: venuemanager@venuloq.in / test123 (venue_manager)
- Customer: democustomer@venulock.in / password123
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123

## Do NOT Start
- Facebook Login, Vendor payouts, "List Your Venue", SEO, Production Razorpay
