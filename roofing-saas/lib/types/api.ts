/**
 * Shared API Types
 *
 * Type definitions for API requests and responses
 */

// ============================================
// Common Types
// ============================================

export interface PaginationQuery {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SearchQuery extends PaginationQuery {
  search?: string
}

// ============================================
// Tenant Types
// ============================================

export type AutoCreateProjectSetting = 'always' | 'prompt' | 'never'

export interface Tenant {
  id: string
  name: string
  subdomain: string
  custom_domain?: string
  settings?: Record<string, unknown>
  features?: Record<string, unknown>
  subscription_status?: string
  subscription_expires_at?: string
  logo_url?: string
  primary_color?: string
  is_active: boolean
  auto_create_project_for_homeowners?: AutoCreateProjectSetting
  created_at: string
  updated_at: string
}

// ============================================
// Contact Types
// ============================================

export interface ContactFilters extends SearchQuery {
  type?: 'lead' | 'customer'
  stage?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
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

export interface Contact {
  id: string
  tenant_id: string
  created_by: string
  created_at: string
  updated_at: string
  type: 'lead' | 'customer'
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
  stage: string
  priority: string
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
  is_deleted: boolean
}

// ============================================
// QuickBooks Types
// ============================================

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
  PrimaryEmailAddr?: {
    Address: string
  }
  PrimaryPhone?: {
    FreeFormNumber: string
  }
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
  CustomerRef: {
    value: string
    name: string
  }
}

// ============================================
// Project Types
// ============================================

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
  status: string // 'estimate' | 'proposal' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
  substatus?: string | null

  // New unified pipeline fields (Phase 2)
  pipeline_stage: PipelineStage
  lead_source?: string
  priority?: LeadPriority
  lead_score?: number
  estimated_close_date?: string

  // Stage tracking (for days-in-stage display)
  stage_changed_at?: string

  // Insurance adjuster reference
  adjuster_contact_id?: string

  // Claims integration fields (links to external Claims Management Module)
  claim_id?: string          // Reference to claim in Claims Agent module
  storm_event_id?: string    // Which storm event led to this project (for causation)

  // Financial fields
  estimated_value?: number | null
  approved_value?: number | null
  final_value?: number | null

  start_date?: string
  end_date?: string
  budget?: number
  actual_cost?: number
  notes?: string
  custom_fields?: Record<string, unknown>
  is_deleted: boolean

  // Joined contact data
  contact?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }

  // Joined adjuster data (when adjuster_contact_id is populated)
  adjuster?: {
    id: string
    first_name: string
    last_name: string
    company?: string
    phone?: string
    email?: string
  }

  // Joined storm event data (when storm_event_id is populated)
  storm_event?: {
    id: string
    event_date: string
    event_type: 'hail' | 'tornado' | 'thunderstorm_wind' | 'flood' | 'other'
    magnitude?: number
    state: string
    county?: string
    city?: string
  }
}

// ============================================
// Activity Types
// ============================================

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

// ============================================
// Error Types
// ============================================

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ============================================
// Webhook Types
// ============================================

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
