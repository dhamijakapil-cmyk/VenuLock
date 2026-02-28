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

## Next Tasks
1. **P0**: Refactor Backend Monolith - Break down server.py into /models, /routes, /services structure
2. **P1**: RM Venue Comparison Sheet - Generate comparison sheet for clients
3. **P2**: Admin Dashboard Analytics - RM performance metrics (conversion rate, avg. deal size)
4. **P2**: SEO-friendly URLs - Clean URLs for venue and city pages
5. **P2**: Planner Suggestions - Allow RMs to attach planners to client cases

## Future Tasks
- Full Razorpay production integration (pending API keys)
- Escrow logic and automated payouts
- Refund automation
- GST invoice generation
- AI features (chatbot, recommendations)
- SMS/WhatsApp notifications (Twilio)
- Mobile PWA optimization

## Documentation
- `/app/MANAGED_PLATFORM_DOCS.md` - Full schema and workflow documentation
- `/app/test_reports/iteration_7.json` - Payment Mediation test results
- `/app/test_reports/iteration_9.json` - Venue Availability Calendar test results (100% pass rate)
- `/app/test_reports/iteration_10.json` - Control Room Dashboard test results (100% pass rate)
- `/app/backend/tests/test_venue_availability_calendar.py` - Availability test suite
- `/app/backend/tests/test_control_room.py` - Control Room test suite
