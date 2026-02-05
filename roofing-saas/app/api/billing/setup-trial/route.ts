/**
 * Trial Setup API Route
 *
 * Creates a tenant and trial subscription for newly registered users.
 * Called after email verification in the auth callback.
 */

import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createTrialSubscription } from '@/lib/billing/subscription';
import { logger } from '@/lib/logger';
import { AuthenticationError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw AuthenticationError('Not authenticated');
    }

    const adminClient = await createAdminClient();

    // Check if user already has a tenant
    const { data: existingTenantUser } = await adminClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingTenantUser?.tenant_id) {
      // User already has a tenant - check if they have a subscription
      const { data: existingSubscription } = await adminClient
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', existingTenantUser.tenant_id)
        .single();

      if (existingSubscription) {
        return successResponse({
          tenantId: existingTenantUser.tenant_id,
          subscriptionId: existingSubscription.id,
          message: 'User already has tenant and subscription',
        });
      }

      // User has tenant but no subscription - create trial
      const subscription = await createTrialSubscription(
        existingTenantUser.tenant_id
      );

      logger.info('Created trial subscription for existing tenant', {
        userId: user.id,
        tenantId: existingTenantUser.tenant_id,
        subscriptionId: subscription.id,
      });

      return successResponse({
        tenantId: existingTenantUser.tenant_id,
        subscriptionId: subscription.id,
        message: 'Created trial subscription for existing tenant',
      });
    }

    // User has no tenant - create new tenant for self-service registration
    const companyName =
      user.user_metadata?.company_name ||
      user.user_metadata?.full_name?.split(' ')[0] + "'s Company" ||
      'New Company';

    // Create new tenant
    const { data: newTenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: companyName,
        phone: user.user_metadata?.phone || null,
        subdomain: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50),
        subscription_tier: 'starter',
        onboarding_completed: false,
      })
      .select()
      .single();

    if (tenantError || !newTenant) {
      logger.error('Failed to create tenant', { userId: user.id, error: tenantError });
      throw InternalError('Failed to create tenant');
    }

    // Add user to tenant as owner
    const { error: tenantUserError } = await adminClient
      .from('tenant_users')
      .insert({
        tenant_id: newTenant.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (tenantUserError) {
      logger.error('Failed to link user to tenant', {
        userId: user.id,
        tenantId: newTenant.id,
        error: tenantUserError,
      });
      // Don't fail - the tenant was created
    }

    // Create trial subscription
    const subscription = await createTrialSubscription(newTenant.id);

    logger.info('Created new tenant and trial subscription', {
      userId: user.id,
      tenantId: newTenant.id,
      subscriptionId: subscription.id,
    });

    return successResponse({
      tenantId: newTenant.id,
      subscriptionId: subscription.id,
      message: 'Created new tenant and trial subscription',
    });
  } catch (error) {
    logger.error('Error in trial setup', { error });
    return errorResponse(error instanceof Error ? error : InternalError('Failed to setup trial'));
  }
}
