# SOP: Admin

**Role:** `admin`  
**Portal:** teams.venuloq.com → Full Access  
**Daily load:** Variable — platform operations, overrides, user management

---

## Responsibilities

1. Platform-wide operations monitoring
2. User account management (create, update, role assignment)
3. Override capabilities for all pipelines
4. System-level data fixes and corrections
5. Venue and lead management
6. Payment and analytics oversight
7. City and configuration management

---

## Admin Privileges

Admin role bypasses all role-gate restrictions:
- Can perform ANY status transition in ANY pipeline
- Can access ALL dashboards and detail pages
- Can create/edit/delete ANY record
- This power should be used judiciously

---

## Daily Workflow

### Operations Dashboard (`/team/admin/dashboard`)
1. Review platform health metrics
2. Check for SLA violations
3. Monitor team performance

### Control Room (`/team/admin/control-room`)
1. Real-time pipeline status across all teams
2. Identify bottlenecks (stages with long dwell times)
3. Flag stuck cases for team intervention

### User Management (`/team/admin/users`)
1. Create new team member accounts
2. Assign roles (rm, venue_specialist, vam, data_team, venue_manager, finance, hr, etc.)
3. Deactivate departing team members

### Venue Management (`/team/admin/venues`)
1. View all venues regardless of status
2. Override publish decisions if needed
3. Manage venue visibility

### Lead Management (`/team/admin/leads`)
1. View all customer cases across all RMs
2. Reassign cases between RMs
3. Fix data issues on leads

---

## Override Rules

| Scenario | Action | When Appropriate |
|----------|--------|-----------------|
| Stuck venue capture | Force status transition | Team member unavailable, SLA at risk |
| Bad data on lead | Direct field edit | Data correction needed urgently |
| Disputed settlement | Override settlement status | Management decision to unblock |
| Missing user account | Create account with role | New team member onboarding |
| Venue needs emergency unpublish | Direct unpublish | Safety or legal concern |

---

## Escalation Handling

| Escalation Source | Admin Action |
|-------------------|-------------|
| RM reports stuck venue | Check acquisition status, force transition if needed |
| Customer complaint about venue | Review venue data, may hide/unpublish |
| Finance reports payment discrepancy | Review settlement, may override status |
| Team Lead reports specialist quality issues | Review submissions, may deactivate account |

---

## Do NOT

- Override statuses without documenting the reason
- Delete data without backup consideration
- Create test data in production
- Share admin credentials with non-admin team members
