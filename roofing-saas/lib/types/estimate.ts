/**
 * Estimate Types
 *
 * This system uses "projects" as estimates/quotes internally, but provides
 * estimate-focused types and interfaces for the quoting functionality.
 */

import { Project, PipelineStage } from './api'
import { QuoteOption, QuoteProposal } from './quote-option'

// Estimate is essentially a Project with quote-specific methods
export interface Estimate extends Omit<Project, 'id' | 'status'> {
  id: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  quote_options?: QuoteOption[]
  active_proposal?: QuoteProposal
  proposal_sent_date?: string
  proposal_expiry_date?: string
}

export interface EstimateWithQuotes extends Estimate {
  quote_options: QuoteOption[]
}

// Form inputs for creating estimates
export interface CreateEstimateInput {
  name: string
  description?: string
  contact_id: string
  estimated_value?: number
  pipeline_stage?: PipelineStage
  priority?: 'urgent' | 'high' | 'normal' | 'low'
  estimated_close_date?: string
  notes?: string
}

export interface UpdateEstimateInput extends Partial<CreateEstimateInput> {
  id: string
}

// Helper functions to work with estimates
export function isEstimate(project: Project): boolean {
  return ['estimate', 'proposal', 'quote_sent'].includes(project.status)
}

export function getEstimateStage(project: Project): 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' {
  switch (project.pipeline_stage) {
    case 'prospect':
    case 'qualified':
      return 'draft'
    case 'quote_sent':
      return 'sent'
    case 'won':
      return 'approved'
    case 'lost':
      return 'rejected'
    default:
      return 'draft'
  }
}

export function convertProjectToEstimate(project: Project): Estimate {
  return {
    ...project,
    status: getEstimateStage(project)
  }
}