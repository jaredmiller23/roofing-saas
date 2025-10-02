import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch project details
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      project_number,
      status,
      type,
      estimated_value,
      approved_value,
      final_value,
      profit_margin,
      description,
      scope_of_work,
      created_at,
      updated_at,
      estimated_start,
      actual_start,
      actual_completion,
      custom_fields,
      contact_id
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  // Fetch contact details separately
  let contact = null
  if (project?.contact_id) {
    const { data: contactData } = await supabase
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        address_street,
        address_city,
        address_state,
        address_zip
      `)
      .eq('id', project.contact_id)
      .single()
    
    contact = contactData
  }

  if (error || !project) {
    notFound()
  }

  // Extract custom fields
  const customFields = project.custom_fields as any
  const pipeline = customFields?.proline_pipeline || null
  const stage = customFields?.proline_stage || null
  const assignedTo = customFields?.assigned_to || null
  const location = customFields?.location || null
  const category = customFields?.category || null
  const services = customFields?.services || null

  const leadSource = customFields?.lead_source || null
  const tags = customFields?.tags || []
  const statusDates = customFields?.status_dates || {}

  // Extract financial data from raw_import_data (Proline import)
  const rawData = customFields?.raw_import_data || {}
  const grossRevenue = rawData?.['Gross Revenue'] ? parseFloat(rawData['Gross Revenue']) : customFields?.gross_revenue
  const netRevenue = rawData?.['Net Revenue'] ? parseFloat(rawData['Net Revenue']) : customFields?.net_revenue
  const grossProfit = rawData?.['Gross Profit'] ? parseFloat(rawData['Gross Profit']) : null
  const grossMargin = rawData?.['Gross Margin'] ? parseFloat(rawData['Gross Margin']) : null
  const projectCosts = rawData?.['Project Costs'] ? parseFloat(rawData['Project Costs']) : customFields?.project_costs
  const quotedValue = rawData?.['Quoted Value'] ? parseFloat(rawData['Quoted Value']) : null

  const formatCurrency = (value: number | null) => {
    if (!value) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      lead: 'bg-blue-100 text-blue-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-purple-100 text-purple-800',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/projects"
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.project_number && (
                <p className="text-sm text-gray-500 mt-1">Project #{project.project_number}</p>
              )}
            </div>
            <div className="flex gap-3">
              {getStatusBadge(project.status)}
              <Link
                href={`/projects/${id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Project
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            {contact && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{contact.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{contact.email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">
                      {contact.address_street ? (
                        <>
                          {contact.address_street}
                          <br />
                          {contact.address_city}, {contact.address_state} {contact.address_zip}
                        </>
                      ) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Project Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1">{project.description || 'No description provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Scope of Work</label>
                  <p className="text-gray-900 mt-1">{project.scope_of_work || 'No scope defined'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="text-gray-900">{project.type || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lead Source</label>
                    <p className="text-gray-900">{leadSource || rawData?.['Lead Source'] || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-gray-900">{location || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-gray-900">{category || '—'}</p>
                  </div>
                  {services && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">Services</label>
                      <p className="text-gray-900">{services}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Estimated Value</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(project.estimated_value)}</p>
                </div>
                {quotedValue && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quoted Value</label>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(quotedValue)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Approved Value</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(project.approved_value)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Final Value</label>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(project.final_value)}</p>
                </div>
                {grossRevenue && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gross Revenue</label>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(grossRevenue)}</p>
                  </div>
                )}
                {netRevenue && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Net Revenue</label>
                    <p className="text-lg font-semibold text-blue-700">{formatCurrency(netRevenue)}</p>
                  </div>
                )}
                {projectCosts && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project Costs</label>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(projectCosts)}</p>
                  </div>
                )}
                {grossProfit && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gross Profit</label>
                    <p className={`text-lg font-semibold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(grossProfit)}
                    </p>
                  </div>
                )}
                {grossMargin !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gross Margin</label>
                    <p className={`text-lg font-semibold ${grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(grossMargin * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
                {project.profit_margin && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Profit Margin</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {(project.profit_margin * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Pipeline & Stage */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Status</h2>
              <div className="space-y-4">
                {/* Pipeline Badge */}
                {pipeline && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Pipeline</label>
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      {pipeline}
                    </div>
                  </div>
                )}

                {/* Stage Badge */}
                {stage && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Stage</label>
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {stage}
                    </div>
                  </div>
                )}

                {/* Assigned To */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <p className="text-gray-900 font-medium mt-1">{assignedTo || '—'}</p>
                </div>

                {/* Project Number */}
                {rawData?.['Project Number'] && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project Number</label>
                    <p className="text-gray-900 font-medium mt-1">#{rawData['Project Number']}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">{formatDate(project.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">{formatDate(project.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estimated Start</label>
                  <p className="text-gray-900">{formatDate(project.estimated_start)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Actual Start</label>
                  <p className="text-gray-900">{formatDate(project.actual_start)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Completion</label>
                  <p className="text-gray-900">{formatDate(project.actual_completion)}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status History */}
            {Object.keys(statusDates).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Status History</h2>
                <div className="space-y-2">
                  {Object.entries(statusDates).map(([status, date]) => {
                    if (!date) return null
                    return (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{status}</span>
                        <span className="text-gray-900">{formatDate(date as string)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
