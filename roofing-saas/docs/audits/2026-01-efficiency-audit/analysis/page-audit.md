# Page Audit - Phase 5 Analysis

**Auditor**: Claude (Scout Role)
**Date**: 2026-01-13
**Scope**: 96 pages across `app/[locale]/(dashboard)/`

---

## Executive Summary

The page architecture shows **good patterns undermined by inconsistent execution**:

1. **Monolithic page files** - 5 pages exceed 300 lines with inline business logic
2. **Mixed component patterns** - No consistent server/client component strategy
3. **TODO comments in production** - Incomplete features shipped
4. **Hardcoded values** - User IDs, routes that should be dynamic
5. **Missing mobile consideration** - Many pages lack responsive design patterns

---

## Page Size Analysis

Pages exceeding 200 lines (complexity indicators):

| Page | Lines | Issue |
|------|-------|-------|
| `projects/[id]/page.tsx` | 893 | Massive - tabs, fetching, presence all inline |
| `claims/page.tsx` | 536 | Full CRUD + filters + export inline |
| `knocks/page.tsx` | 501 | Map, territories, KPIs all in one page |
| `storm-tracking/page.tsx` | 365 | Multiple tabs with full implementation |
| `signatures/page.tsx` | 313 | List + status logic inline |

**Recommended**: Extract business logic to hooks, delegate to feature components.

---

## Issues Identified

### HIGH

#### [PAGE-001] Monolithic Project Detail Page (893 lines)

- **Target**: `app/[locale]/(dashboard)/projects/[id]/page.tsx`
- **Assessment**: This single page file contains:
  - 7 interface definitions (lines 22-79)
  - 5 tabs worth of UI (Overview, Quote Options, Jobs, Files, Contact)
  - Inline data fetching (lines 144-188)
  - Inline presence tracking (lines 119-137)
  - Inline formatting functions (lines 211-228)

  This makes the file hard to maintain and test.

- **Solution**: Extract to:
  - `/components/projects/ProjectDetailPage.tsx` (orchestrator)
  - `/components/projects/tabs/ProjectOverviewTab.tsx`
  - `/components/projects/tabs/ProjectJobsTab.tsx`
  - `/components/projects/tabs/ProjectFilesTab.tsx`
  - `/hooks/useProjectData.ts` (data fetching)
- **Verification**: Page file under 100 lines, delegating to components

#### [PAGE-002] Knocks Page Does Too Much

- **Target**: `app/[locale]/(dashboard)/knocks/page.tsx`
- **Assessment**: 501 lines handling:
  - Territory management
  - Pin dropping
  - User location tracking
  - KPI display
  - Activity feed
  - Multiple view modes

  This should be 3-4 separate pages or a single orchestrator with extracted components.

- **Solution**: Either:
  - A) Split into `/knocks/map`, `/knocks/kpis`, `/knocks/territories`
  - B) Extract to `<KnocksPage>` component that imports:
    - `<KnocksMapView>`
    - `<KnocksKPIView>`
    - `<KnocksTerritoriesView>`
    - `useKnocksData()` hook
- **Verification**: Page file under 100 lines

#### [PAGE-003] TODO Comments in Production Code

- **Target**: `app/[locale]/(dashboard)/events/page.tsx:5,32`
- **Assessment**:
  ```typescript
  // import { useRouter } from 'next/navigation' // TODO: Use for navigation
  // const router = useRouter() // TODO: Use for navigation
  ```

  These indicate incomplete implementation shipped to production.

- **Solution**: Either implement the router navigation or remove the commented code
- **Verification**: No TODO comments in production pages

#### [PAGE-004] Hardcoded User ID in Storm Tracking

- **Target**: `app/[locale]/(dashboard)/storm-tracking/page.tsx:256`
- **Assessment**:
  ```typescript
  currentUserId="current-user-id" // Replace with actual user ID
  ```

  This placeholder was never replaced with actual implementation.

- **Solution**: Get actual user ID from auth context:
  ```typescript
  const { data: { user } } = await supabase.auth.getUser()
  currentUserId={user?.id}
  ```
- **Verification**: No hardcoded placeholder values in component props

### MEDIUM

#### [PAGE-005] Inconsistent Server/Client Component Strategy

- **Target**: Multiple page files
- **Assessment**: No clear strategy for when to use server vs client components:

  **Server Components** (good pattern):
  - `contacts/page.tsx` - Auth check + delegation
  - `tasks/page.tsx` - Auth check + delegation
  - `call-logs/page.tsx` - Auth check + delegation

  **Client Components** (inline everything):
  - `knocks/page.tsx` - All logic inline
  - `claims/page.tsx` - All logic inline
  - `storm-tracking/page.tsx` - All logic inline

  The client component pages re-implement patterns that server components do better.

- **Solution**: Establish pattern:
  1. Page files are server components (auth, initial data)
  2. Page files delegate to `*Client.tsx` or `*WithFilters.tsx` components
  3. Client components handle interactivity
- **Verification**: Consistent pattern across all pages

#### [PAGE-006] localStorage Without SSR Check

- **Target**: `app/[locale]/(dashboard)/events/page.tsx:42`
- **Assessment**:
  ```typescript
  const savedCalendarType = localStorage.getItem('calendarType')
  ```

  Direct localStorage access without checking for SSR/browser environment can cause hydration mismatches.

- **Solution**: Wrap in useEffect or check for window:
  ```typescript
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarType')
      if (saved) setCalendarType(saved as 'standard' | 'google')
    }
  }, [])
  ```
- **Verification**: No direct localStorage access outside useEffect

#### [PAGE-007] Missing Loading States on Some Pages

- **Target**: Various pages
- **Assessment**: Pages with good loading states:
  - `claims/page.tsx` - Skeleton loading
  - `signatures/page.tsx` - Spinner + text
  - `storm-tracking/page.tsx` - Full-screen loader

  Pages without loading states:
  - `contacts/page.tsx` - Delegates but no page-level loading
  - `projects/page.tsx` - No loading indicator
  - Most server component pages rely on streaming

- **Solution**: Add consistent loading.tsx files or Suspense boundaries
- **Verification**: Every page shows loading indicator while fetching

#### [PAGE-008] No Empty State Consistency

- **Target**: Multiple pages
- **Assessment**: Empty states vary wildly:
  - Some have icons + text + CTA button (good)
  - Some just say "No data" (poor)
  - Some don't handle empty state at all

  No shared empty state component.

- **Solution**: Create `<EmptyState icon={} title="" description="" action={} />` component
- **Verification**: All list pages use consistent empty state component

### LOW

#### [PAGE-009] Unused Presence Tracking Variables

- **Target**: `app/[locale]/(dashboard)/projects/[id]/page.tsx:120-121`
- **Assessment**:
  ```typescript
  const { presentUsers: _presentUsers, count: _count } = usePresence({...})
  ```

  Variables are destructured with underscore prefix (unused) but the hook is still called. Either use them or remove the destructuring.

- **Solution**: Either display presence count in UI or remove unused destructuring
- **Verification**: No underscore-prefixed unused variables

#### [PAGE-010] Mixed Button Patterns for Primary Actions

- **Target**: Multiple pages
- **Assessment**: Primary actions use different patterns:
  - Some use `<Link>` styled as button
  - Some use `<Button>` inside `<Link>`
  - Some use `<Button onClick={() => router.push()}>`

  This creates inconsistent accessibility and behavior.

- **Solution**: Standardize on `<Button asChild><Link href="...">` pattern
- **Verification**: All navigation buttons use consistent pattern

---

## Page-by-Page Summary

### Critical Path Pages

| Page | Lines | Pattern | Issues |
|------|-------|---------|--------|
| `/dashboard` | 98 | Client, dynamic imports | ✅ Good |
| `/contacts` | 48 | Server + delegation | ✅ Good |
| `/contacts/[id]` | 213 | Server + inline | Could extract |
| `/projects` | 113 | Client + toggle | ✅ Good |
| `/projects/[id]` | 893 | Client, monolithic | ❌ PAGE-001 |
| `/signatures` | 313 | Client, inline | Could extract |
| `/tasks` | 63 | Server + delegation | ✅ Good |

### Field Worker Pages

| Page | Lines | Pattern | Issues |
|------|-------|---------|--------|
| `/knocks` | 501 | Client, monolithic | ❌ PAGE-002 |
| `/call-logs` | 50 | Server + delegation | ✅ Good |
| `/messages` | 49 | Server + delegation | ✅ Good |

### Analytics Pages

| Page | Lines | Pattern | Issues |
|------|-------|---------|--------|
| `/insights` | 26 | Server + delegation | ✅ Good |
| `/claims` | 536 | Client, inline | Could extract |
| `/storm-tracking` | 365 | Client, inline | ❌ PAGE-004 |

### Support Pages

| Page | Lines | Pattern | Issues |
|------|-------|---------|--------|
| `/events` | 180 | Client, inline | ❌ PAGE-003, PAGE-006 |
| `/settings` | 13 | Server + delegation | ✅ Good |

---

## Good Patterns Observed

1. **Dashboard page** - Uses dynamic imports for heavy components, reducing initial bundle
2. **Server component pages** - Clean auth → delegation pattern (contacts, tasks, call-logs)
3. **FilterBar pattern** - `*WithFilters` components encapsulate filter + list logic
4. **Responsive design** - Many pages have mobile-first CSS with md/lg breakpoints
5. **Empty states** - Best pages have icon + description + CTA

---

## Recommendations

### Quick Wins

1. **Remove TODO comments** (PAGE-003) - Clean up or implement
2. **Fix hardcoded user ID** (PAGE-004) - Security/functionality issue
3. **Add localStorage SSR check** (PAGE-006) - Prevent hydration errors

### Medium Effort

4. **Extract project detail tabs** (PAGE-001) - Break into components
5. **Create empty state component** (PAGE-008) - Standardize pattern
6. **Standardize button patterns** (PAGE-010) - Accessibility

### Larger Effort

7. **Split knocks page** (PAGE-002) - Major refactor
8. **Establish component strategy** (PAGE-005) - Team convention
9. **Add loading.tsx files** (PAGE-007) - Consistent loading states

---

## Files Audited

| File | Lines | Purpose | Issues Found |
|------|-------|---------|--------------|-
| `dashboard/page.tsx` | 98 | Main dashboard | None |
| `contacts/page.tsx` | 48 | Contacts list | None |
| `contacts/[id]/page.tsx` | 213 | Contact detail | Minor |
| `projects/page.tsx` | 113 | Pipeline view | None |
| `projects/[id]/page.tsx` | 893 | Project detail | PAGE-001, PAGE-009 |
| `signatures/page.tsx` | 313 | Signatures list | Minor |
| `tasks/page.tsx` | 63 | Tasks list | None |
| `knocks/page.tsx` | 501 | Field activity | PAGE-002 |
| `events/page.tsx` | 180 | Calendar | PAGE-003, PAGE-006 |
| `insights/page.tsx` | 26 | AI insights | None |
| `claims/page.tsx` | 536 | Claims management | Minor |
| `storm-tracking/page.tsx` | 365 | Storm intel | PAGE-004 |
| `call-logs/page.tsx` | 50 | Call history | None |
| `messages/page.tsx` | 49 | SMS threads | None |
| `settings/page.tsx` | 13 | Settings | None |

---

## Summary for HANDOFF.md

| Issue ID | Priority | Summary |
|----------|----------|---------|
| PAGE-001 | High | Project detail page is 893 lines (should be <100) |
| PAGE-002 | High | Knocks page is 501 lines with 3 views inline |
| PAGE-003 | High | TODO comments shipped to production (events page) |
| PAGE-004 | High | Hardcoded "current-user-id" placeholder |
| PAGE-005 | Medium | No consistent server/client component strategy |
| PAGE-006 | Medium | localStorage access without SSR check |
| PAGE-007 | Medium | Missing loading states on some pages |
| PAGE-008 | Medium | No shared empty state component |
| PAGE-009 | Low | Unused presence tracking variables |
| PAGE-010 | Low | Mixed button patterns for navigation |
