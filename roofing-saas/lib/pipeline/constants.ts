/**
 * Pipeline Stage Constants
 * Single source of truth for default pipeline stage definitions.
 * These map 1:1 with the PostgreSQL pipeline_stage enum.
 */

import type { PipelineStage } from '@/lib/types/api'

export interface DefaultPipelineStage {
  stage_key: PipelineStage
  name: string
  color: string
  stage_order: number
  stage_type: 'active' | 'won' | 'lost'
  win_probability: number
  description: string
}

export const DEFAULT_PIPELINE_STAGES: DefaultPipelineStage[] = [
  { stage_key: 'prospect',    name: 'Prospect',    color: '#6B7280', stage_order: 0, stage_type: 'active', win_probability: 10,  description: 'Initial contact, not yet qualified' },
  { stage_key: 'qualified',   name: 'Qualified',   color: '#3B82F6', stage_order: 1, stage_type: 'active', win_probability: 25,  description: 'Qualified lead with genuine interest' },
  { stage_key: 'quote_sent',  name: 'Quote Sent',  color: '#8B5CF6', stage_order: 2, stage_type: 'active', win_probability: 40,  description: 'Quote or estimate has been sent' },
  { stage_key: 'negotiation', name: 'Negotiation', color: '#F97316', stage_order: 3, stage_type: 'active', win_probability: 60,  description: 'In negotiations, addressing concerns' },
  { stage_key: 'won',         name: 'Won',         color: '#22C55E', stage_order: 4, stage_type: 'won',    win_probability: 100, description: 'Deal won, contract signed' },
  { stage_key: 'production',  name: 'Production',  color: '#06B6D4', stage_order: 5, stage_type: 'active', win_probability: 100, description: 'Job in progress' },
  { stage_key: 'complete',    name: 'Complete',     color: '#059669', stage_order: 6, stage_type: 'won',    win_probability: 100, description: 'Project completed' },
  { stage_key: 'lost',        name: 'Lost',         color: '#EF4444', stage_order: 7, stage_type: 'lost',   win_probability: 0,   description: 'Opportunity lost' },
]

/** All valid pipeline stage keys */
export const VALID_STAGE_KEYS: PipelineStage[] = DEFAULT_PIPELINE_STAGES.map(s => s.stage_key)
