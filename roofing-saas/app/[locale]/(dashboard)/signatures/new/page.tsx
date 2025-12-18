'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { DocumentEditor } from '@/components/signatures/DocumentEditor'
import { uploadSignaturePdf } from '@/lib/storage/signature-pdfs'
import { createClient } from '@/lib/supabase/client'
import type { SignatureFieldPlacement } from '@/components/signatures/PlacedField'
import type { FieldType } from '@/components/signatures/FieldPalette'
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Save,
  Upload,
  Check,
  FileCheck,
  Loader2,
  PenTool,
  Eye,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
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

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  name: string
}

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

interface FormData {
  // Step 1 - Basic Info
  title: string
  description: string
  documentType: string
  projectId: string
  contactId: string
  expirationDays: number
  requiresCustomerSignature: boolean
  requiresCompanySignature: boolean
  selectedTemplateId: string
  // Step 2 - PDF Upload
  pdfFile: File | null
  pdfUrl: string
  // Step 3 - Fields
  signatureFields: SignatureFieldPlacement[]
}

const STEPS = [
  { number: 1, title: 'Template Selection', icon: LayoutTemplate },
  { number: 2, title: 'Document Info', icon: FileText },
  { number: 3, title: 'Upload PDF', icon: Upload },
  { number: 4, title: 'Place Fields', icon: PenTool },
  { number: 5, title: 'Review & Create', icon: Eye },
]

export default function NewSignatureDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Template-related state
  const [templates, setTemplates] = useState<SignatureTemplate[]>([])
  const [previewTemplate, setPreviewTemplate] = useState<SignatureTemplate | null>(null)
  const [previewNumPages, setPreviewNumPages] = useState(0)
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1)
  const [previewScale, setPreviewScale] = useState(0.8)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    documentType: 'contract',
    projectId: '',
    contactId: '',
    expirationDays: 30,
    requiresCustomerSignature: true,
    requiresCompanySignature: true,
    selectedTemplateId: '',
    pdfFile: null,
    pdfUrl: '',
    signatureFields: [],
  })

  // Data lists
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    getUserId()
    loadTemplates()
  }, [])

  // Handle templateId URL parameter - fetch and apply template data
  useEffect(() => {
    const templateId = searchParams.get('templateId')
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        // Apply template data to form
        setFormData(prev => ({
          ...prev,
          selectedTemplateId: template.id,
          title: template.name,
          description: template.description || '',
          expirationDays: template.expiration_days,
          requiresCustomerSignature: template.requires_customer_signature,
          requiresCompanySignature: template.requires_company_signature,
          documentType: template.category || 'contract',
          pdfUrl: template.pdf_template_url || '',
          signatureFields: template.signature_fields?.map(f => ({
            id: f.id,
            type: f.type as FieldType,
            label: f.label || f.type,
            page: f.page,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            required: f.required || false,
            assignedTo: f.assignedTo as 'customer' | 'company' | 'any',
          })) || [],
        }))
        // Skip template selection step
        setStep(2)
      }
    }
  }, [searchParams, templates])

  const getUserId = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const loadData = async () => {
    try {
      const [contactsRes, projectsRes] = await Promise.all([
        fetch('/api/contacts?limit=1000'),
        fetch('/api/projects?limit=1000'),
      ])

      // Log response status for debugging
      console.log('[Signatures] Contacts API status:', contactsRes.status)
      console.log('[Signatures] Projects API status:', projectsRes.status)

      const contactsResult = await contactsRes.json()
      const projectsResult = await projectsRes.json()

      // Log full responses for debugging
      console.log('[Signatures] Contacts response:', contactsResult)
      console.log('[Signatures] Projects response:', projectsResult)

      // Check for API errors and surface them
      if (!contactsRes.ok || !contactsResult.success) {
        console.error('[Signatures] Contacts API error:', contactsResult.error)
        setError(`Failed to load contacts: ${contactsResult.error?.message || 'Unknown error'}`)
      }
      if (!projectsRes.ok || !projectsResult.success) {
        console.error('[Signatures] Projects API error:', projectsResult.error)
        setError(`Failed to load projects: ${projectsResult.error?.message || 'Unknown error'}`)
      }

      const contactsData = contactsResult.data || contactsResult
      const projectsData = projectsResult.data || projectsResult

      console.log('[Signatures] Setting contacts:', contactsData.contacts?.length || 0)
      console.log('[Signatures] Setting projects:', projectsData.projects?.length || 0)

      setContacts(contactsData.contacts || [])
      setProjects(projectsData.projects || [])
    } catch (err) {
      console.error('[Signatures] Error loading data:', err)
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/signature-templates?active_only=true')
      console.log('[Signatures] Templates API status:', res.status)

      const result = await res.json()
      console.log('[Signatures] Templates response:', result)

      if (res.ok && result.success) {
        const data = result.data || result
        console.log('[Signatures] Setting templates:', data.templates?.length || 0)
        setTemplates(data.templates || [])
      } else {
        console.error('[Signatures] Templates API error:', result.error)
        setError(`Failed to load templates: ${result.error?.message || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('[Signatures] Error loading templates:', err)
      setError(`Failed to load templates: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const updateFormData = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [])

  // Step validation
  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return true // Template selection is optional
      case 2:
        return !!formData.title.trim()
      case 3:
        return true // PDF is optional
      case 4:
        // Require at least one signature or initials field
        const hasSignatureField = formData.signatureFields.some(
          f => f.type === 'signature' || f.type === 'initials'
        )
        return hasSignatureField
      case 5:
        return validateStep(2) && validateStep(4)
      default:
        return true
    }
  }

  const canProceed = validateStep(step)

  const handleNext = () => {
    if (step < 5 && canProceed) {
      setStep(step + 1)
      setError(null)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setError(null)
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

      updateFormData('pdfFile', file)
      updateFormData('pdfUrl', result.data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF')
    } finally {
      setIsUploading(false)
    }
  }, [userId, updateFormData])

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

  // Template-related functions
  const handleTemplateSelect = (template: SignatureTemplate) => {
    updateFormData('selectedTemplateId', template.id)
    updateFormData('title', template.name)
    updateFormData('description', template.description || '')
    updateFormData('expirationDays', template.expiration_days)
    updateFormData('requiresCustomerSignature', template.requires_customer_signature)
    updateFormData('requiresCompanySignature', template.requires_company_signature)
    updateFormData('documentType', template.category || 'contract')

    if (template.pdf_template_url) {
      updateFormData('pdfUrl', template.pdf_template_url)
    }

    if (template.signature_fields?.length) {
      updateFormData('signatureFields', template.signature_fields.map(f => ({
        id: f.id,
        type: f.type as FieldType,
        label: f.label || f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required || false,
        assignedTo: f.assignedTo as 'customer' | 'company' | 'any',
      })))
    }

    setStep(2)
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

  // Get fields for current preview page
  const getPreviewPageFields = () => {
    if (!previewTemplate) return []
    return previewTemplate.signature_fields.filter(f => f.page === previewCurrentPage)
  }

  // Handle DocumentEditor save
  const handleEditorSave = (fields: SignatureFieldPlacement[], pdfUrl?: string) => {
    updateFormData('signatureFields', fields)
    if (pdfUrl && pdfUrl !== formData.pdfUrl) {
      updateFormData('pdfUrl', pdfUrl)
    }
    setStep(5)
  }

  // Submit the document
  const handleSubmit = async () => {
    if (!validateStep(5)) {
      setError('Please complete all required fields')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + formData.expirationDays)

      const res = await fetch('/api/signature-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          document_type: formData.documentType,
          project_id: formData.projectId || null,
          contact_id: formData.contactId || null,
          file_url: formData.pdfUrl || null,
          signature_fields: formData.signatureFields,
          requires_customer_signature: formData.requiresCustomerSignature,
          requires_company_signature: formData.requiresCompanySignature,
          expires_at: expiresAt.toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create document')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/signatures')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Document Created!</h2>
          <p className="text-muted-foreground">Redirecting to signatures...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/signatures')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Signatures
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Signature Document</h1>
              <p className="text-muted-foreground text-sm">Step {step} of 5</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${step === s.number
                      ? 'bg-primary text-white'
                      : step > s.number
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {step > s.number ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <s.icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-2 ${
                      step > s.number ? 'bg-green-400' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={(step / 5) * 100} className="h-1" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">Choose a Template</h2>
              <p className="text-muted-foreground">
                Select a pre-built template to get started quickly, or skip to create from scratch.
              </p>
            </div>

            {templates.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No templates available</h3>
                <p className="text-muted-foreground mb-6">
                  You can create a document from scratch or create templates first.
                </p>
                <Button
                  onClick={() => setStep(2)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create from Scratch
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Start from scratch option */}
                <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold text-foreground">Start from Scratch</h3>
                        <p className="text-sm text-muted-foreground">Create a new document without a template</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setStep(2)}
                      variant="outline"
                    >
                      Start Fresh
                    </Button>
                  </div>
                </div>

                {/* Template options */}
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow
                                 ${formData.selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <LayoutTemplate className="h-8 w-8 text-primary mt-1" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{template.name}</h3>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>{template.signature_fields?.length || 0} fields</span>
                              <span>Expires in {template.expiration_days} days</span>
                              {template.pdf_template_url && <span>Has PDF</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {template.pdf_template_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(template)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleTemplateSelect(template)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            Use Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
              <div>
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Roofing Contract - Smith Residence"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this document..."
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="document-type">Document Type *</Label>
                <select
                  id="document-type"
                  value={formData.documentType}
                  onChange={(e) => updateFormData('documentType', e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="contract">Contract</option>
                  <option value="estimate">Estimate</option>
                  <option value="change_order">Change Order</option>
                  <option value="waiver">Waiver</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <div className="mt-2">
                    <SearchableSelect
                      options={projects.map((project) => ({
                        value: project.id,
                        label: project.name,
                      }))}
                      value={formData.projectId}
                      onValueChange={(value) => updateFormData('projectId', value)}
                      placeholder="No project"
                      searchPlaceholder="Search projects..."
                      emptyMessage="No projects found."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact">Contact (Optional)</Label>
                  <div className="mt-2">
                    <SearchableSelect
                      options={contacts.map((contact) => ({
                        value: contact.id,
                        label: `${contact.first_name} ${contact.last_name}`,
                      }))}
                      value={formData.contactId}
                      onValueChange={(value) => updateFormData('contactId', value)}
                      placeholder="No contact"
                      searchPlaceholder="Search contacts..."
                      emptyMessage="No contacts found."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Signature Requirements</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customer-signature"
                    checked={formData.requiresCustomerSignature}
                    onChange={(e) => updateFormData('requiresCustomerSignature', e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="customer-signature" className="text-sm text-muted-foreground">
                    Requires customer signature
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="company-signature"
                    checked={formData.requiresCompanySignature}
                    onChange={(e) => updateFormData('requiresCompanySignature', e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="company-signature" className="text-sm text-muted-foreground">
                    Requires company signature
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="expiration">Expires In (Days)</Label>
                <Input
                  id="expiration"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.expirationDays}
                  onChange={(e) => updateFormData('expirationDays', parseInt(e.target.value) || 30)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Document will expire on{' '}
                  {new Date(Date.now() + formData.expirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Upload PDF */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Upload Document (Optional)</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Upload a PDF document to add signature fields to. You can also proceed without a PDF
                and use a blank canvas.
              </p>

              {formData.pdfUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <FileCheck className="h-8 w-8 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">PDF Uploaded Successfully</p>
                      <p className="text-sm text-green-700">{formData.pdfFile?.name}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateFormData('pdfFile', null)
                        updateFormData('pdfUrl', '')
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors
                    ${isUploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <p className="text-foreground font-medium">Uploading PDF...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-foreground font-medium mb-2">
                        Drag and drop your PDF here
                      </p>
                      <p className="text-muted-foreground text-sm mb-4">or</p>
                      <Label htmlFor="pdf-input" className="cursor-pointer">
                        <Button variant="outline" asChild>
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
                      <p className="text-xs text-muted-foreground mt-4">
                        Maximum file size: 25 MB
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> If you don&apos;t have a PDF, you can skip this step and place
                  signature fields on a blank canvas. You can also replace the PDF later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Place Fields */}
        {step === 4 && (
          <div>
            {!validateStep(4) && (
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-900">
                  Please add at least one signature or initials field before proceeding.
                </AlertDescription>
              </Alert>
            )}
            <DocumentEditor
              pdfUrl={formData.pdfUrl || undefined}
              initialFields={formData.signatureFields}
              onSave={handleEditorSave}
              isSaving={false}
            />
          </div>
        )}

        {/* Step 5: Review & Create */}
        {step === 5 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Review Your Document</h2>

              {/* Document Info Summary */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <p className="font-medium text-foreground">{formData.title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium text-foreground capitalize">
                      {formData.documentType.replace('_', ' ')}
                    </p>
                  </div>
                  {formData.description && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Description:</span>
                      <p className="font-medium text-foreground">{formData.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Status */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {formData.pdfUrl ? (
                    <>
                      <FileCheck className="h-5 w-5 text-green-600" />
                      <span className="text-foreground">PDF document uploaded</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">No PDF (using blank canvas)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Fields Summary */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Signature Fields</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {['signature', 'initials', 'date', 'text', 'checkbox', 'name', 'email'].map(
                    (type) => {
                      const count = formData.signatureFields.filter((f) => f.type === type).length
                      if (count === 0) return null
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center text-xs font-medium text-primary">
                            {count}
                          </span>
                          <span className="text-muted-foreground capitalize">{type}</span>
                        </div>
                      )
                    }
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Total: {formData.signatureFields.length} field
                  {formData.signatureFields.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Signature Requirements */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {formData.requiresCustomerSignature ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  <span className={formData.requiresCustomerSignature ? 'text-foreground' : 'text-muted-foreground'}>
                    Customer signature {formData.requiresCustomerSignature ? 'required' : 'not required'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {formData.requiresCompanySignature ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  <span className={formData.requiresCompanySignature ? 'text-foreground' : 'text-muted-foreground'}>
                    Company signature {formData.requiresCompanySignature ? 'required' : 'not required'}
                  </span>
                </div>
              </div>

              {/* Expiration */}
              <div className="text-sm">
                <span className="text-muted-foreground">Expires:</span>
                <p className="font-medium text-foreground">
                  {new Date(
                    Date.now() + formData.expirationDays * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()}{' '}
                  ({formData.expirationDays} days)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-card border-t border-border z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/signatures')}
            >
              Cancel
            </Button>

            {step < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className="bg-primary hover:bg-primary/90"
              >
                {step === 4 ? 'Review' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !canProceed}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Document
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom padding for fixed footer */}
      <div className="h-20" />

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
                onClick={() => previewTemplate && handleTemplateSelect(previewTemplate)}
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
