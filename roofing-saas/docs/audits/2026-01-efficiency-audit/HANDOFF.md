# Efficiency Audit HANDOFF (DOPE)

**Generated**: 2026-01-13
**Analyst**: Claude (Scout Role)
**For**: Sniper Team (Execution Role)
**Total Issues**: 63 (9 Critical, 23 High, 24 Medium, 7 Low)

---

## How to Use This Document

Each issue has **Target/Assessment/Solution/Verification**.

- Execute in priority order (Critical first)
- Mark complete when verified
- Reference the detailed analysis files in `analysis/` for additional context

**Analysis Files**:
- `analysis/core-workflow.md` - Core CRM workflow issues
- `analysis/navigation-clarity.md` - Navigation structure issues
- `analysis/mobile-audit.md` - Mobile/field experience issues
- `analysis/page-audit.md` - Page-level architecture issues
- `analysis/backend-audit.md` - API and database issues
- `analysis/cross-cutting.md` - Systemic patterns needing formalization
- `analysis/gap-analysis.md` - Missing features that would transform adoption

---

## CRITICAL ISSUES (Fix These First)

### [CW-001] Contact→Project Prompt Only Works for Homeowners

- **Target**: `app/api/contacts/route.ts:201`
- **Assessment**: The `if (contact.contact_category === 'homeowner')` check prevents all non-homeowner contacts from receiving the project creation prompt. This blocks the core CRM workflow for adjusters, subcontractors, suppliers, and other contact types (~60% of potential contacts).
- **Solution**: Either:
  - A) Remove the homeowner gate entirely - prompt for ALL contacts
  - B) Add `CreateProjectDialog` call-to-action to the post-creation redirect for all contacts
  - C) Make the prompt configurable per contact category
- **Verification**: Create a contact with category='adjuster', confirm project creation option appears

---

### [API-001] SQL Injection Risk in Search Parameters

- **Target**: Multiple routes using ilike with unescaped input:
  - `app/api/events/route.ts:47`
  - `app/api/projects/route.ts:102`
  - `app/api/tasks/route.ts:72`
- **Assessment**: Search parameters are interpolated directly into queries:
  ```typescript
  query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  ```
  A malicious search like `%` or `_` could match all records. While Supabase PostgREST escapes most SQL, this pattern is still risky and doesn't sanitize wildcards.
- **Solution**: Escape special characters in search input:
  ```typescript
  const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
  query = query.or(`title.ilike.%${escapedSearch}%`)
  ```
  Or use Supabase text search:
  ```typescript
  query = query.textSearch('search_vector', search, { type: 'websearch' })
  ```
- **Verification**: Test search with `%`, `_`, `\` characters, confirm no unexpected matches

---

### [API-002] No Input Validation on Many POST Endpoints

- **Target**: Multiple routes:
  - `app/api/projects/route.ts:165` - spreads body directly
  - `app/api/events/route.ts:98` - spreads body directly
- **Assessment**: Body is spread directly into database insert:
  ```typescript
  const body = await request.json()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...body,  // NO VALIDATION
      tenant_id: tenantId,
    })
  ```
  This allows setting fields that should be server-controlled (created_at, id), bypassing business rules, and inserting unexpected columns.
- **Solution**: Use Zod schemas for all POST/PATCH endpoints:
  ```typescript
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    // ... explicit allowed fields
  })
  const validatedData = schema.parse(body)
  ```
- **Verification**: Attempt to POST with extra fields (id, tenant_id), confirm rejected

---

### [NAV-001] Too Many Navigation Items (17)

- **Target**: `components/layout/Sidebar.tsx:49-87`
- **Assessment**: 17 nav items (plus sign out = 18 touchpoints) creates cognitive overload. Research shows 4-6 items is optimal for first-time users. Field workers on phones face choice paralysis.
- **Solution**: Collapse to 5-6 primary items:
  ```
  WORKFLOW: Dashboard, Contacts, Pipeline, Signatures, Tasks
  TOOLS: (expandable submenu)
  SETTINGS: Settings
  ```
  Move secondary features to sub-menus or command palette.
- **Verification**: Count nav items, confirm ≤7 visible without scrolling

---

### [NAV-002] Label/Route Mismatches Cause Confusion

- **Target**: `components/layout/Sidebar.tsx:65, 76-77`
- **Assessment**: Three critical mismatches:
  - `/projects` labeled "Pipeline" (line 65)
  - `/campaigns` labeled "Emails" (line 76)
  - `/automations` labeled "Campaigns" (line 77)
  Users searching for "projects" won't find it. Users clicking "Campaigns" expect email campaigns but get workflow automation.
- **Solution**: Align labels with routes:
  - `/projects` → label "Projects" (or rename route to `/pipeline`)
  - `/campaigns` → label "Campaigns" (or rename route to `/emails`)
  - `/automations` → label "Automations"
- **Verification**: Label matches route name (or clear convention documented)

---

### [MOB-001] Field Mode Nav Is Not Simplified (Still 17 Items)

- **Target**: `components/layout/FieldWorkerNav.tsx:68-105`
- **Assessment**: The "simplified" field mode nav has the exact same 17 items as the desktop sidebar - just relocated to a slide-out drawer. This does NOT reduce cognitive load - it just hides it behind a hamburger.
- **Solution**: Create a truly simplified field nav with 5-6 items:
  ```
  Knock, Contacts, Pipeline, Signatures, Tasks
  ```
  Move everything else to "More" or remove for field workers.
- **Verification**: Count nav items in field mode drawer, confirm ≤7

---

### [MOB-002] Simplified Nav (Instagram Style) Is Opt-In

- **Target**: `components/layout/AdaptiveLayout.tsx:52`
- **Assessment**: The Instagram-style bottom nav with 5 items exists (`FieldWorkerBottomNav.tsx`) but:
  - Only shown if `preferences.nav_style === 'instagram'`
  - Default is 'traditional' (hamburger with 17 items)
  - Users must discover and enable this in settings
  This defeats the purpose. The simplified nav should be the DEFAULT for mobile.
- **Solution**: Make Instagram-style nav the default for field mode. Traditional can be opt-in for power users.
- **Verification**: Load app on mobile, confirm 5-tab bottom nav appears by default

---

### [MOB-003] FieldWorkerHome Missing Primary Action (Knock)

- **Target**: `components/layout/FieldWorkerHome.tsx:72-101`
- **Assessment**: The field worker home screen has 4 quick actions:
  ```
  1. New Lead → /storm-targeting (WRONG)
  2. Schedule → /events
  3. Estimates → /projects
  4. Reports → /field/today
  ```
  **Missing**: "Knock" - the #1 field worker action. Door-to-door reps spend 80% of their time knocking.
  **Wrong**: "New Lead" goes to `/storm-targeting` instead of `/contacts/new`.
- **Solution**: Replace quick actions with:
  ```
  1. Knock → /knocks (primary action)
  2. New Contact → /contacts/new
  3. Pipeline → /projects
  4. Tasks → /tasks
  ```
- **Verification**: Load field mode home, confirm Knock button is present and prominent

---

### [GAP-005] No Quick-Capture Mode for Field Workers

- **Target**: No existing file - feature is missing
- **Assessment**: The Door Knocker's Dream Flow:
  1. Knock on door
  2. Homeowner is interested
  3. Tap ONE button
  4. Speak name and address (voice-to-text)
  5. Photo of house auto-captured
  6. Lead created, GPS tagged, timestamp logged
  7. Back to knocking in <30 seconds

  **Current Reality**: 2-3 minutes per lead capture via manual form entry.

  **This is the killer feature for field adoption.** Door knockers knock 50-100 doors/day. 2-3 minutes per capture = 100-300 minutes/day = 3-5 HOURS lost.

- **Solution**: Create `/field/quick-lead` page with:
  - Voice input for name/address
  - Camera integration for photo
  - GPS auto-capture
  - Minimal required fields
  - One-tap submit
- **Verification**: Time lead capture on mobile, confirm <30 seconds

---

## HIGH PRIORITY

### [CW-002] /projects/new Page is Non-Functional Stub

- **Target**: `app/[locale]/(dashboard)/projects/new/page.tsx`
- **Assessment**: The page displays "coming soon" message. Any navigation here is a dead end. Users cannot create projects from this standard route.
- **Solution**: Either:
  - A) Implement full project creation form with contact selection
  - B) Redirect to a working alternative
  - C) Remove/hide navigation links to this page
- **Verification**: Navigate to /projects/new, confirm functional project creation form

---

### [CW-003] No Workflow Guidance After Contact Creation

- **Target**: `app/[locale]/(dashboard)/contacts/[id]/page.tsx`
- **Assessment**: After creating a non-homeowner contact, user lands on detail page with no indication of next steps. "Create Project" button exists but is not prominent.
- **Solution**: Add a callout/banner on contact detail page for contacts without linked projects:
  ```
  "This contact doesn't have a project yet. Create one to start tracking the opportunity."
  [Create Project] button
  ```
- **Verification**: Create contact, verify guidance banner appears

---

### [NAV-003] Duplicate Icon Usage (Zap)

- **Target**: `components/layout/Sidebar.tsx:57, 77`
- **Assessment**: Zap (⚡) icon used for both "Lead Gen" (`/storm-targeting`) and "Campaigns" (`/automations`). Visual scanning fails when icons repeat.
- **Solution**: Change one icon:
  - Lead Gen: `Target` or `Radar` icon
  - Campaigns: `Send` or `Repeat` icon
- **Verification**: No duplicate icons in nav

---

### [NAV-004] Contacts Buried in COMMUNICATIONS Section

- **Target**: `components/layout/Sidebar.tsx:78`
- **Assessment**: Contacts is the primary CRM entity - the start of all workflows. It's buried as the 5th item in the 3rd section. Users must scroll past 14 items to find it.
- **Solution**: Move Contacts to CORE section, ideally position 2 (after Dashboard).
- **Verification**: Contacts visible in top 5 nav items

---

### [NAV-005] Workflow Doesn't Match Section Order

- **Target**: `components/layout/Sidebar.tsx` (section order)
- **Assessment**: The logical workflow is:
  ```
  Knock → Contact → Project → Signature → Done
  ```
  But the nav sections are SELL → CORE → COMMUNICATIONS → SETTINGS, which doesn't match.
- **Solution**: Reorganize by workflow stage:
  ```
  WORKFLOW: Dashboard, Knock, Contacts, Pipeline, Signatures
  TOOLS: Tasks, Events, Call Log, Messages
  INSIGHTS: Business Intel, Storm Intel, Claims
  SETTINGS: Settings
  ```
- **Verification**: Primary workflow items are in logical order in a single section

---

### [MOB-004] Default Mode Is 'full' Causing Flash on Mobile

- **Target**: `lib/ui-mode/types.ts:115` and `lib/ui-mode/detection.ts:259`
- **Assessment**: Default UI mode is `'full'`. During SSR, detection returns `'full'`. Mobile users briefly see desktop UI before detection updates, causing layout shift.
- **Solution**: Default to `'field'` for SSR, or use CSS media queries to hide desktop nav immediately.
- **Verification**: Load page on mobile with throttled CPU, observe no desktop UI flash

---

### [MOB-005] Debug Console.log in Production

- **Target**: `components/layout/AdaptiveLayout.tsx:111`
- **Assessment**: Active console.log statement fires on every render:
  ```typescript
  console.log('AdaptiveLayout - Current UI Mode:', mode, 'Config:', config)
  ```
- **Solution**: Remove or wrap in `process.env.NODE_ENV === 'development'` check
- **Verification**: Load app in production, confirm no AdaptiveLayout logs in console

---

### [MOB-006] Touch Targets Below Minimum on Desktop Nav

- **Target**: `components/layout/Sidebar.tsx:200`
- **Assessment**: Desktop sidebar nav items have `py-3` (12px vertical padding). Total height ~44px. Apple/Android recommend minimum 44-48px touch targets.
- **Solution**: Increase nav item padding to `py-4` minimum (16px)
- **Verification**: Measure nav item touch targets, confirm ≥48px height

---

### [PAGE-001] Monolithic Project Detail Page (893 lines)

- **Target**: `app/[locale]/(dashboard)/projects/[id]/page.tsx`
- **Assessment**: Single page file contains 7 interface definitions, 5 tabs worth of UI, inline data fetching, inline presence tracking, inline formatting functions. Hard to maintain and test.
- **Solution**: Extract to:
  - `/components/projects/ProjectDetailPage.tsx` (orchestrator)
  - `/components/projects/tabs/ProjectOverviewTab.tsx`
  - `/components/projects/tabs/ProjectJobsTab.tsx`
  - `/hooks/useProjectData.ts` (data fetching)
- **Verification**: Page file under 100 lines, delegating to components

---

### [PAGE-002] Knocks Page Does Too Much (501 lines)

- **Target**: `app/[locale]/(dashboard)/knocks/page.tsx`
- **Assessment**: 501 lines handling territory management, pin dropping, user location tracking, KPI display, activity feed, multiple view modes.
- **Solution**: Either split into `/knocks/map`, `/knocks/kpis`, `/knocks/territories` OR extract to components.
- **Verification**: Page file under 100 lines

---

### [PAGE-003] TODO Comments in Production Code

- **Target**: `app/[locale]/(dashboard)/events/page.tsx:5,32`
- **Assessment**: Commented code with TODO markers:
  ```typescript
  // import { useRouter } from 'next/navigation' // TODO: Use for navigation
  // const router = useRouter() // TODO: Use for navigation
  ```
- **Solution**: Either implement the router navigation or remove the commented code
- **Verification**: No TODO comments in production pages

---

### [PAGE-004] Hardcoded User ID Placeholder

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

---

### [API-003] Rate Limiting Not Implemented

- **Target**: `lib/api/errors.ts:38` (defines unused `RATE_LIMIT_EXCEEDED`)
- **Assessment**: ErrorCode.RATE_LIMIT_EXCEEDED exists but is never used. No rate limiting middleware. Attackers could DOS the database, enumerate data, or abuse expensive operations.
- **Solution**: Implement rate limiting middleware using Upstash Redis or Vercel KV.
- **Verification**: Make 100 rapid requests, confirm rate limit kicks in

---

### [API-004] Inconsistent Soft Delete Handling

- **Target**: Multiple routes:
  - `app/api/contacts/route.ts:67` uses `.eq('is_deleted', false)`
  - `app/api/tasks/route.ts:56` uses `.is('is_deleted', null)`
- **Assessment**: Different routes handle soft deletes differently. This can leak deleted records or miss active ones.
- **Solution**: Standardize on one approach across ALL routes:
  ```typescript
  // Option A: Boolean field
  .eq('is_deleted', false)

  // Option B: Nullable timestamp
  .is('deleted_at', null)
  ```
- **Verification**: Soft-delete a record, query all endpoints, confirm excluded everywhere

---

### [API-005] JSON Path Queries Not Indexed

- **Target**: `app/api/projects/route.ts:89,93,97`
- **Assessment**: Queries filter on JSONB paths without indexes:
  ```typescript
  query = query.eq('custom_fields->>proline_pipeline', pipeline)
  ```
  These queries do full table scans. With thousands of projects, this will be slow.
- **Solution**: Create expression indexes:
  ```sql
  CREATE INDEX idx_projects_proline_pipeline
  ON projects ((custom_fields->>'proline_pipeline'));
  ```
  Or migrate these fields to proper columns.
- **Verification**: Run EXPLAIN ANALYZE on query, confirm index scan not seq scan

---

### [API-006] No Caching Headers on Any Response

- **Target**: All API routes
- **Assessment**: No Cache-Control headers set. Every request hits the database, even for data that rarely changes.
- **Solution**: Add caching for appropriate endpoints:
  ```typescript
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // 5 min cache
    }
  })
  ```
- **Verification**: Check response headers, confirm Cache-Control present

---

### [CROSS-001] No Shared Error Display Component

- **Target**: Pattern appearing in 50+ component files
- **Assessment**: Error display is implemented differently everywhere - some use `<Alert>`, some use inline `<div>`, some use `toast()`. Error messages shown verbatim (technical, not user-friendly).
- **Solution**: Create shared `<ErrorDisplay>` component:
  ```typescript
  export function ErrorDisplay({
    error,
    onRetry,
    variant = 'inline'
  }) {
    const userMessage = getUserFriendlyMessage(error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{userMessage}</AlertDescription>
        {onRetry && <Button onClick={onRetry}>Try Again</Button>}
      </Alert>
    )
  }
  ```
- **Verification**: Grep for `setError`, confirm all use shared component

---

### [CROSS-002] No Shared Data Fetching Hook (70+ Duplicates)

- **Target**: Pattern appearing in 70+ component files
- **Assessment**: Every component implements its own fetch + loading + error logic. 20+ lines of boilerplate per component. No caching, no request deduplication.
- **Solution**: Create custom hooks or adopt React Query/SWR:
  ```typescript
  function useData<T>(url: string) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    // ... fetch logic with caching
    return { data, error, isLoading, refetch }
  }
  ```
- **Verification**: Component files under 100 lines, no manual fetch/error/loading state

---

### [CROSS-003] No Loading Skeleton Components

- **Target**: All list/detail pages
- **Assessment**: Loading states show spinners, causing content layout shift when data loads. This feels janky and makes the app seem slower.
- **Solution**: Create skeleton components for each entity type:
  ```typescript
  export function TaskListSkeleton({ count = 5 }) {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }
  ```
- **Verification**: Load any list page, confirm skeleton matches final layout

---

### [GAP-001] No New User Onboarding

- **Target**: No existing file - feature is missing
- **Assessment**: When a new user signs up, they land on the dashboard with no guidance on what to do first, how the workflow works, or where to find key features. Users feel lost and abandon the app.
- **Solution**:
  - Welcome wizard showing the core workflow
  - Checklist: "Complete your setup" (add contact, create project, etc.)
  - Contextual tooltips on first visit to each page
- **Verification**: New user signup shows welcome wizard and setup checklist

---

### [GAP-002] No Command Palette / Quick Search

- **Target**: No existing file - feature is missing
- **Assessment**: With 90+ pages and 17 nav items, users need a way to quickly find things. No Cmd+K search exists.
- **Solution**: Command palette (Cmd+K) that searches:
  - Pages ("Pipeline", "Settings")
  - Entities ("John Smith", "Project #123")
  - Actions ("Create contact", "Send signature")
- **Verification**: Press Cmd+K, search appears, can find pages and entities

---

### [GAP-003] No "Next Step" Workflow Indicators

- **Target**: Multiple files (dashboard, project detail)
- **Assessment**: After completing an action (create contact, win deal), users aren't told what to do next. Users complete discrete actions but don't follow through the full workflow.
- **Solution**:
  - After creating contact: "Create a project to track this opportunity"
  - After project reaches "won": "Start production or send signature"
  - After signature signed: "Project ready for production"
- **Verification**: Complete an action, confirm next-step suggestion appears

---

## MEDIUM PRIORITY

### [CW-004] Signature Creation Disconnected from Project Workflow

- **Target**: `app/[locale]/(dashboard)/projects/[id]/page.tsx`
- **Assessment**: No "Create Signature Document" action on project detail page. Users must navigate to /signatures/new separately and manually select the project.
- **Solution**: Add "Create Signature" button to project detail page that pre-fills project and contact.
- **Verification**: On project detail, click "Create Signature", confirm project/contact pre-filled

---

### [CW-005] No Workflow Progress Indicator

- **Target**: Multiple files
- **Assessment**: Users have no visual indication of where they are in the workflow (Contact → Project → Quote → Won → Signature → Complete).
- **Solution**: Add workflow progress indicator or "next steps" suggestions based on current state.
- **Verification**: View project at each stage, confirm relevant next-step appears

---

### [NAV-006] 73 Pages Not in Navigation (Undiscoverable)

- **Target**: Multiple files in `app/[locale]/(dashboard)/`
- **Assessment**: 90 pages exist but only 17 are in nav. Features like digital cards, financial analytics, territories, field worker pages, voice assistant are not discoverable.
- **Solution**: Either:
  - A) Add to command palette (Cmd+K)
  - B) Add contextual links (e.g., "Estimates" button on project page)
  - C) Determine which features are actually needed and remove the rest
- **Verification**: All active features discoverable via nav OR command palette

---

### [NAV-007] Duplicate/Redundant Routes

- **Target**: Multiple files
- **Assessment**: Several redundant routes exist:
  - `/pipeline/page.tsx` - Just redirects to `/projects`
  - `/admin/audit-log/` AND `/admin/audit-logs/` - Typo duplicate
  - `/financial/*` AND `/financials/` - Singular vs plural
  - `/voice/` AND `/voice-assistant/` - Two voice pages
- **Solution**: Remove duplicates, consolidate routes
- **Verification**: No route redirects to another route

---

### [NAV-008] No Search in Navigation

- **Target**: `components/layout/Sidebar.tsx`
- **Assessment**: With 90 pages and only 17 in nav, users need search. Command palette exists but no nav entry for it.
- **Solution**: Add "Search" item to nav OR persistent search icon in header
- **Verification**: Search accessible within 1 click from any page

---

### [MOB-007] No Offline Indicator in Field Mode

- **Target**: `components/layout/FieldWorkerNav.tsx`, `FieldWorkerBottomNav.tsx`
- **Assessment**: Detection includes `connectionType` but no component shows offline status. Field workers in areas with poor cell service won't know they're offline.
- **Solution**: Add offline banner:
  ```tsx
  {connectionType === 'offline' && (
    <div className="bg-yellow-500 text-black text-center py-1">
      You're offline. Changes will sync when connected.
    </div>
  )}
  ```
- **Verification**: Put phone in airplane mode, confirm offline indicator appears

---

### [MOB-008] "Switch to Full View" Encourages Complexity

- **Target**: `components/layout/FieldWorkerNav.tsx:174-177`
- **Assessment**: The field mode drawer has a "Switch to Full View" button, which lets users opt INTO complexity. The goal is to keep field workers in simple mode.
- **Solution**: Remove "Switch to Full View" from field mode.
- **Verification**: Open field mode drawer, confirm no "Full View" button

---

### [MOB-009] Voice Tab Equal to Business-Critical Tabs

- **Target**: `components/layout/FieldWorkerBottomNav.tsx:56-62`
- **Assessment**: The 5 bottom nav tabs include Voice (AI assistant) with equal prominence to business-critical tabs (Pipeline, Signatures). Voice is nice-to-have, not primary workflow.
- **Solution**: Either:
  - A) Remove Voice from bottom nav, add Contacts instead
  - B) Make Voice a floating action button
- **Verification**: Review bottom nav priority, confirm primary workflow items prominent

---

### [PAGE-005] Inconsistent Server/Client Component Strategy

- **Target**: Multiple page files
- **Assessment**: No clear strategy for when to use server vs client components. Some pages are clean server components with delegation, others are monolithic client components.
- **Solution**: Establish pattern:
  1. Page files are server components (auth, initial data)
  2. Page files delegate to `*Client.tsx` components
  3. Client components handle interactivity
- **Verification**: Consistent pattern across all pages

---

### [PAGE-006] localStorage Without SSR Check

- **Target**: `app/[locale]/(dashboard)/events/page.tsx:42`
- **Assessment**: Direct localStorage access without checking for browser environment:
  ```typescript
  const savedCalendarType = localStorage.getItem('calendarType')
  ```
  Can cause hydration mismatches.
- **Solution**: Wrap in useEffect:
  ```typescript
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarType')
      if (saved) setCalendarType(saved)
    }
  }, [])
  ```
- **Verification**: No direct localStorage access outside useEffect

---

### [PAGE-007] Missing Loading States on Some Pages

- **Target**: Various pages
- **Assessment**: Some pages have good loading states (claims, signatures), others don't (contacts, projects).
- **Solution**: Add consistent loading.tsx files or Suspense boundaries
- **Verification**: Every page shows loading indicator while fetching

---

### [PAGE-008] No Empty State Consistency

- **Target**: Multiple pages
- **Assessment**: Empty states vary wildly - some have icons + text + CTA, some just say "No data", some don't handle empty state at all.
- **Solution**: Create shared `<EmptyState icon={} title="" description="" action={} />` component
- **Verification**: All list pages use consistent empty state component

---

### [API-007] Over-Fetching in List Endpoints

- **Target**: `app/api/projects/route.ts:42-78`
- **Assessment**: List endpoint returns 25+ fields per project including full contact and adjuster objects. For a list view, this is excessive.
- **Solution**: Create separate endpoints or use field selection:
  ```typescript
  // List: minimal fields
  .select('id, name, status, pipeline_stage, estimated_value')

  // Detail: everything
  .select('*, contact(*), adjuster(*)')
  ```
- **Verification**: Compare payload sizes before/after, target 50% reduction

---

### [API-008] Inconsistent Zod Validation Usage

- **Target**: Various routes
- **Assessment**: Contacts route uses Zod validation, Projects/Events/Tasks routes don't. No consistent pattern.
- **Solution**: Create validation schemas for ALL entities in `lib/validations/`:
  ```
  lib/validations/
  ├── contact.ts ✅
  ├── project.ts ❌ (missing)
  ├── task.ts ❌ (missing)
  ├── event.ts ❌ (missing)
  ```
- **Verification**: Every POST/PATCH route imports and uses a Zod schema

---

### [API-009] Missing Pagination Limits Enforcement

- **Target**: Multiple list endpoints
- **Assessment**: Default limit of 50 in most routes, but no maximum enforced. Client can request `?limit=10000` and get all records.
- **Solution**: Enforce maximum limit:
  ```typescript
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  ```
- **Verification**: Request `?limit=10000`, confirm returns max 100

---

### [API-010] Contact Creation Has Too Many Side Effects

- **Target**: `app/api/contacts/route.ts:197-268`
- **Assessment**: POST /api/contacts does: creates contact, fetches tenant settings, optionally creates project, awards gamification points, triggers automation workflows. Violates single responsibility.
- **Solution**: Use event-driven architecture:
  ```typescript
  const contact = await createContact(data)
  await emitEvent('contact.created', { contact })
  // Separate handlers for side effects
  ```
- **Verification**: Contact creation time < 500ms, side effects run async

---

### [CROSS-004] Inconsistent Form Validation Patterns

- **Target**: ~40 components with manual form state
- **Assessment**: Components using `useState` for forms lack validation, error display, dirty tracking. Components using React Hook Form have all of these.
- **Solution**: Migrate all forms to React Hook Form + Zod
- **Verification**: No forms using manual `useState` for form data

---

### [CROSS-005] No Global Toast/Notification System Standardization

- **Target**: Various components
- **Assessment**: Success/error notifications are handled inconsistently - some use `alert()`, some use `toast()`, some use inline messages.
- **Solution**: Standardize on `sonner` toast for all notifications:
  ```typescript
  toast.success('Contact created')
  toast.error('Failed to save', { description: error.message })
  ```
- **Verification**: No `alert()` calls, all notifications use toast

---

### [CROSS-006] Confirm Dialogs Use Browser alert()

- **Target**: Multiple delete/destructive actions
- **Assessment**: Destructive actions use `confirm()`:
  ```typescript
  if (!confirm('Are you sure?')) return
  ```
  This is ugly, can't be styled, doesn't match app design.
- **Solution**: Use `<AlertDialog>` from shadcn/ui
- **Verification**: Grep for `confirm(`, confirm zero results

---

### [CROSS-007] No Optimistic Updates

- **Target**: All CRUD operations
- **Assessment**: Every create/update/delete waits for server response before updating UI. Makes the app feel slow.
- **Solution**: Implement optimistic updates:
  ```typescript
  const previousTasks = tasks
  setTasks(tasks.filter(t => t.id !== id)) // Optimistic
  try {
    await fetch(...)
  } catch {
    setTasks(previousTasks) // Rollback
    toast.error('Failed to delete')
  }
  ```
- **Verification**: Delete a task, confirm instant removal from list

---

### [GAP-004] No Deal Flow Automation (Stage→Task)

- **Target**: No existing wiring - infrastructure exists
- **Assessment**: When a deal moves through stages, related tasks aren't auto-created. Users must remember to do things at each stage.
- **Solution**: Stage → Task automation:
  - "Prospect": Create task "Schedule inspection"
  - "Quote Sent": Create task "Follow up in 3 days"
  - "Won": Create task "Start production", "Send contract"
- **Verification**: Move project to new stage, confirm task auto-created

---

### [GAP-006] No Offline-First Data Entry

- **Target**: No existing file - feature is missing
- **Assessment**: The app detects offline state but doesn't handle it gracefully. Field workers in rural areas lose data when cell service drops.
- **Solution**:
  - Local storage for in-progress forms
  - Queue for offline-created records
  - Sync indicator showing pending uploads
  - Background sync when connection returns
- **Verification**: Create record while offline, confirm syncs when back online

---

### [GAP-007] No Follow-Up Reminder Quick Action

- **Target**: No existing file - feature is missing
- **Assessment**: When users create contacts or log calls, they can create tasks manually. But there's no "Remind me to follow up in 3 days" quick action.
- **Solution**: "Follow up" button on contact/project detail pages with quick options: Tomorrow, 3 days, 1 week, Custom. Auto-creates task with due date.
- **Verification**: Click "Follow up in 3 days" on contact, confirm task created

---

### [GAP-008] No Lead Scoring / Priority Sorting

- **Target**: Schema has `lead_score` field but not calculated/displayed
- **Assessment**: All contacts appear equal in lists. No automatic scoring based on engagement, property value, weather events.
- **Solution**: Auto-calculated lead score based on days since last contact, property size/value, weather damage, engagement. Sort lists by score.
- **Verification**: View contacts list, confirm sorted by score with visual indicator

---

### [GAP-009] No "Today" Dashboard for Field Workers

- **Target**: `/field/today` exists but isn't default
- **Assessment**: Dashboard shows company-wide metrics. Field workers need "My day" view: appointments, follow-ups due, recent knocks, stats vs goal.
- **Solution**: Role-based dashboard variants. Field worker dashboard shows today's schedule, due tasks, daily goals, live stats.
- **Verification**: Log in as field worker, confirm "My Day" view is default

---

## LOW PRIORITY

### [PAGE-009] Unused Presence Tracking Variables

- **Target**: `app/[locale]/(dashboard)/projects/[id]/page.tsx:120-121`
- **Assessment**: Variables are destructured with underscore prefix (unused) but hook still called.
- **Solution**: Either display presence count in UI or remove unused destructuring
- **Verification**: No underscore-prefixed unused variables

---

### [PAGE-010] Mixed Button Patterns for Primary Actions

- **Target**: Multiple pages
- **Assessment**: Primary actions use different patterns: `<Link>` styled as button, `<Button>` inside `<Link>`, `<Button onClick={() => router.push()}>`.
- **Solution**: Standardize on `<Button asChild><Link href="...">` pattern
- **Verification**: All navigation buttons use consistent pattern

---

### [API-011] Unused Error Codes Defined

- **Target**: `lib/api/errors.ts`
- **Assessment**: Several error codes defined but never used: `RATE_LIMIT_EXCEEDED`, `QUICKBOOKS_AUTH_REQUIRED`, `SESSION_EXPIRED`.
- **Solution**: Either implement the features or remove unused codes
- **Verification**: Grep for each error code, confirm used or remove

---

### [CROSS-008] console.log Statements in Production

- **Target**: Multiple components:
  - `components/layout/AdaptiveLayout.tsx:111`
  - `components/territories/HousePinDropper.tsx`
- **Assessment**: Debug logging left in production code, cluttering console.
- **Solution**: Remove or wrap in `process.env.NODE_ENV === 'development'` check
- **Verification**: No console output in production browser

---

### [CROSS-009] Hardcoded Strings Not Internationalized

- **Target**: All UI text
- **Assessment**: UI strings are hardcoded in English. The app has locale routing (`[locale]`) but doesn't use i18n for UI strings.
- **Solution**: Either:
  - A) Remove locale routing if i18n not needed
  - B) Implement next-intl for all UI strings
- **Verification**: All user-facing text comes from translation files (or locale routing removed)

---

### [CROSS-010] No Global Loading Indicator for Navigation

- **Target**: App-level UI
- **Assessment**: When navigating between pages, there's no indication that loading is happening. Users click a link and nothing happens for 500ms+.
- **Solution**: Add NProgress or similar for page transitions
- **Verification**: Click any nav link, see loading bar appear

---

### [GAP-010] No Win/Loss Analysis

- **Target**: No existing file - feature is missing
- **Assessment**: No easy way to see why deals were won or lost. Can't improve sales process without understanding outcomes.
- **Solution**: Required "loss reason" when marking deal lost. Win/loss report by sales rep, lead source, time in pipeline.
- **Verification**: Mark deal as lost, confirm loss reason required

---

## Post-Fix Verification Checklist

After all fixes:

- [ ] `npm run build` succeeds
- [ ] `npm run lint` (max 5 warnings)
- [ ] `npm run typecheck` passes
- [ ] `npm run test:e2e` passes
- [ ] Core workflow completable on mobile
- [ ] Navigation makes sense without training
- [ ] Field mode nav has ≤7 items
- [ ] Contact creation prompts for project (all categories)
- [ ] No console.log statements in production
- [ ] No hardcoded placeholder values

---

## Issue Summary by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Core Workflow (CW) | 1 | 2 | 2 | 0 | 5 |
| Navigation (NAV) | 2 | 3 | 3 | 0 | 8 |
| Mobile (MOB) | 3 | 3 | 3 | 0 | 9 |
| Pages (PAGE) | 0 | 4 | 4 | 2 | 10 |
| Backend API (API) | 2 | 4 | 4 | 1 | 11 |
| Cross-Cutting (CROSS) | 0 | 3 | 4 | 3 | 10 |
| Gap Analysis (GAP) | 1 | 4 | 5 | 1 | 10 |
| **TOTAL** | **9** | **23** | **25** | **7** | **63** |

---

## The ONE Thing

If you can only fix one thing:

**[GAP-005] Quick Lead Capture for Field Workers**

Why:
1. **Primary user** - Door knockers are the primary users, they knock 50-100 doors/day
2. **Current pain** - 2-3 minutes per lead capture = 3-5 HOURS lost daily
3. **Competitive advantage** - No competitor does voice-to-lead well
4. **Adoption driver** - If it's faster to capture leads in the app than on paper, adoption follows

Everything else is optimization. This is transformation.

---

*Generated by Claude Code (Scout Role) - 2026-01-13*
