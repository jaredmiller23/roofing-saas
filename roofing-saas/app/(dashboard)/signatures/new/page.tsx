'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, ArrowLeft, Save } from 'lucide-react'

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  name: string
}

export default function NewSignatureDocumentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [documentType, setDocumentType] = useState('contract')
  const [projectId, setProjectId] = useState('')
  const [contactId, setContactId] = useState('')
  const [requiresCustomerSignature, setRequiresCustomerSignature] = useState(true)
  const [requiresCompanySignature, setRequiresCompanySignature] = useState(true)
  const [expirationDays, setExpirationDays] = useState(30)

  // Data lists
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load contacts
      const contactsRes = await fetch('/api/contacts?limit=100')
      const contactsData = await contactsRes.json()
      setContacts(contactsData.contacts || [])

      // Load projects
      const projectsRes = await fetch('/api/projects?limit=100')
      const projectsData = await projectsRes.json()
      setProjects(projectsData.projects || [])
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title) {
      setError('Title is required')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expirationDays)

      const res = await fetch('/api/signature-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          document_type: documentType,
          project_id: projectId || null,
          contact_id: contactId || null,
          requires_customer_signature: requiresCustomerSignature,
          requires_company_signature: requiresCompanySignature,
          expires_at: expiresAt.toISOString()
        })
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
        <Alert className="max-w-md bg-green-50 border-green-200">
          <AlertDescription className="text-green-900">
            Document created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/signatures')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Signatures
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Create Signature Document</h1>
          </div>
          <p className="text-muted-foreground">
            Create a new document that requires signatures
          </p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-sm border border p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Roofing Contract - Smith Residence"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this document is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            {/* Document Type */}
            <div>
              <Label htmlFor="document-type">Document Type *</Label>
              <select
                id="document-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="contract">Contract</option>
                <option value="estimate">Estimate</option>
                <option value="change_order">Change Order</option>
                <option value="waiver">Waiver</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Project */}
            <div>
              <Label htmlFor="project">Project (Optional)</Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact */}
            <div>
              <Label htmlFor="contact">Contact (Optional)</Label>
              <select
                id="contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Signature Requirements */}
            <div className="space-y-3">
              <Label>Signature Requirements</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customer-signature"
                  checked={requiresCustomerSignature}
                  onChange={(e) => setRequiresCustomerSignature(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="customer-signature" className="text-sm text-muted-foreground">
                  Requires customer signature
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="company-signature"
                  checked={requiresCompanySignature}
                  onChange={(e) => setRequiresCompanySignature(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="company-signature" className="text-sm text-muted-foreground">
                  Requires company signature
                </label>
              </div>
            </div>

            {/* Expiration */}
            <div>
              <Label htmlFor="expiration">Expires In (Days)</Label>
              <Input
                id="expiration"
                type="number"
                min="1"
                max="365"
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Document will expire on {new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/signatures')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Next steps after creating:</strong> You can upload a PDF document, add content from a template,
            or use our document builder. Once ready, send the document to recipients for signature.
          </p>
        </div>
      </div>
    </div>
  )
}
