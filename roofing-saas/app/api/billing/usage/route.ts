/**
 * GET /api/billing/usage
 * Returns current usage statistics for the tenant.
 *
 * POST /api/billing/usage
 * Increment usage counters (internal use).
 */

import { isAdmin } from '@/lib/auth/session';
import { withAuth } from '@/lib/auth/with-auth';
import { getUsageStats, checkUserLimit, checkSmsLimit, checkEmailLimit } from '@/lib/billing/feature-gates';
import { getCurrentUsage, incrementSmsUsage, incrementEmailUsage, updateUserCount } from '@/lib/billing/usage';
import {
  AuthorizationError,
  ValidationError,
  InternalError,
} from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/logger';

/**
 * GET /api/billing/usage
 * Get current usage statistics
 */
export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    // Get usage stats
    const stats = await getUsageStats(tenantId);
    const current = await getCurrentUsage(tenantId);

    // Get limits
    const userLimit = await checkUserLimit(tenantId);
    const smsLimit = await checkSmsLimit(tenantId);
    const emailLimit = await checkEmailLimit(tenantId);

    return successResponse({
      usage: {
        users: {
          current: stats.users.current,
          limit: stats.users.limit,
          unlimited: stats.users.unlimited,
          canAdd: userLimit.allowed,
        },
        sms: {
          current: stats.sms.current,
          limit: stats.sms.limit,
          unlimited: stats.sms.unlimited,
          remaining: smsLimit.remaining,
          canSend: smsLimit.allowed,
        },
        emails: {
          current: stats.emails.current,
          limit: stats.emails.limit,
          unlimited: stats.emails.unlimited,
          remaining: emailLimit.remaining,
          canSend: emailLimit.allowed,
        },
        ai: {
          tokens: current.aiTokens,
          costCents: current.aiCostCents,
          costDollars: current.aiCostCents / 100,
        },
      },
      resetAt: current.resetAt,
    });
  } catch (error) {
    logger.error('Error fetching usage', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
});

/**
 * POST /api/billing/usage
 * Increment usage counters (admin only, for testing)
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    // Only admins can manually increment usage
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required');
    }

    // Parse body
    const body = await request.json();
    const { type, amount = 1 } = body;

    if (!type || !['sms', 'email', 'users'].includes(type)) {
      throw ValidationError('Invalid type. Must be "sms", "email", or "users"');
    }

    if (typeof amount !== 'number' || amount < 0) {
      throw ValidationError('Invalid amount');
    }

    // Increment based on type
    switch (type) {
      case 'sms':
        await incrementSmsUsage(tenantId, amount);
        break;
      case 'email':
        await incrementEmailUsage(tenantId, amount);
        break;
      case 'users':
        await updateUserCount(tenantId);
        break;
    }

    // Return updated stats
    const stats = await getUsageStats(tenantId);

    return successResponse({
      message: `${type} usage updated`,
      usage: stats,
    });
  } catch (error) {
    logger.error('Error updating usage', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
});
