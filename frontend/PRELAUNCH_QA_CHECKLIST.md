# VenuLoQ Pre-Launch QA Checklist

## Status: Code-Complete, Pending External Dependencies

---

## 1. Backend Credential Injection

### Google OAuth
Add to backend environment variables:
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

**Verification after injection:**
```bash
curl https://delhi.venuloq.com/api/auth/google/config
# Expected: {"enabled":true,"client_id":"<your-client-id>"}
```

### Apple Sign In
Add to backend environment variables:
```
APPLE_CLIENT_ID=<Services ID, e.g., com.venuloq.app.web>
APPLE_TEAM_ID=<10-char Team ID>
APPLE_KEY_ID=<Key ID from Apple Developer>
APPLE_PRIVATE_KEY=<P8 key content with \n for newlines>
```

**Verification after injection:**
```bash
curl https://delhi.venuloq.com/api/auth/apple/config
# Expected: {"enabled":true,"client_id":"com.venuloq.app.web"}
```

### WhatsApp Support Number
Replace placeholder `919999999999` and `919876543210` with real VenuLoQ support number in:
- `frontend/src/components/EnquiryForm.js` (line 180 fallback)
- `frontend/src/components/venue/StickyMobileCTA.js` (line 19 fallback)
- `frontend/src/pages/SupportPage.js`
- `frontend/src/pages/ContactPage.js`
- `frontend/src/pages/public/LandingPage.js`

---

## 2. Custom Domain Verification

### DNS Configuration
| Domain | Purpose |
|--------|---------|
| `delhi.venuloq.com` | Production customer app |
| `testing.delhi.venuloq.com` | Staging/test environment |

### After domain is live, verify:
- [ ] `https://delhi.venuloq.com` loads the app
- [ ] `https://delhi.venuloq.com/auth` shows auth page
- [ ] `https://delhi.venuloq.com/api/auth/google/config` returns correct config
- [ ] `https://delhi.venuloq.com/api/auth/apple/config` returns correct config
- [ ] `REACT_APP_BACKEND_URL` in frontend env matches the domain

### Google Cloud Console — Authorized URIs
| Setting | Production | Testing |
|---------|-----------|---------|
| JavaScript Origin | `https://delhi.venuloq.com` | `https://testing.delhi.venuloq.com` |
| Redirect URI | `https://delhi.venuloq.com/auth/google` | `https://testing.delhi.venuloq.com/auth/google` |

### Apple Developer Console — Services ID
| Setting | Production | Testing |
|---------|-----------|---------|
| Domain | `delhi.venuloq.com` | `testing.delhi.venuloq.com` |
| Return URL | `https://delhi.venuloq.com/auth/apple` | `https://testing.delhi.venuloq.com/auth/apple` |

---

## 3. Xcode Configuration

### App Target Settings
- [ ] Bundle Identifier: `com.venuloq.app`
- [ ] Display Name: VenuLoQ
- [ ] Deployment Target: iOS 14.0+
- [ ] Device Orientation: Portrait only

### Signing & Capabilities
- [ ] Automatically manage signing → ON
- [ ] Team: Your Apple Developer Team
- [ ] Add Capability: **Sign in with Apple**

### Build for TestFlight
1. `cd frontend && yarn build && npx cap sync ios`
2. Open Xcode: `npx cap open ios`
3. Product → Archive
4. Organizer → Distribute App → TestFlight & App Store
5. Add test users in App Store Connect → TestFlight

---

## 4. Native iPhone Device Testing

### Auth Flows
| Test | Steps | Expected Result |
|------|-------|----------------|
| Google Sign In | Tap "Continue with Google" → Complete Google flow | Lands on /my-enquiries with user name |
| Apple Sign In | Tap "Sign in with Apple" → Authenticate with Face ID/passcode | Lands on /my-enquiries (Apple button only visible in native app) |
| Email OTP | Tap "Continue with Email" → Enter email → Enter 6-digit code | Lands on /my-enquiries |
| Password Login | Tap "Sign in with password" → Enter creds → Sign In | Lands on /my-enquiries |
| Wrong Password | Enter wrong password → Sign In | Shows "Invalid credentials" error |
| Logout | Profile → Logout | Returns to /auth, clears session |
| Re-login | After logout, login again | Session restored correctly |

### Session Handling
| Test | Steps | Expected Result |
|------|-------|----------------|
| Session persistence | Login → Close app → Reopen | Still logged in, lands on dashboard |
| Token expiry | Wait for token to expire OR tamper with localStorage | Auto-redirects to /auth |
| Background resume | Login → Switch to other app → Return | Session intact, data refreshes |
| Force quit resume | Login → Force quit → Reopen | Still logged in if token valid |

### Callback Error States
| Test | Steps | Expected Result |
|------|-------|----------------|
| Google cancelled | Start Google login → Cancel/go back | Shows "Google sign-in was cancelled", returns to auth |
| Apple cancelled | Start Apple login → Cancel | Shows "Apple sign-in was cancelled", returns to auth |
| Network error during callback | Start login → Disable WiFi mid-flow | Shows "Sign-in failed" with "Try Again" button |
| Timeout | Start login → Backend unreachable | After 20s, shows "Sign-in is taking too long" with "Try Again" |

### Post-Login Routing
| Test | Steps | Expected Result |
|------|-------|----------------|
| Default redirect | Login fresh | Lands on /my-enquiries |
| Deep link redirect | Click venue link while logged out → Login | Returns to the venue page |
| Role-based redirect | Login as admin vs customer | Admin → /admin/dashboard, Customer → /my-enquiries |

### Post-Submission Journey
| Test | Steps | Expected Result |
|------|-------|----------------|
| Submit enquiry | Navigate to venue → Tap "Book Now" → Fill form → Submit | Success screen shows: checkmark, booking ref, RM card, "What Happens Next" timeline |
| RM card | Check success screen | Shows RM name, photo (if available), star rating |
| WhatsApp deep link | Tap "Chat on WhatsApp" | Opens WhatsApp with pre-filled message including booking ref |
| Track request | Tap "Track Your Request" | Navigates to /my-enquiries |
| Timeline accuracy | Check "What Happens Next" | 4 steps: Callback → Shortlist → Site Visit → Negotiation |

### Notifications
| Test | Steps | Expected Result |
|------|-------|----------------|
| Push permission prompt | First visit to dashboard with enquiries | Shows "Get instant updates" banner with Enable/Dismiss |
| Enable push | Tap "Enable" on prompt | iOS permission dialog appears |
| Dismiss prompt | Tap X on prompt | Banner disappears for session |
| Notification badge | Have unread notifications | "Requests" tab shows gold badge with count |

### WhatsApp & Contact
| Test | Steps | Expected Result |
|------|-------|----------------|
| WhatsApp from success screen | Submit enquiry → "Chat on WhatsApp" | Opens WhatsApp with RM phone and personalized message |
| WhatsApp from venue page | Venue detail → WhatsApp button | Opens WhatsApp with venue name |

---

## 5. Domain-Agnostic Code Verification

### Confirmed ✓
- All OAuth redirect URIs use `window.location.origin` — works on any domain
- All API calls use `process.env.REACT_APP_BACKEND_URL` — configurable per environment
- Capacitor config uses `com.venuloq.app` bundle ID
- Backend reads all credentials from environment variables only
- No hardcoded preview URLs in production code paths

### Emergent Auth Fallback (Expected)
When `GOOGLE_CLIENT_ID` is NOT set, the Google button falls back to Emergent-managed auth (`auth.emergentagent.com`). Once your custom credentials are injected, this fallback is never triggered. The fallback exists for development/preview safety only.

---

## 6. Environment Variables — Complete Reference

### Backend (.env)
| Variable | Status | Required For |
|----------|--------|-------------|
| `MONGO_URL` | Set ✓ | Database |
| `DB_NAME` | Set ✓ | Database |
| `JWT_SECRET` | Set ✓ | Auth tokens |
| `RESEND_API_KEY` | Set ✓ | Email delivery |
| `SENDER_EMAIL` | Set ✓ | Email from address |
| `VAPID_PRIVATE_KEY` | Set ✓ | Push notifications |
| `VAPID_PUBLIC_KEY` | Set ✓ | Push notifications |
| `GOOGLE_CLIENT_ID` | **Pending** | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | **Pending** | Google OAuth |
| `APPLE_CLIENT_ID` | **Pending** | Apple Sign In |
| `APPLE_TEAM_ID` | **Pending** | Apple Sign In |
| `APPLE_KEY_ID` | **Pending** | Apple Sign In |
| `APPLE_PRIVATE_KEY` | **Pending** | Apple Sign In |

### Frontend (.env)
| Variable | Status | Required For |
|----------|--------|-------------|
| `REACT_APP_BACKEND_URL` | Set ✓ (update for production domain) | API base URL |
| `REACT_APP_VAPID_PUBLIC_KEY` | Set ✓ | Push notifications |

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Google consent screen shows "Testing" until published | Medium | Complete OAuth consent screen verification with Google. Until then, only test users can sign in |
| Apple Sign In only works after capability added in Xcode | Low | Step 3 above — straightforward Xcode toggle |
| Placeholder WhatsApp numbers in production | Medium | Replace before launch — see Section 1 |
| Emergent Auth fallback if custom Google creds missing | Low | Fallback is functional but shows "Testing" branding. Ensure GOOGLE_CLIENT_ID is always set in production |

---

*Last updated: March 29, 2026*
*VenuLoQ v1.0.0 — Private Pre-Launch*
