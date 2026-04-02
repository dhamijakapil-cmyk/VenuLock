# SOP: Venue Manager

**Role:** `venue_manager`  
**Portal:** teams.venuloq.com → Approval Queue / Publish Queue / Onboarding  
**Daily load:** Medium — approval authority, publish gate, onboarding

---

## Responsibilities

1. Review and approve/reject venue captures from Data Team
2. Initiate owner onboarding (email + WhatsApp)
3. Monitor onboarding status (sent → viewed → accepted/declined/expired)
4. Manage the publish readiness gate (7 checks)
5. Publish, hide, or unpublish venues
6. Manage venue visibility and lifecycle

---

## Daily Workflow

### Approval Queue (`/team/field/approve`)
1. Review captures in `awaiting_manager_approval`
2. For each capture:

### Approval Decision Matrix

| Ven-Us Posture | Data Quality | Photos | Action |
|---------------|-------------|--------|--------|
| `ready` | Good | 3+ | **Approve** |
| `almost_ready` | Acceptable | 3+ | **Approve** (system allows) |
| `almost_ready` | Acceptable | <3 | Approve with override, or send back |
| `needs_fixes` | Issues present | Any | Send back to Data Team |
| `not_ready` | Blockers | Any | **Cannot approve** (system blocks) |

**Important:** System runs Ven-Us Assist at approval time. If hard blockers exist, approval is **blocked automatically**.

### Allowed Transitions from `awaiting_manager_approval`

| Action | Target Status | Reason Required? |
|--------|--------------|-----------------|
| Approve | `approved` | No |
| Send to Data Team | `under_data_refinement` | **Yes** |
| Send to Specialist | `sent_back_to_specialist` | **Yes** |
| Reject | `rejected` | **Yes** |

---

### Owner Onboarding (`/team/field/onboarding`)

After approving a venue:
1. Move to `owner_onboarding_pending`
2. Click "Send Onboarding" with channels: email and/or WhatsApp
3. System generates secure token link (valid 7 days)
4. Email delivered via Resend; WhatsApp opens deep link

### Monitor Onboarding Status

| Status | Meaning | Action |
|--------|---------|--------|
| `owner_onboarding_sent` | Invite delivered | Wait for owner response |
| `owner_onboarding_viewed` | Owner opened the link | Follow up if no action after 2 days |
| `owner_onboarding_completed` | Owner accepted terms | Move to publish flow |
| `owner_onboarding_declined` | Owner declined | Contact owner to understand; may close case |
| `owner_onboarding_expired` | 7 days passed | Resend or follow up directly |

---

### Publish Queue (`/team/field/publish`)

After onboarding acceptance:
1. Mark as `publish_ready`
2. System checks 7 publish readiness requirements:
   - ✅ Owner onboarding completed
   - ✅ Identity fields present (name, city, locality, type, capacity)
   - ✅ Media minimum met (3+ photos, or manager override)
   - ✅ Pricing posture defined
   - ✅ Publishable summary written
   - ✅ No risk flags
   - ✅ Venue status is active
3. If all pass → Click "Publish"
4. Venue goes live on customer-facing site

### Post-Publish Management

| Action | When | Effect |
|--------|------|--------|
| Hide from Public | Temporary issue (renovation, seasonal) | Venue hidden but preserved |
| Unpublish | Venue needs significant changes | Removed from search |
| Re-publish | Issue resolved | Venue visible again |
| Archive | Permanently remove | Admin only |
