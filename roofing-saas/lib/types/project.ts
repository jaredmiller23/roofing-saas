/**
 * Project types - placeholder module
 * Full implementation in SPRINT3-003
 */

export interface ProjectType {
  id: string
  name: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

export type ProjectStatus = 'estimate' | 'active' | 'completed' | 'cancelled'
