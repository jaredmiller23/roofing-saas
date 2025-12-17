# Roofing SaaS - CRM for Roofing Contractors

**What**: CRM built specifically for roofing companies
**First Customer**: Appalachian Storm Restoration (Fahredin's company)
**Template For**: Future trades SaaS products

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict, no `any`) |
| UI | React 19 + Shadcn + Tailwind v4 |
| Database | Supabase (Postgres + Auth) |
| Forms | React Hook Form + Zod |
| State | React Context + Server Components |

---

## Commands

```bash
npm run dev           # Dev server (turbopack)
npm run build         # Production build
npm run lint          # ESLint (must pass with ≤5 warnings)
npm run typecheck     # TypeScript check
npm run test:e2e      # Playwright tests
```

---

## Project Structure

```
app/                    # Next.js App Router
  (dashboard)/          # Authenticated routes
  api/                  # API routes
components/
  ui/                   # Shadcn components (verify before importing)
  [feature]/            # Feature components
lib/
  types/                # TypeScript interfaces
  validations/          # Zod schemas
  utils.ts              # Utilities
docs/                   # Architecture, PRDs, planning
```

---

## Critical Lint Rules

These are **enforced** and fail builds:

### 1. Theme Tokens Only (no-hardcoded-colors)

```tsx
// BAD - Will fail
<div className="bg-white text-gray-900">

// GOOD - Use tokens
<div className="bg-background text-foreground">
```

| Instead of | Use |
|------------|-----|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50/100` | `bg-muted` |
| `bg-blue-600` | `bg-primary` |
| `text-gray-900` | `text-foreground` |
| `text-gray-500/600` | `text-muted-foreground` |
| `border-gray-*` | `border-border` |

### 2. No `any` Type

```tsx
// BAD
const data: any = fetchData()

// GOOD
const data: ProjectTemplate = fetchData()
```

### 3. No Unused Imports

Only import what you use. Prefix unused with `_`.

### 4. React Hooks Dependencies

```tsx
// BAD - Infinite re-renders
useEffect(() => { ... }, [context])  // ❌ Object ref

// GOOD - Specific values
useEffect(() => { ... }, [context.value])  // ✅
```

### 5. Escape JSX Entities

```tsx
// BAD
<p>Don't use "quotes"</p>

// GOOD
<p>Don&apos;t use &ldquo;quotes&rdquo;</p>
```

---

## Before Committing

```bash
npm run lint          # 0 warnings
npm run typecheck     # Must pass
npm run build         # Must succeed
```

---

## Source of Truth

**This project follows the global source of truth hierarchy (see `~/.claude/CLAUDE.md`):**

1. **Git** = Ground truth (commits prove work happened)
2. **Archon** = Record of truth (must match Git)
3. **VEST** = Execution layer (must match Archon & Git)

### Archon Project

| Field | Value |
|-------|-------|
| Project ID | `42f928ef-ac24-4eed-b539-61799e3dc325` |
| API | `http://localhost:8181/api/` |
| Health Check | `curl -s http://localhost:8181/health` |

### Before Starting Work

1. **Verify Archon is up** (HTTP health check, not MCP)
2. **Check Git state** (`git status`, `git log`)
3. **Cross-reference** - if Archon says "done" but Git has no commit, Archon is wrong
4. If Archon is down, STOP and alert the user

### VEST Task Execution

VEST spawns fresh Claude sessions for complex tasks. **VEST is NOT the source of truth** - it executes tasks defined in Archon.

| Command | Purpose |
|---------|---------|
| `/vest-status` | Show pending tasks |
| `/vest-run TASK-ID` | Execute a task |
| `/vest-learnings` | Check known risky files |

TaskSpec location: `~/Projects/VEST/aces/tasks/`

---

## Self-Calibration

For Claude failure patterns and calibration:
@/Users/ccai/CC Mirror/Superpowers/calibration_checklist.md

Global standards (quality, engineering philosophy) inherited from `~/.claude/CLAUDE.md`.
VEST integration details in `~/.claude/CLAUDE.md` under "VEST Integration".

---

*This project is the template. Patterns established here will inform future trades SaaS.*
