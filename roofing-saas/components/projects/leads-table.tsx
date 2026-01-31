'use client'

import { useEffect, useState } from 'react'
import { Contact } from '@/lib/types/contact'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, MessageSquare, Mail, DollarSign, Briefcase, TrendingUp, Clock } from 'lucide-react'
import { apiFetchPaginated } from '@/lib/api/client'

interface Project {
  id: string
  name: string
  status: string
  estimated_value: number
  approved_value: number
  final_value: number | null
}

interface LeadWithProjects extends Contact {
  projects?: Project[]
  total_project_value?: number
}

type SortField = 'name' | 'email' | 'phone' | 'stage' | 'value' | 'updated_at'
type SortDirection = 'asc' | 'desc'

interface LeadsTableProps {
  params?: { [key: string]: string | string[] | undefined }
}

export function LeadsTable({ params = {} }: LeadsTableProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Read from URL params instead of internal state
  const page = params.page ? parseInt(params.page as string, 10) : 1
  const sortField = (params.sort_by as SortField) || 'updated_at'
  const sortDirection = (params.sort_order as SortDirection) || 'desc'
  const stageFilter = (params.stage as string) || undefined
  const searchQuery = (params.search as string) || undefined

  // Helper to update URL params
  const updateUrlParams = (newParams: { [key: string]: string | undefined }) => {
    const currentParams = new URLSearchParams()
    Object.entries({ ...params, ...newParams }).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        currentParams.set(key, String(value))
      }
    })
    router.push(`/projects?${currentParams.toString()}`)
  }

  useEffect(() => {
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortField, sortDirection, stageFilter, searchQuery])

  async function fetchLeads() {
    setLoading(true)
    setError(null)

    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      // Map frontend field names to database column names
      const fieldMap: Record<SortField, string> = {
        name: 'first_name',
        email: 'email',
        phone: 'phone',
        stage: 'stage',
        value: 'lead_score', // Sort by lead_score as a proxy for value
        updated_at: 'updated_at',
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        sort_by: fieldMap[sortField],
        sort_order: sortDirection,
        limit: '50',
        include: 'projects',
      })

      if (stageFilter) {
        queryParams.set('stage', stageFilter)
      }

      if (searchQuery) {
        queryParams.set('search', searchQuery)
      }

      const { data: contacts, pagination } = await apiFetchPaginated<(Contact & { projects?: Project[] })[]>(
        `/api/contacts?${queryParams.toString()}`,
        { signal: controller.signal }
      )
      clearTimeout(timeoutId)

      // Projects are embedded via server-side join (single query, no N+1)
      const contactsWithProjects = contacts.map(
        (contact) => {
          const projects = contact.projects || []
          const total_project_value = projects.reduce((sum: number, p: Project) => {
            const value = p.final_value || p.approved_value || p.estimated_value
            return sum + (value || 0)
          }, 0)

          return {
            ...contact,
            projects,
            total_project_value,
          }
        }
      )

      setLeads(contactsWithProjects)
      setTotal(pagination.total)
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.')
        } else {
          setError(err.message)
        }
      } else {
        setError('An error occurred')
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    const newDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'

    // Update URL params to trigger new data fetch
    const newParams = new URLSearchParams(params as Record<string, string>)
    newParams.set('sort_by', field)
    newParams.set('sort_order', newDirection)
    newParams.set('page', '1') // Reset to first page on sort

    router.push(`/projects?${newParams.toString()}`)
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths}mo ago`
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-primary bg-primary/10'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-muted-foreground bg-muted'
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-primary/10 text-primary',
      active: 'bg-yellow-100 text-yellow-800',
      customer: 'bg-green-100 text-green-800',
      lost: 'bg-muted text-muted-foreground',
    }
    return colors[stage] || 'bg-muted text-muted-foreground'
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow p-8 text-center">
        <div className="text-muted-foreground">Loading leads...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow p-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow p-8 text-center">
        <div className="text-muted-foreground mb-4">No leads found</div>
        <Link
          href="/contacts/new"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Create your first lead
        </Link>
      </div>
    )
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/10 select-none"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  )

  // Calculate total pipeline value
  const totalPipelineValue = leads.reduce((sum, lead) => sum + (lead.total_project_value || 0), 0)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-card rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-sm text-primary font-medium">Total Leads</div>
            <div className="text-2xl font-bold text-primary">{total}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-green-600 font-medium">Pipeline Value</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totalPipelineValue)}</div>
          </div>
          <div className="bg-secondary/10 rounded-lg p-3">
            <div className="text-sm text-secondary font-medium">Avg. Value</div>
            <div className="text-2xl font-bold text-secondary">
              {formatCurrency(leads.length > 0 ? totalPipelineValue / leads.length : 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <SortableHeader field="name">Lead</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <SortableHeader field="stage">Stage</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Projects
                </th>
                <SortableHeader field="value">Total Value</SortableHeader>
                <SortableHeader field="updated_at">Last Activity</SortableHeader>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-accent">
                  {/* Lead Name & Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-semibold">
                        {lead.first_name.charAt(0)}{lead.last_name.charAt(0)}
                      </div>
                      <div>
                        <Link
                          href={`/contacts/${lead.id}`}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          {lead.first_name} {lead.last_name}
                        </Link>
                        {lead.lead_score > 0 && (
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ml-2 ${getLeadScoreColor(lead.lead_score)}`}>
                            <TrendingUp className="h-3 w-3" />
                            {lead.lead_score}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact Details */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground">
                      {lead.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{lead.email}</span>
                        </div>
                      )}
                      {(lead.phone || lead.mobile_phone) && (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{lead.phone || lead.mobile_phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStageColor(lead.stage)}`}>
                      {lead.stage}
                    </span>
                  </td>

                  {/* Projects */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.projects && lead.projects.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground font-medium">
                          {lead.projects.length}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lead.projects.length === 1 ? 'project' : 'projects'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No projects</span>
                    )}
                  </td>

                  {/* Total Value */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(lead.total_project_value)}
                    </div>
                  </td>

                  {/* Last Activity */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {getTimeSince(lead.updated_at)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick Actions */}
                      {(lead.phone || lead.mobile_phone) && (
                        <a
                          href={`tel:${lead.phone || lead.mobile_phone}`}
                          className="inline-flex items-center justify-center w-8 h-8 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {(lead.phone || lead.mobile_phone) && (
                        <a
                          href={`sms:${lead.phone || lead.mobile_phone}`}
                          className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                          title="Text"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="inline-flex items-center justify-center w-8 h-8 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-md transition-colors"
                          title="Email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      <div className="w-px h-6 bg-border mx-1"></div>
                      <Link
                        href={`/contacts/${lead.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-muted px-6 py-4 flex items-center justify-between border-t border">
          <div className="text-sm text-muted-foreground">
            Showing {leads.length} of {total} leads
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateUrlParams({ page: String(page - 1) })}
              disabled={page <= 1}
              className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/10"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              Page {page}
            </span>
            <button
              onClick={() => updateUrlParams({ page: String(page + 1) })}
              disabled={leads.length < 50}
              className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/10"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
