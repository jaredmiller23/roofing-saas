import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/claims/documents/upload
 * Upload a document for a claim
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const claimId = formData.get('claimId') as string
    const documentType = formData.get('documentType') as string

    if (!file || !claimId) {
      return NextResponse.json(
        { error: 'File and claimId are required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Ensure storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === 'claim-documents')

    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('claim-documents', {
        public: false, // Private bucket - only authenticated users with RLS
        fileSizeLimit: MAX_FILE_SIZE,
      })

      if (bucketError) {
        logger.error('Failed to create claim-documents bucket:', { error: bucketError })
        // Continue anyway - bucket might exist but not be listed
      }
    }

    // Generate unique file path: {tenant_id}/{claim_id}/{timestamp}_{filename}
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${tenantUser.tenant_id}/${claimId}/${timestamp}_${sanitizedFileName}`

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('claim-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error('Storage upload error:', { error: uploadError })
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('claim-documents')
      .getPublicUrl(filePath)

    // Create document metadata record in documents table
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantUser.tenant_id,
        entity_type: 'claim',
        entity_id: claimId,
        name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        type: documentType || 'other',
        created_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Database insert error:', { error: dbError })
      // Clean up uploaded file
      await supabase.storage.from('claim-documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to save document metadata' },
        { status: 500 }
      )
    }

    logger.info('Document uploaded successfully', {
      documentId: document.id,
      claimId,
      fileName: file.name,
      userId: user.id,
    })

    return NextResponse.json({ document })
  } catch (error) {
    logger.error('Error in POST /api/claims/documents/upload:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
