# VenuLoQ Pilot Reset — Deployment Readiness Report
**Date:** April 3, 2026

---

## 1. Environment Verified

| Item | Value |
|------|-------|
| Frontend target | `https://premium-event-search.preview.emergentagent.com` |
| Backend | FastAPI on `0.0.0.0:8001`, routed via Kubernetes ingress at `/api` |
| MongoDB | `mongodb://localhost:27017` (local to pod) |
| Database name | `test_database` (set via `DB_NAME` env var) |
| Environment type | **Preview** (Emergent preview cluster) |
| Frontend ↔ Backend match | **YES** — frontend calls `REACT_APP_BACKEND_URL/api/*`, backend serves on same ingress |
| Mismatch risk | **None** — single pod, single DB, no parallel environments |

---

## 2. Database Verified

| Collection | Active count | Notes |
|------------|-------------|-------|
| leads | **0** | Clean |
| messages | **0** | Clean |
| shares | **0** | Clean |
| payments | **0** | Clean |
| payment_requests | **0** | Clean |
| follow_ups | **0** | Clean |
| notifications | **0** | Clean |
| change_requests | **0** | Clean |
| settlements | **0** | Clean |
| users | **98** | Untouched |
| venues | **86** | Untouched |

---

## 3. Archive Isolation Verified

**Method:** Grep of all 12 backend route files for collection references.

| Finding | Status |
|---------|--------|
| All backend routes reference `db.leads` (active collection) | Confirmed |
| Zero backend routes reference `archived_leads` or any `archived_*` collection | Confirmed |
| No dynamic collection name resolution exists (`db[variable]`) | Confirmed — only `platform_ops.py` lists collection names for admin metrics, does not query archived data into active flows |
| RM capacity logic (`booking.py`) queries `db.leads.count_documents` | Confirmed — counts only active leads |
| Customer portal (`case_portal.py`) queries `db.leads` | Confirmed — no archived leakage path |
| Workflow/RM dashboard (`workflow.py`, `team.py`) queries `db.leads` | Confirmed |

**Conclusion:** Archived data is in completely separate MongoDB collections (`archived_leads`, `archived_payments`, etc.). No code path in the application references these collections. **Zero risk of archived data leaking into active operations.**

---

## 4. Backup Status

| Item | Value |
|------|-------|
| Original | `/app/test_reports/pilot_reset_backup_20260403_144542.json` |
| Copy | `/app/memory/pilot_backup_20260403.json` |
| Size | 547 KB each |
| MD5 | `66f23d14f38ef05bf5244d3dcb7f67d6` (both match) |
| Contents | 141 leads, 11 payments, 17 follow_ups, 9 change_requests, 453 notifications |
| Readable | Yes — verified JSON parse with correct record counts |

Additionally, all 141 leads + related data remain in the `archived_*` MongoDB collections as a third recovery path.

---

## 5. Regression Status

| # | Check | Result |
|---|-------|--------|
| 1 | Auth (admin) | PASS |
| 2 | Auth (rm) | PASS |
| 3 | Auth (customer) | PASS |
| 4 | Active leads = 0 | PASS |
| 5 | RM dashboard clean (0/0/0) | PASS |
| 6 | RM capacity reset (rm1 at 0/25) | PASS |
| 7 | 3 RMs available for Mumbai | PASS |
| 8 | Customer portal empty | PASS |
| 9 | Venue search intact (86 venues) | PASS |
| 10 | New case creation works | PASS |
| 11 | Customer-to-internal boundary | PASS (blocked) |

**11/11 PASS. No regressions.**

---

## 6. Risks Found

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Google OAuth** not configured for production domain | Blocks live pilot only | Use email/password auth for friendly pilot; user configures GCP Console before live pilot |
| **Razorpay** in test mode (`rzp_test_demo`) | Blocks real payments only | Acceptable for friendly pilot; user sets production keys before live pilot |
| **98 user accounts** include ~50 test-generated users | Low — does not affect operations | Test users cannot create leads or interfere; can be cleaned in a future pass if desired |

**No pilot-blocking risks found in the reset itself.**

---

## 7. Go / No-Go Recommendation

**GO for friendly customer pilot.**

The active operating environment is verified clean. Archive is isolated. Backup is secured in two locations plus MongoDB archive collections. All operational flows work on the fresh system. No code changes are needed.

---

## 8. Exact Next Step

Begin the friendly customer pilot using:
- **Auth:** Email/password login (Google OAuth available in preview only via Emergent-managed auth)
- **Payments:** Razorpay test mode (simulated payments work, no real charges)
- **URL:** `https://premium-event-search.preview.emergentagent.com`

When ready to move to a live pilot:
1. Configure Google OAuth redirect URIs in GCP Console for the production domain
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to production values in `/app/backend/.env`
3. Restart backend (`sudo supervisorctl restart backend`)
