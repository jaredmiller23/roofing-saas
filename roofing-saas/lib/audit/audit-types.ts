/**
 * Types and interfaces for the audit trail system
 */

export type AuditActionType = 'create' | 'update' | 'delete'

export type AuditEntityType =
  | 'contact'
  | 'project'
  | 'estimate'
  | 'user'
  | 'tenant'
  | 'settings'
  | 'document'

export interface AuditEntry {
  id: string
  timestamp: string
  user_id: string
  user_name: string
  user_email: string
  tenant_id: string
  action_type: AuditActionType
  entity_type: AuditEntityType
  entity_id: string
  before_values: Record<string, any> | null
  after_values: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface CreateAuditEntryParams {
  user_id: string
  user_name: string
  user_email: string
  tenant_id: string
  action_type: AuditActionType
  entity_type: AuditEntityType
  entity_id: string
  before_values?: Record<string, any> | null
  after_values?: Record<string, any> | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, any> | null
}

export interface AuditLogFilters {
  user_id?: string
  entity_type?: AuditEntityType
  action_type?: AuditActionType
  entity_id?: string
  start_date?: string
  end_date?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: 'timestamp' | 'user_name' | 'action_type' | 'entity_type'
  sort_order?: 'asc' | 'desc'
}

export interface AuditLogResponse {
  entries: AuditEntry[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface AuditDiff {
  field: string
  old_value: any
  new_value: any
  type: 'added' | 'removed' | 'changed'
}

export interface AuditEntryWithDiff extends AuditEntry {
  diff: AuditDiff[]
}

// Utility types for specific entity auditing
export interface ContactAuditData {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  type: string
  stage: string
  priority: string
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProjectAuditData {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  client_contact_id: string
  assigned_to: string | null
  start_date: string | null
  deadline: string | null
  budget: number | null
  created_at: string
  updated_at: string
}

// Configuration for audit retention and policies
export interface AuditConfig {
  retention_days: number
  batch_size: number
  max_retries: number
  enabled_entities: AuditEntityType[]
  sensitive_fields: Record<AuditEntityType, string[]>
}

// Default audit configuration
export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  retention_days: 2555, // ~7 years for compliance
  batch_size: 100,
  max_retries: 3,
  enabled_entities: ['contact', 'project', 'estimate', 'user', 'settings', 'document'],
  sensitive_fields: {
    contact: ['email', 'phone'],
    project: ['budget'],
    estimate: ['amount', 'cost'],
    user: ['email', 'role'],
    tenant: ['billing_email', 'subscription_status'],
    settings: ['api_keys', 'webhooks'],
    document: ['content']
  }
}

// Error types for audit logging
export class AuditError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'AuditError'
  }
}

export class AuditValidationError extends AuditError {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'AuditValidationError'
  }
}

export class AuditStorageError extends AuditError {
  constructor(message: string, public retryable: boolean = true) {
    super(message)
    this.name = 'AuditStorageError'
  }
}