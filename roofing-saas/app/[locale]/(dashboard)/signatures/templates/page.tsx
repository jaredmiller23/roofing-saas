'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api/client'
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
  Copy,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface SignatureField {
  id: string
  type: string
  label?: string
  assignedTo: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required?: boolean
}

interface SignatureTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  requires_customer_signature: boolean
  requires_company_signature: boolean
  expiration_days: number
  pdf_template_url: string | null
  signature_fields: SignatureField[]
  created_at: string
  updated_at: string
}

// Field type colors for visual differentiation
const FIELD_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  signature: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-700' },
  initials: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-700' },
  date: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-700' },
  text: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-700' },
  checkbox: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-700' },
  name: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-700' },
  email: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-700' },
}

export default function SignatureTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<SignatureTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<SignatureTemplate | null>(null)
  const [previewNumPages, setPreviewNumPages] = useState(0)
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1)
  const [previewScale, setPreviewScale] = useState(0.8)
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      const data = await apiFetch<{ templates: SignatureTemplate[] }>(`/api/signature-templates?${params.toString()}`)
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
      await apiFetch(`/api/signature-templates/${template.id}`, {
        method: 'PATCH',
        body: { is_active: !template.is_active },
      })

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
      await apiFetch(`/api/signature-templates/${template.id}`, {
        method: 'DELETE',
      })

      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleDuplicate = async (template: SignatureTemplate) => {
    try {
      await apiFetch('/api/signature-templates', {
        method: 'POST',
        body: {
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          signature_fields: template.signature_fields,
          requires_customer_signature: template.requires_customer_signature,
          requires_company_signature: template.requires_company_signature,
          expiration_days: template.expiration_days,
          is_active: false,
        },
      })

      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template')
    }
  }

  const handlePreview = (template: SignatureTemplate) => {
    setPreviewTemplate(template)
    setPreviewCurrentPage(1)
    setPreviewNumPages(0)
    setPreviewLoading(true)
  }

  const closePreview = () => {
    setPreviewTemplate(null)
    setPreviewNumPages(0)
    setPreviewCurrentPage(1)
  }

  const handleUseTemplate = (template: SignatureTemplate) => {
    // Navigate to new document page with template pre-selected
    router.push(`/signatures/new?templateId=${template.id}`)
  }

  // Get fields for current preview page
  const getPreviewPageFields = () => {
    if (!previewTemplate) return []
    return previewTemplate.signature_fields.filter(f => f.page === previewCurrentPage)
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
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
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
                      onClick={() => handlePreview(template)}
                      title="Preview"
                      className="text-primary hover:text-primary/80 hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

      {/* Template Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {previewTemplate?.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewTemplate?.description || 'No description'}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Preview Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {previewNumPages > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewCurrentPage(p => Math.max(1, p - 1))}
                    disabled={previewCurrentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {previewCurrentPage} of {previewNumPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewCurrentPage(p => Math.min(previewNumPages, p + 1))}
                    disabled={previewCurrentPage >= previewNumPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewScale(s => Math.max(0.5, s - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-14 text-center">
                {Math.round(previewScale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewScale(s => Math.min(2, s + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {previewTemplate?.signature_fields?.length || 0} fields
              </span>
            </div>
          </div>

          {/* PDF Preview Area */}
          <div className="flex-1 overflow-auto p-4 bg-muted/20 flex items-start justify-center">
            {previewTemplate?.pdf_template_url ? (
              <div className="relative bg-card shadow-lg rounded">
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-30 rounded">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <Document
                  file={previewTemplate.pdf_template_url}
                  onLoadSuccess={({ numPages }) => {
                    setPreviewNumPages(numPages)
                    setPreviewLoading(false)
                  }}
                  onLoadError={() => setPreviewLoading(false)}
                  loading={
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={previewCurrentPage}
                    scale={previewScale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>

                {/* Field Overlays */}
                {getPreviewPageFields().map((field) => {
                  const colors = FIELD_TYPE_COLORS[field.type] || FIELD_TYPE_COLORS.text
                  return (
                    <div
                      key={field.id}
                      className={`absolute border-2 rounded ${colors.bg} ${colors.border} pointer-events-none`}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                      }}
                    >
                      <span className={`absolute -top-5 left-0 text-xs font-medium px-1 rounded ${colors.text} bg-card/90`}>
                        {field.label || field.type}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No PDF Template</p>
                <p className="text-muted-foreground">
                  This template doesn&apos;t have a PDF attached.
                  {previewTemplate?.signature_fields?.length ? (
                    <span> It has {previewTemplate.signature_fields.length} field(s) defined.</span>
                  ) : null}
                </p>
              </div>
            )}
          </div>

          {/* Field Legend */}
          {previewTemplate?.signature_fields?.length ? (
            <div className="px-4 py-3 bg-card border-t border-border shrink-0">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs font-medium text-muted-foreground">Field Types:</span>
                {Object.entries(
                  previewTemplate.signature_fields.reduce((acc, f) => {
                    acc[f.type] = (acc[f.type] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).map(([type, count]) => {
                  const colors = FIELD_TYPE_COLORS[type] || FIELD_TYPE_COLORS.text
                  return (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${colors.border} border-2`} />
                      {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                    </span>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Footer with Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card shrink-0">
            <div className="text-sm text-muted-foreground">
              Expires in {previewTemplate?.expiration_days} days •{' '}
              {[
                previewTemplate?.requires_customer_signature && 'Customer',
                previewTemplate?.requires_company_signature && 'Company',
              ].filter(Boolean).join(' + ')} signature required
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={closePreview}>
                Close
              </Button>
              <Button
                onClick={() => previewTemplate && handleUseTemplate(previewTemplate)}
                className="bg-primary hover:bg-primary/90"
              >
                Use This Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
