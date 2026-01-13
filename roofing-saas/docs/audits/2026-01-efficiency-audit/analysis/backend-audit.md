# Backend Efficiency Audit - Phase 6 Analysis

**Auditor**: Claude (Scout Role)
**Date**: 2026-01-13
**Scope**: 227 API routes in `app/api/`

---

## Executive Summary

The backend has **good foundations with inconsistent execution**:

1. **Strong error handling framework** - ApiError class, error codes, mappers exist
2. **Inconsistent validation** - Some routes use Zod, others spread body directly
3. **SQL injection risk** - Unescaped search parameters in ilike queries
4. **Rate limiting declared but not implemented** - ErrorCode exists, not enforced
5. **No caching** - Every request hits database, no cache headers
6. **Soft delete inconsistency** - `is_deleted = false` vs `IS NULL` across routes

---

## API Architecture Review

### Good Patterns ✅

1. **Standardized Error Handling** (`lib/api/errors.ts`)
   - ApiError class with code, message, statusCode, details
   - ErrorCode enum covering all HTTP scenarios
   - mapSupabaseError() for database errors
   - mapZodError() for validation errors

2. **Consistent Auth Checks**
   ```typescript
   const user = await getCurrentUser()
   if (!user) throw AuthenticationError()

   const tenantId = await getUserTenantId(user.id)
   if (!tenantId) throw AuthorizationError()
   ```

3. **Response Helpers** (`lib/api/response.ts`)
   - successResponse(), errorResponse(), createdResponse(), paginatedResponse()
   - Consistent JSON structure across all endpoints

4. **Request Logging**
   - Timing measurement (startTime, duration)
   - logger.apiRequest() / logger.apiResponse() pattern

5. **Audit Trail** (`lib/audit/audit-middleware.ts`)
   - auditedCreate() wraps database operations
   - Tracks who created what, when, from where

---

## Issues Identified

### CRITICAL

#### [API-001] SQL Injection Risk in Search Parameters

- **Target**: Multiple routes using ilike with unescaped input
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

#### [API-002] No Input Validation on Many POST Endpoints

- **Target**: Multiple routes
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

  This allows:
  - Setting fields that should be server-controlled (created_at, id)
  - Bypassing business rules
  - Inserting unexpected columns

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

### HIGH

#### [API-003] Rate Limiting Not Implemented

- **Target**: `lib/api/errors.ts:38` defines `RATE_LIMIT_EXCEEDED`
- **Assessment**: ErrorCode.RATE_LIMIT_EXCEEDED exists but is never used. No rate limiting middleware, no per-user/per-IP throttling. An attacker could:
  - DOS the database with rapid requests
  - Enumerate data through list endpoints
  - Abuse expensive operations (PDF generation, email sending)

- **Solution**: Implement rate limiting middleware:
  ```typescript
  // Using Vercel KV or Upstash Redis
  import { Ratelimit } from '@upstash/ratelimit'

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
  })
  ```
- **Verification**: Make 100 rapid requests, confirm rate limit kicks in

#### [API-004] Inconsistent Soft Delete Handling

- **Target**: Multiple routes
  - `app/api/contacts/route.ts:67` uses `.eq('is_deleted', false)`
  - `app/api/tasks/route.ts:56` uses `.is('is_deleted', null)`
  - `app/api/events/route.ts:39` uses `.eq('is_deleted', false)`
- **Assessment**: Different routes handle soft deletes differently:
  - Some check `is_deleted = false`
  - Some check `is_deleted IS NULL`
  - Some don't check at all

  This can leak deleted records or miss active ones depending on how the column is set.

- **Solution**: Standardize on one approach:
  ```typescript
  // Option A: Boolean field, default false
  .eq('is_deleted', false)

  // Option B: Nullable timestamp
  .is('deleted_at', null)
  ```
  Apply consistently across ALL routes.
- **Verification**: Soft-delete a record, query all endpoints, confirm it's excluded

#### [API-005] JSON Path Queries Not Indexed

- **Target**: `app/api/projects/route.ts:89,93,97`
- **Assessment**: Queries filter on JSONB paths:
  ```typescript
  query = query.eq('custom_fields->>proline_pipeline', pipeline)
  query = query.eq('custom_fields->>proline_stage', stage)
  query = query.eq('custom_fields->>assigned_to', assignedTo)
  ```

  These queries do full table scans because there's no index on `custom_fields->>proline_pipeline`. With thousands of projects, this will be slow.

- **Solution**: Create expression indexes:
  ```sql
  CREATE INDEX idx_projects_proline_pipeline
  ON projects ((custom_fields->>'proline_pipeline'));

  CREATE INDEX idx_projects_proline_stage
  ON projects ((custom_fields->>'proline_stage'));
  ```

  Or migrate these fields to proper columns if queried frequently.
- **Verification**: Run EXPLAIN ANALYZE on query, confirm index scan not seq scan

#### [API-006] No Caching Headers

- **Target**: All API routes
- **Assessment**: No Cache-Control headers set on any response. Every request hits the database, even for data that rarely changes (settings, templates, static lists).

- **Solution**: Add caching for appropriate endpoints:
  ```typescript
  // For rarely-changing data
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // 5 min cache
    }
  })

  // For user-specific dynamic data
  'Cache-Control': 'private, no-cache'
  ```
- **Verification**: Check response headers, confirm Cache-Control present

### MEDIUM

#### [API-007] Over-Fetching in List Endpoints

- **Target**: `app/api/projects/route.ts:42-78`
- **Assessment**: List endpoint returns 25+ fields per project including full contact and adjuster objects. For a list view showing name/status/value, this is excessive data transfer.

- **Solution**: Create separate endpoints or use field selection:
  ```typescript
  // List endpoint returns minimal fields
  .select('id, name, status, pipeline_stage, estimated_value')

  // Detail endpoint returns everything
  .select('*, contact(*), adjuster(*)')
  ```
- **Verification**: Compare payload sizes before/after, target 50% reduction

#### [API-008] Inconsistent Zod Validation Usage

- **Target**: Various routes
- **Assessment**:
  - Contacts route uses Zod validation ✅
  - Signature-documents route uses Zod for signature_fields ✅
  - Projects route has no validation ❌
  - Events route has no validation ❌
  - Tasks route has no validation ❌

  No consistent pattern for which routes validate input.

- **Solution**: Create validation schemas for ALL entities in `lib/validations/`:
  ```
  lib/validations/
  ├── contact.ts ✅ (exists)
  ├── project.ts ❌ (missing)
  ├── task.ts ❌ (missing)
  ├── event.ts ❌ (missing)
  └── signature-document.ts ✅ (partial)
  ```
- **Verification**: Every POST/PATCH route imports and uses a Zod schema

#### [API-009] Missing Pagination Limits

- **Target**: Multiple list endpoints
- **Assessment**: Default limit of 50 in most routes, but no maximum enforced:
  ```typescript
  const limit = parseInt(searchParams.get('limit') || '50')
  ```

  Client can request `?limit=10000` and get all records.

- **Solution**: Enforce maximum limit:
  ```typescript
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  ```
- **Verification**: Request `?limit=10000`, confirm returns max 100

#### [API-010] Contact Creation Has Too Many Side Effects

- **Target**: `app/api/contacts/route.ts:197-268`
- **Assessment**: POST /api/contacts does:
  1. Creates contact
  2. Fetches tenant settings
  3. Optionally creates project
  4. Awards gamification points
  5. Triggers automation workflows

  This violates single responsibility and makes the endpoint slow and hard to test.

- **Solution**: Use event-driven architecture:
  ```typescript
  // Contact route only creates contact
  const contact = await createContact(data)

  // Emit event for side effects
  await emitEvent('contact.created', { contact })

  // Separate handlers process events
  // - ProjectAutoCreator
  // - GamificationAwarder
  // - AutomationTrigger
  ```
- **Verification**: Contact creation time < 500ms, side effects run async

### LOW

#### [API-011] Unused Error Codes

- **Target**: `lib/api/errors.ts`
- **Assessment**: Several error codes are defined but never used:
  - `RATE_LIMIT_EXCEEDED` - no rate limiting
  - `QUICKBOOKS_AUTH_REQUIRED` - may be used in QB integration
  - `SESSION_EXPIRED` - auth uses different flow

- **Solution**: Either implement the features or remove unused codes
- **Verification**: Grep for each error code, confirm used or remove

---

## Route Pattern Analysis

### Routes Reviewed (Sample)

| Route | Lines | Validation | Soft Delete | Issues |
|-------|-------|------------|-------------|--------|
| `/api/contacts` | 289 | ✅ Zod | ✅ Consistent | Minor: side effects |
| `/api/projects` | 204 | ❌ None | ✅ Consistent | API-002, API-005 |
| `/api/tasks` | 199 | ❌ None | ⚠️ IS NULL | API-002, API-004 |
| `/api/events` | 116 | ❌ None | ✅ Consistent | API-001, API-002 |
| `/api/signature-documents` | 272 | ✅ Partial | ✅ Consistent | Good |

### Route Count by Category

| Category | Count | Notes |
|----------|-------|-------|
| Core CRUD | 45 | contacts, projects, tasks, events, etc. |
| Settings | 32 | pipeline-stages, templates, roles |
| Integrations | 28 | QuickBooks, Twilio, Google Calendar |
| Storm/Weather | 18 | alerts, predictions, targeting |
| Signatures | 15 | documents, templates, signing |
| Analytics | 12 | insights, metrics, reports |
| Other | 77 | miscellaneous features |
| **Total** | **227** | |

---

## Database Considerations for NAS

### Current Schema Issues

1. **JSON columns for structured data** - `custom_fields` stores pipeline, stage, assigned_to that should be columns
2. **Missing indexes** - JSONB path queries, frequently filtered columns
3. **No connection pooling config** - Default Supabase pooler settings

### Recommended Indexes

```sql
-- Projects: frequently filtered fields
CREATE INDEX idx_projects_pipeline_stage ON projects(pipeline_stage);
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_custom_fields_pipeline
  ON projects ((custom_fields->>'proline_pipeline'));

-- Contacts: search and filtering
CREATE INDEX idx_contacts_tenant_stage ON contacts(tenant_id, stage);
CREATE INDEX idx_contacts_search_vector ON contacts USING gin(search_vector);

-- Tasks: assignment and status
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to) WHERE is_deleted IS NULL;
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status);
```

---

## Recommendations

### Quick Wins

1. **Escape search parameters** (API-001) - Security fix
2. **Add max limit enforcement** (API-009) - One-line change per route
3. **Standardize soft delete checks** (API-004) - Find/replace

### Medium Effort

4. **Add Zod schemas for all entities** (API-002, API-008)
5. **Add caching headers** (API-006)
6. **Create expression indexes** (API-005)

### Larger Effort

7. **Implement rate limiting** (API-003)
8. **Refactor contact creation side effects** (API-010)
9. **Split list/detail endpoint field selection** (API-007)

---

## Summary for HANDOFF.md

| Issue ID | Priority | Summary |
|----------|----------|---------|
| API-001 | Critical | SQL injection risk in search parameters |
| API-002 | Critical | No input validation on many POST endpoints |
| API-003 | High | Rate limiting not implemented |
| API-004 | High | Inconsistent soft delete handling |
| API-005 | High | JSON path queries not indexed |
| API-006 | High | No caching headers on any response |
| API-007 | Medium | Over-fetching in list endpoints |
| API-008 | Medium | Inconsistent Zod validation usage |
| API-009 | Medium | Missing pagination limits enforcement |
| API-010 | Medium | Contact creation has too many side effects |
| API-011 | Low | Unused error codes defined |
