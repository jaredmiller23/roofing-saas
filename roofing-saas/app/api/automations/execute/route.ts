import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { workflowEngine } from '@/lib/automation/workflow-engine'
import type { VariableContext } from '@/lib/automation/workflow-types'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflow_id, trigger_data, context } = body

    if (!workflow_id || !trigger_data) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow_id, trigger_data' },
        { status: 400 }
      )
    }

    // Get workflow from the mock data or database
    const workflowResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automations/${workflow_id}`)
    if (!workflowResponse.ok) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const workflow = await workflowResponse.json()

    // Create execution context
    const executionContext: VariableContext = {
      contact: trigger_data.contact || {},
      project: trigger_data.project || {},
      user: { id: user.id, ...trigger_data.user },
      organization: trigger_data.organization || {},
      custom: trigger_data.custom || {},
      ...context
    }

    // Execute workflow
    const execution = await workflowEngine.executeWorkflow(
      workflow,
      trigger_data,
      executionContext
    )

    return NextResponse.json({
      execution_id: execution.id,
      status: execution.status,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      executed_actions: execution.executed_actions.length,
      error_message: execution.error_message
    })
  } catch (error) {
    console.error('Error executing workflow:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}

// Endpoint for manually triggering workflows
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflow_id, manual_data } = body

    if (!workflow_id) {
      return NextResponse.json(
        { error: 'Missing required field: workflow_id' },
        { status: 400 }
      )
    }

    // Trigger manual workflow execution
    await workflowEngine.triggerManual(workflow_id, manual_data || {})

    return NextResponse.json({
      message: 'Manual workflow triggered successfully'
    })
  } catch (error) {
    console.error('Error triggering manual workflow:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger workflow' },
      { status: 500 }
    )
  }
}