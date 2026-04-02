# VenuLoQ - Premium Venue Booking Marketplace

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion
- **Backend**: FastAPI, MongoDB (Motor async)
- **Integrations**: Resend, Custom Google OAuth, Apple Sign In, Razorpay (test mode), VAPID Push
- **Native**: Capacitor v7 (iOS wrapper)

## Architecture
- Customer App + Team Portal — hostname-based routing
- PWA (web) + iOS App (Capacitor)
- Domain: delhi.venuloq.com (customer), teams.venuloq.com (internal)
- Single monorepo: all internal workflows live in the same codebase

## Current Status: Phases 1–13 Complete + Stabilization Pass Complete

### Phase 10: Commercial Conversion — COMPLETE
- 12-stage pipeline, booking readiness gate (6 checks)
- Testing: 37/38 backend (iteration_145)

### Phase 11: Booking Commitment + Execution Handoff — COMPLETE
- Handoff package, locked commercial snapshot, execution assignment
- Testing: 38/38 backend (iteration_146)

### Phase 12: Event Execution Coordination + Closure — COMPLETE
- 9-status execution model, incident management, closure readiness gate
- Testing: 45/45 backend (iteration_147)

### Phase 13: Financial Closure + Settlement Governance — COMPLETE
- 8-status settlement model, collection verification, payable commitments, financial closure gate
- Testing: 23/23 backend (iteration_148)

### Team Portal Navigation Consolidation — COMPLETE
- Wired settlement backend, surfaced Conversion/Execution/Settlement in sidebar, TeamWelcome, RMDashboard

### Stabilization + UAT + SOP Pass — COMPLETE (April 2026)

**Journey Tests (E2E):**
| Test | Pipeline | Tests | Pass Rate |
|------|----------|-------|-----------|
| #1 | Venue Acquisition → Publish | 29/29 | 100% |
| #2 | RM Conversion | 37/37 | 100% |
| #3 | Execution | 49/49 | 100% |
| #4 | Closure → Settlement | 40/40 | 100% |
| **Total** | **All** | **155/155** | **100%** |

**Role UAT:** 5/5 roles tested and passing (RM, Specialist, Venue Manager, VAM, Admin)
- P2 fixes applied: Added sidebar nav for venue_manager and data_team roles

**SOP Documents Created:**
- `/app/docs/sops/SOP_INDEX.md`
- `/app/docs/sops/STATUS_GLOSSARY.md`
- `/app/docs/sops/HANDOFF_RULES.md`
- 7 role-based SOPs (RM, Specialist, VAM, Data Team, Venue Manager, Finance, Admin)

**Production Readiness:**
- `/app/docs/PRODUCTION_READINESS.md`
- Google Auth redirect URI documented (user must add in GCP Console)
- iOS QA checklist documented
- Env audit completed (all vars set, no hardcoded values)

### All QA Results
| Iteration | Phase | Backend | Frontend |
|-----------|-------|---------|----------|
| 145 | Phase 10: Conversion | 37/38 | 100% |
| 146 | Phase 11: Handoff | 38/38 | 100% |
| 147 | Phase 12: Execution + Closure | 45/45 | 100% |
| 148 | Phase 13: Settlement + Navigation | 23/23 | 100% |
| 149 | Journey: Venue Acquisition → Publish | 29/29 | N/A |
| 150 | Journey: RM Conversion | 37/37 | N/A |
| 151 | Journey: Execution | 49/49 | N/A |
| 152 | Journey: Closure → Settlement | 40/40 | N/A |
| 153 | Role UAT (5 roles) | N/A | 100% |

### Key Routes
```
/team/rm/conversion           -> ConversionCases
/team/rm/conversion/:leadId   -> ConversionCaseDetail
/team/rm/execution            -> ExecutionDashboard
/team/rm/execution/:leadId    -> ExecutionDetail
/team/rm/settlement           -> SettlementDashboard
/team/rm/settlement/:leadId   -> SettlementDetail
```

### Pending External Dependencies
- [ ] Google redirect URIs in GCP Console
- [ ] APPLE_CLIENT_ID/TEAM_ID/KEY_ID/PRIVATE_KEY
- [ ] REACT_APP_SUPPORT_PHONE (real number)
- [ ] Production domain DNS
- [ ] Xcode native QA on device
- [ ] data_team and finance user accounts
- [ ] Razorpay production keys

## Test Credentials
- Admin: admin@venulock.in / admin123
- RM: rm1@venulock.in / rm123
- Specialist: specialist@venuloq.in / test123
- Team Lead: teamlead@venuloq.in / test123
- Venue Manager: venuemanager@venuloq.in / test123
- Customer: democustomer@venulock.in / password123

## Do NOT Start
- Facebook Login, Vendor payouts, SEO, Production Razorpay
