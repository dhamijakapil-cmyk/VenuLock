# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: Text-based "VenuLoQ" (Cormorant Garamond serif, golden Q)
- **Colors**: `#0B0B0D`, `#F4F1EC`, `#D4B36A`, `#E5E0D8`
- **Typography**: Cormorant Garamond, DM Sans, JetBrains Mono

## Credentials
- Admin: admin / admin | RM: rm1 / rm1 | Venue: venue / venue
- Customer: Email+Password sign up/in, or Google Auth

## Integrations: OpenAI GPT-4, Razorpay (Test), Resend (Email verification + OTP), Google Auth, jsPDF, lucide-react, framer-motion, recharts

---

## Implemented

### Email Verification Flow (Mar 14)
- **Registration sends verification email** via Resend with unique token link
- Users created with `email_verified: false` (Google Auth users auto-verified)
- **Soft banner**: "Please verify your email to submit enquiries" with Resend button in Header
- **Enquiry gate**: Unverified users blocked from submitting enquiries with toast error
- `/verify-email?token=xxx` page: shows success/error state
- Endpoints: `GET /api/auth/verify-email`, `POST /api/auth/resend-verification`
- Bug fix: Email case-sensitivity normalized (lowercase) across register/login
- Testing: 100% pass — 9 backend + all frontend (iteration 99)

### Auth System Simplification (Mar 14)
- **Replaced Email OTP with Email + Password** (Sign In / Sign Up toggle)
- Social buttons: Google (working), Facebook & X (Coming Soon)
- Fixed Google Auth (removed withCredentials CORS issue)
- Testing: 100% pass — 34 tests (iteration 98)

### Auth Page Redesign v2 (Mar 14)
- Mobile: Clean full-page cream layout, text wordmark, rounded inputs
- Desktop: Premium split-screen with immersive image + dark header card + 3D tilt
- Testing: 100% pass (iteration 97)

### Previous Completed Work
- Full Platform Rebranding (VenuLock → VenuLoQ)
- Landing Page Overhaul (VenueShowcase, SplashScreen, PremiumLogo)
- Mobile Search Redesign (horizontal cards, filters, Top Pick badge)
- P0 Bug Fix: "10 Venues" Production Bug
- Deployment Fix: CORS/withCredentials conflicts
- EMI Finance Calculator on venue detail page
- Navigation, Profile, Quick Preview & Share features
- Swipable Image Carousel on venue cards

---

## Backlog

### P1 - Feature Enhancements
- [ ] FilterBottomSheet for mobile search
- [ ] Recently Viewed Venues component
- [ ] Password reset flow

### P2 - Technical Debt
- [ ] Refactor LandingPage.js, VenuePublicPage.js
- [ ] Standardize API error handling

### P3 - Future
- [ ] Facebook & X OAuth (when keys available)
- [ ] "List Your Venue" partner page
- [ ] SEO, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS/WhatsApp notifications
