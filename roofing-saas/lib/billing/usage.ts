/**
 * Usage Tracking
 *
 * Track and increment usage counters for:
 * - User count
 * - SMS sent
 * - Emails sent
 *
 * Counters reset monthly based on billing cycle.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// =============================================================================
// Increment Usage
// =============================================================================

/**
 * Increment SMS usage count
 */
export async function incrementSmsUsage(
  tenantId: string,
  count: number = 1
): Promise<void> {
  const supabase = await createAdminClient();

  // Check if usage needs to be reset (monthly)
  await resetUsageIfNeeded(tenantId);

  const { error } = await supabase.rpc('increment_subscription_usage', {
    p_tenant_id: tenantId,
    p_field: 'sms_used_this_month',
    p_amount: count,
  });

  if (error) {
    // Fallback: fetch current value and update with new total
    // This is not atomic but works as a fallback if RPC doesn't exist
    logger.warn('RPC increment failed, using fetch-and-update fallback', { error });

    const { data: current } = await supabase
      .from('subscriptions')
      .select('sms_used_this_month')
      .eq('tenant_id', tenantId)
      .single();

    const newTotal = (current?.sms_used_this_month || 0) + count;

    await supabase
      .from('subscriptions')
      .update({ sms_used_this_month: newTotal })
      .eq('tenant_id', tenantId);
  }

  logger.debug('Incremented SMS usage', { tenantId, count });
}

/**
 * Increment email usage count
 */
export async function incrementEmailUsage(
  tenantId: string,
  count: number = 1
): Promise<void> {
  const supabase = await createAdminClient();

  await resetUsageIfNeeded(tenantId);

  // Try atomic increment via RPC
  const { error } = await supabase.rpc('increment_subscription_usage', {
    p_tenant_id: tenantId,
    p_field: 'emails_used_this_month',
    p_amount: count,
  });

  if (error) {
    // Fallback: fetch current value and update with new total
    logger.warn('RPC increment failed, using fetch-and-update fallback', { error });

    const { data: current } = await supabase
      .from('subscriptions')
      .select('emails_used_this_month')
      .eq('tenant_id', tenantId)
      .single();

    const newTotal = (current?.emails_used_this_month || 0) + count;

    await supabase
      .from('subscriptions')
      .update({ emails_used_this_month: newTotal })
      .eq('tenant_id', tenantId);
  }

  logger.debug('Incremented email usage', { tenantId, count });
}

/**
 * Update user count (not incremental - sets actual count)
 */
export async function updateUserCount(tenantId: string): Promise<number> {
  const supabase = await createAdminClient();

  // Count actual users in tenant
  const { count, error } = await supabase
    .from('tenant_users')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    logger.error('Error counting users', { tenantId, error });
    throw error;
  }

  const userCount = count || 0;

  // Update subscription
  await supabase
    .from('subscriptions')
    .update({ users_count: userCount })
    .eq('tenant_id', tenantId);

  logger.debug('Updated user count', { tenantId, userCount });

  return userCount;
}

// =============================================================================
// Usage Reset
// =============================================================================

/**
 * Check if usage counters need to be reset (monthly)
 */
async function resetUsageIfNeeded(tenantId: string): Promise<boolean> {
  const supabase = await createAdminClient();

  // Get subscription with last reset date
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('usage_reset_at, current_period_start')
    .eq('tenant_id', tenantId)
    .single();

  if (!subscription) {
    return false;
  }

  const now = new Date();
  const lastReset = subscription.usage_reset_at
    ? new Date(subscription.usage_reset_at)
    : null;
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start)
    : null;

  // Determine if reset is needed
  // Reset if: no last reset, or last reset was before current period started
  const needsReset =
    !lastReset || (periodStart && lastReset < periodStart);

  if (needsReset) {
    await supabase
      .from('subscriptions')
      .update({
        sms_used_this_month: 0,
        emails_used_this_month: 0,
        ai_tokens_used_this_month: 0,
        ai_cost_this_month_cents: 0,
        usage_reset_at: now.toISOString(),
      })
      .eq('tenant_id', tenantId);

    logger.info('Reset monthly usage counters', { tenantId });
    return true;
  }

  return false;
}

/**
 * Force reset usage counters (admin function)
 */
export async function resetUsageCounters(tenantId: string): Promise<void> {
  const supabase = await createAdminClient();

  await supabase
    .from('subscriptions')
    .update({
      sms_used_this_month: 0,
      emails_used_this_month: 0,
      ai_tokens_used_this_month: 0,
      ai_cost_this_month_cents: 0,
      usage_reset_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);

  logger.info('Force reset usage counters', { tenantId });
}

// =============================================================================
// Usage Queries
// =============================================================================

/**
 * Get current month's usage
 */
export async function getCurrentUsage(tenantId: string): Promise<{
  sms: number;
  emails: number;
  users: number;
  aiTokens: number;
  aiCostCents: number;
  resetAt: string | null;
}> {
  const supabase = await createAdminClient();

  const { data } = await supabase
    .from('subscriptions')
    .select(
      'sms_used_this_month, emails_used_this_month, users_count, ai_tokens_used_this_month, ai_cost_this_month_cents, usage_reset_at'
    )
    .eq('tenant_id', tenantId)
    .single();

  return {
    sms: data?.sms_used_this_month || 0,
    emails: data?.emails_used_this_month || 0,
    users: data?.users_count || 0,
    aiTokens: data?.ai_tokens_used_this_month || 0,
    aiCostCents: data?.ai_cost_this_month_cents || 0,
    resetAt: data?.usage_reset_at || null,
  };
}

// =============================================================================
// Database Function
// =============================================================================
// The increment_subscription_usage() function is defined in:
// supabase/migrations/20260113210000_usage_increment_function.sql
//
// It provides atomic increment to prevent race conditions when
// multiple SMS/emails are sent concurrently.
