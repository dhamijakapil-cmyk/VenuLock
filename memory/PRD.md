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

## Deployment Health Check — PASSED (April 2026)
- Auth redirect URLs: `window.location.origin` across all OAuth flows
- N+1 query in leads.py fixed (batch notification fetching)
- No hardcoded secrets, all config via .env
- Supervisor config valid (FastAPI port 8001, React port 3000)
- Deployment agent status: PASS ✅ (iteration_156 test report also 100%)

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

## Do NOT Start
- Facebook Login, Vendor payouts, SEO, Production Razorpay
