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
- Single monorepo: all internal workflows live in the same codebase as Team Portal

## Current Status: Phases 1–13 Complete

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

**Parts:** Execution Board, Event-Day Coordination, Incident/Issue Logging, Post-Booking Addendum Discipline, Event Completion, Closure Readiness Gate (5 checks).

**Files:**
- `backend/routes/execution.py` — ~1276 lines (14+ endpoints)
- `frontend/src/pages/rm/ExecutionDashboard.js` — 9-status model
- `frontend/src/pages/rm/ExecutionDetail.js` — 6 tabs: Handoff, Team, Prep, Event Day, Changes, Closure

**Testing:** 45/45 backend (100%), 100% frontend (iteration_147)

### Phase 13: Financial Closure + Settlement Governance — COMPLETE (April 2026)

**Settlement Status Model (8 statuses):**
closure_ready → settlement_pending → collection_verification_pending → payable_commitments_pending → settlement_under_review → settlement_ready → settlement_blocked → financial_closure_completed

**Settlement Handoff:** Generates settlement package from closure_ready event with booking snapshot, addenda, incidents, and commercial adjustments.

**Collection Verification:** 5 statuses (pending, partial, received, verification_pending, verified). Tracks expected/received amounts, blocker, and verification note.

**Payable Commitments:** Venue and vendor payable tracking. Completeness (complete, partial, missing_data). Dispute/hold flag with notes.

**Payout Readiness (Advisory Only):** 5 postures (payout_ready, payout_not_ready, payout_readiness_unclear, payout_blocked_by_dispute_or_hold, payout_readiness_pending_verification). No automated payout authority.

**Financial Closure Gate (5 checks):** event_closure_complete, collection_verified, payable_commitments_captured, blockers_resolved, settlement_note_complete. All must pass to close.

**Files:**
- `backend/routes/settlement.py` — ~570 lines (10+ endpoints)
- `frontend/src/pages/rm/SettlementDashboard.js` — Pipeline view with summary, search, filters
- `frontend/src/pages/rm/SettlementDetail.js` — 4 tabs: Overview, Collection, Payables, Closure

**Testing:** 23/23 backend (100%), 100% frontend (iteration_148)

### Team Portal Navigation Consolidation — COMPLETE (April 2026)

**Problem:** Conversion, Execution, and Settlement workflows were built and routed but invisible in Team Portal navigation.

**Resolution (not a migration — all code was already in the same monorepo):**
- Wired `settlement.py` into `server.py`
- Updated `DashboardLayout.js` sidebar for RM: Home, Pipeline, Conversion, Execution, Settlement, My Performance
- Updated `TeamWelcome.js` quick actions for RM: My Pipeline, Conversion, Execution, Settlement, Performance
- Updated `RMDashboard.js` header: added settlement icon (₹) link
- Added `TeamApp.js` routes: `/rm/settlement`, `/rm/settlement/:leadId`

### All QA Results
| Iteration | Phase | Backend | Frontend |
|-----------|-------|---------|----------|
| 145 | Phase 10: Conversion | 37/38 | 100% |
| 146 | Phase 11: Handoff | 38/38 | 100% |
| 147 | Phase 12: Execution + Closure | 45/45 | 100% |
| 148 | Phase 13: Settlement + Navigation | 23/23 | 100% |

### Key Routes
```
/team/rm/conversion           -> ConversionCases
/team/rm/conversion/:leadId   -> ConversionCaseDetail (6 tabs)
/team/rm/execution            -> ExecutionDashboard
/team/rm/execution/:leadId    -> ExecutionDetail (6 tabs)
/team/rm/settlement           -> SettlementDashboard
/team/rm/settlement/:leadId   -> SettlementDetail (4 tabs)
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
