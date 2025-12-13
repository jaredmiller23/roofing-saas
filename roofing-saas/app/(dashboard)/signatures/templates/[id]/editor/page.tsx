'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { DocumentEditor } from '@/components/signatures'
import type { SignatureFieldPlacement } from '@/components/signatures'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LayoutTemplate, Loader2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  pdf_template_url: string | null
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

          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <LayoutTemplate className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Visual Field Editor</h1>
              <p className="text-sm text-muted-foreground">{template.name}</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Document Editor */}
        <DocumentEditor
          initialFields={template.signature_fields || []}
          pdfUrl={template.pdf_template_url || undefined}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    </div>
  )
}
