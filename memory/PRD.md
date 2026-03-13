# VenuLoQ - Product Requirements Document

## Brand Identity
- **Full Logo**: customer-assets CDN image (arch icon + keyhole Q + "FIND. COMPARE. LOCK.")
- **Wordmark Component**: `BrandLogo.js` for headers/footers
- **Colors**: `#0B0B0D` (obsidian), `#F4F1EC` (cream), `#D4B36A` (gold), `#E5E0D8` (border)
- **Typography**: Cormorant Garamond (serif), DM Sans (body), JetBrains Mono (prices)

## Credentials
- **Admin**: admin@venuloq.in / admin123
- **RM**: rm1@venuloq.in / rm123
- **Customer**: democustomer@venulock.in / password123

## 3rd Party Integrations
- OpenAI GPT-4, Razorpay (Test Mode), Resend, Google Auth, jsPDF, lucide-react, framer-motion

---

## What's Been Implemented ✅

### Phase 1 — COMPLETE
- Full rebranding, landing page, deployment fixes, scroll-to-top, filter fix

### Brand Logo + Premium UI — COMPLETE (Mar 13, 2026)
- Full brand logo image on Login/Register (arch + keyhole Q + tagline)
- BrandLogo.js for headers/footers across all pages
- Login: Clean single-screen — logo, Google, email/password, no role selector, no demo creds
- Register: Matching design — logo, Google, form fields, rounded inputs
- Compact venue cards (5+ per screen) on search page
- "Connect" CTA on venue detail → WhatsApp chat or Request a Callback popup
- Emotional CTAs throughout ("Start Planning", "Plan Your Event")
- Testing: 12/12 (iteration 82), all passing

---

## Prioritized Backlog

### P0 - Venue Detail Page Declutter
- [ ] Reduce floating buttons on hero (5 Photos, 360 View, Share, Favorite = too many)
- [ ] Better visual hierarchy — cleaner hero, less noise
- [ ] Price section refinement

### P1 - Phase 2: High-Value Feature Enhancements
- [ ] "Quick Preview" modal for venues on search page
- [ ] Persistent FilterBottomSheet for mobile filtering
- [ ] Enhanced Recently Viewed Venues component

### P2 - Technical Debt
- [ ] Refactor LandingPage.js and VenuePublicPage.js
- [ ] Delete unused components (old Logo.js)
- [ ] Standardize API responses

### P3 - Future Features
- [ ] "List Your Venue" partner page
- [ ] SEO meta tags, Open Graph, JSON-LD
- [ ] Razorpay production + payouts
- [ ] SMS notifications
