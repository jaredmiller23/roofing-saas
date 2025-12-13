'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Eye
} from 'lucide-react'

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  name: string
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
  // Step 2 - PDF Upload
  pdfFile: File | null
  pdfUrl: string
  // Step 3 - Fields
  signatureFields: SignatureFieldPlacement[]
}

const STEPS = [
  { number: 1, title: 'Document Info', icon: FileText },
  { number: 2, title: 'Upload PDF', icon: Upload },
  { number: 3, title: 'Place Fields', icon: PenTool },
  { number: 4, title: 'Review & Create', icon: Eye },
]

export default function NewSignatureDocumentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
  }, [])

  const getUserId = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const loadData = async () => {
    try {
      const [contactsRes, projectsRes] = await Promise.all([
        fetch('/api/contacts?limit=100'),
        fetch('/api/projects?limit=100'),
      ])

      const contactsResult = await contactsRes.json()
      const projectsResult = await projectsRes.json()

      const contactsData = contactsResult.data || contactsResult
      const projectsData = projectsResult.data || projectsResult

      setContacts(contactsData.contacts || [])
      setProjects(projectsData.projects || [])
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const updateFormData = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Step validation
  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!formData.title.trim()
      case 2:
        return true // PDF is optional
      case 3:
        // Require at least one signature or initials field
        const hasSignatureField = formData.signatureFields.some(
          f => f.type === 'signature' || f.type === 'initials'
        )
        return hasSignatureField
      case 4:
        return validateStep(1) && validateStep(3)
      default:
        return true
    }
  }

  const canProceed = validateStep(step)

  const handleNext = () => {
    if (step < 4 && canProceed) {
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
  const handleFileSelect = async (file: File) => {
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
  }

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      handleFileSelect(file)
    } else {
      setError('Please upload a PDF file')
    }
  }, [userId])

  // Handle DocumentEditor save
  const handleEditorSave = (fields: SignatureFieldPlacement[], pdfUrl?: string) => {
    updateFormData('signatureFields', fields)
    if (pdfUrl && pdfUrl !== formData.pdfUrl) {
      updateFormData('pdfUrl', pdfUrl)
    }
    setStep(4)
  }

  // Submit the document
  const handleSubmit = async () => {
    if (!validateStep(4)) {
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
        throw new Error(data.error || 'Failed to create document')
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
              <p className="text-muted-foreground text-sm">Step {step} of 4</p>
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
          <Progress value={(step / 4) * 100} className="h-1" />
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
        {/* Step 1: Basic Info */}
        {step === 1 && (
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
                  <select
                    id="project"
                    value={formData.projectId}
                    onChange={(e) => updateFormData('projectId', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="contact">Contact (Optional)</Label>
                  <select
                    id="contact"
                    value={formData.contactId}
                    onChange={(e) => updateFormData('contactId', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">No contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
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

        {/* Step 2: Upload PDF */}
        {step === 2 && (
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

        {/* Step 3: Place Fields */}
        {step === 3 && (
          <div>
            {!validateStep(3) && (
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

        {/* Step 4: Review & Create */}
        {step === 4 && (
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
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
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

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className="bg-primary hover:bg-primary/90"
              >
                {step === 3 ? 'Review' : 'Next'}
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
    </div>
  )
}
