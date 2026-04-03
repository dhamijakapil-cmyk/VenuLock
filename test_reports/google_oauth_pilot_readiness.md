# VenuLoQ — Google OAuth Pilot-Phase Readiness Report
**Date:** April 3, 2026  
**Scope:** Current pilot phase only

---

## 1. Current Active Domain Scope

| Domain | Role | Active Now |
|--------|------|-----------|
| `testing.delhi.venuloq.com` | Customer pilot interface | YES |
| `teams.venuloq.com` | Internal Team Portal | YES |
| `venuloq.com` | Future customer launch (with iOS app) | NO — not active yet |
| `www.venuloq.com` | Future customer launch | NO — not active yet |

---

## 2. Current Google OAuth Domains That Should Be Supported

| Domain | Google OAuth needed? | Reason |
|--------|---------------------|--------|
| `testing.delhi.venuloq.com` | **YES** | Customer-facing pilot. AuthPage shows "Continue with Google" button. |
| `teams.venuloq.com` | **NO** | TeamLogin (`/team/login`) is email/password only. Zero Google OAuth code. |

---

## 3. Current Required Google Console JavaScript Origins

```
https://testing.delhi.venuloq.com
```

That's it for the current phase. No other origins needed.

---

## 4. Current Required Google Console Redirect URIs

```
https://testing.delhi.venuloq.com/auth/google
```

That's it for the current phase.

---

## 5. Current Required Env / Secret Values

### Backend `.env` (production/pilot deploy)
```
GOOGLE_CLIENT_ID=<your-gcp-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-gcp-oauth-client-secret>
CORS_ORIGINS=https://testing.delhi.venuloq.com,https://teams.venuloq.com
FRONTEND_URL=https://testing.delhi.venuloq.com
```

### Frontend `.env` (production/pilot deploy)
```
REACT_APP_BACKEND_URL=<pilot-backend-url>
```

### Current state (preview env)
- `GOOGLE_CLIENT_ID` = already set (`721576123929-...`)
- `GOOGLE_CLIENT_SECRET` = already set (non-empty)
- `CORS_ORIGINS` = not set (defaults to `*`) — **must be restricted**
- `FRONTEND_URL` = preview URL — **must be updated for pilot**

---

## 6. Current-Phase Blockers

### BLOCKER A — `testing.delhi.venuloq.com` not in `GCP_OAUTH_DOMAINS`

**File:** `frontend/src/pages/AuthPage.js` line 73  
**Current list:** `['venuloq.com', 'www.venuloq.com', 'delhi.venuloq.com']`  
**Missing:** `testing.delhi.venuloq.com`

**Impact:** On the pilot customer domain, clicking "Continue with Google" will route to the Emergent preview OAuth path instead of the custom GCP OAuth path. Google login will fail or produce incorrect behavior.

**Fix:** Add `'testing.delhi.venuloq.com'` to the array. One token added to one line.

### BLOCKER B — `testing.delhi.venuloq.com` not in `isProduction` team-redirect gate

**File:** `frontend/src/App.js` line 300  
**Current:** `hostname === 'venuloq.com' || hostname === 'delhi.venuloq.com'`  
**Missing:** `testing.delhi.venuloq.com`

**Impact:** On `testing.delhi.venuloq.com`, navigating to `/team/*` will render the internal Team Portal inline instead of redirecting to `teams.venuloq.com`. A pilot customer could access `/team/login` on the customer domain — an auth boundary leak.

**Fix:** Add `|| hostname === 'testing.delhi.venuloq.com'` to the condition. One expression added to one line.

### BLOCKER C — CORS wildcard

**Impact:** Any domain can currently make authenticated API calls to the backend. Must be locked before pilot.

**Fix:** Set `CORS_ORIGINS` env var to `https://testing.delhi.venuloq.com,https://teams.venuloq.com` in production `.env`.

---

## 7. Future Launch Cutover Items (DO NOT implement now)

These will be needed when `venuloq.com` / `www.venuloq.com` go live with the iOS app:

| Item | What | When |
|------|------|------|
| Add `venuloq.com`, `www.venuloq.com` to GCP Console redirect URIs + JS origins | GCP Console config | At launch |
| `GCP_OAUTH_DOMAINS` already includes `venuloq.com` and `www.venuloq.com` | No code change needed | — |
| Add `www.venuloq.com` to `isProduction` team-redirect gate (App.js line 300) | 1-line code change | At launch |
| Update `CORS_ORIGINS` to include launch domains | Env config | At launch |
| Update `FRONTEND_URL` to `https://venuloq.com` | Env config | At launch |

---

## 8. Go / No-Go for Current Pilot OAuth

**CONDITIONAL GO — 2 code fixes + 1 env config required.**

| Item | Status |
|------|--------|
| OAuth implementation architecture | Sound — dynamic `redirect_uri`, no hardcoded URLs |
| Customer Google auth on `testing.delhi.venuloq.com` | Blocked (Blocker A) — 1-line fix |
| Team portal auth boundary on customer domain | Blocked (Blocker B) — 1-line fix |
| CORS restriction | Blocked (Blocker C) — env config only |
| Auth leakage between customer ↔ team | Safe after Blocker B fix — TeamLogin is email/password only, no Google overlap |
| Cookie isolation | Safe — cookies default to serving domain, no cross-domain sharing |
| Session/callback logic | Sound — callback URL derived from `window.location.origin`, works per-domain |

### To reach GO:
1. I apply Fix A + Fix B (2 lines of code) — ready to apply on your approval
2. You register in GCP Console:
   - Redirect URI: `https://testing.delhi.venuloq.com/auth/google`
   - JavaScript Origin: `https://testing.delhi.venuloq.com`
3. You set `CORS_ORIGINS` in production backend `.env` at deploy time
