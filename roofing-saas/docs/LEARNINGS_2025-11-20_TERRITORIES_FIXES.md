# Territories Page Fixes - November 20, 2025

## Session Summary
Fixed two critical issues on the territories page: infinite map rendering loop and React hydration error with stats cards.

## Issue 1: Infinite Map Rendering Loop

### Root Cause
`components/territories/TerritoryMapWrapper.tsx` was creating a new `@googlemaps/js-api-loader` Loader instance on every render (line 54-58). This triggered constant re-initialization of the entire map component chain.

### Symptoms
- Console showing repeating pattern:
  ```
  [TerritoryMapDirect] Initializing Google Maps
  [TerritoryMapDirect] Updating territories: 1
  [TerritoryMapDirect] Cleaning up
  ```
- ERR_INSUFFICIENT_RESOURCES errors from browser exhaustion
- Page performance degradation

### Failed Solutions Attempted
1. Removing dynamic HousePinDropper key ❌
2. Converting inline components to useMemo JSX ❌
3. Removing `map` from dependency arrays ❌

### Successful Solution
Implemented singleton pattern for Google Maps Loader:

```typescript
// Module-level singleton
let googleMapsLoader: Loader | null = null

function getGoogleMapsLoader() {
  if (!googleMapsLoader) {
    googleMapsLoader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['drawing', 'geometry']
    })
  }
  return googleMapsLoader
}

// In useEffect:
const loader = getGoogleMapsLoader()
```

**Key Learning**: Expensive API loader objects should never be created inside React components without singleton patterns or proper memoization.

**Commit**: `ab8b97f`

---

## Issue 2: React Hydration Error with Stats Cards

### Root Cause
shadcn-ui Card components have a known hydration issue in Next.js 15 with React 19. The `data-slot` attributes (card-title, card-description) render in different orders between server and client, causing hydration mismatch.

### Symptoms
```
Hydration failed because the server rendered HTML didn't match the client
Expected: data-slot="card-title"
Got: data-slot="card-description"
```

### Failed Solutions Attempted
1. Swapping CardTitle/CardDescription order ❌
2. Using useMemo for JSX ❌
3. Converting to component function ❌
4. Clearing Next.js cache ❌

### Successful Solution (Research-Based)
After researching Next.js 15 and React 19 documentation (November 2025), found this is a **known issue** with shadcn-ui Card components. The recommended solution is **client-side only rendering**:

```typescript
// State to track client-side mount
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

// Component renders skeleton on server, real content on client
const StatsCards = () => {
  if (!mounted) {
    return (
      // Skeleton loading state - matches on both server and client
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  // Real content only renders client-side
  return (/* actual cards */)
}
```

**Key Learning**: 
- Next.js 15 + React 19 + shadcn-ui Cards = hydration issues
- Client-side only rendering is the official solution
- Always research current docs (2025) before trial-and-error

**Commits**: `b57a704`, `41cf9cd`, `ca062ac`

---

## Research Sources (November 2025)

1. **Stack Overflow**: "Hydration failed because the server rendered HTML didn't match the client error in usage with shadcn-ui card component"
   - Confirms Card component hydration issues in Next.js 15/React 19
   - Solution: useState/useEffect pattern for client-side only rendering

2. **Next.js 15 Hydration Docs**:
   - Common causes: browser extensions, invalid HTML nesting, Date.now(), Math.random()
   - Solutions: useEffect for client-only, suppressHydrationWarning, disable SSR

3. **shadcn-ui GitHub Issues**:
   - Multiple reports of hydration errors with Card, Dialog, Calendar components
   - ThemeProvider and data-slot attributes particularly problematic

---

## Verification

### Infinite Loop Fix
- ✅ Map initializes once
- ✅ No repeated mount/unmount cycles
- ✅ Browser resources stable
- ✅ Territory selection works smoothly

### Hydration Fix
- ✅ No hydration errors in console
- ✅ Brief skeleton flash on initial load (expected)
- ✅ Stats cards display correctly after mount
- ✅ All TypeScript/ESLint checks pass

---

## Deployment Notes

**Local**: ✅ Working  
**Vercel**: Awaiting deployment

To deploy:
```bash
git push origin main
```

Vercel will automatically deploy the latest commits:
- ab8b97f (infinite loop fix)
- b57a704, 41cf9cd, ca062ac (hydration fixes)

---

## Takeaways

1. **Research First**: Always check current docs (2025) before trial-and-error
2. **Singleton Pattern**: Essential for expensive objects in React components
3. **Hydration Awareness**: Next.js 15 + React 19 have different hydration behaviors
4. **Client-Side Escape Hatch**: useState/useEffect is valid solution for SSR issues
5. **shadcn-ui + Next 15**: Known compatibility issues, use client-side rendering
