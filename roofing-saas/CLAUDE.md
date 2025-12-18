# Roofing SaaS - CRM for Roofing Contractors

**What**: CRM built specifically for roofing companies
**First Customer**: Appalachian Storm Restoration (Fahredin's company)
**Template For**: Future trades SaaS products

---

## Session Handoff (2025-12-18 Evening)

### What Was Done This Session

**HTML content added to all document templates** (`0b79e94`)

| Template | Before | After |
|----------|--------|-------|
| Pre-Roofing Inspection Form | 0 chars | 4066 chars |
| Project Completion Certificate | 0 chars | 3127 chars |
| Roof Inspection Report | 0 chars | 5228 chars |

All 12 document templates now have HTML content for PDF generation.

### Current State

| Source | Status |
|--------|--------|
| Git | Commit `0b79e94` pushed to main |
| Archon | Task `b6caa27a` marked done |
| Database | All templates verified via REST API |

### Key Learnings from Migration Debugging

1. **INSERT vs UPDATE**: Templates existed - needed UPDATE, not INSERT
2. **REST API auth**: Supabase REST requires BOTH `apikey` AND `Authorization` headers
3. **Schema drift**: Remote schema differs from expectations (no `is_default`, `slug` columns)
4. **VEST infrastructure**: Uses `python` but macOS has `python3` - needs fix

### Templates Still Without Content

- `Contract ` (trailing space) - orphaned/duplicate entry
- `Test Template Direct` - test placeholder

These appear to be test artifacts, not real templates.

### VEST Note

VEST harness failed with `python` not found error. Task was executed directly. Future fix needed in VEST to use `python3` on macOS.

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

## Operations & Testing (FOR CLAUDE)

**Read this before doing ANY deployment verification or testing.**

### Environments

| Environment | URL |
|-------------|-----|
| **Production** | https://roofing-saas.vercel.app |
| **Local** | http://localhost:3000 |

### Test Account

For automated testing and verification:

| Field | Value |
|-------|-------|
| Email | `claude-test@roofingsaas.com` |
| Password | In `.env.test` (`TEST_USER_PASSWORD`) |
| User ID | `5dc43384-1509-4da8-a795-71060988140a` |
| Tenant | Clarity AI Development (sandbox) |

### Verification Commands

```bash
# Verify production deployment is working
npm run ops:verify

# Verify local development
npm run ops:verify:local

# Get auth token for manual API testing
npm run ops:auth
```

### What `ops:verify` Checks

1. App is reachable
2. Login works with test account
3. Critical pages load (Dashboard, Contacts, Signatures, Projects)
4. API endpoints respond correctly

### After Pushing Code

**Always run verification:**
```bash
git push origin main
# Wait ~60 seconds for Vercel deployment
npm run ops:verify
```

### Manual API Testing

```bash
# Get a token
npm run ops:auth

# Use the token
curl -H "Authorization: Bearer <token>" \
     https://roofing-saas.vercel.app/api/contacts
```

### Files

| File | Purpose |
|------|---------|
| `scripts/ops/config.ts` | Environment URLs, Supabase config |
| `scripts/ops/auth.ts` | Get auth tokens programmatically |
| `scripts/ops/verify.ts` | Full deployment verification |
| `.env.test` | Test credentials (gitignored) |

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

## Multi-Tenancy (CRITICAL - READ BEFORE ANY WORK)

This is a **multi-tenant SaaS application**. Data is isolated per tenant. Understanding this is MANDATORY before touching any code.

### Tenant Structure

| Tenant ID | Name | Purpose |
|-----------|------|---------|
| `00000000-0000-0000-0000-000000000000` | **Appalachian Storm Restoration** | PRODUCTION - Real business, real customers |
| `478d279b-5b8a-4040-a805-75d595d59702` | **Clarity AI Development** | SANDBOX - Safe testing environment |

### Users

**Appalachian Storm Restoration (Production):**
| Email | Role | Notes |
|-------|------|-------|
| fahredin@goappsr.com | owner | Business owner - Fahredin Nushi |
| ted@goappsr.com | manager | Operations manager |
| austin@goappsr.com | admin | Admin staff |
| jaredmiller23@yahoo.com | admin | Jared Miller (has access to BOTH tenants) |

**Clarity AI Development (Sandbox):**
| Email | Role | Notes |
|-------|------|-------|
| jaredmiller23@yahoo.com | owner | Primary dev account |
| claude-test@roofingsaas.com | admin | Automated testing (password: `ClaudeTest2025!Secure`) |

### How Multi-Tenancy Works

1. **Every table has `tenant_id`** - Data is isolated per tenant
2. **RLS policies enforce isolation** - Database-level protection
3. **API routes filter by tenant** - `getUserTenantId(userId)` determines context
4. **You CANNOT see other tenants' data** - This is by design

### Before Creating Seed Data or Test Data

**ALWAYS specify the correct tenant_id:**
- Use `478d279b-5b8a-4040-a805-75d595d59702` for dev/test data
- Use `00000000-0000-0000-0000-000000000000` for production data (Appalachian Storm)
- NEVER use placeholder UUIDs that don't exist

**If you seed to the wrong tenant, the data will be invisible to users in other tenants.**

### Testing Strategy

1. **Use claude-test@roofingsaas.com** for automated testing (Clarity AI Development tenant)
2. **Use jaredmiller23@yahoo.com** for manual testing (has access to both tenants)
3. **NEVER test destructive operations in Appalachian Storm tenant** - that's production data

### Common Mistakes to Avoid

- Creating data with wrong tenant_id (data becomes invisible)
- Testing with production tenant users
- Assuming all users see the same data
- Forgetting to include tenant_id in queries

### Full Documentation

**For complete multi-tenancy documentation, see: `docs/MULTI_TENANCY.md`**

This includes:
- Complete user/tenant mapping
- Data flow diagrams
- Debugging checklist
- How `getUserTenantId()` works
- Adding new tables with tenant isolation

---

## Recently Fixed Issues (2025-12-18)

### ✅ FIXED: Projects Dropdown Empty on Signatures Page
**Archon Task**: `1de878e3-c93c-4997-942c-59a6fffcf258`
**Fixed in commit**: `fb718d0`

**Root Cause**: The `.neq('custom_fields->>proline_pipeline', 'OLD RECRUITING')` filter
in `/api/projects/route.ts` was excluding ALL projects because `.neq()` on JSONB paths
excludes NULL values in PostgreSQL. All 553 projects had `proline_pipeline = NULL`.

**Fix**: Changed to `.or()` filter that preserves NULLs:
```typescript
query = query.or('custom_fields->>proline_pipeline.is.null,custom_fields->>proline_pipeline.neq.OLD RECRUITING')
```

---

### ✅ FIXED: Map Geolocation Not Working on Knock Page
**Archon Task**: `4d30db32-efdc-479a-9e9b-0cc219ba949b`
**Fixed in commit**: `e2d0af3`

**Root Cause**: `navigator.geolocation.watchPosition()` was called but never fired
callbacks (stuck in pending permission state). No timeout mechanism, no error handling
for when geolocation hangs indefinitely.

**Fix**:
1. Added console logging for all geolocation states
2. Use `getCurrentPosition()` first with 5s timeout for faster initial response
3. Added 10-second hard timeout that shows clear error message
4. Added retry button when location fails
5. Better error messages for permission denied, unavailable, timeout

---

## Self-Calibration

For Claude failure patterns and calibration:
@/Users/ccai/CC Mirror/Superpowers/calibration_checklist.md

Global standards (quality, engineering philosophy) inherited from `~/.claude/CLAUDE.md`.
VEST integration details in `~/.claude/CLAUDE.md` under "VEST Integration".

---

*This project is the template. Patterns established here will inform future trades SaaS.*
