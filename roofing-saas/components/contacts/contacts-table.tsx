'use client'

import { useEffect, useState } from 'react'
import { Contact } from '@/lib/types/contact'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, MessageSquare, Mail } from 'lucide-react'

interface ContactsTableProps {
  params: { [key: string]: string | string[] | undefined }
}

type SortField = 'name' | 'email' | 'phone' | 'stage' | 'type'
type SortDirection = 'asc' | 'desc'

export function ContactsTable({ params }: ContactsTableProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt((params.page as string) || '1'))
  const [sortField, setSortField] = useState<SortField>((params.sort as SortField) || 'name')
  const [sortDirection, setSortDirection] = useState<SortDirection>((params.sort_order as SortDirection) || 'asc')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    async function fetchContacts() {
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

        const response = await fetch(`/api/contacts?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch contacts')
        }

        const result = await response.json()
        // Handle new response format: { success, data: { contacts, total, page, ... } }
        const data = result.data || result
        setContacts(data.contacts || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [params])

  const handleSort = (field: SortField) => {
    const newDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'

    setSortField(field)
    setSortDirection(newDirection)

    // Map frontend field names to database column names
    const fieldMap: Record<SortField, string> = {
      name: 'first_name',
      email: 'email',
      phone: 'phone',
      stage: 'stage',
      type: 'type',
    }

    const newParams = new URLSearchParams(params as Record<string, string>)
    newParams.set('sort_by', fieldMap[field])
    newParams.set('sort_order', newDirection)
    newParams.set('page', '1') // Reset to first page when sorting

    router.push(`/contacts?${newParams.toString()}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return
    }

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }

      // Refresh the list
      setContacts(contacts.filter((c) => c.id !== id))
      setTotal(total - 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete contact')
    }
  }

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)))
    }
  }

  const toggleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedContacts(newSelected)
  }

  const handleBulkAction = async (action: string, value?: string) => {
    if (selectedContacts.size === 0) return

    setBulkActionLoading(true)

    try {
      const updates: Promise<Response>[] = []

      for (const contactId of selectedContacts) {
        let body = {}

        if (action === 'stage') body = { stage: value }
        else if (action === 'priority') body = { priority: value }
        else if (action === 'delete') {
          updates.push(fetch(`/api/contacts/${contactId}`, { method: 'DELETE' }))
          continue
        }

        updates.push(
          fetch(`/api/contacts/${contactId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
        )
      }

      await Promise.all(updates)

      // Refresh the list
      window.location.reload()
    } catch (error) {
      console.error('Bulk action failed:', error)
      alert('Failed to apply bulk action')
    } finally {
      setBulkActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-600">Loading contacts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-600 mb-4">No contacts found</div>
        <Link
          href="/contacts/new"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create your first contact
        </Link>
      </div>
    )
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-blue-600">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  )

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedContacts.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">
              {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedContacts(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => handleBulkAction('stage', e.target.value)}
              disabled={bulkActionLoading}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="" disabled>Change Stage</option>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="customer">Customer</option>
              <option value="lost">Lost</option>
            </select>
            <select
              onChange={(e) => handleBulkAction('priority', e.target.value)}
              disabled={bulkActionLoading}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="" disabled>Change Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={() => {
                if (confirm(`Delete ${selectedContacts.size} contact(s)?`)) {
                  handleBulkAction('delete')
                }
              }}
              disabled={bulkActionLoading}
              className="text-sm px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={contacts.length > 0 && selectedContacts.size === contacts.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <SortableHeader field="name">Name</SortableHeader>
              <SortableHeader field="email">Email</SortableHeader>
              <SortableHeader field="phone">Phone</SortableHeader>
              <SortableHeader field="stage">Stage</SortableHeader>
              <SortableHeader field="type">Type</SortableHeader>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr key={contact.id} className={`hover:bg-gray-50 ${selectedContacts.has(contact.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleSelectContact(contact.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    {contact.first_name} {contact.last_name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {contact.email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {contact.phone || contact.mobile_phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(contact.stage)}`}>
                    {contact.stage}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                  {contact.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {/* Quick Actions */}
                    {(contact.phone || contact.mobile_phone) && (
                      <a
                        href={`tel:${contact.phone || contact.mobile_phone}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                        title="Call"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {(contact.phone || contact.mobile_phone) && (
                      <a
                        href={`sms:${contact.phone || contact.mobile_phone}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                        title="Text"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors"
                        title="Email"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    {/* Edit/Delete */}
                    <Link
                      href={`/contacts/${contact.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-600 hover:text-red-900 ml-2"
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

      {/* Pagination */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {contacts.length} of {total} contacts
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newPage = page - 1
              router.push(`/contacts?${new URLSearchParams({ ...params as Record<string, string>, page: newPage.toString() }).toString()}`)
            }}
            disabled={page <= 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-700">
            Page {page}
          </span>
          <button
            onClick={() => {
              const newPage = page + 1
              router.push(`/contacts?${new URLSearchParams({ ...params as Record<string, string>, page: newPage.toString() }).toString()}`)
            }}
            disabled={contacts.length < 20}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-purple-100 text-purple-800',
    proposal: 'bg-indigo-100 text-indigo-800',
    negotiation: 'bg-orange-100 text-orange-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-gray-100 text-gray-800',
  }
  return colors[stage] || 'bg-gray-100 text-gray-800'
}
