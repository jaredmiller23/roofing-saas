'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { DocumentEditor } from '@/components/signatures'
import type { SignatureFieldPlacement } from '@/components/signatures'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LayoutTemplate, Loader2, FileText, Code2, Eye, Save } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  pdf_template_url: string | null
  html_content: string | null
  signature_fields: SignatureFieldPlacement[]
}

export default function TemplateEditorPage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'fields' | 'html'>('fields')
  const [htmlContent, setHtmlContent] = useState('')
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  const loadTemplate = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/signature-templates/${templateId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load template')
      }

      setTemplate(data.template)
      setHtmlContent(data.template.html_content || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setIsLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  const handleSave = async (fields: SignatureFieldPlacement[], pdfUrl?: string) => {
    try {
      setIsSaving(true)
      setError(null)

      const res = await fetch(`/api/signature-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_fields: fields,
          pdf_template_url: pdfUrl || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template')
      }

      // Redirect back to template details
      router.push(`/signatures/templates/${templateId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveHtml = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const res = await fetch(`/api/signature-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html_content: htmlContent,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save HTML content')
      }

      // Update local state
      setTemplate({ ...template!, html_content: htmlContent })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save HTML content')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreviewPdf = async () => {
    try {
      setIsGeneratingPreview(true)
      setError(null)

      const res = await fetch('/api/signature-documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          // Use sample data for preview
          additional_data: {
            customer_name: 'John Smith (Preview)',
            project_name: 'Sample Project (Preview)',
            current_date: new Date().toLocaleDateString(),
          }
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate PDF preview')
      }

      setPreviewPdf(data.pdf_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF preview')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading template...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">
              Template not found
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/signatures" className="hover:text-foreground">E-Signatures</Link>
            <span>/</span>
            <Link href="/signatures/templates" className="hover:text-foreground">Templates</Link>
            <span>/</span>
            <Link href={`/signatures/templates/${templateId}`} className="hover:text-foreground">
              {template.name}
            </Link>
            <span>/</span>
            <span>Visual Editor</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <LayoutTemplate className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Template Editor</h1>
                <p className="text-sm text-muted-foreground">{template.name}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex rounded-lg bg-muted p-1">
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'fields'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-4 w-4 mr-2 inline" />
                Field Editor
              </button>
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'html'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="h-4 w-4 mr-2 inline" />
                HTML Editor
              </button>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Tab Content */}
        {activeTab === 'fields' && (
          <DocumentEditor
            initialFields={template.signature_fields || []}
            pdfUrl={template.pdf_template_url || undefined}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'html' && (
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">HTML Template Content</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edit the HTML template with placeholders like {'{{customer_name}}'} and {'{{project_name}}'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handlePreviewPdf}
                    disabled={isGeneratingPreview || !htmlContent.trim()}
                    variant="outline"
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview PDF
                  </Button>
                  <Button
                    onClick={handleSaveHtml}
                    disabled={isSaving || !htmlContent.trim()}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save HTML
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Enter your HTML template content here..."
                className="min-h-[500px] font-mono text-sm"
              />

              <div className="mt-4 text-sm text-muted-foreground">
                <strong>Available placeholders:</strong>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {[
                    '{{customer_name}}',
                    '{{customer_email}}',
                    '{{customer_phone}}',
                    '{{project_name}}',
                    '{{project_description}}',
                    '{{property_address}}',
                    '{{company_name}}',
                    '{{company_phone}}',
                    '{{current_date}}',
                    '{{contract_amount}}',
                    '{{license_number}}',
                    '{{company_website}}'
                  ].map(placeholder => (
                    <code key={placeholder} className="px-2 py-1 bg-muted rounded text-xs">
                      {placeholder}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            {previewPdf && (
              <div className="p-6 border-t border-border">
                <h3 className="text-md font-semibold text-foreground mb-3">PDF Preview</h3>
                <iframe
                  src={previewPdf}
                  className="w-full h-96 border border-border rounded"
                  title="PDF Preview"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
