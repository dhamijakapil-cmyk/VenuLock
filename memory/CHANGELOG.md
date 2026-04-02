# VenuLoQ — Changelog

## April 2026

### Phase 8: Supply Activation + Publish Governance (April 2, 2026)
- **New**: `backend/routes/publish.py` — 13 endpoints for full publish governance
- **New**: `frontend/src/pages/field/PublishQueue.js` — Queue view with 5 tabs (Ready/Live/Hidden/Unpublished/Archived)
- **New**: `frontend/src/pages/field/PublishDetail.js` — Detail view with 5 panels (Readiness/Preview/Versions/Actions/Audit)
- **Updated**: `backend/routes/acquisitions.py` — Added publish statuses, transition rules, last_approved_version snapshot on approval
- **Updated**: `backend/server.py` — Registered publish router
- **Updated**: `frontend/src/TeamApp.js` — Added /team/field/publish routes
- **Updated**: `frontend/src/pages/field/ManagerQueue.js` — Added "Publish Governance" quick-access link
- **Updated**: `frontend/src/index.css` — Added slide-up animation for modals
- **Testing**: 39/39 backend tests passed, 100% frontend verified (iteration_143)

### Phase 7: Real Communication + RM Execution Continuity (April 2, 2026)
- 7A: Resend email delivery + WhatsApp deep-link for Owner Onboarding
- 7B: RM Shortlist/Share workflow (tokenized public links, customer feedback)
- 7C: RM Follow-up continuity alerts (bell icon, priority-grouped)
- Testing: 27/27 backend PASS, 100% frontend PASS (iteration_142)

### Architecture Hardening (April 2026)
- Domain separation: venuloq.com (public) vs teams.venuloq.com (internal)
- robots.txt, TeamPortalGate, noindex injection

### Phase 6: RM Mobile Dashboard + Action Workflow (April 2026)
- Action-first dashboard with urgency strips, quick-action modals
- Meeting outcomes, time extensions, blocker escalation, resolve flows
- Testing: iteration_141

### Phase 5: Owner Onboarding (April 2026)
- Tokenized public onboarding form, internal monitor UI
- Status pipeline: pending → sent → viewed → completed/declined/expired
- Testing: iteration_140
