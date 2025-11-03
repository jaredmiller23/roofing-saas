# Map Initialization Error - Resolution
## Date: November 2, 2025

## Problem Summary
The user was experiencing a persistent "Map container is already initialized" error when navigating to territory detail pages. Additionally:
1. Pins could not be edited (clicking did nothing)
2. Existing pins were not loading from the database
3. Only newly created pins were visible during the session

## Root Causes

### 1. Map Container Initialization
- Leaflet was maintaining internal references to map instances
- Container elements retained `_leaflet_id` properties even after cleanup
- React's hot module replacement (HMR) was creating multiple instances
- Standard cleanup methods weren't aggressive enough

### 2. Pin Loading Issue
- API had incorrect database query trying to join `knocks` with `user_id`
- The `user_id` field exists but isn't a foreign key relationship
- This caused a 500 error preventing pins from loading

### 3. Pin Editing Issue
- Click handlers weren't properly attached to existing pins
- Map dependency wasn't included in the pin loading effect

## Solutions Implemented

### 1. Definitive Map Initialization Fix

#### Global Singleton Pattern
```typescript
// Track global map instance to ensure only one exists
let globalMapInstance: any = null
let globalMapContainer: HTMLElement | null = null
```

#### Comprehensive Cleanup Strategy
```typescript
// 1. Clean up global instance if it exists
if (globalMapInstance) {
  globalMapInstance.remove()
  globalMapInstance = null
}

// 2. Deep clean container properties
Object.keys(container).forEach(key => {
  if (key.startsWith('_leaflet')) {
    delete container[key]
  }
})

// 3. Error recovery with retry mechanism
try {
  map = L.map(container, options)
} catch (error) {
  if (error.message.includes('already initialized')) {
    // Create new inner container as last resort
    const newContainer = document.createElement('div')
    container.appendChild(newContainer)
    map = L.map(newContainer, options)
  }
}
```

### 2. Fixed Pin Loading

#### Simplified API Query
```typescript
// Before (broken):
.select(`
  *,
  user_id(
    id,
    email,
    raw_user_meta_data
  )
`)

// After (working):
.select(`
  id,
  latitude,
  longitude,
  address,
  disposition,
  notes,
  // ... other fields
`)
```

### 3. Enhanced Pin Editing

#### Proper Event Handling
```typescript
marker.on('click', (e) => {
  e.originalEvent.stopPropagation() // Prevent map click
  setSelectedPin(pin)
  setIsEditMode(true)
  setShowPopup(true)
})
```

#### Map Dependency for Loading
```typescript
useEffect(() => {
  if (!territoryId || !map) return // Wait for both
  fetchPins()
}, [territoryId, map]) // Added map dependency
```

## Files Modified

1. `/components/territories/TerritoryMapClient.tsx`
   - Added global singleton tracking
   - Implemented comprehensive cleanup
   - Added error recovery mechanism

2. `/components/territories/HousePinDropper.tsx`
   - Fixed pin loading dependencies
   - Enhanced click handlers
   - Added debug logging

3. `/app/api/pins/route.ts`
   - Fixed database query
   - Simplified user data handling

## Testing Checklist

### Map Initialization
- [x] Navigate to territories list
- [x] Click on a territory
- [x] Navigate back and forth between territories
- [x] No "already initialized" errors appear

### Pin Management
- [x] Existing pins load when opening territory
- [x] Can drop new pins on map
- [x] Can click existing pins to edit
- [x] Pin colors update based on disposition
- [x] Pin deletion works properly

### Performance
- [x] Map loads quickly
- [x] No memory leaks on navigation
- [x] Smooth transitions between views

## Verification Steps

1. **Clear browser cache and reload**
2. **Test navigation flow:**
   - Dashboard → Territories → Specific Territory
   - Drop a pin
   - Navigate away and come back
   - Verify pin still exists
   - Click pin to edit

3. **Check console for errors:**
   - No "Map container is already initialized"
   - No API 500 errors
   - Clean console output

## Long-term Recommendations

1. **Consider map instance pooling** for better performance
2. **Implement proper SSR boundaries** with Next.js dynamic imports
3. **Add error boundaries** around map components
4. **Create unit tests** for map lifecycle management
5. **Monitor for memory leaks** in production

## Lessons Learned

1. **Leaflet's internal state management** can conflict with React's lifecycle
2. **Global singleton pattern** helps prevent multiple instances
3. **Aggressive cleanup** is sometimes necessary for third-party libraries
4. **Database relationships** must be properly defined for Supabase queries
5. **Debug logging** is invaluable for troubleshooting complex issues

---
**Resolution by**: Claude (Opus 4.1)
**Duration**: ~1 hour debugging and implementation
**Status**: RESOLVED ✅