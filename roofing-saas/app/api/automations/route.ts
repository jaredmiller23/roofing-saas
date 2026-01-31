import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  Workflow,
  CreateWorkflowInput,
  WorkflowFilters,
  WorkflowListResponse
} from '@/lib/automation/workflow-types'
import { AuthenticationError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

// Mock data - in a real app this would connect to your database
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
  },
  {
    id: '2',
    tenant_id: 'tenant_1',
    name: 'Stage Change Notification',
    description: 'Notify team when deal moves to proposal stage',
    status: 'active',
    trigger: {
      id: 'trigger_2',
      type: 'stage_changed',
      config: {
        type: 'stage_changed',
        to_stage: ['proposal']
      },
      enabled: true
    },
    actions: [
      {
        id: 'action_2',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: 'team@example.com',
          subject: 'Deal moved to proposal: {{contact.first_name}} {{contact.last_name}}',
          body: 'A deal has been moved to proposal stage and needs attention.'
        },
        enabled: true,
        order: 0
      }
    ],
    conditions: [],
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    created_by: 'user_1',
    is_template: false,
    execution_count: 18,
    last_executed_at: '2024-01-14T15:20:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const { searchParams } = new URL(request.url)
    const filters: WorkflowFilters = {
      status: searchParams.get('status')?.split(',') as WorkflowFilters['status'],
      trigger_type: searchParams.get('trigger_type')?.split(',') as WorkflowFilters['trigger_type'],
      is_template: searchParams.get('is_template') === 'true',
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    }

    // Filter workflows based on criteria
    const filteredWorkflows = mockWorkflows.filter(workflow => {
      // Filter by status
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(workflow.status)) return false
      }

      // Filter by trigger type
      if (filters.trigger_type && filters.trigger_type.length > 0) {
        if (!filters.trigger_type.includes(workflow.trigger.type)) return false
      }

      // Filter by template status
      if (filters.is_template !== undefined) {
        if (workflow.is_template !== filters.is_template) return false
      }

      // Filter by search term
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !workflow.name.toLowerCase().includes(searchLower) &&
          !workflow.description?.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      return true
    })

    // Sort by updated_at desc
    filteredWorkflows.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 50
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex)

    const response: WorkflowListResponse = {
      workflows: paginatedWorkflows,
      total: filteredWorkflows.length,
      page,
      limit,
      has_more: endIndex < filteredWorkflows.length
    }

    return successResponse(response)
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return errorResponse(error as Error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const body: CreateWorkflowInput = await request.json()

    // Validate required fields
    if (!body.name || !body.trigger || !body.actions) {
      throw ValidationError('Missing required fields: name, trigger, actions')
    }

    // Create new workflow
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      tenant_id: (user as { tenant_id?: string }).tenant_id || 'default',
      name: body.name,
      description: body.description,
      status: body.status || 'draft',
      trigger: {
        ...body.trigger,
        id: body.trigger.id || `trigger_${Date.now()}`
      },
      actions: body.actions.map((action, index) => ({
        ...action,
        id: action.id || `action_${Date.now()}_${index}`,
        order: index
      })),
      conditions: body.conditions || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
      is_template: false,
      execution_count: 0
    }

    // Add to mock data (in real app, save to database)
    mockWorkflows.push(newWorkflow)

    return createdResponse(newWorkflow)
  } catch (error) {
    console.error('Error creating workflow:', error)
    return errorResponse(error as Error)
  }
}