# VenuLoQ - Product Requirements Document

## Overview
VenuLoQ is a premium venue booking marketplace connecting customers with curated event venues across India. The platform offers a managed booking experience with dedicated Relationship Managers (RMs).

## Brand Identity
- **Colors**: `#0B0B0D` (obsidian), `#F4F1EC` (cream), `#D4B36A` (gold), `#E5E0D8` (border)
- **Typography**: Cormorant Garamond (serif headings), DM Sans (body/UI), JetBrains Mono (prices/data)
- **Aesthetic**: Ultra-premium "quiet luxury" — sharp borders, bottom-line inputs, generous spacing, cream backgrounds
- **Design System**: Sharp rectangular elements (no rounded corners), gold accents only on dark backgrounds

## Core Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── routes/       # API endpoints
│   ├── models/       # Pydantic models
│   └── server.py     # Main server + data migration
└── frontend/         # React + Tailwind + Shadcn UI
    └── src/
        ├── components/  # Shared components
        ├── pages/       # Route pages
        ├── context/     # Auth, Favorites, Compare, Theme
        ├── data/        # Mock venue data for fallback
        └── utils/       # Filter utilities
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
- Landing page overhaul with custom venue carousel, splash screen, premium logo
- Mobile search page Airbnb-style redesign
- Venue detail page redesign with Share, Favorite, Compare, Gallery, 360 View
- Enquiry form flow redesign (warm CTAs)
- Critical deployment bugs fixed (slugs, broken images, mock data fallback)
- Scroll-to-top on route navigation
- Filter persistence bug fixed
- Deprecated VenueDetailPage.js removed
- Recently viewed venues tracking in VenuePublicPage

### Premium "$500M App" UI Redesign ✅ COMPLETE (Mar 13, 2026)
- **Login Page**: Full-bleed luxury venue hero image, bottom-line inputs, serif headings, sharp role selector
- **Register Page**: Matching premium design with hero image, DM Sans labels, clean form hierarchy
- **Search Page**: Cream (#F4F1EC) background, serif "Explore Venues" heading, sharp rectangular filter chips
- **Venue Cards (Estate Card)**: 4:3 aspect ratio images, price & rating overlaid on images, serif titles, gold Top Pick badge
- **Design System**: Consistent cream background, obsidian text, gold accents, DM Sans tracking-wide uppercase labels
- **Testing**: 17/17 features verified (iteration_79), 100% pass rate

### CTA Text Updates
| Location | Before | After |
|---|---|---|
| Sticky mobile CTA | "Enquire Now" | "Start Planning" |
| Enquiry intro button | "Start Consultation" | "Start Planning Your Event" |
| Enquiry form header | "Concierge Intake" | "Plan Your Event" |
| Enquiry submit button | "Submit Request" | "Connect Me with an Expert" |

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
