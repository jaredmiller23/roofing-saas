/**
 * KPI by ID API
 *
 * NOTE: This feature is not yet implemented in production.
 * The kpi_snapshots/kpi_definitions tables do not exist in the production database.
 * Returns 501 Not Implemented until the feature is built.
 */

import { NextResponse } from 'next/server'

const NOT_IMPLEMENTED_RESPONSE = {
  success: false,
  error: {
    code: 'NOT_IMPLEMENTED',
    message: 'KPIs feature is not yet available. This feature is planned for a future release.',
  },
}

export async function GET() {
  return NextResponse.json(NOT_IMPLEMENTED_RESPONSE, { status: 501 })
}

export async function PATCH() {
  return NextResponse.json(NOT_IMPLEMENTED_RESPONSE, { status: 501 })
}

export async function DELETE() {
  return NextResponse.json(NOT_IMPLEMENTED_RESPONSE, { status: 501 })
}
