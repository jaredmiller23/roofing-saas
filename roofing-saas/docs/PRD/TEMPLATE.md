# [Section Title]

> **Task ID:** [Archon task ID]
> **Status:** [In Progress / Complete]
> **Last Updated:** [ISO timestamp]

## Overview

[What this feature/module does and why it exists. 2-3 paragraphs providing context.]

## User Stories

- As a **[user type]**, I want to **[action]** so that **[benefit]**
- As a **[user type]**, I want to **[action]** so that **[benefit]**
- As a **[user type]**, I want to **[action]** so that **[benefit]**

---

## Features

### Feature 1: [Name]

[Detailed description of the feature]

**Implementation:**
- Primary file: `roofing-saas/path/to/file.tsx`
- Key components: `ComponentName`, `FunctionName`

**Behavior:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Feature 2: [Name]

[Detailed description]

---

## Technical Implementation

### Architecture

[How this module/feature is structured. Include diagram if helpful.]

```
┌─────────────────┐     ┌─────────────────┐
│   Component A   │────▶│   Component B   │
└─────────────────┘     └─────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `roofing-saas/app/(dashboard)/[route]/page.tsx` | Main page component |
| `roofing-saas/components/[module]/[component].tsx` | [Purpose] |
| `roofing-saas/lib/[module]/[util].ts` | [Purpose] |
| `roofing-saas/app/api/[route]/route.ts` | API endpoint |

### Data Flow

1. User action triggers [event]
2. [Component] calls [function/API]
3. Data is processed by [handler]
4. Response updates [state/UI]

---

## API Endpoints

### `GET /api/[endpoint]`

**Purpose:** [What this endpoint does]

**Authentication:** Required (Supabase Auth)

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param1` | string | Yes | [Description] |
| `param2` | number | No | [Description] |

**Response:**
```json
{
  "success": true,
  "data": {
    "field1": "value",
    "field2": 123
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid auth token
- `400 Bad Request` - Invalid parameters

### `POST /api/[endpoint]`

[Same structure as above]

---

## Data Models

### [Model Name]

**Database Table:** `table_name`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `created_at` | timestamp | No | Creation timestamp |
| `field1` | text | No | [Description] |
| `field2` | integer | Yes | [Description] |

**TypeScript Interface:**
```typescript
interface ModelName {
  id: string;
  created_at: string;
  field1: string;
  field2?: number;
}
```

**Relationships:**
- Belongs to: `other_table` (via `foreign_key`)
- Has many: `related_table`

---

## Integration Points

### With [Module A]
- [How this module interacts with Module A]
- Shared data: [what data is shared]

### With [Module B]
- [How this module interacts with Module B]

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAR_NAME` | Yes | - | [Description] |
| `VAR_NAME_2` | No | `default` | [Description] |

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `FEATURE_ENABLED` | `true` | [Description] |

---

## Testing

### E2E Test Coverage

| Test File | Coverage |
|-----------|----------|
| `e2e/[test].spec.ts` | [What's tested] |

### Test Scenarios

1. **[Scenario 1]:** [Description]
2. **[Scenario 2]:** [Description]
3. **[Scenario 3]:** [Description]

---

## File References

All files referenced in this document:

| File | Line(s) | Reference |
|------|---------|-----------|
| `roofing-saas/path/to/file.tsx` | 1-50 | Main component |
| `roofing-saas/path/to/file.ts` | 100-150 | Helper function |

---

## Validation Record

> **This section is REQUIRED before marking the task as done.**

### Files Examined

| File | What Was Verified |
|------|-------------------|
| `roofing-saas/path/to/file.tsx` | [What you checked] |
| `roofing-saas/path/to/file.ts` | [What you verified] |

### Archon RAG Queries

| Query | Result |
|-------|--------|
| "[search term]" | Found documentation for [topic] |
| "[search term]" | Reference for [implementation] |

### Code Verification Steps

1. **[Step 1]:** Verified [what] by [how]
2. **[Step 2]:** Confirmed [what] exists in [file]
3. **[Step 3]:** Validated [what] matches documentation

### Validation Summary

- [ ] All file paths verified to exist
- [ ] All function/component names confirmed in code
- [ ] All API endpoints verified in /app/api/
- [ ] All data models verified against database schema
- [ ] No hallucinated features

---

**Validated By:** PRD Documentation Agent - Session [N]
**Date:** [ISO timestamp]
