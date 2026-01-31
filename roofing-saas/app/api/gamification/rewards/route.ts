/**
 * Rewards API
 *
 * NOTE: This feature is not yet implemented in production.
 * The reward_configs table does not exist in the production database.
 * Returns 501 Not Implemented until the feature is built.
 */

import { ApiError, ErrorCode } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

const notImplementedError = () =>
  new ApiError(
    ErrorCode.INTERNAL_ERROR,
    'Rewards feature is not yet available. This feature is planned for a future release.',
    501
  )

export async function GET() {
  return errorResponse(notImplementedError())
}

export async function POST() {
  return errorResponse(notImplementedError())
}
