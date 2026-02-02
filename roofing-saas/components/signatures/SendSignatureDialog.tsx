'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PenLine, Send, Loader2, LayoutTemplate, AlertCircle, Upload, FileCheck, UserCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { uploadSignaturePdf } from '@/lib/storage/signature-pdfs'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'

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
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSigningNow, setIsSigningNow] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('template')
  const [userId, setUserId] = useState<string | null>(null)

  // Template mode state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  // Upload mode state
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUserId()
  }, [])

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates()
      // Reset state when opening
      setError(null)
      setSelectedTemplateId('')
      setTitle('')
      setMessage('')
      setUploadTitle('')
      setUploadMessage('')
      setPdfFile(null)
      setPdfUrl('')
      setActiveTab('template')
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
      const { data: templatesList } = await apiFetchPaginated<Template[]>('/api/signature-templates?is_active=true')
      setTemplates(templatesList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle PDF file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!userId) {
      setError('User not authenticated')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadSignaturePdf(file, userId)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to upload PDF')
      }

      setPdfFile(file)
      setPdfUrl(result.data.url)

      // Auto-generate title if not set
      if (!uploadTitle) {
        setUploadTitle(`${file.name.replace('.pdf', '')} - ${projectName}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF')
    } finally {
      setIsUploading(false)
    }
  }, [userId, uploadTitle, projectName])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      handleFileSelect(file)
    } else {
      setError('Please upload a PDF file')
    }
  }, [handleFileSelect])

  // Helper to create document from template
  const createDocumentFromTemplate = async () => {
    if (!selectedTemplateId || !title) return null

    const template = templates.find(t => t.id === selectedTemplateId)
    if (!template) throw new Error('Template not found')

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + template.expiration_days)

    // Create signature document
    const doc = await apiFetch<{ id: string }>('/api/signature-documents', {
      method: 'POST',
      body: {
        title,
        description: message || null,
        document_type: template.category || 'contract',
        project_id: projectId,
        contact_id: contactId || null,
        template_id: selectedTemplateId,
        requires_customer_signature: template.requires_customer_signature,
        requires_company_signature: template.requires_company_signature,
        expires_at: expiresAt.toISOString(),
      },
    })

    if (!doc?.id) {
      throw new Error('Document ID not returned')
    }

    return doc.id
  }

  const handleTemplateMode = async () => {
    if (!selectedTemplateId || !title) return

    try {
      setIsSending(true)
      setError(null)

      const documentId = await createDocumentFromTemplate()
      if (!documentId) return

      // Send for signature if contact has email
      if (contactEmail) {
        try {
          await apiFetch(`/api/signature-documents/${documentId}/send`, {
            method: 'POST',
            body: {
              recipient_email: contactEmail,
              recipient_name: contactName || 'Customer',
              message: message || undefined,
            },
          })
        } catch (sendErr) {
          console.warn('Failed to send document:', sendErr)
          // Don't throw - document was created, just not sent
        }
      }

      setOpen(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send document')
    } finally {
      setIsSending(false)
    }
  }

  // Handle "Sign Now" - create document and open signing page for in-person signing
  const handleSignNow = async () => {
    if (!selectedTemplateId || !title) return

    try {
      setIsSigningNow(true)
      setError(null)

      const documentId = await createDocumentFromTemplate()
      if (!documentId) return

      // Close dialog and navigate to signing page
      setOpen(false)

      // Open the signing page - customer will sign in-person with company rep present
      window.open(`/sign/${documentId}`, '_blank')

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document')
    } finally {
      setIsSigningNow(false)
    }
  }

  const handleUploadMode = () => {
    if (!uploadTitle || !pdfUrl) {
      setError('Please provide a title and upload a PDF')
      return
    }

    // Navigate to field editor with the uploaded PDF
    const params = new URLSearchParams({
      title: uploadTitle,
      description: uploadMessage || '',
      project_id: projectId,
      contact_id: contactId || '',
      pdf_url: pdfUrl,
      document_type: 'contract',
      requires_customer_signature: 'true',
      requires_company_signature: 'true',
      expiration_days: '30'
    })

    setOpen(false)
    router.push(`/signatures/new?${params.toString()}`)
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
  const canSendTemplate = selectedTemplateId && title
  const canUpload = uploadTitle && pdfUrl

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
            Choose a template or upload a PDF to create a signature document.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template" className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Use Template
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading templates...</span>
                </div>
              )}
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">{isLoading ? 'Loading...' : 'No templates available'}</p>
                  {!isLoading && (
                    <p className="text-sm text-muted-foreground">
                      Create a signature template first in E-Signatures → Templates
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
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
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="upload-title">Document Title *</Label>
              <Input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g., Contract - 123 Main St"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="upload-message">Message (optional)</Label>
              <Textarea
                id="upload-message"
                value={uploadMessage}
                onChange={(e) => setUploadMessage(e.target.value)}
                placeholder="Add a personal message to the recipient..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label>PDF Document *</Label>
              {pdfUrl ? (
                <div className="mt-1 space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <FileCheck className="h-8 w-8 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">PDF Uploaded Successfully</p>
                      <p className="text-sm text-green-700">{pdfFile?.name}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPdfFile(null)
                        setPdfUrl('')
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`mt-1 border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isUploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-foreground font-medium">Uploading PDF...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-foreground font-medium mb-2">
                        Drag and drop your PDF here
                      </p>
                      <p className="text-muted-foreground text-sm mb-3">or</p>
                      <Label htmlFor="pdf-input" className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span>Browse Files</span>
                        </Button>
                        <Input
                          id="pdf-input"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(file)
                          }}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-3">
                        Maximum file size: 25 MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary">
                <strong>Next:</strong> After uploading, you&apos;ll be taken to the field editor to place signature fields,
                then you can send the document for signature.
              </p>
            </div>
          </TabsContent>
        </Tabs>

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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {activeTab === 'template' ? (
            <>
              {/* Sign Now button - for in-person signing */}
              <Button
                variant="outline"
                onClick={handleSignNow}
                disabled={!canSendTemplate || isSigningNow || isSending}
                className="border-primary text-primary hover:bg-primary/10"
              >
                {isSigningNow ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Sign Now (In-Person)
                  </>
                )}
              </Button>
              {/* Send via email button */}
              <Button
                onClick={handleTemplateMode}
                disabled={!canSendTemplate || isSending || isSigningNow}
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
                    {contactEmail ? 'Send via Email' : 'Create Draft'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleUploadMode}
              disabled={!canUpload || isUploading}
              className="bg-primary hover:bg-primary/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 mr-2" />
                  Continue to Editor
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
