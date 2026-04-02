# SOP: Relationship Manager (RM)

**Role:** `rm`  
**Portal:** teams.venuloq.com → Pipeline / Conversion / Execution / Settlement  
**Daily load:** Highest — manages the full customer lifecycle

---

## Responsibilities

1. Receive and respond to customer enquiries/callbacks within SLA
2. Qualify customer requirements (event type, date, budget, guest count)
3. Build and manage venue shortlists tailored to customer needs
4. Request quotes from venues, share with customers
5. Plan and facilitate site visits
6. Negotiate commercial terms between customer and venue
7. Complete booking readiness gate and confirm bookings
8. Initiate execution handoff with complete handoff package
9. Monitor execution progress and closure
10. Initiate settlement handoff and track to financial closure

---

## Daily Workflow

### Morning Routine
1. Login at `/team/login` → lands on Team Welcome
2. Check Pipeline dashboard (`/team/rm/dashboard`) for:
   - New enquiries needing response
   - Cases approaching follow-up dates
   - SLA alerts
3. Check Execution dashboard (`/team/rm/execution`) for:
   - Events happening today or this week
   - Active incidents needing attention
   - Cases approaching closure

### Conversion Pipeline (`/team/rm/conversion`)

| Stage | What to Do | When to Move Forward |
|-------|-----------|---------------------|
| Enquiry Received | Call customer, understand requirements | Requirements are clear |
| Requirement Qualified | Build venue shortlist | 3+ relevant options identified |
| Venues Shortlisted | Share options, get feedback | Customer shows interest |
| Quote Requested | Follow up with venues | At least one quote received |
| Quote Received | Share quotes with customer | Customer interested in visiting |
| Site Visit Planned | Coordinate dates | Visit completed |
| Site Visit Completed | Get customer feedback | Customer ready to negotiate |
| Negotiation | Facilitate terms discussion | Both parties agree |
| Commercial Accepted | Complete 6 readiness checks | All 6 checks pass |
| Booking Pending | Get final customer confirmation | Customer confirms |

### Booking Readiness Gate
Before moving to `booking_confirmed`, ALL 6 checks must be true:
- ✅ Requirement confirmed
- ✅ Final venue selected
- ✅ Commercial terms agreed
- ✅ Customer contact confirmed
- ✅ Payment milestone recorded
- ✅ Booking date locked

### Execution Handoff
After booking confirmed:
1. Go to Execution dashboard → click "Create Handoff"
2. Fill: venue details, customer requirements, handoff notes, special promises
3. System locks the booking_snapshot (immutable from this point)
4. Assign execution owner and supporting team

### Settlement Handoff
After execution reaches closure_ready:
1. Go to Settlement dashboard → open the case
2. Click "Initiate Settlement Handoff"
3. System auto-generates financial handoff summary
4. Track collection verification, payable commitments
5. Complete financial closure gate (5 checks)

---

## Send-Back Rules

| If customer becomes unresponsive | Mark case as "lost" with reason |
|---|---|
| If customer wants to restart | Reopen from "lost" → "enquiry_received" |
| If venue quote is unacceptable | Request revised quote or negotiate |

---

## Key Metrics to Monitor
- Response time on new enquiries
- Conversion rate (enquiry → booking confirmed)
- Average time per stage
- Lost case reasons
- Execution incident count per event
