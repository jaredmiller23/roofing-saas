/**
 * AR Measurements API
 * Handles storage and retrieval of AR measurement data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ARMeasurement, DamageMarker, ARSession } from '@/lib/ar/ar-types'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { project_id, measurement, marker, session } = body

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    let result = null

    if (measurement) {
      // Save AR measurement
      result = await saveMeasurement(supabase, project_id, user.id, measurement)
    } else if (marker) {
      // Save damage marker
      result = await saveDamageMarker(supabase, project_id, user.id, marker)
    } else if (session) {
      // Save AR session
      result = await saveARSession(supabase, project_id, user.id, session)
    } else {
      return NextResponse.json(
        { success: false, error: 'No data provided' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AR measurements API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const sessionId = searchParams.get('session_id')

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get measurements and damage markers
    const measurementsQuery = supabase
      .from('ar_measurements')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    const markersQuery = supabase
      .from('ar_damage_markers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (sessionId) {
      measurementsQuery.eq('session_id', sessionId)
      markersQuery.eq('session_id', sessionId)
    }

    const [measurementsResult, markersResult] = await Promise.all([
      measurementsQuery,
      markersQuery
    ])

    if (measurementsResult.error) {
      throw new Error('Failed to fetch measurements: ' + measurementsResult.error.message)
    }

    if (markersResult.error) {
      throw new Error('Failed to fetch damage markers: ' + markersResult.error.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        measurements: measurementsResult.data || [],
        damage_markers: markersResult.data || []
      }
    })

  } catch (error) {
    console.error('AR measurements GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function saveMeasurement(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  measurement: ARMeasurement
) {
  try {
    const { data, error } = await supabase
      .from('ar_measurements')
      .insert({
        id: measurement.id,
        project_id: projectId,
        created_by: userId,
        type: measurement.type,
        value: measurement.value,
        unit: measurement.unit,
        points: measurement.points,
        metadata: measurement.metadata || {},
        created_at: measurement.metadata?.timestamp || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (_error) {
    return { success: false, error: 'Failed to save measurement' }
  }
}

async function saveDamageMarker(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  marker: DamageMarker
) {
  try {
    const { data, error } = await supabase
      .from('ar_damage_markers')
      .insert({
        id: marker.id,
        project_id: projectId,
        created_by: userId,
        position: marker.position,
        damage_type: marker.type,
        severity: marker.severity,
        description: marker.description,
        measurements: marker.measurements,
        photos: marker.photos || [],
        created_at: marker.created_at,
        updated_at: marker.updated_at
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (_error) {
    return { success: false, error: 'Failed to save damage marker' }
  }
}

async function saveARSession(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  session: ARSession
) {
  try {
    const { data, error } = await supabase
      .from('ar_sessions')
      .insert({
        id: session.id,
        project_id: projectId,
        created_by: userId,
        status: session.status,
        measurements: session.measurements,
        damage_markers: session.damage_markers,
        photos: session.photos,
        roof_model: session.roof_model,
        created_at: session.created_at,
        completed_at: session.completed_at
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (_error) {
    return { success: false, error: 'Failed to save AR session' }
  }
}
