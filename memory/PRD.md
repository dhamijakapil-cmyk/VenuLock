# VenuLoQ - Premium Venue Booking Platform

## Product Vision
A premium hospitality-tech marketplace that connects customers with curated event venues through a concierge-style booking experience.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + lucide-react
- **Backend**: FastAPI + MongoDB (DB: test_database)
- **Auth**: JWT + Emergent-managed Google OAuth
- **Payments**: Razorpay (Test Mode)
- **Email**: Resend via Emergent integrations

## Design System
- **Background**: #EDE9E1 (warm ivory/stone)
- **Dark surfaces**: #0B0B0D
- **Gold accent**: #D4B36A
- **Headings**: Cormorant Garamond (serif)
- **Body**: DM Sans (sans-serif)

### Contrast Hierarchy
| Level | On Ivory (#EDE9E1) | On Dark (#0B0B0D) |
|---|---|---|
| Primary (headings) | #0B0B0D (full) | #F4F1EC (full) |
| Secondary (body) | #0B0B0D/70 | #F4F1EC/70 |
| Tertiary (meta/labels) | #0B0B0D/45 | #F4F1EC/45-50 |
| Muted (decorative) | #0B0B0D/25 | #F4F1EC/25 |

## Pilot Readiness Status
- **System state**: FRESH START — 0 active leads, all case data archived
- **Master data intact**: 98 users, 86 venues (untouched)
- **Archive**: 141 leads + related data in `archived_*` collections (rollback available)
- **Backup file**: `/app/test_reports/pilot_reset_backup_20260403_144542.json`
- **RM Capacity**: All RMs at 0/25 — fully available
- **Validation**: 9/9 checks passed (dashboard clean, case creation works, auth intact)

### Pilot Go/No-Go
- **Internal Dry Run**: GO
- **Friendly Customer Pilot**: GO (email/password auth, Razorpay test mode)
- **Small Live Pilot**: CONDITIONAL (needs Razorpay prod keys + Google OAuth config)

## Blocked on User Configuration
- Google OAuth: Add production redirect URIs in GCP Console
- Razorpay: Set production RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend .env

## Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Customer: democustomer@venulock.in / password123

## Completed Work (This Session — April 3, 2026)
- 10/10 Visual Contrast Polish (unified contrast system across all customer pages)
- RM Dashboard stats bug fix (team.py: assigned_rm → rm_id)
- Full E2E Dry Run — 42/42 endpoints PASS
- Pre-pilot test data cleanup (149 TEST_ leads purged)
- **Fresh-start pilot reset** — all 141 leads archived, 0 active, master data untouched

## Backlog
- P1: Phase 2 — Quick Preview modal, Recently Viewed Venues
- P2: Phase 3 — Refactor LandingPage.js, VenuePublicPage.js
- P2: Facebook Login
- P2: Vendor Payout Module
- P2: SEO meta tags, Open Graph, structured data
