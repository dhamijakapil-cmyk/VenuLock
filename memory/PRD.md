# VenuLoQ - Product Requirements Document

## Overview
VenuLoQ is a premium venue booking marketplace connecting customers with curated event venues across India. The platform offers a managed booking experience with dedicated Relationship Managers (RMs).

## Brand Identity
- **Logo**: Serif "VenuLo" + golden "**Q**" — the Q is the hero letter, always in gold (#D4B36A)
- **Tagline**: "FIND. COMPARE. LOCK." in DM Sans small caps
- **Colors**: `#0B0B0D` (obsidian), `#F4F1EC` (cream), `#D4B36A` (gold), `#E5E0D8` (border)
- **Typography**: Cormorant Garamond (serif headings/logo), DM Sans (body/UI), JetBrains Mono (prices)
- **Logo Component**: `/app/frontend/src/components/BrandLogo.js` — single source of truth
  - Dark bg: "VenuLo" cream + "Q" gold
  - Light bg: "VenuLo" obsidian + "Q" gold
  - Sizes: sm (headers), md (standard), lg (auth), xl (hero/marketing)

## Core Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── routes/       # API endpoints
│   ├── models/       # Pydantic models
│   └── server.py     # Main server + data migration
└── frontend/         # React + Tailwind + Shadcn UI
    └── src/
        ├── components/
        │   ├── BrandLogo.js        # Unified brand logo (NEW)
        │   ├── Header.js           # Inner page header
        │   ├── Footer.js           # Site-wide footer
        │   ├── DashboardLayout.js  # Admin/RM layout
        │   ├── EnquiryForm.js      # Multi-step enquiry
        │   └── cards/MobileVenueCard.js  # Estate-style venue card
        ├── pages/
        │   ├── LandingPage.js
        │   ├── VenueSearchPage.js
        │   ├── VenuePublicPage.js
        │   ├── LoginPage.js
        │   └── RegisterPage.js
        ├── context/     # Auth, Favorites, Compare, Theme
        └── data/        # Mock venue data for fallback
```

## Credentials
- **Admin**: admin@venuloq.in / admin123
- **RM**: rm1@venuloq.in / rm123
- **Customer**: democustomer@venulock.in / password123

## 3rd Party Integrations
- OpenAI GPT-4, Razorpay (Test Mode), Resend (Email)
- Emergent-managed Google Auth
- jsPDF & html2canvas, lucide-react, Recharts, framer-motion

---

## What's Been Implemented

### Phase 1: Critical UX Polish & Bug Fixes ✅ COMPLETE
- Full platform rebranding (VenuLock → VenuLoQ)
- Landing page overhaul with custom venue carousel, splash screen
- Mobile search page Airbnb-style redesign
- Venue detail redesign with Share, Favorite, Compare, Gallery, 360 View
- Enquiry form redesign (warm CTAs)
- Critical deployment bugs fixed (slugs, broken images, mock data)
- Scroll-to-top on route navigation
- Filter persistence bug fixed
- Deprecated VenueDetailPage.js removed

### Brand Logo Unification ✅ COMPLETE (Mar 13, 2026)
- Created unified `BrandLogo.js` component matching the brand kit
- Applied consistently to ALL pages: Landing, Search, Login, Register, Venue Detail, Footer, Dashboard
- Removed all old "VENU | LOQ" spaced treatments and inconsistent logo variants
- Logo supports dark/light modes, multiple sizes, optional tagline + arch icon

### Premium "$500M App" UI Redesign ✅ COMPLETE (Mar 13, 2026)
- Login/Register: Full-bleed hero images, bottom-line inputs, serif headings
- Search: Cream background, serif headings, sharp rectangular filters
- Venue Cards: Estate-style with price/rating overlaid on images, serif titles
- Emotional CTAs: "Start Planning", "Plan Your Event", "Connect Me with an Expert"
- Testing: 14/14 (iteration 79), 14/14 (iteration 80) — all passing

---

## Prioritized Backlog

### P1 - Phase 2: High-Value Feature Enhancements
- [ ] "Quick Preview" modal for venues on search page
- [ ] Persistent FilterBottomSheet for mobile filtering
- [ ] Enhanced Recently Viewed Venues component

### P2 - Phase 3: Technical Debt & Refinement
- [ ] Refactor monolithic LandingPage.js into smaller components
- [ ] Refactor VenuePublicPage.js into smaller components
- [ ] Standardize API responses and error handling on backend

### P3 - Future Features
- [ ] "List Your Venue" partner landing page
- [ ] SEO meta tags, Open Graph, JSON-LD structured data
- [ ] Razorpay production setup
- [ ] Automated payouts to venues
- [ ] SMS notifications integration
