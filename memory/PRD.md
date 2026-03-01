# BookMyVenue - Product Requirements Document

## Original Problem Statement
Build a scalable event venue marketplace platform for India named "BookMyVenue" with:
- Customer-facing website & app
- Admin panel
- Venue dashboard
- Event planner dashboard
- CRM & lead management system
- Relationship manager assignment logic
- Commission tracking system
- Advanced filtering and sorting engine

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Python 3.11+, Motor (async MongoDB)
- **Database**: MongoDB
- **Authentication**: JWT + Emergent-managed Google OAuth
- **Email**: Resend (configured, ready for API key)

## User Roles & Personas

### 1. Customer
- Browse and search venues
- View venue details, photos, pricing, reviews
- Submit enquiries
- Track enquiry status

### 2. Relationship Manager (RM)
- View assigned leads
- Update lead stages (New → Contacted → Shortlisted → Negotiation → Site Visit → Booking Confirmed → Lost)
- Add notes and follow-ups
- Manage venue shortlists
- Track commissions

### 3. Admin
- View platform statistics
- Manage users and roles
- Approve/reject venues and planners
- View all leads and performance
- Manage cities and areas

### 4. Venue Owner
- Create and edit venue listings
- Set pricing, amenities, packages
- Manage availability
- View enquiries for their venues

### 5. Event Planner
- Create professional profile
- List services and pricing
- Manage portfolio
- Receive customer referrals (Phase 2)

## Core Requirements (MVP)

### Implemented ✅

#### Customer Website
- [x] Landing page with hero, search, featured venues
- [x] Venue search with filters (city, area, event type, venue type, capacity, price, rating, amenities)
- [x] Sorting (price, rating, popularity, newest)
- [x] Venue detail page with photos, pricing, amenities, reviews
- [x] Enquiry form submission
- [x] User registration and login (JWT + Google OAuth)

#### RM Console
- [x] Lead dashboard with pipeline view
- [x] Lead detail page with customer info, event details
- [x] Stage management
- [x] Notes and follow-ups
- [x] Venue shortlist management
- [x] Commission tracking (manual fields)

#### Admin Panel
- [x] Dashboard with stats
- [x] User management (view, activate/deactivate, change roles)
- [x] Venue management (view, approve/reject)
- [x] Lead overview
- [x] City/area management

#### Venue Owner Dashboard
- [x] Venue listing CRUD
- [x] Pricing and packages
- [x] Amenities management
- [x] View enquiries

#### Event Planner Dashboard
- [x] Profile creation
- [x] Services and pricing
- [x] Portfolio management

### Backend APIs
- [x] Authentication (register, login, Google OAuth, session management)
- [x] Venues CRUD with advanced search
- [x] Leads CRUD with RM assignment (round-robin)
- [x] Cities/Areas management
- [x] Reviews
- [x] Notifications (in-app)
- [x] Admin endpoints

## Database Schema

### Collections
1. **users** - user_id, email, name, role, status, picture, password_hash, created_at
2. **venues** - venue_id, owner_id, name, description, location, pricing, amenities, images, status, rating
3. **leads** - lead_id, customer details, venue_ids, rm_id, stage, notes, follow_ups, commission fields
4. **cities** - city_id, name, state, areas[]
5. **reviews** - review_id, venue_id, user_id, rating, content
6. **planners** - planner_id, user_id, name, services, cities, portfolio_images, status
7. **notifications** - notification_id, user_id, title, message, type, read
8. **user_sessions** - session_token, user_id, expires_at
9. **venue_availability** - venue_id, date, status
10. **rm_assignments** - city, rm_id, assigned_at (for round-robin)

## Key Routes / Sitemap

### Public Routes
- `/` - Landing Page
- `/venues` - Venue Search
- `/venues/:id` - Venue Detail
- `/login` - Login
- `/register` - Register

### Customer Routes (Protected)
- `/my-enquiries` - My Enquiries

### RM Routes (Protected)
- `/rm/dashboard` - RM Dashboard
- `/rm/leads/:id` - Lead Detail

### Admin Routes (Protected)
- `/admin/dashboard` - Admin Dashboard
- `/admin/users` - User Management
- `/admin/venues` - Venue Management
- `/admin/leads` - All Leads
- `/admin/cities` - City Management

### Venue Owner Routes (Protected)
- `/venue-owner/dashboard` - Dashboard
- `/venue-owner/create` - Add Venue
- `/venue-owner/edit/:id` - Edit Venue

### Event Planner Routes (Protected)
- `/planner/dashboard` - Planner Dashboard

## User Flows

### Customer → Enquiry → RM → Booking
1. Customer searches venues on `/venues`
2. Applies filters (city, event type, price, etc.)
3. Views venue detail, clicks "Enquire Now"
4. Fills enquiry form with event details
5. Lead auto-created, RM auto-assigned (round-robin)
6. RM contacts customer, updates stage
7. RM shortlists venues, schedules site visits
8. Booking confirmed, commission tracked

## Demo Credentials
- **Admin**: admin@bookmyvenue.in / admin123
- **RM**: rm1@bookmyvenue.in / rm123
- **Venue Owner**: venue@bookmyvenue.in / venue123

## Prioritized Backlog (P0/P1/P2)

### P0 (Critical - MVP)
- [x] Core search and filter functionality
- [x] Enquiry submission flow
- [x] RM lead management
- [x] Admin venue approval

### P1 (High Priority - Post-MVP)
- [ ] Map view integration (Leaflet)
- [ ] Venue availability calendar UI
- [ ] Email notifications (Resend integration)
- [ ] Review submission by customers
- [ ] Document upload for leads

### P2 (Medium Priority)
- [ ] Razorpay payment integration
- [ ] Event planner-lead connection
- [ ] Advanced analytics dashboard
- [ ] Mobile PWA optimization
- [ ] SEO meta tags and sitemap.xml

## What's Been Implemented
- **Date**: Feb 28, 2026
- Complete MVP with all 5 user dashboards
- Full backend API with 30+ endpoints
- Responsive web design (mobile-first)
- JWT + Google OAuth authentication
- MongoDB data models
- Seed data script

### Recent Updates (Feb 28, 2026)
- **FIXED**: Select component bug - Changed empty string values to `__all__` to prevent React TypeError on all filter dropdowns
- **COMPLETE**: Logo component refactored with size variants (header: 30px, sidebar: 38px, large: 48px)
- **COMPLETE**: Logo integrated consistently across Header, Login, Register, Dashboard, Footer
- **COMPLETE**: Map/List toggle on venue search page with Leaflet/OpenStreetMap
- **MAJOR UPGRADE**: Transformed to MANAGED CONCIERGE PLATFORM:
  - Enhanced 8-stage lead pipeline: New → Contacted → Requirement Understood → Shortlisted → Site Visit → Negotiation → Booking Confirmed → Lost
  - Venue Shortlist management with proposed pricing
  - Quote system (RM creates structured quotes, venue/planner can upload PDF)
  - Communication Log (call, email, WhatsApp, in-person with duration tracking)
  - Follow-up scheduler with type (call, email, meeting, site visit)
  - Enhanced Notes with types (general, negotiation, requirement, internal)
  - Planner matching with budget segments (budget, premium, luxury)
  - Contact visibility control (released at site_visit stage)
  - Full audit log / activity timeline for every action
  - Booking confirmation validation (requires deal value + at least one commission)
  - "Managed by BookMyVenue Experts" branding on enquiry flows
- **COMMISSION LIFECYCLE TRACKING**:
  - 4-stage commission status: Projected → Confirmed → Earned → Collected
  - Auto-transition: deal_value sets "Projected", booking_confirmed sets "Confirmed"
  - Event completion moves commission to "Earned" (Admin only)
  - Finance marks "Collected" when payment received (Admin only)
  - Commission age tracking (days since confirmed)
  - Support for both percentage AND flat fee
- **PREMIUM HOMEPAGE REDESIGN** (Investor-ready):
  - Full-width navy (#0B1F3B) hero section
  - Large serif headline: "Book Perfect Venues for Every Event." (gold highlight + underline)
  - Subheadline: "A Managed Event Booking Platform Powered by Experts."
  - Elegant 5-field search bar: Location, Event Type, Guest Count, Date, Gold Search button
  - Value proposition: "Your Personal Event Concierge" with 3 features
  - 4-step "How It Works" with connecting gold lines
  - Navy CTA section with gold accents
  - Clean spacing, no clutter, mobile-responsive

### UI/UX & Microcopy Upgrade (Feb 28, 2026)
- **GLOBAL MICROCOPY UPGRADE** (Balanced Modern Startup tone - Airbnb × Premium Concierge):
  - Public-facing: "Submit Enquiry" → "Speak to Our Venue Expert"
  - Public-facing: "Search"/"Find Venues" → "Discover Venues"  
  - Public-facing: "View Details" → "Explore Venue"
  - Public-facing: "Booking Confirmed" → "Event Secured"
  - Internal: "Lead" → "Client Case"
  - Internal: "RM Dashboard" → "Relationship Manager Console"
  - Internal: "Admin Panel" → "Operations Control Center"
  - Internal: "Vendor Dashboard" → "Partner Console"
  - Internal: "Lost" → "Closed – Not Proceeding"
  - Internal: "Commission" → "Partner Earnings"
- **TRUST MESSAGING** added:
  - Homepage hero: "No direct vendor pressure. We represent you."
  - Homepage gold text: "Transparent pricing. Professional negotiation. Zero hidden surprises."
  - Venue detail: "Our experts negotiate pricing and manage documentation on your behalf."
- **EXECUTIVE DASHBOARD REDESIGN**:
  - RM Console: 5 summary cards (Active Client Cases, New Client Cases, Cases in Negotiation, Events Secured, Partner Earnings)
  - Admin Operations Center: 5 executive cards (Total Deal Value, Partner Earnings, Collection Rate, Active RMs, Conversion Rate)
  - Clean SaaS-style layout with light background (#F9FAFB)
- **VENUE CARD CONSISTENCY**: Premium VenueCard with "Managed by BMV" badge used across search list, map sidebar, and landing page
- **DESIGN SYSTEM**: Added CSS classes for summary cards, stat cards, status tags, data tables

### Premium Mobile Hero Redesign (Feb 28, 2026)
- **POWERFUL HEADLINE**: "We Negotiate. You Celebrate." - commanding, differentiated, confident
- **BENEFIT-DRIVEN SUBHEADING**: "From discovery to deal closure — our experts handle negotiation, availability, and paperwork for you."
- **AUTHORITY TRUST INDICATORS**: 3 horizontal badges below search (500+ Premium Venues, 30-Min Expert Callback, Negotiation Included)
- **MOBILE OPTIMIZATION**: 
  - Reduced hero vertical space with tighter padding
  - Simplified mobile search (Location + CTA only) for above-fold fit
  - Full search card on desktop (Location, Event, Guests, Date, CTA)
- **MAGNETIC CTA**: Enhanced gold gradient button with deeper shadow and tap animation
- **BACKGROUND DEPTH**: Rich navy gradient (from #0D2847 to #071428) with subtle radial gold glow behind headline
- **MICRO SOCIAL PROOF**: "Trusted by families and corporates across Delhi NCR."

### Premium Concierge Onboarding Flow (Feb 28, 2026)
- **ENQUIRY FORM REDESIGN** - 4-step premium concierge intake experience:
  - **Step 0 (Intro)**: "Let's Plan This Together" positioning screen with venue image, trust badges (Best Price Guarantee, Response in 30 mins, Dedicated Expert), and "Start Consultation" CTA
  - **Step 1 (Personal Details)**: Name, phone, email with inline validation
  - **Step 2 (Event Details)**: Event type dropdown, guest count, date picker with calendar, "I require full event planning assistance" checkbox
  - **Step 3 (Investment & Preferences)**: 
    - Estimated Investment Range dropdown: Under ₹5L, ₹5-10L, ₹10-25L, ₹25L+, Flexible/Open to Suggestions
    - "Prefer to discuss this on a call?" link to WhatsApp
    - Additional requirements textarea
  - **Submit button**: "Assign My Venue Expert"
  - **Confirmation Screen**: Success message, assigned RM card with rating, callback ETA (30 mins), venue info, WhatsApp button, "Track Your Request" button
- **VALIDATION IMPROVEMENTS**: Inline error messages for required fields, graceful backend error handling
- **TRUST MESSAGING**: Footer text "We negotiate on your behalf. No spam. No vendor calls."

### Phase 1: Advance Payment Mediation System (Feb 28, 2026)
- **PAYMENT COLLECTION LAYER**: BookMyVenue acts as transaction intermediary for confirmed bookings
- **NEW PAYMENT STATUSES**: 
  - `awaiting_advance` - Payment link generated, waiting for customer
  - `advance_paid` - Customer has paid advance to BookMyVenue
  - `payment_released` - Admin released payment to venue
  - `payment_failed` - Payment attempt failed
- **RAZORPAY INTEGRATION** (Test Mode):
  - Mock order_id generation for development
  - Payment link generation: `https://rzp.io/test/{order_id}`
  - Admin "Simulate Payment" button for testing
  - Webhook endpoint ready for production
- **FLEXIBLE COMMISSION HANDLING**:
  - Per-venue negotiated rate via `negotiated_commission_percent` (admin-only)
  - Minimum platform fee floor via `minimum_platform_fee`
  - Default fallback: 10% (configurable via `DEFAULT_COMMISSION_RATE` env)
  - Automatic breakdown: `advance_paid - commission = net_to_vendor`
- **ADVANCE AMOUNT GUARDRAILS**:
  - Minimum: 10% of deal value (per venue or default)
  - Maximum: 50% of deal value (prevents misuse)
  - Validation error messages guide RMs to correct range
  - Real-time % calculation shown in UI
- **EMAIL NOTIFICATIONS** (via Resend):
  - Customer: Payment link email with "Pay Now" button
  - Venue Owner: Payment released notification with amount
  - Graceful fallback if Resend API key not configured
- **ADMIN PAYMENTS DASHBOARD** (`/admin/payments`):
  - Stats cards: Total Collected, BMV Commission, Pending Release, Released to Venues
  - Payments table with commission rates per transaction
  - "Simulate Payment" button (test mode only)
  - "Release Payment to Venue" button with confirmation dialog
- **RM LEAD DETAIL INTEGRATION**:
  - "Advance Payment" section for booking_confirmed leads
  - Live advance % calculator (shows % of deal)
  - Commission preview with venue's negotiated rate
  - Min/Max guardrail warnings
  - Payment link copy button
  - Status badges: Awaiting (amber), Paid (green), Released (blue)
- **ADMIN VENUE SETTINGS** (New endpoints):
  - `PUT /admin/venues/{id}/commission-settings` - Set negotiated rates
  - `GET /admin/venues/{id}/commission-settings` - View current settings
- **AUDIT LOGGING**: All payment events logged (order_created, payment_verified, payment_simulated, payment_released, commission_settings_updated)

### Phase 2: Venue Availability Calendar (Feb 28, 2026)
- **VENUE OWNER CALENDAR** (`/venue-owner/calendar`):
  - Interactive calendar UI using shadcn/ui Calendar component
  - Venue selector dropdown for owners with multiple venues
  - Month navigation with previous/next buttons
  - Color-coded dates: Green (Available), Amber (Tentative), Red (Blocked), Gray (Booked)
  - Multi-date selection with bulk status update
  - Time slot support: Full Day, Morning (6AM-12PM), Evening (6PM-12AM)
  - Optional notes field for blocked dates
  - Stats cards showing day counts by status
- **PUBLIC VENUE PAGE AVAILABILITY INDICATOR**:
  - "Upcoming Availability" section in sidebar
  - Next 14 days grouped by consecutive same-status dates
  - Color-coded dots: Green=Available, Red=Blocked, Amber=Tentative
  - Helpful text: "Contact our expert to check specific date availability."
- **RM DATE HOLD FEATURE** (Hold dates for clients):
  - "Date Holds" section in lead detail sidebar (visible when shortlist exists)
  - "Hold Date for Client" button opens dialog
  - Hold parameters: Venue (from shortlist), Date, Time Slot
  - Default hold duration: 24 hours
  - Max 2 extensions (24h each) allowed for RMs
  - Beyond 2 extensions requires Admin approval
  - Active holds display: Venue name, date, time slot, hours remaining
  - "Expiring" badge when <6 hours remaining
  - +24h extension button (shows extension count)
  - Release button to manually release hold
  - Auto-release: Expired holds released on GET endpoints
- **BACKEND API ENDPOINTS**:
  - `GET /api/venues/{venue_id}/availability?month=YYYY-MM` - Get slots for month
  - `POST /api/venues/{venue_id}/availability/bulk` - Bulk update dates
  - `POST /api/venues/{venue_id}/hold-date` - Create 24h hold for lead
  - `POST /api/venues/{venue_id}/hold-date/{hold_id}/extend` - Extend hold (+24h)
  - `DELETE /api/venues/{venue_id}/hold-date/{hold_id}` - Release hold
  - `GET /api/leads/{lead_id}/holds` - Get all holds for lead with hours_remaining
  - `GET /api/venues/{venue_id}/holds` - Get all holds for venue (auto-releases expired)
- **ACCESS CONTROL**: Only RMs and Admins can create/manage holds

### Phase 3: Admin Control Room Dashboard (Feb 28, 2026)
- **CONTROL ROOM** (`/admin/control-room`) - Investor-ready revenue intelligence dashboard:
  - **5 Metric Cards**:
    - Pipeline Value - Total deal value in active leads (₹ format with L/Cr)
    - Confirmed GMV - Gross merchandise value from confirmed bookings (current month)
    - BMV Commission - Platform revenue earned (current month)
    - Active Holds - Count of tentative date reservations
    - Payment Conversion Rate - Link-to-payment percentage
  - **Monthly GMV Trend Chart** (Recharts):
    - Last 6 months comparison
    - Navy bars for GMV, Gold bars for Commission
    - Y-axis formatted for Indian currency (₹K/L/Cr)
    - Interactive tooltips with booking counts
  - **Top 10 Venues Table**:
    - Columns: Rank (with medal styling), Venue Name, City, Tier, Total Revenue
    - Tier badges: Premium (gold), Standard (blue), Budget (gray)
    - "All Time" filter badge
    - Graceful empty state when no data
  - **Live Mode Auto-Refresh** (Wall-monitor friendly):
    - Toggle: "Live Mode" (default OFF)
    - When ON: Auto-refresh every 60 seconds with countdown badge
    - Interaction-aware: Pauses refresh during user interaction (hover/scroll)
    - 5-second cooldown after interaction before resuming
    - Manual "Refresh" button for immediate data fetch
    - Footer shows "Last updated: Just now" and "Auto-refresh active"
  - **Executive SaaS Styling**: Clean cards with gradient icons, Live badge, timestamp footer
- **BACKEND API**: `GET /api/admin/control-room` - Returns metrics, monthly_gmv_trend, top_venues_by_commission
- **ACCESS CONTROL**: Admin-only (403 for non-admin users)

### Phase 4: Lead Stage Validation Rules (Feb 28, 2026)
- **OPERATIONAL GUARDRAILS** - Stage transition validation rules:
  - **Site Visit** requires:
    - Requirement summary (min 10 characters)
    - At least 1 venue shortlisted
  - **Negotiation** requires:
    - All Site Visit requirements
    - Venue availability confirmed (via toggle OR active date hold)
  - **Booking Confirmed** requires:
    - Deal value entered
    - At least one commission configured (venue or planner)
    - Advance payment link generated
    - Venue date marked as blocked
- **STAGE PROGRESS CHECKLIST** in RM Lead Detail sidebar:
  - Shows requirements for Site Visit, Negotiation, Booking Confirmed
  - "Ready" badges when all requirements met
  - ✓/○ checkmarks for individual requirements
- **QUICK ACTIONS TOGGLES**:
  - "Venue Availability Confirmed" switch
  - "Venue Date Blocked" switch
- **VALIDATION ERROR DISPLAY**: Red alert box with detailed missing requirements list
- **BACKWARDS TRANSITIONS**: Always allowed without validation
- **LOST STAGE**: Always allowed without validation
- **AUDIT LOGGING**: All stage transitions logged via create_audit_log
- **BUG FIX**: Resolved circular dependency - payment creation now allowed in 'negotiation' stage

### Phase 5: Payment-State Protection Rules (Feb 28, 2026)
- **RULE 1 - STAGE REVERSION LOCK** (advance_paid):
  - RM cannot revert stage backwards from `booking_confirmed` when payment received
  - Admin CAN override (logged as `admin_stage_override`)
  - Error message: "Cannot revert stage after payment received. Admin override required."
- **RULE 2 - VENUE DATE BLOCKING** (requires advance_paid):
  - `venue_date_blocked` cannot be set to true until advance payment received
  - Toggle disabled in UI with "Requires advance payment" message
  - Error logged as `venue_block_denied` when attempted
- **RULE 3 - PAYMENT RELEASED LOCK** (full lock):
  - When `payment_released`, lead becomes read-only for RMs
  - Admin CAN override (logged)
  - Error logged as `update_blocked` when RM attempts modification
- **FRONTEND UI**:
  - **Lead Locked Banner**: Amber banner with Shield icon when `payment_released`
  - **Stage Protected Banner**: Blue info box when `advance_paid` at `booking_confirmed`
  - **Venue Date Blocked Toggle**: Disabled with helper text when payment not received
- **AUDIT LOGGING**: All protection events logged:
  - `update_blocked`: RM tried to modify locked lead
  - `venue_block_denied`: Tried to block date without payment
  - `admin_stage_override`: Admin reverted protected stage
- **API ENHANCEMENT**: `stage-requirements` endpoint returns `payment_protection` object:
  - `is_locked`: Lead completely locked (payment_released)
  - `is_stage_protected`: Stage protected (advance_paid at booking_confirmed)
  - `can_block_venue_date`: Can set venue_date_blocked
  - `lock_reason`: Human-readable explanation

### Phase 6: RM Venue Comparison Sheet (Feb 28, 2026)
- **PREMIUM COMPARISON PDF GENERATOR** for RMs to create client-facing brochures:
- **VENUE SELECTION FLOW**:
  - Dialog opens from "Generate Comparison Sheet" button on lead shortlist tab
  - 3-5 venue selection requirement (enforced frontend + backend)
  - Checkbox selection with real-time count: "X of 3-5 venues selected"
  - Optional "BMV Expert Notes" textarea appears when venue selected
- **PAGE 1 - VENUE CARDS (Premium Brochure Style)**:
  - BookMyVenue branded header with gold underline
  - Customer name and event details (event type, date, guest count)
  - Each venue card includes:
    - Navy gradient header with venue name + availability indicator (Green/Amber/Red)
    - Venue type, location, capacity range
    - Description text
    - Top 6 amenities with checkmark badges
    - Starting price + Negotiated price (green box)
    - Star rating with review count
    - Venue photo
    - BMV Expert Notes (yellow box) if provided
- **PAGE 2 - COMPARISON TABLE (Side-by-Side)**:
  - Navy header with gold venue names
  - Table rows: Venue Type, Location, Capacity, Starting Price, Setting, Rating, Availability, Key Highlights
  - Footer with generation date, RM name, contact info
- **ACTIONS**:
  - "Copy Link" button - Copies shareable public URL
  - "Download PDF" button - Multi-page PDF using jsPDF + html2canvas
- **PUBLIC SHARING PAGE**: `/comparison/:sheetId` - Public view of generated sheet
- **BACKEND ENHANCEMENTS**:
  - `POST /api/leads/{lead_id}/comparison-sheet` - Generates and stores sheet
  - `GET /api/comparison-sheets/{sheet_id}` - Public fetch for sharing
  - Stores in `comparison_sheets` collection
  - Audit log: `comparison_sheet_generated`
- **STYLING**: Navy (#0B1F3B) + Gold (#C9A227) theme with clean luxury aesthetic
- **TESTING**: 100% pass rate (iteration_13.json)

### Phase 7: Backend Refactor - Strangler Pattern COMPLETE (Feb 28, 2026)
- **MODULAR ARCHITECTURE** - ALL BUSINESS ROUTES MIGRATED:
- **ROUTE MODULES** (7 total):
  - `/backend/routes/auth.py` - Auth (register, login, google-session, me, logout)
  - `/backend/routes/venues.py` - Venue CRUD & search (15+ filters)
  - `/backend/routes/availability.py` - Calendar availability, date holds
  - `/backend/routes/comparison_sheets.py` - Venue comparison PDF generation
  - `/backend/routes/leads.py` - Complete lead lifecycle (26 endpoints)
  - `/backend/routes/admin.py` - Admin ops, analytics, approvals (12 endpoints)
  - `/backend/routes/payments.py` - Razorpay payments (7 endpoints)
- **SERVICE LAYER** (6 services):
  - `/backend/services/lead_service.py` - Lead validation, commission calc
  - `/backend/services/payment_service.py` - Payment breakdown, Razorpay
  - `/backend/services/availability_service.py` - Date holds, availability
  - `/backend/services/comparison_sheet_service.py` - Sheet generation
  - `/backend/services/admin_analytics_service.py` - Control room, reports
  - `/backend/services/rm_analytics_service.py` - RM performance, SLA breaches
- **SHARED**: `config.py`, `models/__init__.py`, `utils/__init__.py`
- **CODE REDUCTION**: server.py 4561 → 1435 lines (~70% reduction)
- **TESTING**: 100% pass rate - 105 tests (iteration_18.json)

### 12. RM Self-Service Performance Dashboard (Completed Feb 2026)
- Route: `/rm/my-performance` — RM-only self-service analytics
- **Personal Funnel**: Assigned, Contacted %, Site Visit %, Confirmed %, conversion rate with team comparison
- **Financial Impact**: Total GMV, Commission, Avg Deal Size with "vs team" indicators
- **SLA Alerts**: Aging leads, expiring holds, pending payment links > 24h
- Backend: `GET /api/rm/my-performance`, `GET /api/rm/my-sla-alerts`
- Data isolation verified — each RM sees only their own metrics
- Team averages shown for comparison only

### 13. SEO-Friendly Public URLs + Enhanced Venue Pages (Completed Feb 2026)
- **Slug-based URLs**: `/venues/{city}` city listing, `/venues/{city}/{venue-slug}` detail page
- **City Listing Page**: Hero with city name/state, area tags, event type + sort filters, venue grid
- **Venue Detail Page**: Hero gallery with thumbnails, quick stats, packages, amenities grid, reviews, FAQ, related venues, "Speak to Venue Expert" CTA
- **SEO Meta**: Dynamic title, description, OpenGraph, canonical URL via `useSEO` custom hook
- **JSON-LD Schema**: `ItemList` for city pages, `EventVenue` with `aggregateRating` for venue pages
- **Backend**: 3 new public endpoints: `/api/venues/cities`, `/api/venues/city/{slug}`, `/api/venues/city/{slug}/{venue_slug}`
- **Backward compat**: `/venues/{venue_id}` legacy URLs still work via VenueOrCityPage discriminator
- Footer city links updated to SEO-friendly URLs

### 14. Lead Aging + SLA Push Notifications (Completed Mar 2026)
- **Background SLA Monitor**: Runs every 15 minutes, checks all active leads for SLA breaches
- **4 Alert Types**: First contact SLA (24h), stage aging (24h-240h by stage), hold expiry (<3h), payment pending (>24h)
- **In-app Notifications**: Color-coded (amber=warning, red=critical/breach) for both RM and Admin
- **Notification Bell**: Real-time dropdown with unread count, severity badges (WARN/BREACH), mark read, mark all read, view lead link
- **Admin Control Room**: SLA alert banner with breach count, severity breakdown, and affected lead names
- **Audit Logging**: All breaches logged to audit_logs collection
- **Deduplication**: 6-hour window prevents notification spam for same breach
- **Admin Trigger**: `POST /api/admin/trigger-sla-check` for on-demand SLA checks
- **Backend**: Notification CRUD routes (`/api/notifications`, mark read, mark all), SLA monitor service
- Collections: `notifications`, `sla_alerts_log`, `audit_logs`

### 15. City Landing Hub /venues (Completed Mar 2026)
- **Route**: `/venues` — discovery page listing all cities with venue cards
- Each city card: hero image, venue count badge, city name/state, starting price, max capacity, area tags, "Explore Venues" CTA
- SEO intro text explaining BookMyVenue's managed booking model
- Hero with "Speak to Venue Expert" + "Search All Venues" CTAs
- JSON-LD `ItemList` schema for cities
- VenueSearchPage moved to `/venues/search` for backward compatibility
- All existing slug routes preserved (`/venues/delhi`, `/venues/delhi/the-grand-imperial`)

### 16. Weekly RM Performance Digest Email (Completed Mar 2026)
- Auto-sends weekly digest to all active RMs (triggered manually by admin or on Mondays 9AM IST)
- Email includes: lead funnel (assigned/contacted/site visits/confirmed), conversion %, total GMV, SLA status, top 3 deals of the week, new leads count
- Premium HTML email template with BookMyVenue branding
- Backend: `POST /api/admin/send-weekly-digests`, `digest_log` collection tracks sent emails
- Background scheduler runs weekly; admin trigger for on-demand sends

### 17. Critical SLA Escalation Email (Completed Mar 2026)
- Sends email to all admins when a lead exceeds 2x the SLA threshold for its current stage
- **24-hour cooldown** per lead prevents email spam
- Red-themed critical escalation email with lead details, RM name, time in stage, deal value
- Backend: `POST /api/admin/send-sla-escalations`, `escalation_log` collection tracks sends
- Auto-runs hourly via background scheduler (every 4th SLA check cycle); admin trigger available

## Next Tasks
1. **P2**: Planner Suggestions - Attach planners to client cases
2. **P2**: Continue slimming `server.py` helpers into `/services` & `/utils`

## Future Tasks
- Full Razorpay production integration (pending API keys)
- Automated payouts to venues (manual for now)
- Escrow logic and automated payouts
- Refund automation
- GST invoice generation
- AI features (chatbot, recommendations)
- SMS/WhatsApp notifications (Twilio)
- Mobile PWA optimization
- Advanced RM analytics enhancements (custom date ranges, export to PDF)

### Conversion Intelligence Layer (March 1, 2026)
- **ADMIN ANALYTICS ENHANCEMENT**: New `/admin/conversion-intelligence` page for executive-level sales funnel analysis
- **THREE-TAB DASHBOARD**:
  - **Stage Funnel**: Visual funnel with counts, conversion %, and highlighted "Leak Point" (biggest drop-off)
  - **Deal Velocity**: Avg + median time per stage with SLA status indicators (OK/EXCEEDED)
  - **Revenue Forecast**: Stage-weighted probability calculations for pipeline value, weighted GMV, weighted commission
- **COMPREHENSIVE FILTERS**:
  - Date range presets: Last 7 days, 30 days, 90 days, All Time
  - Custom date range with calendar pickers
  - City filter (dropdown with all active cities)
  - RM filter (dropdown with all active RMs)
- **LEAK POINT DETECTION**: Automatically identifies and highlights the stage transition with highest drop-off percentage
- **STAGE PROBABILITY WEIGHTS**: Configurable weights for revenue forecasting (New: 5%, Contacted: 10%, Requirement: 20%, Shortlisted: 35%, Site Visit: 50%, Negotiation: 70%, Confirmed: 100%)
- **SLA THRESHOLDS**: Stage-level time thresholds to flag slow deals (New: 24h, Contacted: 72h, etc.)
- **CSV EXPORT**: Download filtered lead data for external analysis
- **BACKEND ENDPOINTS**:
  - `GET /api/admin/conversion-intelligence` - Main analytics data with filters
  - `GET /api/admin/conversion-intelligence/filters` - Filter options (cities, RMs)
  - `GET /api/admin/conversion-intelligence/export` - CSV export data
- **TEST RESULTS**: 100% pass rate (24 backend tests + full frontend verification)

### Lead Source & Attribution Architecture (March 1, 2026)
- **DATA MODEL ENHANCEMENT**: Every lead now stores:
  - `source`: Meta, Google, Organic, Referral, Planner, Direct
  - `campaign`: Optional campaign identifier for paid channels
  - `landing_page`: URL where lead originated
- **SOURCE FILTER INTEGRATION**:
  - Added to Conversion Intelligence page
  - GET /api/admin/conversion-intelligence/filters returns `sources` array
  - GET /api/admin/conversion-intelligence supports `source` filter parameter
  - GET /api/leads supports `source` filter parameter
- **NEW CHANNEL PERFORMANCE PAGE** (`/admin/channel-performance`):
  - Summary cards: Total Leads, Confirmed Bookings, Total GMV, Total Commission, Avg Conversion
  - Leads by Source bar chart
  - Lead Distribution pie chart
  - GMV by Source bar chart
  - Conversion Rate by Source horizontal bar chart
  - Detailed breakdown table with source icons
  - Filters: Date range, City, RM
- **BACKEND ENDPOINTS**:
  - `GET /api/admin/channel-performance` - Channel performance metrics with filters
  - `POST /api/admin/backfill-lead-sources` - Backfill existing leads with "Direct" source
- **TEST RESULTS**: 100% pass rate (18 backend tests + full frontend verification)

## Documentation
- `/app/MANAGED_PLATFORM_DOCS.md` - Full schema and workflow documentation
- `/app/test_reports/iteration_7.json` - Payment Mediation test results
- `/app/test_reports/iteration_9.json` - Venue Availability Calendar test results (100% pass rate)
- `/app/test_reports/iteration_10.json` - Control Room Dashboard test results (100% pass rate)
- `/app/test_reports/iteration_11.json` - Stage Validation Rules test results (100% pass rate)
- `/app/test_reports/iteration_12.json` - Payment-State Protection test results (92% pass rate)
- `/app/test_reports/iteration_13.json` - RM Venue Comparison Sheet test results (100% pass rate)
- `/app/test_reports/iteration_14.json` - Backend Refactor Phase 1 test results (100% pass rate)
- `/app/test_reports/iteration_15.json` - Backend Refactor Phase 2 test results (100% pass rate)
- `/app/test_reports/iteration_16.json` - Backend Refactor Phase 3 test results (100% pass rate)
- `/app/test_reports/iteration_17.json` - Leads Routes Migration test results (100% pass rate)
- `/app/test_reports/iteration_18.json` - FINAL Backend Refactor Complete (100% pass rate - 105 tests)
- `/app/test_reports/iteration_19.json` - RM Performance Analytics (100% pass rate - 18 backend + full frontend)
- `/app/test_reports/iteration_20.json` - RM Self-Service Dashboard (100% pass rate - 16 backend + full frontend)
- `/app/test_reports/iteration_21.json` - SEO Public Venues (100% pass rate - 21 backend + full frontend)
- `/app/test_reports/iteration_22.json` - SLA Push Notifications (100% pass rate - 14 backend + full frontend)
- `/app/test_reports/iteration_25.json` - Conversion Intelligence Layer (100% pass rate - 24 backend + full frontend)
- `/app/test_reports/iteration_26.json` - Lead Source & Attribution / Channel Performance (100% pass rate - 18 backend + full frontend)
- `/app/backend/tests/test_final_backend_refactor_regression.py` - Complete refactor regression tests
- `/app/backend/tests/test_comparison_sheets_regression.py` - Strangler Phase 3 tests
- `/app/backend/tests/test_rm_analytics.py` - RM Analytics regression tests
- `/app/backend/tests/test_conversion_intelligence.py` - Conversion Intelligence regression tests
- `/app/backend/tests/test_channel_performance.py` - Channel Performance regression tests
