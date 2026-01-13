# Cross-Cutting Patterns Audit - Phase 7 Analysis

**Auditor**: Claude (Scout Role)
**Date**: 2026-01-13
**Scope**: Patterns appearing across 250+ components and 96 pages

---

## Executive Summary

The codebase has **emergent patterns that need formalization**:

1. **Error handling is locally implemented** - Every component has its own error state/display
2. **Loading states are duplicated** - Same `useState(true)` pattern repeated everywhere
3. **No shared data fetching hooks** - Each component re-implements fetch logic
4. **Form patterns are inconsistent** - Mix of React Hook Form, useState, and manual handling
5. **Offline capability exists but isn't surfaced** - Detection works, UI doesn't show it

---

## Pattern Analysis

### Error Handling

**Current Pattern** (repeated in 50+ components):
```typescript
const [error, setError] = useState<string | null>(null)

try {
  const res = await fetch('/api/...')
  if (!res.ok) {
    throw new Error('Failed to load')
  }
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed')
}

// In JSX:
{error && (
  <Alert className="bg-red-50 border-red-200">
    <AlertDescription className="text-red-900">{error}</AlertDescription>
  </Alert>
)}
```

**Issues**:
- Same 10 lines copied across every data-fetching component
- Inconsistent Alert styling (`bg-red-50` vs `bg-destructive/10`)
- No retry mechanism
- No error logging to monitoring service
- No user-friendly error messages (shows raw API error)

### Loading States

**Current Pattern** (repeated in 70+ components):
```typescript
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const load = async () => {
    setIsLoading(true)
    try {
      // fetch...
    } finally {
      setIsLoading(false)
    }
  }
  load()
}, [deps])

// In JSX:
{isLoading ? (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
) : (
  // content
)}
```

**Issues**:
- Same spinner code copied everywhere
- No skeleton loading (content shifts when loaded)
- No minimum loading time (flash of loading state)
- No error state during loading

### Data Fetching

**Current Pattern** (repeated in every component):
```typescript
useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/entity')
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed')
    }
    setState(data.entities)
  }
  fetchData()
}, [])
```

**Issues**:
- Every component re-implements fetch + error handling
- No caching (same data fetched multiple times)
- No request deduplication
- No optimistic updates
- No background refresh

### Form Handling

**Pattern A - React Hook Form** (used in ~15 components):
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {...}
})
```

**Pattern B - useState** (used in ~40 components):
```typescript
const [formData, setFormData] = useState({...})
const handleChange = (field, value) => {
  setFormData(prev => ({...prev, [field]: value}))
}
```

**Issues**:
- No consistent pattern - team must learn both
- Pattern B lacks validation
- Pattern B lacks dirty tracking
- No shared field components

### State Management

**Current Approaches**:
1. Local useState (80% of cases)
2. React Context (UI mode, auth)
3. URL state (filters via searchParams)
4. No global state library

**Issues**:
- Prop drilling in complex components
- Same data fetched in multiple places
- No shared cache
- Context providers at arbitrary levels

---

## Issues Identified

### HIGH

#### [CROSS-001] No Shared Error Display Component

- **Target**: Pattern appearing in 50+ component files
- **Assessment**: Error display is implemented differently everywhere:
  - Some use `<Alert>` with red background
  - Some use inline `<div>` with error text
  - Some use `toast()` notifications
  - Error messages shown verbatim (technical, not user-friendly)

- **Solution**: Create shared `<ErrorDisplay>` component:
  ```typescript
  // components/ui/error-display.tsx
  export function ErrorDisplay({
    error,
    onRetry,
    variant = 'inline' // 'inline' | 'toast' | 'fullscreen'
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

#### [CROSS-002] No Shared Data Fetching Hook

- **Target**: Pattern appearing in 70+ component files
- **Assessment**: Every component implements its own fetch + loading + error logic. This leads to:
  - 20+ lines of boilerplate per component
  - Inconsistent error handling
  - No caching
  - No request deduplication

- **Solution**: Create custom hooks or adopt React Query/SWR:
  ```typescript
  // hooks/use-data.ts
  function useData<T>(url: string, options?: {
    initialData?: T
    refetchInterval?: number
  }) {
    const [data, setData] = useState<T | null>(options?.initialData ?? null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // ... fetch logic with caching

    return { data, error, isLoading, refetch }
  }

  // Usage:
  const { data: tasks, error, isLoading } = useData<Task[]>('/api/tasks')
  ```

  Or use SWR:
  ```typescript
  import useSWR from 'swr'
  const { data, error, isLoading } = useSWR('/api/tasks', fetcher)
  ```
- **Verification**: Component files under 100 lines, no manual fetch/error/loading state

#### [CROSS-003] No Loading Skeleton Components

- **Target**: All list/detail pages
- **Assessment**: Loading states show spinners, causing content layout shift when data loads. This feels janky and makes the app seem slower than it is.

- **Solution**: Create skeleton components for each entity type:
  ```typescript
  // components/tasks/TaskListSkeleton.tsx
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

### MEDIUM

#### [CROSS-004] Inconsistent Form Validation

- **Target**: ~40 components with manual form state
- **Assessment**: Components using `useState` for forms lack:
  - Field validation
  - Error display per field
  - Dirty/pristine tracking
  - Submit prevention when invalid

  Components using React Hook Form have all of these.

- **Solution**: Migrate all forms to React Hook Form + Zod:
  ```typescript
  // Standard pattern for ALL forms
  const schema = z.object({...})
  const form = useForm({ resolver: zodResolver(schema) })
  ```
- **Verification**: No forms using manual `useState` for form data

#### [CROSS-005] No Global Toast/Notification System

- **Target**: Various components using different notification methods
- **Assessment**: Success/error notifications are handled inconsistently:
  - Some use `alert()` (blocking, ugly)
  - Some use `toast()` from sonner
  - Some use inline success messages
  - Some don't notify at all

- **Solution**: Standardize on `sonner` toast for all notifications:
  ```typescript
  // Success
  toast.success('Contact created')

  // Error
  toast.error('Failed to save', { description: error.message })

  // Loading → Success/Error
  toast.promise(saveContact(), {
    loading: 'Saving...',
    success: 'Saved!',
    error: 'Failed to save',
  })
  ```
- **Verification**: No `alert()` calls, all notifications use toast

#### [CROSS-006] Confirm Dialogs Use Browser alert()

- **Target**: Multiple delete/destructive actions
- **Assessment**: Destructive actions use `confirm()`:
  ```typescript
  if (!confirm('Are you sure?')) return
  ```

  This is ugly, can't be styled, and doesn't match the app's design.

- **Solution**: Use `<AlertDialog>` from shadcn/ui:
  ```typescript
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delete</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  ```
- **Verification**: Grep for `confirm(`, confirm zero results

#### [CROSS-007] No Optimistic Updates

- **Target**: All CRUD operations
- **Assessment**: Every create/update/delete waits for server response before updating UI. This makes the app feel slow even when the network is fast.

- **Solution**: Implement optimistic updates for common operations:
  ```typescript
  // Before: Wait for server
  const handleDelete = async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(tasks.filter(t => t.id !== id))
  }

  // After: Optimistic update with rollback
  const handleDelete = async (id) => {
    const previousTasks = tasks
    setTasks(tasks.filter(t => t.id !== id)) // Optimistic

    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    } catch {
      setTasks(previousTasks) // Rollback
      toast.error('Failed to delete')
    }
  }
  ```
- **Verification**: Delete a task, confirm instant removal from list

### LOW

#### [CROSS-008] console.log Statements in Production

- **Target**: Multiple components
- **Assessment**: Debug logging left in production code:
  - `components/layout/AdaptiveLayout.tsx:111` - logs every render
  - `components/territories/HousePinDropper.tsx` - logs pin creation
  - Various other components

- **Solution**: Remove console.log or wrap in development check:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log('Debug info:', data)
  }
  ```
- **Verification**: No console output in production browser

#### [CROSS-009] Hardcoded Strings Not Internationalized

- **Target**: All UI text
- **Assessment**: UI strings are hardcoded in English:
  ```typescript
  <Button>Create Contact</Button>
  <AlertDescription>Failed to load</AlertDescription>
  ```

  The app has locale routing (`[locale]`) but doesn't use i18n for UI strings.

- **Solution**: Either:
  - A) Remove locale routing if i18n not needed
  - B) Implement next-intl for all UI strings
- **Verification**: All user-facing text comes from translation files

#### [CROSS-010] No Global Loading Indicator

- **Target**: App-level UI
- **Assessment**: When navigating between pages, there's no indication that loading is happening. Users click a link and nothing happens for 500ms+ until the new page renders.

- **Solution**: Add NProgress or similar to show page transition:
  ```typescript
  // app/layout.tsx
  import NProgress from 'nprogress'

  // Or use next/navigation's loading states
  <Suspense fallback={<PageLoadingIndicator />}>
    {children}
  </Suspense>
  ```
- **Verification**: Click any nav link, see loading bar appear

---

## Pattern Recommendations

### Recommended Stack

| Concern | Current | Recommended |
|---------|---------|-------------|
| Data fetching | Custom useEffect | SWR or React Query |
| Error display | Inline Alert | Shared ErrorDisplay |
| Loading state | Custom spinner | Skeleton components |
| Notifications | Mixed alert/toast | Sonner toast only |
| Forms | Mixed patterns | React Hook Form + Zod |
| Confirm dialogs | Browser confirm() | AlertDialog component |

### Migration Priority

1. **Create shared hooks** - Reduces boilerplate immediately
2. **Standardize notifications** - Quick win, high visibility
3. **Replace confirm()** - Improves UX, easy to do
4. **Add skeletons** - Reduces perceived latency
5. **Adopt SWR/Query** - Bigger change, do incrementally

---

## Summary for HANDOFF.md

| Issue ID | Priority | Summary |
|----------|----------|---------|
| CROSS-001 | High | No shared error display component |
| CROSS-002 | High | No shared data fetching hook (70+ duplicates) |
| CROSS-003 | High | No loading skeleton components |
| CROSS-004 | Medium | Inconsistent form validation patterns |
| CROSS-005 | Medium | No global toast/notification system |
| CROSS-006 | Medium | Confirm dialogs use browser alert() |
| CROSS-007 | Medium | No optimistic updates |
| CROSS-008 | Low | console.log statements in production |
| CROSS-009 | Low | Hardcoded strings not internationalized |
| CROSS-010 | Low | No global loading indicator for navigation |
