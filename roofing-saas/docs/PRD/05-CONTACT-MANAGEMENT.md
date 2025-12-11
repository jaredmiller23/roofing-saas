# Contact Management System

## Overview

The Contact Management System is the central hub for managing all leads, prospects, and customers in the Roofing SAAS platform. It provides comprehensive CRM (Customer Relationship Management) capabilities tailored specifically for roofing contractors, including property-specific fields, insurance tracking, and lead management workflows.

The system supports both individual contacts (homeowners, adjusters) and organizations (companies, sub-contractors), unified into a single `contacts` table with a flexible type system. This architecture was established in the November 2025 migration that merged the separate `organizations` table into `contacts` for a streamlined data model.

## User Stories

### Sales Representatives
- As a sales rep, I want to quickly add new leads from door-knocking so I can capture contact information in the field
- As a sales rep, I want to search and filter contacts by stage and priority so I can focus on the most promising leads
- As a sales rep, I want to see quick action buttons for call, text, and email so I can contact leads without navigation
- As a sales rep, I want to track property details (roof type, age, square footage) so I have context for estimates

### Project Managers
- As a project manager, I want to view a contact's complete history including photos and projects
- As a project manager, I want to update contact stages as deals progress through the pipeline
- As a project manager, I want to capture insurance information for claims processing

### Office Staff
- As office staff, I want to perform bulk actions on contacts to update stages or priorities efficiently
- As office staff, I want to filter contacts by assigned sales rep to review team workloads
- As office staff, I want to see organization contacts separately from individual homeowners

### Administrators
- As an admin, I want contact data isolated by tenant so multi-tenant security is maintained
- As an admin, I want soft deletes on contacts so data can be recovered if needed

## Features

### 1. Contact CRUD Operations

Full create, read, update, and delete functionality for contacts with validation.

**Implementation:**
- File: `/app/api/contacts/route.ts` - GET (list) and POST (create) handlers
- File: `/app/api/contacts/[id]/route.ts` - GET (single), PATCH (update), DELETE (soft delete)
- File: `/lib/validations/contact.ts` - Zod schemas for input validation

**Key Behaviors:**
- Create: Validates with `createContactSchema`, auto-assigns tenant_id from session, awards gamification points
- Update: Validates with `updateContactSchema`, preserves tenant isolation
- Delete: Performs soft delete (sets `is_deleted = true`), data remains recoverable
- Duplicate prevention: Unique constraint on `(tenant_id, email)` prevents duplicate emails per tenant

### 2. Contact Types and Categories

Unified type system supporting both individuals and organizations with flexible categorization.

**Contact Types (Sales Stage):**
| Type | Description |
|------|-------------|
| `lead` | New contact, not yet qualified |
| `prospect` | Qualified, actively being worked |
| `customer` | Converted, has done business |

**Contact Stages (Pipeline Stage):**
| Stage | Description |
|-------|-------------|
| `new` | Just added to the system |
| `contacted` | Initial outreach made |
| `qualified` | Confirmed as a good fit |
| `proposal` | Quote/proposal sent |
| `negotiation` | In active discussions |
| `won` | Deal closed successfully |
| `lost` | Deal did not close |

**Contact Categories:**
| Category | Description |
|----------|-------------|
| `homeowner` | Individual property owner (default) |
| `adjuster` | Insurance adjuster |
| `sub_contractor` | Subcontractor company |
| `real_estate_agent` | Real estate professional |
| `developer` | Property developer |
| `property_manager` | Property management company |
| `local_business` | Local business entity |
| `other` | Uncategorized |

**Implementation:**
- File: `/lib/types/contact.ts` - TypeScript types and helper functions
- Functions: `getCombinedTypeLabel()`, `formatCategory()`, `formatType()`, `formatStage()`

### 3. Contact Form

Comprehensive form component for creating and editing contacts with roofing-specific fields.

**Form Sections:**
1. **Basic Information**: First name, last name, email, phone, mobile phone, organization flag, company, website, category, type, stage, priority, source
2. **Address**: Street, city, state (2-char), ZIP code
3. **Property Details**: Property type, roof type, roof age, square footage, stories
4. **Insurance Information**: Insurance carrier, policy number

**Implementation:**
- File: `/components/contacts/contact-form.tsx`
- Props: `contact?: Contact`, `mode?: 'create' | 'edit'`
- Form handles both create and edit modes with proper API method selection

### 4. Search and Filtering

Multi-faceted search with full-text search, filters, and quick filter chips.

**Search Capabilities:**
- Full-text search via PostgreSQL `tsvector` on name, email, phone, company
- Filter by type, stage, priority, assigned user
- Quick filter chips for common queries (Urgent, High Priority, New Leads, Active Deals, Customers)

**Implementation:**
- File: `/components/contacts/contacts-search.tsx` - Search UI with filters
- File: `/components/contacts/contacts-with-filters.tsx` - Coordinator component with FilterBar
- API: Query params `search`, `type`, `stage`, `priority`, `assigned_to`, `page`, `limit`, `sort_by`, `sort_order`

### 5. Contacts Table

Data table with sorting, pagination, bulk actions, and inline quick actions.

**Table Features:**
- Sortable columns: Name, Email, Phone, Stage, Type
- Bulk selection with select-all checkbox
- Bulk actions: Change Stage, Change Priority, Delete
- Quick action buttons: Phone call, SMS text, Email (native app links)
- Pagination with page navigation

**Implementation:**
- File: `/components/contacts/contacts-table.tsx`
- State: Manages `contacts[]`, `loading`, `error`, `total`, `page`, `selectedContacts`
- Bulk action handlers call individual API endpoints for each selected contact

### 6. Contact Detail View

Read-only detail page showing all contact information organized in sections.

**Sections Displayed:**
- Header with name, type badge, stage badge, substatus selector
- Contact Information (email, phone, mobile, source)
- Address (conditional, only if data present)
- Property Details (conditional)
- Insurance Information (conditional)
- Property Photos (PhotoManager component)

**Implementation:**
- File: `/app/(dashboard)/contacts/[id]/page.tsx`
- Server component with direct Supabase query
- Includes `PhotoManager` for property photo gallery
- Includes `ContactSubstatusManager` for substatus updates

### 7. Substatus Management

Configurable substatus values per contact stage for fine-grained tracking.

**Implementation:**
- File: `/components/contacts/ContactSubstatusManager.tsx`
- Uses `/api/substatus/configs` endpoint to fetch available substatuses
- Updates contact via PATCH to `/api/contacts/[id]`

## Technical Implementation

### Architecture

The Contact Management system follows Next.js App Router patterns:

```
app/
├── (dashboard)/
│   └── contacts/
│       ├── page.tsx           # List view (server component)
│       ├── new/
│       │   └── page.tsx       # Create form (server component)
│       └── [id]/
│           ├── page.tsx       # Detail view (server component)
│           └── edit/
│               └── page.tsx   # Edit form (server component)
├── api/
│   └── contacts/
│       ├── route.ts           # GET list, POST create
│       └── [id]/
│           └── route.ts       # GET, PATCH, DELETE

components/
└── contacts/
    ├── contact-form.tsx           # Create/edit form
    ├── contacts-table.tsx         # Data table with actions
    ├── contacts-search.tsx        # Search and filters
    ├── contacts-with-filters.tsx  # Filter coordinator
    └── ContactSubstatusManager.tsx # Substatus selector
```

### Key Files

| File | Purpose |
|------|---------|
| `/app/api/contacts/route.ts` | List and create API handlers |
| `/app/api/contacts/[id]/route.ts` | Single contact CRUD handlers |
| `/lib/types/contact.ts` | TypeScript types, interfaces, helper functions |
| `/lib/validations/contact.ts` | Zod validation schemas |
| `/components/contacts/contact-form.tsx` | Contact form component (520+ lines) |
| `/components/contacts/contacts-table.tsx` | Data table with bulk actions (440+ lines) |
| `/components/contacts/contacts-search.tsx` | Search and filter UI (300+ lines) |
| `/app/(dashboard)/contacts/page.tsx` | Contacts list page |
| `/app/(dashboard)/contacts/[id]/page.tsx` | Contact detail page |
| `/app/(dashboard)/contacts/[id]/edit/page.tsx` | Edit contact page |
| `/app/(dashboard)/contacts/new/page.tsx` | New contact page |

### Data Flow

**Create Contact Flow:**
```
ContactForm → POST /api/contacts → Validate (Zod) → Insert (Supabase) → Award Points → Trigger Workflows → Return contact
```

**List Contacts Flow:**
```
ContactsPage → ContactsWithFilters → ContactsSearch + ContactsTable → GET /api/contacts → Query (Supabase with filters) → Return paginated data
```

**Update Contact Flow:**
```
ContactForm (edit mode) → PATCH /api/contacts/[id] → Validate → Update (Supabase) → Return contact
```

**Delete Contact Flow:**
```
ContactsTable delete button → DELETE /api/contacts/[id] → Soft delete (is_deleted=true) → Return success
```

## API Endpoints

### GET /api/contacts

List contacts with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Full-text search term |
| `type` | string | - | Filter by type (lead/prospect/customer) |
| `stage` | string | - | Filter by stage |
| `priority` | string | - | Filter by priority |
| `assigned_to` | uuid | - | Filter by assigned user |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 5000) |
| `sort_by` | string | created_at | Column to sort by |
| `sort_order` | string | desc | Sort direction (asc/desc) |

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [...],
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_more": true
  }
}
```

### POST /api/contacts

Create a new contact.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "615-555-1234",
  "contact_category": "homeowner",
  "type": "lead",
  "stage": "new",
  "address_street": "123 Main St",
  "address_city": "Nashville",
  "address_state": "TN",
  "address_zip": "37201"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contact": { ... }
  }
}
```

### GET /api/contacts/[id]

Get a single contact by ID.

**Response:**
```json
{
  "contact": { ... }
}
```

### PATCH /api/contacts/[id]

Update a contact.

**Request Body:** Partial contact fields to update

**Response:**
```json
{
  "contact": { ... }
}
```

### DELETE /api/contacts/[id]

Soft delete a contact.

**Response:**
```json
{
  "success": true
}
```

## Data Models

### Contact

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `tenant_id` | uuid | yes | Multi-tenant isolation |
| `created_at` | timestamp | auto | Creation timestamp |
| `updated_at` | timestamp | auto | Last update timestamp |
| `created_by` | uuid | no | User who created |
| `is_deleted` | boolean | auto | Soft delete flag |
| `first_name` | varchar(100) | yes | First name |
| `last_name` | varchar(100) | yes | Last name |
| `email` | varchar(255) | no | Email address |
| `phone` | varchar(20) | no | Phone number |
| `mobile_phone` | varchar(20) | no | Mobile phone |
| `is_organization` | boolean | auto | Organization flag |
| `company` | text | no | Company name |
| `website` | text | no | Website URL |
| `contact_category` | text | yes | Category enum |
| `address_street` | varchar(255) | no | Street address |
| `address_city` | varchar(100) | no | City |
| `address_state` | varchar(2) | no | State code |
| `address_zip` | varchar(10) | no | ZIP code |
| `latitude` | decimal | no | GPS latitude |
| `longitude` | decimal | no | GPS longitude |
| `type` | varchar(50) | auto | Sales type (default: lead) |
| `stage` | varchar(50) | auto | Pipeline stage (default: new) |
| `substatus` | varchar(100) | no | Substatus within stage |
| `source` | varchar(100) | no | Lead source |
| `source_details` | jsonb | no | Source metadata |
| `assigned_to` | uuid | no | Assigned user |
| `property_type` | varchar(50) | no | Property type |
| `roof_type` | varchar(100) | no | Roof material |
| `roof_age` | integer | no | Roof age in years |
| `last_inspection_date` | date | no | Last inspection |
| `property_value` | decimal | no | Property value |
| `square_footage` | integer | no | Property size |
| `stories` | integer | no | Building stories |
| `insurance_carrier` | varchar(100) | no | Insurance company |
| `policy_number` | varchar(100) | no | Insurance policy |
| `claim_number` | varchar(100) | no | Insurance claim |
| `deductible` | decimal | no | Deductible amount |
| `lead_score` | integer | auto | Computed lead score |
| `priority` | varchar(20) | auto | Priority level |
| `custom_fields` | jsonb | auto | Flexible custom data |
| `tags` | text[] | no | Contact tags |
| `search_vector` | tsvector | auto | Full-text search |

### Database Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_contacts_tenant` | tenant_id | Tenant isolation queries |
| `idx_contacts_stage` | tenant_id, stage | Stage filtering |
| `idx_contacts_assigned` | tenant_id, assigned_to | Assignment queries |
| `idx_contacts_search` | search_vector | Full-text search |
| `idx_contacts_is_organization` | is_organization | Organization filtering |
| `idx_contacts_company` | company | Company name lookup |
| `idx_contacts_company_gin` | to_tsvector(company) | Company text search |
| `idx_contacts_contact_category` | contact_category | Category filtering |
| `idx_contacts_type_category` | type, contact_category | Combined type queries |

## Integration Points

### Gamification System
- Creating a contact awards points via `awardPointsSafe()`
- Point value defined in `POINT_VALUES.CONTACT_CREATED`
- File: `/lib/gamification/award-points.ts`

### Automation Workflows
- Contact creation triggers `contact_created` workflow event
- File: `/lib/automation/engine.ts`
- Allows automated follow-ups, assignments, notifications

### Photo Management
- Contact detail page includes `PhotoManager` component
- Photos linked via `contactId` to Supabase storage
- File: `/components/photos/`

### Projects
- Contacts link to projects via `projects.contact_id` foreign key
- One contact can have multiple projects

### Multi-tenant Security
- All queries filtered by `tenant_id` from session
- Row-Level Security (RLS) policies enforce isolation at database level
- Tenant ID derived from `getUserTenantId()` session helper

## Configuration

### Environment Variables

No contact-specific environment variables. Uses standard Supabase configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Validation Limits

| Field | Limit |
|-------|-------|
| `first_name` | 1-100 chars |
| `last_name` | 1-100 chars |
| `company` | max 200 chars |
| `address_state` | max 2 chars |
| `address_zip` | max 10 chars |
| `substatus` | max 100 chars |
| `roof_age` | 0-200 years |
| `stories` | 1-10 |
| `pagination limit` | max 5000 |

## Testing

### E2E Test Coverage

Contact-related E2E tests are included in multi-feature test files:
- `/e2e/multi-tenant.spec.ts` - Tests tenant isolation for contacts
- `/e2e/projects.comprehensive.spec.ts` - Tests contact-project relationships
- `/e2e/storm-leads.spec.ts` - Tests storm targeting contact workflows

### Manual Testing Checklist

1. [ ] Create contact with all fields
2. [ ] Create contact with minimal fields (first/last name only)
3. [ ] Edit existing contact
4. [ ] Delete contact (verify soft delete)
5. [ ] Search contacts by name
6. [ ] Filter by stage, type, priority
7. [ ] Sort by different columns
8. [ ] Paginate through large contact lists
9. [ ] Bulk select and change stage
10. [ ] Bulk select and delete
11. [ ] Quick actions (call, text, email links)
12. [ ] Verify tenant isolation (contacts don't leak between tenants)

## Security

### Authentication
- All API routes require authenticated user via `getCurrentUser()`
- Unauthenticated requests return 401

### Authorization
- User must belong to a tenant via `getUserTenantId()`
- Users without tenant return 403

### Data Isolation
- All queries include `tenant_id` filter
- Database RLS policies provide defense-in-depth
- Soft delete preserves audit trail

### Duplicate Prevention
- Unique constraint on `(tenant_id, email)` prevents duplicate emails within tenant
- API returns 409 Conflict for duplicate email attempts

## Performance Notes

### Full-Text Search
- Uses PostgreSQL `tsvector` for efficient full-text search
- Search vector includes: first_name, last_name, company, email, phone
- Websearch syntax supported for boolean queries

### Pagination
- Default limit: 20 items per page
- Maximum limit: 5000 items
- Uses Supabase `.range()` for efficient offset pagination

### Bulk Operations
- Bulk actions process contacts in parallel via `Promise.all()`
- Each contact update is a separate API call (no batch endpoint)

---

## Validation Record

### Files Examined
1. `/Users/ccai/roofing saas/roofing-saas/lib/types/contact.ts` - Contact type definitions, 233 lines
2. `/Users/ccai/roofing saas/roofing-saas/app/api/contacts/route.ts` - List/create API, 205 lines
3. `/Users/ccai/roofing saas/roofing-saas/app/api/contacts/[id]/route.ts` - CRUD API, 173 lines
4. `/Users/ccai/roofing saas/roofing-saas/lib/validations/contact.ts` - Zod schemas, 103 lines
5. `/Users/ccai/roofing saas/roofing-saas/components/contacts/contact-form.tsx` - Form component, 527 lines
6. `/Users/ccai/roofing saas/roofing-saas/components/contacts/contacts-table.tsx` - Table component, 442 lines
7. `/Users/ccai/roofing saas/roofing-saas/components/contacts/contacts-search.tsx` - Search component, 309 lines
8. `/Users/ccai/roofing saas/roofing-saas/components/contacts/contacts-with-filters.tsx` - Filter coordinator, 104 lines
9. `/Users/ccai/roofing saas/roofing-saas/components/contacts/ContactSubstatusManager.tsx` - Substatus manager, 89 lines
10. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/contacts/page.tsx` - List page, 49 lines
11. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/contacts/[id]/page.tsx` - Detail page, 209 lines
12. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/contacts/[id]/edit/page.tsx` - Edit page, 70 lines
13. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/contacts/new/page.tsx` - New page, 32 lines
14. `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql` - Database schema definition
15. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000600_merge_organizations_into_contacts.sql` - Organizations merge migration, 513 lines

### Archon RAG Queries
- Query: "Supabase full-text search tsvector PostgreSQL" - Found LangChain vector store docs (not directly applicable but confirmed Supabase search patterns)

### Verification Steps
1. Verified Contact interface in `/lib/types/contact.ts` matches database schema - 35+ fields confirmed
2. Verified API routes exist and have documented handlers (GET, POST, PATCH, DELETE)
3. Verified Zod validation schemas match TypeScript types
4. Verified form fields in `contact-form.tsx` match Contact interface
5. Verified table columns and actions in `contacts-table.tsx`
6. Verified search parameters match API handler in `route.ts`
7. Verified contact categories and types match database constraints from migration
8. Verified soft delete implementation (is_deleted flag)
9. Verified gamification integration with `awardPointsSafe()` in POST handler
10. Verified automation trigger with `triggerWorkflow()` in POST handler
11. Verified PhotoManager integration in detail page

### Validated By
PRD Documentation Agent - Session 7
Date: 2025-12-11T00:35:00Z
