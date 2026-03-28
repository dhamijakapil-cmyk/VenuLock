# VenuLoQ iOS App — Build Guide

## Pre-Launch Private Build (TestFlight)

This guide walks you through building the VenuLoQ iPhone app from the Capacitor iOS project and distributing it via TestFlight for private testing.

---

## Prerequisites

- **Mac** with macOS 13+ (Ventura or later)
- **Xcode 15+** installed from App Store
- **Apple Developer Account** ($99/year) — [developer.apple.com](https://developer.apple.com)
- **Node.js 18+** and **yarn** installed
- **CocoaPods** — install with: `sudo gem install cocoapods`

---

## Step 1: Clone & Setup

```bash
# Clone the repo (or download from Emergent)
git clone <your-repo-url>
cd frontend

# Install dependencies
yarn install
```

---

## Step 2: Configure for Production

Edit `capacitor.config.ts`:

```ts
// For production builds, the server block should be REMOVED
// (the app will use bundled local assets)
// For development/testing, you can point to your live server:
server: {
  url: 'https://testing.delhi.venuloq.com',
  cleartext: true,
},
```

**Two modes:**
- **Remote mode** (testing): Uncomment the `server` block — app loads from your live URL. Changes deploy instantly without rebuilding.
- **Local mode** (production): Remove/comment the `server` block — app uses bundled assets. Faster, works offline.

---

## Step 3: Build the Web App

```bash
# Build the React app
GENERATE_SOURCEMAP=false yarn build

# Sync the build to the iOS project
npx cap sync ios
```

---

## Step 4: Open in Xcode

```bash
npx cap open ios
```

This opens the Xcode project at `ios/App/App.xcworkspace`.

---

## Step 5: Configure Signing in Xcode

1. Select the **App** target in the left sidebar
2. Go to **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Select your **Team** (Apple Developer Account)
5. Set **Bundle Identifier**: `com.venuloq.app`

---

## Step 6: Set App Icon

The app icon is pre-configured at:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
```
Xcode will auto-generate all required sizes from the 1024x1024 master.

---

## Step 7: Test on Simulator

1. Select an iPhone simulator (e.g., iPhone 15 Pro) from the device dropdown
2. Press **Cmd + R** (or click the Play button)
3. The app should launch with the VenuLoQ splash screen

---

## Step 8: Test on Physical iPhone

1. Connect your iPhone via USB
2. Trust the computer on your iPhone
3. Select your iPhone from the device dropdown in Xcode
4. Press **Cmd + R**
5. First time: Go to iPhone → Settings → General → VPN & Device Management → Trust your developer certificate

---

## Step 9: Build for TestFlight (Private Distribution)

### Archive the app:
1. In Xcode, select **Product → Archive**
2. Wait for the build to complete
3. The Organizer window opens automatically

### Upload to App Store Connect:
1. In the Organizer, select your archive
2. Click **Distribute App**
3. Choose **TestFlight & App Store**
4. Follow the prompts (keep default options)
5. Click **Upload**

### Set up TestFlight:
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Navigate to **My Apps → VenuLoQ → TestFlight**
3. Wait for the build to finish processing (~15 min)
4. Add **Internal Testers** (up to 25 team members) or **External Testers** (up to 10,000)
5. Testers receive an email invite to install via the TestFlight app

---

## Step 10: Update Cycle

After making changes to the web app:

```bash
# Rebuild web assets
GENERATE_SOURCEMAP=false yarn build

# Sync to iOS project
npx cap sync ios

# Open Xcode and archive again
npx cap open ios
```

**For remote mode testing:** Just deploy your web changes — the app auto-updates without re-archiving.

---

## Project Structure

```
frontend/
├── capacitor.config.ts          # Capacitor configuration
├── ios/
│   └── App/
│       ├── App/
│       │   ├── Info.plist       # iOS app settings
│       │   ├── AppDelegate.swift
│       │   └── Assets.xcassets/
│       │       ├── AppIcon.appiconset/  # App icon (1024x1024)
│       │       └── Splash.imageset/     # Splash screen assets
│       ├── App.xcodeproj
│       ├── App.xcworkspace      # Open THIS in Xcode
│       └── Podfile
├── src/
│   └── utils/
│       ├── platform.js          # Platform detection (Capacitor/PWA/Browser)
│       └── nativeBridge.js      # Native plugin bridge (StatusBar, Haptics, etc.)
└── build/                       # Built web assets (synced to iOS)
```

---

## Configuration Reference

| Setting | Value |
|---------|-------|
| App ID | `com.venuloq.app` |
| App Name | VenuLoQ |
| Min iOS | 14.0 |
| Orientation | Portrait only (iPhone), All (iPad) |
| Status Bar | Light content on dark background |
| Splash | Black (#0B0B0D) with centered VenuLoQ logo |

---

## Troubleshooting

**"Could not find module '@capacitor/core'"**
→ Run `npx cap sync ios` again

**Pod install fails**
→ Run `cd ios/App && pod install --repo-update`

**White screen after launch**
→ Check that `build/` exists and `npx cap sync ios` was run after `yarn build`

**Status bar overlaps content**
→ Already handled via `viewport-fit=cover` and `env(safe-area-inset-top)` in CSS

---

## Remote Development Mode

For rapid testing without rebuilding:

1. Uncomment the `server` block in `capacitor.config.ts`
2. Set `url` to your deployed VenuLoQ URL
3. Run `npx cap sync ios` then build in Xcode
4. The app loads from your live server — deploy web changes and refresh the app

---

*Last updated: March 2026*
*VenuLoQ v1.0.0 — Private Pre-Launch Build*
