# VenuLock - Product Requirements Document

## Overview
**VenuLock** — India's trusted managed venue booking platform.
**Tagline:** WE NEGOTIATE. YOU CELEBRATE.

## Brand Identity (V4 Corporate — Mar 8 2026)
- **Colors:** #111 (primary dark), #FFFFFF, #FAFAFA (off-white), #D4AF37 (gold accent), #E0E0E0 (borders)
- **Typography:** DM Sans throughout — bold for headings/wordmark, medium for body, semibold for labels
- **Wordmark:** "VENULOCK" — DM Sans bold, 18px desktop / 15px mobile, uppercase, tracking-[0.12em], "VENU" white + "LOCK" gold
- **Design System:** Corporate sans-serif, high contrast, 0px border radius, 1px-gap card grids, horizontal inline search bar
- **Type Scale:** Hero 5.5rem bold, Headings 32px bold, Card titles 15-16px bold, Body 14-15px, Labels 10-11px
- **Section Spacing:** py-16 lg:py-20, content max-w-[1140px]

## Completed Work
### Mar 8, 2026 — 6 Cities Live with Data (COMPLETE)
- Added 5 new cities: Mumbai (4 venues), Bangalore (4), Hyderabad (4), Chennai (4), Chandigarh (4)
- Delhi already had 11 venues; total platform now has 31 approved venues across 6 cities + Gurgaon/Noida
- Browse by City, city pages (/venues/mumbai etc.), price estimator, search — all verified working
- Seed script fixed to store amenities in correct VenueAmenities dict format
- Testing: 100% (53/53 backend + frontend)
- Interactive budget estimator on landing page: City + Event Type + Guests selectors → live ₹ range from real venue DB
- New backend endpoint `/api/venues/price-estimate` with guest-count filtering, min_spend floor, avg price calc
- Dark full-width section between HOW IT WORKS and FEATURED VENUES
- CTA "Browse N matching venues" navigates to /venues/search with prefilled filters
- Testing: 100% (20/20 backend + frontend)
- **Featured Venues on Landing Page**: `/api/venues/featured` endpoint (top 4 by rating), `FeaturedVenueCard` component, "TOP PICKS / Handpicked. Verified. Ready." section after HOW IT WORKS
- **Testimonials Section**: 3 curated static testimonials (Priya/Rohan/Ananya) with star ratings, quotes, initial avatars — "REAL CELEBRATIONS" section before FINAL CTA
- **Venue Detail Page Polish**: Both VenueDetailPage.js AND VenuePublicPage.js (SEO slug page) updated — dark #111111 booking card, #D4AF37 gold throughout, "Speak to Our Venue Expert" CTA opens EnquiryForm modal (VenuePublicPage was previously linking to /#concierge anchor, now fixed)
- **Wishlist/Favorites**: Confirmed already fully implemented (FavoritesContext + FavoritesPage + heart on venue cards)
- Testing: 100% backend (13/13), all frontend sections verified
- Added "Find. Compare. Lock." platform tagline above hero headline
- Updated hero headline to "We Negotiate. You Celebrate." (second line gold)
- Gold 2px accent line at top of search bar for premium feel
- Gradient gold-accent line transition between dark hero and white sections
- Section overline labels ("WHY VENULOCK", "HOW IT WORKS", etc.) throughout all sections
- Consistent 0px border-radius, 1px-gap card grids across all below-fold sections
- Trust strip below search bar (500+ Verified Venues, Transparent Pricing, End-to-End Support)
- Testing: 100% pass (25/25) — all sections, dropdowns, navigation, mobile, footer verified

### Mar 8, 2026 — V4 Corporate Redesign
- Switched wordmark from italic serif to bold uppercase sans-serif (VENULOCK)
- Changed ALL headings from EB Garamond serif to DM Sans bold (via global CSS)
- Boosted gold to #D4AF37 (brighter than old #C8A960)
- Increased all text contrast (subtitle white/55, trust white/40, body #777)
- Testing: 100% pass (22/22)

### Mar 8 — V3 Desktop Composition
- Merged hero+search into ONE dark block, widened search to 860px, tighter spacing

### Mar 6 — V2 Marketplace UI + V1 Refinements
- Horizontal inline search bar, scroll reveals, dark footer, 1px-gap grids

## Credentials
- Admin: admin@venulock.in / admin123, RM: rm1@venulock.in / password123, Customer: democustomer@venulock.in / password123

## Backlog
- P1: Customer Dashboard clarification (/my-enquiries)
- P2: Razorpay production, automated payouts, AI chatbot, SMS notifications
