# VenuLoQ — Google OAuth Production Readiness Report
**Date:** April 3, 2026

---

## 1. Current Google Auth Flow

The system has **two** OAuth paths, selected by hostname at runtime:

### Path A — Custom GCP OAuth (production domains)
**Triggered when** `hostname` matches `GCP_OAUTH_DOMAINS` in `AuthPage.js`:
```
Currently: ['venuloq.com', 'www.venuloq.com', 'delhi.venuloq.com']
```

| Step | Component | Action |
|------|-----------|--------|
| 1 | `AuthPage.js` | Calls `POST /api/auth/google/auth-url` with `redirect_uri = origin + '/auth/google'` |
| 2 | `google_auth.py` | Builds Google OAuth URL using `GOOGLE_CLIENT_ID` + provided `redirect_uri` |
| 3 | Browser | User authenticates at Google |
| 4 | Google | Redirects to `{origin}/auth/google?code=XXX` |
| 5 | `GoogleAuthCallback.js` | Extracts `code`, sends `POST /api/auth/google/callback` with `{ code, redirect_uri }` |
| 6 | `google_auth.py` | Exchanges code → access_token → user info. Creates/updates user. Returns JWT. |

**Key design:** `redirect_uri` is always `window.location.origin + '/auth/google'` — dynamically derived, never hardcoded in backend. Backend passes it through to Google verbatim.

### Path B — Emergent-managed OAuth (preview/non-production domains)
**Triggered when** hostname does NOT match `GCP_OAUTH_DOMAINS`.

Uses `demobackend.emergentagent.com/auth/v1/env/oauth/google` → session-based flow via `AuthCallback.js` → `POST /api/auth/google-session`.

**This path is irrelevant for production. It exists solely for preview environments.**

### Team Portal Auth
`TeamLogin.js` at `/team/login` uses **email/password only**. Zero Google OAuth code. No change needed.

---

## 2. Production Domains Compatibility

| Domain | In `GCP_OAUTH_DOMAINS`? | OAuth Path | `redirect_uri` generated | Status |
|--------|------------------------|------------|--------------------------|--------|
| `venuloq.com` | YES | Path A (GCP) | `https://venuloq.com/auth/google` | READY |
| `www.venuloq.com` | YES | Path A (GCP) | `https://www.venuloq.com/auth/google` | READY |
| `teams.venuloq.com` | **NO** | Path B (Emergent) | N/A | SEE BLOCKER #1 |

### Domain routing behavior (production):

| Hostname | `/auth` shows | `/team/*` behavior |
|----------|--------------|-------------------|
| `venuloq.com` | AuthPage (Google + password) | Redirects to `teams.venuloq.com` |
| `www.venuloq.com` | AuthPage (Google + password) | **Renders TeamApp inline** (see Blocker #2) |
| `teams.venuloq.com` | AuthPage is accessible at `/auth` but TeamLogin at `/team/login` is the intended entry | TeamApp renders inline |

---

## 3. Required Google Console Entries

### Authorized Redirect URIs (OAuth 2.0 Client)
```
https://venuloq.com/auth/google
https://www.venuloq.com/auth/google
```
Add `https://teams.venuloq.com/auth/google` **only** if you decide to enable Google auth on the teams domain (see Blocker #1).

### Authorized JavaScript Origins
```
https://venuloq.com
https://www.venuloq.com
```
Add `https://teams.venuloq.com` only if Google auth is enabled there.

---

## 4. Required Env / Secret Values

### Backend `/app/backend/.env` (production)
```
GOOGLE_CLIENT_ID=<your-gcp-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-gcp-oauth-client-secret>
CORS_ORIGINS=https://venuloq.com,https://www.venuloq.com,https://teams.venuloq.com
FRONTEND_URL=https://venuloq.com
```

### Frontend
No env changes needed. `redirect_uri` is derived dynamically from `window.location.origin`. `REACT_APP_BACKEND_URL` must point to production API.

### Current state of env
- `GOOGLE_CLIENT_ID` = `721576123929-2lcet2njm3t7kr1vf7eb5diq1vmmm219.apps.googleusercontent.com` (already set)
- `GOOGLE_CLIENT_SECRET` = set (non-empty)
- `CORS_ORIGINS` = not set (defaults to `*` — must be restricted for production)
- `FRONTEND_URL` = preview URL (must be updated for production)

---

## 5. Blockers Found

### BLOCKER #1 — `teams.venuloq.com` not in `GCP_OAUTH_DOMAINS` (Decision Required)

**File:** `frontend/src/pages/AuthPage.js` line 73
**Current:** `['venuloq.com', 'www.venuloq.com', 'delhi.venuloq.com']`
**Missing:** `teams.venuloq.com`

**Impact:** If a user on `teams.venuloq.com` navigates to `/auth` and clicks "Continue with Google", they will be routed to the Emergent preview OAuth path (Path B), which will fail or behave incorrectly in production.

**Decision needed from you:**
- (a) Team members should NOT use Google auth — no code change needed. `/auth` on `teams.venuloq.com` is not the intended entry point (TeamLogin at `/team/login` is). Consider adding a redirect from `/auth` → `/team/login` on the teams domain.
- (b) Team members SHOULD be able to use Google auth — add `teams.venuloq.com` to `GCP_OAUTH_DOMAINS` and register `https://teams.venuloq.com/auth/google` in GCP Console.

### BLOCKER #2 — `www.venuloq.com` missing from production domain check

**File:** `frontend/src/App.js` line 300
**Current:** `hostname === 'venuloq.com' || hostname === 'delhi.venuloq.com'`
**Missing:** `www.venuloq.com`

**Impact:** On `www.venuloq.com`, navigating to `/team/*` will render TeamApp inline instead of redirecting to `teams.venuloq.com`. This means a customer on `www.venuloq.com/team/login` sees the internal team login page directly — an auth boundary concern.

**Fix:** Add `hostname === 'www.venuloq.com'` to the `isProduction` check. One-line change.

### BLOCKER #3 — CORS wildcard in production

**File:** `backend/server.py` line 13 + `backend/.env`
**Current:** `CORS_ORIGINS` not set → defaults to `*`

**Impact:** Allows any domain to make authenticated API calls. Must be locked to production domains before live deployment.

**Fix:** Set `CORS_ORIGINS=https://venuloq.com,https://www.venuloq.com,https://teams.venuloq.com` in production `.env`.

---

## 6. Minimal Fixes Needed

| # | Fix | File | Change | Scope |
|---|-----|------|--------|-------|
| 1 | Add `www.venuloq.com` to production domain check | `App.js` line 300 | Add `\|\| hostname === 'www.venuloq.com'` | 1 line |
| 2 | (If option b for Blocker #1) Add `teams.venuloq.com` to `GCP_OAUTH_DOMAINS` | `AuthPage.js` line 73 | Add to array | 1 line |
| 3 | Set `CORS_ORIGINS` in production `.env` | `backend/.env` | Config value | 0 code lines |
| 4 | Set `FRONTEND_URL` in production `.env` | `backend/.env` | Config value | 0 code lines |

**Total code changes: 1 line mandatory (Fix #1), 1 line conditional (Fix #2). Zero architectural changes.**

---

## 7. Go / No-Go for Production OAuth

**CONDITIONAL GO.**

The OAuth implementation is architecturally sound — `redirect_uri` is dynamically derived, backend passes it through cleanly, no hardcoded URLs. Two small code fixes and two env config values are all that's needed.

Blockers that must be resolved before production deploy:
1. You must decide on Blocker #1 (teams Google auth: yes or no)
2. Fix #1 must be applied (www.venuloq.com team redirect)
3. CORS must be restricted (env config)
4. GCP Console redirect URIs must be registered

---

## 8. Exact Next Action for You

1. **Decide:** Should `teams.venuloq.com` support Google OAuth? Reply (a) no or (b) yes.
2. **GCP Console:** Log in to your Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → Add these **Authorized redirect URIs**:
   - `https://venuloq.com/auth/google`
   - `https://www.venuloq.com/auth/google`
   - (If option b) `https://teams.venuloq.com/auth/google`
3. **GCP Console:** Add these **Authorized JavaScript origins**:
   - `https://venuloq.com`
   - `https://www.venuloq.com`
   - (If option b) `https://teams.venuloq.com`
4. **Tell me your decision on Blocker #1** and I will apply Fix #1 (mandatory) and Fix #2 (if applicable) — total 1-2 lines of code.
