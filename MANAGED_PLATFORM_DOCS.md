# BookMyVenue - Managed Concierge Platform

## Updated Database Schema (Phase 1-3)

### 1. Lead Model (Enhanced)
```javascript
{
  lead_id: string,                    // Primary key
  customer_name: string,
  customer_email: string,
  customer_phone: string,
  customer_id: string,                // FK to users (optional for logged-in customers)
  
  // Event Details
  event_type: string,
  event_date: string,
  guest_count: number,
  budget: number,
  preferences: string,                // Original customer preferences
  city: string,
  area: string,
  
  // Managed Platform Fields
  rm_id: string,                      // FK to users (RM assigned)
  rm_name: string,
  requirement_summary: string,        // RM's summary of requirements
  
  // Lead Pipeline (Enhanced 8-stage)
  stage: enum['new', 'contacted', 'requirement_understood', 'shortlisted', 
              'site_visit', 'negotiation', 'booking_confirmed', 'lost'],
  
  // Deal Tracking
  deal_value: number,                 // Total booking amount
  
  // Venue Commission
  venue_commission_type: enum['percentage', 'flat'],
  venue_commission_rate: number,      // % if percentage type
  venue_commission_flat: number,      // Amount if flat type
  venue_commission_calculated: number,// Auto-calculated
  venue_commission_status: enum['pending', 'invoiced', 'paid'],
  
  // Planner Commission
  planner_commission_type: enum['percentage', 'flat'],
  planner_commission_rate: number,
  planner_commission_flat: number,
  planner_commission_calculated: number,
  planner_commission_status: enum['pending', 'invoiced', 'paid'],
  
  // Contact Visibility Control
  contact_released: boolean,          // Auto-true at site_visit stage
  
  // Counters (denormalized for performance)
  shortlist_count: number,
  quote_count: number,
  planner_match_count: number,
  communication_count: number,
  
  // Timestamps
  created_at: datetime,
  updated_at: datetime,
  first_contacted_at: datetime,       // For response time tracking
  confirmed_at: datetime
}
```

### 2. Venue Shortlist Model (NEW)
```javascript
{
  shortlist_id: string,               // Primary key
  lead_id: string,                    // FK to leads
  venue_id: string,                   // FK to venues
  venue_name: string,                 // Denormalized
  notes: string,                      // RM notes
  proposed_price: number,             // Negotiated price
  status: enum['proposed', 'customer_approved', 'rejected'],
  added_by: string,                   // FK to users (RM)
  added_by_name: string,
  created_at: datetime
}
```

### 3. Quote Model (NEW)
```javascript
{
  quote_id: string,                   // Primary key
  lead_id: string,                    // FK to leads
  quote_type: enum['venue', 'planner'],
  entity_id: string,                  // venue_id or planner_id
  amount: number,
  description: string,
  valid_until: datetime,
  pdf_url: string,                    // Uploaded quote PDF
  items: array,                       // Line items
  status: enum['submitted', 'accepted', 'rejected', 'expired'],
  created_by: string,
  created_by_name: string,
  created_by_role: string,
  created_at: datetime
}
```

### 4. Planner Match Model (NEW)
```javascript
{
  match_id: string,                   // Primary key
  lead_id: string,                    // FK to leads
  planner_id: string,                 // FK to planners
  planner_name: string,
  notes: string,
  budget_segment: enum['budget', 'premium', 'luxury'],
  status: enum['suggested', 'customer_approved', 'assigned', 'rejected'],
  matched_by: string,                 // FK to users (RM)
  matched_by_name: string,
  created_at: datetime
}
```

### 5. Communication Log Model (NEW)
```javascript
{
  comm_id: string,                    // Primary key
  lead_id: string,                    // FK to leads
  channel: enum['call', 'email', 'whatsapp', 'in_person'],
  direction: enum['inbound', 'outbound'],
  summary: string,
  duration_minutes: number,
  attachments: array<string>,         // URLs
  logged_by: string,
  logged_by_name: string,
  created_at: datetime
}
```

### 6. Follow-up Model (Updated)
```javascript
{
  follow_up_id: string,               // Primary key
  lead_id: string,                    // FK to leads
  scheduled_at: datetime,
  description: string,
  follow_up_type: enum['call', 'email', 'meeting', 'site_visit'],
  status: enum['pending', 'completed', 'cancelled'],
  outcome: string,
  completed_at: datetime,
  added_by: string,
  added_by_name: string,
  created_at: datetime
}
```

### 7. Lead Notes Model (Updated)
```javascript
{
  note_id: string,                    // Primary key
  lead_id: string,                    // FK to leads
  content: string,
  note_type: enum['general', 'negotiation', 'requirement', 'internal'],
  added_by: string,
  added_by_name: string,
  created_at: datetime
}
```

### 8. Audit Log Model (NEW)
```javascript
{
  log_id: string,                     // Primary key
  entity_type: string,                // 'lead', 'venue', 'quote', etc.
  entity_id: string,
  action: string,                     // 'created', 'updated', 'stage_changed', etc.
  changes: object,                    // { field: { from, to } }
  performed_by: string,               // FK to users
  performed_by_name: string,
  performed_by_role: string,
  performed_at: datetime,
  ip_address: string
}
```

---

## Managed Concierge Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER JOURNEY (Website)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
           ┌───────────────────────────────────────────┐
           │         1. VENUE DISCOVERY                │
           │   • Browse venues with filters            │
           │   • View detailed venue pages             │
           │   • Submit enquiry (NOT direct contact)   │
           └───────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MANAGED RELATIONSHIP LAYER (RM)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   2. NEW LEAD   │ ──▶ │  3. CONTACTED   │ ──▶ │ 4. REQUIREMENT  │
│                 │     │                 │     │   UNDERSTOOD    │
│ Auto-assigned   │     │ RM reaches out  │     │                 │
│ to RM (round-   │     │ Logs call/email │     │ RM documents    │
│ robin)          │     │                 │     │ requirements    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
    ┌───────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  5. SHORTLISTED │ ──▶ │  6. SITE VISIT  │ ──▶ │  7. NEGOTIATION │
│                 │     │                 │     │                 │
│ RM adds venues  │     │ Contact         │     │ RM negotiates   │
│ to shortlist    │     │ RELEASED ✓      │     │ with venue      │
│ Shares with     │     │                 │     │ Logs notes      │
│ customer        │     │ Schedule visits │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
    ┌───────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      8. BOOKING CONFIRMED                                  │
│                                                                             │
│  VALIDATION RULES:                                                          │
│  ✓ Deal value must be set                                                  │
│  ✓ At least one commission (venue OR planner) must be configured           │
│                                                                             │
│  Deal Value: ₹X,XX,XXX                                                     │
│  Venue Commission: Y% = ₹XX,XXX                                            │
│  Planner Commission: Z% = ₹XX,XXX                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVENT MANAGEMENT LAYER (Optional)                       │
│                                                                             │
│   "Need Event Planning & Decor?"                                           │
│   • RM matches planner to customer                                          │
│   • Planner assigned (budget/premium/luxury)                               │
│   • Planner commission tracked                                              │
└─────────────────────────────────────────────────────────────────────────────┘

---

## Commission Flow

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│                  │    │                  │    │                  │
│  DEAL_VALUE      │───▶│  COMMISSION      │───▶│  CALCULATED      │
│  ₹5,00,000       │    │  TYPE: Percentage│    │  ₹50,000         │
│                  │    │  RATE: 10%       │    │  (auto)          │
│                  │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │ STATUS TRACKING  │
                        │                  │
                        │ • Pending        │
                        │ • Invoiced       │
                        │ • Paid           │
                        └──────────────────┘
```

---

## Key API Endpoints (New/Updated)

### Lead Management
- `POST /api/leads` - Create lead (auto-assigns RM)
- `GET /api/leads/{lead_id}` - Get full lead with shortlist, quotes, comms, timeline
- `PUT /api/leads/{lead_id}` - Update lead (with validation for booking_confirmed)
- `PUT /api/leads/{lead_id}/reassign` - Reassign to different RM (admin only)

### Venue Shortlist
- `POST /api/leads/{lead_id}/shortlist` - Add venue to shortlist
- `GET /api/leads/{lead_id}/shortlist` - Get shortlist
- `DELETE /api/leads/{lead_id}/shortlist/{id}` - Remove from shortlist

### Quotes
- `POST /api/leads/{lead_id}/quotes` - Create quote
- `GET /api/leads/{lead_id}/quotes` - Get all quotes
- `PUT /api/leads/{lead_id}/quotes/{id}` - Update quote status

### Communication Log
- `POST /api/leads/{lead_id}/communications` - Log communication
- `GET /api/leads/{lead_id}/communications` - Get all logs

### Follow-ups
- `POST /api/leads/{lead_id}/follow-ups` - Schedule follow-up
- `PUT /api/leads/{lead_id}/follow-ups/{id}` - Update status
- `GET /api/leads/{lead_id}/follow-ups` - Get all follow-ups

### Notes
- `POST /api/leads/{lead_id}/notes` - Add note (with type)
- `GET /api/leads/{lead_id}/notes` - Get all notes

### Planner Matching
- `POST /api/leads/{lead_id}/planner-matches` - Match planner
- `GET /api/leads/{lead_id}/planner-matches` - Get matches

### Activity Timeline
- `GET /api/leads/{lead_id}/activity` - Get audit log timeline

### Admin Analytics
- `GET /api/admin/stats` - Enhanced stats with commission totals
- `GET /api/admin/rm-performance` - RM metrics (conversion rate, avg deal, response time)
- `GET /api/admin/commission-report` - Commission tracking report

---

## RM Lead Detail Page Features

1. **Header Banner**: "Managed by BookMyVenue Experts" with current stage badge
2. **Contact Protection Badge**: Shows if customer contact is released to venue
3. **Customer Information Card**
4. **Event Requirements Card** with editable Requirement Summary
5. **Tabs**:
   - Venue Shortlist (add/remove venues, track proposed prices)
   - Quotes (create structured quotes)
   - Planners (match event planners)
   - Communication Log (log calls, emails, meetings)
   - Notes (general, negotiation, requirement, internal)
   - Follow-ups (schedule and track)
   - Activity Timeline (full audit log)
6. **Sidebar**:
   - Lead Stage dropdown with validation checklist
   - Deal & Commission section (venue + planner)
   - Quick Actions (call, email)
   - Timeline (created, first contacted, confirmed dates)
