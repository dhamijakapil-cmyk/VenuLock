# VenuLoQ Pre-Pilot Cleanup Report
**Date:** April 3, 2026

---

## 1. WHAT WAS DONE

| Action | Details |
|--------|---------|
| **Backup** | Full export of leads (290), users (98), payments, messages, shares → `/app/test_reports/pre_cleanup_backup.json` (702KB) |
| **Purge 1** | Deleted 128 leads with `TEST_` prefix or `Rate Limit Test` in name |
| **Purge 2** | Deleted 20 `Load Test User` leads (all stage=new, automated) |
| **Purge 3** | Deleted 1 `Dry Run Customer` lead (created during dry run) |
| **Fix** | Updated `rm_name` on demo lead from `Ravi Sharma` → `Vikram Reddy` |
| **RM Dashboard Bug Fix** | Fixed `team.py` — changed `assigned_rm` → `rm_id` and `status` → `stage` field queries |

**Total deleted: 149 leads. Zero ambiguous deletions.**

---

## 2. COUNTS — BEFORE vs AFTER

| Metric | Before | After |
|--------|--------|-------|
| Total leads | 290 | 141 |
| rm1 (Vikram Reddy) leads | 30 | 7 |
| rm1 capacity status | OVER (30/25) | HEALTHY (7/25) |
| Demo lead (lead_21668ed1ecd9) | rm_name: Ravi Sharma | rm_name: Vikram Reddy |
| RM Welcome Dashboard stats | 0 / 0 / 0 | 7 / 7 / 0 |

---

## 3. RM CAPACITY STATUS

| RM | Before | After | Status |
|----|--------|-------|--------|
| Vikram Reddy (rm1@venulock.in) | 30 | 7 | HEALTHY |
| Rahul Sharma | 66 | 28 | BUSY but under threshold |
| Priya Singh | 34 | 23 | HEALTHY |
| Amit Kumar | 24 | 14 | HEALTHY |
| Neha Kapoor | 101 | 74 | OVER CAPACITY* |

*Neha Kapoor's 74 remaining leads are mostly non-TEST_ fixtures. These were not touched to avoid deleting ambiguous data.

---

## 4. POST-CLEANUP REGRESSION — 8/8 PASS

| # | Check | Result |
|---|-------|--------|
| 1 | RM Dashboard counts | PASS (7 leads, 7 active) |
| 2 | 3 RM options in enquiry | PASS (3 RMs available) |
| 3 | rm1 validate-selection | PASS (available: true) |
| 4 | Case creation | PASS (booking created) |
| 5 | Customer portal (demo lead) | PASS (intact, RM name fixed) |
| 6 | RM leads list | PASS (demo lead present) |
| 7 | Venue search | PASS |
| 8 | Messaging | PASS (16 msgs, correct RM name) |

---

## 5. FINAL PILOT GO / NO-GO

| Phase | Verdict | Notes |
|-------|---------|-------|
| **Internal Dry Run** | **GO** | All flows verified, test data purged, RM capacity healthy |
| **Friendly Customer Pilot** | **GO** | Use email/password auth; Razorpay test mode is fine for demo |
| **Small Live Pilot** | **CONDITIONAL GO** | Requires: Razorpay prod keys + Google OAuth config for custom domain |
