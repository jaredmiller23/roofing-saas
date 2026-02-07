/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session.
 * Allows customers to:
 * - View and download invoices
 * - Update payment methods
 * - Cancel subscription
 * - View billing history
 */

import { withAuth } from '@/lib/auth/with-auth';
import { checkPermission } from '@/lib/auth/check-permission';
import { createPortalSession } from '@/lib/billing/portal';
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
    // Require billing:view permission for portal access
    const canView = await checkPermission(userId, 'billing', 'view');
    if (!canView) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to access billing', 403));
    }

    // Parse body
    const body = await request.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      throw ValidationError('returnUrl is required');
    }

    // Create portal session
    const session = await createPortalSession({
      tenantId,
      returnUrl,
    });

    logger.info('Created portal session', {
      tenantId,
      userId,
    });

    return successResponse({
      portalUrl: session.portalUrl,
    });
  } catch (error) {
    logger.error('Error creating portal session', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
});
