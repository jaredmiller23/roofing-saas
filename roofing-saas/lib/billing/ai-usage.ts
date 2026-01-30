/**
 * AI Usage Tracking
 *
 * Track AI token usage and cost per tenant.
 * Follows the same pattern as SMS/email usage in usage.ts.
 * All calls are fire-and-forget (.catch()) to never break the user experience.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// Cost Calculation
// =============================================================================

/**
 * Calculate cost in cents for chat completions (GPT-4o).
 * Average ~0.5 cents per 1K tokens (blended input/output).
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
