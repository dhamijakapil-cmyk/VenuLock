# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: Text-based "VenuLoQ" (Cormorant Garamond serif, golden Q)
- **Colors**: `#0B0B0D`, `#F4F1EC`, `#D4B36A`, `#E5E0D8`
- **Typography**: Cormorant Garamond, DM Sans, JetBrains Mono

## Credentials
- Admin: admin / admin | RM: rm1 / rm1 | Venue: venue / venue
- Customer: Email+Password sign up/in, or Google Auth

## Integrations: OpenAI GPT-4, Razorpay (Test), Resend, Google Auth, jsPDF, lucide-react, framer-motion, recharts

---

## Implemented

### Auth System Simplification (Mar 14)
- **Replaced Email OTP with Email + Password** (Sign In / Sign Up toggle)
- Sign In: email + password → login
- Sign Up: name + email + password + confirm password → register
- **Social buttons**: Google (working), Facebook & X (Coming Soon with toast)
- **Fixed Google Auth**: Removed `withCredentials: true` from processGoogleSession (was causing CORS failures)
- Clean mobile layout: text wordmark, field labels, pill-shaped social buttons
- Desktop: split-screen with hero image + dark header card
- Testing: 100% pass — 34 tests (iteration 98)

### Auth & Login Page Redesign v2 (Mar 14)
- Mobile: Clean full-page cream layout, text wordmark, rounded inputs
- Desktop: Premium split-screen with immersive image + dark header card + 3D tilt
- Testing: 100% pass (iteration 97)

### Previous Completed Work
- Full Platform Rebranding (VenuLock → VenuLoQ)
- Landing Page Overhaul (VenueShowcase, SplashScreen, PremiumLogo)
- Mobile Search Page Redesign (horizontal cards, filters, Top Pick badge)
- P0 Bug Fix: "10 Venues" Production Bug
- Deployment Fix: CORS/withCredentials conflicts
- Resend Email OTP (production setup — backend endpoints still exist)
- EMI Finance Calculator on venue detail page
- Updated Login Credentials (admin/admin, rm1/rm1, venue/venue)
- Navigation, Profile, Quick Preview & Share features
- Swipable Image Carousel on venue cards

---

## Backlog

### P1 - Feature Enhancements
- [ ] FilterBottomSheet improvements for mobile
- [ ] Recently Viewed component

### P2 - Technical Debt
- [ ] Refactor LandingPage.js, VenuePublicPage.js
- [ ] Standardize API error handling

### P3 - Future
- [ ] Facebook & X OAuth integration (when keys available)
- [ ] "List Your Venue" partner page
- [ ] SEO, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS/WhatsApp notifications
- [ ] Password reset flow
