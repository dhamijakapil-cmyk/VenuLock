# VenuLoQ — Controlled Pilot Plan

## Pilot Objective
Validate VenuLoQ's end-to-end booking workflow under real conditions before public launch.

---

## Phase 1: Internal Dry Run (Day 1-3)

**Participants**: Founding team, 1-2 internal RMs

**Actions**:
1. Admin creates test venue(s) in production
2. Admin creates RM accounts in production
3. Team member acts as "customer" — submits real enquiry
4. RM receives notification, manages the case through all stages
5. Test the full flow: enquiry → RM selection → case management → proposal → payment request → execution → settlement

**Success criteria**:
- Enquiry creates case correctly with customer-selected RM
- RM receives notification within 30 seconds
- Case portal shows all tabs (Shared, Payments, Messages, Timeline, Contact)
- Payment request creates Razorpay order (test mode is fine here)
- No 5xx errors in monitoring

**Monitoring**:
- Admin checks `/team/admin/capacity` for capacity dashboard
- Admin checks performance stats via API
- Check backend logs for `[SLOW]` or `[ERROR]` entries

---

## Phase 2: Friendly Customer Pilot (Day 4-7)

**Participants**: 2-3 known/friendly customers + active RMs

**Actions**:
1. Invite 2-3 friendly customers to submit real enquiries
2. RMs handle cases as they would in production
3. Customers use the case portal to view shares, send messages
4. Do NOT process real payments yet (unless Razorpay live keys are configured)

**Success criteria**:
- Customers can login (Google OAuth or email/phone OTP)
- Customers see their cases in `/my-cases`
- Messages flow both ways (customer ↔ RM)
- Shared items visible in customer portal
- No frozen pages or broken navigation
- Customer can always navigate back from any view

**Monitoring**:
- Daily check of capacity intelligence alerts
- Performance stats review (any slow endpoints?)
- Customer feedback collection (simple form or direct conversation)

**Rollback trigger**: If any critical workflow breaks (login, enquiry submission, case access), pause pilot and fix.

---

## Phase 3: Small Live Pilot (Day 8-14)

**Participants**: 5-10 real customers, full RM team

**Actions**:
1. Enable production Razorpay keys (if ready)
2. Enable real support phone number
3. Open venue search to small audience (marketing-controlled)
4. Process real enquiries end-to-end
5. Process first real deposit payment

**Success criteria**:
- 95%+ of enquiries successfully create cases
- RM response time < 30 min during business hours
- Customer portal renders correctly on iPhone Safari
- No duplicate cases from double-submit
- Payment flow works end-to-end (if Razorpay live)

**Monitoring**:
- Hourly check of error rates during peak hours
- Daily capacity intelligence review
- RM feedback on dashboard usability
- Customer NPS or satisfaction feedback

---

## Rollback / Issue Logging Process

### During pilot, if issues arise:

1. **P0 (Blocking)**: Login fails, enquiry doesn't create, payment fails silently
   - Action: Immediately pause affected workflow, notify team, fix within 2 hours
   - Rollback: Use Emergent platform rollback to last stable checkpoint

2. **P1 (Degraded)**: Slow pages, notification delays, minor UI glitches
   - Action: Log in issue tracker, fix within 24 hours
   - Continue pilot with awareness

3. **P2 (Cosmetic)**: Wording issues, spacing, minor visual inconsistencies
   - Action: Log for next patch
   - Continue pilot

### Issue logging format:
```
[P0/P1/P2] [Date] [Reporter]
Flow: (e.g., customer enquiry submission)
Steps to reproduce: ...
Expected: ...
Actual: ...
Device/Browser: ...
Screenshot: (if visual)
```

---

## Recommended Pilot Sequence

| Step | Duration | Participants | Focus |
|------|----------|-------------|-------|
| 1. Internal dry run | 3 days | Team only | Full workflow validation |
| 2. Config production env | 1 day | Admin | Razorpay, OAuth, phone, CORS |
| 3. Friendly customer pilot | 4 days | 2-3 known customers | Customer portal + messaging |
| 4. Small live pilot | 7 days | 5-10 customers | Real enquiries + payments |
| 5. Review + expand | Ongoing | Full team | Scale based on learnings |

---

## Roles in First Pilot

| Role | Who | Responsibility |
|------|-----|---------------|
| Admin | Founder/CEO | Monitor capacity dashboard, approve pilot stages |
| RM(s) | 1-2 trained RMs | Handle cases, provide feedback on RM dashboard |
| Test Customer | Internal team member | Validate customer journey end-to-end |
| Pilot Customer | 2-3 friendly contacts | Real customer experience validation |

---

## What Still Depends on User Configuration

| Item | Blocks | Action Required |
|------|--------|----------------|
| Razorpay live keys | Real payments | Get keys from Razorpay dashboard |
| Google OAuth redirect | Google login on production domain | Update GCP Console |
| Support phone number | Customer support calls | Provide real number |
| Production DB name | Data isolation | Change `DB_NAME` in backend `.env` |
| CORS restriction | Security | Restrict to production domains |
| Apple Sign In keys | iOS native login | Configure Apple Developer Console |
| Production domain | Everything production | Deploy to venuloq.com |

---

## What Should Be Watched During Pilot

1. **Performance**: Any endpoint >2s (check `/api/platform-ops/performance/stats`)
2. **Errors**: Any 5xx error rate >1% (check backend logs for `[ERROR]`)
3. **RM Load**: Average load per RM (check `/api/platform-ops/capacity/analysis`)
4. **Duplicate submissions**: Check `idempotency_keys` collection for blocks
5. **Rate limiting**: Check logs for `[RATE_LIMIT]` entries
6. **Payment callbacks**: If Razorpay live, watch for failed verifications
7. **Customer portal**: Watch for iOS Safari-specific issues
8. **Message delivery**: Verify RM-customer messages appear in real time
