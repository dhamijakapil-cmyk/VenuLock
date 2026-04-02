# VenuLoQ - Premium Venue Booking Marketplace

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB (Motor async)
- **Integrations**: Resend, Custom Google OAuth, Apple Sign In, Razorpay (test mode), VAPID Push
- **Native**: Capacitor v7 (iOS wrapper)

## Architecture
- Customer App + Team Portal — hostname-based routing
- PWA (web) + iOS App (Capacitor)
- Domain: delhi.venuloq.com (customer), teams.venuloq.com (internal)

## Current Status: Phases 1–12 Complete

### Phase 10: Commercial Conversion — COMPLETE
- Single source of truth on `leads` collection (no dual-truth)
- 12-stage pipeline: enquiry_received → booking_confirmed | lost
- Booking readiness gate: 6 checks required before confirm
- Testing: 37/38 backend, 100% frontend (iteration_145)

### Phase 11: Booking Commitment + Execution Handoff — COMPLETE
- Handoff package with locked commercial snapshot (immutable)
- Execution owner/team assignment with acknowledgement
- Pre-event checklist with auto-computed readiness posture
- Change request discipline (5 types)
- Testing: 38/38 backend, 100% frontend (iteration_146)

### Phase 12: Event Execution Coordination + Closure — COMPLETE (April 2026)

**Execution Status Model (9 statuses):**
handoff_pending → assigned → in_preparation → ready_for_event → event_live → issue_active → event_completed → closure_note_pending → closure_ready

**Part 1 — Execution Board:** Dashboard showing today's events, upcoming, execution status, owner, readiness, incidents, approaching-soon alerts. Sorted: today → live → issue_active → approaching → blocked.

**Part 2 — Event-Day Coordination:** Setup status tracking (not_started/in_progress/complete), venue readiness confirmation, customer readiness confirmation, real-time timeline entries (7 types: note, setup, milestone, issue_raised, issue_resolved, customer_update, vendor_update).

**Part 3 — Incident/Issue Logging:** 7 types (vendor/venue/customer/logistics/quality/safety/other), 4 severities (low/medium/high/critical), 4 statuses (open/investigating/resolved/escalated). High/critical auto-sets execution_status to issue_active; resolving last severe incident reverts to event_live.

**Part 4 — Post-Booking Addendum Discipline:** Original booking_snapshot is NEVER overwritten. Changes tracked as versioned addenda (v1, v2, v3...) with field_changed, original_value, new_value, reason, approved_by. Linked to change requests.

**Part 5 — Event Completion:** Marks event complete, captures major_issue flag, completion note, post-event actions. Sets execution_status to event_completed, initializes closure.

**Part 6 — Closure Readiness Gate (5 checks):** event_completed, critical_issues_resolved, closure_note_present, post_event_tasks_done, change_history_intact. All must pass to close event.

**Files:**
- `backend/routes/execution.py` — Extended to ~1276 lines (14+ endpoints)
- `frontend/src/pages/rm/ExecutionDashboard.js` — Updated with 9-status model
- `frontend/src/pages/rm/ExecutionDetail.js` — 6 tabs: Handoff, Team, Prep, Event Day, Changes, Closure

**Testing:** 45/45 backend (100%), 100% frontend (iteration_147)

### All QA Results
| Iteration | Phase | Backend | Frontend |
|-----------|-------|---------|----------|
| 145 | Phase 10: Conversion | 37/38 | 100% |
| 146 | Phase 11: Handoff | 38/38 | 100% |
| 147 | Phase 12: Execution + Closure | 45/45 | 100% |

### Key Routes
```
/team/rm/conversion           -> ConversionCases
/team/rm/conversion/:leadId   -> ConversionCaseDetail (6 tabs)
/team/rm/execution            -> ExecutionDashboard
/team/rm/execution/:leadId    -> ExecutionDetail (6 tabs)
```

### Pending External Dependencies
- [ ] GOOGLE_CLIENT_ID/SECRET
- [ ] APPLE_CLIENT_ID/TEAM_ID/KEY_ID/PRIVATE_KEY
- [ ] REACT_APP_SUPPORT_PHONE
- [ ] Production domain DNS
- [ ] Xcode Sign in with Apple capability

## Test Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123
- Specialist: specialist@venuloq.in / test123
- Team Lead: teamlead@venuloq.in / test123

## Do NOT Start
- Facebook Login, Vendor payouts, SEO, Production Razorpay
