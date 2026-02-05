import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { generateEstimatePDF } from '@/lib/pdf/estimate-pdf-generator'
import type { EstimatePDFOption, EstimatePDFLineItem } from '@/lib/pdf/estimate-pdf-generator'

/**
 * POST /api/estimates/[id]/pdf
 * Generate a PDF for an estimate/proposal
 *
 * Body (optional):
 *   option_ids: string[] - specific quote options to include (defaults to all)
 *
 * Returns: application/pdf binary
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = await createClient()

    // Parse optional body for specific option_ids
    let optionIds: string[] | undefined
    try {
      const body = await request.json()
      optionIds = body?.option_ids
    } catch {
      // No body or invalid JSON — include all options
    }

    // Fetch project with contact
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        tenant_id,
        contact:contact_id (
          first_name,
          last_name,
          email,
          phone,
          address_street,
          address_city,
          address_state,
          address_zip
        )
      `)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    const project = projectData as unknown as {
      id: string
      name: string
      tenant_id: string
      contact: {
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
        address_street: string | null
        address_city: string | null
        address_state: string | null
        address_zip: string | null
      } | null
    } | null

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Fetch quote options with line items
    let query = supabase
      .from('quote_options')
      .select(`
        id,
        name,
        description,
        is_selected,
        subtotal,
        created_at,
        quote_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total_price,
          category
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (optionIds && optionIds.length > 0) {
      query = query.in('id', optionIds)
    }

    const { data: optionsData, error: optionsError } = await query

    if (optionsError) {
      logger.error('Error fetching quote options for PDF', { error: optionsError })
      throw InternalError('Failed to fetch quote options')
    }

    if (!optionsData || optionsData.length === 0) {
      throw NotFoundError('No quote options found for this project')
    }

    const options = optionsData as unknown as Array<{
      id: string
      name: string
      description: string | null
      is_selected: boolean | null
      subtotal: number | null
      created_at: string
      quote_line_items: Array<{
        id: string
        description: string
        quantity: number
        unit: string
        unit_price: number
        total_price: number
        category: string
      }>
    }>

    // Fetch company settings (including custom_settings for estimate terms)
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('company_name, company_tagline, custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    // Build contact info
    const contact = project.contact

    const customerName = contact
      ? `${contact.first_name} ${contact.last_name}`
      : 'Customer'

    const addressParts = [
      contact?.address_street,
      contact?.address_city,
      contact?.address_state,
      contact?.address_zip,
    ].filter(Boolean)

    // Build PDF data
    const pdfOptions: EstimatePDFOption[] = options.map((opt) => {
      const lineItems: EstimatePDFLineItem[] = (opt.quote_line_items || []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        category: item.category,
      }))

      const subtotal = opt.subtotal || lineItems.reduce((sum, li) => sum + li.totalPrice, 0)

      return {
        name: opt.name,
        description: opt.description || undefined,
        isRecommended: opt.is_selected || false,
        lineItems,
        subtotal,
        total: subtotal,
      }
    })

    const pdfData = {
      companyName: settings?.company_name || 'Roofing Estimate',
      companyTagline: settings?.company_tagline || undefined,
      projectName: project.name,
      customerName,
      customerAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      customerEmail: contact?.email || undefined,
      customerPhone: contact?.phone || undefined,
      estimateDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      options: pdfOptions,
      terms: (settings?.custom_settings as Record<string, string> | null)?.estimate_terms ||
        'This estimate is valid for 30 days from the date of issue. All work includes a manufacturer warranty on materials and a workmanship warranty. Payment terms: 50% deposit upon acceptance, balance due upon completion. Any changes to the scope of work may result in additional charges. Permits and inspections are included where required by local code.',
    }

    // Generate PDF
    const pdfBytes = await generateEstimatePDF(pdfData)

    // Return PDF as download
    const fileName = `estimate-${project.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    })
  } catch (error) {
    logger.error('Error in POST /api/estimates/[id]/pdf', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
