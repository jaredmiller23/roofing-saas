'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PenLine, Send, Loader2, LayoutTemplate, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  requires_customer_signature: boolean
  requires_company_signature: boolean
  expiration_days: number
}

interface SendSignatureDialogProps {
  projectId: string
  projectName: string
  contactId?: string
  contactName?: string
  contactEmail?: string
  onSuccess?: () => void
}

export function SendSignatureDialog({
  projectId,
  projectName,
  contactId,
  contactName,
  contactEmail,
  onSuccess
}: SendSignatureDialogProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  // Auto-fill title when template changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setTitle(`${template.name} - ${projectName}`)
      }
    }
  }, [selectedTemplateId, templates, projectName])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/signature-templates?is_active=true')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load templates')
      }

      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!selectedTemplateId || !title) return

    try {
      setIsSending(true)
      setError(null)

      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) throw new Error('Template not found')

      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + template.expiration_days)

      // Create signature document
      const createRes = await fetch('/api/signature-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: message || null,
          document_type: template.category || 'contract',
          project_id: projectId,
          contact_id: contactId || null,
          template_id: selectedTemplateId,
          requires_customer_signature: template.requires_customer_signature,
          requires_company_signature: template.requires_company_signature,
          expires_at: expiresAt.toISOString(),
        }),
      })

      const createData = await createRes.json()

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create document')
      }

      const documentId = createData.document?.id

      if (!documentId) {
        throw new Error('Document ID not returned')
      }

      // Send for signature if contact has email
      if (contactEmail) {
        const sendRes = await fetch(`/api/signature-documents/${documentId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_email: contactEmail,
            recipient_name: contactName || 'Customer',
            message: message || undefined,
          }),
        })

        if (!sendRes.ok) {
          const sendData = await sendRes.json()
          console.warn('Failed to send document:', sendData.error)
          // Don't throw - document was created, just not sent
        }
      }

      setOpen(false)
      setSelectedTemplateId('')
      setTitle('')
      setMessage('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send document')
    } finally {
      setIsSending(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PenLine className="h-4 w-4" />
          Send for Signature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Send for Signature
          </DialogTitle>
          <DialogDescription>
            Create a document from a template and send it for signature.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No templates available</p>
            <p className="text-sm text-muted-foreground">
              Create a signature template first in E-Signatures → Templates
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Select Template *</Label>
              <select
                id="template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary bg-card"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.category && ` (${template.category.replace('_', ' ')})`}
                  </option>
                ))}
              </select>
              {selectedTemplate?.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            {/* Document Title */}
            <div>
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Roofing Contract - 123 Main St"
                className="mt-1"
              />
            </div>

            {/* Recipient Info */}
            {contactId && (
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Sending to:</p>
                <p className="font-medium text-foreground">{contactName || 'Customer'}</p>
                {contactEmail ? (
                  <p className="text-sm text-muted-foreground">{contactEmail}</p>
                ) : (
                  <p className="text-sm text-orange-500">
                    No email address - document will be created as draft
                  </p>
                )}
              </div>
            )}

            {/* Optional Message */}
            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to the recipient..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Signature Info */}
            {selectedTemplate && (
              <div className="text-sm text-muted-foreground border-t border-border pt-3">
                <p className="font-medium text-foreground mb-1">Signatures required:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {selectedTemplate.requires_customer_signature && (
                    <li>Customer signature</li>
                  )}
                  {selectedTemplate.requires_company_signature && (
                    <li>Company signature</li>
                  )}
                </ul>
                <p className="mt-2">
                  Expires in {selectedTemplate.expiration_days} days
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedTemplateId || !title || isSending}
            className="bg-primary hover:bg-primary/90"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {contactEmail ? 'Send Document' : 'Create Draft'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
