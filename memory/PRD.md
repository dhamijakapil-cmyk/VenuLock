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
- Single monorepo: all internal workflows in same codebase

---

## Canonical Product Rules

### RM Selection Flow — Source of Truth

> **Primary model: Customer-selected RM. Auto-assign is fallback only.**

**Canonical flow:**
1. Customer selects venue
2. Concierge / managed-service card opens
3. System checks current RM availability (`GET /api/rms/available`)
4. Customer is shown 3 RM options based on availability
5. Customer selects their RM
6. Customer verifies / submits phone number
7. System revalidates RM availability at submit (`POST /api/rms/validate-selection`)
8. Request / case is created with that selected RM
9. Success screen shows selected RM and callback SLA

**Assignment rules:**
- `selection_mode = "customer_selected"` — default when customer picks from the 3 shown
- `selection_mode = "auto_assign"` — ONLY when customer explicitly clicks "Auto-assign best available RM"
- Internal round-robin (`assign_rm_round_robin`) is the backend fallback for auto-assign mode only

**Concurrency requirements:**
- RM capacity threshold: 25 active leads per RM
- Availability checked before showing options (`checked_at` timestamp stored)
- Revalidated at final submit; HTTP 409 returned if RM became unavailable
- On 409, customer is bounced back to RM selection with fresh options
- Burst protection: stale availability snapshots cannot overload a single RM

**Lead/case fields stored:**
| Field | Type | Description |
|-------|------|-------------|
| `rm_id` | string | Selected/assigned RM user_id |
| `rm_name` | string | Selected/assigned RM name |
| `rm_selection_mode` | string | `customer_selected` or `auto_assign` |
| `rm_candidates_shown` | string[] | user_ids of the 3 RMs shown to customer |
| `rm_selection_timestamp` | ISO string | When customer made the selection |
| `rm_availability_checked_at` | ISO string | When availability was last checked |

**UX wording rules:**
- Step 1 label: "Availability" (spinner: "Checking RM Availability")
- Step 2 label: "Choose RM"
- Step 3 label: "Verify"
- Intro heading: "Choose Your Personal RM"
- NEVER use "We'll assign you a Personal RM" as default copy
- "Auto-assign best available RM" appears only as an explicit fallback option

**Notification tagging:**
- `[Customer Selected]` — when `selection_mode = customer_selected`
- No tag — when auto-assigned (fallback)

**Implementation files:**
- Backend: `booking.py` (availability endpoint, validation endpoint, booking creation), `leads.py` (lead creation with revalidation), `models/__init__.py` (LeadCreate model)
- Frontend: `EnquiryForm.js` (full flow UI, revalidation at submit, 409 handling)
- Case portal: `case_portal.py` (timeline wording)

---

## Deployment Health Check — PASSED (April 2026)
- Auth redirect URLs: `window.location.origin` across all OAuth flows
- N+1 query in leads.py fixed (batch notification fetching)
- No hardcoded secrets, all config via .env
- Supervisor config valid (FastAPI port 8001, React port 3000)
- Deployment agent status: PASS

### Phase 17: Scalability, Reliability + Capacity Intelligence — COMPLETE (April 2026)

**Scope**: Infrastructure hardening for 100 concurrent enquiries, 1000/day, 100 conversions/day.

**Database Indexes (Part 3):**
- 50+ indexes added across ALL collections (was: ZERO indexes)
- Key indexes: leads (9), users (3), venues (6), notifications (2), case_messages (2), case_payments (3)
- Idempotency keys with TTL auto-expiry (1hr)
- All indexes created idempotently on startup via `services/db_indexes.py`

**RM Concurrency Hardening (Part 2):**
- Capacity threshold: 25 active leads per RM (enforced)
- Submit-time revalidation via `POST /api/rms/validate-selection`
- HTTP 409 + bounce-back on capacity breach
- Idempotency key on lead/booking creation (X-Idempotency-Key header)
- Frontend generates unique key per submission, handles 409 duplicate gracefully

**Background Job Separation (Part 5):**
- `fire_and_forget()` wrapper in `services/background.py`
- Notifications, emails, audit logs, push notifications all moved to background
- Lead creation request path: ~200ms → <2ms (measured via load test)

**Pagination (Part 4):**
- Case threads (customer + internal): page/limit/has_more
- Customer shared items: page/limit/has_more
- Communication logs: page/limit/has_more

**Reliability Controls (Part 7):**
- Rate limiting: per-IP sliding window via `services/rate_limiter.py` (X-Forwarded-For aware)
- Idempotency: MongoDB TTL collection via `services/idempotency.py`
- RM capacity enforcement at submit

**Monitoring (Part 8):**
- `PerformanceMiddleware`: tracks request count, avg latency, slow (>2s), errors per endpoint
- Admin endpoints: `GET /api/platform-ops/performance/stats`, `/health/db`
- Automatic `[SLOW]` and `[ERROR]` logging

**File Storage (Part 6):**
- `services/file_storage.py`: abstraction layer with metadata in `file_metadata` collection
- Ready for S3/GCS swap (change `storage_backend` field)
- Max 25MB enforced

**Ven-Us Capacity Intelligence (Part 10):**
- `services/capacity_intelligence.py`: monitors RM load, SLA slippage, case ageing, queue growth
- Admin-only: `GET /api/platform-ops/capacity/analysis`
- Generates structured alerts: severity (critical/warning), category, recommendation
- Historical snapshots stored in `capacity_alerts` collection

**Load Test (Part 9):**
- Locust-based: `backend/tests/load_test.py`
- Results: RM availability p50=11ms, p95=20ms. Lead create p50=1ms. Zero 5xx errors.

**Audit Report**: `/app/backend/PERFORMANCE_AUDIT.md`

**Files created/changed:**
- NEW: `services/db_indexes.py`, `services/background.py`, `services/perf_monitor.py`, `services/rate_limiter.py`, `services/idempotency.py`, `services/capacity_intelligence.py`, `services/file_storage.py`, `routes/platform_ops.py`, `tests/load_test.py`, `PERFORMANCE_AUDIT.md`
- MODIFIED: `server.py` (middleware + startup), `routes/leads.py` (idempotency + background), `routes/booking.py` (idempotency + background), `routes/case_thread.py` (pagination), `routes/case_portal.py` (pagination)

**Testing:** iteration_160 — 100% (18/18 passed, 1 skipped rate-limit through proxy)

### Phase 17.5: Ven-Us Capacity / Workforce Health Panel — COMPLETE (April 2026)
- Admin-only visual panel at `/team/admin/capacity`
- Summary cards: today's enquiries, avg RM load, overloaded RMs, overdue follow-ups
- RM Load Distribution heatmap: color-coded bars (green <70%, amber 70-90%, red >90%) with active/capacity ratio
- Operational Backlogs: stale cases, venue approvals, settlements, follow-ups
- Ven-Us Recommendations: structured alerts with severity badges, triggering metrics, and gold-highlighted recommendations
- Advisory only disclaimer, refresh button, admin role gate
- Files: `CapacityDashboard.js`, `TeamApp.js` (route), `AdminDashboard.js` (link)
- Testing: iteration_161 — 100% (12/12 backend, all frontend verified)

### Mobile/PWA Hardening Pass — COMPLETE (April 2026)

**Root Causes Identified & Fixed:**
1. **Double safe-area padding on CustomerCaseList.js** — Hero section had `safe-top` class while `<Header />` above already applied `env(safe-area-inset-top)`. Removed `safe-top` from hero.
2. **Missing `.has-bottom-bar` CSS utility** — `CustomerCaseList.js` used `has-bottom-bar` class for BottomTabBar spacing, but no CSS rule existed. Added `padding-bottom: calc(50px + env(safe-area-inset-bottom) + 16px)` in `index.css`.
3. **Invalid `-webkit-overflow-scrolling-touch` Tailwind class** — Used as class name on `CustomerCaseDetail.js` tab content div, but not a valid Tailwind class. Replaced with inline `style={{ WebkitOverflowScrolling: 'touch' }}`.

**Files Changed:** `CustomerCaseList.js` (line 75), `CustomerCaseDetail.js` (line 185), `index.css` (lines 648-652)
**Testing:** iteration_158 — 100% pass (11/11 frontend tests at 375px + 390px viewports)

### Phase 17: Case Conversation Thread + Mobile Stabilization — COMPLETE (April 2026)

**Step 1 — Mobile/PWA Stabilization:**
- Safe-area padding on CaseList hero header
- Frozen tab fix: tabs made non-sticky (scroll naturally)
- Back button prominent on CaseDetail (→ /my-cases)
- BottomTabBar integrated on CaseList, highlights on /my-cases routes
- Footer replaced with BottomTabBar on mobile case pages
- Safe bottom padding via env(safe-area-inset-bottom)

**Step 2 — Case Conversation Thread:**

**New Backend:** `/app/backend/routes/case_thread.py`
- `GET /api/case-thread/{lead_id}/customer` — Customer retrieves sanitized thread (no sender_id)
- `POST /api/case-thread/{lead_id}/customer` — Customer sends message (max 2000 chars, validates empty)
- `GET /api/case-thread/{lead_id}/internal` — Internal users get full thread with sender_id + audit
- `POST /api/case-thread/{lead_id}/internal` — RM/Team Lead/Admin sends reply (visible to customer)
- `GET /api/case-thread/{lead_id}/unread` — Unread count per role

**Thread Rules:**
- One thread per case
- Customer sees role labels (Relationship Manager, VenuLoQ Admin, Team Lead) — never sees sender_id
- RM, Team Lead, Manager, Admin can all view and reply
- Auto-mark-as-read on thread retrieval
- Unread badges on customer Messages tab and RM Conversation section
- Thread metadata on lead: thread_last_message, thread_last_sender, thread_last_at, thread_unread_internal
- Customer-visible thread strictly separated from internal-only notes

**DB Collection:** `case_messages` — message_id, lead_id, text, sender_id, sender_name, sender_role, read_by_customer, read_by_internal, created_at

**Frontend — Customer Side:**
- `CustomerCaseDetail.js` → Messages tab with chat-style bubbles (customer=right/dark, RM=left/light)
- Date break separators, role labels, timestamps
- Compose input with send button (Enter to send)
- Unread badge (blue) on Messages tab

**Frontend — RM Internal:**
- `ConversionCaseDetail.js` → Portal tab → Conversation section
- Collapsed preview: last customer message + unread badge
- Expanded: full thread with message bubbles, reply input
- Unread-by-customer indicator

**Testing:** 100% backend (16/16 passed), 100% frontend (iteration_157)

## Current Status: Phases 1–16 Complete

### Phase 16: Customer Deposit Payment Layer — COMPLETE (April 2026)

**New Backend:** `/app/backend/routes/case_payments.py`
- `POST /api/case-payments/{lead_id}/request` — RM creates deposit request (booking_deposit, site_visit_booking, partial_milestone, final_payment)
- `GET /api/case-payments/{lead_id}/customer-payments` — Customer views payments with summary (total_due, total_paid, pending_count)
- `POST /api/case-payments/{payment_request_id}/checkout` — Customer initiates Razorpay order
- `POST /api/case-payments/{payment_request_id}/verify` — Payment verification via Razorpay signature
- `POST /api/case-payments/{payment_request_id}/simulate` — Test mode payment simulation
- `GET /api/case-payments/{lead_id}/internal-payments` — RM/internal views all payments with collection summary
- `POST /api/case-payments/{payment_request_id}/remind` — RM sends reminder (upgrades to payment_due)
- `POST /api/case-payments/{payment_request_id}/cancel` — RM cancels request (hidden from customer)
- `GET /api/case-payments/razorpay-config` — Razorpay public key for frontend checkout

**Payment Lifecycle:** payment_requested → payment_due → payment_in_progress → payment_success / payment_failed / payment_cancelled
**Duplicate Prevention:** Cannot create two pending requests for same purpose on same case
**Already-Paid Protection:** Cannot pay again for a successful payment
**Collection Posture:** On success → lead.collection_milestones[], lead.total_collected, lead.collection_posture updated
**VenuLoQ does NOT store raw card details.** All card handling via Razorpay tokenized flow.

**DB Collection:** `case_payments` — payment_request_id, lead_id, amount, purpose, status, razorpay_order_id, razorpay_payment_id, receipt_number, status_history[], reminders[]

**Frontend — Customer Side:**
- `CustomerCaseDetail.js` → Payments tab with badge for pending count
  - Summary banner (Due / Paid)
  - Payment Due cards with Pay Now button, Razorpay security badge
  - Payment Success screen with receipt (amount, receipt number, date)
  - Payment History cards
  - Failure/retry handling
- Razorpay Checkout JS loaded dynamically for production; simulate in test mode

**Frontend — RM Internal:**
- `ConversionCaseDetail.js` → Portal tab → Deposit & Payments section
  - Request Deposit button → modal (amount, purpose, description, customer note, due date, venue)
  - Collection summary (Collected / Pending / Requests)
  - Payment list with status badges, receipt numbers, remind/cancel controls

**Testing:** 100% backend (13/13 + 2 skipped), 100% frontend (iteration_156)

### Phase 15: Customer Case Portal + Proposal/File Sharing Hub — COMPLETE (April 2026)

**New Backend:** `/app/backend/routes/case_portal.py`
- `GET /api/case-portal/my-cases` — Customer case list (auth via customer_user_id, email fallback)
- `GET /api/case-portal/cases/{lead_id}` — Customer case detail (shares, timeline, status)
- `GET /api/case-portal/cases/{lead_id}/shares` — Customer shares filtered by type
- `POST /api/case-portal/cases/{lead_id}/view/{share_id}` — Mark share viewed
- `POST /api/case-portal/cases/{lead_id}/respond` — Structured response (interested, request_callback, accept_quote, etc.)
- `POST /api/case-portal/{lead_id}/share` — RM shares item to portal (with version discipline)
- `POST /api/case-portal/{lead_id}/upload` — RM uploads file to portal
- `POST /api/case-portal/{lead_id}/revoke/{share_id}` — Revoke shared item
- `GET /api/case-portal/{lead_id}/shares` — Internal view (all shares including revoked/superseded)
- `GET /api/case-portal/{lead_id}/engagement` — Internal engagement summary
- `GET /api/case-portal/files/{filename}` — File serving

**Share Lifecycle:** shared → viewed → responded / superseded / revoked / expired
**Proposal Version Discipline:** Auto-supersedes prior versions on same venue/type. Version history maintained. Customer sees current version with change summary; older versions in expandable toggle.
**Customer Responses (8):** interested, maybe, not_for_me, need_more_options, request_callback, request_visit, accept_quote, have_question

**Access Control:**
- Primary: customer_user_id from JWT session
- Fallback: email match (auto-links user_id for future access)
- Internal: RM must own case; admin bypasses

**Customer-Visible Data:** Only shared items + safe stage labels + customer-safe timeline. No internal notes/scores/flags.

**Frontend — Customer Side:**
- `CustomerCaseList.js` → `/my-cases` — Case cards with event type, city, stage badge, RM, pending actions, latest share
- `CustomerCaseDetail.js` → `/my-cases/:caseId` — 3 tabs:
  - Shared Items: Share cards with lifecycle badges, version badges, "What Changed" summaries, Respond button
  - Timeline: Chronological events
  - Contact RM: Structured actions (Request Callback, Request Visit, Accept Quote, Ask Question, Request More Info) + external fallback
- Header nav: "My Cases" added to desktop + mobile menu

**Frontend — Internal (RM):**
- `ConversionCaseDetail.js` → Portal tab: Engagement summary (shared/viewed/responded/pending), Share to Customer button, Upload button, Share History with lifecycle states, revoke controls, customer response visibility

**File Storage:** Abstracted — uses UPLOAD_DIR env var, local `/app/uploads/` swappable for S3.

**Testing:** 10/10 backend, 100% frontend (iteration_155)

### Phase 14: RM Customer Communication Hub — COMPLETE (April 2026)

**New Backend:** `/app/backend/routes/communication.py`
- `POST /api/communication/{lead_id}/log` — Log communication (call, whatsapp, email, note, template, follow_up)
- `GET /api/communication/{lead_id}/timeline` — Communication history (newest first)
- `POST /api/communication/{lead_id}/follow-up` — Schedule follow-up with waiting state
- `POST /api/communication/{lead_id}/status` — Update communication status
- `GET /api/communication/dashboard-counts` — RM dashboard urgency aggregation
- `GET /api/communication/templates` — List templates (8 seeded defaults)
- `POST /api/communication/templates` — Create template (admin only)
- `PUT /api/communication/templates/{id}` — Update template (admin only)
- `POST /api/communication/templates/{id}/render` — Render with variable substitution

**Lead Summary Fields Added:**
- `last_contacted_at`, `next_follow_up_at`, `communication_status`
- `waiting_on`, `last_contact_channel`, `last_contact_outcome`

**Communication Status Model (8 states):**
never_contacted, follow_up_due, overdue, waiting_on_customer, waiting_on_rm, recently_contacted, no_response, blocked_unreachable

**Call Outcomes (12):** connected, no_answer, busy, wrong_number, customer_asked_for_callback, interested, not_interested, waiting_for_family_discussion, visit_requested, quote_requested, negotiation_discussion, closed_progressed

**Message Outcomes (9):** message_sent, customer_replied, customer_acknowledged, no_response_yet, waiting_for_customer_reply, information_shared, shortlist_shared, quote_shared, visit_details_shared

**Workflow Prompts:** After logging outcomes, contextual suggestions (schedule follow-up, advance stage, mark lost)

**Templates (8 seeded):** introduction, callback_confirmation, shortlist_shared, quote_shared, site_visit_proposal, negotiation_followup, reminder_no_response, booking_progression. Variables: customer_name, rm_name, venue_name, visit_datetime, company_name

**Frontend:**
- `CommunicationConsole.js` — Contact card, quick actions (Call/WhatsApp/Email), secondary actions (Template/Note/Log Call/Follow-up), timeline, modals
- Integrated into `RMLeadDetail.js` (Comms tab, default) and `ConversionCaseDetail.js` (Comms tab)
- `RMDashboard.js` — Communication urgency strip (No Contact, F/U Due, Waiting, No Reply) + per-lead badges

**Testing:** 21/21 backend, 14/14 frontend (iteration_154)

### Previous Phases (all 100% tested)
- Phase 10: Commercial Conversion (iteration_145)
- Phase 11: Booking Commitment + Execution Handoff (iteration_146)
- Phase 12: Event Execution + Closure (iteration_147)
- Phase 13: Financial Closure + Settlement (iteration_148)
- Stabilization: Journey tests 149-152 (155/155 pass), Role UAT 153

### All QA Results
| Iteration | Phase | Backend | Frontend |
|-----------|-------|---------|----------|
| 145 | Phase 10 | 37/38 | 100% |
| 146 | Phase 11 | 38/38 | 100% |
| 147 | Phase 12 | 45/45 | 100% |
| 148 | Phase 13 | 23/23 | 100% |
| 149-152 | Journey Tests | 155/155 | N/A |
| 153 | Role UAT | N/A | 100% |
| 154 | Phase 14: Communication | 21/21 | 14/14 |
| 155 | Phase 15: Case Portal | 10/10 | 100% |
| 156 | Phase 16: Payments | 13/13 | 100% |
| 157 | Phase 17: Thread + Mobile | 16/16 | 100% |
| 158 | Mobile/PWA Hardening | N/A | 100% (11/11) |
| 159 | RM Selection Flow | 15/15 | 100% |
| 160 | Phase 17: Scalability | 18/18 | 100% (1 skip) |
| 161 | Phase 17.5: Capacity Panel | 12/12 | 100% |

### SOPs Created
- `/app/docs/sops/SOP_INDEX.md`, `STATUS_GLOSSARY.md`, `HANDOFF_RULES.md`
- 7 role-based SOPs (RM, Specialist, VAM, Data Team, Venue Manager, Finance, Admin)
- `/app/docs/PRODUCTION_READINESS.md`

### Pending External Dependencies
- [ ] Google redirect URIs in GCP Console
- [ ] Apple Developer config
- [ ] REACT_APP_SUPPORT_PHONE (real number)
- [ ] Production domain DNS
- [ ] Xcode native QA
- [ ] data_team/finance user accounts
- [ ] Razorpay production keys

## Test Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Specialist: specialist@venuloq.in / test123
- Team Lead: teamlead@venuloq.in / test123
- Venue Manager: venuemanager@venuloq.in / test123
- Customer: democustomer@venulock.in / password123

### Production Readiness + Controlled Pilot — IN PROGRESS (April 2026)
- Production config files created and locked:
  - `/app/backend/.env.production` — DB_NAME=venuloq_prod, ENV=production, CORS locked to 3 domains, Razorpay placeholders
  - `/app/frontend/.env.production` — REACT_APP_BACKEND_URL=https://venuloq.com, REACT_APP_SUPPORT_PHONE=917702631654
- Production domains locked: venuloq.com, www.venuloq.com, teams.venuloq.com (delhi.venuloq.com excluded)
- Google OAuth: User updating GCP Console with 3 origins + 3 redirect URIs
- Pilot checklists created: `/app/PILOT_EXECUTION_CHECKLIST.md`
- Preview environment remains fully functional (unchanged .env files)
- Still pending from user: Razorpay live keys (3 values), GCP Console confirmation

### Customer Experience Redesign Pass — COMPLETE (April 2026)
- Created new `CustomerHome.js` — case-first dashboard with active case hero, quick actions, RM info, latest shares
- Redesigned `BottomTabBar.js` — 5 tabs: Home, Explore, My Case, Messages, Profile (was: Home, Explore, Saved, Requests, Profile)
- Redesigned `CustomerCaseDetail.js` — sectioned layout (Overview, Messages, Shared, Payments, Timeline), sticky "Message Your RM" CTA, RM card with call/WhatsApp, respond modal
- Redesigned `CustomerCaseList.js` — premium case cards with active/past separation, auto-redirect to case detail when only 1 case
- Updated `App.js` — added /home route, bottom tab bar now shows on all pages (not just Capacitor), hidden on case detail, ChatBot hidden on case/home pages
- Updated `EnquiryForm.js` — success screen now navigates to /home ("Go to My Dashboard")
- RM selection API verified: returns 3 RMs (canonical flow intact)
- Test iteration 162: 100% pass rate (backend + frontend)
- Files changed: CustomerHome.js (new), CustomerCaseDetail.js, CustomerCaseList.js, BottomTabBar.js, App.js, EnquiryForm.js

## Do NOT Start
- Facebook Login, Vendor payouts, SEO, New feature phases until pilot is stable
