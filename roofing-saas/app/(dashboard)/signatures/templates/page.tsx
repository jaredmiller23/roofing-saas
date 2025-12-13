'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LayoutTemplate,
  Plus,
  Search,
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Copy
} from 'lucide-react'

interface SignatureTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  requires_customer_signature: boolean
  requires_company_signature: boolean
  expiration_days: number
  signature_fields: Array<{
    id: string
    type: string
    label?: string
    assignedTo: string
  }>
  created_at: string
  updated_at: string
}

export default function SignatureTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<SignatureTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      const res = await fetch(`/api/signature-templates?${params.toString()}`)
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || result.data?.error || 'Failed to load templates')
      }

      // Handle response format: { success, data: { templates, ... } } or { templates, ... }
      const data = result.data || result
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleToggleActive = async (template: SignatureTemplate) => {
    try {
      const res = await fetch(`/api/signature-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active }),
      })

      if (!res.ok) {
        throw new Error('Failed to update template')
      }

      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
    }
  }

  const handleDelete = async (template: SignatureTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/signature-templates/${template.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete template')
      }

      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleDuplicate = async (template: SignatureTemplate) => {
    try {
      const res = await fetch('/api/signature-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          signature_fields: template.signature_fields,
          requires_customer_signature: template.requires_customer_signature,
          requires_company_signature: template.requires_company_signature,
          expiration_days: template.expiration_days,
          is_active: false,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to duplicate template')
      }

      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template')
    }
  }

  const getCategoryBadge = (category: string | null) => {
    const colors: Record<string, string> = {
      contracts: 'bg-primary/10 text-primary',
      estimates: 'bg-secondary/10 text-secondary',
      waivers: 'bg-yellow-100 text-yellow-700',
      change_orders: 'bg-purple-100 text-purple-700',
      other: 'bg-muted text-muted-foreground',
    }

    const label = category || 'other'
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[label] || colors.other}`}>
        {label.replace('_', ' ').charAt(0).toUpperCase() + label.replace('_', ' ').slice(1)}
      </span>
    )
  }

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      t.name.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/signatures" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              E-Signatures
            </Link>
            <span>/</span>
            <span>Templates</span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <LayoutTemplate className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Signature Templates</h1>
            </div>
            <Button
              onClick={() => router.push('/signatures/templates/new')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
          <p className="text-muted-foreground">
            Create reusable document templates with pre-configured signature fields
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-card"
              >
                <option value="all">All Categories</option>
                <option value="contracts">Contracts</option>
                <option value="estimates">Estimates</option>
                <option value="waivers">Waivers</option>
                <option value="change_orders">Change Orders</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Templates List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No templates found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Create your first signature template to get started'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => router.push('/signatures/templates/new')}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      <FileText className={`h-5 w-5 ${template.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {template.name}
                        </h3>
                        {getCategoryBadge(template.category)}
                        {!template.is_active && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-muted-foreground text-sm mb-3">{template.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Fields:</span>{' '}
                          <span>{template.signature_fields?.length || 0} signature fields</span>
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span>{' '}
                          <span>{template.expiration_days} days</span>
                        </div>
                        <div>
                          <span className="font-medium">Signatures:</span>{' '}
                          <span>
                            {[
                              template.requires_customer_signature && 'Customer',
                              template.requires_company_signature && 'Company',
                            ]
                              .filter(Boolean)
                              .join(' + ') || 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Updated:</span>{' '}
                          <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(template)}
                      title={template.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {template.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(template)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/signatures/templates/${template.id}`)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template)}
                      title="Delete"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
