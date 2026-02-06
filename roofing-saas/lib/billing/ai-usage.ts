/**
 * AI Usage Tracking
 *
 * Track AI token usage and cost per tenant.
 * Supports multiple providers (OpenAI, Anthropic) with per-model pricing.
 * All calls are fire-and-forget (.catch()) to never break the user experience.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// Per-Model Pricing (cents per 1K tokens)
// =============================================================================

interface ModelPricing {
  inputPer1K: number
  outputPer1K: number
  cachedInputPer1K: number
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputPer1K: 0.25, outputPer1K: 1.0, cachedInputPer1K: 0.125 },
  'gpt-4o-mini': { inputPer1K: 0.015, outputPer1K: 0.06, cachedInputPer1K: 0.0075 },
  // Anthropic
  'claude-opus-4-6': { inputPer1K: 0.5, outputPer1K: 2.5, cachedInputPer1K: 0.05 },
  'claude-sonnet-4-5-20250929': { inputPer1K: 0.3, outputPer1K: 1.5, cachedInputPer1K: 0.03 },
  'claude-haiku-4-5-20251001': { inputPer1K: 0.1, outputPer1K: 0.5, cachedInputPer1K: 0.01 },
}

// =============================================================================
// Cost Calculation
// =============================================================================

/**
 * Calculate cost in cents with per-model pricing.
 * For Anthropic, uses separate input/output/cached token counts.
 */
export function calculateCostCents(params: {
  model: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
}): number {
  const pricing = MODEL_PRICING[params.model]
  if (!pricing) {
    // Fallback: blended 0.5 cents per 1K tokens (original GPT-4o estimate)
    return Math.ceil(((params.inputTokens + params.outputTokens) / 1000) * 0.5)
  }

  const uncachedInput = params.inputTokens - (params.cachedInputTokens || 0)
  const cachedInput = params.cachedInputTokens || 0

  const inputCost = (uncachedInput / 1000) * pricing.inputPer1K
  const cachedCost = (cachedInput / 1000) * pricing.cachedInputPer1K
  const outputCost = (params.outputTokens / 1000) * pricing.outputPer1K

  return Math.ceil(inputCost + cachedCost + outputCost)
}

/**
 * Calculate cost in cents for chat completions (GPT-4o).
 * Average ~0.5 cents per 1K tokens (blended input/output).
 * @deprecated Use calculateCostCents with per-model pricing instead.
 */
export function calculateChatCostCents(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * 0.5)
}

/**
 * Calculate cost in cents for embeddings (text-embedding-3-small).
 * ~0.002 cents per 1K tokens ($0.02 per 1M tokens).
 */
export function calculateEmbeddingCostCents(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * 0.002)
}

// =============================================================================
// Usage Increment
// =============================================================================

/**
 * Atomically increment AI token usage and cost for a tenant.
 * Fire-and-forget — never blocks the caller.
 */
export async function incrementAiUsage(
  tenantId: string,
  tokens: number,
  costCents: number
): Promise<void> {
  const supabase = await createAdminClient()

  // Increment tokens
  const { error: tokensError } = await supabase.rpc('increment_subscription_usage', {
    p_tenant_id: tenantId,
    p_field: 'ai_tokens_used_this_month',
    p_amount: tokens,
  })

  if (tokensError) {
    logger.warn('RPC increment AI tokens failed, using fallback', { error: tokensError })

    const { data: current } = await supabase
      .from('subscriptions')
      .select('ai_tokens_used_this_month')
      .eq('tenant_id', tenantId)
      .single()

    const newTotal = (current?.ai_tokens_used_this_month || 0) + tokens

    await supabase
      .from('subscriptions')
      .update({ ai_tokens_used_this_month: newTotal })
      .eq('tenant_id', tenantId)
  }

  // Increment cost
  const { error: costError } = await supabase.rpc('increment_subscription_usage', {
    p_tenant_id: tenantId,
    p_field: 'ai_cost_this_month_cents',
    p_amount: costCents,
  })

  if (costError) {
    logger.warn('RPC increment AI cost failed, using fallback', { error: costError })

    const { data: current } = await supabase
      .from('subscriptions')
      .select('ai_cost_this_month_cents')
      .eq('tenant_id', tenantId)
      .single()

    const newTotal = (current?.ai_cost_this_month_cents || 0) + costCents

    await supabase
      .from('subscriptions')
      .update({ ai_cost_this_month_cents: newTotal })
      .eq('tenant_id', tenantId)
  }

  logger.debug('Incremented AI usage', { tenantId, tokens, costCents })
}
