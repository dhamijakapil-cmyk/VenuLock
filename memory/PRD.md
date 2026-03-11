# VenuLock - Product Requirements Document

## Problem Statement
VenuLock is a premium venue booking marketplace for the Indian market. It connects event organizers with verified venues for weddings, corporate events, parties, and more. The platform offers transparent pricing, side-by-side venue comparison, and dedicated relationship managers.

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
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Venue Owner: venue@venulock.in / venue123
- Customer: democustomer@venulock.in / password123

## Project Health
- Broken: None
- Mocked: Razorpay (test mode)
