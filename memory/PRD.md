# VenuLoQ — Product Requirements Document

## Original Problem Statement
Comprehensive audit and UI/UX overhaul of the VenuLoQ venue booking marketplace platform. Evolved into multi-phase implementation including critical bug fixes, full platform rebranding (VenuLock → VenuLoQ), and extensive visual refinement to achieve a premium "hospitality-tech" aesthetic worthy of a ₹50,000 crore platform.

## Brand Identity
- **Colors**: #0B0B0D (black), #F4F1EC (warm cream), #D4B36A (gold accent)
- **Fonts**: DM Sans (body/headings), JetBrains Mono (prices/data), Cormorant Garamond (premium serif accents)
- **Logo**: Premium serif treatment using Cormorant Garamond

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB
- **Auth**: Emergent-managed Google Auth + Email/Password with verification
- **Integrations**: Resend (email), Razorpay (test mode), OpenAI GPT-4

## What's Been Implemented

### Phase 1: Critical UX Polish & Bug Fixes ✅
- Full platform rebranding (VenuLock → VenuLoQ)
- Landing page overhaul with VenueShowcase carousel, SplashScreen, PremiumLogo
- Auth page responsive redesign (split-screen desktop, single-column mobile)
- Email verification flow (register → verify email → access features)
- Google Auth fix
- Login flows verified for all roles (Admin, RM, Customer, Venue Owner)

### Mobile Search Page Premium Redesign ✅ (Latest)
- **Glass-morphism header**: Logo + expanded search bar + auth in single row
- **Elevated venue cards**: rounded-2xl, shadow-[0_2px_8px], gold left-bar accent for TOP PICK
- **Cinematic image overlays**: gradient from-black/35, CSS brightness/saturation enhancement
- **Social proof**: Review counts, "Trending" indicator, BadgeCheck verified badge
- **Feature highlights**: Venue-type-specific text (e.g., "Ballroom · Valet · AC")
- **Action buttons**: Share (Share2) + Eye (preview) on every card, top-right column
- **Section headers**: "FEATURED" (gold) and "ALL VENUES" (grey) with accent bars
- **Vibrant HD photos**: All 79 venues updated with colorful Unsplash images
- **Client-side search**: Filter venues by name/city/area in real-time
- **Sort popover**: Compact "Sort" button with radio-button styled options
- **Type popover**: Checkbox-styled multi-select with icons and Apply button

### Comprehensive Filter System ✅ (Latest)
- **Full-screen FilterBottomSheet** triggered by "Filters" button
- **Event Type**: With icons (Heart, Briefcase, PartyPopper, Gift, etc.)
- **Venue Type**: With icons (Building2, Home, Mountain, etc.)
- **Setting**: Indoor / Outdoor / Both
- **Guest Count**: Min/Max labeled inputs
- **Price per Plate**: Min/Max labeled inputs with ₹ prefix
- **Amenities**: 2-column grid with icons + checkboxes (Parking, Alcohol, Valet, AC, Catering, Decor)
- **City**: Pill-based selection
- **Clear All / Apply Filters** buttons

## Deployment Status
- Health check: ALL PASSED ✅
- SENDER_EMAIL .env fix applied
- No hardcoded URLs/credentials
- Supervisor config valid

## Credentials
- Admin: admin / admin
- RM: rm1 / rm1
- Venue Owner: venue / venue
- Customer: Use sign-up flow

## Key Files
- `frontend/src/pages/VenueSearchPage.js` — Mobile search page
- `frontend/src/components/cards/MobileVenueCard.js` — Premium venue card
- `frontend/src/components/FilterBottomSheet.jsx` — Comprehensive filter system
- `frontend/src/pages/LandingPage.js` — Premium landing page
- `frontend/src/pages/AuthPage.js` — Responsive auth page
- `backend/routes/auth.py` — Auth with email verification

## Backlog (Prioritized)
### P1 — High-Value Features
- Quick Preview modal (Eye button wired, modal needs building)
- Recently Viewed Venues component
- Password reset functionality

### P2 — Technical Debt
- Refactor LandingPage.js and VenuePublicPage.js (monolithic)
- Facebook & X OAuth integrations
- "List Your Venue" partner page
- SEO meta tags, Open Graph, JSON-LD

### P3 — Monetization
- Razorpay production setup
- SMS/WhatsApp gateway (Twilio)
- Automated venue payouts
