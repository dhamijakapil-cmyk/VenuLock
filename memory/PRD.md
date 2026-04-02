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

## Current Status: Field Workflow Phases 1–6 Complete

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
- **Field Workflow Phase 4**: Venue Manager Approval — approval queue, decision posture, hard blocker guardrails, send back to Data Team or Specialist, approve/reject with audit

### Field Workflow Architecture
```
Frontend Routes (in TeamApp.js):
  /team/field              -> SpecialistDashboard (captures list, stats, new capture CTA)
  /team/field/prep         -> VisitPrepScreen (pre-visit checklist)
  /team/field/review         -> TeamLeadQueue (submitted records, stats, posture pills)
  /team/field/review/:acqId  -> TeamLeadReviewDetail (detail view + action modals)
  /team/field/refine         -> DataTeamQueue (refinement queue with tabs)
  /team/field/refine/:acqId  -> DataTeamEditor (grouped editor + Ven-Us assist panel)
  /team/field/approve        -> ManagerQueue (approval queue with tabs including Onboarding)
  /team/field/approve/:acqId -> ManagerApprovalDetail (decision posture + actions + onboarding CTA)
  /team/field/onboarding/:acqId -> OnboardingMonitor (send/resend, timeline, acceptance record)
  /team/field/quick         -> QuickCaptureScreen (fast one-screen draft)
  /team/field/capture/new  -> VenueCaptureForm (5-step progressive wizard)
  /team/field/capture/:id  -> VenueCaptureForm (resume/edit draft)

  Public (App.js):
  /onboarding/:token -> OwnerOnboardingPage (public, no auth, tokenized access)

  RM Mobile (TeamApp.js):
  /team/rm/dashboard      -> RMDashboard (action-first urgency strip + attention/all-cases views)
  /team/rm/leads/:leadId  -> RMLeadDetail (detail with action modals: note, meeting, request-time, escalate)
  /team/rm/my-performance -> RMMyPerformance

Backend Routes (acquisitions.py):
  GET    /api/acquisitions/venus-assist/{acq_id} -> Ven-Us deterministic assist
  POST   /api/acquisitions/check-duplicate -> Dedupe check (name+phone+locality)
  POST   /api/acquisitions/              -> Create draft (supports capture_mode: quick|full)
  GET    /api/acquisitions/              -> List captures (my_only filter, comma-separated status)
  GET    /api/acquisitions/stats/summary -> Dashboard stats
  GET    /api/acquisitions/{acq_id}      -> Get single capture
  PUT    /api/acquisitions/{acq_id}      -> Update capture
  POST   /api/acquisitions/{acq_id}/status -> Status transition
  POST   /api/acquisitions/{acq_id}/photos -> Upload photos
  GET    /api/acquisitions/{acq_id}/media/{filename} -> Serve media

Backend Routes (onboarding.py):
  POST   /api/onboarding/send/{acq_id}   -> Send onboarding link (venue_manager/admin)
  GET    /api/onboarding/status/{acq_id} -> Internal onboarding status with timeline
  GET    /api/onboarding/view/{token}    -> Public: owner views onboarding (marks viewed)
  POST   /api/onboarding/accept/{token}  -> Public: owner accepts (consents + signer)
  POST   /api/onboarding/decline/{token} -> Public: owner declines (optional reason)

Roles: venue_specialist (field), vam (team lead), data_team, venue_manager, admin
Status Pipeline: draft -> submitted_for_review -> sent_back/under_refinement -> awaiting_approval -> approved -> owner_onboarding_sent -> owner_onboarding_viewed -> owner_onboarding_completed/declined/expired -> publish_ready
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
- iteration_138: 12/14 backend (2 skipped — test order) + 12/12 frontend PASS (Data Team Refinement Phase 3)
- iteration_139: 13/13 backend + 12/12 frontend PASS (Venue Manager Approval Phase 4)
- iteration_140: 18/20 backend (2 skipped — token invalidated by resend) + 12/12 frontend PASS (Owner Onboarding Phase 5)
- iteration_141: 36/36 backend + 16/16 frontend PASS (RM Mobile Dashboard Phase 6)

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

### Phase 4: Venue Manager Approval -- COMPLETE (April 2026)
- Approval queue at /team/field/approve with tabs (Pending, Approved, Rejected)
- Decision posture: Ven-Us readiness banner (Hard Blockers / Needs Fixes / Almost Ready / Ready)
- Posture grid: Field Completeness, Media Quality, Commercial Summary, Publishability
- Hard blocker guardrail: prevents approval if blockers exist (backend + frontend)
- Send back with target selector (Data Team preferred, Specialist if field issue)
- All actions require reason (except approve which has optional note)
- Audit: venus_posture_at_decision logged at approval time
- REWORK badge on cards with send-back history

### Phase 5: Owner Onboarding / Digital Acceptance -- COMPLETE (April 2026)
- Public tokenized onboarding page at /onboarding/:token (no login required, splash screen skipped)
- Plain-language commercial summary: 5-point summary covering venue listing, representation, lead/booking/commission framework, content/photos, platform terms
- Consent checkboxes: publish (required), commercial, platform terms (required), media usage
- Digital acceptance with signer name, IP address, user agent, and terms version
- Decline flow with optional reason
- Token security: SHA-256 tokens, 7-day expiry, invalidation, viewed timestamp, used-token handling
- Error states: invalid token (404), expired token (410), already-accepted, already-declined
- Internal onboarding monitor at /team/field/onboarding/:acqId (venue_manager/admin)
- Timeline: Link Generated -> Link Sent -> Owner Viewed -> Owner Accepted/Declined
- Send/resend with channel selection (WhatsApp + Email), send history
- Acceptance record: signer name, accepted_at, terms_version, IP, user agent
- Manager queue "Onboarding" tab showing all onboarding-state venues with status badges
- Manager approval detail "View Onboarding Monitor" CTA for approved/onboarding-status venues
- Audit trail: issued_at, issued_by, channels, viewed_at, signer_name, accepted_at, decline reason, terms version
- Status pipeline: approved -> owner_onboarding_sent -> owner_onboarding_viewed -> owner_onboarding_completed/declined/expired

### Phase 6: RM Mobile Dashboard -- COMPLETE (April 2026)
- Action-first dashboard with urgency strip: Overdue, Today's Follow-ups, Blocked, Active counts
- "Needs Attention" view: Sections for overdue items, today's follow-ups, blocked cases, recent activity
- "All Cases" view: Search bar, stage filter chips, case cards with client name, event type, city/area, stage badge, OVERDUE/BLOCKED flags
- Quick actions on cards: Call, WhatsApp, Details
- Lead detail: Customer info card, collapsible stage progress, activity timeline, messages tab
- 4 action buttons: Note, Meeting Outcome, Request More Time, Escalate Blocker (all bottom-sheet modals)
- Meeting Outcome: Positive/Neutral/Negative/No Show outcome, summary, next action, optional follow-up date auto-creation
- Request More Time: Mandatory reason, days selector (1d-7d), logged to timeline
- Escalate Blocker: Severity (Low/Medium/High), mandatory reason, active banner with Resolve button
- Blocker discipline: reason mandatory, timestamp, role/user logged, visible in history and timeline
- Stage advance with optional note, "Mark Lost" option
- Backend: /api/workflow/rm/action-summary, /request-time, /escalate, /resolve-blocker, /meeting-outcome
- Enriched my-leads with follow_up_date, is_overdue, blocker data

### Phase 7: Real Communication + RM Execution Continuity -- COMPLETE (April 2026)
- 7A: Real Resend email delivery for Owner Onboarding (with WhatsApp deep-link fallback)
- 7B: RM Shortlist/Share workflow (search, add/remove, tokenized public share, customer feedback)
- 7C: RM Follow-up continuity alerts (bell icon, priority-grouped: new_assignment, overdue, upcoming, blocker_reminder)
- Backend: /api/onboarding/send (Resend emails), /api/shortlist/* (public & internal), /api/workflow/rm/alerts
- Frontend: ShortlistPublicPage.js (public), RMDashboard.js alert bell, RMLeadDetail.js shortlist tab

### Phase 8: Supply Activation + Publish Governance -- COMPLETE (April 2026)
- **Status model**: owner_onboarding_completed → publish_ready → published_live → hidden_from_public / unpublished / archived
- **7-point readiness gate**: owner onboarding, identity/location fields, minimum 3 photos (manager override), pricing posture, publishable summary, no risk flags, venue active/displayable
- **Visibility controls**: publish / unpublish / hide / unhide / archive — all role-gated (venue_manager/admin; archive admin-only)
- **Public card preview**: internal preview matches real customer-facing venue card (images, pricing, capacity, event types)
- **Version discipline**: live_version (frozen snapshot), draft_version (pending edits), last_approved_version — promote-draft requires explicit confirmation + reason
- **Audit trail**: every publish/unpublish/hide/unhide/archive/draft-promote/ranking-change logged with actor, role, reason, timestamp
- **Ranking eligibility posture**: not_eligible / eligible / blocked_quality / hidden — separate from visibility
- Backend: /api/publish/* (queue, readiness, preview, publish, unpublish, hide, unhide, archive, versions, save-draft, promote-draft, audit, ranking)
- Frontend: PublishQueue.js (5 tabs: Ready/Live/Hidden/Unpublished/Archived), PublishDetail.js (5 panels: Readiness/Preview/Versions/Actions/Audit)
- ManagerQueue.js: "Publish Governance" quick-access link
- Testing: 39/39 backend tests passed, 100% frontend verified (iteration_143)

### Phase 9: Public Discovery Ranking + Internal Matching Governance -- COMPLETE (April 2026)
- **Scoring model (fit-first)**: Customer Fit (0.55), Supply Quality (0.25), Freshness (0.10), Engagement (0.10)
- **Customer Fit subfactors**: Distance/Location (0.25 — MAJOR), Event Type (0.20), Capacity (0.20), Budget (0.20), Style/Vibe (0.10), Amenity (0.05)
- **Distance scoring**: Haversine (when lat/lng available) + Zone/locality fallback. Tiers: exact_locality=100, same_zone=85, same_city=60, adjacent_city=40, far=10
- **Travel flexibility**: 5 presets dynamically adjust distance weight within fit: strictly_nearby (0.40), moderately_flexible (0.25), city_wide (0.15), willing_to_travel (0.08), destination (0.03)
- **Hard location filtering**: Strict area filter removes non-matching venues before scoring
- **Shadow/validation mode**: Default mode=validation. Engine runs but doesn't affect public ordering. Admin must explicitly switch to live.
- **Customer-facing buckets**: Best Matches, Smart Alternatives, Expert Picks
- **Admin tuning**: Weight sliders, fit subfactors, engine params (diversity, freshness boost, quality threshold, verified boost), mode toggle, config audit trail
- **Internal explain view**: Full score breakdown per venue with fit subfactors, quality, freshness, engagement bars
- Backend: /api/ranking/* (config, run, shadow, venue/{acq_id}/explain, eligible)
- Frontend: RankingAdmin.js (admin tuning), RankingShadow.js (shadow comparison + bucket view)
- Zone mappings: NCR (Delhi/Gurgaon/Noida/Faridabad), Mumbai, Bangalore, Hyderabad, Chennai
- Testing: 35/36 backend tests passed (1 skipped), 100% frontend verified (iteration_144)

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
