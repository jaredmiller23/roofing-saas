/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for subscription.
 * Used for:
 * - New subscriptions
 * - Plan upgrades/downgrades
 * - Trial-to-paid conversions
 */

import { NextRequest } from 'next/server';
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session';
import { createCheckoutSession } from '@/lib/billing/checkout';
import { PLANS } from '@/lib/billing/plans';
import type { PlanTier, BillingInterval } from '@/lib/billing/types';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError,
} from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      throw AuthenticationError();
    }

    // Get tenant
    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant');
    }

    // Only admins/owners can change subscription
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      throw AuthorizationError('Only administrators can manage billing');
    }

    // Parse and validate body
    const body = await request.json();
    const { planTier, billingInterval, successUrl, cancelUrl } = body;

    // Validate plan tier
    if (!planTier || !Object.keys(PLANS).includes(planTier)) {
      throw ValidationError(
        `Invalid plan tier. Must be one of: ${Object.keys(PLANS).join(', ')}`
      );
    }

    // Validate billing interval
    if (!billingInterval || !['month', 'year'].includes(billingInterval)) {
      throw ValidationError('Invalid billing interval. Must be "month" or "year"');
    }

    // Validate URLs
    if (!successUrl || !cancelUrl) {
      throw ValidationError('successUrl and cancelUrl are required');
    }

    // Create checkout session
    const session = await createCheckoutSession({
      tenantId,
      userId: user.id,
      planTier: planTier as PlanTier,
      billingInterval: billingInterval as BillingInterval,
      successUrl,
      cancelUrl,
    });

    logger.info('Created checkout session', {
      tenantId,
      userId: user.id,
      planTier,
      billingInterval,
      sessionId: session.sessionId,
    });

    return successResponse({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
    });
  } catch (error) {
    logger.error('Error creating checkout session', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
