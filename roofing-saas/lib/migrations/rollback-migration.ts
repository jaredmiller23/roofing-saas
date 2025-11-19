// =============================================
// Migration Rollback Script
// =============================================
// Purpose: Safely rollback Proline CRM data migration
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { createClient } from '@/lib/supabase/server'

// =================
// Types
// =================

export interface RollbackResult {
  success: boolean
  summary: {
    contacts_deleted: number
    projects_deleted: number
    activities_deleted: number
  }
  errors: string[]
  warnings: string[]
}

export interface RollbackOptions {
  tenant_id: string
  dry_run?: boolean // If true, show what would be deleted but don't delete
  created_after?: Date // Only rollback records created after this date
  created_before?: Date // Only rollback records created before this date
  confirm?: boolean // Safety check - must be true to execute
}

// =================
// Main Rollback Function
// =================

/**
 * Rollback Proline migration
 *
 * DANGER: This will permanently delete migrated data!
 * Always run with dry_run: true first to preview changes.
 *
 * @param options - Rollback options
 */
export async function rollbackProlineMigration(
  options: RollbackOptions
): Promise<RollbackResult> {
  const result: RollbackResult = {
    success: false,
    summary: {
      contacts_deleted: 0,
      projects_deleted: 0,
      activities_deleted: 0,
    },
    errors: [],
    warnings: [],
  }

  try {
    // Safety check
    if (!options.confirm && !options.dry_run) {
      throw new Error(
        'SAFETY CHECK FAILED: You must set confirm: true to execute rollback (or use dry_run: true to preview)'
      )
    }

    const supabase = await createClient()

    console.log('\n=== Starting Proline Migration Rollback ===')
    console.log(`Tenant ID: ${options.tenant_id}`)
    console.log(`Dry Run: ${options.dry_run ? 'YES' : 'NO'}`)
    if (options.created_after) {
      console.log(`Created After: ${options.created_after.toISOString()}`)
    }
    if (options.created_before) {
      console.log(`Created Before: ${options.created_before.toISOString()}`)
    }
    console.log('')

    // Step 1: Identify records to delete (contacts with Proline migration marker)
    let contactQuery = supabase
      .from('contacts')
      .select('id, created_at')
      .eq('tenant_id', options.tenant_id)
      .ilike('notes', '%Migrated from Proline%')

    if (options.created_after) {
      contactQuery = contactQuery.gte('created_at', options.created_after.toISOString())
    }

    if (options.created_before) {
      contactQuery = contactQuery.lte('created_at', options.created_before.toISOString())
    }

    const { data: contactsToDelete, error: contactError } = await contactQuery

    if (contactError) {
      throw new Error(`Failed to identify contacts: ${contactError.message}`)
    }

    const contactIds = contactsToDelete?.map((c) => c.id) || []
    console.log(`Found ${contactIds.length} contacts to delete`)

    // Step 2: Identify related projects
    if (contactIds.length > 0) {
      let projectQuery = supabase
        .from('projects')
        .select('id, created_at')
        .eq('tenant_id', options.tenant_id)
        .in('contact_id', contactIds)

      if (options.created_after) {
        projectQuery = projectQuery.gte('created_at', options.created_after.toISOString())
      }

      if (options.created_before) {
        projectQuery = projectQuery.lte('created_at', options.created_before.toISOString())
      }

      const { data: projectsToDelete, error: projectError } = await projectQuery

      if (projectError) {
        throw new Error(`Failed to identify projects: ${projectError.message}`)
      }

      const projectIds = projectsToDelete?.map((p) => p.id) || []
      console.log(`Found ${projectIds.length} projects to delete`)

      // Step 3: Identify related activities
      let activityQuery = supabase
        .from('activities')
        .select('id, created_at')
        .eq('tenant_id', options.tenant_id)
        .in('contact_id', contactIds)

      if (options.created_after) {
        activityQuery = activityQuery.gte('created_at', options.created_after.toISOString())
      }

      if (options.created_before) {
        activityQuery = activityQuery.lte('created_at', options.created_before.toISOString())
      }

      const { data: activitiesToDelete, error: activityError } = await activityQuery

      if (activityError) {
        throw new Error(`Failed to identify activities: ${activityError.message}`)
      }

      const activityIds = activitiesToDelete?.map((a) => a.id) || []
      console.log(`Found ${activityIds.length} activities to delete`)

      // DRY RUN: Stop here and show what would be deleted
      if (options.dry_run) {
        console.log('\n=== DRY RUN - No changes made ===')
        console.log('Would delete:')
        console.log(`  - ${contactIds.length} contacts`)
        console.log(`  - ${projectIds.length} projects`)
        console.log(`  - ${activityIds.length} activities`)
        console.log('\nRun with dry_run: false and confirm: true to execute')

        result.summary.contacts_deleted = contactIds.length
        result.summary.projects_deleted = projectIds.length
        result.summary.activities_deleted = activityIds.length
        result.success = true

        return result
      }

      // EXECUTE ROLLBACK
      console.log('\n=== Executing Rollback ===')

      // Delete activities first (they reference contacts and projects)
      if (activityIds.length > 0) {
        console.log('Deleting activities...')
        const { error: deleteActivityError } = await supabase
          .from('activities')
          .delete()
          .in('id', activityIds)

        if (deleteActivityError) {
          result.errors.push(`Failed to delete activities: ${deleteActivityError.message}`)
        } else {
          result.summary.activities_deleted = activityIds.length
          console.log(`  ✓ Deleted ${activityIds.length} activities`)
        }
      }

      // Delete projects (they reference contacts)
      if (projectIds.length > 0) {
        console.log('Deleting projects...')
        const { error: deleteProjectError } = await supabase
          .from('projects')
          .delete()
          .in('id', projectIds)

        if (deleteProjectError) {
          result.errors.push(`Failed to delete projects: ${deleteProjectError.message}`)
        } else {
          result.summary.projects_deleted = projectIds.length
          console.log(`  ✓ Deleted ${projectIds.length} projects`)
        }
      }

      // Delete contacts last
      if (contactIds.length > 0) {
        console.log('Deleting contacts...')
        const { error: deleteContactError } = await supabase
          .from('contacts')
          .delete()
          .in('id', contactIds)

        if (deleteContactError) {
          result.errors.push(`Failed to delete contacts: ${deleteContactError.message}`)
        } else {
          result.summary.contacts_deleted = contactIds.length
          console.log(`  ✓ Deleted ${contactIds.length} contacts`)
        }
      }
    }

    console.log('\n=== Rollback Complete ===')
    console.log(`Contacts deleted: ${result.summary.contacts_deleted}`)
    console.log(`Projects deleted: ${result.summary.projects_deleted}`)
    console.log(`Activities deleted: ${result.summary.activities_deleted}`)

    if (result.errors.length > 0) {
      console.log('\nErrors encountered:')
      result.errors.forEach((error) => console.log(`  - ${error}`))
    }

    result.success = result.errors.length === 0

    return result
  } catch (error) {
    result.errors.push(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`)
    console.log(`\n✗ FATAL ERROR: ${error}`)
    return result
  }
}

// =================
// Helper Functions
// =================

/**
 * Rollback migration by date range
 *
 * Useful for rolling back a specific migration batch
 */
export async function rollbackByDateRange(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  options: { dry_run?: boolean; confirm?: boolean } = {}
): Promise<RollbackResult> {
  return rollbackProlineMigration({
    tenant_id: tenantId,
    created_after: startDate,
    created_before: endDate,
    dry_run: options.dry_run,
    confirm: options.confirm,
  })
}

/**
 * Rollback today's migration
 *
 * Convenient function to rollback migration that happened today
 */
export async function rollbackTodaysMigration(
  tenantId: string,
  options: { dry_run?: boolean; confirm?: boolean } = {}
): Promise<RollbackResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return rollbackByDateRange(tenantId, today, tomorrow, options)
}

/**
 * Print rollback summary
 */
export function printRollbackSummary(result: RollbackResult): void {
  console.log('\n=== Rollback Summary ===\n')

  console.log('Records Deleted:')
  console.log(`  Contacts: ${result.summary.contacts_deleted}`)
  console.log(`  Projects: ${result.summary.projects_deleted}`)
  console.log(`  Activities: ${result.summary.activities_deleted}`)
  console.log('')

  if (result.errors.length > 0) {
    console.log('Errors:')
    result.errors.forEach((error) => {
      console.log(`  - ${error}`)
    })
    console.log('')
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:')
    result.warnings.forEach((warning) => {
      console.log(`  - ${warning}`)
    })
    console.log('')
  }

  console.log(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`)
  console.log('\n========================\n')
}
