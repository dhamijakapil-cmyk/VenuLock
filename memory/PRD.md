# VenuLoQ - Premium Venue Booking Platform

## Product Vision
A premium hospitality-tech marketplace that connects customers with curated event venues through a concierge-style booking experience.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Emergent-managed Google OAuth
- **Payments**: Razorpay (Test Mode)
- **Email**: Resend via Emergent integrations

## Design System
- **Background**: #EDE9E1 (warm ivory/stone)
- **Dark surfaces**: #0B0B0D
- **Gold accent**: #D4B36A
- **Headings**: Cormorant Garamond (serif)
- **Body**: DM Sans (sans-serif)
- **Cards**: white/90 with backdrop-blur, 18px border-radius
- **Shadows**: layered, 6-24px blur
- **Bottom nav**: 60px glassmorphic with My Case emphasis

### Contrast Hierarchy (Established April 2026)
| Level | On Ivory (#EDE9E1) | On Dark (#0B0B0D) |
|---|---|---|
| Primary (headings) | #0B0B0D (full) | #F4F1EC (full) |
| Secondary (body) | #0B0B0D/70 | #F4F1EC/70 |
| Tertiary (meta/labels) | #0B0B0D/45 | #F4F1EC/45-50 |
| Muted (decorative) | #0B0B0D/25 | #F4F1EC/25 |

## Customer Portal (IA)
Home → Explore → My Case → Messages → Profile

## Key Pages
- **CustomerHome**: Hero card + pills + explore banner + other bookings
- **CustomerCaseDetail**: Event hero + RM card + assistance + Message RM CTA
- **ProfilePage**: Dark hero + basic info + event preferences + notifications
- **AuthPage**: Google (Emergent) + email/password login
- **VenuePublicPage**: Venue detail with gallery, pricing, amenities
- **VenueSearchPage**: Search with filters, mobile cards

## Completed Work
- Full platform rebranding (VenuLock → VenuLoQ)
- Customer Experience Reset Pass (case-centric design)
- Warm ivory/stone background (#EDE9E1)
- Living golden shimmer background effect
- Premium tab styling with gold underlines
- Event hero banner on My Case
- Concierge-style assistance section
- Profile page rewrite with chip selectors
- Bottom nav polish with My Case emphasis
- Google OAuth smart routing (Emergent vs custom GCP)
- /my-enquiries → /home redirect (old dashboard deprecated)
- iPhone safe area support
- Production .env files created
- RM selection padded to always show 3 options
- 10/10 Visual Contrast Polish (April 2026) — unified contrast system across all customer pages

## Pending
- P1: Google OAuth redirect URIs in GCP Console (user action)
- P1: Razorpay production keys (user action)
- P1: Controlled Pilot Rollout execution

## Backlog
- iPhone Safari QA (notch, keyboard, scrolling)
- Quick Preview modal for venues
- "Recently Viewed Venues" component
- Refactor monolithic LandingPage.js
- Facebook Login
- Vendor Payout Module
- SEO meta tags and Open Graph data
