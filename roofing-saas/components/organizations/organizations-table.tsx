'use client'

import { useEffect, useState, useCallback } from 'react'
import { Organization, formatOrganizationType } from '@/lib/types/organization'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, RefreshCw, Phone, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrganizationsTableProps {
  params: { [key: string]: string | string[] | undefined }
}

type SortField = 'name' | 'type' | 'created_at'
type SortDirection = 'asc' | 'desc'

export function OrganizationsTable({ params }: OrganizationsTableProps) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [_page, setPage] = useState(parseInt((params.page as string) || '1'))
  const [sortField, setSortField] = useState<SortField>((params.sort as SortField) || 'name')
  const [sortDirection, setSortDirection] = useState<SortDirection>((params.sort_order as SortDirection) || 'asc')

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build query params
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          queryParams.set(key, value)
        }
      })

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(`/api/organizations?${queryParams.toString()}`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const result = await response.json()
      // Handle new response format: { success, data: { organizations, total, page, ... } }
      const data = result.data || result
      setOrganizations(data.organizations || [])
      setTotal(data.total || 0)
      setPage(data.page || 1)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const handleSort = (field: SortField) => {
    const newDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'

    setSortField(field)
    setSortDirection(newDirection)

    // Map frontend field names to database column names
    const fieldMap: Record<SortField, string> = {
      name: 'name',
      type: 'type',
      created_at: 'created_at',
    }

    const newParams = new URLSearchParams(params as Record<string, string>)
    newParams.set('sort_by', fieldMap[field])
    newParams.set('sort_order', newDirection)
    newParams.set('page', '1') // Reset to first page when sorting

    router.push(`/organizations?${newParams.toString()}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) {
      return
    }

    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete organization')
      }

      // Refresh the list
      setOrganizations(organizations.filter((o) => o.id !== id))
      setTotal(total - 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete organization')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading organizations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchOrganizations} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center p-8">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Organizations Found</h3>
        <p className="text-muted-foreground mb-4">
          {Object.keys(params).length > 0
            ? 'No organizations match your current filters.'
            : 'Start by creating your first organization.'}
        </p>
        <Link
          href="/organizations/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Create Organization
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Organizations Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Organization
                  {sortField === 'name' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Type
                  {sortField === 'type' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Contact Info
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Address
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Created
                  {sortField === 'created_at' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((organization) => (
              <tr
                key={organization.id}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <Link
                        href={`/organizations/${organization.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {organization.name}
                      </Link>
                      {organization.industry && (
                        <p className="text-sm text-muted-foreground">{organization.industry}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                    {formatOrganizationType(organization.type)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="space-y-1 text-sm">
                    {organization.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {organization.phone}
                      </div>
                    )}
                    {organization.website && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Globe className="w-3 h-3" />
                        <a
                          href={organization.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {organization.address_city || organization.address_state ? (
                    <div>
                      {organization.address_city && organization.address_city}
                      {organization.address_city && organization.address_state && ', '}
                      {organization.address_state && organization.address_state}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {new Date(organization.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/organizations/${organization.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      href={`/organizations/${organization.id}/edit`}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(organization.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Info */}
      {total > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {organizations.length} of {total} organizations
        </div>
      )}
    </div>
  )
}