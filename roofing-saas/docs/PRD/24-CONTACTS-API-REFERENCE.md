# Contacts API Reference

## Overview

The Contacts API provides RESTful endpoints for managing contacts (leads, prospects, and customers) in the Roofing SAAS platform. This API supports full CRUD operations, advanced filtering, pagination, sorting, and full-text search capabilities.

All endpoints require authentication via Supabase Auth and enforce multi-tenant isolation via Row-Level Security (RLS).

**Base URL:** `/api/contacts`

**Authentication:** All endpoints require a valid Supabase session cookie. Requests without authentication receive `401 Unauthorized`.

**Multi-Tenancy:** All operations are automatically scoped to the authenticated user's tenant via `tenant_id`. Users cannot access contacts from other tenants.

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/contacts` | List contacts with filtering, search, and pagination |
| `POST` | `/api/contacts` | Create a new contact |
| `GET` | `/api/contacts/[id]` | Get a single contact by ID |
| `PATCH` | `/api/contacts/[id]` | Update a contact |
| `DELETE` | `/api/contacts/[id]` | Soft delete a contact |

## Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

---

## GET /api/contacts

**List contacts with filtering, search, and pagination.**

### Request

```http
GET /api/contacts?page=1&limit=20&type=lead&search=john
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Full-text search across contact fields |
| `type` | enum | - | Filter by contact type: `lead`, `customer`, `prospect` |
| `stage` | enum | - | Filter by pipeline stage: `new`, `contacted`, `qualified`, `proposal`, `negotiation`, `won`, `lost` |
| `assigned_to` | UUID | - | Filter by assigned user ID |
| `priority` | enum | - | Filter by priority: `low`, `normal`, `high`, `urgent` |
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 20 | Items per page (max: 5000) |
| `sort_by` | string | `created_at` | Field to sort by |
| `sort_order` | enum | `desc` | Sort direction: `asc` or `desc` |

### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
        "created_by": "user-uuid",
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-16T14:22:00Z",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith@example.com",
        "phone": "+1-555-123-4567",
        "mobile_phone": "+1-555-987-6543",
        "is_organization": false,
        "company": "Smith Residence",
        "website": null,
        "contact_category": "homeowner",
        "type": "lead",
        "stage": "qualified",
        "substatus": null,
        "source": "Door Knock",
        "assigned_to": "sales-rep-uuid",
        "priority": "high",
        "address_street": "123 Main St",
        "address_city": "Dallas",
        "address_state": "TX",
        "address_zip": "75201",
        "property_type": "Single Family",
        "roof_type": "Asphalt Shingle",
        "roof_age": 15,
        "property_value": 450000,
        "square_footage": 2500,
        "stories": 2,
        "insurance_carrier": "State Farm",
        "policy_number": "SF-123456",
        "claim_number": null,
        "deductible": 1500,
        "tags": ["storm-lead", "hail-damage"],
        "custom_fields": {},
        "is_deleted": false
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_more": true
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### Full-Text Search

The `search` parameter uses PostgreSQL's `websearch` full-text search configuration:

```typescript
query = query.textSearch('search_vector', filters.search, {
  type: 'websearch',
  config: 'english',
})
```

**Searchable fields:** first_name, last_name, company, email, phone

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid query parameters |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | User not associated with a tenant |
| 500 | `INTERNAL_ERROR` | Server error |

---

## POST /api/contacts

**Create a new contact.**

### Request

```http
POST /api/contacts
Content-Type: application/json
```

### Request Body

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane.doe@example.com",
  "phone": "+1-555-123-4567",
  "mobile_phone": "+1-555-987-6543",
  "is_organization": false,
  "company": "Doe Residence",
  "website": "https://example.com",
  "contact_category": "homeowner",
  "type": "lead",
  "stage": "new",
  "source": "Website Form",
  "assigned_to": "user-uuid",
  "priority": "normal",
  "address_street": "456 Oak Ave",
  "address_city": "Austin",
  "address_state": "TX",
  "address_zip": "78701",
  "property_type": "Single Family",
  "roof_type": "Metal",
  "roof_age": 10,
  "property_value": 550000,
  "square_footage": 3000,
  "stories": 1,
  "insurance_carrier": "Allstate",
  "policy_number": "AS-789012",
  "deductible": 2000,
  "tags": ["warm-lead"],
  "custom_fields": {
    "referred_by": "Neighbor"
  }
}
```

### Request Body Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `first_name` | string | Yes | min: 1, max: 100 |
| `last_name` | string | Yes | min: 1, max: 100 |
| `email` | string | No | Valid email or empty string |
| `phone` | string | No | - |
| `mobile_phone` | string | No | - |
| `is_organization` | boolean | No | Default: false |
| `company` | string | No | max: 200 |
| `website` | string | No | Valid URL or empty string |
| `contact_category` | enum | No | See Contact Categories |
| `type` | enum | No | `lead`, `customer`, `prospect` |
| `stage` | enum | No | See Pipeline Stages |
| `substatus` | string | No | max: 100 |
| `source` | string | No | - |
| `assigned_to` | UUID | No | Valid user UUID |
| `priority` | enum | No | `low`, `normal`, `high`, `urgent` |
| `address_street` | string | No | - |
| `address_city` | string | No | - |
| `address_state` | string | No | max: 2 (state code) |
| `address_zip` | string | No | max: 10 |
| `property_type` | string | No | - |
| `roof_type` | string | No | - |
| `roof_age` | integer | No | min: 0, max: 200 |
| `property_value` | number | No | positive |
| `square_footage` | integer | No | positive |
| `stories` | integer | No | min: 1, max: 10 |
| `insurance_carrier` | string | No | - |
| `policy_number` | string | No | - |
| `claim_number` | string | No | - |
| `deductible` | number | No | positive |
| `tags` | string[] | No | Array of strings |
| `custom_fields` | object | No | Key-value pairs |

### Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "contact": {
      "id": "new-contact-uuid",
      "tenant_id": "tenant-uuid",
      "created_by": "user-uuid",
      "created_at": "2025-01-17T09:00:00Z",
      "updated_at": "2025-01-17T09:00:00Z",
      "first_name": "Jane",
      "last_name": "Doe",
      ...
    }
  }
}
```

### Side Effects

1. **Gamification Points:** User receives points for creating a contact:
   ```typescript
   awardPointsSafe(user.id, POINT_VALUES.CONTACT_CREATED, 'Created new contact', contact.id)
   ```

2. **Workflow Automation:** Triggers `contact_created` workflow event:
   ```typescript
   triggerWorkflow(tenantId, 'contact_created', {
     contact_id: contact.id,
     contact: contact,
     user_id: user.id,
   })
   ```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input data (Zod validation failed) |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | User not associated with a tenant |
| 409 | `ALREADY_EXISTS` | Contact with this email already exists |
| 500 | `INTERNAL_ERROR` | Server error |

---

## GET /api/contacts/[id]

**Get a single contact by ID.**

### Request

```http
GET /api/contacts/550e8400-e29b-41d4-a716-446655440000
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Contact ID |

### Response

**Status:** `200 OK`

```json
{
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "tenant-uuid",
    "first_name": "John",
    "last_name": "Smith",
    ...
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | - | Unauthorized |
| 403 | - | No tenant found |
| 404 | - | Contact not found |
| 500 | - | Internal server error |

---

## PATCH /api/contacts/[id]

**Update an existing contact.**

### Request

```http
PATCH /api/contacts/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

### Request Body

Only include fields you want to update:

```json
{
  "stage": "proposal",
  "priority": "high",
  "notes": "Customer interested in full roof replacement"
}
```

### Request Body Schema

All fields from the create schema are allowed, but all are optional. The `id` field is automatically extracted from the URL path.

### Response

**Status:** `200 OK`

```json
{
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stage": "proposal",
    "priority": "high",
    ...
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | - | Invalid input data |
| 401 | - | Unauthorized |
| 403 | - | No tenant found |
| 404 | - | Contact not found or update failed |
| 409 | - | Email already exists (unique constraint violation) |
| 500 | - | Internal server error |

---

## DELETE /api/contacts/[id]

**Soft delete a contact.**

### Request

```http
DELETE /api/contacts/550e8400-e29b-41d4-a716-446655440000
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Contact ID |

### Response

**Status:** `200 OK`

```json
{
  "success": true
}
```

### Behavior

- Performs a **soft delete** by setting `is_deleted = true`
- Contact data is preserved for audit and recovery purposes
- Soft-deleted contacts are excluded from all GET queries via `eq('is_deleted', false)` filter

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | - | Unauthorized |
| 403 | - | No tenant found |
| 500 | - | Failed to delete contact |

---

## Related Endpoints

### Contact Sync to QuickBooks

**POST /api/quickbooks/sync/contact**

Sync contacts to QuickBooks as customers.

```json
{
  "contactId": "contact-uuid",
  "bulkSync": false
}
```

Or bulk sync all contacts:

```json
{
  "bulkSync": true
}
```

**Response:**
```json
{
  "success": true,
  "qbCustomerId": "12345"
}
```

### Bulk Import from Storm Targeting

**POST /api/storm-targeting/bulk-import-contacts**

Import extracted addresses as contacts.

```json
{
  "targetingAreaId": "area-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "imported": 150,
  "message": "Successfully imported 150 contacts"
}
```

### Create Contact from Pin

**POST /api/pins/create**

Create a map pin with optional contact creation.

```json
{
  "latitude": 32.7767,
  "longitude": -96.7970,
  "address": "123 Main St, Dallas, TX 75201",
  "disposition": "interested",
  "create_contact": true,
  "contact_data": {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-123-4567"
  }
}
```

### Global Search

**GET /api/search?q=john**

Search contacts across all entity types. Contacts are prioritized in search results.

**Response:**
```json
{
  "results": [
    {
      "id": "contact-uuid",
      "type": "contact",
      "title": "John Smith",
      "subtitle": "john.smith@example.com",
      "description": "Stage: qualified",
      "url": "/contacts/contact-uuid"
    }
  ],
  "total": 5,
  "query": "john"
}
```

---

## Data Models

### Contact Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant for multi-tenancy |
| `created_by` | UUID | User who created contact |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |
| `first_name` | string | First name (required) |
| `last_name` | string | Last name (required) |
| `email` | string | Email address |
| `phone` | string | Primary phone |
| `mobile_phone` | string | Mobile phone |
| `is_organization` | boolean | True if organization |
| `company` | string | Company name |
| `website` | string | Website URL |
| `contact_category` | enum | Category (homeowner, adjuster, etc.) |
| `type` | enum | Sales type (lead, prospect, customer) |
| `stage` | enum | Pipeline stage |
| `substatus` | string | Sub-status within stage |
| `source` | string | Lead source |
| `assigned_to` | UUID | Assigned user |
| `priority` | enum | Priority level |
| `address_street` | string | Street address |
| `address_city` | string | City |
| `address_state` | string | State (2-char) |
| `address_zip` | string | ZIP code |
| `latitude` | float | Geocoded latitude |
| `longitude` | float | Geocoded longitude |
| `property_type` | string | Property type |
| `roof_type` | string | Roof type |
| `roof_age` | integer | Roof age in years |
| `property_value` | number | Property value |
| `square_footage` | integer | Square footage |
| `stories` | integer | Number of stories |
| `insurance_carrier` | string | Insurance company |
| `policy_number` | string | Policy number |
| `claim_number` | string | Claim number |
| `deductible` | number | Insurance deductible |
| `tags` | string[] | Tags array |
| `custom_fields` | JSONB | Custom key-value pairs |
| `search_vector` | tsvector | Full-text search vector |
| `is_deleted` | boolean | Soft delete flag |

### Contact Category Enum

| Value | Description |
|-------|-------------|
| `homeowner` | Individual property owner (default) |
| `adjuster` | Insurance adjuster |
| `sub_contractor` | Subcontractor company |
| `real_estate_agent` | Real estate professional |
| `developer` | Property developer |
| `property_manager` | Property management company |
| `local_business` | Local business entity |
| `other` | Uncategorized |

### Contact Type Enum (Sales Stage)

| Value | Description |
|-------|-------------|
| `lead` | New contact, not qualified |
| `prospect` | Qualified, actively being worked |
| `customer` | Converted, has done business |

### Pipeline Stage Enum

| Value | Description |
|-------|-------------|
| `new` | Just added to the system |
| `contacted` | Initial outreach made |
| `qualified` | Confirmed as good fit |
| `proposal` | Quote/proposal sent |
| `negotiation` | In active discussions |
| `won` | Deal closed successfully |
| `lost` | Deal did not close |

### Priority Enum

| Value | Description |
|-------|-------------|
| `low` | Low priority |
| `normal` | Normal priority (default) |
| `high` | High priority |
| `urgent` | Urgent priority |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied / No tenant |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NOT_FOUND` | 404 | Contact not found |
| `ALREADY_EXISTS` | 409 | Duplicate email |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Integration Points

### Gamification System

Contact creation awards points via `lib/gamification/award-points.ts`:
- `POINT_VALUES.CONTACT_CREATED` points awarded on successful creation

### Automation Engine

Contact creation triggers workflows via `lib/automation/engine.ts`:
- Event: `contact_created`
- Payload: `{ contact_id, contact, user_id }`

### QuickBooks Integration

Contacts can be synced to QuickBooks as customers:
- Endpoint: `POST /api/quickbooks/sync/contact`
- Supports single contact and bulk sync

### Storm Targeting

Extracted addresses can be bulk imported as contacts:
- Endpoint: `POST /api/storm-targeting/bulk-import-contacts`
- Creates contacts with `source: 'storm_targeting'`

### Pin/Knock System

Map pins can optionally create associated contacts:
- Endpoint: `POST /api/pins/create` with `create_contact: true`
- Uses `create_contact_from_pin` database function

---

## Security

### Authentication
- All endpoints require Supabase Auth session
- Session extracted via SSR cookie middleware

### Multi-Tenancy
- `tenant_id` automatically set from user's tenant association
- All queries filtered by tenant_id
- RLS policies enforce tenant isolation at database level

### Soft Delete
- Deleted contacts preserved with `is_deleted = true`
- All queries exclude deleted records
- Enables audit trail and data recovery

### Duplicate Prevention
- Unique constraint on `(tenant_id, email)`
- Returns `409 Conflict` for duplicate emails

---

## Rate Limiting

Currently no explicit rate limiting is implemented at the API level. Rate limiting is handled by:
- Supabase platform limits
- Vercel function execution limits

---

## Testing

### E2E Test Coverage

Mock utilities available in `/e2e/utils/api-mocks.ts`:

```typescript
// Mock contacts API with custom data
await mockContactsApi(page, [
  { id: '1', first_name: 'John', last_name: 'Doe', ... }
])

// Mock empty contacts response
await mockApiEmpty(page, '/api/contacts', 'contacts')

// Mock large dataset for pagination testing
await mockApiLargeDataset(page, '/api/contacts', 'contacts', 1000)

// Mock error responses
await mockApiError(page, '/api/contacts', {
  code: 'DATABASE_ERROR',
  message: 'Failed to fetch contacts'
})
```

---

## File References

| File | Purpose |
|------|---------|
| `/app/api/contacts/route.ts` | GET (list) and POST (create) handlers |
| `/app/api/contacts/[id]/route.ts` | GET, PATCH, DELETE for single contact |
| `/lib/validations/contact.ts` | Zod validation schemas |
| `/lib/types/api.ts` | TypeScript type definitions |
| `/lib/api/errors.ts` | Error classes and error mapping |
| `/lib/api/response.ts` | Response helper functions |
| `/lib/auth/session.ts` | Authentication helpers |
| `/lib/gamification/award-points.ts` | Points system integration |
| `/lib/automation/engine.ts` | Workflow trigger integration |
| `/app/api/quickbooks/sync/contact/route.ts` | QuickBooks sync endpoint |
| `/app/api/storm-targeting/bulk-import-contacts/route.ts` | Bulk import endpoint |
| `/app/api/pins/create/route.ts` | Pin creation with contact |
| `/app/api/search/route.ts` | Global search endpoint |
| `/e2e/utils/api-mocks.ts` | E2E test mock utilities |
| `/supabase/migrations/20251119000600_merge_organizations_into_contacts.sql` | Database schema |

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/app/api/contacts/route.ts` (205 lines) - Main GET/POST handlers verified
- `/Users/ccai/roofing saas/roofing-saas/app/api/contacts/[id]/route.ts` (173 lines) - GET/PATCH/DELETE handlers verified
- `/Users/ccai/roofing saas/roofing-saas/lib/validations/contact.ts` (103 lines) - Zod schemas verified
- `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` (260 lines) - Contact type definitions verified
- `/Users/ccai/roofing saas/roofing-saas/lib/api/errors.ts` (145 lines) - Error handling verified
- `/Users/ccai/roofing saas/roofing-saas/lib/api/response.ts` (133 lines) - Response helpers verified
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/contact/route.ts` (93 lines) - QuickBooks sync verified
- `/Users/ccai/roofing saas/roofing-saas/app/api/storm-targeting/bulk-import-contacts/route.ts` (138 lines) - Bulk import verified
- `/Users/ccai/roofing saas/roofing-saas/app/api/pins/create/route.ts` (188 lines) - Pin creation verified
- `/Users/ccai/roofing saas/roofing-saas/app/api/search/route.ts` (213 lines) - Global search verified
- `/Users/ccai/roofing saas/roofing-saas/e2e/utils/api-mocks.ts` (239 lines) - Test mocks verified
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000600_merge_organizations_into_contacts.sql` (513 lines) - Schema verified

### Archon RAG Queries
- Query: "REST API reference documentation best practices OpenAPI" - Found QuickBooks API reference patterns

### Verification Steps
1. Confirmed all 5 contact API endpoints exist and match documented behavior
2. Verified Zod validation schema matches documented request body fields
3. Confirmed error codes and HTTP status codes match implementation
4. Verified gamification and automation integrations in POST handler
5. Confirmed soft delete behavior in DELETE handler
6. Verified related endpoints (QuickBooks sync, bulk import, pin creation, search)
7. Confirmed test mock utilities exist for E2E testing

### Validated By
PRD Documentation Agent - Session 26
Date: 2025-12-11T15:55:00Z
