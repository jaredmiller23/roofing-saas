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

import { isAdmin } from '@/lib/auth/session';
import { withAuth } from '@/lib/auth/with-auth';
import { createPortalSession } from '@/lib/billing/portal';
import {
  AuthorizationError,
  ValidationError,
  InternalError,
} from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/logger';

export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    // Only admins/owners can access billing portal
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      throw AuthorizationError('Only administrators can access the billing portal');
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
