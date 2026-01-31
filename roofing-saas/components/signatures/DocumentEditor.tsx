'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { FieldPalette, type FieldType, getFieldConfig } from './FieldPalette'
import { PlacedField, type SignatureFieldPlacement } from './PlacedField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileUp,
  Save,
  Loader2
} from 'lucide-react'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface DocumentEditorProps {
  initialFields?: SignatureFieldPlacement[]
  pdfUrl?: string
  onSave: (fields: SignatureFieldPlacement[], pdfUrl?: string) => void
  isSaving?: boolean
}

export function DocumentEditor({
  initialFields = [],
  pdfUrl: initialPdfUrl,
  onSave,
  isSaving = false,
}: DocumentEditorProps) {
  const [fields, setFields] = useState<SignatureFieldPlacement[]>(initialFields)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(initialPdfUrl)
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | undefined>(initialPdfUrl)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [draggingType, setDraggingType] = useState<FieldType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Update fields when initialFields change
  useEffect(() => {
    setFields(initialFields)
  }, [initialFields])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error)
    setIsLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Use blob URL for local preview
    const previewUrl = URL.createObjectURL(file)
    setPdfUrl(previewUrl)
    setIsLoading(true)
    setCurrentPage(1)
    setUploadError(null)

    // Upload to Supabase Storage for permanent URL
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/signature-pdfs/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to upload PDF')
      }

      setUploadedPdfUrl(result.data.url)
    } catch (err) {
      console.error('PDF upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to upload PDF')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
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
  }, [currentPage])

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

  const handleSave = () => {
    onSave(fields, uploadedPdfUrl || pdfUrl)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Panel - Field Palette */}
      <div className="w-64 shrink-0 space-y-4 overflow-y-auto">
        <FieldPalette onDragStart={setDraggingType} />

        {/* Upload PDF */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Document</h3>
          <div className="space-y-3">
            <Label htmlFor="pdf-upload" className="block">
              <div className="flex items-center justify-center p-4 border-2 border-dashed border-border
                             rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                <div className="text-center">
                  <FileUp className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {pdfUrl ? 'Replace PDF' : 'Upload PDF'}
                  </span>
                </div>
              </div>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Label>
            {uploadError && (
              <p className="text-xs text-red-500 text-center">
                {uploadError}
              </p>
            )}
            {!pdfUrl && (
              <p className="text-xs text-muted-foreground text-center">
                Or use blank canvas below
              </p>
            )}
          </div>
        </div>

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
      <div ref={containerRef} className="flex-1 flex flex-col bg-muted/30 rounded-lg border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            {numPages > 1 && (
              <>
                <Button
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
              variant="outline"
              size="sm"
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Fields
              </>
            )}
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
          <div
            ref={canvasRef}
            className={`relative bg-card shadow-lg rounded
                       ${draggingType ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            style={{
              width: pdfUrl ? 'auto' : 612 * scale,
              height: pdfUrl ? 'auto' : 792 * scale,
              minWidth: pdfUrl ? undefined : 612 * scale,
              minHeight: pdfUrl ? undefined : 792 * scale,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => setSelectedFieldId(null)}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
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
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center p-8">
                  <p className="text-lg font-medium mb-2">Drop fields here</p>
                  <p className="text-sm">Upload a PDF or use this blank canvas</p>
                </div>
              </div>
            )}

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
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between p-2 bg-card border-t border-border text-xs text-muted-foreground">
          <span>{fields.length} field{fields.length !== 1 ? 's' : ''} total</span>
          <span>{pageFields.length} on this page</span>
          {draggingType && (
            <span className="text-primary font-medium">Drop to place {draggingType} field</span>
          )}
        </div>
      </div>

      {/* Right Panel - Field List */}
      <div className="w-56 shrink-0 bg-card rounded-lg border border-border p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Fields</h3>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fields added yet
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => {
              const config = getFieldConfig(field.type)
              const Icon = config?.icon
              return (
                <button
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
    </div>
  )
}
