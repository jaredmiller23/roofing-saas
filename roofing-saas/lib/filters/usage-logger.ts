/**
 * Filter Usage Logger
 *
 * Tracks filter usage for analytics and optimization
 */

import { createClient } from '@/lib/supabase/server'
import type { EntityType, FilterCriterion } from './types'

export interface LogFilterUsageParams {
  entity_type: EntityType
  filter_field: string
  filter_config_id?: string
  saved_filter_id?: string
  filter_value: unknown
  results_count?: number
}

/**
 * Log filter usage to analytics table
 *
 * This is called automatically when filters are applied to track:
 * - Most popular filters
 * - Typical filter values
 * - Filter effectiveness (results count)
 *
 * @param params Filter usage parameters
 * @returns Log ID if successful, null if failed
 */
export async function logFilterUsage(
  params: LogFilterUsageParams
): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // Get tenant_id
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) return null

    // Insert usage log
    const { data, error } = await supabase
      .from('filter_usage_logs')
      .insert({
        tenant_id: tenantUser.tenant_id,
        user_id: user.id,
        entity_type: params.entity_type,
        filter_field: params.filter_field,
        filter_config_id: params.filter_config_id || null,
        saved_filter_id: params.saved_filter_id || null,
        filter_value: params.filter_value,
        results_count: params.results_count || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error logging filter usage:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error in logFilterUsage:', error)
    return null
  }
}

/**
 * Log saved filter usage
 * Simpler wrapper for when a saved filter is loaded
 */
export async function logSavedFilterUsage(
  saved_filter_id: string,
  entity_type: EntityType,
  results_count?: number
): Promise<void> {
  await logFilterUsage({
    entity_type,
    filter_field: 'saved_filter',
    saved_filter_id,
    filter_value: { saved_filter_id },
    results_count,
  })
}

/**
 * Log individual filter field usage
 * Called when applying individual filter fields
 */
export async function logFieldFilterUsage(
  entity_type: EntityType,
  field_name: string,
  criterion: FilterCriterion,
  results_count?: number,
  filter_config_id?: string
): Promise<void> {
  await logFilterUsage({
    entity_type,
    filter_field: field_name,
    filter_config_id,
    filter_value: criterion,
    results_count,
  })
}

/**
 * Build SQL WHERE clause from filter criteria
 *
 * Converts filter criteria object to SQL WHERE clause
 * Safe from SQL injection (uses parameterized queries)
 *
 * @param criteria Filter criteria object
 * @returns SQL WHERE clause components
 */
export function buildWhereClause(criteria: Record<string, FilterCriterion>): {
  conditions: string[]
  values: unknown[]
} {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  for (const [field, criterion] of Object.entries(criteria)) {
    const { operator, value } = criterion

    switch (operator) {
      case 'equals':
        conditions.push(`${field} = $${paramIndex}`)
        values.push(value)
        paramIndex++
        break

      case 'not_equals':
        conditions.push(`${field} != $${paramIndex}`)
        values.push(value)
        paramIndex++
        break

      case 'contains':
        conditions.push(`${field} ILIKE $${paramIndex}`)
        values.push(`%${value}%`)
        paramIndex++
        break

      case 'not_contains':
        conditions.push(`${field} NOT ILIKE $${paramIndex}`)
        values.push(`%${value}%`)
        paramIndex++
        break

      case 'starts_with':
        conditions.push(`${field} ILIKE $${paramIndex}`)
        values.push(`${value}%`)
        paramIndex++
        break

      case 'ends_with':
        conditions.push(`${field} ILIKE $${paramIndex}`)
        values.push(`%${value}`)
        paramIndex++
        break

      case 'greater_than':
        conditions.push(`${field} > $${paramIndex}`)
        values.push(value)
        paramIndex++
        break

      case 'less_than':
        conditions.push(`${field} < $${paramIndex}`)
        values.push(value)
        paramIndex++
        break

      case 'greater_than_or_equal':
        conditions.push(`${field} >= $${paramIndex}`)
        values.push(value)
        paramIndex++
        break

      case 'less_than_or_equal':
        conditions.push(`${field} <= $${paramIndex}`)
        values.push(value)
        paramIndex++
        break

      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          conditions.push(`${field} = ANY($${paramIndex})`)
          values.push(value)
          paramIndex++
        }
        break

      case 'not_in':
        if (Array.isArray(value) && value.length > 0) {
          conditions.push(`${field} != ALL($${paramIndex})`)
          values.push(value)
          paramIndex++
        }
        break

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          conditions.push(`${field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
          values.push(value[0], value[1])
          paramIndex += 2
        }
        break

      case 'is_null':
        conditions.push(`${field} IS NULL`)
        break

      case 'is_not_null':
        conditions.push(`${field} IS NOT NULL`)
        break
    }
  }

  return { conditions, values }
}

/**
 * Supabase query builder interface (subset of methods we use)
 */
interface SupabaseQueryBuilder {
  eq(column: string, value: string | number): this
  neq(column: string, value: string | number): this
  ilike(column: string, pattern: string): this
  not(column: string, operator: string, value: unknown): this
  gt(column: string, value: number): this
  lt(column: string, value: number): this
  gte(column: string, value: number): this
  lte(column: string, value: number): this
  in(column: string, values: unknown[]): this
  is(column: string, value: null): this
}

/**
 * Apply filters to a Supabase query
 *
 * Helper to apply filter criteria to a Supabase query builder
 *
 * @param query Supabase query builder
 * @param criteria Filter criteria
 * @returns Modified query builder
 */
export function applyFiltersToQuery<T extends SupabaseQueryBuilder>(
  query: T,
  criteria: Record<string, FilterCriterion>
): T {
  for (const [field, criterion] of Object.entries(criteria)) {
    const { operator, value } = criterion

    switch (operator) {
      case 'equals':
        query = query.eq(field, value as string | number) as T
        break

      case 'not_equals':
        query = query.neq(field, value as string | number) as T
        break

      case 'contains':
        query = query.ilike(field, `%${value}%`) as T
        break

      case 'not_contains':
        query = query.not(field, 'ilike', `%${value}%`) as T
        break

      case 'starts_with':
        query = query.ilike(field, `${value}%`) as T
        break

      case 'ends_with':
        query = query.ilike(field, `%${value}`) as T
        break

      case 'greater_than':
        query = query.gt(field, value as number) as T
        break

      case 'less_than':
        query = query.lt(field, value as number) as T
        break

      case 'greater_than_or_equal':
        query = query.gte(field, value as number) as T
        break

      case 'less_than_or_equal':
        query = query.lte(field, value as number) as T
        break

      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          query = query.in(field, value as unknown[]) as T
        }
        break

      case 'not_in':
        if (Array.isArray(value) && value.length > 0) {
          query = query.not(field, 'in', value as unknown[]) as T
        }
        break

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          query = query.gte(field, value[0] as number).lte(field, value[1] as number) as T
        }
        break

      case 'is_null':
        query = query.is(field, null) as T
        break

      case 'is_not_null':
        query = query.not(field, 'is', null) as T
        break
    }
  }

  return query
}
