/**
 * Knowledge Base Types
 * Type definitions for knowledge management UI
 */

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  subcategory: string | null
  manufacturer: string | null
  tags: string[]
  is_global: boolean
  source_url: string | null
  tenant_id: string | null
  created_by: string | null
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface KnowledgeSearchResult {
  id: string
  title: string
  content: string
  category: string
  subcategory: string | null
  manufacturer: string | null
  tags: string[]
  similarity: number
}

export interface KnowledgeSearchQuery {
  id: string
  tenant_id: string
  user_id: string
  query_text: string
  results_count: number
  top_result_id: string | null
  relevance_score: number | null
  was_helpful: boolean | null
  created_at: string
}

export const KNOWLEDGE_CATEGORIES = [
  'materials',
  'installation',
  'repair',
  'inspection',
  'safety',
  'codes_and_regulations',
  'insurance',
  'sales',
  'manufacturer',
  'weather',
  'tools_and_equipment',
  'business',
  'general',
] as const

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number]

export const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials',
  installation: 'Installation',
  repair: 'Repair',
  inspection: 'Inspection',
  safety: 'Safety',
  codes_and_regulations: 'Codes & Regulations',
  insurance: 'Insurance',
  sales: 'Sales',
  manufacturer: 'Manufacturer',
  weather: 'Weather',
  tools_and_equipment: 'Tools & Equipment',
  business: 'Business',
  general: 'General',
}
