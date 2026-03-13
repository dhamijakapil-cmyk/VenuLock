# VenuLoQ - Product Requirements Document

## Overview
VenuLoQ is a premium venue booking marketplace connecting customers with curated event venues across India.

## Brand Identity
- **Full Logo**: Arch icon + "VenuLoQ" serif wordmark (golden Q with keyhole) + "FIND. COMPARE. LOCK." tagline
- **Logo Image**: `customer-assets.emergentagent.com/.../venuloq-email-signature-dark.png` (used on login/register)
- **Component**: `BrandLogo.js` for wordmark-only uses (headers, footers, dashboards)
- **Colors**: `#0B0B0D` (obsidian), `#F4F1EC` (cream), `#D4B36A` (gold), `#E5E0D8` (border)
- **Typography**: Cormorant Garamond (serif), DM Sans (body), JetBrains Mono (prices)

## Credentials
- **Admin**: admin@venuloq.in / admin123
- **RM**: rm1@venuloq.in / rm123
- **Customer**: democustomer@venulock.in / password123

## 3rd Party Integrations
- OpenAI GPT-4, Razorpay (Test Mode), Resend, Google Auth
- jsPDF, html2canvas, lucide-react, Recharts, framer-motion

---

## What's Been Implemented ✅

### Phase 1: Critical UX Polish & Bug Fixes — COMPLETE
- Full rebranding, landing page overhaul, deployment bug fixes
- Scroll-to-top, filter persistence fix, deprecated file cleanup

### Brand Logo System — COMPLETE (Mar 13, 2026)
- Full brand logo (arch + keyhole Q + tagline) on Login & Register pages
- `BrandLogo.js` component for wordmark on all other pages
- Consistent across: Landing, Search, Venue Detail, Footer, Dashboard

### Premium UI Redesign — COMPLETE (Mar 13, 2026)
- Login/Register: Dark branded panel with full logo + cream form area
- Search page: Compact horizontal venue cards (5+ per screen on mobile)
- Estate-style design: serif headings, bottom-line inputs, sharp elements
- Emotional CTAs: "Start Planning", "Plan Your Event"
- Testing: 13/13 (iteration 81), all passing

---

## Prioritized Backlog

### P1 - Phase 2: High-Value Feature Enhancements
- [ ] "Quick Preview" modal for venues on search page
- [ ] Persistent FilterBottomSheet for mobile filtering
- [ ] Enhanced Recently Viewed Venues component

### P2 - Phase 3: Technical Debt & Refinement
- [ ] Refactor monolithic LandingPage.js into smaller components
- [ ] Refactor VenuePublicPage.js into smaller components
- [ ] Standardize API responses and error handling

### P3 - Future Features
- [ ] "List Your Venue" partner landing page
- [ ] SEO meta tags, Open Graph, JSON-LD structured data
- [ ] Razorpay production setup + automated payouts
- [ ] SMS notifications integration
