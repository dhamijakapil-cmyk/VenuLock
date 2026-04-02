# SOP: Data Team

**Role:** `data_team`  
**Portal:** teams.venuloq.com → Refinement Queue  
**Daily load:** Medium — data enrichment and quality assurance

---

## Responsibilities

1. Refine and enrich venue data received from Team Lead review
2. Run Ven-Us Assist quality checks on every capture
3. Fix data quality issues (naming, pricing, capacity inconsistencies)
4. Apply field-level corrections with audit trail
5. Route refined captures to Venue Manager for approval
6. Send back to Specialist if fundamental data is missing

---

## Daily Workflow

### Refinement Queue (`/team/field/refine`)
1. Check queue for captures in `under_data_refinement` status
2. For each capture:

### Step 1: Run Ven-Us Assist
- Navigate to the capture detail
- Run Ven-Us Assist quality check
- Review: **Blockers**, **Issues**, **Suggestions**

### Step 2: Address Quality Issues

| Ven-Us Assist Finding | Action |
|----------------------|--------|
| **Blocker** (missing required field) | Fix if possible, or send back to Specialist |
| **High severity issue** (capacity mismatch, pricing error) | Fix the data |
| **Medium severity issue** (missing pricing, no owner interest) | Fix or note for Manager |
| **Low severity issue** (no amenity tags, thin notes) | Fix if easy, otherwise accept |
| **Suggestion** (naming format, city normalization) | Apply the suggested value |

### Step 3: Refine Fields
- Correct venue names (proper casing, full names)
- Normalize city names (system suggests: gurgaon → Gurugram)
- Fix capacity if min > max
- Fix pricing if min > max
- Add publishable summary if missing
- Review and improve specialist notes

### Step 4: Route Forward

| Readiness After Refinement | Action |
|---------------------------|--------|
| `ready` (0 blockers, 0 high issues) | Route to Manager (`awaiting_manager_approval`) |
| `almost_ready` (0 blockers, some medium issues) | Route to Manager with notes |
| `needs_fixes` (high issues remain) | Route to Manager with caveats |
| `not_ready` (blockers remain) | Send back to Specialist |

---

## Allowed Actions

| Current Status | Allowed Transitions | Reason Required? |
|----------------|---------------------|-----------------|
| `under_data_refinement` | `awaiting_manager_approval` | No |
| `under_data_refinement` | `sent_back_to_specialist` | Implicit (Specialist sees it was sent back from refinement) |

---

## Audit Trail

Every field change you make is automatically logged:
- Field name
- Old value → New value
- Your user ID and name
- Timestamp

This audit trail is visible to the Venue Manager at approval time.

---

## Quality Tips
- Always run Ven-Us Assist before routing to Manager
- Apply all naming/city normalizations suggested by the system
- If pricing seems suspicious (₹50/plate), flag it rather than guess
- Document any assumptions you made in the notes
