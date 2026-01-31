/**
 * KPI by ID API
 *
 * NOTE: This feature is not yet implemented in production.
 * The kpi_snapshots/kpi_definitions tables do not exist in the production database.
 * Returns 501 Not Implemented until the feature is built.
 */

import { ApiError, ErrorCode } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

const notImplementedError = () =>
  new ApiError(
    ErrorCode.INTERNAL_ERROR,
    'KPIs feature is not yet available. This feature is planned for a future release.',
    501
  )

export async function GET() {
  return errorResponse(notImplementedError())
}

export async function PATCH() {
  return errorResponse(notImplementedError())
}

export async function DELETE() {
  return errorResponse(notImplementedError())
}
