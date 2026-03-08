# VenuLock - Product Requirements Document

## Overview
**VenuLock** — India's trusted managed venue booking platform.
**Tagline:** WE TALK. YOU LOCK.

## Brand Identity (V3 — Updated Mar 8 2026)
- **Colors:** #0A0A0A (primary dark), #FFFFFF, #FAFAF9 (off-white), #C8A960 (gold accent), #EBEBEB (borders)
- **Typography:** EB Garamond italic (wordmark 24px + headings), DM Sans (body/UI), JetBrains Mono (data)
- **Wordmark:** "VenuLock" — EB Garamond italic, font-medium, "Venu" white/dark + "Lock" gold
- **Design System:** 0px radius, 1px-gap card grids, horizontal inline search bar, scroll reveal animations, dark header/footer bookend
- **Desktop Layout:** Hero+search merged into ONE dark block; search bar max-w-[860px]; gold CTA; 68px header
- **Type Scale:** Hero 6.5rem, Headings 36px, Card titles 15-17px, Body 14-15px, Labels 10-11px
- **Section Spacing:** py-16 lg:py-20, content max-w-[1140px]

## Architecture
```
backend/: FastAPI + MongoDB (routes/venues.py, auth.py, admin.py, etc.)
frontend/src/pages/: LandingPage.js (V3), LoginPage.js, 20+ other pages
frontend/src/index.css: Global styles with EB Garamond italic import
```

## Completed Work
### Mar 8, 2026 — V3 Desktop Composition Overhaul
- Merged hero+search into ONE unified dark block (eliminates dead space between them)
- Search bar widened to 860px with gold CTA — truly the page centerpiece
- All section spacing tightened: py-16 lg:py-20 (was py-24 lg:py-32)
- Content areas widened to 1140px (was 1040px)
- Header: 68px height, 24px wordmark, backdrop blur, border-bottom
- Testing: 100% pass (22/22 features, desktop 1440px + mobile 390px)

### Mar 6, 2026 — V2 World-Class Marketplace UI
- Italic serif wordmark, 7rem hero headline, horizontal search bar, 1px-gap grids, scroll reveals, dark footer

### Previous
- Sign-in page fix, event type search bug fix, homepage consistency pass, mobile optimization

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / password123
- Customer: democustomer@venulock.in / password123

## Backlog
- P1: Customer Dashboard clarification (/my-enquiries)
- P2: Razorpay production, automated payouts, AI chatbot, SMS notifications
