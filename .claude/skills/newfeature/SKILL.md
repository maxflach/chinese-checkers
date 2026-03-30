---
name: newfeature
description: Build a new feature end-to-end. Asks what to build, loads project context, routes to the Project Manager (Opus) for planning, validates with user, creates a feature branch from develop, orchestrates specialist agents, and runs a code review when done.
argument-hint: "[optional: brief feature description]"
---

# New Feature Skill

Guides the development of a new feature from idea to committed code. The Project Manager (Opus) creates the plan; specialist agents (Frontend, Backend, DB, DevOps) execute it in dependency order; the Code Reviewer validates at the end.

Execution mode: **pause at each phase boundary** — user must approve before moving to the next phase.

---

## Phase 1: Feature Description

Use `AskUserQuestion` with three questions:

**Question 1:**
- Header: "Feature"
- Question: "What feature do you want to build?"
- Options: *(user types via Other)*

**Question 2:**
- Header: "Priority"
- Question: "What is the priority of this feature?"
- Options: "Urgent" / "High" / "Normal" / "Low"

**Question 3:**
- Header: "DB changes"
- Question: "Does this feature require database schema changes?"
- Options: "Yes" / "No" / "Unsure"

Store: `FEATURE_DESC`, `PRIORITY`, `DB_CHANGES`.

---

## Phase 2: Load Project Context

Read the following files to understand the project:

1. `CLAUDE.md` — project conventions, stack, rules
2. `.claude/agents/ROUTER.md` — agent team overview and file ownership
3. `.claude/agents/project-manager.md` — PM's role and escalation rules
4. `.claude/agents/frontend-engineer.md` — frontend patterns and rules
5. `.claude/agents/backend-engineer.md` — backend patterns and rules
6. `.claude/agents/database-engineer.md` — DB patterns (if `DB_CHANGES` is Yes or Unsure)
7. `.claude/agents/devops.md` — deployment config (if relevant)

---

## Phase 3: PM Creates Plan

Invoke the **Project Manager agent** (`project-manager.md`) with the following prompt:

> You are the Project Manager for this project. A new feature has been requested:
>
> **Feature:** `<FEATURE_DESC>`
> **Priority:** `<PRIORITY>`
> **DB schema changes needed:** `<DB_CHANGES>`
>
> Please produce a detailed implementation plan with:
> 1. Feature summary (2–3 sentences)
> 2. Files and areas affected (grouped by domain)
> 3. Task breakdown by domain (frontend / backend / DB / DevOps) in dependency order
> 4. Risks and dependencies
> 5. Suggested git branch name: `feature/<slug>` (slug is 2–4 kebab-case words)
>
> Do NOT write any code. Only plan.

Present the PM's plan clearly in a structured format.

**Pause** — "Here is the Project Manager's plan. Does this look right?"

Use `AskUserQuestion`:
- Header: "Plan review"
- Question: "Does this plan look right?"
- Options:
  - "Yes, proceed" — "Continue to branch creation and execution"
  - "Adjust scope" — "Go back to PM with feedback"
  - "Cancel" — "Abort the feature"

If "Adjust scope": ask the user for their feedback, send it back to the PM for a revised plan, then present again.
If "Cancel": print "Feature cancelled." and stop.

Store the `BRANCH_NAME` from the PM's plan (e.g., `feature/add-auth`).

---

## Phase 4: Create Git Branch

Run:
```bash
git checkout develop
git pull origin develop
git checkout -b <BRANCH_NAME>
```

Confirm: "Branch `<BRANCH_NAME>` created from `develop`."

---

## Phase 5: DB Phase (if needed)

**Only run this phase if `DB_CHANGES` is "Yes" or "Unsure".**

Invoke the **Database Engineer agent** with the relevant task from the PM's plan.

The Database Engineer **must**:
1. **Plan first** — describe exactly what schema changes are needed and why, without touching any files yet
2. **Show the diff** — present the proposed migration SQL / Prisma schema change / Firestore rules change to the user
3. **Ask for approval** — use `AskUserQuestion` before applying anything:
   - Header: "DB change"
   - Question: "Apply this database change?"
   - Options: "Yes, apply" / "No, adjust first" / "Cancel"
4. For **destructive changes** (dropping columns, renaming fields, changing types, removing indexes): add a second confirmation question explicitly labeling it as irreversible
5. Only after approval: apply the change, run the migration, and commit:
   `git add . && git commit -m "feat(db): <description>"`

**Pause** — "Database phase complete. Review the DB changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to backend" / "Redo DB phase" / "Cancel feature"

---

## Phase 6: Backend Phase

Invoke the **Backend Engineer agent** with the relevant task from the PM's plan.

The Backend Engineer should:
- Implement API endpoints / Firebase Functions as specified
- Validate inputs with Zod
- Check authorization on every endpoint
- Commit with: `git add . && git commit -m "feat(backend): <description>"`

**Pause** — "Backend phase complete. Review the backend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to frontend" / "Redo backend phase" / "Cancel feature"

---

## Phase 7: Frontend Phase

Invoke the **Frontend Engineer agent** with the relevant task from the PM's plan.

The Frontend Engineer must follow all rules from `CLAUDE.md` without exception:
- React Query for all data fetching — **no useEffect for data**
- Components accept IDs as props, not full objects
- No prop drilling beyond 1 level
- Small components (~150 lines max, single responsibility)
- Jotai atoms for any UI state (modal open/close, filters, active tab)

Commit with: `git add . && git commit -m "feat(frontend): <description>"`

**Pause** — "Frontend phase complete. Review the frontend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to review" / "Redo frontend phase" / "Cancel feature"

---

## Phase 8: DevOps Phase (if needed)

**Only run this phase if the PM's plan includes deployment config changes.**

Invoke the **DevOps agent** with the relevant task.

Commit with: `git add . && git commit -m "chore(devops): <description>"`

**Pause** — "DevOps phase complete."

Use `AskUserQuestion`:
- Options: "Looks good, continue to review" / "Redo DevOps phase" / "Cancel feature"

---

## Phase 9: Code Review

Invoke the **Code Reviewer agent** with the following prompt:

> Review all changes made on branch `<BRANCH_NAME>` for the feature: `<FEATURE_DESC>`.
>
> Run `git diff develop...<BRANCH_NAME>` to see all changes.
>
> **Hard block issues (must fix before this feature can merge):**
> - Any `useEffect` used for data fetching (must use React Query instead)
> - Props drilled more than 1 level deep (must use hooks or atoms)
> - Full objects passed as props instead of IDs
> - Hardcoded secrets, credentials, or API keys
> - Missing input validation on backend endpoints
> - Missing authorization checks on backend endpoints
> - Unbounded Firestore queries
>
> **Format your review as:**
> 1. Overall assessment (APPROVED / CHANGES REQUESTED)
> 2. Hard block issues (if any) — must be fixed
> 3. Warnings — should be fixed
> 4. Notes — optional improvements
>
> If CHANGES REQUESTED: list exactly what needs to change and which agent should fix it.

If the reviewer requests changes:
- Route the fix to the appropriate specialist agent
- After fixes are committed, run the Code Reviewer again
- Repeat until APPROVED

**Pause** — "Code review complete."

Use `AskUserQuestion`:
- Options: "Merge to develop" / "Keep working on the branch"

---

## Phase 10: Summary

Print a summary:

```
Feature complete: <FEATURE_DESC>

Branch: <BRANCH_NAME>
Commits:
  [list commits made during this session with git log --oneline develop..<BRANCH_NAME>]

Next steps:
  1. Review the diff: git diff develop...<BRANCH_NAME>
  2. Merge when ready: git checkout develop && git merge --no-ff <BRANCH_NAME>
  3. Push: git push origin develop
  4. Delete branch: git branch -d <BRANCH_NAME>
```

Run `push-status done "<project>" "Feature <FEATURE_DESC> complete on <BRANCH_NAME>"` to notify the agent dashboard.
