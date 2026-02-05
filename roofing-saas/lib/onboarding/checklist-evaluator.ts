/**
 * Checklist Evaluator
 *
 * Computes onboarding checklist completion by querying real data.
 * This is the source of truth — not stored booleans.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { ChecklistItem } from './types'

interface ChecklistResult {
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
  dismissed: boolean
}

export async function evaluateChecklist(tenantId: string): Promise<ChecklistResult> {
  const adminClient = await createAdminClient()

  // Run all checks in parallel
  const [contacts, projects, stages, estimates, teamMembers, callLogs, settings] =
    await Promise.all([
      // Has at least one contact?
      adminClient
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false),

      // Has at least one project?
      adminClient
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false),

      // Custom pipeline stages created? (check if more than default count)
      adminClient
        .from('pipeline_stages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Any estimate sent?
      adminClient
        .from('quote_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .not('sent_at', 'is', null),

      // More than 1 team member?
      adminClient
        .from('tenant_users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),

      // Any call logged?
      adminClient
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false),

      // Check if checklist was dismissed
      adminClient
        .from('tenant_settings')
        .select('custom_settings')
        .eq('tenant_id', tenantId)
        .single(),
    ])

  const onboardingData = (settings.data?.custom_settings as Record<string, unknown>)?.onboarding as Record<string, unknown> | undefined
  const dismissed = (onboardingData?.checklist as Record<string, unknown>)?.dismissed === true

  const items: ChecklistItem[] = [
    {
      key: 'add_contact',
      label: 'Add your first contact',
      description: 'Add a homeowner, adjuster, or referral partner',
      href: '/contacts',
      completed: (contacts.count ?? 0) > 0,
    },
    {
      key: 'create_project',
      label: 'Create a project',
      description: 'Start tracking a roofing job',
      href: '/projects',
      completed: (projects.count ?? 0) > 0,
    },
    {
      key: 'setup_pipeline',
      label: 'Set up your pipeline',
      description: 'Customize your sales stages',
      href: '/pipeline',
      completed: (stages.count ?? 0) > 0,
    },
    {
      key: 'send_estimate',
      label: 'Send an estimate',
      description: 'Create and send a professional quote',
      href: '/estimates',
      completed: (estimates.count ?? 0) > 0,
    },
    {
      key: 'invite_team',
      label: 'Invite a team member',
      description: 'Add your crew or office staff',
      href: '/settings?tab=team',
      completed: (teamMembers.count ?? 0) > 1,
    },
    {
      key: 'log_call',
      label: 'Log a call',
      description: 'Track a customer conversation',
      href: '/call-logs',
      completed: (callLogs.count ?? 0) > 0,
    },
  ]

  const completedCount = items.filter((item) => item.completed).length

  return {
    items,
    completedCount,
    totalCount: items.length,
    dismissed,
  }
}
