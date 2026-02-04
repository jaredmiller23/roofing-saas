'use client'

import { useState, useRef } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FieldPalette, type FieldType, getFieldConfig } from '@/components/signatures/FieldPalette'
import { PlacedField, type SignatureFieldPlacement } from '@/components/signatures/PlacedField'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  LayoutTemplate,
  ArrowLeft,
  Save,
  FileUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2
} from 'lucide-react'
import { uploadSignaturePdf } from '@/lib/storage/signature-pdfs'
import { createClient } from '@/lib/supabase/client'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function NewTemplatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'contracts',
    requires_customer_signature: true,
    requires_company_signature: true,
    expiration_days: 30,
    is_active: true,
  })

  // PDF and fields state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [fields, setFields] = useState<SignatureFieldPlacement[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [draggingType, setDraggingType] = useState<FieldType | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPdfFile(file)
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
    setIsLoadingPdf(true)
    setCurrentPage(1)
    setFields([]) // Reset fields when new PDF is uploaded
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const fieldType = e.dataTransfer.getData('fieldType') as FieldType
    if (!fieldType || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const config = getFieldConfig(fieldType)
    if (!config) return

    const newField: SignatureFieldPlacement = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: config.label,
      page: currentPage,
      x: Math.max(0, Math.min(90, x)),
      y: Math.max(0, Math.min(90, y)),
      width: config.defaultWidth,
      height: config.defaultHeight,
      required: true,
      assignedTo: 'customer',
    }

    setFields(prev => [...prev, newField])
    setSelectedFieldId(newField.id)
    setDraggingType(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const updateField = (id: string, updates: Partial<SignatureFieldPlacement>) => {
    setFields(prev =>
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    )
  }

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (selectedFieldId === id) {
      setSelectedFieldId(null)
    }
  }

  const selectedField = fields.find(f => f.id === selectedFieldId)
  const pageFields = fields.filter(f => f.page === currentPage)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      let uploadedPdfUrl: string | null = null

      // Upload PDF if one was selected
      if (pdfFile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('You must be logged in to upload files')
        }

        const result = await uploadSignaturePdf(pdfFile, user.id)
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to upload PDF')
        }
        uploadedPdfUrl = result.data.url
      }

      // Create the template
      await apiFetch('/api/signature-templates', {
        method: 'POST',
        body: {
          ...formData,
          pdf_template_url: uploadedPdfUrl,
          signature_fields: fields,
        },
      })

      router.push('/signatures/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/signatures" className="hover:text-foreground">E-Signatures</Link>
            <span>/</span>
            <Link href="/signatures/templates" className="hover:text-foreground flex items-center gap-1">
              Templates
            </Link>
            <span>/</span>
            <span>New</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <LayoutTemplate className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Template</h1>
              <p className="text-sm text-muted-foreground">Upload a PDF and add signature fields</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-6">
            {/* Left Panel - Template Details & Field Palette */}
            <div className="w-72 shrink-0 space-y-4">
              {/* Template Details */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">Template Details</h2>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-xs">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Roofing Contract"
                      required
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-xs">Category</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full mt-1 h-8 px-2 text-sm border border-border rounded-md bg-card"
                    >
                      <option value="contracts">Contracts</option>
                      <option value="estimates">Estimates</option>
                      <option value="waivers">Waivers</option>
                      <option value="change_orders">Change Orders</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="expiration_days" className="text-xs">Expiration (Days)</Label>
                    <Input
                      id="expiration_days"
                      type="number"
                      min={1}
                      max={365}
                      value={formData.expiration_days}
                      onChange={(e) => setFormData({ ...formData, expiration_days: parseInt(e.target.value) || 30 })}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.requires_customer_signature}
                        onChange={(e) => setFormData({ ...formData, requires_customer_signature: e.target.checked })}
                        className="h-3 w-3 rounded border-border text-primary"
                      />
                      Requires customer signature
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.requires_company_signature}
                        onChange={(e) => setFormData({ ...formData, requires_company_signature: e.target.checked })}
                        className="h-3 w-3 rounded border-border text-primary"
                      />
                      Requires company signature
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-3 w-3 rounded border-border text-primary"
                      />
                      Template is active
                    </label>
                  </div>
                </div>
              </div>

              {/* Field Palette */}
              <FieldPalette onDragStart={setDraggingType} />

              {/* Selected Field Properties */}
              {selectedField && (
                <div className="bg-card rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Field Properties</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="field-label" className="text-xs">Label</Label>
                      <Input
                        id="field-label"
                        value={selectedField.label}
                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="field-assigned" className="text-xs">Assigned To</Label>
                      <select
                        id="field-assigned"
                        value={selectedField.assignedTo}
                        onChange={(e) => updateField(selectedField.id, { assignedTo: e.target.value as SignatureFieldPlacement['assignedTo'] })}
                        className="w-full h-8 px-2 text-sm border border-border rounded-md bg-card mt-1"
                      >
                        <option value="customer">Customer</option>
                        <option value="company">Company</option>
                        <option value="any">Any</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                        className="h-3 w-3 rounded border-border text-primary"
                      />
                      Required field
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Center - Document Canvas */}
            <div className="flex-1 flex flex-col bg-muted/30 rounded-lg border border-border overflow-hidden min-h-[700px]">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 bg-card border-b border-border">
                <div className="flex items-center gap-2">
                  {numPages > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        Page {currentPage} of {numPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                        disabled={currentPage >= numPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-16 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(s => Math.min(2, s + 0.1))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {fields.length} field{fields.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                {!pdfUrl ? (
                  /* Upload Zone */
                  <Label htmlFor="pdf-upload" className="cursor-pointer w-full max-w-xl">
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors bg-card">
                      <FileUp className="h-16 w-16 text-muted-foreground mb-4" />
                      <span className="text-xl font-medium text-foreground mb-2">
                        Upload Your Contract PDF
                      </span>
                      <span className="text-sm text-muted-foreground text-center max-w-sm">
                        Click to select a PDF file, then drag signature fields onto it
                      </span>
                    </div>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                ) : (
                  /* PDF Canvas with Fields */
                  <div
                    ref={canvasRef}
                    className={`relative bg-card shadow-lg rounded
                               ${draggingType ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => setSelectedFieldId(null)}
                  >
                    {isLoadingPdf && (
                      <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-30">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}

                    <Document
                      file={pdfUrl}
                      onLoadSuccess={({ numPages: n }) => {
                        setNumPages(n)
                        setIsLoadingPdf(false)
                      }}
                      onLoadError={() => setIsLoadingPdf(false)}
                      loading={
                        <div className="flex items-center justify-center p-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <Page
                        pageNumber={currentPage}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>

                    {/* Placed Fields */}
                    {pageFields.map(field => (
                      <PlacedField
                        key={field.id}
                        field={field}
                        isSelected={field.id === selectedFieldId}
                        containerRef={canvasRef}
                        onSelect={() => setSelectedFieldId(field.id)}
                        onUpdate={(updates) => updateField(field.id, updates)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between p-2 bg-card border-t border-border text-xs text-muted-foreground">
                <span>
                  {pdfUrl ? `${fields.length} field${fields.length !== 1 ? 's' : ''} total` : 'No PDF uploaded'}
                </span>
                {pdfUrl && <span>{pageFields.length} on this page</span>}
                {draggingType && (
                  <span className="text-primary font-medium">Drop to place {draggingType} field</span>
                )}
              </div>
            </div>

            {/* Right Panel - Field List */}
            <div className="w-56 shrink-0 space-y-4">
              {/* All Fields */}
              <div className="bg-card rounded-lg border border-border p-4 max-h-[400px] overflow-y-auto">
                <h3 className="text-sm font-semibold text-foreground mb-3">All Fields</h3>
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Drag fields from the left panel onto your PDF
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, index) => {
                      const config = getFieldConfig(field.type)
                      const Icon = config?.icon
                      return (
                        <button
                          type="button"
                          key={field.id}
                          onClick={() => {
                            setCurrentPage(field.page)
                            setSelectedFieldId(field.id)
                          }}
                          className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm
                                     transition-colors
                                     ${field.id === selectedFieldId
                                       ? 'bg-primary/10 border border-primary'
                                       : 'hover:bg-muted/50 border border-transparent'
                                     }`}
                        >
                          {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-foreground">{field.label}</div>
                            <div className="text-xs text-muted-foreground">
                              Page {field.page} • {field.assignedTo}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">#{index + 1}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Template
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/signatures/templates')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>

              {/* Instructions */}
              {!pdfUrl && (
                <div className="bg-muted/30 rounded-lg border border-border p-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">How it works</h4>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Upload your contract PDF</li>
                    <li>Drag signature fields onto the document</li>
                    <li>Configure each field (who signs, required, etc.)</li>
                    <li>Save your template</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
