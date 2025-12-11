/**
 * Claims Export API
 *
 * GET /api/projects/[id]/claims/export
 * Export a claim package for a project.
 * Returns all relevant data including photos, documents, and storm causation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { generateClaimExportPackage } from '@/lib/claims/sync-service'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate projectId
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Generate export package
    const exportPackage = await generateClaimExportPackage(supabase, projectId)

    if (!exportPackage) {
      return NextResponse.json(
        { error: 'Failed to generate export package' },
        { status: 500 }
      )
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
      return NextResponse.json({
        success: true,
        data: exportPackage,
      })
    }

    // For future: ZIP download format
    // This would bundle all files into a downloadable ZIP
    // For now, return JSON with signed URLs
    return NextResponse.json({
      success: true,
      data: exportPackage,
      note: 'ZIP format not yet implemented. Use JSON format and download files individually.',
    })
  } catch (error) {
    logger.error('Claims export API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
