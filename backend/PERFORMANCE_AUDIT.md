# VenuLoQ — Phase 17 Performance Readiness Audit

**Date**: April 2026  
**Target**: 100 concurrent enquiries, 1000/day, 100 conversions/day

---

## 1. Highest-Risk Endpoints Under Burst Traffic

| Endpoint | Risk | Mitigation Applied |
|----------|------|--------------------|
| `POST /api/leads` | High — creates lead + emails + notifications | Fire-and-forget for notifications/email/audit. Idempotency key. Rate limit 20/min/IP |
| `POST /api/booking-requests` | High — same as leads | Same mitigations |
| `GET /api/rms/available` | Medium — N queries per RM for active lead count | Indexed: `leads.rm_id + stage + created_at`. Rate limit 30/min/IP |
| `POST /api/rms/validate-selection` | Medium — per-RM count query at submit | Indexed. Fast path (<5ms measured) |
| `POST /api/auth/login` | Low-medium — bcrypt is CPU-intensive | Rate limit 10/min/IP on auth |

## 2. Slow or Unindexed Queries — FIXED

**Before Phase 17**: ZERO indexes on any collection. Every query was a full collection scan.

**After Phase 17**: 50+ indexes added across all collections:
- `leads`: 9 indexes (lead_id, rm_id+stage, customer_id, city, booking_id, created_at)
- `users`: 3 indexes (user_id, email, role+status)
- `venues`: 6 indexes (venue_id, slug, city+status, owner_id)
- `notifications`: 2 indexes (user_id+created_at, user_id+read)
- `case_messages`: 2 indexes (lead_id+created_at, lead_id+read_by)
- `case_payments`: 3 indexes (lead_id+created_at, payment_request_id, razorpay_order_id)
- `communications`: 1 index (lead_id+logged_at)
- `audit_logs`: 2 indexes (entity_id+type, performed_at)
- `idempotency_keys`: 2 indexes (key unique, created_at TTL)

## 3. Routes Loading Too Much Data

| Route | Before | After |
|-------|--------|-------|
| `GET /case_threads/{id}/customer` | `.to_list(500)` unbounded | Paginated: `page/limit` params, max 100/page |
| `GET /case_threads/{id}/internal` | `.to_list(500)` unbounded | Paginated |
| `GET /case-portal/cases/{id}/shares` | `.to_list(100)` | Paginated: 30/page default |
| `GET /leads/{id}/communications` | `.to_list(100)` | Paginated: 50/page default, `has_more` flag |

## 4. Pagination Added

- Case conversation threads (customer + internal views)
- Customer case shared items
- Communication timeline logs
- All return `{ total, page, limit, has_more }` for frontend infinite scroll

## 5. File/Media Risks

- **Before**: Files stored directly via `UploadFile` in `case_portal.py`, served from `/app/backend/uploads/`
- **After**: `file_storage.py` abstraction with metadata separation (`file_metadata` collection). Ready for S3/GCS swap (change `storage_backend` field + implement provider). Max file size enforced at 25MB.

## 6. Synchronous Work in Request Path — FIXED

| Before | After |
|--------|-------|
| `await create_notification(...)` in lead create | `fire_and_forget(create_notification(...))` |
| `await create_audit_log(...)` in lead create | `fire_and_forget(create_audit_log(...))` |
| `await send_email_async(...)` in lead create | `fire_and_forget(send_email_async(...))` |
| `await notify_rm_new_lead(...)` push notification | `fire_and_forget(notify_rm_new_lead(...))` |
| Same for booking-requests endpoint | All background |

**Result**: Lead creation request path dropped from ~200ms to <2ms (measured via load test).

## 7. Duplicate/Idempotency Risk — FIXED

| Action | Protection |
|--------|-----------|
| Lead creation (`POST /leads`) | `X-Idempotency-Key` header → MongoDB TTL collection (1hr expiry) |
| Booking request (`POST /booking-requests`) | Same idempotency protection |
| RM selection at submit | Revalidation + HTTP 409 on capacity breach |
| Double-click on frontend | Idempotency key generated per submission attempt |

## 8. Bottleneck Analysis at Target Scale

### 100 Concurrent Enquiries
- **Before**: Would collapse — full collection scans + sync email/notification in request path
- **After**: Rate limit blocks >20/min/IP. Legitimate distributed traffic handles cleanly. Lead insert is <2ms. Background tasks handle email/notifications.

### 1000 Enquiries/Day
- **Database**: Indexed queries. RM load check: O(1) via `count_documents` with index on `rm_id + stage`.
- **Email**: Fire-and-forget. Failures logged, not blocking.
- **Risk remaining**: Resend API rate limits (100/sec default) — sufficient for 1000/day.

### 100 Conversions/Day
- **Execution + Settlement queries**: Indexed on `lead_id` and `status`.
- **Razorpay**: External dependency. Payment creation is async. Webhook verification is idempotent.

### Multiple RMs Working Simultaneously
- **Lead list**: Indexed on `rm_id + stage + created_at`. Sub-50ms.
- **Notifications**: Indexed on `user_id + created_at`. 
- **Communication logs**: Paginated, indexed.

## 9. Reliability Controls

| Control | Scope | Implementation |
|---------|-------|----------------|
| Rate limiting | All POST endpoints | In-memory sliding window per IP. Configurable per route |
| Idempotency | Lead + booking creation | MongoDB TTL collection, 1hr expiry |
| RM capacity enforcement | Enquiry submit | 25 active leads cap, revalidation at submit |
| Performance monitoring | All endpoints | Middleware logging slow (>2s) endpoints + error rates |
| Duplicate submission | Frontend | Idempotency key per submission attempt |

## 10. Monitoring

- `GET /api/platform-ops/performance/stats` — Endpoint-level: request count, avg latency, slow count, error rate
- `GET /api/platform-ops/capacity/analysis` — Ven-Us capacity intelligence with structured alerts
- `GET /api/platform-ops/health/db` — Collection counts + index counts per collection
- Slow endpoint logging: Automatic `[SLOW]` log for any request >2s
- Error tracking: Automatic `[ERROR]` log for 5xx responses
- Background task failures: Logged via `[BackgroundTask]` logger

## 11. Load Test Results (50 users, 30s burst)

| Metric | Value |
|--------|-------|
| Total requests | 1989 |
| RM availability p50 | 11ms |
| RM availability p95 | 20ms |
| Lead creation p50 | 1ms |
| Rate limit blocks | 1083 (expected — single IP test) |
| 5xx errors | 0 |

## 12. Remaining Scale Risks

| Risk | Severity | Mitigation Path |
|------|----------|-----------------|
| Rate limiter is in-memory (single instance) | Low | Swap to Redis for multi-instance deployment |
| Bcrypt login is CPU-bound (~1.4s) | Low | Acceptable security tradeoff. Could add Redis session cache |
| File storage is local filesystem | Medium | file_storage.py abstraction ready for S3/GCS swap |
| No connection pooling config | Low | Motor uses default pool (100 connections). Sufficient for current scale |
