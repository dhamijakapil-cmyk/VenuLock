# VenuLoQ — Production Readiness Checklist

## 1. Environment Configuration

### Critical: Must be changed before production

| Item | Current Value | Production Action | Owner |
|------|--------------|-------------------|-------|
| `DB_NAME` | `test_database` | Change to `venuloq_prod` | User |
| `ENV` | `dev` | Change to `production` | User |
| `CORS_ORIGINS` | `*` (allow all) | Restrict to `https://venuloq.com,https://*.venuloq.com` | User |
| `REACT_APP_SUPPORT_PHONE` | `919876543210` | Replace with real support number | User |
| `FRONTEND_URL` | Preview URL | Change to `https://venuloq.com` | User |
| `REACT_APP_BACKEND_URL` | Preview URL | Change to production API URL | User |

### Razorpay (Payment Processing)

| Item | Current | Production Action |
|------|---------|-------------------|
| `RAZORPAY_KEY_ID` | Not set (falls back to `rzp_test_demo` → simulation) | Add live key from Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | Not set (falls back to `demo_secret`) | Add live secret from Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Not set | Configure webhook at `https://api.venuloq.com/api/case_payments/webhook` in Razorpay Dashboard |

**Razorpay Setup Steps:**
1. Log into https://dashboard.razorpay.com
2. Go to Settings → API Keys → Generate Live Key
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to backend `.env`
4. Go to Settings → Webhooks → Add New Webhook
5. URL: `https://<production-api>/api/case_payments/webhook`
6. Events: `payment.authorized`, `payment.captured`, `payment.failed`
7. Copy webhook secret → add as `RAZORPAY_WEBHOOK_SECRET` to backend `.env`

### Google OAuth

| Item | Current | Status |
|------|---------|--------|
| Google OAuth | Emergent-managed (`/auth/google-session`) | Working via Emergent Auth backend |
| `GOOGLE_CLIENT_ID` | Set | Configured |
| `GOOGLE_CLIENT_SECRET` | Set | Configured |

**Google OAuth Production Checklist:**
1. In Google Cloud Console → APIs & Services → Credentials
2. Add production domain to **Authorized JavaScript origins**: `https://venuloq.com`, `https://*.venuloq.com`
3. Add production callback to **Authorized redirect URIs**: `https://venuloq.com/auth/callback`
4. Verify the Emergent Auth redirect URL matches your production domain
5. Test login flow on production domain before pilot

**Current issue**: `redirect_uri_mismatch` was reported. This requires adding the exact production domain in GCP Console. No code change needed — the backend already uses `request.headers.origin` dynamically.

### Apple Sign In

| Item | Current | Status |
|------|---------|--------|
| `APPLE_CLIENT_ID` | Empty | Not configured |
| `APPLE_TEAM_ID` | Empty | Not configured |
| `APPLE_KEY_ID` | Empty | Not configured |
| `APPLE_PRIVATE_KEY` | Empty | Not configured |

**Action**: Configure in Apple Developer Console if iOS app uses Sign in with Apple. Not a launch blocker if Google OAuth works.

---

## 2. Security Hardening for Production

| Check | Status | Notes |
|-------|--------|-------|
| JWT secret is env-based | ✅ | `JWT_SECRET` in `.env` |
| No hardcoded secrets in code | ✅ | Verified by deployment agent |
| Rate limiting on auth endpoints | ✅ | Phase 17 |
| Rate limiting on lead creation | ✅ | 20/min/IP |
| Idempotency on lead creation | ✅ | X-Idempotency-Key header |
| CORS restricted | ❌ | Currently `*` — must restrict |
| HTTPS enforced | ✅ | Via Kubernetes ingress |
| Passwords hashed (bcrypt) | ✅ | |
| OTP rate limited | ✅ | 5/min/IP |

---

## 3. Database Production Readiness

| Check | Status | Notes |
|-------|--------|-------|
| Indexes applied (50+) | ✅ | All collections indexed |
| DB name configured | ❌ | Using `test_database` — change to production name |
| Backups configured | ❓ | User must set up MongoDB Atlas backups or cron dump |
| Connection pooling | ✅ | Motor default (100 connections) |

---

## 4. Workflow Readiness Status

| Workflow | Backend | Frontend | Payment | Status |
|----------|---------|----------|---------|--------|
| Customer enquiry/booking | ✅ | ✅ | N/A | Ready |
| RM selection (customer-selected) | ✅ | ✅ | N/A | Ready |
| RM case management | ✅ | ✅ | N/A | Ready |
| Customer case portal | ✅ | ✅ | N/A | Ready |
| Case conversation thread | ✅ | ✅ | N/A | Ready |
| Deposit payment requests | ✅ | ✅ | Test mode | Needs live Razorpay keys |
| Venue search + detail | ✅ | ✅ | N/A | Ready |
| Google OAuth login | ✅ | ✅ | N/A | Needs GCP redirect URI |
| Email OTP login | ✅ | ✅ | N/A | Ready |
| Phone OTP login | ✅ | ✅ | N/A | Ready (debug mode in dev) |
| Proposal/file sharing | ✅ | ✅ | N/A | Ready |
| Execution checklists | ✅ | ✅ | N/A | Ready |
| Settlement tracking | ✅ | ✅ | N/A | Ready |
| Venue onboarding/acquisition | ✅ | ✅ | N/A | Ready |
| Admin analytics + capacity | ✅ | ✅ | N/A | Ready |
| Push notifications | ✅ | ✅ | N/A | Ready |

---

## 5. iPhone/Native QA Checklist

| Check | Area | Priority |
|-------|------|----------|
| Safe area top — header not under notch | All pages | P0 |
| Safe area bottom — content above home indicator | All pages | P0 |
| Tab bar horizontal scroll on 375px | Case detail | P0 |
| Back navigation from every subview | Case portal | P0 |
| Keyboard doesn't hide compose input | Messages tab | P0 |
| Touch targets >= 44px | All buttons | P1 |
| Pull-to-refresh behavior | Case list | P1 |
| Offline state handling | All pages | P1 |
| Deep linking from push notifications | Notifications | P1 |
| App icon + splash screen | Native shell | P1 |
| TestFlight build works | Xcode | P0 |
