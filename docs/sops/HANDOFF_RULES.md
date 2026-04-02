# Handoff Rules — VenuLoQ Platform

Who hands off to whom, at what stage, with what required data.

---

## 1. Venue Acquisition Handoffs

### Specialist → Team Lead (VAM)
- **Trigger:** Specialist clicks "Submit for Review"
- **Status change:** `draft` → `submitted_for_review`
- **Required data:**
  - All mandatory fields filled (venue_name, owner_name, owner_phone, city, locality, venue_type, capacity_min, capacity_max)
  - System enforces: submission blocked if mandatory fields incomplete
- **What Team Lead receives:** Full capture with completeness score

### Team Lead → Data Team
- **Trigger:** Team Lead routes to data refinement
- **Status change:** `submitted_for_review` → `under_data_refinement`
- **Required data:**
  - Reason for routing (mandatory)
  - Review notes (optional)
- **What Data Team receives:** Capture with Team Lead review notes

### Team Lead → Specialist (Send-Back)
- **Trigger:** Team Lead sends back for fixes
- **Status change:** `submitted_for_review` → `sent_back_to_specialist`
- **Required data:**
  - Reason for send-back (mandatory)
- **What Specialist receives:** Capture with send-back reason

### Data Team → Venue Manager
- **Trigger:** Data team completes refinement
- **Status change:** `under_data_refinement` → `awaiting_manager_approval`
- **Required data:**
  - Refined venue data with Ven-Us Assist quality checks
  - Field-level change audit trail
- **What Manager receives:** Enriched capture with quality posture

### Venue Manager → Owner (Onboarding)
- **Trigger:** Manager approves and initiates onboarding
- **Status change:** `approved` → `owner_onboarding_pending` → `owner_onboarding_sent`
- **Required data:**
  - Owner email and/or phone number
  - At least one delivery channel (email/WhatsApp)
- **What Owner receives:** Secure token link with venue details and consent form

### Venue Manager → Published
- **Trigger:** Manager publishes after onboarding acceptance
- **Status change:** `owner_onboarding_completed` → `publish_ready` → `published_live`
- **Required data:**
  - Publish readiness gate must pass (7 checks: onboarding, identity, media, pricing, summary, risk flags, venue active)
- **Result:** Venue appears in public search

---

## 2. RM Conversion Handoffs

### Enquiry → RM
- **Trigger:** Customer enquiry received (form/callback/manual)
- **Status change:** `enquiry_received`
- **Required data:**
  - Customer name (mandatory)
  - Customer email or phone (at least one)
  - Source type (enquiry/callback/manual)
- **What RM receives:** New case in pipeline

### RM → Execution (Booking Confirmed)
- **Trigger:** RM completes booking readiness gate and confirms booking
- **Status change:** `booking_confirmation_pending` → `booking_confirmed`
- **Required data:**
  - All 6 booking readiness checks passed
  - Final venue selected
  - Commercial terms agreed
  - Payment milestone recorded
- **What happens next:** Lead is eligible for execution handoff

---

## 3. Execution Handoffs

### RM → Execution Owner (Handoff)
- **Trigger:** RM creates execution handoff from booking_confirmed lead
- **Status change:** `booking_confirmed` → execution `handoff_pending`
- **Required data:**
  - Venue details (venue_id, venue_name)
  - Customer requirements
  - RM handoff notes
  - Special promises made to customer
- **What Execution Owner receives:**
  - Locked booking_snapshot (immutable commercial snapshot)
  - Default 8-item checklist
  - Customer and venue contact details

### Execution Owner → Closure Ready
- **Trigger:** Event completed, all closure checks passed
- **Status change:** `event_completed` → `closure_ready`
- **Required data:**
  - All 5 closure readiness checks passed
  - Completion note written
  - All critical incidents resolved
  - Post-event tasks done
  - Change history intact (no open CRs)
- **Result:** Lead eligible for settlement handoff

---

## 4. Settlement Handoffs

### Operations → Finance/Settlement (Settlement Handoff)
- **Trigger:** Settlement initiated from closure_ready lead
- **Status change:** `closure_ready` → `settlement_pending`
- **Required data:**
  - System auto-generates handoff_summary from:
    - Booking snapshot (venue, amount, event date, type, guest count)
    - Addenda count
    - Incident count and major incidents
    - Major issue flag
- **What Settlement Owner receives:**
  - Financial handoff package
  - Collection and payable templates
  - event_closure_complete auto-checked

### Settlement Owner → Financial Closure
- **Trigger:** All 5 financial closure checks pass
- **Status change:** `settlement_ready` → `financial_closure_completed`
- **Required data:**
  - Collection verified (expected vs received reconciled)
  - Payable commitments captured (venue + vendor)
  - No open blockers or disputes
  - Settlement notes written
  - Event closure confirmed
- **Result:** Case fully closed; no further action required

---

## Send-Back Rules Summary

| From | To | When | Reason Required? |
|------|----|------|-----------------|
| Team Lead | Specialist | Quality issues in capture | Yes |
| Venue Manager | Data Team | Data needs more refinement | Yes |
| Venue Manager | Specialist | Fundamental issues with capture | Yes |
| Venue Manager | — (Reject) | Venue not suitable for platform | Yes |

---

## Escalation Rules

| Condition | Auto-Escalation | Who Is Notified |
|-----------|-----------------|-----------------|
| High/critical incident during event | execution_status → `issue_active` | Execution Owner |
| Dispute/hold flagged during settlement | Settlement Owner must resolve before closure | Settlement Owner |
| Onboarding token expired (7 days) | Status → `owner_onboarding_expired` | Venue Manager |
| Ven-Us Assist finds hard blockers | Approval blocked until resolved | Venue Manager / Data Team |
