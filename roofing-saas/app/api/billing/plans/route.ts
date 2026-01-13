/**
 * GET /api/billing/plans
 *
 * Returns available subscription plans.
 * Public endpoint - no authentication required.
 */

import { NextRequest } from 'next/server';
import { getAllPlans } from '@/lib/billing/plans';
import { successResponse, errorResponse } from '@/lib/api/response';
import { InternalError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const plans = getAllPlans();

    // Return plans with formatted prices (don't expose Stripe price IDs)
    const publicPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxUsers: plan.maxUsers,
      maxSmsPerMonth: plan.maxSmsPerMonth,
      maxEmailsPerMonth: plan.maxEmailsPerMonth,
      features: plan.features,
      featureList: plan.featureList,
      featured: plan.featured,
    }));

    return successResponse({ plans: publicPlans });
  } catch (error) {
    logger.error('Error fetching plans', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
