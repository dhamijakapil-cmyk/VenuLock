# VenuLoQ - Product Requirements Document

## Problem Statement
VenuLoQ is a premium venue booking marketplace for the Indian market. It connects event organizers with verified venues for weddings, corporate events, parties, and more. The platform offers transparent pricing, side-by-side venue comparison, and dedicated relationship managers.

## Brand Identity
- **Name**: VenuLoQ
- **Tagline**: Find. Compare. Lock.
- **Colors**: Midnight Black #0B0B0D, Soft White #F4F1EC, Muted Gold #D4B36A, Deep Navy #101B36
- **Typography**: DM Sans / Inter for UI, premium serif for display
- **Logo**: "VenuLo" in main color + "Q" in muted gold accent

## Core Features (Implemented)
- **Landing Page**: Premium, investor-ready homepage with dark hero section, floating search card, trust badges, featured venues, how it works, testimonials, browse by city/type
- **Venue Search**: Search by city, event type, guest count, budget, setting (indoor/outdoor), nearby location
- **Venue Detail Pages**: Full venue info, image galleries, pricing, amenities, enquiry forms
- **User Authentication**: JWT-based auth + Emergent Google Auth
- **Enquiry System**: Users can enquire about venues, track enquiries
- **Admin Dashboard**: Venue management, user management, leads, analytics
- **RM Dashboard**: Relationship manager tools with pipeline view
- **AI Chatbot**: OpenAI GPT-4 powered concierge
- **Venue Comparison**: Side-by-side comparison with sharing
- **Favorites**: Save and manage favorite venues
- **City Hub**: Browse venues by city with SEO-friendly URLs

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn/UI + Framer Motion
- Backend: FastAPI + MongoDB
- Integrations: OpenAI GPT-4, Razorpay (test mode), Resend, Emergent Google Auth, jsPDF, html2canvas, lucide-react, Recharts

## Phase 1: Critical UX Polish & Bug Fixes (COMPLETED - March 2026)

### Login Credentials Fix
- Fixed stale login credentials blocker
- Created `democustomer@venulock.in` customer account
- Verified all 4 role logins: Admin, RM, Customer, Venue Owner

### Login Page Improvements
- Fixed role selector grid from 4-col to 3-col (3 roles: RM, Venue, Admin)

### VenuePublicPage Consistency
- Added `rounded-xl` to all CTA sidebar cards (pricing, availability, policies, address, map)
- Added `rounded-xl` to all content cards (stats, description, packages, amenities, reviews, FAQ)
- Updated internal elements (package cards, amenity items, FAQ accordion) with consistent rounding

### Admin Dashboard Polish
- Added `rounded-xl` to all summary-card and stat-card components
- Added `rounded-xl` to icon containers (12x12px colored containers)
- Added `rounded-xl` to info cards (Client Cases by Stage, Partner Earnings, Pending Venues, Recent Cases)
- Added `rounded-lg` to inner list items
- Updated App.css with `summary-card` class (border-radius: 12px, proper card hierarchy)

### RM Dashboard Polish
- Added `rounded-xl` to summary cards and icon containers
- Added `rounded-xl` to filter bar, pipeline stage headers/bodies, and data table
- Added `rounded-lg` to pipeline kanban cards

### DashboardLayout Refinements
- Improved content padding (p-4 sm:p-6 lg:p-8)
- Enhanced breadcrumb section spacing (py-4 sm:py-5)

### Search Page Fix
- Fixed sidebar toggle button from `fixed` to `sticky` positioning to avoid layout overlap issues

## VenuLoQ Rebrand (COMPLETED - March 2026)

### Full Brand Identity Update
- Replaced all "VenuLock" → "VenuLoQ" across 50+ frontend and backend files
- Updated all old gold colors (#C8A960, #D4AF37, #B8963F) → muted gold (#D4B36A) 
- Updated all dark backgrounds (#080808, #0A0A0A) → midnight black (#0B0B0D)
- Rebuilt Logo component: "VenuLo" + "Q" in DM Sans with gold accent
- CTA buttons: dark text (#0B0B0D) on gold background for accessibility
- Tagline "Find. Compare. Lock." in key brand placements (restrained usage)
- Updated footer, header, login, register, dashboards, all public pages
- Database user emails updated from @bookmyvenue.in to @venuloq.in
- All tests passed (15/15 rebrand features verified)

## Hero Section Overhaul (COMPLETED - March 2026)

### Visual Improvements
- **Brighter hero backdrop**: Increased image opacity from 0.18 to 0.35, lightened gradient overlays — venue image now clearly visible
- **Glass-morphism search card**: Replaced opaque white card with `bg-white/85 backdrop-blur-xl` frosted glass effect
- **Venue showcase strip**: Auto-scrolling horizontal strip with 6 venue thumbnails, "500+ Verified Venues Across India" badge
- **Gold gradient CTA**: Warm gradient (gold → amber → gold) with pulsing glow animation
- **Animated headline**: "You Celebrate." uses typeReveal CSS animation for dramatic entrance

## Key Files
- `frontend/src/pages/LandingPage.js` — Main landing page (700+ lines)
- `frontend/src/pages/VenueSearchPage.js` — Search with filters, map, list views
- `frontend/src/pages/VenuePublicPage.js` — Venue detail page
- `frontend/src/pages/LoginPage.js` — Login with role selector
- `frontend/src/pages/admin/AdminDashboard.js` — Admin ops center
- `frontend/src/pages/rm/RMDashboard.js` — RM console with pipeline
- `frontend/src/components/DashboardLayout.js` — Dashboard wrapper
- `frontend/src/components/Header.js` — Global header
- `frontend/src/App.css` — Global styles
- `backend/routes/auth.py` — Auth API
- `backend/server.py` — FastAPI server

## Upcoming Tasks (Prioritized)

### P1 — Phase 2: High-Value Feature Enhancements
- Quick Preview modal for venues on search page
- Recently Viewed Venues component
- Persistent FilterBottomSheet for mobile search

### P2 — Phase 3: Technical Debt & Refinement
- Refactor `LandingPage.js` (700+ lines) into smaller components
- Refactor `VenuePublicPage.js` for better structure
- Standardize API responses & error handling on backend

### P2 — SEO & Marketing
- SEO meta tags, Open Graph, JSON-LD structured data
- "List Your Venue" partner landing page

### P3 — Business Features
- Razorpay production setup
- Automated payouts to venues
- AI Chatbot enhancements
- SMS Notifications

## Credentials
- Admin: admin@venuloq.in / admin123
- RM: rm1@venuloq.in / rm123
- Venue Owner: venue@venuloq.in / venue123
- Customer: democustomer@venuloq.in / password123

## Project Health
- Broken: None
- Mocked: Razorpay (test mode)
