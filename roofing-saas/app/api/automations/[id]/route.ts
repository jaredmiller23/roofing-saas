import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { Workflow, UpdateWorkflowInput } from '@/lib/automation/workflow-types'
import { AuthenticationError, NotFoundError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

// Mock data - in a real app this would connect to your database
// This should be the same reference as in the main route.ts
const mockWorkflows: Workflow[] = [
  {
    id: '1',
    tenant_id: 'tenant_1',
    name: 'New Lead Follow-up',
    description: 'Automatically follow up with new leads after 24 hours',
    status: 'active',
    trigger: {
      id: 'trigger_1',
      type: 'contact_created',
      config: { type: 'contact_created' },
      enabled: true
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Welcome {{contact.first_name}}!',
          body: 'Thank you for your interest. We\'ll be in touch soon.'
        },
        delay: 24,
        enabled: true,
        order: 0
      }
    ],
    conditions: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user_1',
    is_template: false,
    execution_count: 42,
    last_executed_at: '2024-01-15T10:30:00Z'
  }
]

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const { id } = await params
    const workflow = mockWorkflows.find(w => w.id === id)

    if (!workflow) {
      throw NotFoundError('Workflow')
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error('Error fetching workflow:', error)
    return errorResponse(error as Error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const { id } = await params
    const body: UpdateWorkflowInput = await request.json()

    const workflowIndex = mockWorkflows.findIndex(w => w.id === id)
    if (workflowIndex === -1) {
      throw NotFoundError('Workflow')
    }

    const existingWorkflow = mockWorkflows[workflowIndex]

    // Update workflow
    const updatedWorkflow: Workflow = {
      ...existingWorkflow,
      ...body,
      id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
      // Ensure triggers and actions have IDs
      trigger: body.trigger ? {
        ...body.trigger,
        id: body.trigger.id || existingWorkflow.trigger.id
      } : existingWorkflow.trigger,
      actions: body.actions ? body.actions.map((action, index) => ({
        ...action,
        id: action.id || `action_${Date.now()}_${index}`,
        order: index
      })) : existingWorkflow.actions
    }

    mockWorkflows[workflowIndex] = updatedWorkflow

    return NextResponse.json(updatedWorkflow)
  } catch (error) {
    console.error('Error updating workflow:', error)
    return errorResponse(error as Error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const { id } = await params
    const workflowIndex = mockWorkflows.findIndex(w => w.id === id)

    if (workflowIndex === -1) {
      throw NotFoundError('Workflow')
    }

    // Remove workflow from array (in real app, soft delete in database)
    mockWorkflows.splice(workflowIndex, 1)

    return NextResponse.json({ message: 'Workflow deleted successfully' })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    return errorResponse(error as Error)
  }
}