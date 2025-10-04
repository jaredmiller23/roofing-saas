/**
 * QuickBooks Sync Engine
 * Synchronizes CRM entities with QuickBooks
 */

import { createClient } from '@/lib/supabase/server'
import { QuickBooksClient, QBCustomer, QBInvoice } from './client'
import { logger } from '@/lib/logger'

// Sync result type
interface SyncResult {
  success: boolean
  qbId?: string
  error?: string
  errorCode?: string
}

/**
 * Sync a contact to QuickBooks as a customer
 */
export async function syncContactToCustomer(
  contactId: string,
  tenantId: string,
  client: QuickBooksClient
): Promise<SyncResult> {
  const supabase = await createClient()

  try {
    // Get contact from database
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single()

    if (contactError || !contact) {
      return {
        success: false,
        error: 'Contact not found',
        errorCode: 'CONTACT_NOT_FOUND',
      }
    }

    // Check if already synced
    const { data: existingMapping } = await supabase
      .from('quickbooks_mappings')
      .select('qb_entity_id')
      .eq('tenant_id', tenantId)
      .eq('crm_entity_type', 'contact')
      .eq('crm_entity_id', contactId)
      .single()

    let qbCustomer: QBCustomer
    let action: 'create' | 'update'

    if (existingMapping) {
      // Update existing customer
      action = 'update'
      const existingCustomer = await client.getCustomer(existingMapping.qb_entity_id)

      const updatePayload = {
        ...existingCustomer,
        DisplayName: `${contact.first_name} ${contact.last_name}`.trim() || contact.email,
        GivenName: contact.first_name,
        FamilyName: contact.last_name,
        PrimaryEmailAddr: contact.email ? { Address: contact.email } : undefined,
        PrimaryPhone: contact.phone ? { FreeFormNumber: contact.phone } : undefined,
        BillAddr: contact.address ? {
          Line1: contact.address,
          City: contact.city,
          CountrySubDivisionCode: contact.state,
          PostalCode: contact.zip_code,
        } : undefined,
      } as QBCustomer & { Id: string; SyncToken: string }

      qbCustomer = await client.updateCustomer(updatePayload)
    } else {
      // Create new customer
      action = 'create'

      // Check for duplicate by name/email in QuickBooks
      const displayName = `${contact.first_name} ${contact.last_name}`.trim() || contact.email
      const existingCustomers = await client.getCustomers(displayName)

      if (existingCustomers.length > 0) {
        // Found potential duplicate - use existing
        qbCustomer = existingCustomers[0]

        // Create mapping
        await supabase.from('quickbooks_mappings').insert({
          tenant_id: tenantId,
          crm_entity_type: 'contact',
          crm_entity_id: contactId,
          qb_entity_type: 'customer',
          qb_entity_id: qbCustomer.Id!,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        })

        await logSync(tenantId, 'contact', contactId, qbCustomer.Id!, 'link', 'to_qb', 'success')

        return {
          success: true,
          qbId: qbCustomer.Id!,
        }
      }

      // Create new customer
      qbCustomer = await client.createCustomer({
        DisplayName: displayName,
        GivenName: contact.first_name,
        FamilyName: contact.last_name,
        PrimaryEmailAddr: contact.email ? { Address: contact.email } : undefined,
        PrimaryPhone: contact.phone ? { FreeFormNumber: contact.phone } : undefined,
        BillAddr: contact.address ? {
          Line1: contact.address,
          City: contact.city,
          CountrySubDivisionCode: contact.state,
          PostalCode: contact.zip_code,
        } : undefined,
      })

      // Create mapping
      await supabase.from('quickbooks_mappings').upsert({
        tenant_id: tenantId,
        crm_entity_type: 'contact',
        crm_entity_id: contactId,
        qb_entity_type: 'customer',
        qb_entity_id: qbCustomer.Id!,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
      })
    }

    // Log successful sync
    await logSync(
      tenantId,
      'contact',
      contactId,
      qbCustomer.Id!,
      action,
      'to_qb',
      'success',
      { contact },
      { customer: qbCustomer }
    )

    return {
      success: true,
      qbId: qbCustomer.Id!,
    }
  } catch (error) {
    logger.error('Failed to sync contact to QB', { contactId, error })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined

    // Log failed sync
    await logSync(
      tenantId,
      'contact',
      contactId,
      undefined,
      'create',
      'to_qb',
      'error',
      undefined,
      undefined,
      errorMessage,
      errorCode
    )

    return {
      success: false,
      error: errorMessage,
      errorCode,
    }
  }
}

/**
 * Sync a project to QuickBooks as an invoice
 */
export async function syncProjectToInvoice(
  projectId: string,
  tenantId: string,
  client: QuickBooksClient
): Promise<SyncResult> {
  const supabase = await createClient()

  try {
    // Get project with contact
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, contact:contacts(*)')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (projectError || !project) {
      return {
        success: false,
        error: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
      }
    }

    // Get QB customer ID for contact
    const { data: contactMapping } = await supabase
      .from('quickbooks_mappings')
      .select('qb_entity_id')
      .eq('tenant_id', tenantId)
      .eq('crm_entity_type', 'contact')
      .eq('crm_entity_id', project.contact_id)
      .single()

    if (!contactMapping) {
      // Sync contact first
      const contactSync = await syncContactToCustomer(project.contact_id, tenantId, client)
      if (!contactSync.success) {
        return {
          success: false,
          error: 'Failed to sync contact first',
          errorCode: 'CONTACT_SYNC_FAILED',
        }
      }
    }

    const qbCustomerId = contactMapping?.qb_entity_id || (await syncContactToCustomer(project.contact_id, tenantId, client)).qbId!

    // Create invoice
    const invoice: QBInvoice = {
      CustomerRef: {
        value: qbCustomerId,
      },
      Line: [{
        Amount: project.value || 0,
        DetailType: 'SalesItemLineDetail',
        Description: project.name || 'Roofing Project',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1', // Default service item - should be configurable
            name: 'Services',
          },
          Qty: 1,
          UnitPrice: project.value || 0,
        },
      }],
      TxnDate: new Date().toISOString().split('T')[0],
    }

    const qbInvoice = await client.createInvoice(invoice)

    // Create mapping
    await supabase.from('quickbooks_mappings').upsert({
      tenant_id: tenantId,
      crm_entity_type: 'project',
      crm_entity_id: projectId,
      qb_entity_type: 'invoice',
      qb_entity_id: qbInvoice.Id!,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
    })

    // Log successful sync
    await logSync(
      tenantId,
      'project',
      projectId,
      qbInvoice.Id!,
      'create',
      'to_qb',
      'success',
      { project },
      { invoice: qbInvoice }
    )

    return {
      success: true,
      qbId: qbInvoice.Id!,
    }
  } catch (error) {
    logger.error('Failed to sync project to QB', { projectId, error })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined

    await logSync(
      tenantId,
      'project',
      projectId,
      undefined,
      'create',
      'to_qb',
      'error',
      undefined,
      undefined,
      errorMessage,
      errorCode
    )

    return {
      success: false,
      error: errorMessage,
      errorCode,
    }
  }
}

/**
 * Bulk sync all contacts for a tenant
 */
export async function bulkSyncContacts(
  tenantId: string,
  client: QuickBooksClient
): Promise<{ total: number; synced: number; failed: number }> {
  const supabase = await createClient()

  // Get all contacts for tenant
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)

  if (!contacts || contacts.length === 0) {
    return { total: 0, synced: 0, failed: 0 }
  }

  let synced = 0
  let failed = 0

  for (const contact of contacts) {
    const result = await syncContactToCustomer(contact.id, tenantId, client)
    if (result.success) {
      synced++
    } else {
      failed++
    }
  }

  logger.info('Bulk contact sync completed', { tenantId, total: contacts.length, synced, failed })

  return {
    total: contacts.length,
    synced,
    failed,
  }
}

/**
 * Log sync operation
 */
async function logSync(
  tenantId: string,
  entityType: string,
  entityId: string | undefined,
  qbId: string | undefined,
  action: string,
  direction: 'to_qb' | 'from_qb',
  status: 'success' | 'error',
  requestPayload?: unknown,
  responsePayload?: unknown,
  errorMessage?: string,
  errorCode?: string
) {
  const supabase = await createClient()

  await supabase.from('quickbooks_sync_logs').insert({
    tenant_id: tenantId,
    entity_type: entityType,
    entity_id: entityId,
    qb_id: qbId,
    action,
    direction,
    status,
    request_payload: requestPayload,
    response_payload: responsePayload,
    error_message: errorMessage,
    error_code: errorCode,
  })
}
