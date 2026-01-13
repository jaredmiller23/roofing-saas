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

import { NextRequest } from 'next/server';
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session';
import { createPortalSession } from '@/lib/billing/portal';
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

    // Only admins/owners can access billing portal
    const userIsAdmin = await isAdmin(user.id);
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
      userId: user.id,
    });

    return successResponse({
      portalUrl: session.portalUrl,
    });
  } catch (error) {
    logger.error('Error creating portal session', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
