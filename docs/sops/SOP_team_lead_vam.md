# SOP: Team Lead / VAM

**Role:** `vam`  
**Portal:** teams.venuloq.com → Review Queue  
**Daily load:** Medium — quality gate for all venue captures

---

## Responsibilities

1. Review all submitted venue captures for quality and completeness
2. Route quality captures to Data Team for refinement
3. Send back low-quality captures to Specialist with specific feedback
4. Reject captures that don't meet platform standards
5. Monitor submission volume and turnaround times

---

## Daily Workflow

### Review Queue (`/team/vam/dashboard`)
1. Check the Review Queue for new submissions
2. For each capture in `submitted_for_review`:

### Review Checklist
- ✅ Are all mandatory fields filled and accurate?
- ✅ Is the venue name properly formatted (not ALL-CAPS)?
- ✅ Is the city/locality correct?
- ✅ Is capacity realistic?
- ✅ Are there photos (ideally 3+)?
- ✅ Are specialist notes useful?
- ✅ Is owner interest/meeting outcome recorded?

### Decision Matrix

| Quality | Photos | Commercial Data | Action |
|---------|--------|-----------------|--------|
| Good | 3+ | Complete | Route to Data Team |
| Good | <3 | Complete | Route to Data Team (they can flag media) |
| Acceptable | Any | Partial | Route to Data Team with notes |
| Poor | Any | Any | Send back to Specialist |
| Not suitable | Any | Any | Reject with reason |

---

## Allowed Actions

| Current Status | Allowed Transitions | Reason Required? |
|----------------|---------------------|-----------------|
| `submitted_for_review` | `under_data_refinement` | No (but notes recommended) |
| `submitted_for_review` | `sent_back_to_specialist` | **Yes** |
| `submitted_for_review` | `rejected` | **Yes** |

---

## Send-Back Rules

When sending back a capture:
1. **Always provide a specific reason** — "incomplete" is not enough
2. Good example: "Owner phone missing. Locality is too vague — need specific area name. Photos are blurry."
3. Bad example: "Fix it"
4. The specialist sees your reason and must address it before resubmitting

---

## Rejection Rules

Reject a capture only when:
- The venue is clearly not suitable for the platform (e.g., under construction, wrong category)
- Duplicate of an existing venue
- Owner has explicitly declined listing
- Always provide a clear reason that explains why it's permanently rejected
