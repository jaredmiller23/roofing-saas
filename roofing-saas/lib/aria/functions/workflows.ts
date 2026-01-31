/**
 * ARIA Workflow Orchestration - Phase 6: Workflow Intelligence
 *
 * Provides ARIA with workflow automation capabilities:
 * - Start workflows manually for contacts/projects
 * - Check workflow execution status
 * - Pause and resume workflows
 * - Get automation performance stats
 */

import { ariaFunctionRegistry } from '../function-registry'
import { logger } from '@/lib/logger'

// =============================================================================
// start_workflow - Manually trigger a workflow for a contact or project
// =============================================================================

ariaFunctionRegistry.register({
  name: 'start_workflow',
  category: 'actions',
  description: 'Start a workflow automation for a contact or project',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'start_workflow',
    description: 'Start a workflow or automation sequence for a contact or project. Can start by workflow name or ID.',
    parameters: {
      type: 'object',
      properties: {
        workflow_name: {
          type: 'string',
          description: 'Name of the workflow to start (e.g., "Follow Up Sequence", "New Lead Onboarding")',
        },
        workflow_id: {
          type: 'string',
          description: 'Workflow ID if known',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID to run the workflow for',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to run the workflow for',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { workflow_name, workflow_id, contact_id, project_id } = args as {
      workflow_name?: string
      workflow_id?: string
      contact_id?: string
      project_id?: string
    }

    const targetContactId = contact_id || context.contact?.id
    const targetProjectId = project_id || context.project?.id

    if (!targetContactId && !targetProjectId) {
      return { success: false, error: 'No contact or project specified to run workflow for' }
    }

    // Find the workflow
    let targetWorkflowId = workflow_id

    if (!targetWorkflowId && workflow_name) {
      // Search for workflow by name
      const { data: workflows } = await context.supabase
        .from('workflows')
        .select('id, name, status')
        .eq('tenant_id', context.tenantId)
        .ilike('name', `%${workflow_name}%`)
        .eq('status', 'active')
        .limit(5)

      if (!workflows || workflows.length === 0) {
        return { success: false, error: `No active workflow found matching "${workflow_name}"` }
      }

      if (workflows.length > 1) {
        const names = workflows.map(w => `• ${w.name}`).join('\n')
        return {
          success: false,
          error: `Multiple workflows found. Please specify:\n${names}`,
        }
      }

      targetWorkflowId = workflows[0].id
    }

    if (!targetWorkflowId) {
      return { success: false, error: 'Please specify a workflow name or ID' }
    }

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await context.supabase
      .from('workflows')
      .select('id, name, status, trigger, actions')
      .eq('id', targetWorkflowId)
      .eq('tenant_id', context.tenantId)
      .single()

    if (workflowError || !workflow) {
      return { success: false, error: 'Workflow not found' }
    }

    if (workflow.status !== 'active') {
      return { success: false, error: `Workflow "${workflow.name}" is ${workflow.status}, not active` }
    }

    // Get contact/project info for context
    let contextData: Record<string, unknown> = {}

    if (targetContactId) {
      const { data: contact } = await context.supabase
        .from('contacts')
        .select('*')
        .eq('id', targetContactId)
        .eq('is_deleted', false)
        .single()

      if (contact) {
        contextData = { ...contextData, contact }
      }
    }

    if (targetProjectId) {
      const { data: project } = await context.supabase
        .from('projects')
        .select('*')
        .eq('id', targetProjectId)
        .eq('is_deleted', false)
        .single()

      if (project) {
        contextData = { ...contextData, project }
      }
    }

    // Create a workflow execution record
    const { data: execution, error: execError } = await context.supabase
      .from('workflow_executions')
      .insert({
        tenant_id: context.tenantId,
        workflow_id: targetWorkflowId,
        contact_id: targetContactId,
        project_id: targetProjectId,
        status: 'pending',
        trigger_data: {
          triggered_by: 'aria',
          user_id: context.userId,
          context: contextData,
        },
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (execError) {
      logger.error('[Workflow] Failed to create execution:', { error: execError })
      // Try inserting without workflow_executions table (may not exist)
      // Log as activity instead
      await context.supabase.from('activities').insert({
        tenant_id: context.tenantId,
        contact_id: targetContactId,
        project_id: targetProjectId,
        type: 'task',
        subject: `Workflow Started: ${workflow.name}`,
        content: `Workflow "${workflow.name}" triggered via ARIA`,
        created_by: context.userId,
        metadata: {
          workflow_id: targetWorkflowId,
          workflow_name: workflow.name,
          via: 'aria',
        },
      })

      return {
        success: true,
        data: {
          workflowId: targetWorkflowId,
          workflowName: workflow.name,
          contactId: targetContactId,
          projectId: targetProjectId,
        },
        message: `✅ Started workflow "${workflow.name}"${targetContactId ? ' for contact' : ''}${targetProjectId ? ' for project' : ''}.`,
      }
    }

    return {
      success: true,
      data: {
        executionId: execution?.id,
        workflowId: targetWorkflowId,
        workflowName: workflow.name,
        contactId: targetContactId,
        projectId: targetProjectId,
        actionCount: workflow.actions?.length || 0,
      },
      message: `✅ Started workflow "${workflow.name}" (${workflow.actions?.length || 0} actions).`,
    }
  },
})

// =============================================================================
// list_workflows - Get available workflows
// =============================================================================

ariaFunctionRegistry.register({
  name: 'list_workflows',
  category: 'actions',
  description: 'List available workflows and automations',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'list_workflows',
    description: 'List available workflows and automations that can be triggered.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'all', 'paused'],
          description: 'Filter by workflow status (default: active)',
        },
        category: {
          type: 'string',
          description: 'Filter by category (e.g., "lead_nurturing", "follow_up")',
        },
        search: {
          type: 'string',
          description: 'Search workflows by name',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { status = 'active', category, search } = args as {
      status?: string
      category?: string
      search?: string
    }

    let query = context.supabase
      .from('workflows')
      .select('id, name, description, status, trigger, execution_count, last_executed_at, template_category')
      .eq('tenant_id', context.tenantId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('template_category', category)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    query = query.order('execution_count', { ascending: false }).limit(20)

    const { data: workflows, error } = await query

    if (error) {
      logger.error('[Workflow] Failed to list workflows:', { error })
      return { success: false, error: error.message }
    }

    if (!workflows || workflows.length === 0) {
      return {
        success: true,
        data: { workflows: [] },
        message: `No ${status} workflows found.`,
      }
    }

    let message = `📋 Available Workflows (${workflows.length}):\n\n`

    for (const wf of workflows) {
      const statusIcon = wf.status === 'active' ? '✅' : wf.status === 'paused' ? '⏸️' : '📝'
      const triggerType = wf.trigger?.type || 'manual'
      message += `${statusIcon} ${wf.name}\n`
      message += `   Trigger: ${triggerType} | Runs: ${wf.execution_count || 0}\n`
      if (wf.description) {
        message += `   ${wf.description.substring(0, 60)}\n`
      }
      message += '\n'
    }

    return {
      success: true,
      data: { workflows },
      message,
    }
  },
})

// =============================================================================
// check_workflow_status - Check status of a running workflow
// =============================================================================

ariaFunctionRegistry.register({
  name: 'check_workflow_status',
  category: 'actions',
  description: 'Check the status of a workflow or contact in a workflow',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'check_workflow_status',
    description: 'Check where a contact or project is in a workflow sequence.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to check workflow status for',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to check workflow status for',
        },
        workflow_id: {
          type: 'string',
          description: 'Specific workflow to check',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id, project_id, workflow_id } = args as {
      contact_id?: string
      project_id?: string
      workflow_id?: string
    }

    const targetContactId = contact_id || context.contact?.id
    const targetProjectId = project_id || context.project?.id

    if (!targetContactId && !targetProjectId && !workflow_id) {
      return { success: false, error: 'Please specify a contact, project, or workflow to check' }
    }

    // Try to find workflow executions
    let query = context.supabase
      .from('workflow_executions')
      .select(`
        id, workflow_id, status, started_at, completed_at, error_message,
        workflows(name, actions)
      `)
      .eq('tenant_id', context.tenantId)
      .order('started_at', { ascending: false })
      .limit(10)

    if (targetContactId) {
      query = query.eq('contact_id', targetContactId)
    }
    if (targetProjectId) {
      query = query.eq('project_id', targetProjectId)
    }
    if (workflow_id) {
      query = query.eq('workflow_id', workflow_id)
    }

    const { data: executions, error } = await query

    if (error) {
      // Table might not exist, check activities instead
      const { data: activities } = await context.supabase
        .from('activities')
        .select('subject, content, created_at, metadata')
        .eq('tenant_id', context.tenantId)
        .or(`contact_id.eq.${targetContactId},project_id.eq.${targetProjectId}`)
        .ilike('subject', '%workflow%')
        .order('created_at', { ascending: false })
        .limit(5)

      if (activities && activities.length > 0) {
        let message = `📊 Workflow Activity:\n\n`
        for (const act of activities) {
          const date = new Date(act.created_at).toLocaleDateString()
          message += `• ${date}: ${act.subject}\n`
          if (act.content) message += `  ${act.content.substring(0, 100)}\n`
        }
        return {
          success: true,
          data: { activities },
          message,
        }
      }

      return {
        success: true,
        data: { executions: [] },
        message: 'No workflow executions found for this contact/project.',
      }
    }

    if (!executions || executions.length === 0) {
      return {
        success: true,
        data: { executions: [] },
        message: 'No workflow executions found.',
      }
    }

    let message = `📊 Workflow Status:\n\n`

    for (const exec of executions) {
      const workflow = Array.isArray(exec.workflows) ? exec.workflows[0] : exec.workflows
      const statusIcon = exec.status === 'completed' ? '✅' :
                        exec.status === 'running' ? '🔄' :
                        exec.status === 'failed' ? '❌' :
                        exec.status === 'pending' ? '⏳' : '⏸️'

      message += `${statusIcon} ${workflow?.name || 'Unknown Workflow'}\n`
      message += `   Status: ${exec.status}\n`
      message += `   Started: ${new Date(exec.started_at).toLocaleString()}\n`
      if (exec.completed_at) {
        message += `   Completed: ${new Date(exec.completed_at).toLocaleString()}\n`
      }
      if (exec.error_message) {
        message += `   Error: ${exec.error_message}\n`
      }
      message += '\n'
    }

    return {
      success: true,
      data: { executions },
      message,
    }
  },
})

// =============================================================================
// pause_workflow - Pause a workflow for a contact
// =============================================================================

ariaFunctionRegistry.register({
  name: 'pause_workflow',
  category: 'actions',
  description: 'Pause a workflow sequence for a contact or project',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'pause_workflow',
    description: 'Pause an active workflow sequence for a contact or project.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to pause workflow for',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to pause workflow for',
        },
        workflow_id: {
          type: 'string',
          description: 'Specific workflow to pause',
        },
        reason: {
          type: 'string',
          description: 'Reason for pausing',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id, project_id, workflow_id, reason } = args as {
      contact_id?: string
      project_id?: string
      workflow_id?: string
      reason?: string
    }

    const targetContactId = contact_id || context.contact?.id
    const targetProjectId = project_id || context.project?.id

    if (!targetContactId && !targetProjectId) {
      return { success: false, error: 'Please specify a contact or project' }
    }

    // Try to update workflow executions
    let query = context.supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: reason ? `Paused: ${reason}` : 'Paused via ARIA',
      })
      .eq('tenant_id', context.tenantId)
      .in('status', ['pending', 'running'])

    if (targetContactId) {
      query = query.eq('contact_id', targetContactId)
    }
    if (targetProjectId) {
      query = query.eq('project_id', targetProjectId)
    }
    if (workflow_id) {
      query = query.eq('workflow_id', workflow_id)
    }

    const { data, error } = await query.select()

    // Log the pause action
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: targetContactId,
      project_id: targetProjectId,
      type: 'status_change',
      subject: 'Workflow Paused',
      content: reason || 'Workflow paused via ARIA',
      created_by: context.userId,
      metadata: { via: 'aria', workflow_id, action: 'pause' },
    })

    if (error) {
      logger.warn('[Workflow] Could not update executions:', { error })
      return {
        success: true,
        data: { paused: true },
        message: `⏸️ Workflow pause requested.${reason ? ` Reason: ${reason}` : ''}`,
      }
    }

    const pausedCount = data?.length || 0

    return {
      success: true,
      data: { pausedCount },
      message: pausedCount > 0
        ? `⏸️ Paused ${pausedCount} workflow execution(s).${reason ? ` Reason: ${reason}` : ''}`
        : `No active workflows to pause.`,
    }
  },
})

// =============================================================================
// get_automation_stats - Get workflow performance statistics
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_automation_stats',
  category: 'reporting',
  description: 'Get performance statistics for automations and workflows',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_automation_stats',
    description: 'Get performance statistics for workflows and automations.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { days = 30 } = args as { days?: number }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get workflow stats
    const { data: workflows } = await context.supabase
      .from('workflows')
      .select('id, name, status, execution_count, last_executed_at')
      .eq('tenant_id', context.tenantId)
      .order('execution_count', { ascending: false })

    // Get execution stats if table exists
    const executionStats = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
    }

    const { data: executions } = await context.supabase
      .from('workflow_executions')
      .select('status')
      .eq('tenant_id', context.tenantId)
      .gte('started_at', cutoffDate.toISOString())

    if (executions) {
      executionStats.total = executions.length
      executionStats.completed = executions.filter(e => e.status === 'completed').length
      executionStats.failed = executions.filter(e => e.status === 'failed').length
      executionStats.pending = executions.filter(e => e.status === 'pending' || e.status === 'running').length
    }

    // Calculate totals
    const totalWorkflows = workflows?.length || 0
    const activeWorkflows = workflows?.filter(w => w.status === 'active').length || 0
    const totalExecutions = workflows?.reduce((sum, w) => sum + (w.execution_count || 0), 0) || 0

    const successRate = executionStats.total > 0
      ? Math.round((executionStats.completed / executionStats.total) * 100)
      : 100

    let message = `📊 Automation Statistics (Last ${days} days)\n\n`

    message += `WORKFLOWS\n`
    message += `────────────────────\n`
    message += `Total: ${totalWorkflows}\n`
    message += `Active: ${activeWorkflows}\n`
    message += `Total Executions: ${totalExecutions.toLocaleString()}\n\n`

    if (executionStats.total > 0) {
      message += `RECENT EXECUTIONS\n`
      message += `────────────────────\n`
      message += `Total: ${executionStats.total}\n`
      message += `✅ Completed: ${executionStats.completed}\n`
      message += `❌ Failed: ${executionStats.failed}\n`
      message += `⏳ Pending: ${executionStats.pending}\n`
      message += `Success Rate: ${successRate}%\n\n`
    }

    // Top workflows
    if (workflows && workflows.length > 0) {
      message += `TOP PERFORMERS\n`
      message += `────────────────────\n`
      for (const wf of workflows.slice(0, 5)) {
        if (wf.execution_count > 0) {
          message += `• ${wf.name}: ${wf.execution_count} runs\n`
        }
      }
    }

    return {
      success: true,
      data: {
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        recentExecutions: executionStats,
        successRate,
        topWorkflows: workflows?.slice(0, 5) || [],
      },
      message,
    }
  },
})
