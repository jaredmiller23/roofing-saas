/**
 * Workflow Automation Type Definitions
 */

import type { ContactStage, ContactType, ContactCategory, ContactPriority } from '@/lib/types/contact'

// Re-export contact types for convenience
export type { ContactStage, ContactType, ContactCategory, ContactPriority }
import type { ProjectStatus } from '@/lib/types/project'

// Core Workflow Types
export type WorkflowStatus = 'active' | 'draft' | 'paused' | 'archived'

export interface Workflow {
  id: string
  tenant_id: string
  name: string
  description?: string
  status: WorkflowStatus
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  conditions?: WorkflowCondition[]
  created_at: string
  updated_at: string
  created_by: string
  is_template: boolean
  template_category?: string
  execution_count: number
  last_executed_at?: string
}

// Trigger Types
export type TriggerType =
  | 'contact_created'
  | 'contact_updated'
  | 'stage_changed'
  | 'field_changed'
  | 'time_elapsed'
  | 'scheduled'
  | 'form_submitted'
  | 'project_created'
  | 'project_status_changed'
  | 'manual'

export interface WorkflowTrigger {
  id: string
  type: TriggerType
  config: TriggerConfig
  enabled: boolean
}

export type TriggerConfig =
  | ContactCreatedConfig
  | ContactUpdatedConfig
  | StageChangedConfig
  | FieldChangedConfig
  | TimeElapsedConfig
  | ScheduledConfig
  | FormSubmittedConfig
  | ProjectCreatedConfig
  | ProjectStatusChangedConfig
  | ManualConfig

export interface ContactCreatedConfig {
  type: 'contact_created'
  contact_type?: ContactType[]
  contact_category?: ContactCategory[]
  source?: string[]
  assigned_to?: string[]
}

export interface ContactUpdatedConfig {
  type: 'contact_updated'
  fields?: string[]
  contact_type?: ContactType[]
  stage?: ContactStage[]
}

export interface StageChangedConfig {
  type: 'stage_changed'
  from_stage?: ContactStage[]
  to_stage?: ContactStage[]
  contact_type?: ContactType[]
}

export interface FieldChangedConfig {
  type: 'field_changed'
  field: string
  from_value?: any
  to_value?: any
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
}

export interface TimeElapsedConfig {
  type: 'time_elapsed'
  duration: number // in hours
  field: 'created_at' | 'updated_at' | 'last_contact_date' | 'custom'
  custom_field?: string
  contact_stage?: ContactStage[]
}

export interface ScheduledConfig {
  type: 'scheduled'
  schedule: 'daily' | 'weekly' | 'monthly' | 'cron'
  time?: string // HH:MM format
  day_of_week?: number // 0-6, 0 = Sunday
  day_of_month?: number // 1-31
  cron_expression?: string
  timezone?: string
}

export interface FormSubmittedConfig {
  type: 'form_submitted'
  form_id?: string
  form_name?: string
}

export interface ProjectCreatedConfig {
  type: 'project_created'
  project_type?: string[]
  assigned_to?: string[]
}

export interface ProjectStatusChangedConfig {
  type: 'project_status_changed'
  from_status?: ProjectStatus[]
  to_status?: ProjectStatus[]
}

export interface ManualConfig {
  type: 'manual'
}

// Action Types
export type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'update_field'
  | 'change_stage'
  | 'assign_user'
  | 'add_tag'
  | 'remove_tag'
  | 'webhook'
  | 'wait'
  | 'create_project'

export interface WorkflowAction {
  id: string
  type: ActionType
  config: ActionConfig
  delay?: number // delay in hours before executing
  enabled: boolean
  order: number
}

export type ActionConfig =
  | SendEmailConfig
  | SendSMSConfig
  | CreateTaskConfig
  | UpdateFieldConfig
  | ChangeStageConfig
  | AssignUserConfig
  | AddTagConfig
  | RemoveTagConfig
  | WebhookConfig
  | WaitConfig
  | CreateProjectConfig

export interface SendEmailConfig {
  type: 'send_email'
  template_id?: string
  to: string // email address or variable like {{contact.email}}
  subject: string
  body: string // can include variables like {{contact.first_name}}
  from_name?: string
  from_email?: string
}

export interface SendSMSConfig {
  type: 'send_sms'
  template_id?: string
  to: string // phone number or variable like {{contact.phone}}
  message: string // can include variables
}

export interface CreateTaskConfig {
  type: 'create_task'
  title: string
  description?: string
  due_date?: string // relative like "+3 days" or absolute
  assigned_to?: string // user ID or variable
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  contact_id?: string // use {{contact.id}} for current contact
}

export interface UpdateFieldConfig {
  type: 'update_field'
  field: string
  value: any
  operator?: 'set' | 'add' | 'subtract' | 'append'
}

export interface ChangeStageConfig {
  type: 'change_stage'
  stage: ContactStage
  substatus?: string
}

export interface AssignUserConfig {
  type: 'assign_user'
  user_id: string
}

export interface AddTagConfig {
  type: 'add_tag'
  tags: string[]
}

export interface RemoveTagConfig {
  type: 'remove_tag'
  tags: string[]
}

export interface WebhookConfig {
  type: 'webhook'
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  payload?: Record<string, any>
  auth?: {
    type: 'bearer' | 'basic' | 'api_key'
    token?: string
    username?: string
    password?: string
    api_key?: string
    api_key_header?: string
  }
}

export interface WaitConfig {
  type: 'wait'
  duration: number // in hours
}

export interface CreateProjectConfig {
  type: 'create_project'
  name: string
  description?: string
  template_id?: string
  assigned_to?: string
  contact_id?: string // use {{contact.id}} for current contact
}

// Condition Types
export interface WorkflowCondition {
  id: string
  field: string
  operator: ConditionOperator
  value: any
  logic_gate: 'AND' | 'OR'
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'

// Execution Types
export interface WorkflowExecution {
  id: string
  workflow_id: string
  trigger_data: Record<string, any>
  status: ExecutionStatus
  started_at: string
  completed_at?: string
  error_message?: string
  executed_actions: ActionExecution[]
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ActionExecution {
  id: string
  action_id: string
  status: ExecutionStatus
  started_at: string
  completed_at?: string
  error_message?: string
  output?: any
}

// Template Types
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  conditions?: WorkflowCondition[]
  preview_image?: string
  tags: string[]
}

export type TemplateCategory =
  | 'lead_nurturing'
  | 'customer_onboarding'
  | 'project_management'
  | 'follow_up'
  | 'notifications'
  | 'data_management'

// API Types
export interface CreateWorkflowInput {
  name: string
  description?: string
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  conditions?: WorkflowCondition[]
  status?: WorkflowStatus
}

export interface UpdateWorkflowInput extends Partial<CreateWorkflowInput> {
  id: string
}

export interface WorkflowFilters {
  status?: WorkflowStatus[]
  trigger_type?: TriggerType[]
  is_template?: boolean
  template_category?: string
  search?: string
  page?: number
  limit?: number
}

export interface WorkflowListResponse {
  workflows: Workflow[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// Variable Context for templates
export interface VariableContext {
  contact?: Record<string, any>
  project?: Record<string, any>
  user?: Record<string, any>
  organization?: Record<string, any>
  custom?: Record<string, any>
  // Additional context fields
  previous_contact?: Record<string, any>
  stage_change?: Record<string, any>
  field_change?: Record<string, any>
  form?: Record<string, any>
  schedule?: Record<string, any>
  time_elapsed?: Record<string, any>
}

// Helper Types
export interface TriggerDefinition {
  type: TriggerType
  name: string
  description: string
  icon: string
  category: 'contact' | 'project' | 'time' | 'form' | 'manual'
  config_schema: any // JSON Schema for configuration
}

export interface ActionDefinition {
  type: ActionType
  name: string
  description: string
  icon: string
  category: 'communication' | 'task' | 'data' | 'integration' | 'flow'
  config_schema: any // JSON Schema for configuration
}