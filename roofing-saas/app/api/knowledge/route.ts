/**
 * Knowledge Base CRUD API
 * Manage roofing knowledge entries
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { generateKnowledgeEmbedding } from '@/lib/embeddings'
import { incrementAiUsage, calculateEmbeddingCostCents } from '@/lib/billing/ai-usage'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const manufacturer = searchParams.get('manufacturer')
    const isGlobal = searchParams.get('global') === 'true'

    let query = supabase
      .from('roofing_knowledge')
      .select('id, title, content, category, subcategory, manufacturer, tags, is_global, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (manufacturer) {
      query = query.eq('manufacturer', manufacturer)
    }

    if (isGlobal) {
      query = query.eq('is_global', true)
    }

    const { data: knowledge, error } = await query

    if (error) {
      logger.error('Failed to fetch knowledge', { error })
      throw InternalError('Failed to fetch knowledge')
    }

    return successResponse({ knowledge: knowledge || [] })
  } catch (error) {
    logger.error('Knowledge API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Check if user is admin
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }
    const { data: roleAssignment } = await supabase
      .from('user_role_assignments')
      .select('role_id, user_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .in('user_roles.name', ['owner', 'admin'])
      .single()

    if (!roleAssignment) {
      throw AuthorizationError('Admin access required')
    }

    const body = await request.json()
    const {
      title,
      content,
      category,
      subcategory,
      manufacturer,
      tags,
      source_url,
      is_global = false,
      generate_embedding = true,
    } = body

    if (!title || !content || !category) {
      throw ValidationError('Title, content, and category are required')
    }

    // Generate embedding if requested
    let embedding = null
    if (generate_embedding) {
      const embeddingResult = await generateKnowledgeEmbedding(title, content)
      if (embeddingResult) {
        embedding = JSON.stringify(embeddingResult.embedding)
        // Track embedding token usage (fire-and-forget)
        if (embeddingResult.tokens > 0) {
          const costCents = calculateEmbeddingCostCents(embeddingResult.tokens)
          incrementAiUsage(tenantId, embeddingResult.tokens, costCents).catch(err =>
            logger.error('Failed to track embedding usage', { error: err })
          )
        }
      }
    }

    // Insert knowledge entry
    const { data: knowledge, error: insertError } = await supabase
      .from('roofing_knowledge')
      .insert({
        title,
        content,
        category,
        subcategory,
        manufacturer,
        tags: tags || [],
        source_url,
        is_global,
        tenant_id: is_global ? null : tenantId,
        embedding,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create knowledge entry', { error: insertError })
      throw InternalError('Failed to create knowledge entry')
    }

    return createdResponse({ knowledge })
  } catch (error) {
    logger.error('Knowledge creation API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Check if user is admin
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }
    const { data: roleAssignment } = await supabase
      .from('user_role_assignments')
      .select('role_id, user_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .in('user_roles.name', ['owner', 'admin'])
      .single()

    if (!roleAssignment) {
      throw AuthorizationError('Admin access required')
    }

    const body = await request.json()
    const { id, regenerate_embedding = false, ...updates } = body

    if (!id) {
      throw ValidationError('Knowledge ID is required')
    }

    // Regenerate embedding if requested or if title/content changed
    if (regenerate_embedding || updates.title || updates.content) {
      // Get current entry
      const { data: current } = await supabase
        .from('roofing_knowledge')
        .select('title, content')
        .eq('id', id)
        .single()

      if (current) {
        const title = updates.title || current.title
        const content = updates.content || current.content

        const embeddingResult = await generateKnowledgeEmbedding(title, content)
        if (embeddingResult) {
          updates.embedding = JSON.stringify(embeddingResult.embedding)
          // Track embedding token usage (fire-and-forget)
          if (embeddingResult.tokens > 0) {
            const costCents = calculateEmbeddingCostCents(embeddingResult.tokens)
            incrementAiUsage(tenantId, embeddingResult.tokens, costCents).catch(err =>
              logger.error('Failed to track embedding usage', { error: err })
            )
          }
        }
      }
    }

    const { data: knowledge, error: updateError } = await supabase
      .from('roofing_knowledge')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update knowledge entry', { error: updateError })
      throw InternalError('Failed to update knowledge entry')
    }

    return successResponse({ knowledge })
  } catch (error) {
    logger.error('Knowledge update API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Check if user is admin
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }
    const { data: roleAssignment } = await supabase
      .from('user_role_assignments')
      .select('role_id, user_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .in('user_roles.name', ['owner', 'admin'])
      .single()

    if (!roleAssignment) {
      throw AuthorizationError('Admin access required')
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      throw ValidationError('Knowledge ID is required')
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('roofing_knowledge')
      .update({ is_active: false })
      .eq('id', id)

    if (deleteError) {
      logger.error('Failed to delete knowledge entry', { error: deleteError })
      throw InternalError('Failed to delete knowledge entry')
    }

    return successResponse({ message: 'Knowledge entry deleted successfully' })
  } catch (error) {
    logger.error('Knowledge deletion API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
