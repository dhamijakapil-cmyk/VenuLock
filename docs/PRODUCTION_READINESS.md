# Production Readiness Checklist — VenuLoQ

## Environment Configuration Status

### Backend (.env)
| Variable | Status | Notes |
|----------|--------|-------|
| `MONGO_URL` | ✅ Set | Production MongoDB |
| `DB_NAME` | ✅ Set | — |
| `CORS_ORIGINS` | ✅ Set | — |
| `ENV` | ✅ Set | — |
| `EMERGENT_LLM_KEY` | ✅ Set | For AI integrations |
| `RESEND_API_KEY` | ✅ Set | Email delivery working |
| `SENDER_EMAIL` | ✅ Set | — |
| `VAPID_PRIVATE_KEY` | ✅ Set | Push notifications |
| `VAPID_PUBLIC_KEY` | ✅ Set | — |
| `VAPID_CONTACT` | ✅ Set | — |
| `JWT_SECRET` | ✅ Set | Token signing |
| `GOOGLE_CLIENT_ID` | ✅ Set | Google OAuth configured |
| `GOOGLE_CLIENT_SECRET` | ✅ Set | — |
| `APPLE_CLIENT_ID` | ⚠️ Set | Needs Apple Developer setup |
| `APPLE_TEAM_ID` | ⚠️ Set | Needs Apple Developer setup |
| `APPLE_KEY_ID` | ⚠️ Set | Needs Apple Developer setup |
| `APPLE_PRIVATE_KEY` | ⚠️ Set | Needs Apple Developer setup |
| `FRONTEND_URL` | ✅ Set | Used for onboarding links |

### Frontend (.env)
| Variable | Status | Notes |
|----------|--------|-------|
| `REACT_APP_BACKEND_URL` | ✅ Set | Preview URL |
| `WDS_SOCKET_PORT` | ✅ Set | WebSocket for hot reload |
| `REACT_APP_VAPID_PUBLIC_KEY` | ✅ Set | Push notifications |
| `REACT_APP_SUPPORT_PHONE` | ⚠️ Placeholder | `919876543210` — update with real number |

---

## Google Auth Redirect URI Fix

**Issue:** `redirect_uri_mismatch` error when users try Google login.

**Root Cause:** The app sends a redirect URI to Google that isn't registered in the Google Cloud Console.

### Steps to Fix

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select the OAuth 2.0 Client ID used by VenuLoQ
3. Under **Authorized redirect URIs**, add:
   ```
   https://premium-event-search.preview.emergentagent.com/api/auth/google/callback
   ```
4. For production, also add:
   ```
   https://delhi.venuloq.com/api/auth/google/callback
   https://teams.venuloq.com/api/auth/google/callback
   ```
5. Under **Authorized JavaScript origins**, add:
   ```
   https://premium-event-search.preview.emergentagent.com
   https://delhi.venuloq.com
   https://teams.venuloq.com
   ```
6. Save and wait 5 minutes for propagation

---

## iOS Native QA Checklist

Run on physical iPhone via Xcode:

| # | Check | Status |
|---|-------|--------|
| 1 | App loads without blank screen | ⬜ Pending |
| 2 | Safe area insets render correctly (notch, home indicator) | ⬜ Pending |
| 3 | Login flow works (email/password) | ⬜ Pending |
| 4 | Google Sign-In works | ⬜ Pending (depends on redirect fix) |
| 5 | Apple Sign-In works | ⬜ Pending (needs Apple Developer config) |
| 6 | Push notifications register | ⬜ Pending |
| 7 | Venue search and browsing | ⬜ Pending |
| 8 | Team Portal access (if applicable) | ⬜ Pending |
| 9 | Touch targets are 44pt minimum | ⬜ Pending |
| 10 | Scrolling is smooth, no janky animations | ⬜ Pending |

---

## Production DNS Configuration

| Domain | Purpose | Status |
|--------|---------|--------|
| `delhi.venuloq.com` | Customer-facing app | ⬜ Pending DNS |
| `teams.venuloq.com` | Internal Team Portal | ⬜ Pending DNS |

---

## Role Visibility Audit

| Role | Login | Sidebar | Quick Actions | Page Access | Access Control |
|------|-------|---------|---------------|-------------|----------------|
| RM | ✅ | ✅ 6 items | ✅ 5 actions | ✅ All RM pages | ✅ Blocked from admin/field |
| Venue Specialist | ✅ | ✅ 2 items | ✅ 3 actions | ✅ All field pages | ✅ Blocked from RM/admin |
| VAM/Team Lead | ✅ | ✅ 2 items | ✅ 1 action | ✅ Review pages | ✅ Blocked from RM/admin |
| Venue Manager | ✅ | ✅ 4 items | ✅ 1 action | ✅ Approval/publish pages | ✅ Blocked from RM/admin |
| Data Team | ⬜ No creds | ✅ 2 items | ✅ Config exists | ⬜ Untested | — |
| Finance | ⬜ No creds | ✅ 3 items | ✅ Config exists | ⬜ Untested | — |
| Admin | ✅ | ✅ 12+ items | ✅ All actions | ✅ Full access | ✅ As expected |

---

## Items Requiring User Action

| # | Item | Dependency |
|---|------|------------|
| 1 | Add Google redirect URIs in GCP Console | User (Google Cloud) |
| 2 | Complete Apple Developer setup | User (Apple Developer) |
| 3 | Update REACT_APP_SUPPORT_PHONE | User (provide real number) |
| 4 | Configure production DNS | User (domain registrar) |
| 5 | Create data_team and finance test accounts | User (or admin via User Management) |
| 6 | Run iOS QA on physical device | User (Xcode) |
| 7 | Configure Razorpay production keys | User (when ready for live payments) |
