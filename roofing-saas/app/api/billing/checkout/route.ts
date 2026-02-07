/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for subscription.
 * Used for:
 * - New subscriptions
 * - Plan upgrades/downgrades
 * - Trial-to-paid conversions
 */

import { withAuth } from '@/lib/auth/with-auth';
import { checkPermission } from '@/lib/auth/check-permission';
import { createCheckoutSession } from '@/lib/billing/checkout';
import { PLANS } from '@/lib/billing/plans';
import type { PlanTier, BillingInterval } from '@/lib/billing/types';
import {
  ApiError,
  ErrorCode,
  ValidationError,
  InternalError,
} from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/logger';

export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    // Require billing:edit permission for checkout
    const canEdit = await checkPermission(userId, 'billing', 'edit', tenantId);
    if (!canEdit) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to manage billing', 403));
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
      userId,
      planTier: planTier as PlanTier,
      billingInterval: billingInterval as BillingInterval,
      successUrl,
      cancelUrl,
    });

    logger.info('Created checkout session', {
      tenantId,
      userId,
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
});
