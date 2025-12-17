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

## VEST Task Execution

This project is managed by **VEST** (autonomous task harness). Complex tasks are executed via spawned Claude sessions.

### Check for Pending Tasks
```
/vest-status
```

### Execute a Task
```
/vest-run TASK-ID
```

### Before Starting Work

1. Check `/vest-status` for assigned tasks
2. Check `/vest-learnings` for known risky files and patterns
3. If FilterBar.tsx or similar shows high risk, proceed carefully

### Archon Project ID

**Tennessee Roofing SaaS**: `42f928ef-ac24-4eed-b539-61799e3dc325`

### TaskSpec Location

Task specifications live in `~/Projects/VEST/aces/tasks/`.

---

## Self-Calibration

For Claude failure patterns and calibration:
@/Users/ccai/CC Mirror/Superpowers/calibration_checklist.md

Global standards (quality, engineering philosophy) inherited from `~/.claude/CLAUDE.md`.
VEST integration details in `~/.claude/CLAUDE.md` under "VEST Integration".

---

*This project is the template. Patterns established here will inform future trades SaaS.*
