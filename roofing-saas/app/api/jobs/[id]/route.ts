import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * GET /api/jobs/[id]
 * Get a single job by ID
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

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/jobs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/jobs/[id]
 * Update a job
 * Workflow: When job status → "completed", project moves to "complete" stage
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

    // First, fetch the current job to check for status change
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id, project_id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    // Update the job
    const updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // If completing job, set completion date
    if (body.status === 'completed' && existingJob?.status !== 'completed') {
      updateData.completion_date = new Date().toISOString().split('T')[0]
      updateData.completion_percentage = 100
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Error updating job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Workflow automation: When job is marked complete, update project to "complete" stage
    let projectUpdated = false
    if (
      body.status === 'completed' &&
      existingJob?.status !== 'completed' &&
      existingJob?.project_id
    ) {
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          pipeline_stage: 'complete',
          status: 'completed',
          actual_completion: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingJob.project_id)
        .eq('tenant_id', tenantId)
        .eq('pipeline_stage', 'production') // Only update if still in production

      if (projectError) {
        console.error('Error updating project after job completion:', projectError)
        // Don't fail the job update, just log the error
      } else {
        projectUpdated = true
        console.log(`[Workflow] Job ${id} completed → Project ${existingJob.project_id} moved to "complete" stage`)
      }
    }

    return NextResponse.json({
      ...data,
      workflow: projectUpdated
        ? { project_moved_to_complete: true }
        : undefined,
    })
  } catch (error) {
    console.error('Error in PATCH /api/jobs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[id]
 * Soft delete a job
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

    const { data, error } = await supabase
      .from('jobs')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Error deleting job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/jobs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
