import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { BulkFileActionData } from '@/lib/types/file'

/**
 * POST /api/project-files/bulk
 * Perform bulk operations on multiple files
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('POST', '/api/project-files/bulk', { tenantId, userId: user.id })

    const body = await request.json()
    const actionData: BulkFileActionData = body

    if (!actionData.file_ids || actionData.file_ids.length === 0) {
      throw ValidationError('file_ids array is required and cannot be empty')
    }

    if (!actionData.operation) {
      throw ValidationError('operation is required')
    }

    if (actionData.file_ids.length > 100) {
      throw ValidationError('Cannot perform bulk operations on more than 100 files at once')
    }

    const supabase = await createClient()

    // Verify all files exist and belong to user's tenant
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('id, file_name, file_url, project_id, file_path, file_category, file_type')
      .in('id', actionData.file_ids)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (filesError) {
      throw mapSupabaseError(filesError)
    }

    if (!files || files.length !== actionData.file_ids.length) {
      throw ValidationError('Some files were not found or you do not have permission to access them')
    }

    let result: Record<string, unknown> = {}

    switch (actionData.operation) {
      case 'move_to_folder':
        result = await handleMoveToFolder(supabase, actionData.file_ids, actionData.target_folder_path, tenantId)
        break

      case 'change_category':
        if (!actionData.new_category) {
          throw ValidationError('new_category is required for change_category operation')
        }
        result = await handleChangeCategory(supabase, actionData.file_ids, actionData.new_category, tenantId)
        break

      case 'change_type':
        if (!actionData.new_type) {
          throw ValidationError('new_type is required for change_type operation')
        }
        result = await handleChangeType(supabase, actionData.file_ids, actionData.new_type, tenantId)
        break

      case 'delete':
        result = await handleDeleteFiles(supabase, actionData.file_ids, tenantId)
        break

      case 'archive':
        result = await handleArchiveFiles(supabase, actionData.file_ids, tenantId)
        break

      case 'download_zip':
        result = await handleDownloadZip(files)
        break

      default:
        throw ValidationError(`Unsupported operation: ${actionData.operation}`)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/project-files/bulk', 200, duration)
    logger.info('Bulk file operation completed', {
      operation: actionData.operation,
      fileCount: actionData.file_ids.length,
      tenantId
    })

    return successResponse({
      message: `Bulk ${actionData.operation} completed successfully`,
      operation: actionData.operation,
      affected_files: actionData.file_ids.length,
      ...result
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Bulk file operation error', { error, duration })
    return errorResponse(error as Error)
  }
}

// Helper function to move files to folder
async function handleMoveToFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileIds: string[],
  targetFolderPath: string | undefined | null,
  tenantId: string
) {
  const { error } = await supabase
    .from('project_files')
    .update({
      file_path: targetFolderPath || null,
      updated_at: new Date().toISOString()
    })
    .in('id', fileIds)
    .eq('tenant_id', tenantId)

  if (error) {
    throw mapSupabaseError(error)
  }

  return {
    target_folder_path: targetFolderPath || 'root',
    moved_files: fileIds.length
  }
}

// Helper function to change file category
async function handleChangeCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileIds: string[],
  newCategory: string,
  tenantId: string
) {
  const { error } = await supabase
    .from('project_files')
    .update({
      file_category: newCategory,
      updated_at: new Date().toISOString()
    })
    .in('id', fileIds)
    .eq('tenant_id', tenantId)

  if (error) {
    throw mapSupabaseError(error)
  }

  return {
    new_category: newCategory,
    updated_files: fileIds.length
  }
}

// Helper function to change file type
async function handleChangeType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileIds: string[],
  newType: string,
  tenantId: string
) {
  const { error } = await supabase
    .from('project_files')
    .update({
      file_type: newType,
      updated_at: new Date().toISOString()
    })
    .in('id', fileIds)
    .eq('tenant_id', tenantId)

  if (error) {
    throw mapSupabaseError(error)
  }

  return {
    new_type: newType,
    updated_files: fileIds.length
  }
}

// Helper function to delete files (soft delete)
async function handleDeleteFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileIds: string[],
  tenantId: string
) {
  const { error } = await supabase
    .from('project_files')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString()
    })
    .in('id', fileIds)
    .eq('tenant_id', tenantId)

  if (error) {
    throw mapSupabaseError(error)
  }

  return {
    deleted_files: fileIds.length
  }
}

// Helper function to archive files
async function handleArchiveFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileIds: string[],
  tenantId: string
) {
  const { error } = await supabase
    .from('project_files')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .in('id', fileIds)
    .eq('tenant_id', tenantId)

  if (error) {
    throw mapSupabaseError(error)
  }

  return {
    archived_files: fileIds.length
  }
}

// Helper function to handle download ZIP request
async function handleDownloadZip(files: Array<{ id: string; file_name: string; file_url: string }>) {
  // Return file information for client-side ZIP creation
  // This would typically be handled by a separate service or background job
  return {
    files_for_download: files.map(file => ({
      id: file.id,
      name: file.file_name,
      url: file.file_url
    })),
    download_note: 'Use the provided URLs to create ZIP archive on client side'
  }
}