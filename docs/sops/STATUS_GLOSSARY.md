# Status Glossary — VenuLoQ Platform

All statuses across every pipeline, with definitions and ownership.

---

## 1. Venue Acquisition Pipeline

**Collection:** `venue_acquisitions`

| Status | Meaning | Owner | Next Action |
|--------|---------|-------|-------------|
| `draft` | Specialist has started capturing venue data but hasn't submitted | Venue Specialist | Complete mandatory fields, submit |
| `submitted_for_review` | Specialist submitted; awaiting Team Lead review | VAM / Team Lead | Review quality, route forward or send back |
| `sent_back_to_specialist` | Team Lead or Manager returned it for fixes | Venue Specialist | Fix flagged issues, resubmit |
| `under_data_refinement` | Data team is enriching/correcting venue data | Data Team | Refine fields, run Ven-Us Assist, send to manager |
| `awaiting_manager_approval` | Venue data is complete; awaiting Venue Manager sign-off | Venue Manager | Approve, send back, or reject |
| `approved` | Manager approved the venue listing | Venue Manager | Initiate owner onboarding |
| `rejected` | Manager rejected the venue (not suitable for platform) | — | Case closed |
| `owner_onboarding_pending` | Approved; onboarding invite not yet sent | Venue Manager | Send onboarding email/WhatsApp |
| `owner_onboarding_sent` | Onboarding invite delivered to owner | Owner | Owner reviews and accepts |
| `owner_onboarding_viewed` | Owner opened the onboarding link | Owner | Owner accepts or declines |
| `owner_onboarding_completed` | Owner accepted terms and consented | Venue Manager | Mark publish-ready |
| `owner_onboarding_declined` | Owner declined the listing | — | Case closed or re-engage |
| `owner_onboarding_expired` | Token expired (7 days) without action | Venue Manager | Resend or follow up |
| `publish_ready` | All publish prerequisites met | Venue Manager | Publish live |
| `published_live` | Venue is visible to customers on the platform | — | Monitor; can hide/unpublish |
| `hidden_from_public` | Temporarily hidden (still exists in system) | Venue Manager | Can re-publish or unpublish |
| `unpublished` | Removed from public listing | Venue Manager | Can re-publish |
| `archived` | Permanently removed | Admin | No further action |

---

## 2. RM Conversion Pipeline

**Collection:** `leads`  
**Field:** `stage`

| Stage | Meaning | Owner | Next Action |
|-------|---------|-------|-------------|
| `enquiry_received` | New customer enquiry or callback logged | RM | Qualify the requirement |
| `requirement_qualified` | RM has assessed event type, date, budget, guest count | RM | Build venue shortlist |
| `venues_shortlisted` | Curated venue options shared with customer | RM | Request quotes or plan site visit |
| `quote_requested` | Formal quote requested from venue(s) | RM | Follow up for quote receipt |
| `quote_received` | At least one quote received from venue | RM | Share with customer, plan visit |
| `site_visit_planned` | Site visit date agreed with customer | RM | Conduct visit |
| `site_visit_completed` | Customer has visited venue(s) | RM | Start negotiation or request more quotes |
| `negotiation_in_progress` | Active price/terms negotiation | RM | Reach agreement |
| `commercial_accepted` | Both parties agreed on terms | RM | Complete booking readiness gate |
| `booking_confirmation_pending` | All 6 readiness checks passed; awaiting final confirm | RM | Confirm booking |
| `booking_confirmed` | Booking is locked; customer committed | — | Handoff to execution |
| `lost` | Customer dropped off or deal fell through | RM | Can reopen to enquiry_received |

### Booking Readiness Gate (6 checks — all must pass before `booking_confirmed`)

| Check | Meaning |
|-------|---------|
| `requirement_confirmed` | Event requirements are clear and documented |
| `final_venue_selected` | Customer has selected one venue |
| `commercial_terms_agreed` | Price, inclusions, payment terms all agreed |
| `customer_contact_confirmed` | Customer contact details verified |
| `payment_milestone_recorded` | First payment/advance recorded |
| `booking_date_locked` | Event date is final and blocked |

---

## 3. Execution Pipeline

**Collection:** `leads`  
**Field:** `execution.execution_status`

| Status | Meaning | Owner | Next Action |
|--------|---------|-------|-------------|
| `handoff_pending` | Execution handoff package created; awaiting assignment | RM / Admin | Assign execution owner |
| `assigned` | Execution owner assigned | Execution Owner | Acknowledge handoff |
| `in_preparation` | Pre-event preparation underway | Execution Owner | Complete checklist items |
| `ready_for_event` | All prep done; waiting for event day | Execution Owner | Monitor until event day |
| `event_live` | Event is happening now | Execution Owner | Manage event-day coordination |
| `issue_active` | High/critical incident raised during event | Execution Owner | Resolve incident |
| `event_completed` | Event finished; post-event actions pending | Execution Owner | Add closure note, mark tasks done |
| `closure_note_pending` | Event complete but closure note missing | Execution Owner | Add closure note |
| `closure_ready` | All 5 closure checks passed; ready for settlement | — | Handoff to settlement |

### Incident Severities

| Severity | Auto-Escalation | Meaning |
|----------|-----------------|---------|
| `low` | No | Minor issue, no impact on event |
| `medium` | No | Noticeable issue, manageable |
| `high` | Yes → `issue_active` | Significant impact on event quality |
| `critical` | Yes → `issue_active` | Event at risk; immediate action required |

### Closure Readiness Gate (5 checks)

| Check | Meaning |
|-------|---------|
| `event_completed` | Event marked as completed |
| `critical_issues_resolved` | All high/critical incidents resolved |
| `closure_note` | Post-event closure note written |
| `post_event_tasks_done` | All post-event tasks completed |
| `change_history_intact` | Change request/addendum history is clean |

---

## 4. Settlement Pipeline

**Collection:** `leads`  
**Field:** `settlement.settlement_status`

| Status | Meaning | Owner | Next Action |
|--------|---------|-------|-------------|
| `closure_ready` | Event execution closed; awaiting settlement initiation | RM / Admin | Initiate settlement handoff |
| `settlement_pending` | Settlement handoff created; work not yet started | Settlement Owner | Begin collection verification |
| `collection_verification_pending` | Actively verifying customer payments received | Settlement Owner | Record/verify collections |
| `payable_commitments_pending` | Capturing what is owed to venue/vendors | Settlement Owner | Record payable commitments |
| `settlement_under_review` | All data captured; under review before closure | Settlement Owner / Admin | Review for completeness |
| `settlement_ready` | All data verified; ready for financial closure | Settlement Owner | Complete financial closure |
| `settlement_blocked` | Something is preventing closure (dispute, missing data) | Settlement Owner | Resolve blocker |
| `financial_closure_completed` | All financial obligations recorded and verified | — | Case fully closed |

### Collection Statuses

| Status | Meaning |
|--------|---------|
| `pending` | No collection activity yet |
| `partial` | Some payment received, not full amount |
| `received` | Full amount received, not yet verified |
| `verification_pending` | Received; verification in progress |
| `verified` | Full amount verified and reconciled |

### Payable Completeness

| Value | Meaning |
|-------|---------|
| `complete` | All payable commitments captured |
| `partial` | Some payables captured, others missing |
| `missing_data` | Payable data not yet entered |

### Payout Readiness (Advisory Only — no automated payout)

| Posture | Meaning |
|---------|---------|
| `payout_ready` | All collections verified, payables captured, no disputes |
| `payout_not_ready` | Prerequisites not yet met |
| `payout_readiness_unclear` | Insufficient data to determine |
| `payout_blocked_by_dispute_or_hold` | Active dispute or hold preventing payout |
| `payout_readiness_pending_verification` | Verification still in progress |

### Financial Closure Gate (5 checks)

| Check | Meaning |
|-------|---------|
| `event_closure_complete` | Execution closure was completed |
| `collection_verified` | Customer payment verified |
| `payable_commitments_captured` | Venue/vendor payables recorded |
| `blockers_resolved` | No open disputes, holds, or blockers |
| `settlement_note_complete` | Settlement notes written |
