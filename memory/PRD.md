# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: CDN image (arch + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark**: `BrandLogo.js` (serif "VenuLo" + golden "Q")
- **Colors**: `#0B0B0D`, `#F4F1EC`, `#D4B36A`, `#E5E0D8`
- **Typography**: Cormorant Garamond, DM Sans, JetBrains Mono

## Credentials
- Admin: admin@venuloq.in / admin123 | RM: rm1@venuloq.in / rm123 | Customer: democustomer@venulock.in / password123

## Integrations: OpenAI GPT-4, Razorpay (Test), Resend, Google Auth, jsPDF, lucide-react, framer-motion

---

## Implemented ✅

### Phase 1 — UX Polish & Bugs — COMPLETE
### Brand Logo + Premium UI — COMPLETE (Mar 13)
### Venue Detail Declutter — COMPLETE (Mar 13)
### Connect + Callback — COMPLETE (Mar 13)

### Auth Simplification (Mar 13)
- Register: email + password + confirm password. Customer auto-role.
- Backend: `name` field now Optional, auto-derived from email prefix
- Login: clean single-screen, Google + email/password

### UI Polish Pass (Mar 13)
- Added "Confirm Password" field to RegisterPage with client-side validation
- Fixed mobile nav menu: Register button no longer cut off (fixed positioning overlay)
- Enlarged mobile venue cards from 110px to 130px (~3 cards per screen vs 4-5)
- Testing: 10/10 frontend — 100% pass (iteration 85)

### Sticky CTA Dark Bar (Mar 13)
- Dark obsidian (#0B0B0D) background for clear page separation
- Cream price text, ghost Connect button, gold Start Planning
- Testing: 15/15 frontend + 7/7 backend — 100% pass (iteration 84)

---

## Backlog

### P1 - Feature Enhancements
- [ ] "Quick Preview" modal on search
- [ ] FilterBottomSheet for mobile
- [ ] Recently Viewed component
- [ ] Profile page where customers can add name/phone/details

### P2 - Technical Debt
- [ ] Refactor LandingPage.js, VenuePublicPage.js
- [ ] Delete old Logo.js
- [ ] Standardize API error handling

### P3 - Future
- [ ] "List Your Venue" partner page
- [ ] SEO, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS notifications
