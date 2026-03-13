# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch icon + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: `BrandLogo.js` (serif "VenuLo" + golden "Q")
- **Colors**: `#0B0B0D`, `#F4F1EC`, `#D4B36A`, `#E5E0D8`
- **Typography**: Cormorant Garamond, DM Sans, JetBrains Mono

## Credentials
- Admin: admin@venuloq.in / admin123 | RM: rm1@venuloq.in / rm123 | Customer: democustomer@venulock.in / password123

## 3rd Party: OpenAI GPT-4, Razorpay (Test), Resend, Google Auth, jsPDF, lucide-react, framer-motion

---

## Implemented ✅

### Phase 1 — UX Polish & Bug Fixes — COMPLETE
- Rebranding, landing page, deployment fixes, scroll-to-top, filter fix

### Brand + Premium UI — COMPLETE (Mar 13)
- Full logo on Login/Register, BrandLogo on all pages
- Login: single-screen, no role selector, no demo creds
- Register: matching clean layout
- Compact venue cards (5+/screen) on search
- Emotional CTAs throughout

### Venue Detail Declutter — COMPLETE (Mar 13)
- Hero: 3 buttons only (Back, Share, Favorite). Removed Compare, 360 View, Photos badge
- Cream (#F4F1EC) background, serif headings, DM Sans body text throughout
- Pricing stats row, about, amenities, reviews, FAQ — all updated to premium aesthetic

### Connect + Callback Feature — COMPLETE (Mar 13)
- "Connect" button → bottom sheet: "Chat on WhatsApp" or "Request a Callback"
- Callback form: simple name + phone popup
- Backend: POST /api/callback-request auto-assigns RM, saves to `callback_requests` collection
- RM gets notification with customer contact + venue details
- Testing: 17/17 frontend + 7/7 backend — 100% pass

---

## Backlog

### P1 - Feature Enhancements
- [ ] "Quick Preview" modal on search
- [ ] FilterBottomSheet for mobile
- [ ] Recently Viewed component enhancement

### P2 - Technical Debt
- [ ] Refactor LandingPage.js, VenuePublicPage.js
- [ ] Delete old Logo.js
- [ ] Standardize API error handling

### P3 - Future
- [ ] "List Your Venue" partner page
- [ ] SEO meta tags, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS notifications
