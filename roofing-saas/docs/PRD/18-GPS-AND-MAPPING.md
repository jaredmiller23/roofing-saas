# GPS and Mapping System

## Overview

The GPS and Mapping system is the geospatial backbone of the Roofing SAAS application, enabling field representatives to manage territories, track door-knocking activities, and optimize canvassing routes. Built on **Google Maps Platform** with the **@react-google-maps/api** library, the system provides interactive territory visualization, boundary drawing, pin dropping with reverse geocoding, route optimization, and comprehensive geocoding services.

This system is critical for roofing companies that rely on door-to-door sales, allowing them to:
- Define and assign geographic territories to field reps
- Track door-knocking activity with GPS-verified locations
- Optimize daily canvassing routes to maximize efficiency
- Convert between addresses and coordinates for CRM integration

---

## User Stories

### Field Representatives
- As a **field rep**, I want to **view my assigned territory on a map** so that I know the boundaries of my coverage area
- As a **field rep**, I want to **drop pins on houses I visit** so that I can track my canvassing activity
- As a **field rep**, I want to **see the disposition of previously visited addresses** so that I don't knock on the same door twice
- As a **field rep**, I want to **get an optimized route** for my daily canvassing list so that I minimize travel time between stops
- As a **field rep**, I want to **log door knocks with GPS verification** so that managers can verify I'm in the field

### Office Staff / Managers
- As a **manager**, I want to **create and draw territory boundaries** so that I can assign coverage areas to field reps
- As a **manager**, I want to **view activity stats by territory** so that I can track team performance
- As a **manager**, I want to **assign territories to specific users** so that reps know their coverage areas
- As a **manager**, I want to **see all door knocks on a map** so that I can visualize team activity

### Business Owners
- As an **owner**, I want to **analyze territory coverage** so that I can identify underserved areas
- As an **owner**, I want to **track knock-to-appointment conversion by territory** so that I can measure ROI

---

## Features

### 1. Territory Map Visualization (TerritoryMapClient)

The primary map component for displaying territories with interactive polygon boundaries.

**Capabilities:**
- Renders GeoJSON Polygon and MultiPolygon boundaries
- Multiple map types: roadmap, satellite, hybrid, terrain
- Territory selection with visual highlighting
- Hover effects on territory polygons
- Auto-fit bounds to show all territories
- Territory legend with click-to-select
- Performance-optimized with React.memo and custom comparison

**Implementation:**
- File: `components/territories/TerritoryMapClient.tsx` (387 lines)
- Uses `@react-google-maps/api` GoogleMap component
- Loads `drawing` and `geometry` libraries
- Custom map type toggle controls (not using default Google UI)
- Default center: Kingsport, TN `[36.5484, -82.5618]`

### 2. Territory Boundary Editor (TerritoryMapEditor)

Drawing tool for creating and editing territory boundaries.

**Capabilities:**
- Draw polygons using click-to-place points
- Draw rectangles for simple boundaries
- Edit existing boundaries (drag/resize)
- Convert drawings to GeoJSON format
- Clear and redraw functionality
- Display point count for drawn boundaries

**Implementation:**
- File: `components/territories/TerritoryMapEditor.tsx` (277 lines)
- Uses Google Maps DrawingManager
- Supports `google.maps.drawing.OverlayType.POLYGON` and `RECTANGLE`
- Automatic polygon closing (first point = last point)
- Returns `TerritoryBoundary` (GeoJSON) on completion

### 3. Pin Dropping System (HousePinDropper)

Interactive pin placement for tracking door-knocking activity.

**Capabilities:**
- Click-to-drop pins on map
- Automatic reverse geocoding of dropped location
- Display existing pins with disposition-based colors
- Edit/update existing pins
- Delete pins
- Duplicate detection (prevents pins within 25m)
- Create CRM contact from pin

**Pin Colors by Disposition:**
| Disposition | Color | Hex |
|-------------|-------|-----|
| interested | Green | `#10b981` |
| not_home | Orange | `#f59e0b` |
| not_interested | Red | `#ef4444` |
| appointment | Blue | `#3b82f6` |
| callback | Purple | `#8b5cf6` |
| do_not_contact | Gray | `#6b7280` |
| already_customer | Teal | `#14b8a6` |
| pending | Light Gray | `#94a3b8` |

**Implementation:**
- File: `components/territories/HousePinDropper.tsx` (367 lines)
- Uses `google.maps.Geocoder` for reverse geocoding
- Custom SVG pin markers
- Marker click handlers for editing
- Integration with PinPopup modal

### 4. Pin Popup Modal (PinPopup)

Modal form for capturing door knock details when dropping/editing pins.

**Features:**
- Display reverse-geocoded address
- Quick disposition selection (7 options)
- Notes field
- Toggle to create CRM contact
- Contact data form (name, phone, email)
- Mobile-optimized touch targets (44x44px minimum)

**Implementation:**
- File: `components/territories/PinPopup.tsx` (258 lines)
- Fixed position modal with overlay
- Sticky header and footer
- Scrollable content area

### 5. Geocoding Services

Server-side geocoding using Google Maps Geocoding API.

**Functions:**
- `geocodeAddress(address)` - Convert address to coordinates
- `reverseGeocode(lat, lng)` - Convert coordinates to address
- `batchGeocode(addresses[])` - Geocode multiple addresses with rate limiting
- `validateAddress(address)` - Check if address is valid
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine distance calculation
- `formatDistance(meters)` - Human-readable distance formatting
- `estimateTravelTime(meters)` - Estimate travel time at 40 km/h

**Implementation:**
- File: `lib/maps/geocoding.ts` (276 lines)
- Uses `GOOGLE_MAPS_API_KEY` environment variable
- 100ms delay between batch requests to avoid rate limiting

### 6. Route Optimization

Route planning for efficient canvassing.

**Algorithms:**
1. **Nearest Neighbor** (lightweight, no API required)
   - Greedy algorithm, always goes to closest unvisited point
   - Returns optimized waypoint order

2. **Google Directions API** (production-grade)
   - Uses `waypoints=optimize:true` parameter
   - Returns exact distances and durations
   - Includes turn-by-turn directions

**Functions:**
- `planCanvassingRoute(start, waypoints, returnToStart)` - Main route planning function
- `optimizeRouteNearestNeighbor(start, waypoints)` - Fallback algorithm
- `optimizeRouteWithDirections(start, waypoints, end)` - Google API optimization
- `splitIntoDailyRoutes(waypoints, maxStops, maxDistance)` - Split large territories
- `getDistanceMatrix(origins, destinations)` - Calculate distance matrix
- `getDirections(origin, destination, waypoints)` - Get turn-by-turn directions

**Implementation:**
- File: `lib/maps/routes.ts` (369 lines)
- Automatic fallback to nearest neighbor if API fails
- Default max 50 stops per day, 50km per route

### 7. Territory GeoJSON Utilities

Helper functions for working with geographic data.

**Functions:**
- `validateTerritoryBoundary(boundary)` - Validate GeoJSON structure
- `calculateBoundingBox(boundary)` - Get [minLon, minLat, maxLon, maxLat]
- `calculateCenter(boundary)` - Get center point
- `pointInPolygon(point, polygon)` - Ray casting algorithm
- `pointInTerritory(point, boundary)` - Check if point is in territory
- `createRectangleTerritory(centerLon, centerLat, width, height)` - Quick test territories

**Implementation:**
- File: `lib/geo/territory.ts` (250 lines)
- Supports Polygon and MultiPolygon GeoJSON types
- Validates coordinate ranges (lon: -180 to 180, lat: -90 to 90)

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ TerritoryMapClient│  │TerritoryMapEditor│  │ HousePinDropper  │ │
│  │ (Display/Select) │  │ (Draw Boundaries)│  │ (Pin Dropping)   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                      │           │
│           └─────────────────────┼──────────────────────┘           │
│                                 │                                   │
│                    ┌────────────▼────────────┐                     │
│                    │  @react-google-maps/api │                     │
│                    │  (Google Maps Platform) │                     │
│                    └────────────┬────────────┘                     │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                         Backend (Next.js)                           │
├─────────────────────────────────┼───────────────────────────────────┤
│                                 │                                   │
│  ┌──────────────────┐  ┌───────▼────────┐  ┌──────────────────┐   │
│  │ /api/territories │  │ /api/maps/*    │  │ /api/pins        │   │
│  │ (CRUD, Stats)    │  │ (Geocode/Route)│  │ (Knock Tracking) │   │
│  └────────┬─────────┘  └────────┬───────┘  └────────┬─────────┘   │
│           │                     │                    │             │
│  ┌────────▼─────────────────────▼────────────────────▼─────────┐  │
│  │                    lib/maps/                                 │  │
│  │  ├── geocoding.ts (Google Geocoding API)                    │  │
│  │  └── routes.ts (Google Directions API)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                   │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │                       Supabase                               │  │
│  │  ├── territories (boundary_data JSONB)                      │  │
│  │  └── knocks (latitude, longitude, disposition)              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `components/territories/TerritoryMapClient.tsx` | Main map display component | 387 |
| `components/territories/TerritoryMapEditor.tsx` | Boundary drawing component | 277 |
| `components/territories/HousePinDropper.tsx` | Pin dropping functionality | 367 |
| `components/territories/PinPopup.tsx` | Pin details modal | 258 |
| `components/territories/TerritoryForm.tsx` | Territory create/edit form | 277 |
| `components/territories/TerritoryList.tsx` | Territory list component | - |
| `components/territories/TerritoryMapWrapper.tsx` | SSR-safe map wrapper | - |
| `components/knocks/KnockLogger.tsx` | Mobile knock logging form | 347 |
| `lib/maps/geocoding.ts` | Geocoding service functions | 276 |
| `lib/maps/routes.ts` | Route optimization functions | 369 |
| `lib/geo/territory.ts` | GeoJSON utility functions | 250 |
| `app/api/territories/route.ts` | Territory CRUD API | 181 |
| `app/api/territories/[id]/route.ts` | Single territory API | 243 |
| `app/api/territories/[id]/stats/route.ts` | Territory statistics API | 152 |
| `app/api/maps/geocode/route.ts` | Geocoding API endpoint | 89 |
| `app/api/maps/reverse-geocode/route.ts` | Reverse geocode API | 67 |
| `app/api/maps/route/route.ts` | Route optimization API | 121 |
| `app/(dashboard)/territories/page.tsx` | Territories list page | 423 |
| `app/(dashboard)/territories/[id]/page.tsx` | Territory detail page | 267 |

### Data Flow

**Territory Creation:**
```
User draws boundary → DrawingManager → onOverlayComplete callback →
Convert to GeoJSON → TerritoryForm → POST /api/territories →
Validate with Zod → Insert to Supabase → Award gamification points
```

**Pin Dropping:**
```
User clicks map → HousePinDropper → Reverse geocode click location →
Show PinPopup → User selects disposition → POST /api/pins →
Optionally create contact → Display marker on map
```

**Route Optimization:**
```
GET waypoints → POST /api/maps/route →
Try Google Directions API with optimize:true →
Fallback to nearest neighbor if fails →
Return optimized waypoint order with distances
```

---

## API Endpoints

### GET /api/territories

List all territories for the tenant.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `assigned_to` | UUID | Filter by assigned user |
| `limit` | number | Max results (default: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "success": true,
  "data": {
    "territories": [...],
    "total": 10,
    "limit": 100,
    "offset": 0
  }
}
```

### POST /api/territories

Create a new territory.

**Request Body:**
```json
{
  "name": "Downtown Nashville",
  "description": "Central business district",
  "boundary_data": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], ...]]
  },
  "assigned_to": "uuid-of-user"
}
```

**Gamification:** Awards `TERRITORY_CREATED` points to creator.

### GET /api/territories/[id]

Get a single territory by ID.

### PATCH /api/territories/[id]

Update a territory (name, description, boundary, assigned_to).

### DELETE /api/territories/[id]

Soft delete a territory (sets `is_deleted = true`).

### GET /api/territories/[id]/stats

Get statistics for a territory (contacts, projects, photos, activities).

### GET /api/maps/geocode

Geocode address or reverse geocode coordinates.

**Query Parameters:**
- `address` - Forward geocode (address → coords)
- `lat` + `lng` - Reverse geocode (coords → address)
- `validate=true` - Address validation only
- `batch` - JSON array of addresses for batch geocoding

### POST /api/maps/reverse-geocode

Reverse geocode coordinates (used for pin dropping).

**Request Body:**
```json
{
  "latitude": 36.5484,
  "longitude": -82.5618
}
```

**Response:**
```json
{
  "success": true,
  "address": "123 Main St, Kingsport, TN 37660",
  "street_address": "123 Main St",
  "city": "Kingsport",
  "state": "TN",
  "postal_code": "37660",
  "country": "US",
  "place_id": "ChIJ..."
}
```

### POST /api/maps/route

Optimize canvassing route.

**Request Body:**
```json
{
  "start": { "latitude": 36.5484, "longitude": -82.5618 },
  "waypoints": [
    { "id": "1", "latitude": 36.55, "longitude": -82.57, "address": "..." },
    ...
  ],
  "return_to_start": true,
  "action": "optimize" // or "split_daily"
}
```

### GET /api/maps/route?action=nearest_neighbor

Get nearest neighbor route optimization (no API key required).

---

## Data Models

### territories Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference (RLS) |
| name | TEXT | Territory name (required) |
| description | TEXT | Optional description |
| assigned_to | UUID | Assigned user reference |
| assigned_at | TIMESTAMPTZ | When assigned |
| boundary | JSONB | GeoJSON Polygon/MultiPolygon |
| center_latitude | DECIMAL(10,8) | Center point lat |
| center_longitude | DECIMAL(11,8) | Center point lng |
| color | TEXT | Hex color (default: `#3B82F6`) |
| stroke_color | TEXT | Border color (default: `#1E40AF`) |
| opacity | DECIMAL(3,2) | Fill opacity (default: 0.3) |
| status | TEXT | `active`, `inactive`, `archived` |
| total_knocks | INTEGER | Auto-calculated knock count |
| last_activity_at | TIMESTAMPTZ | Most recent activity |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | Creator reference |
| is_deleted | BOOLEAN | Soft delete flag |

### TerritoryBoundary Type

```typescript
interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][] // [[[lng, lat], [lng, lat], ...]]
}

interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][] // [[[[lng, lat], ...]], ...]
}

type TerritoryBoundary = GeoJSONPolygon | GeoJSONMultiPolygon
```

### RouteWaypoint Type

```typescript
interface RouteWaypoint {
  id: string
  latitude: number
  longitude: number
  address: string
  name?: string
}
```

### OptimizedRoute Type

```typescript
interface OptimizedRoute {
  waypoints: RouteWaypoint[]
  total_distance_meters: number
  total_duration_minutes: number
  optimized_order: number[] // Original indices in optimized order
}
```

---

## Database Functions

### update_territory_knock_count()
Trigger function that increments `total_knocks` and updates `last_activity_at` when a knock is inserted.

### get_territory_stats(territory_id)
Returns JSON with knock statistics by disposition (interested, not_home, appointments).

### is_point_in_territory(territory_id, lat, lng)
Check if a point is within a territory boundary (placeholder - recommends PostGIS for production).

---

## Database Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_territories_tenant_id` | tenant_id | Tenant filtering |
| `idx_territories_assigned_to` | assigned_to | User assignment queries |
| `idx_territories_status` | status | Status filtering |
| `idx_territories_created_at` | created_at DESC | Sorting by date |
| `idx_territories_center` | center_latitude, center_longitude | Spatial queries |
| `idx_territories_boundary` | boundary (GIN) | GeoJSON queries |

---

## RLS Policies

All policies enforce tenant isolation:

| Policy | Action | Description |
|--------|--------|-------------|
| View territories | SELECT | Users can view territories in their tenant |
| Create territories | INSERT | Users can create territories in their tenant |
| Update territories | UPDATE | Users can update territories in their tenant |
| Delete territories | DELETE | Users can delete territories in their tenant |

---

## Integration Points

### Contact Management
- Pins can create CRM contacts with address pre-filled
- Territory stats show contact counts

### Gamification System
- `TERRITORY_CREATED` points awarded on territory creation
- Door knock activities tracked for leaderboards

### Activity Tracking
- Door knocks create activity records
- Territory stats show recent activities

### Storm Targeting
- Territories can be used for storm damage targeting
- Address extraction uses same geocoding services

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Client-side Google Maps API key |
| `GOOGLE_MAPS_API_KEY` | Yes | Server-side API key (geocoding, directions) |

### Google Maps API Services Required

- **Maps JavaScript API** - Interactive maps
- **Drawing Library** - Polygon/rectangle drawing
- **Geometry Library** - Distance calculations
- **Geocoding API** - Address ↔ coordinates
- **Directions API** - Route optimization (optional)
- **Distance Matrix API** - Multi-point distances (optional)

### Default Values

- Default map center: Kingsport, TN `[36.5484, -82.5618]`
- Default zoom level: 13
- Default map type: hybrid
- Default territory color: `#3B82F6` (blue)
- Max stops per route: 50
- Max distance per route: 50km
- Travel speed estimate: 40 km/h

---

## Security

### API Key Protection
- Client-side API key uses domain restrictions
- Server-side API key never exposed to client
- Rate limiting built into batch geocoding

### Input Validation
- Zod schemas validate territory data
- Coordinate range validation (lat: -90 to 90, lon: -180 to 180)
- GeoJSON structure validation

### RLS Enforcement
- All territory queries scoped to tenant
- User assignment verified before save

---

## Testing

### E2E Test Coverage
- Territory CRUD operations
- Map rendering and interactions
- Pin dropping workflow

### Manual Testing Areas
- Boundary drawing accuracy
- Reverse geocoding precision
- Route optimization results
- Mobile touch interactions

---

## Performance Considerations

### Map Optimization
- `React.memo` with custom comparison for TerritoryMapClient
- `useMemo` for map options and styles
- Polygons rendered imperatively to avoid re-renders
- Fit bounds only on initial load

### Geocoding Optimization
- 100ms delay between batch requests
- Haversine formula for distance (no API call)
- Nearest neighbor fallback when API unavailable

### Database Optimization
- GIN index on boundary JSONB
- Composite index on center coordinates
- Consider PostGIS upgrade for production spatial queries

---

## Future Enhancements

1. **PostGIS Integration** - Native spatial queries with `ST_Contains`, `ST_Within`
2. **Heatmap Visualization** - Door knock density visualization
3. **Real-time Location Tracking** - Live rep location on map
4. **Territory Analytics** - Conversion rates by territory
5. **Offline Map Caching** - PWA map tiles for field use
6. **Route History** - Track historical canvassing routes
7. **Territory Optimization** - AI-suggested territory boundaries

---

## File References

### Components
- `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryMapClient.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryMapEditor.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/HousePinDropper.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/PinPopup.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryForm.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryList.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryMapWrapper.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryMapDirect.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/territories/index.ts`
- `/Users/ccai/roofing saas/roofing-saas/components/knocks/KnockLogger.tsx`

### Libraries
- `/Users/ccai/roofing saas/roofing-saas/lib/maps/geocoding.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/maps/routes.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/geo/territory.ts`

### API Routes
- `/Users/ccai/roofing saas/roofing-saas/app/api/territories/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/territories/[id]/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/territories/[id]/stats/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/maps/geocode/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/maps/reverse-geocode/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/maps/route/route.ts`

### Pages
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/territories/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/territories/[id]/page.tsx`

### Database Migrations
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_territories_table.sql`
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_knocks_table.sql`

---

## Validation Record

### Files Examined
1. `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryMapClient.tsx` - Verified Google Maps integration, polygon rendering, map type controls (387 lines)
2. `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryMapEditor.tsx` - Verified DrawingManager, GeoJSON conversion (277 lines)
3. `/Users/ccai/roofing saas/roofing-saas/components/territories/HousePinDropper.tsx` - Verified pin dropping, reverse geocoding, disposition colors (367 lines)
4. `/Users/ccai/roofing saas/roofing-saas/components/territories/PinPopup.tsx` - Verified modal, disposition options, contact creation (258 lines)
5. `/Users/ccai/roofing saas/roofing-saas/components/territories/TerritoryForm.tsx` - Verified form fields, API integration (277 lines)
6. `/Users/ccai/roofing saas/roofing-saas/components/knocks/KnockLogger.tsx` - Verified GPS location capture, disposition logging (347 lines)
7. `/Users/ccai/roofing saas/roofing-saas/lib/maps/geocoding.ts` - Verified Google Geocoding API usage, batch geocoding (276 lines)
8. `/Users/ccai/roofing saas/roofing-saas/lib/maps/routes.ts` - Verified route optimization algorithms, Directions API (369 lines)
9. `/Users/ccai/roofing saas/roofing-saas/lib/geo/territory.ts` - Verified GeoJSON validation, point-in-polygon (250 lines)
10. `/Users/ccai/roofing saas/roofing-saas/app/api/territories/route.ts` - Verified GET/POST handlers, Zod validation (181 lines)
11. `/Users/ccai/roofing saas/roofing-saas/app/api/territories/[id]/route.ts` - Verified GET/PATCH/DELETE handlers (243 lines)
12. `/Users/ccai/roofing saas/roofing-saas/app/api/territories/[id]/stats/route.ts` - Verified statistics endpoint (152 lines)
13. `/Users/ccai/roofing saas/roofing-saas/app/api/maps/geocode/route.ts` - Verified geocoding endpoint (89 lines)
14. `/Users/ccai/roofing saas/roofing-saas/app/api/maps/reverse-geocode/route.ts` - Verified reverse geocode endpoint (67 lines)
15. `/Users/ccai/roofing saas/roofing-saas/app/api/maps/route/route.ts` - Verified route optimization endpoint (121 lines)
16. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/territories/page.tsx` - Verified territories page layout (423 lines)
17. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/territories/[id]/page.tsx` - Verified territory detail page (267 lines)
18. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_territories_table.sql` - Verified schema, indexes, RLS, triggers (277 lines)
19. `/Users/ccai/roofing saas/roofing-saas/package.json` - Verified `@react-google-maps/api` dependency (v2.20.7)

### Archon RAG Queries
- Query: "Google Maps JavaScript API integration React components" - Found shadcn/ui component patterns

### Verification Steps
1. Confirmed `@react-google-maps/api` package in dependencies
2. Verified all 9 territory components exist in `components/territories/`
3. Verified all 3 maps API routes exist in `app/api/maps/`
4. Verified all 3 territories API routes exist in `app/api/territories/`
5. Verified lib/maps and lib/geo directories with expected files
6. Confirmed database migration creates territories table with correct schema
7. Verified RLS policies in migration file
8. Confirmed gamification integration (`awardPointsSafe` in territories API)
9. Verified GeoJSON types match between frontend and backend

### Validated By
PRD Documentation Agent - Session 20
Date: 2025-12-11T15:18:00Z
