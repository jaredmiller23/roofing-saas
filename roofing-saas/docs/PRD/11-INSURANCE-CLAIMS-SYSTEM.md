# 11. Insurance Claims System

## Overview

The Insurance Claims System provides comprehensive tools for documenting property damage, conducting field inspections, and integrating with external Claims Agent modules for insurance claim processing. This feature is designed specifically for roofing contractors who work extensively with insurance claims, offering mobile-first inspection workflows, weather causation documentation using NOAA data, and claim package export capabilities.

The system addresses key insurance industry requirements including Tennessee Law compliance timelines (15/30/60/90 day deadlines), GPS-verified inspections, damage categorization with severity ratings, and automated causation narrative generation for claim documentation.

## User Stories

### Field Inspector
- As a field inspector, I want to verify my GPS location before starting an inspection so that I can prove I was physically at the property
- As a field inspector, I want to photograph specific damage areas (shingles, ridge cap, gutters, etc.) so that I can document all damage comprehensively
- As a field inspector, I want to categorize photos by damage type and severity so that claims adjusters can easily understand the damage
- As a field inspector, I want to capture photos offline and have them sync later so that I can work in areas with poor connectivity

### Office Staff
- As office staff, I want to sync project data to the Claims Agent module so that claims can be tracked in a specialized system
- As office staff, I want to export complete claim packages with photos, documents, and causation narratives so that I can submit comprehensive documentation to insurers
- As office staff, I want to receive webhook updates from the Claims Agent so that project statuses stay synchronized

### Business Owner
- As a business owner, I want to generate storm causation narratives from NOAA data so that I can establish weather-damage relationships for claims
- As a business owner, I want to track Tennessee Law compliance deadlines so that I don't miss statutory requirements
- As a business owner, I want evidence scores for causation documentation so that I can prioritize strong claims

## Features

### 1. Multi-Step Inspection Wizard

A mobile-first, 5-step wizard for conducting property inspections:

**Steps:**
1. **Location Verification** - GPS confirmation that inspector is at property
2. **Overview Photo** - Wide shot of entire roof
3. **Damage Checklist** - Select damage areas to photograph
4. **Photo Capture** - Capture photos for each selected area
5. **Summary** - Review and submit inspection

**Implementation:**
- File: `/components/claims/InspectionWizard.tsx` (339 lines)
- State: `/lib/claims/inspection-state.ts` (242 lines)
- Route: `/app/(dashboard)/inspect/[projectId]/page.tsx` (178 lines)

**Key Functions:**
- `createInitialState()` - Initialize inspection with project/contact IDs
- `calculateProgress()` - Track completion percentage (0-100)
- `getNextStep()` / `getPreviousStep()` - Navigation logic
- `getInspectionSummary()` - Generate summary for review

### 2. Location Verifier

GPS-based verification ensuring inspectors are physically at the property before documenting damage.

**Features:**
- High-accuracy GPS positioning
- Distance calculation using Haversine formula
- Configurable radius threshold (default 100m)
- Error handling for denied permissions, timeouts
- Skip option for manual override

**Implementation:**
- File: `/components/claims/LocationVerifier.tsx` (228 lines)
- Distance calculation: `/lib/claims/inspection-state.ts` (`calculateDistance()`)

**GPS Status States:**
- `idle` - Initial state
- `checking` - Acquiring location
- `verified` - Within acceptable distance
- `too_far` - Outside radius threshold
- `error` - Permission denied or timeout

### 3. Damage Type Classification

Standardized damage categorization for roofing inspections.

**13 Damage Types:**
| Type | Label | Common Use |
|------|-------|------------|
| `overview` | Overview Shot | Wide-angle roof view |
| `shingles` | Shingles | Primary roofing material |
| `ridge_cap` | Ridge Cap | Roof peak damage |
| `flashing` | Flashing | Metal edge/transition damage |
| `gutters` | Gutters | Water management |
| `soffit` | Soffit | Underside eave damage |
| `fascia` | Fascia | Board along roofline |
| `vents` | Vents | Roof ventilation |
| `skylights` | Skylights | Window openings |
| `chimney` | Chimney | Chimney structure |
| `siding` | Siding | Exterior wall damage |
| `windows` | Windows | Window damage |
| `other` | Other | Miscellaneous damage |

**Severity Levels:**
- `minor` - Cosmetic or minimal damage
- `moderate` - Functional impairment
- `severe` - Major structural damage

**Implementation:**
- File: `/components/claims/DamageTypeSelector.tsx` (107 lines)
- Exports: `DamageTypeSelector`, `SeveritySelector`, `DAMAGE_TYPES`, `SEVERITY_LEVELS`

### 4. Claim Photo Capture

Extended photo upload component with damage metadata and offline support.

**Features:**
- Camera capture with rear-facing preference
- Gallery selection support
- Image compression before upload
- Damage type and severity tagging
- Geolocation embedding
- Offline queue for later sync
- Progress tracking UI

**Implementation:**
- File: `/components/claims/ClaimPhotoCapture.tsx` (565 lines)
- Uses: `/lib/storage/photos` for compression
- Uses: `/lib/services/photo-queue` for offline queuing

**Upload Modes:**
- `immediate` - Upload directly when online
- `queue` - Save to IndexedDB for later sync (default)

### 5. Damage Checklist

Interactive checklist for selecting which damage areas to photograph.

**Features:**
- 11 default roofing damage areas
- Toggle selection with visual feedback
- Select All / Clear All buttons
- Photo count tracking per area
- Validation (minimum 1 area required)

**Implementation:**
- File: `/components/claims/DamageChecklist.tsx` (134 lines)
- Default areas: `/lib/claims/inspection-state.ts` (`DEFAULT_DAMAGE_AREAS`)

### 6. Inspection Summary

Review screen before submitting inspection data.

**Features:**
- Photo and area count statistics
- Completion checklist (location, overview, damage photos)
- Per-area breakdown with severity indicators
- Duration tracking
- Submission validation

**Implementation:**
- File: `/components/claims/InspectionSummary.tsx` (190 lines)
- Summary generation: `getInspectionSummary()` in inspection-state.ts

### 7. Claims Agent Sync

Bi-directional synchronization with external Claims Agent module.

**Sync Flow (Outbound):**
1. Gather project + contact data
2. Include insurance info from custom fields
3. POST to Claims Agent API
4. Store returned `claim_id` on project

**Webhook Flow (Inbound):**
1. Receive webhook with claim updates
2. Verify HMAC signature
3. Update project based on event type
4. Handle: `status_changed`, `amount_updated`, `inspection_scheduled`

**Implementation:**
- Sync Service: `/lib/claims/sync-service.ts` (409 lines)
- Functions: `syncProjectToClaims()`, `handleClaimWebhook()`, `generateClaimExportPackage()`

### 8. Weather Causation Generator

Automated narrative generation using NOAA storm data for insurance claims.

**Features:**
- Storm event proximity search using PostGIS
- Causation narrative generation
- Evidence score calculation (0-100)
- Data quality assessment (verified/partial/estimated)
- Multi-event correlation
- Hail size and wind speed analysis

**Implementation:**
- Generator: `/lib/weather/causation-generator.ts` (299 lines)
- API: `/app/api/storm-data/causation/route.ts` (266 lines)

**Evidence Score Factors:**
- Base score for matching events: +20
- Proximity < 1 mile: +30, < 3 miles: +25, < 5 miles: +20
- Hail events with magnitude: +15
- Hail >= 1": +10, >= 1.75": +10 additional
- Wind events with magnitude: +10
- Wind >= 60mph: +5, >= 75mph: +5 additional
- NOAA narratives present: +10
- Multiple confirming events: +5 to +10

## Technical Implementation

### Architecture

```
                                    ┌──────────────────────┐
                                    │   Claims Agent       │
                                    │   (External Module)  │
                                    └──────────┬───────────┘
                                               │
                                    ┌──────────▼───────────┐
                                    │   Webhooks/API       │
                                    └──────────┬───────────┘
                                               │
┌────────────────────────────────────────────────────────────────────┐
│                      Roofing SAAS                                  │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────────┐   │
│  │  Inspection  │  │  Sync Service │  │  Causation Generator  │   │
│  │   Wizard     │  │               │  │                       │   │
│  └──────┬───────┘  └───────┬───────┘  └───────────┬───────────┘   │
│         │                  │                      │               │
│  ┌──────▼───────┐  ┌───────▼───────┐  ┌───────────▼───────────┐   │
│  │   Photos     │  │   Projects    │  │    Storm Events       │   │
│  │   Storage    │  │   Database    │  │    Database           │   │
│  └──────────────┘  └───────────────┘  └───────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `/lib/claims/types.ts` | Type definitions for claims integration | 181 |
| `/lib/claims/inspection-state.ts` | Inspection state management | 242 |
| `/lib/claims/sync-service.ts` | Claims Agent synchronization | 409 |
| `/lib/weather/causation-generator.ts` | Weather causation narratives | 299 |
| `/components/claims/InspectionWizard.tsx` | Multi-step inspection flow | 339 |
| `/components/claims/ClaimPhotoCapture.tsx` | Photo capture with metadata | 565 |
| `/components/claims/LocationVerifier.tsx` | GPS location verification | 228 |
| `/components/claims/DamageTypeSelector.tsx` | Damage type/severity selectors | 107 |
| `/components/claims/DamageChecklist.tsx` | Damage area selection | 134 |
| `/components/claims/InspectionSummary.tsx` | Inspection review summary | 190 |
| `/app/(dashboard)/inspect/[projectId]/page.tsx` | Inspection page route | 178 |
| `/app/api/claims/sync/route.ts` | Sync API endpoint | 131 |
| `/app/api/claims/webhook/route.ts` | Webhook receiver | 127 |
| `/app/api/claims/export/[projectId]/route.ts` | Export API endpoint | 102 |
| `/app/api/storm-data/causation/route.ts` | Causation API endpoint | 266 |

### Data Flow

**Inspection Flow:**
```
1. User navigates to /inspect/[projectId]
2. InspectionWizard loads project data
3. LocationVerifier confirms GPS position
4. User captures overview photo
5. User selects damage areas from checklist
6. ClaimPhotoCapture captures photos per area
7. InspectionSummary reviews collected data
8. Submission saves photos to storage
9. Photos queued for offline sync if needed
```

**Claims Sync Flow:**
```
1. POST /api/claims/sync with project_id
2. gatherProjectSyncData() collects project/contact info
3. Data sent to Claims Agent API
4. claim_id stored on project record
5. Webhooks update project on claim changes
```

## API Endpoints

### POST /api/claims/sync
Sync a project to Claims Agent module.

**Request:**
```json
{
  "project_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "claim_id": "uuid",
  "claim_number": "TN-2025-12345",
  "status": "new",
  "message": "Project synced successfully"
}
```

### GET /api/claims/sync
Preview sync data without sending.

**Parameters:**
- `project_id` (required) - Project UUID

**Response:**
```json
{
  "success": true,
  "preview": {
    "project_id": "uuid",
    "contact_id": "uuid",
    "property_address": "123 Main St",
    "property_city": "Nashville",
    "property_state": "TN",
    "property_zip": "37203",
    "estimated_value": 15000,
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "insurance_carrier": "State Farm",
    "policy_number": "POL-123456"
  }
}
```

### POST /api/claims/webhook
Receive updates from Claims Agent.

**Headers:**
- `x-webhook-signature` - HMAC-SHA256 signature

**Request:**
```json
{
  "claim_id": "uuid",
  "project_id": "uuid",
  "event": "status_changed",
  "data": {
    "previous_status": "documents_pending",
    "new_status": "approved",
    "amount": 15000
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### GET /api/claims/export/[projectId]
Export complete claim package.

**Parameters:**
- `format` - `json` (default) or `zip` (future)

**Response:**
```json
{
  "success": true,
  "data": {
    "project": { "id": "...", "name": "...", "pipeline_stage": "..." },
    "contact": { "id": "...", "first_name": "...", "insurance_carrier": "..." },
    "storm_causation": {
      "events": [...],
      "causation_narrative": "On Saturday, October 15, 2025...",
      "evidence_score": 85
    },
    "photos": [{ "id": "...", "url": "...", "damage_type": "shingles", "severity": "severe" }],
    "documents": [...],
    "exported_at": "2025-01-15T10:30:00Z"
  }
}
```

### GET /api/storm-data/causation
Query storm events for causation documentation.

**Parameters:**
- `lat` (required) - Property latitude
- `lng` (required) - Property longitude
- `date` (optional) - Date of loss (YYYY-MM-DD)
- `radius_miles` (optional) - Search radius (default: 5, max: 50)
- `days_range` (optional) - Days before/after date (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "matching_events": [...],
    "weather_summary": {
      "hail_reported": true,
      "max_hail_size": 2.0,
      "max_wind_speed": 65,
      "tornado_reported": false,
      "total_property_damage": 5000000,
      "event_count": 3
    },
    "causation_narrative": "On Saturday, October 15, 2025...",
    "evidence_score": 85,
    "data_quality": "verified",
    "sources": [
      { "name": "NOAA Storm Events Database", "url": "..." },
      { "name": "National Weather Service", "url": "..." }
    ]
  }
}
```

## Data Models

### ClaimData
```typescript
interface ClaimData {
  id: string
  contact_id: string
  project_id: string
  claim_number?: string
  policy_number?: string
  carrier_id?: string
  date_of_loss: string
  date_filed?: string
  status: ClaimStatus
  claim_type: 'roof' | 'siding' | 'gutters' | 'full_exterior' | 'other'

  // Financial
  initial_estimate?: number
  approved_amount?: number
  paid_amount?: number
  deductible?: number

  // Property
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  property_type?: 'residential' | 'commercial' | 'multi_family'

  // Timeline
  acknowledgment_received?: string
  inspection_scheduled?: string
  inspection_completed?: string
  decision_date?: string

  // Weather
  storm_event_id?: string

  created_at: string
  updated_at: string
}
```

### ClaimStatus
```typescript
type ClaimStatus =
  | 'new'
  | 'documents_pending'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'closed'
  | 'disputed'
  | 'supplement_filed'
  | 'escalated'
```

### InspectionState
```typescript
interface InspectionState {
  projectId: string
  contactId: string
  tenantId: string
  currentStep: InspectionStep

  location: {
    verified: boolean
    latitude?: number
    longitude?: number
    accuracy?: number
    propertyLatitude?: number
    propertyLongitude?: number
    distance?: number
  }

  overviewPhoto?: DamageAreaPhoto
  damageAreas: DamageArea[]
  currentCaptureIndex: number

  startedAt: string
  completedAt?: string
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error'
  syncError?: string
}
```

### StormEventData
```typescript
interface StormEventData {
  id: string
  event_date: string
  event_type: 'hail' | 'tornado' | 'thunderstorm_wind' | 'flood' | 'other'
  magnitude: number | null
  state: string
  county?: string
  city?: string
  latitude?: number
  longitude?: number
  path_length?: number
  path_width?: number
  property_damage?: number
  event_narrative?: string
  distance_miles?: number
}
```

## Database Schema

### storm_events Table
From migration `202511030002_storm_targeting_system.sql`:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Organization reference |
| noaa_event_id | TEXT | NOAA unique event ID |
| event_date | DATE | Date of storm event |
| event_type | TEXT | hail/tornado/thunderstorm_wind/flood/other |
| magnitude | DECIMAL | Hail size (inches) or wind speed (mph) |
| state | TEXT | State abbreviation |
| county | TEXT | County name |
| city | TEXT | City name |
| latitude | DECIMAL(10,7) | Event latitude |
| longitude | DECIMAL(10,7) | Event longitude |
| path_length | DECIMAL | Storm path length in miles |
| path_width | DECIMAL | Storm path width in miles |
| path_polygon | GEOGRAPHY | PostGIS polygon for spatial queries |
| property_damage | BIGINT | Estimated damage in USD |
| event_narrative | TEXT | NOAA event description |

### Database Functions

**PostGIS Spatial Functions:**
- `find_storm_events_near_point(p_lat, p_lng, p_radius_meters, p_start_date, p_end_date)` - Find events within radius
- `calculate_polygon_area_sq_miles(poly)` - Calculate area in square miles
- `point_in_targeting_area(lat, lng, area_id)` - Check if point is within area

## Integration Points

### Photo Storage
- Photos uploaded to Supabase Storage bucket
- Offline queue uses IndexedDB via Dexie.js
- Auto-sync when connection restored

### Project System
- Inspections linked via `project_id`
- Contact data pulled from project relationship
- Storm event linking via `storm_event_id`

### Claims Agent Module (External)
- REST API integration for claim creation/updates
- Webhook receiver for status synchronization
- HMAC-SHA256 signature verification

## Configuration

### Environment Variables
```bash
# Claims Agent Integration
CLAIMS_AGENT_API_URL=https://claims-agent.example.com
CLAIMS_AGENT_API_KEY=your-api-key
CLAIMS_WEBHOOK_SECRET=webhook-secret-for-hmac

# PostGIS (enabled by default in Supabase)
# Required extensions: postgis, earthdistance
```

### Tennessee Law Compliance Thresholds
```typescript
const TN_LAW_THRESHOLDS = {
  ACKNOWLEDGMENT: 15,      // Days to acknowledge claim
  NOTIFICATION_RESPONSE: 30, // Days to respond to notification
  APPROACHING_DEADLINE: 45,  // Warning threshold
  STATUTORY_DEADLINE: 60,    // Legal deadline
  FORMAL_DEMAND: 90,         // Formal demand deadline
} as const
```

## Security

### Authentication
- All claims APIs require authenticated user
- Webhook endpoint uses HMAC signature verification
- Admin client used for webhook processing (bypasses RLS)

### Authorization
- RLS policies on storm_events table
- Tenant isolation via `tenant_id` filtering
- Project access verified before operations

### Data Protection
- GPS coordinates stored only when verified
- Photo metadata includes capture timestamp
- Signed URLs for photo/document access (1-hour expiry)

## Testing

### E2E Test Coverage
- Inspection wizard flow not yet in E2E suite
- Claims API endpoints covered by API tests

### Manual Testing Checklist
- [ ] Location verification with GPS permission denied
- [ ] Photo capture in offline mode
- [ ] Damage type and severity selection
- [ ] Inspection summary accuracy
- [ ] Claims sync with/without Claims Agent configured
- [ ] Webhook signature verification
- [ ] Storm causation query with various parameters

## Performance Notes

### Photo Handling
- Images compressed before upload
- Queue system prevents UI blocking
- Background sync for offline photos

### Storm Data Queries
- PostGIS spatial indexes for efficient queries
- Fallback to non-spatial query if RPC unavailable
- Results limited to 20 events maximum

### Causation Generation
- Narrative generated on-demand
- No caching (regenerated each request)
- Evidence score calculated client-side compatible

## Future Enhancements

1. **ZIP Export** - Bundle all photos and documents in downloadable ZIP
2. **Voice Notes** - Audio annotations during inspection
3. **Offline Inspection State** - Save inspection progress locally
4. **AR Damage Overlay** - Augmented reality damage marking
5. **Insurance Carrier Database** - Auto-populate carrier contact info
6. **Claim Timeline Visualization** - Visual timeline of claim progress
7. **Automated Deadline Alerts** - Push notifications for TN Law deadlines
8. **Photo AI Analysis** - Automatic damage detection and classification

## File References

All files referenced in this document with full paths:

### Components
- `/Users/ccai/roofing saas/roofing-saas/components/claims/index.ts`
- `/Users/ccai/roofing saas/roofing-saas/components/claims/InspectionWizard.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/claims/ClaimPhotoCapture.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/claims/LocationVerifier.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/claims/DamageTypeSelector.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/claims/DamageChecklist.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/claims/InspectionSummary.tsx`

### Library Files
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/types.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/inspection-state.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/sync-service.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/weather/causation-generator.ts`

### API Routes
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/sync/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/webhook/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/export/[projectId]/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/storm-data/causation/route.ts`

### Pages
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/inspect/[projectId]/page.tsx`

### Database Migrations
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/202511030002_storm_targeting_system.sql`

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/types.ts` - Verified ClaimData, ClaimStatus, ClaimWebhookEvent, ClaimExportPackage types (181 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/inspection-state.ts` - Verified InspectionState, DamageArea, inspection flow functions (242 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/sync-service.ts` - Verified sync, webhook, and export functions (409 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/weather/causation-generator.ts` - Verified narrative generation and evidence scoring (299 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/claims/InspectionWizard.tsx` - Verified 5-step wizard flow (339 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/claims/ClaimPhotoCapture.tsx` - Verified photo capture with damage metadata (565 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/claims/LocationVerifier.tsx` - Verified GPS verification logic (228 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/claims/DamageTypeSelector.tsx` - Verified 13 damage types, 3 severity levels (107 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/claims/DamageChecklist.tsx` - Verified checklist component (134 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/claims/InspectionSummary.tsx` - Verified summary component (190 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/sync/route.ts` - Verified GET/POST handlers (131 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/webhook/route.ts` - Verified webhook receiver with HMAC (127 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/export/[projectId]/route.ts` - Verified export endpoint (102 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/storm-data/causation/route.ts` - Verified causation API (266 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/inspect/[projectId]/page.tsx` - Verified inspection page route (178 lines)
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/202511030002_storm_targeting_system.sql` - Verified storm_events table schema (557 lines)

### Archon RAG Queries
- Query: "insurance claims documentation roofing hail damage" - No directly relevant results (Twilio compliance docs returned)

### Verification Steps
1. Listed all files in `/components/claims/` directory - confirmed 7 component files
2. Listed all files in `/lib/claims/` directory - confirmed 3 library files
3. Listed all files in `/app/api/claims/` directory - confirmed 3 API routes (sync, webhook, export)
4. Read and analyzed each component for functionality and line counts
5. Verified type definitions in `/lib/claims/types.ts` including ClaimStatus enum values
6. Confirmed TN_LAW_THRESHOLDS constants in types.ts
7. Verified DAMAGE_TYPES array has 13 entries and SEVERITY_LEVELS has 3 entries
8. Confirmed evidence score calculation algorithm in causation-generator.ts
9. Verified database schema for storm_events table in migration file
10. Confirmed PostGIS extension usage and spatial functions

### Validated By
PRD Documentation Agent - Session 13
Date: 2025-12-11T14:45:00Z
