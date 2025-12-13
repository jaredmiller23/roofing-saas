/**
 * Claims Export API
 *
 * GET /api/projects/[id]/claims/export
 * Export a claim package for a project.
 * Returns all relevant data including photos, documents, and storm causation.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { generateClaimExportPackage } from '@/lib/claims/sync-service'
import { AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: projectId } = await params

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthenticationError()
    }

    // Validate projectId
    if (!projectId) {
      throw ValidationError('Project ID is required')
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project not found or access denied')
    }

    // Generate export package
    const exportPackage = await generateClaimExportPackage(supabase, projectId)

    if (!exportPackage) {
      throw InternalError('Failed to generate export package')
    }

    logger.info('Claim export package generated', {
      projectId,
      photoCount: exportPackage.photos.length,
      documentCount: exportPackage.documents.length,
      hasStormCausation: !!exportPackage.storm_causation,
    })

    // Check if JSON format requested (default)
    const format = request.nextUrl.searchParams.get('format') || 'json'

    if (format === 'json') {
      return successResponse({
        success: true,
        data: exportPackage,
      })
    }

    // For future: ZIP download format
    // This would bundle all files into a downloadable ZIP
    // For now, return JSON with signed URLs
    return successResponse({
      success: true,
      data: exportPackage,
      note: 'ZIP format not yet implemented. Use JSON format and download files individually.',
    })
  } catch (error) {
    logger.error('Claims export API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
