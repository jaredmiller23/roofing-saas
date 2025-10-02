import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, TrendingUp, Trophy, XCircle, User } from 'lucide-react'

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

  // Fetch project activities/notes
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      id,
      type,
      subject,
      notes,
      created_at,
      created_by,
      users:created_by (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq('project_id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(20)

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

  const getStageIcon = (stage: string) => {
    const icons = {
      lead: <User className="h-5 w-5" />,
      active: <Clock className="h-5 w-5" />,
      proposal: <TrendingUp className="h-5 w-5" />,
      won: <Trophy className="h-5 w-5" />,
      customer: <CheckCircle2 className="h-5 w-5" />,
      lost: <XCircle className="h-5 w-5" />,
    }
    return icons[stage as keyof typeof icons] || <Clock className="h-5 w-5" />
  }

  const getStageColor = (stage: string) => {
    const colors = {
      lead: { bg: 'bg-blue-100', border: 'border-blue-400', icon: 'text-blue-600' },
      active: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-600' },
      proposal: { bg: 'bg-purple-100', border: 'border-purple-400', icon: 'text-purple-600' },
      won: { bg: 'bg-green-100', border: 'border-green-400', icon: 'text-green-600' },
      customer: { bg: 'bg-green-100', border: 'border-green-400', icon: 'text-green-600' },
      lost: { bg: 'bg-red-100', border: 'border-red-400', icon: 'text-red-600' },
    }
    return colors[stage as keyof typeof colors] || { bg: 'bg-gray-100', border: 'border-gray-400', icon: 'text-gray-600' }
  }

  const calculateDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Same day'
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days < 365) {
      const months = Math.floor(days / 30)
      return months === 1 ? '1 month' : `${months} months`
    }
    const years = Math.floor(days / 365)
    return years === 1 ? '1 year' : `${years} years`
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

            {/* Project Notes & Activities */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes & Activity</h2>

              {/* Activities list */}
              {activities && activities.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {activities.map((activity: any) => {
                    const userName = activity.users?.raw_user_meta_data?.full_name ||
                                   activity.users?.raw_user_meta_data?.name ||
                                   activity.users?.email?.split('@')[0] ||
                                   'Unknown User'

                    return (
                      <div key={activity.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-700">
                                {userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{userName}</p>
                              <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                            </div>
                          </div>
                          {activity.type && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
                              {activity.type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {activity.subject && (
                          <p className="text-sm font-medium text-gray-800 mb-1">{activity.subject}</p>
                        )}
                        {activity.notes && (
                          <p className="text-sm text-gray-600">{activity.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No activities yet. Add a note to track progress.
                </div>
              )}

              {/* Add note form - would need client component for interactivity */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  href={`/projects/${id}/add-note`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  + Add Note
                </Link>
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

            {/* Status History Timeline */}
            {Object.keys(statusDates).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Stage History</h2>
                <div className="space-y-1">
                  {Object.entries(statusDates)
                    .filter(([_, date]) => date)
                    .sort(([_, dateA], [__, dateB]) => new Date(dateA as string).getTime() - new Date(dateB as string).getTime())
                    .map(([stage, date], index, array) => {
                      const colors = getStageColor(stage)
                      const isLast = index === array.length - 1
                      const isCurrent = stage === project.status
                      const nextDate = !isLast ? array[index + 1][1] as string : null
                      const duration = calculateDuration(date as string, nextDate)

                      return (
                        <div key={stage} className="relative">
                          {/* Timeline connector line */}
                          {!isLast && (
                            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200" style={{ height: '24px' }} />
                          )}

                          {/* Stage entry */}
                          <div className={`flex items-start gap-3 p-2 rounded-lg transition-all ${isCurrent ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-50'}`}>
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center ${colors.icon}`}>
                              {getStageIcon(stage)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-sm font-semibold ${isCurrent ? 'text-blue-900' : 'text-gray-900'} capitalize`}>
                                  {stage}
                                  {isCurrent && (
                                    <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-blue-600 text-white rounded-full">
                                      Current
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {formatDate(date as string)}
                              </div>
                              {!isLast && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Duration: {duration}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Summary */}
                {Object.keys(statusDates).length > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Total Journey:</span>{' '}
                      {calculateDuration(
                        Object.values(statusDates).filter(Boolean).sort((a, b) =>
                          new Date(a as string).getTime() - new Date(b as string).getTime()
                        )[0] as string,
                        null
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
