import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { workflowEngine } from '@/lib/automation/workflow-engine'
import type { VariableContext } from '@/lib/automation/workflow-types'
import { AuthenticationError, ValidationError, NotFoundError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const body = await request.json()
    const { workflow_id, trigger_data, context } = body

    if (!workflow_id || !trigger_data) {
      throw ValidationError('Missing required fields: workflow_id, trigger_data')
    }

    // Get workflow from the mock data or database
    const workflowResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automations/${workflow_id}`)
    if (!workflowResponse.ok) {
      throw NotFoundError('Workflow')
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
    return errorResponse(error as Error)
  }
}

// Endpoint for manually triggering workflows
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const body = await request.json()
    const { workflow_id, manual_data } = body

    if (!workflow_id) {
      throw ValidationError('Missing required field: workflow_id')
    }

    // Trigger manual workflow execution
    await workflowEngine.triggerManual(workflow_id, manual_data || {})

    return NextResponse.json({
      message: 'Manual workflow triggered successfully'
    })
  } catch (error) {
    console.error('Error triggering manual workflow:', error)
    return errorResponse(error as Error)
  }
}