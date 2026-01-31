// =============================================
// Migration Validation Suite
// =============================================
// Purpose: Validate Proline CRM data migration integrity
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { createClient } from '@/lib/supabase/server'

// =================
// Types
// =================

export interface ValidationResult {
  success: boolean
  checks: {
    name: string
    passed: boolean
    expected?: number
    actual?: number
    details?: string
  }[]
  summary: {
    total_checks: number
    passed_checks: number
    failed_checks: number
  }
  errors: string[]
}

export interface ValidationOptions {
  tenant_id: string
  expected_counts?: {
    contacts?: number
    projects?: number
    activities?: number
  }
  check_relationships?: boolean
  check_data_integrity?: boolean
}

// =================
// Main Validation Function
// =================

/**
 * Validate migration results
 *
 * @param options - Validation options
 */
export async function validateMigration(
  options: ValidationOptions
): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: false,
    checks: [],
    summary: {
      total_checks: 0,
      passed_checks: 0,
      failed_checks: 0,
    },
    errors: [],
  }

  try {
    const supabase = await createClient()

    // Check 1: Verify contacts count
    if (options.expected_counts?.contacts !== undefined) {
      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', options.tenant_id)
        .ilike('description', '%Migrated from Proline%')

      if (error) {
        result.errors.push(`Failed to count contacts: ${error.message}`)
      } else {
        const passed = count === options.expected_counts.contacts
        result.checks.push({
          name: 'Contacts Count',
          passed,
          expected: options.expected_counts.contacts,
          actual: count || 0,
          details: passed ? 'Contact count matches expected' : 'Contact count mismatch',
        })
      }
    }

    // Check 2: Verify projects count
    if (options.expected_counts?.projects !== undefined) {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', options.tenant_id)
        .ilike('description', '%Migrated from Proline%')

      if (error) {
        result.errors.push(`Failed to count projects: ${error.message}`)
      } else {
        const passed = count === options.expected_counts.projects
        result.checks.push({
          name: 'Projects Count',
          passed,
          expected: options.expected_counts.projects,
          actual: count || 0,
          details: passed ? 'Project count matches expected' : 'Project count mismatch',
        })
      }
    }

    // Check 3: Verify activities count
    if (options.expected_counts?.activities !== undefined) {
      const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', options.tenant_id)

      if (error) {
        result.errors.push(`Failed to count activities: ${error.message}`)
      } else {
        const passed = count === options.expected_counts.activities
        result.checks.push({
          name: 'Activities Count',
          passed,
          expected: options.expected_counts.activities,
          actual: count || 0,
          details: passed ? 'Activity count matches expected' : 'Activity count mismatch',
        })
      }
    }

    // Check 4: Verify no contacts without names
    const { count: contactsWithoutNames, error: nameError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', options.tenant_id)
      .ilike('notes', '%Migrated from Proline%')
      .or('first_name.is.null,first_name.eq.,last_name.is.null,last_name.eq.')

    if (nameError) {
      result.errors.push(`Failed to check contact names: ${nameError.message}`)
    } else {
      const passed = (contactsWithoutNames || 0) === 0
      result.checks.push({
        name: 'Contact Names Integrity',
        passed,
        actual: contactsWithoutNames || 0,
        details: passed
          ? 'All contacts have names'
          : `Found ${contactsWithoutNames} contacts without names`,
      })
    }

    // Check 5: Verify no contacts without contact methods
    const { count: contactsWithoutMethods, error: methodError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', options.tenant_id)
      .ilike('notes', '%Migrated from Proline%')
      .or('email.is.null,phone.is.null')

    if (methodError) {
      result.errors.push(`Failed to check contact methods: ${methodError.message}`)
    } else {
      const passed = (contactsWithoutMethods || 0) === 0
      result.checks.push({
        name: 'Contact Methods Integrity',
        passed,
        actual: contactsWithoutMethods || 0,
        details: passed
          ? 'All contacts have email or phone'
          : `Found ${contactsWithoutMethods} contacts without contact methods`,
      })
    }

    // Check 6: Verify all projects have valid contact references
    if (options.check_relationships) {
      const { data: orphanedProjects, error: projectError } = await supabase
        .from('projects')
        .select('id, contact_id')
        .eq('tenant_id', options.tenant_id)
        .ilike('description', '%Migrated from Proline%')
        .is('contact_id', null)

      if (projectError) {
        result.errors.push(`Failed to check project relationships: ${projectError.message}`)
      } else {
        const passed = (orphanedProjects?.length || 0) === 0
        result.checks.push({
          name: 'Project-Contact Relationships',
          passed,
          actual: orphanedProjects?.length || 0,
          details: passed
            ? 'All projects have valid contact references'
            : `Found ${orphanedProjects?.length} orphaned projects`,
        })
      }
    }

    // Check 7: Verify all activities have valid contact references
    if (options.check_relationships) {
      const { data: orphanedActivities, error: activityError } = await supabase
        .from('activities')
        .select('id, contact_id')
        .eq('tenant_id', options.tenant_id)
        .is('contact_id', null)

      if (activityError) {
        result.errors.push(`Failed to check activity relationships: ${activityError.message}`)
      } else {
        const passed = (orphanedActivities?.length || 0) === 0
        result.checks.push({
          name: 'Activity-Contact Relationships',
          passed,
          actual: orphanedActivities?.length || 0,
          details: passed
            ? 'All activities have valid contact references'
            : `Found ${orphanedActivities?.length} orphaned activities`,
        })
      }
    }

    // Check 8: Verify email format for all contacts with emails
    if (options.check_data_integrity) {
      const { data: invalidEmails, error: emailError } = await supabase
        .from('contacts')
        .select('id, email')
        .eq('tenant_id', options.tenant_id)
        .ilike('description', '%Migrated from Proline%')
        .not('email', 'is', null)

      if (emailError) {
        result.errors.push(`Failed to check email formats: ${emailError.message}`)
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const invalidCount =
          invalidEmails?.filter((c) => c.email && !emailRegex.test(c.email)).length || 0

        const passed = invalidCount === 0
        result.checks.push({
          name: 'Email Format Validation',
          passed,
          actual: invalidCount,
          details: passed ? 'All emails are valid' : `Found ${invalidCount} invalid email formats`,
        })
      }
    }

    // Check 9: Verify phone format for all contacts with phones
    if (options.check_data_integrity) {
      const { data: invalidPhones, error: phoneError } = await supabase
        .from('contacts')
        .select('id, phone')
        .eq('tenant_id', options.tenant_id)
        .ilike('description', '%Migrated from Proline%')
        .not('phone', 'is', null)

      if (phoneError) {
        result.errors.push(`Failed to check phone formats: ${phoneError.message}`)
      } else {
        // E.164 format: +1XXXXXXXXXX
        const phoneRegex = /^\+1\d{10}$/
        const invalidCount =
          invalidPhones?.filter((c) => c.phone && !phoneRegex.test(c.phone)).length || 0

        const passed = invalidCount === 0
        result.checks.push({
          name: 'Phone Format Validation',
          passed,
          actual: invalidCount,
          details: passed
            ? 'All phones are in E.164 format'
            : `Found ${invalidCount} invalid phone formats`,
        })
      }
    }

    // Check 10: Verify no duplicate contacts
    const { data: duplicateEmails, error: dupError } = await supabase
      .from('contacts')
      .select('email')
      .eq('tenant_id', options.tenant_id)
      .ilike('notes', '%Migrated from Proline%')
      .not('email', 'is', null)

    if (dupError) {
      result.errors.push(`Failed to check duplicates: ${dupError.message}`)
    } else {
      const emails = duplicateEmails?.map((c) => c.email) || []
      const uniqueEmails = new Set(emails)
      const duplicateCount = emails.length - uniqueEmails.size

      const passed = duplicateCount === 0
      result.checks.push({
        name: 'Duplicate Contacts Check',
        passed,
        actual: duplicateCount,
        details: passed
          ? 'No duplicate contacts found'
          : `Found ${duplicateCount} duplicate email addresses`,
      })
    }

    // Calculate summary
    result.summary.total_checks = result.checks.length
    result.summary.passed_checks = result.checks.filter((c) => c.passed).length
    result.summary.failed_checks = result.checks.filter((c) => !c.passed).length

    // Overall success
    result.success = result.summary.failed_checks === 0 && result.errors.length === 0

    return result
  } catch (error) {
    result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
}

// =================
// Helper Functions
// =================

/**
 * Print validation report to console
 */
export function printValidationReport(result: ValidationResult): void {
  console.log('\n=== Migration Validation Report ===\n')

  // Print checks
  result.checks.forEach((check) => {
    const icon = check.passed ? '✓' : '✗'
    const status = check.passed ? 'PASS' : 'FAIL'

    console.log(`${icon} ${check.name}: ${status}`)

    if (check.expected !== undefined) {
      console.log(`  Expected: ${check.expected}`)
    }
    if (check.actual !== undefined) {
      console.log(`  Actual: ${check.actual}`)
    }
    if (check.details) {
      console.log(`  Details: ${check.details}`)
    }
    console.log('')
  })

  // Print errors
  if (result.errors.length > 0) {
    console.log('Errors:')
    result.errors.forEach((error) => {
      console.log(`  - ${error}`)
    })
    console.log('')
  }

  // Print summary
  console.log('Summary:')
  console.log(`  Total Checks: ${result.summary.total_checks}`)
  console.log(`  Passed: ${result.summary.passed_checks}`)
  console.log(`  Failed: ${result.summary.failed_checks}`)
  console.log('')

  console.log(`Overall Status: ${result.success ? '✓ PASSED' : '✗ FAILED'}`)
  console.log('\n===================================\n')
}
