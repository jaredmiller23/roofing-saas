import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/project-files/[id]
 * Get a single project file by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: file, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ file })
  } catch (error) {
    console.error('Get project file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/project-files/[id]
 * Update a project file
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    const { data: file, error } = await supabase
      .from('project_files')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !file) {
      return NextResponse.json(
        { error: 'Failed to update file' },
        { status: 400 }
      )
    }

    return NextResponse.json({ file })
  } catch (error) {
    console.error('Update project file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/project-files/[id]
 * Soft delete a project file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('project_files')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
