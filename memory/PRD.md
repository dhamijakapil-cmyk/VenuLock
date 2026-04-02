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

## Current Status: Field Workflow Phases 1–10 Complete

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
- **Field Workflow Phase 1**: Specialist mobile workflow
- **Field Workflow Phase 1.5**: Quick Capture
- **Field Workflow Phase 2**: Team Lead Review
- **Field Workflow Phase 3**: Data Team Refinement
- **Field Workflow Phase 4**: Venue Manager Approval
- **Field Workflow Phase 5**: Owner Onboarding / Digital Acceptance
- **Field Workflow Phase 6**: RM Mobile Dashboard
- **Field Workflow Phase 7**: Real Communication + RM Execution Continuity
- **Field Workflow Phase 8**: Supply Activation + Publish Governance
- **Field Workflow Phase 9**: Public Discovery Ranking + Internal Matching Governance
- **Field Workflow Phase 10**: Commercial Conversion Workflow

### Field Workflow Architecture
```
Frontend Routes (in TeamApp.js):
  /team/field              -> SpecialistDashboard
  /team/field/prep         -> VisitPrepScreen
  /team/field/review         -> TeamLeadQueue
  /team/field/review/:acqId  -> TeamLeadReviewDetail
  /team/field/refine         -> DataTeamQueue
  /team/field/refine/:acqId  -> DataTeamEditor
  /team/field/approve        -> ManagerQueue
  /team/field/approve/:acqId -> ManagerApprovalDetail
  /team/field/onboarding/:acqId -> OnboardingMonitor
  /team/field/quick         -> QuickCaptureScreen
  /team/field/capture/new  -> VenueCaptureForm
  /team/field/capture/:id  -> VenueCaptureForm (resume/edit)
  /team/field/publish       -> PublishQueue
  /team/field/publish/:acqId -> PublishDetail

  Public (App.js):
  /onboarding/:token -> OwnerOnboardingPage

  RM Mobile (TeamApp.js):
  /team/rm/dashboard      -> RMDashboard
  /team/rm/leads/:leadId  -> RMLeadDetail
  /team/rm/my-performance -> RMMyPerformance
  /team/rm/conversion     -> ConversionCases (NEW Phase 10)
  /team/rm/conversion/:leadId -> ConversionCaseDetail (NEW Phase 10)

Backend Routes (conversion.py — Phase 10):
  POST   /api/conversion/intake                              -> Create/enrich conversion case
  GET    /api/conversion/cases                               -> List cases (action-first, urgency-sorted)
  GET    /api/conversion/cases/{lead_id}                     -> Full case detail
  POST   /api/conversion/cases/{lead_id}/stage               -> Stage transition (validated)
  POST   /api/conversion/cases/{lead_id}/shortlist/{id}/status -> Shortlist status update
  POST   /api/conversion/cases/{lead_id}/quotes              -> Create/update quote
  POST   /api/conversion/cases/{lead_id}/visits              -> Create site visit
  POST   /api/conversion/cases/{lead_id}/visits/{id}         -> Update site visit
  POST   /api/conversion/cases/{lead_id}/negotiation         -> Start negotiation
  POST   /api/conversion/cases/{lead_id}/negotiation/{id}    -> Update negotiation
  GET    /api/conversion/cases/{lead_id}/booking-readiness    -> Get readiness gate
  POST   /api/conversion/cases/{lead_id}/booking-readiness    -> Update readiness checks
  POST   /api/conversion/cases/{lead_id}/confirm-booking      -> Confirm booking (gate enforced)

Roles: venue_specialist (field), vam (team lead), data_team, venue_manager, rm, admin
```

### Phase 10: Commercial Conversion Workflow — COMPLETE (April 2026)
- **Single source of truth**: Extends the `leads` collection as the canonical conversion object. No dual-truth parallel system.
- **Stage pipeline**: enquiry_received → requirement_qualified → venues_shortlisted → quote_requested → quote_received → site_visit_planned → site_visit_completed → negotiation_in_progress → commercial_accepted → booking_confirmation_pending → booking_confirmed | lost
- **Backward compatibility**: Old stages (new, contacted, shortlisted, site_visit, negotiation) normalized to new pipeline
- **Case intake discipline**: Enquiry/callback = valid trigger. Enriches existing active case (by email/phone) before creating new.
- **Action-first case list**: urgency strip (overdue/blocked/urgent/active), search, stage filters, case cards with next-action, quick-call/WhatsApp
- **Tabbed case detail**: Overview (customer info, stage pipeline, conversion meta) | Shortlist (per-venue status progression) | Quotes (create/update with revision history) | Site Visits (schedule/update/complete) | Negotiations (counter history, ask/offer gap tracking) | Booking Readiness (6-check gate)
- **Booking readiness gate** (all 6 required): requirement_confirmed, final_venue_selected, commercial_terms_agreed, customer_contact_confirmed, payment_milestone_recorded, booking_date_locked
- **Audit discipline**: All stage changes, quote updates, visit updates, negotiation actions, shortlist changes, and booking confirmations log: user, role, timestamp, reason/note
- **Stage validation**: Only allowed forward transitions (configurable per stage). Admin can bypass.
- Backend: /api/conversion/* (14 endpoints)
- Frontend: ConversionCases.js (case list), ConversionCaseDetail.js (6-tab detail + modals)
- Testing: 37/38 backend (1 expected: legacy leads missing booking_readiness field), 100% frontend (iteration_145)

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
- iteration_139: 13/13 backend + 12/12 frontend PASS (Venue Manager Approval Phase 4)
- iteration_140: 18/20 backend (2 skipped) + 12/12 frontend PASS (Owner Onboarding Phase 5)
- iteration_141: 36/36 backend + 16/16 frontend PASS (RM Mobile Dashboard Phase 6)
- iteration_143: 39/39 backend PASS (Supply Activation + Publish Governance Phase 8)
- iteration_144: 35/36 backend (1 skipped) PASS (Public Discovery Ranking Phase 9)
- iteration_145: 37/38 backend (1 expected legacy) + 100% frontend PASS (Commercial Conversion Phase 10)

### Pending External Dependencies
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` -> backend env
- [ ] `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` -> backend env
- [ ] `REACT_APP_SUPPORT_PHONE` -> real VenuLoQ number
- [ ] `REACT_APP_BACKEND_URL` -> update to production domain
- [ ] Domain DNS: delhi.venuloq.com -> production server
- [ ] Xcode: Add "Sign in with Apple" capability
- [ ] Google OAuth consent screen verification/publishing

## Test Credentials
- Specialist: specialist@venuloq.in / test123 (venue_specialist)
- Team Lead: teamlead@venuloq.in / test123 (vam)
- Data Team: datateam@venuloq.in / test123 (data_team)
- Manager: venuemanager@venuloq.in / test123 (venue_manager)
- Customer: democustomer@venulock.in / password123
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123

## Key Documents
- `frontend/PRELAUNCH_QA_CHECKLIST.md` -- Device testing checklist
- `frontend/IOS_BUILD_GUIDE.md` -- Xcode/TestFlight build guide
- `backend/ranking/PHASE0_DATA_READINESS.md` -- Full data audit for ranking engine

## Do NOT Start
- Facebook Login, Vendor payouts, "List Your Venue", SEO, Production Razorpay
