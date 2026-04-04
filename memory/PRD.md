# VenuLoQ - Premium Venue Booking Platform

## Product Vision
A premium hospitality-tech marketplace that connects customers with curated event venues through a concierge-style booking experience.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB (DB: test_database)
- **Auth**: JWT + Emergent-managed Google OAuth
- **Payments**: Razorpay (Test Mode)
- **AI**: GPT-4o-mini via emergentintegrations (venue card drafting, chatbot)

## Design System
- **Base background**: #F6F4F0 (warm ivory / soft stone)
- **Card surfaces**: white with border-[#1A1A1A]/[0.06]
- **Text primary**: #1A1A1A (deep charcoal)
- **Premium accent**: #C4A76C (muted champagne)
- **Dark anchor**: #1A1A1A (used sparingly for CTAs, avatars)
- **Headings**: Cormorant Garamond (serif)
- **Body**: DM Sans (sans-serif)

## Pilot Readiness Status
- **System state**: PILOT READY (security fix applied, dry run passed, AI drafting live)
- **Pilot domains**: testing.delhi.venuloq.com (customer) / teams.venuloq.com (internal)

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work

### April 4, 2026 — AI Venue Card Draft Quality (P0)
**Scope**: Built real AI-powered premium venue card drafting into the acquisition workflow.

**What was built**:
- Backend: `POST /acquisitions/{acq_id}/ai-draft` endpoint using GPT-4o-mini via emergentintegrations
- AI generates structured JSON with: premium_title, tagline, highlights, description, suggested_tags, capacity_summary, pricing_summary, suitability, amenities_summary, missing_inputs, contradictions, readiness, readiness_note
- Prompt enforces: no invented facts, exhaustive missing field detection, contradiction flagging, readiness posture
- Draft cached on document (ai_venue_card_draft field) to avoid repeated LLM calls
- Frontend: Full AI Draft section in DataTeamEditor.js with:
  - Generate / Regenerate button
  - Premium title (serif font) + tagline display
  - Description with "Apply as Summary" action button
  - Highlights with star icons
  - Capacity + Pricing side-by-side cards
  - Suitability tags with "Apply" action
  - Suggested tags with "Merge" action
  - Amenities summary
  - Missing inputs (amber warning box, exhaustive list)
  - Contradictions (red warning box)
  - Readiness assessment with color-coded badge
- Role-gated: only data_team, admin, vam, venue_manager can generate drafts

**Review chain preserved (unchanged)**:
1. Venue Specialist/Manager captures raw venue truth
2. AI-assisted premium venue-card draft generated
3. Venue Acquisition Team Lead reviews quality/completeness
4. Venue Acquisition Managers (Head) gives final approval

**100% test pass** — 8/8 backend, all frontend elements verified (iteration_174).

### April 4, 2026 — Security Fix: Team Route Leakage (P0)
- Fixed `/api/team/dashboard`, `/api/team/announcements`, `/api/team/badge-counts` — added TEAM_ALLOWED_ROLES whitelist guard
- Customer/venue_owner/event_planner now get 403, unauthenticated gets 401

### April 4, 2026 — Internal Dry Run Completed
- Full 7-step pilot flow verified: login, search, enquiry, case portal, messaging, route isolation, admin/RM visibility

### Earlier Work
- Premium Visual Refinement Pass (ivory/charcoal/gold palette)
- P0 Bug Fix: Customer Portal Empty After Enquiry
- Chat screen WhatsApp-style viewport handling
- Profile redesign (Facebook-style cover photo)
- Full Platform Rebranding (VenuLock to VenuLoQ)
- Landing Page Overhaul, Splash Screen, Premium Logo

## Backlog (FROZEN)
- P1: Phase 2 — Quick Preview modal, Recently Viewed Venues, FilterBottomSheet
- P2: Phase 3 — Refactor LandingPage.js, VenuePublicPage.js
- P2: Facebook Login, Production Google OAuth, Vendor Payout Module, SEO
