import { PipelineStage, LeadPriority } from './api'

// ============================================
// Project Template Types
// ============================================

export type TemplateType = 'system' | 'custom'

export type DefaultTemplateId =
  | 'residential-roof-replacement'
  | 'commercial-roof-installation'
  | 'storm-damage-repair'
  | 'roof-inspection'
  | 'insurance-claim-project'
  | 'emergency-repair'

export interface TemplateStage {
  name: string
  description?: string
  estimated_duration_days?: number
  required_documents?: string[]
  checklist_items?: string[]
}

export interface TemplateTask {
  name: string
  description?: string
  estimated_duration_hours?: number
  assigned_role?: string
  dependencies?: string[]
  category?: 'planning' | 'inspection' | 'documentation' | 'installation' | 'cleanup' | 'follow_up'
  required_tools?: string[]
  notes?: string
}

export interface TemplateMilestone {
  name: string
  description?: string
  criteria?: string[]
  stage_completion_percentage?: number
  payment_percentage?: number
  required_approvals?: string[]
}

export interface ProjectTemplate {
  id: string
  tenant_id: string
  name: string
  description?: string
  template_type: TemplateType
  default_template_id?: DefaultTemplateId // Only for system templates
  created_by?: string
  created_at: string
  updated_at: string
  is_active: boolean
  is_default: boolean
  version: number

  // Template Configuration
  default_pipeline_stage: PipelineStage
  default_priority?: LeadPriority
  estimated_duration_days?: number
  estimated_budget_range?: {
    min?: number
    max?: number
  }

  // Template Content
  stages: TemplateStage[]
  tasks: TemplateTask[]
  milestones: TemplateMilestone[]

  // Default Project Fields
  default_fields: {
    name_pattern?: string // e.g., "{customer_name} - Roof Replacement"
    description?: string
    notes?: string
    custom_fields?: Record<string, unknown>
  }

  // Document Templates
  document_checklist: string[]
  required_photos?: string[]

  // Team Assignment Rules
  default_assignments?: {
    project_manager?: string
    sales_rep?: string
    crew_lead?: string
  }

  // Usage Statistics
  usage_count: number
  last_used_at?: string
}

// ============================================
// Template Creation & Management
// ============================================

export interface CreateTemplateInput {
  name: string
  description?: string
  template_type: TemplateType
  default_template_id?: DefaultTemplateId
  is_default?: boolean

  default_pipeline_stage: PipelineStage
  default_priority?: LeadPriority
  estimated_duration_days?: number
  estimated_budget_range?: {
    min?: number
    max?: number
  }

  stages: Omit<TemplateStage, 'id'>[]
  tasks: Omit<TemplateTask, 'id'>[]
  milestones: Omit<TemplateMilestone, 'id'>[]

  default_fields: {
    name_pattern?: string
    description?: string
    notes?: string
    custom_fields?: Record<string, unknown>
  }

  document_checklist: string[]
  required_photos?: string[]

  default_assignments?: {
    project_manager?: string
    sales_rep?: string
    crew_lead?: string
  }
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export interface TemplateFromProjectInput {
  project_id: string
  name: string
  description?: string
  include_tasks?: boolean
  include_milestones?: boolean
  include_documents?: boolean
  make_default?: boolean
}

// ============================================
// Template Application
// ============================================

export interface ApplyTemplateToProjectInput {
  template_id: string
  contact_id: string
  project_name?: string // Override template pattern
  start_date?: string
  custom_fields?: Record<string, unknown>
  assigned_to?: string
}

export interface TemplateApplicationResult {
  success: boolean
  project_id?: string
  created_tasks?: number
  created_milestones?: number
  error?: string
  warnings?: string[]
}

// ============================================
// Template Library
// ============================================

export interface TemplateFilters {
  template_type?: TemplateType
  search?: string
  created_by?: string
  is_active?: boolean
  sort_by?: 'name' | 'created_at' | 'usage_count' | 'last_used_at'
  sort_order?: 'asc' | 'desc'
}

export interface TemplateListResponse {
  templates: ProjectTemplate[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// ============================================
// Template Validation
// ============================================

export interface TemplateValidationError {
  field: string
  message: string
  code: 'required' | 'invalid' | 'duplicate' | 'dependency_missing'
}

export interface TemplateValidationResult {
  valid: boolean
  errors: TemplateValidationError[]
  warnings?: string[]
}

// ============================================
// Template Analytics
// ============================================

export interface TemplateAnalytics {
  template_id: string
  name: string
  usage_count: number
  avg_project_duration: number
  avg_project_value: number
  success_rate: number
  last_30_days_usage: number
  created_projects: {
    total: number
    completed: number
    in_progress: number
    cancelled: number
  }
}

export interface TemplatePerformanceMetrics {
  most_used_templates: TemplateAnalytics[]
  fastest_completion: TemplateAnalytics[]
  highest_value: TemplateAnalytics[]
  best_success_rate: TemplateAnalytics[]
}

// ============================================
// Template Versioning
// ============================================

export interface TemplateVersion {
  id: string
  template_id: string
  version: number
  changes_summary: string
  created_by: string
  created_at: string
  template_data: ProjectTemplate
}

export interface TemplateVersionHistory {
  template_id: string
  versions: TemplateVersion[]
  current_version: number
}

// ============================================
// Helper Types
// ============================================

export type TemplateCategory =
  | 'residential'
  | 'commercial'
  | 'repair'
  | 'inspection'
  | 'insurance'
  | 'emergency'

export interface TemplateCategoryInfo {
  id: TemplateCategory
  name: string
  description: string
  icon: string
  color: string
  templates: ProjectTemplate[]
}

export interface QuickTemplateOption {
  id: string
  name: string
  description: string
  estimated_duration: string
  typical_value_range: string
  icon: string
}

// ============================================
// Form Types
// ============================================

export interface TemplateFormData {
  basic: {
    name: string
    description: string
    template_type: TemplateType
    is_default: boolean
  }
  configuration: {
    default_pipeline_stage: PipelineStage
    default_priority: LeadPriority
    estimated_duration_days: number
    estimated_budget_range: {
      min: number
      max: number
    }
  }
  content: {
    stages: TemplateStage[]
    tasks: TemplateTask[]
    milestones: TemplateMilestone[]
  }
  documents: {
    document_checklist: string[]
    required_photos: string[]
  }
  assignments: {
    project_manager?: string
    sales_rep?: string
    crew_lead?: string
  }
}