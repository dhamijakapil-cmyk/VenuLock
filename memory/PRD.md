# VenuLoQ - Premium Venue Booking Marketplace

## Original Problem Statement
Build a comprehensive venue booking platform with premium "hospitality-tech" aesthetic. Marketplace connecting event planners with curated venues across India. Internal team operations (HR, RM, Specialist, VAM, Venue Owner, Finance, Operations, Marketing) and customer-facing venue search & booking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Integrations**: Resend (email), Emergent Google Auth, Razorpay (test mode)

## Architecture
1. **Customer App (`App.js`):** Public-facing site at root URLs (`/`) with SEO meta tags, OG, JSON-LD
2. **Team Portal (`TeamApp.js`):** Internal portal, lazy-loaded. Accessible at `/team/*` on customer domain OR at root `/` on team domain
3. **Hostname-based routing (`index.js`):** Detects `team.*` domains → loads `TeamRoot.js`; otherwise → loads `App.js`
4. **TeamRoot.js:** Standalone shell for team portal with `/team/*` prefix stripping (redirects `/team/X` to `/X`)
5. **Single deployment** — both apps served from same codebase, same backend API

## User Roles & Portal Access
| Role | Login | Dashboard |
|------|-------|-----------|
| Admin | `/team/login` or `team.venuloq.com/login` | `/team/dashboard` |
| HR | `/team/login` | `/team/dashboard` → `/team/hr/dashboard` |
| RM | `/team/login` | `/team/dashboard` → `/team/rm/dashboard` |
| Venue Specialist | `/team/login` | `/team/dashboard` → `/team/specialist/dashboard` |
| VAM | `/team/login` | `/team/dashboard` → `/team/vam/dashboard` |
| Venue Owner | `/team/login` | `/team/dashboard` → `/team/venue-owner/dashboard` |
| Finance | `/team/login` | `/team/dashboard` → `/team/finance/dashboard` + `/team/finance/ledger` |
| Operations | `/team/login` | `/team/dashboard` → `/team/operations/dashboard` |
| Marketing | `/team/login` | `/team/dashboard` → `/team/marketing/dashboard` |
| Customer | `/login` | `/my-enquiries` |

## What's Been Implemented

### Hostname-Based Team Portal Routing (March 20, 2026)
- `index.js`: Detects hostname containing "team" → lazy loads `TeamRoot.js` instead of `App.js`
- `TeamRoot.js`: Standalone shell with AuthProvider, BrowserRouter, and `/team/*` prefix stripping
- Redesigned `TeamLogin.js`: Professional internal/admin-focused UI with shield logo, dark theme, gold accents
- Created Finance user (`finance@venuloq.in / finance123`)
- **Testing**: All logins pass (Admin, HR, RM, Finance, Customer). Sidebar nav works. Customer app unaffected.

### Previous Session Work
- Finance Payment Ledger, Sidebar Notification Badges, Finance/Operations/Marketing Dashboards
- SEO Meta Tags, Venue Owner Edit Request Workflow, Team Announcements
- Team Welcome Dashboard, Frontend Application Split, Team PWA Branding
- Deployment Readiness Health Check

## Test Credentials
- Admin: admin@venulock.in / admin123
- HR: hr@venuloq.in / hr123
- RM: rm1@venulock.in / rm123
- Venue Specialist: specialist@venuloq.in / spec123
- VAM: vam@venuloq.in / vam123
- Venue Owner: venue@venuloq.in / venue123
- Finance: finance@venuloq.in / finance123
- Customer: democustomer@venulock.in / password123

## Known Issues
- Razorpay in test mode
- WhatsApp delivery MOCKED

## DNS Setup for team.venuloq.com
In GoDaddy DNS:
- **Type**: CNAME
- **Host**: team
- **Points to**: [Emergent production domain or venuloq.com]
- **TTL**: 600

## Future/Backlog (P1-P3)
- P1: Full Venue Acquisition Workflow test
- P1: Venue Owner Portal
- P1: Real-time Notifications
- P2: Full Vendor Payout Module
- P2: "List Your Venue" partner landing page
- P2: Refactor LandingPage.js & VenuePublicPage.js
- P2: Razorpay production mode
- P3: SMS/WhatsApp integration
- P3: Role-based announcements
- P3: Geolocation API for venue address auto-complete
