# FilterBar Integration Rendering Loop Fix
**Date**: November 20, 2025
**Status**: IN PROGRESS - Rendering loop still occurring

## Problem Statement

After implementing Phase 1: FilterBar Integration, the Tasks page (and potentially other pages) are experiencing an infinite rendering loop. The Next.js dev overlay continuously shows "rendering..." and the Route displays "Dynamic" repeatedly.

## Root Causes Identified

### 1. ✅ FIXED: Tasks API PostgREST Error
**Issue**: Tasks API was attempting to query `auth.users` schema directly via PostgREST, which is not allowed.

**Files Fixed**:
- `/app/api/tasks/route.ts:49-54` - Removed `assigned_user:auth.users!assigned_to(...)` query
- `/app/api/tasks/[id]/route.ts:27-38` - Removed multiple `auth.users` queries:
  - `assigned_user:auth.users!assigned_to(...)`
  - `assigned_by_user:auth.users!assigned_by(...)`
  - User references in comments and activity nested queries

**Fix Applied**:
```typescript
// BEFORE (BROKEN):
.select(`
  *,
  project:projects(id, name),
  contact:contacts(id, first_name, last_name),
  assigned_user:auth.users!assigned_to(id, email, raw_user_meta_data),
  parent_task:tasks!parent_task_id(id, title)
`, { count: 'exact' })

// AFTER (FIXED):
.select(`
  *,
  project:projects(id, name),
  contact:contacts(id, first_name, last_name),
  parent_task:tasks!parent_task_id(id, title)
`, { count: 'exact' })
```

### 2. ✅ FIXED: TasksList Component
**Issue**: Component was trying to display `assigned_user` data that no longer exists.

**File Fixed**: `/components/tasks/TasksList.tsx`

**Changes**:
- Removed `assigned_user` from Task interface
- Removed `UserCircle` import
- Removed assigned user display logic (lines 233-238)
- Changed useCallback to useEffect with JSON.stringify dependency
- Updated handleDelete to update state directly instead of refetching

### 3. 🔄 IN PROGRESS: Rendering Loop in Filter Wrapper Components
**Issue**: The `useSearchParams()` hook returns an unstable object that changes on every render, causing components to re-render infinitely.

**Files Affected**:
- `/components/tasks/tasks-with-filters.tsx`
- `/components/projects/leads-with-filters.tsx`
- `/components/projects/projects-with-filters.tsx`
- `/components/call-logs/call-logs-with-filters.tsx`

**Attempts Made**:

**Attempt 1**: Added `useMemo` with `searchParams` dependency
```typescript
const params = useMemo(() => {
  const paramsObj: { [key: string]: string | string[] | undefined } = {}
  searchParams.forEach((value, key) => {
    paramsObj[key] = value
  })
  return paramsObj
}, [searchParams])  // ❌ searchParams is unstable
```
**Result**: Still looping

**Attempt 2**: Used `searchParams.toString()` as stable dependency
```typescript
const searchParamsString = searchParams.toString()
const params = useMemo(() => {
  // ...
}, [searchParamsString, searchParams])  // ❌ Still includes searchParams
```
**Result**: Still looping

**Attempt 3**: Only use string, recreate URLSearchParams inside
```typescript
const searchParamsString = searchParams.toString()
const params = useMemo(() => {
  const currentParams = new URLSearchParams(searchParamsString)
  // ...
}, [searchParamsString])  // ❌ searchParamsString is also unstable
```
**Result**: Still looping

**Attempt 4**: Use useState + useEffect
```typescript
const [params, setParams] = useState({})
useEffect(() => {
  const paramsObj = {}
  searchParams.forEach((value, key) => {
    paramsObj[key] = value
  })
  setParams(paramsObj)
}, [searchParams])  // ❌ searchParams still in dependency array
```
**Result**: Still looping

**Attempt 5**: No memoization at all (CURRENT)
```typescript
// Convert directly on every render
const paramsObj: { [key: string]: string | string[] | undefined } = {}
searchParams.forEach((value, key) => {
  paramsObj[key] = value
})
// Pass directly to child
<TasksList params={paramsObj} />
```
**Status**: Testing now

## Next Steps to Try

### Option 1: Remove searchParams dependency entirely
Similar to the territories page fix (`c9b9340`), remove the unstable dependency:
```typescript
// Don't try to memoize params at all
// Let TasksList handle its own dependency on params via JSON.stringify
```

### Option 2: Use a ref to track the last params string
```typescript
const prevParamsStringRef = useRef('')
const [params, setParams] = useState({})

useEffect(() => {
  const currentParamsString = searchParams.toString()
  if (prevParamsStringRef.current !== currentParamsString) {
    prevParamsStringRef.current = currentParamsString
    const paramsObj = {}
    searchParams.forEach((value, key) => {
      paramsObj[key] = value
    })
    setParams(paramsObj)
  }
}, []) // Empty dependency array - check on every render but only update if changed
```

### Option 3: Move FilterBar to page component
Instead of wrapping in a client component, move the FilterBar integration directly into the page component where searchParams is provided as a prop.

### Option 4: Suspense boundary
Wrap the filter components in a Suspense boundary to prevent the parent from re-rendering.

## Files Modified (Summary)

```
app/api/tasks/route.ts - Removed auth.users query
app/api/tasks/[id]/route.ts - Removed multiple auth.users queries
components/tasks/TasksList.tsx - Removed assigned_user logic
components/tasks/tasks-with-filters.tsx - Multiple attempts to fix rendering loop
components/projects/leads-with-filters.tsx - Multiple attempts to fix rendering loop
components/projects/projects-with-filters.tsx - Multiple attempts to fix rendering loop
components/call-logs/call-logs-with-filters.tsx - Multiple attempts to fix rendering loop
```

## Testing Instructions

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3001/tasks
3. Login with: demo@roofingsaas.com / Demo2025!
4. Check Next.js dev overlay (bottom left)
5. Verify "Route" indicator is stable (not toggling Dynamic/loading)
6. Verify no console errors
7. Verify FilterBar is visible with "+ Add Filter" button

## Validation Results (Playwright Tests)

**Pages Tested**:
- ✅ Tasks (`/tasks`) - FilterBar visible
- ✅ Call Logs (`/call-logs`) - FilterBar visible
- ✅ Projects/Leads - Page loads
- ✅ Projects/Jobs - Page loads

**Console Logs**: No errors after auth.users fix

**Screenshots**: Saved to Downloads folder with timestamps

## Known Issues

1. **Rendering Loop**: Still occurring despite multiple fix attempts
2. **searchParams instability**: Next.js useSearchParams() returns unstable object
3. **HMR cache**: May need server restart after some changes

## References

- Git commit `c9b9340`: Similar fix for territories page (removed unstable map dependency)
- Next.js 16.0.3 with Turbopack
- React 19 with new hooks behavior

## Next Session Checklist

- [ ] Try Option 2 (useRef approach) from Next Steps
- [ ] If still failing, try Option 3 (move to page component)
- [ ] Consider if this is a Next.js 16.0.3 + React 19 bug
- [ ] Check if other pages have similar issues
- [ ] Update Archon tasks with status
