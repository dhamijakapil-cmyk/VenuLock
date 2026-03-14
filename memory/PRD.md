# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: Text-based "VenuLoQ" (Cormorant Garamond serif, golden Q)
- **Colors**: `#0B0B0D`, `#F4F1EC`, `#D4B36A`, `#E5E0D8`
- **Typography**: Cormorant Garamond, DM Sans, JetBrains Mono

## Credentials
- Admin: admin / admin | RM: rm1 / rm1 | Venue: venue / venue
- Customer: Email OTP (any email) or Google Auth

## Integrations: OpenAI GPT-4, Razorpay (Test), Resend, Google Auth, jsPDF, lucide-react, framer-motion, recharts

---

## Implemented

### Phase 1 — UX Polish & Bugs — COMPLETE
### Brand Logo + Premium UI — COMPLETE (Mar 13)
### Venue Detail Declutter — COMPLETE (Mar 13)
### Connect + Callback — COMPLETE (Mar 13)

### Auth Simplification (Mar 13)
- Register: email + password + confirm password. Customer auto-role.
- Backend: `name` field now Optional, auto-derived from email prefix
- Login: clean single-screen, Google + email/password

### Sticky CTA Dark Bar (Mar 13)
- Dark obsidian (#0B0B0D) background for clear page separation
- Testing: 15/15 frontend + 7/7 backend — 100% pass (iteration 84)

### UI Polish Pass (Mar 13)
- Added "Confirm Password" field to RegisterPage
- Fixed mobile nav menu, enlarged mobile venue cards
- Testing: 10/10 frontend — 100% pass (iteration 85)

### Navigation, Profile, Quick Preview & Share (Mar 13)
- Back nav, User Profile page, WhatsApp Share, Quick Preview modal
- Testing: 12/12 — 100% pass (iteration 86)

### Swipable Image Carousel (Mar 13)
- Touch-swipe carousels on venue cards, detail page, preview modal
- Testing: 10/10 frontend — 100% pass (iteration 90)

### Enquiry Form OTP Removal (Mar 14)
- Flow now 3 steps (removed phone OTP step)

### Email OTP Authentication (Mar 13)
- Unified /auth page: Google Login + Email OTP
- Backend: POST /api/auth/email-otp/send and /verify
- Auto-fill for demo mode, "Stay signed in" toggle
- Testing: 6/6 backend + all frontend — 100% pass (iteration 93)

### P0 Bug Fix: "10 Venues" Production Bug (Mar 14)
- Removed mock data fallback, increased limits
- Testing: 100% pass (iteration 94)

### Deployment Fix: Production "Connection Issue" (Mar 14)
- Fixed withCredentials/CORS conflict, Pydantic 500s

### Resend Email OTP — Production Setup (Mar 14)
- Live Resend API for auth emails from no-reply@auth.venuloq.com
- Testing: 100% pass (iteration 95)

### EMI Finance Calculator (Mar 14)
- New EMI calculator on venue detail page

### Auth & Login Page Redesign v2 (Mar 14)
- **MOBILE**: Clean full-page cream layout — NO dark header block
  - Text wordmark "VenuLoQ" (Cormorant Garamond, golden Q) replaces image logo
  - "FIND. COMPARE. LOCK." tagline
  - Large heading ("Welcome" / "Team Portal") in serif
  - Field labels above inputs ("Email", "Username or Email", "Password")
  - Pill-shaped Google button (rounded-full, h-[52px])
  - Rounded inputs (rounded-xl, h-[52px], white bg on cream)
  - Gold CTA button (rounded-xl, h-[52px])
  - Back + Close (X) buttons in header row
- **DESKTOP**: Premium split-screen preserved
  - Left panel: Immersive palace image with Ken Burns + dark overlay + gold quote
  - Right panel: Dark header card (#0B0B0D) with image logo + white form body
  - 3D tilt effect on card hover (CSS perspective transform)
  - Sharp-edged elements (rounded-none) per design system
- Login page left panel: Abstract dark/gold gradient with subtle grid pattern
- All auth flows: Google Auth, Email OTP, Staff Login — fully preserved
- Testing: 100% pass — 40+ tests (iteration 97)

---

## Backlog

### P1 - Feature Enhancements
- [ ] FilterBottomSheet improvements for mobile
- [ ] Recently Viewed component polish

### P2 - Technical Debt
- [ ] Refactor LandingPage.js, VenuePublicPage.js
- [ ] Standardize API error handling

### P3 - Future
- [ ] "List Your Venue" partner page
- [ ] SEO, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS/WhatsApp OTP (replace "Coming Soon" label)
