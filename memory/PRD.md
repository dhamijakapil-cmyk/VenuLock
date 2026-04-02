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

## Auth Configuration
| Platform | Order |
|----------|-------|
| PWA | Google -> Email/OTP -> Password |
| iOS App | Google -> Apple -> Email/OTP -> Password |

## Current Status: Field Workflow Phases 1–3 Complete

### What Is Fully Complete
- Auth hardened: 401 interceptor, visibility recheck, 20s timeout+retry on all callbacks
- Google OAuth: Full infrastructure, domain-agnostic, reads from env vars
- Apple Sign In: Full infrastructure, iOS-only via isCapacitor(), reads from env vars
- Email OTP: Primary auth on web, working with Resend
- Post-submission: "What Happens Next" 4-step timeline, RM card, WhatsApp deep link
- Push notifications: Quote received, venue shortlisted, RM assigned, all stage changes
- WhatsApp centralized: All 11 references -> single config/contact.js -> REACT_APP_SUPPORT_PHONE
- Domain audit: Zero hardcoded URLs, all redirects use window.location.origin
- Venue Ranking Engine (Shadow Mode): 5-stage pipeline, config versioning, override logging
- **Field Workflow Phase 1**: Specialist mobile workflow — dashboard, visit prep, progressive capture, draft save/resume, submit for review
- **Field Workflow Phase 1.5**: Quick Capture — one-screen fast draft, dedupe detection, capture_mode labeling, dashboard badges
- **Field Workflow Phase 2**: Team Lead Review — review queue, posture grid, detail view, send back/pass-to-data/reject actions with reason logging
- **Field Workflow Phase 3**: Data Team Refinement — refinement queue/editor, rule-based Ven-Us assist (11 checks), audit logging, mark ready for approval

### Field Workflow Architecture
```
Frontend Routes (in TeamApp.js):
  /team/field              -> SpecialistDashboard (captures list, stats, new capture CTA)
  /team/field/prep         -> VisitPrepScreen (pre-visit checklist)
  /team/field/review         -> TeamLeadQueue (submitted records, stats, posture pills)
  /team/field/review/:acqId  -> TeamLeadReviewDetail (detail view + action modals)
  /team/field/refine         -> DataTeamQueue (refinement queue with tabs)
  /team/field/refine/:acqId  -> DataTeamEditor (grouped editor + Ven-Us assist panel)
  /team/field/quick         -> QuickCaptureScreen (fast one-screen draft)
  /team/field/capture/new  -> VenueCaptureForm (5-step progressive wizard)
  /team/field/capture/:id  -> VenueCaptureForm (resume/edit draft)

Backend Routes (acquisitions.py):
  GET    /api/acquisitions/venus-assist/{acq_id} -> Ven-Us deterministic assist
  POST   /api/acquisitions/check-duplicate -> Dedupe check (name+phone+locality)
  POST   /api/acquisitions/              -> Create draft (supports capture_mode: quick|full)
  GET    /api/acquisitions/              -> List captures (my_only filter)
  GET    /api/acquisitions/stats/summary -> Dashboard stats
  GET    /api/acquisitions/{acq_id}      -> Get single capture
  PUT    /api/acquisitions/{acq_id}      -> Update capture
  POST   /api/acquisitions/{acq_id}/status -> Status transition
  POST   /api/acquisitions/{acq_id}/photos -> Upload photos
  GET    /api/acquisitions/{acq_id}/media/{filename} -> Serve media

Roles: venue_specialist (field), vam (team lead), data_team, venue_manager, admin
Status Pipeline: draft -> submitted_for_review -> sent_back/under_refinement -> awaiting_approval -> approved -> owner_onboarding -> publish_ready
```

### QA Results
- iteration_128: 24/24 PASS (auth restructure)
- iteration_129: 24/24 PASS (custom Google OAuth)
- iteration_130: 25/25 PASS (Apple Sign In)
- iteration_131: 28/28 PASS (auth hardening + journey polish)
- iteration_132: 28/28 PASS (WhatsApp centralization + final QA)
- iteration_133: 16/16 PASS (landing page hero fix, concierge boxes, compare modal)
- iteration_134: 9/9 PASS (search page filter consolidation)
- iteration_135: 11/11 backend + 17/17 frontend PASS (Field Workflow Phase 1)
- iteration_136: 11/11 backend + 14/14 frontend PASS (Quick Capture Phase 1.5)
- iteration_137: 12/12 backend + 17/17 frontend PASS (Team Lead Review Phase 2)
- iteration_138: 12/14 backend (2 skipped) + 12/12 frontend PASS (Data Team Refinement Phase 3)

### Pending External Dependencies
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` -> backend env
- [ ] `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` -> backend env
- [ ] `REACT_APP_SUPPORT_PHONE` -> real VenuLoQ number
- [ ] `REACT_APP_BACKEND_URL` -> update to production domain
- [ ] Domain DNS: delhi.venuloq.com -> production server
- [ ] Xcode: Add "Sign in with Apple" capability
- [ ] Google OAuth consent screen verification/publishing

## Ranking Engine (Built April 2026)

### Architecture
```
/app/backend/ranking/
  __init__.py
  config.py          # Default weights, rollout modes, constants
  engine.py          # 5-stage pipeline
  PHASE0_DATA_READINESS.md  # Full data audit

/app/backend/routes/ranking.py  # All ranking API endpoints
```

### Rollout Mode: **Shadow** (default -- customer ordering unchanged)

## Venue Acquisition Workflow Phases

### Phase 1.5: Quick Capture -- COMPLETE (April 2026)
- One-screen mobile form optimized for speed
- Same data model with capture_mode: quick|full
- Required: venue name, contact, phone, city, locality/GPS, venue type, capacity preset, interest level
- Optional: starting price, quick photo, follow-up date, notes
- Dedupe detection (name+phone+locality) with warning UI
- Dashboard labels: QUICK badge on quick drafts, hint to complete full details
- Saves as draft only — must open full capture to submit for review

### Phase 1: Specialist Mobile Workflow -- COMPLETE (April 2026)
- SpecialistDashboard: stats, captures list, quick filters
- VisitPrepScreen: 4-section checklist (info, commercial, media, docs)
- VenueCaptureForm: 5-step wizard (Basics, Location, Capacity & Price, Photos, Notes & Outcome)
- Draft save/resume, submit for review, completeness tracking
- Role-gated access (venue_specialist + admin only)

### Phase 2: Team Lead Review Surface -- COMPLETE (April 2026)
- Review queue at /team/field/review with stats row, posture pills, status filtering
- Review detail with posture grid (mandatory/media/commercial/notes), sections, activity log
- Send back (reason required), Pass to Data Team, Reject/Archive (reason required)
- All actions logged: user, role, timestamp, reason, notes
- Specialist sees send-back feedback on their dashboard

### Phase 3: Data Team Refinement -- COMPLETE (April 2026)
- Refinement queue at /team/field/refine with tabs (Refining, Ready, Sent Back)
- Grouped section editor with 8 collapsible sections
- Rule-based Ven-Us assist (11 deterministic checks): missing fields, weak naming, city/locality normalization, capacity/pricing inconsistency, missing media, missing tags, thin notes, missing commercial fields
- Readiness posture: ready / almost_ready / needs_fixes / not_ready
- Apply suggestions with one tap, refinement audit logging
- Mark ready for manager approval (blocked if blockers remain)
- Send back to specialist (reason required)
- Publishable summary field for listing copy

### Phase 4: Venue Manager Approval -- UPCOMING
### Phase 5: Owner Onboarding -- UPCOMING
### Phase 6: RM Mobile Dashboard -- UPCOMING

## Test Credentials
- Specialist: specialist@venuloq.in / test123 (venue_specialist)
- Team Lead: teamlead@venuloq.in / test123 (vam)
- Data Team: datateam@venuloq.in / test123 (data_team)
- Manager: venuemanager@venuloq.in / test123 (venue_manager)
- Customer: democustomer@venulock.in / password123
- Admin: admin@venulock.in / admin123

## Key Documents
- `frontend/PRELAUNCH_QA_CHECKLIST.md` -- Device testing checklist
- `frontend/IOS_BUILD_GUIDE.md` -- Xcode/TestFlight build guide
- `backend/ranking/PHASE0_DATA_READINESS.md` -- Full data audit for ranking engine

## Do NOT Start
- Facebook Login, Vendor payouts, "List Your Venue", SEO, Production Razorpay
