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

## Current Status: Phases 1–14 Complete

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
