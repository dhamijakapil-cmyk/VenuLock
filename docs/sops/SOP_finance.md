# SOP: Finance

**Role:** `finance`  
**Portal:** teams.venuloq.com → Finance Dashboard / Payment Ledger  
**Daily load:** Low-Medium — monitoring and advisory

---

## Responsibilities

1. Monitor payment collection across all confirmed bookings
2. Review the payment ledger for reconciliation
3. Monitor settlement pipeline for payout readiness
4. Flag discrepancies in collection vs expected amounts
5. Advisory role — no automated payout authority

---

## Daily Workflow

### Finance Dashboard (`/team/finance/dashboard`)
1. Review overall payment health metrics
2. Check for overdue collections
3. Monitor booking-to-payment conversion rates

### Payment Ledger (`/team/finance/ledger`)
1. Review all payment records
2. Flag any discrepancies for RM investigation
3. Verify payment milestones against booking snapshots

---

## Settlement Monitoring

Finance does not directly operate the settlement workflow (that's RM/Admin), but should monitor:

| What to Check | Where | Red Flags |
|---------------|-------|-----------|
| Collection vs Expected | Settlement Dashboard | Received < Expected by >10% |
| Dispute/Hold flags | Settlement Detail → Payables | Any active dispute |
| Payout readiness | Settlement Detail → Overview | `payout_blocked_by_dispute_or_hold` |
| Stale settlements | Settlement Dashboard | Cases in `settlement_pending` for >7 days |

---

## Payout Readiness (Advisory)

Finance can review the **advisory payout readiness posture** but CANNOT trigger automated payouts:

| Posture | Finance Action |
|---------|---------------|
| `payout_ready` | Confirm readiness for manual payout processing |
| `payout_not_ready` | Review what's missing |
| `payout_readiness_unclear` | Request more data from RM/Settlement Owner |
| `payout_blocked_by_dispute_or_hold` | Escalate to management |
| `payout_readiness_pending_verification` | Wait for verification to complete |

---

## Key Metrics
- Total collections this month
- Collection efficiency (received / expected)
- Average days to payment
- Number of active disputes
- Financial closure completion rate
