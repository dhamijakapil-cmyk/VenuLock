# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: `BrandLogo.js` (serif "VenuLo" + golden "Q")
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
- Cream price text, ghost Connect button, gold Start Planning
- Testing: 15/15 frontend + 7/7 backend — 100% pass (iteration 84)

### UI Polish Pass (Mar 13)
- Added "Confirm Password" field to RegisterPage with client-side validation
- Fixed mobile nav menu: Register button no longer cut off (fixed positioning overlay)
- Enlarged mobile venue cards from 110px to 130px (~3 cards per screen vs 4-5)
- Testing: 10/10 frontend — 100% pass (iteration 85)

### Navigation, Profile, Quick Preview & Share (Mar 13)
- Back navigation buttons on Login & Register pages (top-left chevron)
- User Profile page (/profile): name & phone editing, mobile + desktop layouts
- Backend PUT /api/auth/profile endpoint for profile updates
- WhatsApp Share button on mobile venue cards
- Quick Preview bottom sheet modal on mobile search (tap eye icon)
- "My Profile" link added to Header nav (desktop dropdown + mobile menu)
- Testing: 12/12 (1 backend + 11 frontend) — 100% pass (iteration 86)

### Swipable Image Carousel (Mar 13)
- Touch-swipe photo carousel on mobile venue cards (up to 5 images)
- Touch-swipe on venue detail page hero gallery
- Dot indicators at bottom-right, active dot highlighted
- Quick Preview modal also has swipable carousel with image counter
- Testing: 10/10 frontend — 100% pass (iteration 90)

### Enquiry Form OTP Removal (Mar 14)
- Removed phone OTP verification step from enquiry form
- Flow is now 3 steps: Your Details -> Choose Your RM -> Event Details
- Testing: Confirmed OTP not visible, RM selection loads after step 1

### Email OTP Authentication (Mar 13)
- New unified /auth page: Google Login + Email OTP + "Mobile OTP (Coming Soon)"
- Backend: POST /api/auth/email-otp/send and /api/auth/email-otp/verify
- Auto-creates new user on first OTP verify, logs in existing users
- Demo-ready auto-fill: OTP digits fill one by one automatically
- "Stay signed in for 30 days" toggle with extended JWT
- Testing: 6/6 backend + all frontend — 100% pass (iteration 93)

### P0 Bug Fix: "10 Venues" Production Bug (Mar 14)
- Root cause: Frontend silently fell back to mockVenues.js
- Fix: Removed mock data fallback, increased limits
- Testing: 100% pass — 11/11 backend + all frontend (iteration 94)

### Deployment Fix: Production "Connection Issue" (Mar 14)
- Fixed withCredentials/CORS conflict, Pydantic response_model 500s
- Optimized checkAuth to skip /auth/me when no token exists

### Resend Email OTP — Production Setup (Mar 14)
- Live Resend API key for sending auth emails from no-reply@auth.venuloq.com
- OTP code never exposed in API response when email sends successfully
- Testing: 100% pass — 14/14 backend + all frontend (iteration 95)

### EMI Finance Calculator (Mar 14)
- New EMI calculator component on venue detail page
- Calculates monthly payments based on venue cost, down payment, tenure, interest rate

### Auth & Login Page Redesign (Mar 14)
- **Complete UI rewrite** of /auth and /login pages following design_guidelines.json
- **Split-screen layout**: 50/50 on desktop (image/abstract left, card right), stacked on mobile
- **Dark header card**: Logo on #0B0B0D background blends seamlessly, "Welcome"/"Team Portal" in Cormorant serif
- **White form body**: Google button, email input, OTP inputs, username/password — all with sharp-edged (rounded-none) styling
- **Gold CTA buttons**: #D4B36A with hover lift, shadow effects per design system
- **3D tilt effect**: CSS perspective transform on card hover (framer-motion entrance animation)
- **Left panel**: Immersive palace image with Ken Burns animation (auth), abstract dark/gold gradient with grid pattern (login)
- **Gold accent quote**: "Where Every Celebration Finds Its Perfect Stage" on auth image panel
- All existing auth functionality preserved: Google Auth, Email OTP, Staff Login, auto-fill, resend cooldown
- Testing: 100% pass — 30+ frontend + backend tests (iteration 96)

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
