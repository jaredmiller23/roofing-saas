/**
 * Gamification Configuration Types
 *
 * TypeScript types and Zod schemas for custom incentives system:
 * - Point Rules
 * - Achievements
 * - Challenges
 * - Rewards
 * - KPIs
 */

import { z } from 'zod'

// =====================================================
// POINT RULE CONFIGURATIONS
// =====================================================

export const pointRuleConfigSchema = z.object({
  action_type: z.string().min(1, 'Action type is required'),
  action_name: z.string().min(1, 'Action name is required'),
  points_value: z.number().int().positive('Points must be positive'),
  category: z.string().optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().default(true),
})

export type PointRuleConfig = z.infer<typeof pointRuleConfigSchema>

export interface PointRuleConfigDB extends PointRuleConfig {
  id: string
  org_id: string
  created_at: string
  updated_at: string
  created_by: string | null
}

// =====================================================
// ACHIEVEMENT CONFIGURATIONS
// =====================================================

export const achievementConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  requirement_type: z.enum(['points', 'count', 'streak', 'custom_sql']),
  requirement_value: z.number().int().positive().optional(),
  requirement_config: z.record(z.string(), z.unknown()).optional(),
  custom_sql: z.string().optional(),
  points_reward: z.number().int().min(0).default(0),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  is_active: z.boolean().default(true),
})

export type AchievementConfig = z.infer<typeof achievementConfigSchema>

export interface AchievementConfigDB extends AchievementConfig {
  id: string
  org_id: string
  created_at: string
  updated_at: string
  created_by: string | null
}

// =====================================================
// CHALLENGE CONFIGURATIONS
// =====================================================

export const challengeConfigSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  challenge_type: z.enum(['daily', 'weekly', 'monthly', 'special']),
  goal_metric: z.string().min(1, 'Goal metric is required'),
  goal_value: z.number().int().positive('Goal value must be positive'),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
  reward_type: z.enum(['points', 'prize', 'both']).optional(),
  reward_points: z.number().int().min(0).default(0),
  reward_description: z.string().optional(),
  participants: z.array(z.string()).optional(), // Array of user IDs - null/empty means all org members
  is_active: z.boolean().default(true),
})

export type ChallengeConfig = z.infer<typeof challengeConfigSchema>

export interface ChallengeConfigDB extends ChallengeConfig {
  id: string
  org_id: string
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ChallengeProgress {
  id: string
  org_id: string
  user_id: string
  challenge_id: string
  current_progress: number
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// REWARD CONFIGURATIONS
// =====================================================

export const rewardConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  reward_type: z.enum(['bonus', 'gift_card', 'time_off', 'prize']),
  points_required: z.number().int().positive('Points required must be positive'),
  reward_value: z.string().min(1, 'Reward value is required'),
  quantity_available: z.number().int().positive().optional(),
  is_active: z.boolean().default(true),
})

export type RewardConfig = z.infer<typeof rewardConfigSchema>

export interface RewardConfigDB extends RewardConfig {
  id: string
  org_id: string
  quantity_claimed: number
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface RewardClaim {
  id: string
  org_id: string
  user_id: string
  reward_id: string
  points_spent: number
  claimed_at: string
  fulfilled: boolean
  fulfilled_at: string | null
  fulfilled_by: string | null
  notes: string | null
}

// =====================================================
// KPI DEFINITIONS
// =====================================================

export const kpiDefinitionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  calculation_type: z.enum(['sql_query', 'aggregation', 'formula']),
  calculation_config: z.record(z.string(), z.unknown()),
  format_type: z.enum(['number', 'percentage', 'currency', 'duration']).default('number'),
  target_value: z.number().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  is_active: z.boolean().default(true),
})

export type KpiDefinition = z.infer<typeof kpiDefinitionSchema>

export interface KpiDefinitionDB extends KpiDefinition {
  id: string
  org_id: string
  is_system: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface KpiValue {
  id: string
  org_id: string
  kpi_id: string
  metric_date: string
  metric_value: number
  user_id: string | null
  dimensions: Record<string, unknown>
  created_at: string
}

// =====================================================
// TEMPLATE DEFINITIONS
// =====================================================

export interface PointRuleTemplate {
  id: string
  action_type: string
  action_name: string
  points_value: number
  category: string
  description: string
  icon: string
  color: string
  bgColor: string
}

export interface AchievementTemplate {
  id: string
  name: string
  description: string
  icon: string
  requirement_type: 'points' | 'count' | 'streak' | 'custom_sql'
  requirement_value: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points_reward: number
  color: string
  bgColor: string
}

export interface ChallengeTemplate {
  id: string
  title: string
  description: string
  challenge_type: 'daily' | 'weekly' | 'monthly' | 'special'
  goal_metric: string
  goal_value: number
  reward_type: 'points' | 'prize' | 'both'
  reward_points: number
  duration_days: number
  icon: string
  color: string
  bgColor: string
}

export interface RewardTemplate {
  id: string
  name: string
  description: string
  reward_type: 'bonus' | 'gift_card' | 'time_off' | 'prize'
  points_required: number
  reward_value: string
  icon: string
  color: string
  bgColor: string
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  success: boolean
}

// =====================================================
// FORM STATE TYPES
// =====================================================

export interface PointRuleFormState extends Partial<PointRuleConfig> {
  _mode?: 'create' | 'edit'
}

export interface AchievementFormState extends Partial<AchievementConfig> {
  _mode?: 'create' | 'edit'
}

export interface ChallengeFormState extends Partial<ChallengeConfig> {
  _mode?: 'create' | 'edit'
}

export interface RewardFormState extends Partial<RewardConfig> {
  _mode?: 'create' | 'edit'
}

export interface KpiFormState extends Partial<KpiDefinition> {
  _mode?: 'create' | 'edit'
}
