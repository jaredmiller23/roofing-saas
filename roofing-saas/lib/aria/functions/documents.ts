/**
 * ARIA Document Generation - Phase 5: Document Intelligence
 *
 * Provides ARIA with document generation capabilities:
 * - Generate estimates from project data
 * - Create inspection reports from photos and notes
 * - Summarize insurance claims
 * - Generate project summaries for handoffs
 * - Create completion certificates
 */

import { ariaFunctionRegistry } from '../function-registry'
import { logger } from '@/lib/logger'

// =============================================================================
// generate_estimate - Create an estimate summary from project data
// =============================================================================

ariaFunctionRegistry.register({
  name: 'generate_estimate',
  category: 'actions',
  description: 'Generate an estimate summary from project data',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'generate_estimate',
    description: 'Generate an estimate summary document from project data including scope, materials, and pricing.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to generate estimate for',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID (will use their latest project if project_id not specified)',
        },
        include_breakdown: {
          type: 'boolean',
          description: 'Include detailed line item breakdown (default: true)',
        },
        format: {
          type: 'string',
          enum: ['summary', 'detailed', 'presentation'],
          description: 'Format style for the estimate (default: summary)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const {
      project_id,
      contact_id,
      include_breakdown = true,
      format = 'summary',
    } = args as {
      project_id?: string
      contact_id?: string
      include_breakdown?: boolean
      format?: 'summary' | 'detailed' | 'presentation'
    }

    // Determine project ID
    let targetProjectId = project_id || context.project?.id
    const targetContactId = contact_id || context.contact?.id

    // If no project but have contact, get their latest project
    if (!targetProjectId && targetContactId) {
      const { data: latestProject } = await context.supabase
        .from('projects')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('contact_id', targetContactId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestProject) {
        targetProjectId = latestProject.id
      }
    }

    if (!targetProjectId) {
      return { success: false, error: 'No project specified. Please provide a project_id or contact_id.' }
    }

    // Fetch project with contact
    const { data: project, error: projectError } = await context.supabase
      .from('projects')
      .select(`
        id, name, stage, status, created_at, custom_fields,
        contacts(id, first_name, last_name, email, phone, address, city, state, zip)
      `)
      .eq('id', targetProjectId)
      .eq('tenant_id', context.tenantId)
      .single()

    if (projectError || !project) {
      return { success: false, error: 'Project not found' }
    }

    const contact = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts
    const customFields = project.custom_fields || {}

    // Extract estimate data from custom fields
    const estimateData = {
      roofType: customFields.roof_type || customFields.roofType || 'Asphalt Shingles',
      squareFootage: customFields.square_footage || customFields.squareFootage || customFields.roof_size || 'TBD',
      pitch: customFields.roof_pitch || customFields.pitch || 'Standard',
      layers: customFields.layers || 1,
      damageType: customFields.damage_type || customFields.damageType || 'General wear',
      estimateTotal: customFields.estimate_total || customFields.estimateTotal || customFields.contract_value || 0,
      materialCost: customFields.material_cost || customFields.materialCost || 0,
      laborCost: customFields.labor_cost || customFields.laborCost || 0,
      permitFees: customFields.permit_fees || customFields.permitFees || 0,
      notes: customFields.scope_notes || customFields.notes || '',
      isInsuranceClaim: customFields.is_insurance_claim || customFields.insurance_claim || false,
      insuranceCarrier: customFields.insurance_carrier || customFields.insuranceCarrier || '',
    }

    // Fetch recent activities/notes for additional context
    const { data: notes } = await context.supabase
      .from('activities')
      .select('content, created_at')
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)
      .eq('type', 'note')
      .order('created_at', { ascending: false })
      .limit(5)

    // Build the estimate document
    const customerName = contact ? `${contact.first_name} ${contact.last_name}` : 'Customer'
    const customerAddress = contact
      ? [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ')
      : 'Address on file'

    let document = ''

    if (format === 'presentation') {
      // Presentation format - brief, suitable for voice/SMS
      document = `ESTIMATE for ${customerName}\n`
      document += `Project: ${project.name}\n`
      document += `Address: ${customerAddress}\n\n`
      document += `Scope: ${estimateData.roofType} - ${estimateData.squareFootage} sq ft\n`
      if (estimateData.estimateTotal > 0) {
        document += `Total: $${Number(estimateData.estimateTotal).toLocaleString()}\n`
      }
      if (estimateData.isInsuranceClaim) {
        document += `Insurance: ${estimateData.insuranceCarrier || 'Claim in progress'}\n`
      }
    } else if (format === 'detailed') {
      // Detailed format - full breakdown
      document = `═══════════════════════════════════════\n`
      document += `           ROOFING ESTIMATE\n`
      document += `═══════════════════════════════════════\n\n`

      document += `CUSTOMER INFORMATION\n`
      document += `────────────────────\n`
      document += `Name: ${customerName}\n`
      document += `Address: ${customerAddress}\n`
      if (contact?.phone) document += `Phone: ${contact.phone}\n`
      if (contact?.email) document += `Email: ${contact.email}\n`
      document += `\n`

      document += `PROJECT DETAILS\n`
      document += `────────────────────\n`
      document += `Project: ${project.name}\n`
      document += `Roof Type: ${estimateData.roofType}\n`
      document += `Square Footage: ${estimateData.squareFootage}\n`
      document += `Pitch: ${estimateData.pitch}\n`
      document += `Existing Layers: ${estimateData.layers}\n`
      document += `Damage Type: ${estimateData.damageType}\n`
      document += `\n`

      if (include_breakdown && (estimateData.materialCost || estimateData.laborCost)) {
        document += `COST BREAKDOWN\n`
        document += `────────────────────\n`
        if (estimateData.materialCost) {
          document += `Materials: $${Number(estimateData.materialCost).toLocaleString()}\n`
        }
        if (estimateData.laborCost) {
          document += `Labor: $${Number(estimateData.laborCost).toLocaleString()}\n`
        }
        if (estimateData.permitFees) {
          document += `Permits: $${Number(estimateData.permitFees).toLocaleString()}\n`
        }
        document += `────────────────────\n`
      }

      if (estimateData.estimateTotal > 0) {
        document += `TOTAL: $${Number(estimateData.estimateTotal).toLocaleString()}\n`
      }
      document += `\n`

      if (estimateData.isInsuranceClaim) {
        document += `INSURANCE INFORMATION\n`
        document += `────────────────────\n`
        document += `Carrier: ${estimateData.insuranceCarrier || 'TBD'}\n`
        document += `Status: Claim in progress\n`
        document += `\n`
      }

      if (notes && notes.length > 0) {
        document += `SCOPE NOTES\n`
        document += `────────────────────\n`
        for (const note of notes.slice(0, 3)) {
          document += `• ${note.content?.substring(0, 200)}\n`
        }
        document += `\n`
      }

      document += `═══════════════════════════════════════\n`
      document += `Generated: ${new Date().toLocaleDateString()}\n`
    } else {
      // Summary format (default)
      document = `📋 ESTIMATE SUMMARY\n\n`
      document += `Customer: ${customerName}\n`
      document += `Project: ${project.name}\n`
      document += `Address: ${customerAddress}\n\n`

      document += `📐 Scope:\n`
      document += `• Roof Type: ${estimateData.roofType}\n`
      document += `• Size: ${estimateData.squareFootage} sq ft\n`
      document += `• Pitch: ${estimateData.pitch}\n`
      document += `• Work: ${estimateData.damageType}\n\n`

      if (estimateData.estimateTotal > 0) {
        document += `💰 Total: $${Number(estimateData.estimateTotal).toLocaleString()}\n`
        if (include_breakdown && estimateData.materialCost) {
          document += `   Materials: $${Number(estimateData.materialCost).toLocaleString()}\n`
          document += `   Labor: $${Number(estimateData.laborCost).toLocaleString()}\n`
        }
        document += `\n`
      }

      if (estimateData.isInsuranceClaim) {
        document += `🏥 Insurance Claim: ${estimateData.insuranceCarrier || 'Yes'}\n`
      }

      document += `\nStatus: ${project.stage || project.status || 'In Progress'}`
    }

    // Log the generation as an activity
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: contact?.id,
      project_id: targetProjectId,
      type: 'note',
      subject: 'Estimate Generated',
      content: `Estimate document generated via ARIA (${format} format)`,
      created_by: context.userId,
      metadata: { via: 'aria', format, generated_at: new Date().toISOString() },
    })

    return {
      success: true,
      data: {
        projectId: targetProjectId,
        customerName,
        estimateTotal: estimateData.estimateTotal,
        format,
        document,
      },
      message: document,
    }
  },
})

// =============================================================================
// generate_inspection_report - Create inspection report from photos and notes
// =============================================================================

ariaFunctionRegistry.register({
  name: 'generate_inspection_report',
  category: 'actions',
  description: 'Generate an inspection report from project photos and notes',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'generate_inspection_report',
    description: 'Generate an inspection report summarizing findings from photos and notes.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to generate report for',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID (will use their latest project)',
        },
        include_photos: {
          type: 'boolean',
          description: 'Reference photos in the report (default: true)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { project_id, contact_id, include_photos = true } = args as {
      project_id?: string
      contact_id?: string
      include_photos?: boolean
    }

    // Determine project ID
    let targetProjectId = project_id || context.project?.id
    const targetContactId = contact_id || context.contact?.id

    if (!targetProjectId && targetContactId) {
      const { data: latestProject } = await context.supabase
        .from('projects')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('contact_id', targetContactId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestProject) targetProjectId = latestProject.id
    }

    if (!targetProjectId) {
      return { success: false, error: 'No project specified' }
    }

    // Fetch project with contact
    const { data: project, error: projectError } = await context.supabase
      .from('projects')
      .select(`
        id, name, stage, created_at, custom_fields,
        contacts(id, first_name, last_name, address, city, state, zip)
      `)
      .eq('id', targetProjectId)
      .eq('tenant_id', context.tenantId)
      .single()

    if (projectError || !project) {
      return { success: false, error: 'Project not found' }
    }

    const contact = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts
    const customFields = project.custom_fields || {}

    // Fetch inspection notes
    const { data: notes } = await context.supabase
      .from('activities')
      .select('content, subject, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)
      .in('type', ['note', 'inspection'])
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch photos if requested
    let photos: Array<{ id: string; file_url: string; metadata: Record<string, unknown> }> = []
    if (include_photos) {
      const { data: projectPhotos } = await context.supabase
        .from('photos')
        .select('id, file_url, metadata, created_at')
        .eq('tenant_id', context.tenantId)
        .eq('project_id', targetProjectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)

      photos = projectPhotos || []
    }

    // Build inspection report
    const customerName = contact ? `${contact.first_name} ${contact.last_name}` : 'Property Owner'
    const propertyAddress = contact
      ? [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ')
      : 'Address on file'

    let report = `═══════════════════════════════════════\n`
    report += `        ROOF INSPECTION REPORT\n`
    report += `═══════════════════════════════════════\n\n`

    report += `PROPERTY INFORMATION\n`
    report += `────────────────────\n`
    report += `Owner: ${customerName}\n`
    report += `Address: ${propertyAddress}\n`
    report += `Inspection Date: ${new Date().toLocaleDateString()}\n`
    report += `Project: ${project.name}\n\n`

    report += `ROOF DETAILS\n`
    report += `────────────────────\n`
    report += `Type: ${customFields.roof_type || customFields.roofType || 'Asphalt Shingles'}\n`
    report += `Approximate Age: ${customFields.roof_age || customFields.roofAge || 'Unknown'} years\n`
    report += `Pitch: ${customFields.roof_pitch || customFields.pitch || 'Standard'}\n`
    report += `Size: ${customFields.square_footage || customFields.squareFootage || 'TBD'} sq ft\n\n`

    // Findings from notes
    report += `INSPECTION FINDINGS\n`
    report += `────────────────────\n`

    if (notes && notes.length > 0) {
      const findings: string[] = []
      for (const note of notes) {
        if (note.content) {
          findings.push(note.content.substring(0, 300))
        }
      }

      if (findings.length > 0) {
        for (const finding of findings.slice(0, 5)) {
          report += `• ${finding}\n`
        }
      } else {
        report += `• No specific findings recorded\n`
      }
    } else {
      report += `• No inspection notes on file\n`
    }

    report += `\n`

    // Damage assessment
    report += `DAMAGE ASSESSMENT\n`
    report += `────────────────────\n`
    const damageType = customFields.damage_type || customFields.damageType || 'General inspection'
    const severity = customFields.damage_severity || customFields.severity || 'To be determined'
    report += `Type: ${damageType}\n`
    report += `Severity: ${severity}\n`

    if (customFields.hail_size || customFields.hailSize) {
      report += `Hail Size: ${customFields.hail_size || customFields.hailSize}\n`
    }
    if (customFields.wind_damage || customFields.windDamage) {
      report += `Wind Damage: Yes\n`
    }

    report += `\n`

    // Photos summary
    if (include_photos) {
      report += `PHOTO DOCUMENTATION\n`
      report += `────────────────────\n`
      report += `${photos.length} photo(s) on file\n`

      if (photos.length > 0) {
        const photoCategories = new Map<string, number>()
        for (const photo of photos) {
          const category = (photo.metadata?.category as string) || 'general'
          photoCategories.set(category, (photoCategories.get(category) || 0) + 1)
        }

        for (const [category, count] of photoCategories) {
          report += `• ${category}: ${count} photo(s)\n`
        }
      }

      report += `\n`
    }

    // Recommendations
    report += `RECOMMENDATIONS\n`
    report += `────────────────────\n`
    const recommendation = customFields.recommendation || customFields.recommended_action

    if (recommendation) {
      report += `${recommendation}\n`
    } else {
      // Auto-generate based on findings
      const age = customFields.roof_age || customFields.roofAge
      if (age && Number(age) >= 20) {
        report += `• Roof is ${age} years old - recommend full replacement\n`
      } else if (damageType.toLowerCase().includes('storm') || damageType.toLowerCase().includes('hail')) {
        report += `• Storm damage detected - recommend filing insurance claim\n`
        report += `• Schedule adjuster meeting for assessment\n`
      } else {
        report += `• Schedule follow-up for detailed estimate\n`
      }
    }

    report += `\n═══════════════════════════════════════\n`
    report += `Report generated: ${new Date().toLocaleString()}\n`
    report += `Inspector: ${context.userId ? 'Staff' : 'ARIA'}\n`

    // Log generation
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: contact?.id,
      project_id: targetProjectId,
      type: 'note',
      subject: 'Inspection Report Generated',
      content: `Inspection report generated via ARIA`,
      created_by: context.userId,
      metadata: { via: 'aria', photo_count: photos.length },
    })

    return {
      success: true,
      data: {
        projectId: targetProjectId,
        customerName,
        photoCount: photos.length,
        noteCount: notes?.length || 0,
        report,
      },
      message: report,
    }
  },
})

// =============================================================================
// summarize_claim - Generate insurance claim summary
// =============================================================================

ariaFunctionRegistry.register({
  name: 'summarize_claim',
  category: 'actions',
  description: 'Generate an insurance claim summary',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'summarize_claim',
    description: 'Generate a summary of an insurance claim including timeline, status, and next steps.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID for the insurance claim',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID (will find their insurance project)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { project_id, contact_id } = args as {
      project_id?: string
      contact_id?: string
    }

    let targetProjectId = project_id || context.project?.id
    const targetContactId = contact_id || context.contact?.id

    // If no project, find an insurance-related project for the contact
    if (!targetProjectId && targetContactId) {
      const { data: insuranceProject } = await context.supabase
        .from('projects')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('contact_id', targetContactId)
        .eq('is_deleted', false)
        .or('name.ilike.%insurance%,name.ilike.%claim%,custom_fields->>is_insurance_claim.eq.true')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (insuranceProject) targetProjectId = insuranceProject.id
    }

    if (!targetProjectId) {
      return { success: false, error: 'No insurance claim project found' }
    }

    // Fetch project with all details
    const { data: project, error: projectError } = await context.supabase
      .from('projects')
      .select(`
        id, name, stage, status, created_at, updated_at, custom_fields,
        contacts(first_name, last_name, address, city, state, zip, phone, email)
      `)
      .eq('id', targetProjectId)
      .eq('tenant_id', context.tenantId)
      .single()

    if (projectError || !project) {
      return { success: false, error: 'Project not found' }
    }

    const contact = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts
    const cf = project.custom_fields || {}

    // Fetch claim-related activities
    const { data: activities } = await context.supabase
      .from('activities')
      .select('type, subject, content, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)
      .order('created_at', { ascending: true })
      .limit(50)

    // Fetch appointments
    const { data: appointments } = await context.supabase
      .from('events')
      .select('title, start_at, status, event_type')
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)
      .eq('is_deleted', false)
      .order('start_at', { ascending: true })

    // Build claim summary
    const customerName = contact ? `${contact.first_name} ${contact.last_name}` : 'Homeowner'
    const propertyAddress = contact
      ? [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ')
      : 'Property address'

    // Extract claim data
    const claimData = {
      carrier: cf.insurance_carrier || cf.insuranceCarrier || 'Unknown Carrier',
      claimNumber: cf.claim_number || cf.claimNumber || 'Pending',
      dateOfLoss: cf.date_of_loss || cf.dateOfLoss || cf.storm_date || 'Unknown',
      adjuster: cf.adjuster_name || cf.adjusterName || 'Not assigned',
      adjusterPhone: cf.adjuster_phone || cf.adjusterPhone || '',
      deductible: cf.deductible || 0,
      approvedAmount: cf.approved_amount || cf.approvedAmount || 0,
      supplementAmount: cf.supplement_amount || cf.supplementAmount || 0,
      causation: cf.causation || cf.damage_cause || 'Storm damage',
    }

    // Determine claim status
    let claimStatus = 'In Progress'
    const stage = (project.stage || '').toLowerCase()
    if (stage.includes('won') || stage.includes('approved')) {
      claimStatus = 'Approved'
    } else if (stage.includes('denied') || stage.includes('lost')) {
      claimStatus = 'Denied'
    } else if (stage.includes('supplement')) {
      claimStatus = 'Supplement Pending'
    } else if (stage.includes('adjuster') || stage.includes('meeting')) {
      claimStatus = 'Adjuster Meeting Scheduled'
    }

    // Build timeline
    const timeline: Array<{ date: string; event: string }> = []

    // Add project creation
    timeline.push({
      date: new Date(project.created_at).toLocaleDateString(),
      event: 'Claim initiated',
    })

    // Add activities to timeline
    for (const activity of activities || []) {
      if (activity.subject?.toLowerCase().includes('adjuster') ||
          activity.subject?.toLowerCase().includes('claim') ||
          activity.subject?.toLowerCase().includes('insurance') ||
          activity.type === 'status_change') {
        timeline.push({
          date: new Date(activity.created_at).toLocaleDateString(),
          event: activity.subject || activity.content?.substring(0, 50) || activity.type,
        })
      }
    }

    // Add appointments to timeline
    for (const apt of appointments || []) {
      if (apt.event_type === 'adjuster_meeting' || apt.title?.toLowerCase().includes('adjuster')) {
        timeline.push({
          date: new Date(apt.start_at).toLocaleDateString(),
          event: `${apt.title} (${apt.status})`,
        })
      }
    }

    // Calculate days since filing
    const daysSinceFiling = Math.floor(
      (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Build summary document
    let summary = `🏥 INSURANCE CLAIM SUMMARY\n`
    summary += `═══════════════════════════════════════\n\n`

    summary += `CLAIM INFORMATION\n`
    summary += `────────────────────\n`
    summary += `Carrier: ${claimData.carrier}\n`
    summary += `Claim #: ${claimData.claimNumber}\n`
    summary += `Date of Loss: ${claimData.dateOfLoss}\n`
    summary += `Causation: ${claimData.causation}\n`
    summary += `Status: ${claimStatus} (Day ${daysSinceFiling})\n\n`

    summary += `PROPERTY\n`
    summary += `────────────────────\n`
    summary += `Owner: ${customerName}\n`
    summary += `Address: ${propertyAddress}\n`
    if (contact?.phone) summary += `Phone: ${contact.phone}\n`
    summary += `\n`

    summary += `ADJUSTER\n`
    summary += `────────────────────\n`
    summary += `Name: ${claimData.adjuster}\n`
    if (claimData.adjusterPhone) summary += `Phone: ${claimData.adjusterPhone}\n`
    summary += `\n`

    summary += `FINANCIALS\n`
    summary += `────────────────────\n`
    if (claimData.deductible) summary += `Deductible: $${Number(claimData.deductible).toLocaleString()}\n`
    if (claimData.approvedAmount) summary += `Approved: $${Number(claimData.approvedAmount).toLocaleString()}\n`
    if (claimData.supplementAmount) summary += `Supplement: $${Number(claimData.supplementAmount).toLocaleString()}\n`
    summary += `\n`

    summary += `TIMELINE\n`
    summary += `────────────────────\n`
    for (const entry of timeline.slice(-7)) {
      summary += `${entry.date}: ${entry.event}\n`
    }
    summary += `\n`

    // Next steps based on status
    summary += `NEXT STEPS\n`
    summary += `────────────────────\n`
    if (claimStatus === 'In Progress') {
      summary += `• Follow up with ${claimData.carrier} for status update\n`
      summary += `• Confirm adjuster meeting scheduled\n`
    } else if (claimStatus === 'Adjuster Meeting Scheduled') {
      summary += `• Prepare documentation for adjuster meeting\n`
      summary += `• Review scope and pricing\n`
    } else if (claimStatus === 'Supplement Pending') {
      summary += `• Follow up on supplement approval\n`
      summary += `• Prepare additional documentation if needed\n`
    } else if (claimStatus === 'Approved') {
      summary += `• Schedule work start date\n`
      summary += `• Collect deductible from homeowner\n`
    }

    return {
      success: true,
      data: {
        projectId: targetProjectId,
        customerName,
        carrier: claimData.carrier,
        claimNumber: claimData.claimNumber,
        status: claimStatus,
        daysSinceFiling,
        timeline,
      },
      message: summary,
    }
  },
})

// =============================================================================
// generate_project_summary - Create a project handoff summary
// =============================================================================

ariaFunctionRegistry.register({
  name: 'generate_project_summary',
  category: 'actions',
  description: 'Generate a comprehensive project summary for handoffs or reviews',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'generate_project_summary',
    description: 'Generate a comprehensive summary of a project including all activities, photos, and current status.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to summarize',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID (will use their latest project)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { project_id, contact_id } = args as {
      project_id?: string
      contact_id?: string
    }

    let targetProjectId = project_id || context.project?.id
    const targetContactId = contact_id || context.contact?.id

    if (!targetProjectId && targetContactId) {
      const { data: latestProject } = await context.supabase
        .from('projects')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('contact_id', targetContactId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestProject) targetProjectId = latestProject.id
    }

    if (!targetProjectId) {
      return { success: false, error: 'No project specified' }
    }

    // Fetch everything about the project
    const { data: project } = await context.supabase
      .from('projects')
      .select(`
        id, name, stage, status, created_at, updated_at, custom_fields,
        contacts(first_name, last_name, email, phone, address, city, state)
      `)
      .eq('id', targetProjectId)
      .eq('tenant_id', context.tenantId)
      .single()

    if (!project) {
      return { success: false, error: 'Project not found' }
    }

    const contact = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts

    // Get activity counts by type
    const { data: activities } = await context.supabase
      .from('activities')
      .select('type, direction, created_at')
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)

    // Get photo count
    const { count: photoCount } = await context.supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)
      .eq('is_deleted', false)

    // Get upcoming events
    const { data: upcomingEvents } = await context.supabase
      .from('events')
      .select('title, start_at, event_type')
      .eq('tenant_id', context.tenantId)
      .eq('project_id', targetProjectId)
      .eq('is_deleted', false)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(5)

    // Calculate stats
    const activityStats = {
      total: activities?.length || 0,
      calls: activities?.filter(a => a.type === 'call').length || 0,
      sms: activities?.filter(a => a.type === 'sms').length || 0,
      emails: activities?.filter(a => a.type === 'email').length || 0,
      notes: activities?.filter(a => a.type === 'note').length || 0,
      inbound: activities?.filter(a => a.direction === 'inbound').length || 0,
      outbound: activities?.filter(a => a.direction === 'outbound').length || 0,
    }

    const daysOpen = Math.floor(
      (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const customerName = contact ? `${contact.first_name} ${contact.last_name}` : 'Customer'
    const cf = project.custom_fields || {}

    let summary = `📊 PROJECT SUMMARY\n`
    summary += `═══════════════════════════════════════\n\n`

    summary += `PROJECT: ${project.name}\n`
    summary += `Status: ${project.stage || project.status || 'Active'}\n`
    summary += `Days Open: ${daysOpen}\n\n`

    summary += `CUSTOMER\n`
    summary += `────────────────────\n`
    summary += `Name: ${customerName}\n`
    if (contact?.phone) summary += `Phone: ${contact.phone}\n`
    if (contact?.email) summary += `Email: ${contact.email}\n`
    if (contact?.address) summary += `Address: ${contact.address}, ${contact.city}, ${contact.state}\n`
    summary += `\n`

    summary += `ACTIVITY SUMMARY\n`
    summary += `────────────────────\n`
    summary += `Total Interactions: ${activityStats.total}\n`
    summary += `• Calls: ${activityStats.calls}\n`
    summary += `• SMS: ${activityStats.sms}\n`
    summary += `• Emails: ${activityStats.emails}\n`
    summary += `• Notes: ${activityStats.notes}\n`
    summary += `• Inbound: ${activityStats.inbound} | Outbound: ${activityStats.outbound}\n`
    summary += `• Photos: ${photoCount || 0}\n\n`

    if (cf.estimate_total || cf.estimateTotal || cf.contract_value) {
      summary += `FINANCIALS\n`
      summary += `────────────────────\n`
      const value = cf.estimate_total || cf.estimateTotal || cf.contract_value
      summary += `Value: $${Number(value).toLocaleString()}\n`
      if (cf.is_insurance_claim || cf.insurance_claim) {
        summary += `Type: Insurance Claim (${cf.insurance_carrier || 'Carrier TBD'})\n`
      }
      summary += `\n`
    }

    if (upcomingEvents && upcomingEvents.length > 0) {
      summary += `UPCOMING\n`
      summary += `────────────────────\n`
      for (const event of upcomingEvents) {
        const date = new Date(event.start_at).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        summary += `• ${date}: ${event.title}\n`
      }
      summary += `\n`
    }

    summary += `Last Updated: ${new Date(project.updated_at).toLocaleDateString()}\n`

    return {
      success: true,
      data: {
        projectId: targetProjectId,
        projectName: project.name,
        customerName,
        stage: project.stage || project.status,
        daysOpen,
        activityStats,
        photoCount: photoCount || 0,
        upcomingEvents: upcomingEvents?.length || 0,
      },
      message: summary,
    }
  },
})
