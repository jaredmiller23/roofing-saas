/**
 * Decision Types
 *
 * Types for tracking team decisions in the dev dashboard
 */

export type DecisionStatus = 'active' | 'superseded' | 'reversed'

export interface Decision {
  id: string
  tenant_id: string
  meeting_date: string
  decision_text: string
  context: string | null
  decided_by: string[] | null
  tags: string[]
  status: DecisionStatus
  related_task_id: string | null
  created_at: string
  created_by: string | null
  updated_at: string
}

export interface DecisionWithTask extends Decision {
  task_title?: string | null
}

export interface CreateDecisionInput {
  meeting_date: string
  decision_text: string
  context?: string
  tags?: string[]
  related_task_id?: string
}

export interface UpdateDecisionInput {
  decision_text?: string
  context?: string
  tags?: string[]
  status?: DecisionStatus
  related_task_id?: string | null
}

export interface DecisionFilters {
  status?: DecisionStatus
  from_date?: string
  to_date?: string
  tags?: string[]
}
