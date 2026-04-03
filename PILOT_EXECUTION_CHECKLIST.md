# VenuLoQ — Production Readiness & Pilot Execution Checklist

---

## 1. EXACT VALUES/PLACEHOLDERS THAT STILL NEED USER INPUT

### Backend `.env` — Values to change

| Variable | Current Value | Production Value Needed | Who Provides |
|----------|--------------|------------------------|--------------|
| `DB_NAME` | `test_database` | `venuloq_prod` (recommended) | You — choose your production DB name |
| `ENV` | `dev` | `production` | You — flip when ready |
| `CORS_ORIGINS` | `*` | See Section 4 below | You — based on your production domain |
| `FRONTEND_URL` | `https://premium-event-search.preview.emergentagent.com` | `https://venuloq.com` (or your production domain) | You |
| `RAZORPAY_KEY_ID` | Not set (falls back to `rzp_test_demo` → simulation mode) | Your live key from Razorpay Dashboard | You |
| `RAZORPAY_KEY_SECRET` | Not set (falls back to `demo_secret`) | Your live secret from Razorpay Dashboard | You |
| `RAZORPAY_WEBHOOK_SECRET` | Not set (falls back to `webhook_secret`) | Generated when you create the webhook in Razorpay | You |
| `REACT_APP_SUPPORT_PHONE` | `919876543210` | Your real support phone number (with country code, no +) | You |
| `APPLE_CLIENT_ID` | Empty | Apple Developer Console (only if you want Apple Sign In) | You (optional) |
| `APPLE_TEAM_ID` | Empty | Apple Developer Console | You (optional) |
| `APPLE_KEY_ID` | Empty | Apple Developer Console | You (optional) |
| `APPLE_PRIVATE_KEY` | Empty | Apple Developer Console | You (optional) |

### Frontend `.env` — Values to change

| Variable | Current Value | Production Value Needed | Who Provides |
|----------|--------------|------------------------|--------------|
| `REACT_APP_BACKEND_URL` | `https://premium-event-search.preview.emergentagent.com` | Your production API URL (e.g., `https://venuloq.com` or `https://api.venuloq.com`) | You |
| `REACT_APP_SUPPORT_PHONE` | `919876543210` | Your real support phone number | You |

### Values that are ALREADY correct (do not change)

| Variable | Status |
|----------|--------|
| `MONGO_URL` | Configured for current environment |
| `JWT_SECRET` | Set (unique, strong) |
| `RESEND_API_KEY` | Set and working |
| `SENDER_EMAIL` | `VenuLoQ <no-reply@auth.venuloq.com>` |
| `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` | Set and working |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Set (GCP Console redirect URIs need updating — see Section 2) |

---

## 2. EXACT GOOGLE REDIRECT URIs TO ADD

### Where to configure
Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → Edit

### Authorized JavaScript Origins — ADD these:
```
https://venuloq.com
https://www.venuloq.com
https://delhi.venuloq.com
https://teams.venuloq.com
```
(Add any other subdomains you plan to use)

### Authorized Redirect URIs — ADD these:
```
https://venuloq.com/auth/google
https://www.venuloq.com/auth/google
https://delhi.venuloq.com/auth/google
https://teams.venuloq.com/auth/google
```

### Why exactly `/auth/google`?
The frontend sends `redirect_uri` as:
```javascript
window.location.origin + '/auth/google'
```
(File: `frontend/src/pages/GoogleAuthCallback.js` line 35, `AuthPage.js` line 75)

So the redirect URI is always `{origin}/auth/google`. Google requires this exact URI to be whitelisted.

### For the preview environment (if you want Google Auth to work here too):
```
https://premium-event-search.preview.emergentagent.com/auth/google
```
Add this as an additional authorized redirect URI.

### Current error
`redirect_uri_mismatch` — means the URI sent by the app does not match what's registered in GCP Console. No code change is needed. Only the GCP Console needs updating.

---

## 3. EXACT RAZORPAY ENV VARS AND WEBHOOK URL

### Step-by-step Razorpay production setup

**Step 1 — Get live API keys:**
1. Log into https://dashboard.razorpay.com
2. Switch to **Live Mode** (toggle at top of dashboard)
3. Go to **Settings → API Keys → Generate Key**
4. Copy the Key ID (starts with `rzp_live_`) and Key Secret

**Step 2 — Add to backend `.env`:**
```
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYY
```

**Step 3 — Configure webhook:**
1. In Razorpay Dashboard (Live Mode) → **Settings → Webhooks → Add New Webhook**
2. **Webhook URL:**
```
https://<your-production-domain>/api/payments/webhook
```
Example: `https://venuloq.com/api/payments/webhook`

3. **Events to subscribe:**
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `order.paid`

4. Copy the **Webhook Secret** shown after creation

**Step 4 — Add webhook secret to backend `.env`:**
```
RAZORPAY_WEBHOOK_SECRET=whsec_ZZZZZZZZZZZZ
```

### How the code uses these values
- `config.py` line 39-41: reads all three from env, falls back to demo values
- When `RAZORPAY_KEY_ID == 'rzp_test_demo'`, the system enters **simulation mode** (no real Razorpay calls)
- When a real key is set, the system uses the official `razorpay` Python SDK to create orders and verify signatures
- The webhook handler is at `/api/payments/webhook` (file: `routes/payments.py` line 220)

### Important
- The frontend also receives the Razorpay key via `GET /api/case-payments/razorpay-config` and uses it to initialize Razorpay Checkout JS
- Test mode flag (`is_test_mode`) is automatically derived from the key prefix
- You can keep test keys during Phase 1 (Internal Dry Run) and switch to live for Phase 3 (Small Live Pilot)

---

## 4. EXACT CORS VALUES FOR PRODUCTION

### Current state
```python
# backend/server.py line 385
allow_origins=os.environ.get('CORS_ORIGINS', '*').split(',')
```
Currently `CORS_ORIGINS=*` — allows any origin. This is fine for dev but not production.

### Recommended production value
Set in backend `.env`:
```
CORS_ORIGINS=https://venuloq.com,https://www.venuloq.com,https://delhi.venuloq.com,https://teams.venuloq.com
```

### Rules
- Comma-separated, no spaces
- Include every domain/subdomain that will make API calls
- Do NOT include trailing slashes
- Must be `https://` (not `http://`)

### If you use a different domain structure, adjust accordingly
For example, if your API is on a separate subdomain:
```
CORS_ORIGINS=https://venuloq.com,https://www.venuloq.com,https://delhi.venuloq.com,https://teams.venuloq.com,https://api.venuloq.com
```

---

## 5. PRODUCTION DB NAME & ENV RECOMMENDATION

### Database
| Setting | Current | Recommended |
|---------|---------|-------------|
| `DB_NAME` | `test_database` | `venuloq_prod` |

**Important:** When you change `DB_NAME`, you start with an empty database. You will need to:
1. Run the app once (indexes auto-create on startup via `db_indexes.py`)
2. Create the admin user account
3. Create RM accounts
4. Add/import venues

**Alternative:** If your test database already has good data, you can rename/copy it:
```bash
mongodump --db test_database --out /tmp/dbbackup
mongorestore --db venuloq_prod /tmp/dbbackup/test_database
```

### Environment flag
| Setting | Current | Recommended |
|---------|---------|-------------|
| `ENV` | `dev` | `production` |

What `ENV=production` changes:
- Enables stricter error responses (no stack traces to clients)
- Enables real email sending (if configured)
- Disables debug-mode OTP bypass
- Production logging level

### Recommended: Change `ENV` to `production` only after the Internal Dry Run is successful with `ENV=dev`.

---

## 6. PILOT EXECUTION CHECKLISTS

---

### ADMIN CHECKLIST — Internal Dry Run (Day 1-3)

**Before starting:**
- [ ] Verify backend is running: `GET /api/health` should return 200
- [ ] Verify frontend loads at production URL
- [ ] Verify DB indexes loaded: check backend startup logs for "Database indexes ensured successfully"
- [ ] Verify capacity dashboard: login as admin → `/team/admin/capacity`

**Account setup:**
- [ ] Confirm admin login works: `admin@venulock.in` / `admin123`
- [ ] Create or verify at least 2 RM accounts are active
- [ ] Verify at least 5 test venues are approved and visible on search page
- [ ] Create a test customer account (or use `democustomer@venulock.in`)

**Workflow validation (have team members execute):**
- [ ] Customer submits enquiry → case created with customer-selected RM
- [ ] RM receives notification within 30 seconds
- [ ] RM sees case in dashboard with all tabs
- [ ] RM shares proposal to customer portal
- [ ] Customer sees shared proposal in `/my-cases`
- [ ] Customer sends message via case thread → RM receives it
- [ ] RM replies → customer sees response
- [ ] RM creates payment request → customer sees it (test mode OK here)
- [ ] Execution checklist flow works end-to-end
- [ ] Settlement tracking works

**Monitoring during dry run:**
- [ ] Check `/team/admin/capacity` — are RM load numbers accurate?
- [ ] Check backend logs for `[SLOW]` or `[ERROR]` entries
- [ ] Verify no 5xx errors in browser console
- [ ] Test on iPhone Safari (if building native app)

**After dry run is clean:**
- [ ] Update `ENV=production` in backend `.env`
- [ ] Update `CORS_ORIGINS` to production domains
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Update `REACT_APP_BACKEND_URL` to production API URL
- [ ] Update `REACT_APP_SUPPORT_PHONE` to real number
- [ ] Add Google OAuth redirect URIs in GCP Console
- [ ] (Optional) Add Razorpay live keys if ready for real payments

---

### RM CHECKLIST — Friendly Customer Pilot (Day 4-7)

**Login & dashboard:**
- [ ] Login with RM credentials
- [ ] Dashboard loads with urgency strip (No Contact, Follow-up Due, Waiting, No Reply)
- [ ] Existing cases visible with correct stages

**When a new enquiry arrives:**
- [ ] Receive push notification or see new case in dashboard
- [ ] Open case → verify customer name, venue, event details are correct
- [ ] Verify all tabs load: Comms, Portal, Payments, etc.

**Communication flow:**
- [ ] Log a call (Quick Actions → Call → log outcome)
- [ ] Send a WhatsApp/Email template
- [ ] Schedule a follow-up
- [ ] Check that follow-up appears in dashboard urgency strip

**Portal sharing:**
- [ ] Share a proposal/shortlist to customer portal
- [ ] Verify customer can see it in their `/my-cases` view
- [ ] Check engagement summary (shared/viewed/responded)

**Messaging:**
- [ ] Send message to customer via case thread
- [ ] Verify customer receives it
- [ ] Read customer's reply
- [ ] Check unread badge behavior

**Payment (if Razorpay live):**
- [ ] Create a deposit request
- [ ] Verify customer sees payment request
- [ ] After customer pays, verify receipt appears
- [ ] Check collection summary updates

**Report issues using format:**
```
[P0/P1/P2] [Date]
Flow: (e.g., sharing proposal)
Steps: ...
Expected: ...
Actual: ...
Device/Browser: ...
```

---

### TEST CUSTOMER CHECKLIST — Friendly Customer Pilot (Day 4-7)

**Account & login:**
- [ ] Login via email OTP (or Google OAuth if configured)
- [ ] Redirected to landing page or `/my-cases`

**Submitting an enquiry:**
- [ ] Search for a venue on landing page
- [ ] Open venue detail page
- [ ] Click "Plan My Event" (or equivalent CTA)
- [ ] Fill enquiry form — verify RM selection shows 3 options
- [ ] Select an RM → submit
- [ ] See success screen with selected RM name and callback SLA
- [ ] If you double-click submit, verify it doesn't create duplicates

**Case portal (`/my-cases`):**
- [ ] See your case(s) listed with correct details
- [ ] Open a case → see tabs: Shared, Payments, Messages, Timeline, Contact
- [ ] If RM has shared a proposal → see it in Shared tab
- [ ] Respond to a shared item (e.g., "Interested", "Request Callback")

**Messaging:**
- [ ] Send a message to RM via Messages tab
- [ ] Receive RM's reply
- [ ] Check unread badge on Messages tab

**Payments (if Razorpay live):**
- [ ] See payment request in Payments tab
- [ ] Click "Pay Now" → Razorpay checkout opens
- [ ] Complete payment → see receipt

**Mobile/PWA (iPhone Safari):**
- [ ] All pages load without content hidden under notch or home indicator
- [ ] Bottom tab bar is accessible and doesn't overlap content
- [ ] Tabs scroll horizontally if they overflow
- [ ] Back navigation works from every screen
- [ ] Keyboard doesn't hide the message compose input

**Report issues to Admin/RM with:**
- What you were doing
- What you expected
- What happened instead
- Screenshot if visual
- Device & browser (e.g., iPhone 14, Safari 17)

---

## PILOT SEQUENCE TIMELINE

| Day | Phase | Focus | Payments |
|-----|-------|-------|----------|
| 1-3 | Internal Dry Run | Full workflow with team only | Test mode OK |
| 3 | Config Day | Update env vars, GCP Console, CORS | Still test mode |
| 4-7 | Friendly Customer Pilot | 2-3 known customers, real enquiries | Test mode or live |
| 8-14 | Small Live Pilot | 5-10 real customers | Live Razorpay required |
| 15+ | Review & Expand | Scale based on learnings | Live |

---

## ESCALATION TRIGGERS

- **Pause pilot immediately if:** Login fails for any user, enquiry doesn't create a case, payment silently fails, case portal shows wrong/missing data
- **Log and continue if:** Slow page load, minor spacing issue, notification delayed >5 min
- **Log for next patch if:** Wording issues, icon alignment, color inconsistency

---

## QUICK REFERENCE: Key URLs

| What | URL |
|------|-----|
| Customer app | `https://<production-domain>/` |
| Team portal | `https://<production-domain>/team/login` |
| Admin capacity | `https://<production-domain>/team/admin/capacity` |
| Health check | `https://<production-domain>/api/health` |
| Performance stats | `https://<production-domain>/api/platform-ops/performance/stats` |
| Razorpay webhook | `https://<production-domain>/api/payments/webhook` |
