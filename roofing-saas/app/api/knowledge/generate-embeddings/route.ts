/**
 * Generate Embeddings for Knowledge Base
 * One-time operation to generate embeddings for all knowledge entries
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateKnowledgeEmbedding, calculateEmbeddingCost } from '@/lib/embeddings'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth - only admins can generate embeddings
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    // Check if user is admin
    const tenantId = user.user_metadata?.tenant_id
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

    // Get all knowledge entries without embeddings
    const { data: knowledge, error: fetchError } = await supabase
      .from('roofing_knowledge')
      .select('id, title, content')
      .is('embedding', null)
      .eq('is_active', true)

    if (fetchError) {
      logger.error('Failed to fetch knowledge entries', { error: fetchError })
      throw InternalError('Failed to fetch knowledge entries')
    }

    if (!knowledge || knowledge.length === 0) {
      return successResponse({
        message: 'All knowledge entries already have embeddings',
        processed: 0,
        totalTokens: 0,
        estimatedCost: 0,
      })
    }

    // Generate embeddings
    let totalTokens = 0
    let successCount = 0
    const errors: string[] = []

    for (const entry of knowledge) {
      try {
        const result = await generateKnowledgeEmbedding(entry.title, entry.content)

        if (result) {
          // Update knowledge entry with embedding
          const { error: updateError } = await supabase
            .from('roofing_knowledge')
            .update({ embedding: JSON.stringify(result.embedding) })
            .eq('id', entry.id)

          if (updateError) {
            errors.push(`Failed to update ${entry.id}: ${updateError.message}`)
            logger.error('Failed to update embedding', { id: entry.id, error: updateError })
          } else {
            successCount++
            totalTokens += result.tokens
          }
        } else {
          errors.push(`Failed to generate embedding for ${entry.id}`)
        }

        // Rate limiting: small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errors.push(`Error processing ${entry.id}: ${error}`)
        logger.error('Error generating embedding', { id: entry.id, error })
      }
    }

    const estimatedCost = calculateEmbeddingCost(totalTokens)

    return successResponse({
      message: 'Embeddings generated successfully',
      processed: successCount,
      total: knowledge.length,
      totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    logger.error('Generate embeddings API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
