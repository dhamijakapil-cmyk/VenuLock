# VenuLoQ iOS App — Separate Deployment Guide

## Architecture: PWA vs iOS App

VenuLoQ runs as **two separate deployments** from the **same codebase**:

| | PWA (Web) | iOS App (Native) |
|---|-----------|-------------------|
| **URL** | `delhi.venuloq.com` | App Store / TestFlight |
| **Auth options** | Google + Email/OTP + Password | Google + **Apple** + Email/OTP + Password |
| **Distribution** | Web browser | Xcode → TestFlight → App Store |
| **Updates** | Deploy to server (instant) | Rebuild + re-archive (or use Remote mode) |
| **Platform detection** | `isCapacitor() = false` | `isCapacitor() = true` |

The **"Sign in with Apple"** button only appears inside the Capacitor native shell (`isCapacitor() === true`). This is required by Apple's App Store guidelines when you offer other social login options.

---

## Deployment Options

### Option A: Remote Mode (Recommended for Pre-Launch)

The iOS app loads from your **live web server**. No bundled assets.

**Pros:** Instant updates — change the web app, refresh the iOS app. No re-archiving needed.
**Cons:** Requires internet connection. Slightly slower initial load.

**Steps:**

1. **Deploy the web app** to `delhi.venuloq.com` (or `testing.delhi.venuloq.com`)
2. **Configure Capacitor** to point to your live URL:
   ```ts
   // capacitor.config.ts
   server: {
     url: 'https://delhi.venuloq.com',
     cleartext: false,
   },
   ```
3. **Build and sync:**
   ```bash
   cd frontend
   yarn build
   npx cap sync ios
   ```
4. **Open in Xcode** and archive for TestFlight:
   ```bash
   npx cap open ios
   ```

**Update cycle:** Just deploy web changes. The iOS app loads from your server automatically.

---

### Option B: Local Bundled Mode (Recommended for App Store)

The iOS app bundles the built web assets. Fully offline-capable.

**Pros:** Faster load, works offline, no server dependency.
**Cons:** Every update requires a new Xcode archive + TestFlight/App Store submission.

**Steps:**

1. **Remove/comment the `server` block** in `capacitor.config.ts`
2. **Set environment variables** for the iOS build:
   ```bash
   # .env for iOS builds — point API to your production backend
   REACT_APP_BACKEND_URL=https://delhi.venuloq.com
   ```
3. **Build and sync:**
   ```bash
   cd frontend
   GENERATE_SOURCEMAP=false yarn build
   npx cap sync ios
   ```
4. **Open in Xcode** and archive:
   ```bash
   npx cap open ios
   # Product → Archive → Distribute App → TestFlight & App Store
   ```

**Update cycle:** `yarn build` → `npx cap sync ios` → Archive in Xcode → Upload to TestFlight.

---

## Apple Sign In — iOS App Only

### Why it's iOS-only

Apple requires "Sign in with Apple" when your iOS app offers **any** third-party social login (Google, Facebook, etc.). The PWA is exempt from this requirement.

The code handles this automatically:
```js
// AuthPage.js — Apple button only renders on native
{isCapacitor() && (
  <button onClick={handleAppleLogin}>Sign in with Apple</button>
)}
```

### Apple Developer Setup for Sign in with Apple

1. **Apple Developer Console** → Certificates, Identifiers & Profiles

2. **Create App ID** (if not already done):
   - Bundle ID: `com.venuloq.app`
   - Enable: "Sign in with Apple" capability

3. **Create Services ID** (for web-based OAuth):
   - Identifier: `com.venuloq.app.web` (or similar)
   - Configure: Sign in with Apple
   - Domains: `delhi.venuloq.com`, `testing.delhi.venuloq.com`
   - Return URLs:
     - `https://delhi.venuloq.com/auth/apple`
     - `https://testing.delhi.venuloq.com/auth/apple`

4. **Create Private Key**:
   - Keys → Create → "Sign in with Apple"
   - Download the `.p8` file immediately (one-time download)

5. **Add Capability in Xcode**:
   - Select App target → Signing & Capabilities → + Capability → "Sign in with Apple"

### Environment Variables (Backend)

Inject these into the **backend** environment when ready:

```
APPLE_CLIENT_ID=com.venuloq.app.web
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGT...your-key...\n-----END PRIVATE KEY-----
```

The backend endpoints activate automatically when these are set:
- `GET /api/auth/apple/config` → `{ enabled: true }`
- `POST /api/auth/apple/auth-url` → Returns Apple OAuth URL
- `POST /api/auth/apple/callback` → Exchanges code for user JWT

---

## Google OAuth — Both Platforms

Google OAuth works on **both** PWA and iOS app. Same credentials.

### Environment Variables (Backend)

```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### Google Cloud Console

Add **both** origins and redirect URIs:

| Setting | PWA | iOS App (Remote Mode) |
|---------|-----|----------------------|
| JavaScript Origin | `https://delhi.venuloq.com` | Same (loads from web) |
| Redirect URI | `https://delhi.venuloq.com/auth/google` | Same |

---

## Complete Build Steps (Start to Finish)

### Prerequisites
- Mac with Xcode 15+
- Apple Developer Account ($99/year)
- Node.js 18+, yarn, CocoaPods

### First-Time Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd frontend

# 2. Install dependencies
yarn install

# 3. Build the web app
GENERATE_SOURCEMAP=false yarn build

# 4. Sync to iOS project
npx cap sync ios

# 5. Install iOS pods
cd ios/App && pod install --repo-update && cd ../..

# 6. Open in Xcode
npx cap open ios
```

### In Xcode

1. Select **App** target
2. **Signing & Capabilities** tab:
   - Check "Automatically manage signing"
   - Select your Team
   - Bundle Identifier: `com.venuloq.app`
3. Add capability: **Sign in with Apple**
4. Select device: iPhone simulator or physical device
5. **Cmd + R** to run

### TestFlight Distribution

1. **Product → Archive**
2. Organizer → **Distribute App** → TestFlight & App Store
3. Upload and wait for processing (~15 min)
4. Add testers in App Store Connect → TestFlight

---

## Configuration Reference

| Setting | Value |
|---------|-------|
| App ID | `com.venuloq.app` |
| App Name | VenuLoQ |
| Min iOS | 14.0 |
| Orientation | Portrait only |
| Auth (PWA) | Google → Email/OTP → Password |
| Auth (iOS) | Google → Apple → Email/OTP → Password |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Sign in with Apple" not showing in iOS app | Ensure Capacitor is properly initialized — check `window.Capacitor.isNativePlatform()` |
| Apple auth returns error | Verify Services ID domains match your redirect URI exactly |
| White screen on launch | Run `yarn build && npx cap sync ios` |
| Pod install fails | `cd ios/App && pod install --repo-update` |

---

*Last updated: March 2026*
*VenuLoQ v1.0.0*
