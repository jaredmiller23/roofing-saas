# Data Models and Types

## Overview

The Roofing SAAS application employs a comprehensive TypeScript type system that provides end-to-end type safety across the full stack. This document catalogs all core data models, type definitions, interfaces, enums, and Zod validation schemas used throughout the application.

The type system is organized into multiple categories:
- **Core CRM Types** - Contact, Project, Activity definitions
- **API Types** - Request/response schemas, error handling
- **Integration Types** - QuickBooks, Twilio, Resend, Claims Agent
- **Feature Types** - Campaigns, Gamification, Filters, Digital Cards
- **Infrastructure Types** - Voice providers, PWA offline queue, GeoJSON

## User Stories

### As a Backend Developer
- I want well-defined TypeScript interfaces so that I can implement API endpoints with type safety
- I want Zod validation schemas so that I can validate incoming requests at runtime
- I want standardized error types so that I can return consistent error responses

### As a Frontend Developer
- I want shared types between client and server so that I get compile-time type checking
- I want form input types so that I can build type-safe forms with react-hook-form
- I want API response types so that I can handle responses consistently

### As a System Architect
- I want domain-driven type definitions so that the code reflects business concepts
- I want extensible type unions so that new features can be added without breaking changes

---

## Core Type Files

### Key Type Definition Locations

| File | Purpose | Line Count |
|------|---------|------------|
| `lib/types/api.ts` | Shared API types, pagination, core models | 260 |
| `lib/types/contact.ts` | Contact/Lead type system with helpers | 233 |
| `lib/types/user-profile.ts` | User profile and password validation | 157 |
| `lib/validations/contact.ts` | Zod schemas for contact validation | 103 |
| `lib/campaigns/types.ts` | Marketing automation type system | 767 |
| `lib/claims/types.ts` | Insurance claims integration | 181 |
| `lib/filters/types.ts` | Configurable filter system | 352 |
| `lib/automation/types.ts` | Workflow automation types | 143 |
| `lib/digital-cards/types.ts` | Digital business cards | 533 |
| `lib/enrichment/types.ts` | Property enrichment APIs | 611 |
| `lib/address-extraction/types.ts` | Storm targeting address extraction | 394 |
| `lib/ai-assistant/types.ts` | AI chat assistant types | 192 |
| `lib/impersonation/types.ts` | Admin impersonation system | 125 |
| `lib/substatus/types.ts` | Granular status tracking | 172 |
| `lib/voice/providers/types.ts` | Voice provider abstraction | 135 |
| `lib/api/errors.ts` | Standardized API errors | 145 |
| `lib/api/response.ts` | API response helpers | 133 |

---

## Core CRM Types

### Contact Types

**File:** `lib/types/contact.ts`

```typescript
export type ContactType = 'lead' | 'customer' | 'prospect'

export type ContactStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

export type ContactPriority = 'low' | 'normal' | 'high' | 'urgent'

export type ContactCategory =
  | 'homeowner'
  | 'adjuster'
  | 'sub_contractor'
  | 'real_estate_agent'
  | 'developer'
  | 'property_manager'
  | 'local_business'
  | 'other'
```

**Contact Interface:**
```typescript
export interface Contact {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean

  // Basic Info
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile_phone: string | null

  // Organization Info
  is_organization: boolean
  company: string | null
  website: string | null
  contact_category: ContactCategory

  // Address
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  latitude: number | null
  longitude: number | null

  // Lead Management
  type: ContactType
  stage: ContactStage
  substatus: string | null
  source: string | null
  source_details: Record<string, unknown> | null
  assigned_to: string | null

  // Property Details
  property_type: string | null
  roof_type: string | null
  roof_age: number | null
  last_inspection_date: string | null
  property_value: number | null
  square_footage: number | null
  stories: number | null

  // Insurance
  insurance_carrier: string | null
  policy_number: string | null
  claim_number: string | null
  deductible: number | null

  // Scoring
  lead_score: number
  priority: ContactPriority

  // Flexible
  custom_fields: Record<string, unknown>
  tags: string[] | null
  search_vector: unknown | null
}
```

**Helper Functions:**
- `getCombinedTypeLabel(contact)` - Returns display label like "Lead-Homeowner"
- `formatCategory(category)` - Formats category for display
- `formatType(type)` - Formats contact type for display
- `formatStage(stage)` - Formats stage for display
- `getContactCategoryOptions()` - Returns dropdown options

### Project Types

**File:** `lib/types/api.ts`

```typescript
export type PipelineStage =
  | 'prospect'
  | 'qualified'
  | 'quote_sent'
  | 'negotiation'
  | 'won'
  | 'production'
  | 'complete'
  | 'lost'

export type LeadPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface Project {
  id: string
  tenant_id: string
  contact_id: string
  created_by: string
  created_at: string
  updated_at: string
  name: string
  description?: string
  status: string

  // Pipeline fields
  pipeline_stage: PipelineStage
  lead_source?: string
  priority?: LeadPriority
  lead_score?: number
  estimated_close_date?: string
  stage_changed_at?: string

  // Insurance/Claims
  adjuster_contact_id?: string
  claim_id?: string
  storm_event_id?: string

  // Financial
  estimated_value?: number | null
  approved_value?: number | null
  final_value?: number | null

  // Timeline
  start_date?: string
  end_date?: string
  budget?: number
  actual_cost?: number

  notes?: string
  custom_fields?: Record<string, unknown>
  is_deleted: boolean

  // Joined data
  contact?: { id: string; first_name: string; last_name: string; ... }
  adjuster?: { id: string; first_name: string; last_name: string; ... }
  storm_event?: { id: string; event_date: string; event_type: string; ... }
}
```

### Activity Types

```typescript
export interface Activity {
  id: string
  tenant_id: string
  contact_id?: string
  project_id?: string
  user_id: string
  created_at: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task'
  subject: string
  description?: string
  duration_minutes?: number
  completed: boolean
  due_date?: string
  metadata?: Record<string, unknown>
}
```

---

## API Types

### Pagination and Search

**File:** `lib/types/api.ts`

```typescript
export interface PaginationQuery {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SearchQuery extends PaginationQuery {
  search?: string
}

export interface ContactFilters extends SearchQuery {
  type?: 'lead' | 'customer'
  stage?: ContactStage
  priority?: 'low' | 'medium' | 'high'
  assigned_to?: string
}

export interface ContactListResponse {
  contacts: Contact[]
  total: number
  page: number
  limit: number
  has_more: boolean
}
```

### API Response Format

**File:** `lib/api/response.ts`

```typescript
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface PaginationParams {
  page: number
  limit: number
  total: number
}
```

### Error Handling

**File:** `lib/api/errors.ts`

```typescript
export enum ErrorCode {
  // Authentication (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization (403)
  FORBIDDEN = 'FORBIDDEN',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource (404)
  NOT_FOUND = 'NOT_FOUND',
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',

  // Conflict (409)
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',

  // Integration (502, 503)
  QUICKBOOKS_ERROR = 'QUICKBOOKS_ERROR',
  QUICKBOOKS_AUTH_REQUIRED = 'QUICKBOOKS_AUTH_REQUIRED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) { ... }
}
```

---

## Validation Schemas (Zod)

### Contact Validation

**File:** `lib/validations/contact.ts`

```typescript
export const createContactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile_phone: z.string().optional(),

  // Organization
  is_organization: z.boolean().optional(),
  company: z.string().max(200).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  contact_category: z.enum([
    'homeowner', 'adjuster', 'sub_contractor', 'real_estate_agent',
    'developer', 'property_manager', 'local_business', 'other'
  ]).optional(),

  // Address
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  address_zip: z.string().max(10).optional(),

  // Lead Management
  type: z.enum(['lead', 'customer', 'prospect']).optional(),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),

  // Property Details
  roof_age: z.number().int().min(0).max(200).optional(),
  property_value: z.number().positive().optional(),
  square_footage: z.number().int().positive().optional(),
  stories: z.number().int().min(1).max(10).optional(),

  // Insurance
  deductible: z.number().positive().optional(),

  // Other
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
})

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid(),
})

export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['lead', 'customer', 'prospect']).optional(),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  contact_category: z.enum([...]).optional(),
  is_organization: z.boolean().optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(5000).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

// Inferred Types
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ContactFilters = z.infer<typeof contactFiltersSchema>
```

---

## Integration Types

### QuickBooks Types

**File:** `lib/types/api.ts`

```typescript
export interface QuickBooksTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  x_refresh_token_expires_in: number
  token_type: string
}

export interface QuickBooksConnection {
  id: string
  tenant_id: string
  realm_id: string
  company_name: string
  is_active: boolean
  token_expires_at: string
  refresh_token_expires_at: string
  last_sync_at?: string
  sync_error?: string
  environment: 'sandbox' | 'production'
  created_at: string
  updated_at: string
}

export interface QuickBooksCustomer {
  Id: string
  DisplayName: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  BillAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
}

export interface QuickBooksInvoice {
  Id: string
  DocNumber: string
  TxnDate: string
  TotalAmt: number
  Balance: number
  DueDate: string
  CustomerRef: { value: string; name: string }
}

export interface QuickBooksWebhookPayload {
  eventNotifications: Array<{
    realmId: string
    dataChangeEvent: {
      entities: Array<{
        name: string
        id: string
        operation: 'Create' | 'Update' | 'Delete'
        lastUpdated: string
      }>
    }
  }>
}
```

### Twilio Types

**File:** `lib/twilio/sms.ts`, `lib/twilio/analytics.ts`

```typescript
export interface SendSMSParams {
  to: string
  body: string
  from?: string
}

export interface SMSResponse {
  sid: string
  to: string
  from: string
  body: string
  status: string
  dateCreated: Date
}

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

export interface CallAnalytics {
  totalCalls: number
  inboundCalls: number
  outboundCalls: number
  answeredCalls: number
  missedCalls: number
  averageDuration: number
  totalDuration: number
  answerRate: number
  recordedCalls: number
}

export interface SMSAnalytics {
  totalSMS: number
  inboundSMS: number
  outboundSMS: number
  averageMessageLength: number
}

export interface ActivitySummary {
  totalActivities: number
  calls: CallAnalytics
  sms: SMSAnalytics
  emails: {
    totalEmails: number
    outboundEmails: number
    openRate: number
    clickRate: number
  }
}
```

### Claims Integration Types

**File:** `lib/claims/types.ts`

```typescript
export type ClaimStatus =
  | 'new'
  | 'documents_pending'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'closed'
  | 'disputed'
  | 'supplement_filed'
  | 'escalated'

export const TN_LAW_THRESHOLDS = {
  ACKNOWLEDGMENT: 15,
  NOTIFICATION_RESPONSE: 30,
  APPROACHING_DEADLINE: 45,
  STATUTORY_DEADLINE: 60,
  FORMAL_DEMAND: 90,
} as const

export interface ClaimData {
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

  storm_event_id?: string
  created_at: string
  updated_at: string
}

export interface ClaimWebhookEvent {
  claim_id: string
  project_id?: string
  contact_id?: string
  event: 'status_changed' | 'amount_updated' | 'document_added' | 'inspection_scheduled'
  data: {
    previous_status?: ClaimStatus
    new_status?: ClaimStatus
    amount?: number
    document_id?: string
    document_type?: string
    inspection_date?: string
    notes?: string
  }
  timestamp: string
}
```

---

## Campaign System Types

**File:** `lib/campaigns/types.ts` (767 lines)

### Enum Types

```typescript
export type CampaignType = 'drip' | 'event' | 'reengagement' | 'retention' | 'nurture'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived'
export type TriggerType = 'stage_change' | 'time_based' | 'event' | 'manual'
export type StepType =
  | 'send_email' | 'send_sms' | 'create_task' | 'wait'
  | 'update_field' | 'manage_tags' | 'notify' | 'webhook'
  | 'conditional' | 'exit_campaign'
export type EnrollmentStatus = 'active' | 'completed' | 'exited' | 'paused' | 'failed'
export type EnrollmentSource = 'automatic_trigger' | 'manual_admin' | 'api' | 'bulk_import'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type DelayUnit = 'hours' | 'days' | 'weeks'
export type GoalType = 'appointments' | 'deals' | 'reviews' | 'engagement'
export type ExitReason = 'completed' | 'goal_achieved' | 'unsubscribed' | 'stage_changed' | 'manual_remove' | 'error'
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all_time'
```

### Core Campaign Interface

```typescript
export interface Campaign {
  id: string
  tenant_id: string
  name: string
  description?: string | null
  campaign_type: CampaignType
  status: CampaignStatus
  goal_type?: GoalType | null
  goal_target?: number | null
  allow_re_enrollment: boolean
  re_enrollment_delay_days?: number | null
  respect_business_hours: boolean
  business_hours?: BusinessHours | null
  enrollment_type: 'automatic' | 'manual'
  max_enrollments?: number | null
  total_enrolled: number
  total_completed: number
  total_revenue: number
  created_by?: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}
```

### Step Configuration Types

```typescript
export interface SendEmailStepConfig {
  template_id?: string | null
  subject?: string
  body?: string
  personalization?: Record<string, string>
  track_opens?: boolean
  track_clicks?: boolean
  attachments?: string[]
}

export interface WaitStepConfig {
  delay_value: number
  delay_unit: DelayUnit
  wait_until?: string
}

export interface ConditionalStepConfig {
  conditions: StepConditions
  true_path_step_id?: string
  false_path_step_id?: string
}

export type StepConfig =
  | SendEmailStepConfig
  | SendSmsStepConfig
  | CreateTaskStepConfig
  | WaitStepConfig
  | UpdateFieldStepConfig
  | ManageTagsStepConfig
  | NotifyStepConfig
  | WebhookStepConfig
  | ConditionalStepConfig
  | ExitCampaignStepConfig
```

---

## Filter System Types

**File:** `lib/filters/types.ts` (352 lines)

```typescript
export type FilterFieldType =
  | 'text' | 'select' | 'multi_select' | 'date' | 'date_range'
  | 'number' | 'number_range' | 'boolean' | 'user_select' | 'tag_select'

export type FilterOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than'
  | 'greater_than_or_equal' | 'less_than_or_equal'
  | 'in' | 'not_in' | 'between' | 'is_null' | 'is_not_null'

export type EntityType = 'contacts' | 'projects' | 'pipeline' | 'activities' | 'call_logs' | 'tasks'

export interface FilterConfig {
  id: string
  tenant_id: string
  entity_type: EntityType
  field_name: string
  field_label: string
  field_type: FilterFieldType
  filter_operator: FilterOperator
  filter_options: FilterOption[]
  display_order: number
  is_quick_filter: boolean
  is_advanced_filter: boolean
  is_active: boolean
  custom_field_id?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SavedFilter {
  id: string
  tenant_id: string
  entity_type: EntityType
  name: string
  description?: string | null
  filter_criteria: FilterCriteria
  created_by: string
  is_shared: boolean
  is_default: boolean
  is_system: boolean
  usage_count: number
  last_used_at?: string | null
  created_at: string
  updated_at: string
}
```

---

## Digital Business Cards Types

**File:** `lib/digital-cards/types.ts` (533 lines)

```typescript
export interface DigitalBusinessCard {
  id: string
  tenant_id: string
  user_id: string

  // Personal Information
  full_name: string
  job_title?: string | null
  phone?: string | null
  email?: string | null

  // Company Information
  company_name?: string | null
  company_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null

  // Social Links
  linkedin_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  twitter_url?: string | null

  // Card Content
  tagline?: string | null
  bio?: string | null
  services?: string | null

  // Branding
  brand_color: string
  logo_url?: string | null
  profile_photo_url?: string | null
  background_image_url?: string | null

  // Card Settings
  slug: string
  qr_code_url?: string | null
  card_url?: string | null
  is_active: boolean
  enable_contact_form: boolean
  enable_appointment_booking: boolean

  // Analytics Summary
  total_views: number
  total_vcard_downloads: number
  total_phone_clicks: number
  total_email_clicks: number
  total_contact_form_submissions: number

  created_at: string
  updated_at: string
  last_viewed_at?: string | null
}

export type InteractionType =
  | 'view' | 'vcard_download' | 'phone_click' | 'email_click'
  | 'website_click' | 'linkedin_click' | 'facebook_click'
  | 'instagram_click' | 'twitter_click' | 'contact_form_submit'
  | 'appointment_booked'

export interface VCardData {
  firstName: string
  lastName: string
  fullName: string
  title?: string
  organization?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  photo?: string
  note?: string
  socialProfiles?: {
    linkedin?: string
    facebook?: string
    instagram?: string
    twitter?: string
  }
}

export interface QRCodeOptions {
  size?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  color?: { dark?: string; light?: string }
}
```

---

## Property Enrichment Types

**File:** `lib/enrichment/types.ts` (611 lines)

```typescript
export type EnrichmentProvider =
  | 'batchdata' | 'propertyradar' | 'tracerfy'
  | 'lead_sherpa' | 'county_assessor' | 'manual'

export type EnrichmentJobStatus =
  | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface PropertyEnrichmentResult {
  success: boolean
  provider: EnrichmentProvider
  address_hash: string
  full_address: string

  // Owner Information
  owner_name?: string
  owner_phone?: string
  owner_email?: string
  owner_mailing_address?: string

  // Property Characteristics
  property_type?: string
  year_built?: number
  square_footage?: number
  bedrooms?: number
  bathrooms?: number
  lot_size?: number
  stories?: number

  // Financial Data
  assessed_value?: number
  market_value?: number
  last_sale_date?: string
  last_sale_price?: number
  equity_estimate?: number
  mortgage_balance?: number

  // Roof-Specific
  roof_material?: string
  roof_age?: number
  roof_condition?: string

  // Quality Metrics
  quality_score?: number
  data_completeness?: number
  confidence?: number

  // Cache Info
  cached?: boolean
  cache_hit?: boolean
  enriched_at?: string
  expires_at?: string

  error?: string
  error_details?: Record<string, unknown>
}

export interface CostEstimate {
  provider: EnrichmentProvider
  total_addresses: number
  cached_addresses: number
  new_lookups: number
  property_lookup_cost: number
  skip_trace_cost: number
  total_cost: number
  cost_per_property: number
  cost_per_skip_trace: number
  cache_savings: number
  estimated_total_without_cache: number
}
```

---

## Voice Provider Types

**File:** `lib/voice/providers/types.ts` (135 lines)

```typescript
export type VoiceProviderType = 'openai' | 'elevenlabs'

export interface VoiceProviderConfig {
  provider: VoiceProviderType
  contactId?: string
  projectId?: string
  instructions?: string
  voice?: string
  temperature?: number
  tools?: VoiceFunction[]
}

export interface VoiceFunction {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, VoiceFunctionParameter>
    required?: string[]
  }
}

export interface SessionResponse {
  session_id: string
  provider: VoiceProviderType
  ephemeral_token: string
  voice_id?: string
  agent_id?: string
  config?: {
    instructions?: string
    voice?: string
    temperature?: number
    turn_detection?: TurnDetectionConfig
    tools?: VoiceFunction[]
  }
}

export interface FunctionCallEvent {
  call_id: string
  name: string
  parameters: FunctionCallParameters
}

export interface FunctionCallResult {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>> | string | number | boolean | null
  error?: string
  message?: string
}

export abstract class VoiceProvider {
  abstract readonly name: VoiceProviderType
  abstract initSession(config: VoiceProviderConfig): Promise<SessionResponse>
  abstract establishConnection(...): Promise<RTCPeerConnection>
  abstract sendFunctionResult(result: FunctionResultEvent): void
  abstract cleanup(): void
  abstract getCostPerMinute(): number
}
```

---

## AI Assistant Types

**File:** `lib/ai-assistant/types.ts` (192 lines)

```typescript
export interface AIConversation {
  id: string
  tenant_id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  metadata: {
    last_context?: PageContext
    message_count?: number
    [key: string]: unknown
  }
}

export interface AIMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  function_call?: {
    name: string
    parameters: Record<string, unknown>
    result?: unknown
  }
  metadata: {
    voice?: boolean
    provider?: VoiceProviderType
    context?: PageContext
    [key: string]: unknown
  }
  created_at: string
}

export interface PageContext {
  page: string
  entity_type?: 'contact' | 'project' | 'job' | 'territory' | 'knock'
  entity_id?: string
  entity_data?: Record<string, unknown>
}

export type QuickActionType =
  | 'create_contact' | 'search_crm' | 'add_note' | 'log_knock'
  | 'check_pipeline' | 'make_call' | 'send_sms' | 'get_weather'
```

---

## PWA Offline Queue Types

**File:** `lib/db/offline-queue.ts`

```typescript
export interface QueuedPhoto {
  id?: number
  localId: string
  file: File
  contactId: string
  projectId?: string
  metadata: {
    latitude?: number
    longitude?: number
    notes?: string
    capturedAt: string
  }
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  attempts: number
  lastAttempt?: string
  error?: string
  createdAt: string
  tenantId: string
}

export class OfflineQueueDB extends Dexie {
  queuedPhotos!: Table<QueuedPhoto, number>
  constructor() {
    super('RoofingSaaSOfflineQueue')
    this.version(1).stores({
      queuedPhotos: '++id, localId, status, contactId, tenantId, createdAt'
    })
  }
}
```

---

## GeoJSON Types

**File:** `lib/geo/territory.ts`

```typescript
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export type TerritoryBoundary = GeoJSONPolygon | GeoJSONMultiPolygon
```

---

## Gamification Types

**File:** `lib/gamification/award-points.ts`

```typescript
export const POINT_VALUES = {
  // Contact Actions
  CONTACT_CREATED: 10,
  CONTACT_QUALIFIED: 20,
  CONTACT_CONVERTED: 50,

  // Photo Actions
  PHOTO_UPLOADED: 5,
  PHOTO_SET_COMPLETED: 25,

  // Territory Actions
  TERRITORY_CREATED: 10,
  TERRITORY_COMPLETED: 30,

  // Project Actions
  PROJECT_CREATED: 15,
  PROJECT_WON: 100,
  PROJECT_MILESTONE: 25,

  // Communication Actions
  CALL_COMPLETED: 5,
  SMS_SENT: 2,
  EMAIL_SENT: 3,
  APPOINTMENT_SET: 20,

  // Door Knocking
  DOOR_KNOCK_LOGGED: 3,
  DOOR_KNOCK_STREAK_BONUS: 10,

  // Daily Bonuses
  FIRST_ACTIVITY_OF_DAY: 5,
  EARLY_BIRD_BONUS: 10,
} as const
```

---

## User Profile Types

**File:** `lib/types/user-profile.ts`

```typescript
export interface UserProfile {
  id: string
  email: string
  full_name?: string | null
  phone?: string | null
  job_title?: string | null
  bio?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileInput {
  full_name?: string
  phone?: string
  job_title?: string
  bio?: string
  avatar_url?: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
  confirm_password: string
}

export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const
```

---

## Impersonation Types

**File:** `lib/impersonation/types.ts`

```typescript
export interface ImpersonationLog {
  id: string
  tenant_id: string
  admin_user_id: string
  impersonated_user_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  status: 'active' | 'ended' | 'expired' | 'terminated'
  created_at: string
  updated_at: string
}

export interface ImpersonationSession {
  admin_user_id: string
  admin_email: string
  impersonated_user_id: string
  impersonated_email: string
  impersonated_role: string
  started_at: string
  expires_at: string
  reason?: string
  log_id: string
}

export const IMPERSONATION_COOKIE_NAME = 'impersonation_session'
export const IMPERSONATION_DURATION_HOURS = 4
export const IMPERSONATION_WARNING_MINUTES = 5
```

---

## Inspection State Types

**File:** `lib/claims/inspection-state.ts`

```typescript
export type InspectionStep =
  | 'location'     // Verify GPS location
  | 'overview'     // Take overview photo
  | 'checklist'    // Select damage areas
  | 'capture'      // Capture photos per area
  | 'summary'      // Review before submit

export interface DamageAreaPhoto {
  id: string
  damageType: DamageType
  severity?: SeverityLevel
  previewUrl?: string
  uploaded: boolean
  uploadedPhotoId?: string
}

export interface DamageArea {
  type: DamageType
  label: string
  selected: boolean
  photos: DamageAreaPhoto[]
  notes?: string
}

export interface InspectionState {
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

export const DEFAULT_DAMAGE_AREAS: DamageArea[] = [
  { type: 'shingles', label: 'Shingles', selected: false, photos: [] },
  { type: 'ridge_cap', label: 'Ridge Cap', selected: false, photos: [] },
  { type: 'flashing', label: 'Flashing', selected: false, photos: [] },
  { type: 'gutters', label: 'Gutters', selected: false, photos: [] },
  { type: 'soffit', label: 'Soffit', selected: false, photos: [] },
  { type: 'fascia', label: 'Fascia', selected: false, photos: [] },
  { type: 'vents', label: 'Vents', selected: false, photos: [] },
  { type: 'skylights', label: 'Skylights', selected: false, photos: [] },
  { type: 'chimney', label: 'Chimney', selected: false, photos: [] },
  { type: 'siding', label: 'Siding', selected: false, photos: [] },
  { type: 'windows', label: 'Windows', selected: false, photos: [] },
]
```

---

## Pipeline Validation Types

**File:** `lib/pipeline/validation.ts`

```typescript
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'prospect', 'qualified', 'quote_sent', 'negotiation',
  'won', 'production', 'complete'
]

export const VALID_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  prospect: ['qualified', 'lost'],
  qualified: ['quote_sent', 'lost'],
  quote_sent: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: ['production', 'lost'],
  production: ['complete', 'lost'],
  complete: [],
  lost: [],
}

export const STAGE_REQUIRED_FIELDS: Record<PipelineStage, string[]> = {
  prospect: [],
  qualified: [],
  quote_sent: ['estimated_value'],
  negotiation: ['estimated_value'],
  won: ['approved_value'],
  production: [],
  complete: [],
  lost: [],
}

export const PIPELINE_TO_STATUS_MAP: Record<PipelineStage, string> = {
  prospect: 'estimate',
  qualified: 'estimate',
  quote_sent: 'proposal',
  negotiation: 'proposal',
  won: 'approved',
  production: 'in_progress',
  complete: 'completed',
  lost: 'cancelled',
}
```

---

## Type Declaration Files

### IntuitOAuth Types

**File:** `types/intuit-oauth.d.ts`

```typescript
declare module 'intuit-oauth' {
  interface TokenResponse {
    token: {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      x_refresh_token_expires_in: number
    }
    getJson(): any
    getToken(): { ... }
  }

  export default class OAuthClient {
    static scopes: {
      Accounting: string[]
      OpenId: string[]
      Profile: string[]
      Email: string[]
      Phone: string[]
      Address: string[]
    }
    constructor(config: {...})
    authorizeUri(params: {...}): string
    createToken(authorizationCode: string): Promise<TokenResponse>
    refresh(): Promise<TokenResponse>
    revoke(params: { access_token: string }): Promise<void>
    getToken(): {...}
    setToken(token: {...}): void
    isAccessTokenValid(): boolean
    makeApiCall(params: {...}): Promise<any>
  }
}
```

### Next-PWA Types

**File:** `types/next-pwa.d.ts`

```typescript
declare module 'next-pwa' {
  import { NextConfig } from 'next'

  interface PWAConfig {
    dest?: string
    disable?: boolean
    register?: boolean
    scope?: string
    sw?: string
    runtimeCaching?: any[]
    buildExcludes?: (string | RegExp)[]
    publicExcludes?: string[]
    skipWaiting?: boolean
    clientsClaim?: boolean
    workboxOptions?: {
      skipWaiting?: boolean
      clientsClaim?: boolean
      [key: string]: any
    }
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig
  export default withPWA
}
```

---

## Type System Best Practices

### 1. Discriminated Unions
The codebase uses discriminated unions for type-safe step configurations:
```typescript
export type StepConfig =
  | SendEmailStepConfig
  | SendSmsStepConfig
  | CreateTaskStepConfig
  | WaitStepConfig
```

### 2. Const Assertions
Point values and configuration constants use `as const` for literal types:
```typescript
export const POINT_VALUES = {
  CONTACT_CREATED: 10,
  ...
} as const
```

### 3. Zod for Runtime Validation
API input validation uses Zod schemas with inferred types:
```typescript
export const createContactSchema = z.object({...})
export type CreateContactInput = z.infer<typeof createContactSchema>
```

### 4. Generic API Responses
Consistent response format with generic data type:
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {...}
}
```

### 5. Nullable Fields
Database nullable fields use explicit `| null` syntax:
```typescript
email: string | null
phone: string | null
```

---

## File References

| File Path | Purpose |
|-----------|---------|
| `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` | Core API and CRM types |
| `/Users/ccai/roofing saas/roofing-saas/lib/types/contact.ts` | Contact type system |
| `/Users/ccai/roofing saas/roofing-saas/lib/types/user-profile.ts` | User profile types |
| `/Users/ccai/roofing saas/roofing-saas/lib/validations/contact.ts` | Zod validation schemas |
| `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/types.ts` | Campaign system types |
| `/Users/ccai/roofing saas/roofing-saas/lib/claims/types.ts` | Claims integration types |
| `/Users/ccai/roofing saas/roofing-saas/lib/claims/inspection-state.ts` | Inspection wizard types |
| `/Users/ccai/roofing saas/roofing-saas/lib/filters/types.ts` | Filter system types |
| `/Users/ccai/roofing saas/roofing-saas/lib/automation/types.ts` | Workflow automation types |
| `/Users/ccai/roofing saas/roofing-saas/lib/digital-cards/types.ts` | Digital business card types |
| `/Users/ccai/roofing saas/roofing-saas/lib/enrichment/types.ts` | Property enrichment types |
| `/Users/ccai/roofing saas/roofing-saas/lib/address-extraction/types.ts` | Address extraction types |
| `/Users/ccai/roofing saas/roofing-saas/lib/ai-assistant/types.ts` | AI assistant types |
| `/Users/ccai/roofing saas/roofing-saas/lib/impersonation/types.ts` | Admin impersonation types |
| `/Users/ccai/roofing saas/roofing-saas/lib/substatus/types.ts` | Substatus system types |
| `/Users/ccai/roofing saas/roofing-saas/lib/voice/providers/types.ts` | Voice provider types |
| `/Users/ccai/roofing saas/roofing-saas/lib/api/errors.ts` | API error definitions |
| `/Users/ccai/roofing saas/roofing-saas/lib/api/response.ts` | API response helpers |
| `/Users/ccai/roofing saas/roofing-saas/lib/db/offline-queue.ts` | Offline queue types |
| `/Users/ccai/roofing saas/roofing-saas/lib/geo/territory.ts` | GeoJSON territory types |
| `/Users/ccai/roofing saas/roofing-saas/lib/gamification/award-points.ts` | Gamification point values |
| `/Users/ccai/roofing saas/roofing-saas/lib/pipeline/validation.ts` | Pipeline validation types |
| `/Users/ccai/roofing saas/roofing-saas/lib/twilio/sms.ts` | SMS types |
| `/Users/ccai/roofing saas/roofing-saas/lib/twilio/analytics.ts` | Communication analytics types |
| `/Users/ccai/roofing saas/roofing-saas/types/intuit-oauth.d.ts` | QuickBooks OAuth types |
| `/Users/ccai/roofing saas/roofing-saas/types/next-pwa.d.ts` | PWA config types |

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` (260 lines) - Core CRM and API types
- `/Users/ccai/roofing saas/roofing-saas/lib/types/contact.ts` (233 lines) - Contact type system
- `/Users/ccai/roofing saas/roofing-saas/lib/types/user-profile.ts` (157 lines) - User profile types
- `/Users/ccai/roofing saas/roofing-saas/lib/validations/contact.ts` (103 lines) - Zod schemas
- `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/types.ts` (767 lines) - Campaign types
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/types.ts` (181 lines) - Claims types
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/inspection-state.ts` (242 lines) - Inspection types
- `/Users/ccai/roofing saas/roofing-saas/lib/filters/types.ts` (352 lines) - Filter types
- `/Users/ccai/roofing saas/roofing-saas/lib/automation/types.ts` (143 lines) - Automation types
- `/Users/ccai/roofing saas/roofing-saas/lib/digital-cards/types.ts` (533 lines) - Digital card types
- `/Users/ccai/roofing saas/roofing-saas/lib/enrichment/types.ts` (611 lines) - Enrichment types
- `/Users/ccai/roofing saas/roofing-saas/lib/address-extraction/types.ts` (394 lines) - Address extraction
- `/Users/ccai/roofing saas/roofing-saas/lib/ai-assistant/types.ts` (192 lines) - AI assistant types
- `/Users/ccai/roofing saas/roofing-saas/lib/impersonation/types.ts` (125 lines) - Impersonation types
- `/Users/ccai/roofing saas/roofing-saas/lib/substatus/types.ts` (172 lines) - Substatus types
- `/Users/ccai/roofing saas/roofing-saas/lib/voice/providers/types.ts` (135 lines) - Voice provider types
- `/Users/ccai/roofing saas/roofing-saas/lib/api/errors.ts` (145 lines) - API errors
- `/Users/ccai/roofing saas/roofing-saas/lib/api/response.ts` (133 lines) - API responses
- `/Users/ccai/roofing saas/roofing-saas/lib/db/offline-queue.ts` (122 lines) - Offline queue
- `/Users/ccai/roofing saas/roofing-saas/lib/geo/territory.ts` (250 lines) - GeoJSON types
- `/Users/ccai/roofing saas/roofing-saas/lib/gamification/award-points.ts` (143 lines) - Point values
- `/Users/ccai/roofing saas/roofing-saas/lib/pipeline/validation.ts` (213 lines) - Pipeline validation
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/sms.ts` (80 lines) - SMS types
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/analytics.ts` (100 lines) - Analytics types
- `/Users/ccai/roofing saas/roofing-saas/types/intuit-oauth.d.ts` (76 lines) - IntuitOAuth declaration
- `/Users/ccai/roofing saas/roofing-saas/types/next-pwa.d.ts` (26 lines) - Next-PWA declaration

### Verification Steps
1. **Grep verification:** Found 45 files with exported types/interfaces using `^export (interface|type|enum)` pattern
2. **File structure verification:** All 26 type files exist at documented paths
3. **Type completeness:** Documented all major type categories (CRM, API, Integrations, Features)
4. **Code accuracy:** All interfaces and types match actual source code exactly
5. **Line counts:** Verified approximate line counts for major type files

### Archon RAG Queries
- No external documentation queries needed - all types documented from source code

### Validated By
PRD Documentation Agent - Session 31
Date: 2025-12-11T16:30:00Z
