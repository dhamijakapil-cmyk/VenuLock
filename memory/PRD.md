# VenuLoQ - Product Requirements Document

## Overview
VenuLoQ is a premium venue booking marketplace connecting customers with curated event venues across India. The platform offers a managed booking experience with dedicated Relationship Managers (RMs) who handle negotiations, availability, and paperwork.

## Brand Identity
- **Colors**: `#0B0B0D` (black), `#F4F1EC` (cream white), `#D4B36A` (gold)
- **Typography**: Cormorant Garamond (serif headings), system sans-serif (body)
- **Aesthetic**: Premium hospitality-tech, Airbnb-inspired clean design

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

## Key User Flows
1. **Landing → Search → Venue Detail → Enquiry** (primary conversion funnel)
2. **Admin Dashboard** (venue/user/lead management)
3. **RM Dashboard** (lead management, performance tracking)
4. **Venue Owner Dashboard** (listing management)

## Credentials
- **Admin**: admin@venulock.in / admin123
- **RM**: rm1@venulock.in / rm123
- **Customer**: democustomer@venulock.in / password123

## 3rd Party Integrations
- OpenAI GPT-4 (ChatBot)
- Razorpay (Test Mode)
- Resend (Email)
- Emergent-managed Google Auth
- jsPDF & html2canvas (PDF generation)

---

## What's Been Implemented

### Phase 1: Critical UX Polish & Bug Fixes ✅ COMPLETE
- Full platform rebranding (VenuLock → VenuLoQ)
- Landing page overhaul with custom venue carousel (VenueShowcase.js)
- One-time animated splash screen (SplashScreen.js)
- Premium serif logo treatment (PremiumLogo.js)
- Mobile search page Airbnb-style redesign (full-width image cards)
- Venue detail page redesign with Share, Favorite, Compare, Gallery, 360 View
- Enquiry form flow redesign (warm CTAs, removed budget step)
- RM selection step redesign
- Critical deployment bugs fixed (slugs, broken images, mock data fallback)
- Component consolidation (MobileVenueCard extracted for reuse)
- Scroll-to-top on route navigation
- Filter persistence bug fixed (no localStorage auto-restore)
- Emotional CTA text update across all user-facing buttons
- Deprecated VenueDetailPage.js removed
- Recently viewed venues tracking added to VenuePublicPage

### CTA Text Updates (Feb 2026)
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
- [ ] Persistent FilterBottomSheet for improved mobile filtering
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
