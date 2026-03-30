# Agent Router — chinese-checkers

## Agent Team

| Agent | Model | Domain | File Scope |
|---|---|---|---|
| Project Manager | Opus | Planning, task breakdown, coordination | All files (read-only for planning) |
| Frontend Engineer | Sonnet | React UI, components, hooks, state | `app/src/` |
| Backend Engineer | Sonnet | Firebase Functions, business logic | `functions/src/` |
| Database Engineer | Opus | Firestore schema, rules, indexes | `firestore.rules`, `firestore.indexes.json`, `functions/src/` (data layer) |
| DevOps | Sonnet | Firebase config, emulators, hosting | `firebase.json`, `.firebaserc`, `app/.env.example` |
| CI/CD Engineer | Sonnet | GitHub Actions workflows | `.github/workflows/` |
| Code Reviewer | Opus | Full codebase review | All files (read-only) |

## When to Use Each Agent

- **Project Manager** — Starting a new feature, breaking down a task, coordinating multi-domain work
- **Frontend Engineer** — Building UI components, pages, hooks, React Query integration, Jotai state
- **Backend Engineer** — Creating Firebase Functions (onCall), input validation, auth checks, business logic
- **Database Engineer** — Firestore schema design, security rules, indexes, data modeling
- **DevOps** — Firebase project config, emulator setup, hosting config, environment variables
- **CI/CD Engineer** — GitHub Actions workflows for CI (type check, lint) and CD (deploy)
- **Code Reviewer** — End-of-feature review, catching rule violations, quality checks

## File Ownership

| Path | Owner |
|---|---|
| `app/src/components/` | Frontend Engineer |
| `app/src/pages/` | Frontend Engineer |
| `app/src/hooks/` | Frontend Engineer |
| `app/src/store/` | Frontend Engineer |
| `app/src/lib/` | Frontend Engineer |
| `app/src/index.css` | Frontend Engineer |
| `app/src/main.tsx` | Frontend Engineer |
| `app/src/App.tsx` | Frontend Engineer |
| `functions/src/` | Backend Engineer |
| `firestore.rules` | Database Engineer |
| `firestore.indexes.json` | Database Engineer |
| `firebase.json` | DevOps |
| `.firebaserc` | DevOps |
| `.github/workflows/` | CI/CD Engineer |
| `CLAUDE.md` | Project Manager |

## Escalation Paths

- Frontend Engineer blocked on API → escalate to Backend Engineer
- Backend Engineer blocked on schema → escalate to Database Engineer
- Database Engineer proposing destructive change → must get user approval (never auto-approve)
- CI/CD Engineer needs app code changes → escalate to relevant domain agent
- Any agent unsure about scope → escalate to Project Manager
- Code Reviewer finds hard-block issues → route fix to the appropriate domain agent
