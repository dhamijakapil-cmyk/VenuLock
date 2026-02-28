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
- **COMPLETE**: All filter dropdowns working on VenueSearchPage, AdminUsers, AdminVenues, AdminLeads, RMDashboard

## Next Tasks
1. Add Resend API key for email notifications
2. Implement map view toggle on venue search page (Leaflet)
3. Add RM Venue Comparison Sheet feature
4. Add availability calendar UI for venue owners
5. Implement planner suggestions for leads
6. SEO-friendly URLs for venues and cities
7. Customer review submission
8. Performance optimization

## Logo Configuration
- Logo component at: `/app/frontend/src/components/Logo.js`
- To replace logo: add image file at `/app/frontend/public/assets/logo.png`
- Fallback: Text-based "BookMyVenue" logo with gold location pin icon
- Size variants: header (30px), sidebar (38px), large (48px)
