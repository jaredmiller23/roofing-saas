// =============================================
// Proline CRM Data Migration Script
// =============================================
// Purpose: ETL pipeline to migrate data from Proline to our database
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'
import {
  type ProlineContact,
  type ProlineProject,
  type ProlineActivity,
  mapContactStatus,
  mapProjectStage,
  mapActivityType,
  validateContact,
  formatPhoneNumber,
  cleanTextField,
  parseDate,
  MIGRATION_DEFAULTS,
} from './proline-field-mappings'
import * as fs from 'fs'
// @ts-expect-error - papaparse not installed yet
import Papa from 'papaparse'

// =================
// Types
// =================

export interface MigrationResult {
  success: boolean
  summary: {
    contacts_processed: number
    contacts_imported: number
    contacts_failed: number
    projects_processed: number
    projects_imported: number
    projects_failed: number
    activities_processed: number
    activities_imported: number
    activities_failed: number
  }
  errors: Array<{
    record_type: 'contact' | 'project' | 'activity'
    record_id: string | number
    error: string
  }>
  validation_report: {
    duplicates_found: number
    invalid_records: number
    missing_required_fields: number
  }
}

export interface MigrationOptions {
  tenant_id: string
  user_id: string
  dry_run?: boolean // If true, validate but don't insert
  skip_duplicates?: boolean // If true, skip records that already exist
  log_file?: string // Path to log file
}

// =================
// Main Migration Function
// =================

/**
 * Migrate Proline data from CSV files
 *
 * @param contactsCsvPath - Path to Proline contacts export CSV
 * @param projectsCsvPath - Path to Proline projects export CSV (optional)
 * @param activitiesCsvPath - Path to Proline activities export CSV (optional)
 * @param options - Migration options
 */
export async function migrateProlineData(
  contactsCsvPath: string,
  projectsCsvPath?: string,
  activitiesCsvPath?: string,
  options: MigrationOptions = {} as MigrationOptions
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    summary: {
      contacts_processed: 0,
      contacts_imported: 0,
      contacts_failed: 0,
      projects_processed: 0,
      projects_imported: 0,
      projects_failed: 0,
      activities_processed: 0,
      activities_imported: 0,
      activities_failed: 0,
    },
    errors: [],
    validation_report: {
      duplicates_found: 0,
      invalid_records: 0,
      missing_required_fields: 0,
    },
  }

  const logMessage = (message: string) => {
    const timestamp = new Date().toISOString()
    const logLine = `[${timestamp}] ${message}\n`
    console.log(logLine.trim())

    if (options.log_file) {
      fs.appendFileSync(options.log_file, logLine)
    }
  }

  try {
    logMessage('=== Starting Proline Data Migration ===')
    logMessage(`Tenant ID: ${options.tenant_id}`)
    logMessage(`Dry Run: ${options.dry_run ? 'YES' : 'NO'}`)

    const supabase = await createClient()

    // Step 1: Migrate Contacts
    if (contactsCsvPath) {
      logMessage('\n--- Migrating Contacts ---')
      const contacts = await parseCsv<ProlineContact>(contactsCsvPath)
      logMessage(`Found ${contacts.length} contacts to migrate`)

      for (const contact of contacts) {
        result.summary.contacts_processed++

        try {
          // Validate contact
          const validation = validateContact(contact)
          if (!validation.valid) {
            result.summary.contacts_failed++
            result.validation_report.invalid_records++
            result.errors.push({
              record_type: 'contact',
              record_id: contact.id || 'unknown',
              error: validation.errors.join(', '),
            })
            logMessage(`  ✗ Contact ${contact.id}: ${validation.errors.join(', ')}`)
            continue
          }

          // Check for duplicates
          if (options.skip_duplicates) {
            const isDuplicate = await checkContactDuplicate(
              supabase,
              options.tenant_id,
              contact
            )
            if (isDuplicate) {
              result.validation_report.duplicates_found++
              logMessage(`  ⊘ Contact ${contact.id}: Duplicate, skipping`)
              continue
            }
          }

          // Transform contact data
          const transformedContact = transformContact(contact, options)

          // Insert contact (if not dry run)
          if (!options.dry_run) {
            const { error } = await supabase.from('contacts').insert(transformedContact as Database['public']['Tables']['contacts']['Insert'])

            if (error) {
              throw new Error(error.message)
            }
          }

          result.summary.contacts_imported++
          logMessage(`  ✓ Contact ${contact.id}: Imported`)
        } catch (error) {
          result.summary.contacts_failed++
          result.errors.push({
            record_type: 'contact',
            record_id: contact.id || 'unknown',
            error: error instanceof Error ? error.message : String(error),
          })
          logMessage(`  ✗ Contact ${contact.id}: ${error}`)
        }
      }
    }

    // Step 2: Migrate Projects (if provided)
    if (projectsCsvPath) {
      logMessage('\n--- Migrating Projects ---')
      const projects = await parseCsv<ProlineProject>(projectsCsvPath)
      logMessage(`Found ${projects.length} projects to migrate`)

      for (const project of projects) {
        result.summary.projects_processed++

        try {
          // Find corresponding contact by Proline contact_id
          if (!project.contact_id) {
            result.summary.projects_failed++
            result.errors.push({
              record_type: 'project',
              record_id: project.id || 'unknown',
              error: 'Missing contact_id - cannot link project to contact',
            })
            logMessage(`  ✗ Project ${project.id}: Missing contact_id`)
            continue
          }

          // Look up contact in our system (by original Proline ID stored in notes or custom field)
          // NOTE: This assumes contacts were migrated first and we stored the Proline ID
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('tenant_id', options.tenant_id)
            .ilike('notes', `%Proline ID: ${project.contact_id}%`)
            .single()

          if (!contact) {
            result.summary.projects_failed++
            result.errors.push({
              record_type: 'project',
              record_id: project.id || 'unknown',
              error: `Contact not found for Proline contact_id: ${project.contact_id}`,
            })
            logMessage(`  ✗ Project ${project.id}: Contact not found`)
            continue
          }

          // Transform project data
          const transformedProject = transformProject(project, contact.id, options)

          // Insert project (if not dry run)
          if (!options.dry_run) {
            const { error } = await supabase.from('projects').insert(transformedProject as Database['public']['Tables']['projects']['Insert'])

            if (error) {
              throw new Error(error.message)
            }
          }

          result.summary.projects_imported++
          logMessage(`  ✓ Project ${project.id}: Imported`)
        } catch (error) {
          result.summary.projects_failed++
          result.errors.push({
            record_type: 'project',
            record_id: project.id || 'unknown',
            error: error instanceof Error ? error.message : String(error),
          })
          logMessage(`  ✗ Project ${project.id}: ${error}`)
        }
      }
    }

    // Step 3: Migrate Activities (if provided)
    if (activitiesCsvPath) {
      logMessage('\n--- Migrating Activities ---')
      const activities = await parseCsv<ProlineActivity>(activitiesCsvPath)
      logMessage(`Found ${activities.length} activities to migrate`)

      for (const activity of activities) {
        result.summary.activities_processed++

        try {
          // Find corresponding contact
          if (!activity.contact_id) {
            result.summary.activities_failed++
            result.errors.push({
              record_type: 'activity',
              record_id: activity.id || 'unknown',
              error: 'Missing contact_id - cannot link activity to contact',
            })
            logMessage(`  ✗ Activity ${activity.id}: Missing contact_id`)
            continue
          }

          // Look up contact in our system
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('tenant_id', options.tenant_id)
            .ilike('notes', `%Proline ID: ${activity.contact_id}%`)
            .single()

          if (!contact) {
            result.summary.activities_failed++
            result.errors.push({
              record_type: 'activity',
              record_id: activity.id || 'unknown',
              error: `Contact not found for Proline contact_id: ${activity.contact_id}`,
            })
            logMessage(`  ✗ Activity ${activity.id}: Contact not found`)
            continue
          }

          // Look up project if provided (optional)
          let projectId = null
          if (activity.project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('id')
              .eq('tenant_id', options.tenant_id)
              .ilike('description', `%Proline ID: ${activity.project_id}%`)
              .single()

            projectId = project?.id || null
          }

          // Transform activity data
          const transformedActivity = transformActivity(activity, contact.id, projectId, options)

          // Insert activity (if not dry run)
          if (!options.dry_run) {
            const { error } = await supabase.from('activities').insert(transformedActivity as Database['public']['Tables']['activities']['Insert'])

            if (error) {
              throw new Error(error.message)
            }
          }

          result.summary.activities_imported++
          logMessage(`  ✓ Activity ${activity.id}: Imported`)
        } catch (error) {
          result.summary.activities_failed++
          result.errors.push({
            record_type: 'activity',
            record_id: activity.id || 'unknown',
            error: error instanceof Error ? error.message : String(error),
          })
          logMessage(`  ✗ Activity ${activity.id}: ${error}`)
        }
      }
    }

    logMessage('\n=== Migration Complete ===')
    logMessage(`Contacts: ${result.summary.contacts_imported}/${result.summary.contacts_processed} imported`)
    logMessage(`Projects: ${result.summary.projects_imported}/${result.summary.projects_processed} imported`)
    logMessage(`Activities: ${result.summary.activities_imported}/${result.summary.activities_processed} imported`)
    logMessage(`Errors: ${result.errors.length}`)

    result.success =
      result.summary.contacts_failed === 0 &&
      result.summary.projects_failed === 0 &&
      result.summary.activities_failed === 0

    return result
  } catch (error) {
    logMessage(`\n✗ FATAL ERROR: ${error}`)
    throw error
  }
}

// =================
// Helper Functions
// =================

/**
 * Parse result with error tracking
 */
interface ParseResult<T> {
  data: T[]
  errors: Array<{
    row: number
    message: string
    code?: string
  }>
  meta: {
    totalRows: number
    parsedRows: number
    errorRows: number
  }
}

/**
 * Parse CSV file with row-level error handling
 * Continues processing even if individual rows fail
 */
async function parseCsv<T>(filePath: string): Promise<T[]> {
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const parseResult = await parseCsvWithErrors<T>(fileContent)

  // Log any parsing errors but continue with valid rows
  if (parseResult.errors.length > 0) {
    console.warn(`[CSV Parse] ${parseResult.errors.length} rows had parsing errors:`)
    parseResult.errors.slice(0, 10).forEach(err => {
      console.warn(`  Row ${err.row}: ${err.message}`)
    })
    if (parseResult.errors.length > 10) {
      console.warn(`  ... and ${parseResult.errors.length - 10} more errors`)
    }
  }

  console.log(`[CSV Parse] Parsed ${parseResult.meta.parsedRows}/${parseResult.meta.totalRows} rows successfully`)
  return parseResult.data
}

/**
 * Parse CSV with detailed error tracking
 */
function parseCsvWithErrors<T>(content: string): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    const data: T[] = []
    const errors: ParseResult<T>['errors'] = []
    let totalRows = 0

    interface PapaParseRowResult {
      data: T
      errors: Array<{ row?: number; message: string; code?: string }>
      meta: { cursor?: number }
    }

    interface PapaParseMeta {
      lines?: number
      aborted?: boolean
      cursor?: number
    }

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),

      // Process each row individually (allows row-level error recovery)
      step: (results: PapaParseRowResult, _parser: unknown) => {
        totalRows++

        // Check for row-level errors from papaparse
        if (results.errors && results.errors.length > 0) {
          for (const err of results.errors) {
            errors.push({
              row: err.row ?? totalRows,
              message: err.message,
              code: err.code,
            })
          }
          // Still try to use the data if available (partial row)
          if (results.data && Object.keys(results.data as object).length > 0) {
            try {
              validateRowData(results.data as T)
              data.push(results.data)
            } catch (validationError) {
              errors.push({
                row: totalRows,
                message: `Validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
              })
            }
          }
        } else {
          // No parse errors - validate and add the row
          try {
            validateRowData(results.data as T)
            data.push(results.data)
          } catch (validationError) {
            errors.push({
              row: totalRows,
              message: `Validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
            })
          }
        }
      },

      complete: (meta: PapaParseMeta) => {
        resolve({
          data,
          errors,
          meta: {
            totalRows: totalRows || meta.lines || 0,
            parsedRows: data.length,
            errorRows: errors.length,
          },
        })
      },

      error: (error: Error) => {
        // Fatal parse error (e.g., file encoding issues)
        // Still return what we have so far
        errors.push({
          row: 0,
          message: `Fatal parse error: ${error.message}`,
          code: 'FATAL',
        })
        resolve({
          data,
          errors,
          meta: {
            totalRows,
            parsedRows: data.length,
            errorRows: errors.length,
          },
        })
      },
    })
  })
}

/**
 * Basic validation of row data
 * Throws if row is completely empty or malformed
 */
function validateRowData<T>(row: T): void {
  if (!row || typeof row !== 'object') {
    throw new Error('Row is null or not an object')
  }

  // Check if row is completely empty (all values are empty strings or null)
  const values = Object.values(row as Record<string, unknown>)
  const hasAnyValue = values.some(v =>
    v !== null && v !== undefined && v !== ''
  )

  if (!hasAnyValue) {
    throw new Error('Row is empty - all fields are blank')
  }
}

/**
 * Check if contact already exists (duplicate detection)
 */
async function checkContactDuplicate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  contact: ProlineContact
): Promise<boolean> {
  // Check by email
  if (contact.email) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', contact.email)
      .single()

    if (data) return true
  }

  // Check by phone
  const phone = formatPhoneNumber(contact.phone || contact.mobile || '')
  if (phone) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .single()

    if (data) return true
  }

  // Check by name + address
  if (contact.first_name && contact.last_name && contact.address) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('first_name', contact.first_name)
      .eq('last_name', contact.last_name)
      .eq('address_street', contact.address)
      .single()

    if (data) return true
  }

  return false
}

/**
 * Transform Proline contact to our schema
 */
function transformContact(contact: ProlineContact, options: MigrationOptions): Record<string, unknown> {
  const { type, stage } = mapContactStatus(contact.status || '')

  // Store Proline ID in notes for relationship linking
  const existingNotes = cleanTextField(contact.notes) || ''
  const notesWithProlineId = existingNotes
    ? `${existingNotes}\n\n[Migrated from Proline - Proline ID: ${contact.id}]`
    : `[Migrated from Proline - Proline ID: ${contact.id}]`

  return {
    tenant_id: options.tenant_id,
    first_name: cleanTextField(contact.first_name) || 'Unknown',
    last_name: cleanTextField(contact.last_name) || '',
    email: cleanTextField(contact.email),
    phone: formatPhoneNumber(contact.phone || contact.mobile || ''),
    street_address: cleanTextField(contact.address),
    city: cleanTextField(contact.city),
    state: cleanTextField(contact.state),
    zip_code: cleanTextField(contact.zip),
    type,
    stage,
    contact_category: MIGRATION_DEFAULTS.contact.contact_category,
    is_organization: false,
    source: cleanTextField(contact.source) || 'Proline Migration',
    notes: notesWithProlineId,
    created_by: options.user_id,
    created_at: parseDate(contact.created_date) || new Date(),
    updated_at: parseDate(contact.modified_date) || new Date(),
  }
}

/**
 * Transform Proline project to our schema
 */
function transformProject(
  project: ProlineProject,
  contactId: string,
  options: MigrationOptions
): Record<string, unknown> {
  const stage = mapProjectStage(project.status || '', project.stage)

  // Store Proline ID in notes for relationship linking
  const existingNotes = cleanTextField(project.notes) || ''
  const notesWithProlineId = existingNotes
    ? `${existingNotes}\n\n[Migrated from Proline - Proline ID: ${project.id}]`
    : `[Migrated from Proline - Proline ID: ${project.id}]`

  return {
    tenant_id: options.tenant_id,
    contact_id: contactId,
    name: cleanTextField(project.name) || 'Untitled Project',
    description: cleanTextField(project.description),
    stage,
    estimated_value: parseFloat(String(project.value || 0)) || null,
    expected_close_date: parseDate(project.close_date || project.end_date),
    notes: notesWithProlineId,
    created_by: options.user_id,
    created_at: parseDate(project.created_date) || new Date(),
    updated_at: parseDate(project.modified_date) || new Date(),
  }
}

/**
 * Transform Proline activity to our schema
 */
function transformActivity(
  activity: ProlineActivity,
  contactId: string,
  projectId: string | null,
  options: MigrationOptions
): Record<string, unknown> {
  const activityType = mapActivityType(activity.type || '')

  return {
    tenant_id: options.tenant_id,
    contact_id: contactId,
    project_id: projectId,
    type: activityType,
    subject: cleanTextField(activity.subject) || 'Migrated Activity',
    notes: cleanTextField(activity.description),
    activity_date: parseDate(activity.date) || new Date(),
    created_by: options.user_id,
    created_at: parseDate(activity.created_date) || new Date(),
  }
}
