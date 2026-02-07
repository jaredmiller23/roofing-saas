import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  ValidationError,
  NotFoundError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { FileVersion, VersionChangeType } from '@/lib/types/file'

/**
 * GET /api/project-files/versions
 * Get version history for a file
 */
export const GET = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get('file_id')

    if (!fileId) {
      throw ValidationError('file_id parameter is required')
    }

    logger.apiRequest('GET', '/api/project-files/versions', { tenantId, userId, fileId })

    const supabase = await createClient()

    // First, get the current file to ensure it exists and user has access
    const { data: currentFile, error: currentFileError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (currentFileError || !currentFile) {
      throw NotFoundError('File not found')
    }

    // Get all versions for this file
    // A file's versions are:
    // 1. Files where parent_file_id equals this file's ID (newer versions)
    // 2. If this file has a parent_file_id, get that parent and all its versions
    let rootFileId = currentFile.parent_file_id || currentFile.id

    // Get the root file if current file is a version
    let rootFile = currentFile
    if (currentFile.parent_file_id) {
      const { data: parentFile, error: parentError } = await supabase
        .from('project_files')
        .select('*')
        .eq('id', currentFile.parent_file_id)
        .eq('tenant_id', tenantId)
        .single()

      if (parentError || !parentFile) {
        throw NotFoundError('Parent file not found')
      }
      rootFile = parentFile
      rootFileId = parentFile.id
    }

    // Get all versions (files that have this root file as parent)
    const { data: versions, error: versionsError } = await supabase
      .from('project_files')
      .select(`
        id,
        file_name,
        file_url,
        file_size,
        version,
        created_at,
        updated_at,
        uploaded_by,
        description
      `)
      .eq('parent_file_id', rootFileId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('version', { ascending: false })

    if (versionsError) {
      throw mapSupabaseError(versionsError)
    }

    // Convert to FileVersion format (create mock version records)
    const fileVersions: FileVersion[] = (versions || []).map(version => ({
      id: version.id,
      file_id: rootFileId,
      version: version.version ?? 1,
      file_url: version.file_url ?? '',
      file_size: version.file_size ?? 0,
      change_type: 'updated' as VersionChangeType, // Default to updated
      change_description: version.description ?? null,
      created_by: version.uploaded_by ?? '',
      created_at: version.created_at ?? new Date().toISOString(),
      metadata: {}
    }))

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/project-files/versions', 200, duration)

    const response = {
      versions: fileVersions,
      current_version: currentFile,
      total_versions: fileVersions.length + 1, // +1 for current version
      root_file: rootFile
    }

    return successResponse(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('File versions API error', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * POST /api/project-files/versions
 * Create a new version of a file
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/project-files/versions', { tenantId, userId })

    const body = await request.json()
    const {
      file_id,
      file_url,
      file_name,
      file_size,
      change_description,
      change_type = 'updated'
    } = body

    if (!file_id || !file_url) {
      throw ValidationError('file_id and file_url are required')
    }

    const supabase = await createClient()

    // Get the original file
    const { data: originalFile, error: originalError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', file_id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (originalError || !originalFile) {
      throw NotFoundError('Original file not found')
    }

    // Determine the root file ID and next version number
    const rootFileId = originalFile.parent_file_id || originalFile.id

    // Get the highest version number for this file family
    const { data: latestVersion, error: versionError } = await supabase
      .from('project_files')
      .select('version')
      .or(`id.eq.${rootFileId},parent_file_id.eq.${rootFileId}`)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (versionError && versionError.code !== 'PGRST116') {
      throw mapSupabaseError(versionError)
    }

    const nextVersion = (latestVersion?.version || originalFile.version || 1) + 1

    // Create the new version
    const newVersionData = {
      file_name: file_name || `${originalFile.file_name}_v${nextVersion}`,
      file_type: originalFile.file_type,
      file_category: originalFile.file_category,
      file_url,
      file_size,
      project_id: originalFile.project_id,
      folder_path: originalFile.folder_path,
      description: change_description,
      tenant_id: tenantId,
      uploaded_by: userId,
      status: 'active' as const,
      version: nextVersion,
      parent_file_id: rootFileId,
      is_deleted: false
    }

    const { data: newVersion, error: createError } = await supabase
      .from('project_files')
      .insert(newVersionData)
      .select()
      .single()

    if (createError) {
      throw mapSupabaseError(createError)
    }

    // Update the original file's updated_at timestamp
    await supabase
      .from('project_files')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', rootFileId)

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/project-files/versions', 201, duration)
    logger.info('File version created', {
      fileId: newVersion.id,
      originalFileId: file_id,
      version: nextVersion,
      tenantId
    })

    return createdResponse({
      version: newVersion,
      version_info: {
        id: newVersion.id,
        file_id: rootFileId,
        version: nextVersion,
        file_url,
        file_size,
        change_type,
        change_description,
        created_by: userId,
        created_at: newVersion.created_at,
        metadata: {}
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create file version error', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * PUT /api/project-files/versions/restore
 * Restore a specific version as the current version
 */
export const PUT = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('PUT', '/api/project-files/versions/restore', { tenantId, userId })

    const body = await request.json()
    const { version_id, change_description } = body

    if (!version_id) {
      throw ValidationError('version_id is required')
    }

    const supabase = await createClient()

    // Get the version to restore
    const { data: versionToRestore, error: versionError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', version_id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (versionError || !versionToRestore) {
      throw NotFoundError('Version not found')
    }

    if (!versionToRestore.parent_file_id) {
      throw ValidationError('Cannot restore root file as version')
    }

    // Get the root file
    const { data: rootFile, error: rootError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', versionToRestore.parent_file_id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (rootError || !rootFile) {
      throw NotFoundError('Root file not found')
    }

    // Get next version number
    const { data: latestVersion, error: latestError } = await supabase
      .from('project_files')
      .select('version')
      .or(`id.eq.${rootFile.id},parent_file_id.eq.${rootFile.id}`)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (latestError && latestError.code !== 'PGRST116') {
      throw mapSupabaseError(latestError)
    }

    const nextVersion = (latestVersion?.version || rootFile.version || 1) + 1

    // Create new version with restored content
    const restoredVersionData = {
      file_name: versionToRestore.file_name,
      file_type: versionToRestore.file_type,
      file_category: versionToRestore.file_category,
      file_url: versionToRestore.file_url,
      file_size: versionToRestore.file_size,
      project_id: rootFile.project_id,
      folder_path: rootFile.folder_path,
      description: change_description || `Restored from version ${versionToRestore.version}`,
      tenant_id: tenantId,
      uploaded_by: userId,
      status: 'active' as const,
      version: nextVersion,
      parent_file_id: rootFile.id,
      is_deleted: false
    }

    const { data: restoredVersion, error: restoreError } = await supabase
      .from('project_files')
      .insert(restoredVersionData)
      .select()
      .single()

    if (restoreError) {
      throw mapSupabaseError(restoreError)
    }

    // Update root file with restored content
    const { error: updateRootError } = await supabase
      .from('project_files')
      .update({
        file_url: versionToRestore.file_url,
        file_size: versionToRestore.file_size,
        version: nextVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', rootFile.id)

    if (updateRootError) {
      throw mapSupabaseError(updateRootError)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PUT', '/api/project-files/versions/restore', 200, duration)
    logger.info('File version restored', {
      restoredVersionId: version_id,
      newVersionId: restoredVersion.id,
      rootFileId: rootFile.id,
      tenantId
    })

    return successResponse({
      message: 'Version restored successfully',
      restored_version: restoredVersion,
      root_file_updated: true
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Restore file version error', { error, duration })
    return errorResponse(error as Error)
  }
})
