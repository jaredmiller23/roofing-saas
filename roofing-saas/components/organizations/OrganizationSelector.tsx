'use client'

import { useState, useEffect } from 'react'
import { Organization, organizationToOption, type OrganizationOption } from '@/lib/types/organization'
import { Search, Building2, Plus } from 'lucide-react'
import Link from 'next/link'

interface OrganizationSelectorProps {
  value?: string
  onChange: (organizationId: string | undefined) => void
  placeholder?: string
  error?: string
}

export function OrganizationSelector({ value, onChange, placeholder = "Select organization...", error }: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selectedOrganization = organizations.find(org => org.id === value)

  // Fetch organizations when component mounts or when searching
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true)
      try {
        const searchQuery = searchTerm ? `search=${encodeURIComponent(searchTerm)}` : ''
        const response = await fetch(`/api/organizations?limit=50&${searchQuery}`)

        if (response.ok) {
          const result = await response.json()
          const data = result.data || result
          const orgList = (data.organizations || []) as Organization[]
          setOrganizations(orgList.map(organizationToOption))
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [searchTerm])

  const handleSelect = (organizationId: string | undefined) => {
    onChange(organizationId)
    setIsOpen(false)
    setSearchTerm('')
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      {/* Input/Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-md cursor-pointer focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-input focus:ring-primary'
        } ${isOpen ? 'ring-2 ring-primary' : ''}`}
      >
        {selectedOrganization ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{selectedOrganization.displayName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{placeholder}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {/* None option */}
            <div
              onClick={() => handleSelect(undefined)}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                !value ? 'bg-accent' : ''
              }`}
            >
              <div className="w-4 h-4" /> {/* Spacer for alignment */}
              <span className="text-muted-foreground">No organization</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((organization) => (
                <div
                  key={organization.id}
                  onClick={() => handleSelect(organization.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                    value === organization.id ? 'bg-accent' : ''
                  }`}
                >
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{organization.displayName}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {searchTerm ? 'No organizations found' : 'No organizations available'}
              </div>
            )}

            {/* Create New Option */}
            <div className="border-t border-input">
              <Link
                href="/organizations/new"
                className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent w-full"
                onClick={() => setIsOpen(false)}
              >
                <Plus className="w-4 h-4" />
                <span>Create new organization</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}