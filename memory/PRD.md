# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: `BrandLogo.js` (serif "VenuLo" + golden "Q")
- **Colors**: `#0B0B0D`, `#F4F1EC`, `#D4B36A`, `#E5E0D8`
- **Typography**: Cormorant Garamond, DM Sans, JetBrains Mono

## Credentials
- Admin: admin@venuloq.in / admin123 | RM: rm1@venuloq.in / rm123 | Customer: Email OTP (any email)
- Old customer password login: democustomer@venulock.in / password123

## Integrations: OpenAI GPT-4, Razorpay (Test), Resend, Google Auth, jsPDF, lucide-react, framer-motion

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
- Uses native addEventListener with { passive: false } for reliable swipe on mobile
- Quick Preview modal also has swipable carousel with image counter
- Testing: 10/10 frontend — 100% pass (iteration 90)

### Enquiry Form OTP Removal (Mar 14)
- Removed phone OTP verification step from enquiry form (was step 2 of 4)
- Flow is now 3 steps: Your Details → Choose Your RM → Event Details
- No backend validation change needed (OTP was frontend-only gate)
- Step indicator correctly shows "Step X of 3"
- Testing: Confirmed OTP not visible, RM selection loads after step 1
- Replaced SMS OTP with Email OTP as primary customer auth method

### Email OTP Authentication (Mar 13)
- New unified /auth page: Google Login + Email OTP + "Mobile OTP (Coming Soon)"
- Backend: POST /api/auth/email-otp/send and /api/auth/email-otp/verify
- Auto-creates new user on first OTP verify, logs in existing users
- **Demo-ready auto-fill**: OTP digits fill one by one automatically, then auto-verify — zero manual input needed
- "Stay signed in for 30 days" toggle with extended JWT (720h vs default 168h)
- No debug banners or developer text — premium, clean UI for investor demo
- Existing /login (email+password) preserved for Admin/RM team
- /register route redirects to new AuthPage
- Testing: 6/6 backend + all frontend — 100% pass (iteration 93)

---

## Backlog

### P1 - Feature Enhancements
- [ ] FilterBottomSheet improvements for mobile
- [ ] Recently Viewed component polish

### P2 - Technical Debt
- [ ] Refactor LandingPage.js, VenuePublicPage.js
- [ ] Delete old Logo.js
- [ ] Standardize API error handling

### P3 - Future
- [ ] "List Your Venue" partner page
- [ ] SEO, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS/WhatsApp OTP (replace "Coming Soon" label)
- [ ] Configure Resend API key for live email OTP delivery
