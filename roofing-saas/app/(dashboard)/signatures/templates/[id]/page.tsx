'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LayoutTemplate,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Loader2
} from 'lucide-react'

interface SignatureField {
  id: string
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox' | 'name' | 'email'
  label: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  assignedTo: 'customer' | 'company' | 'any'
  tabOrder: number
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  requires_customer_signature: boolean
  requires_company_signature: boolean
  expiration_days: number
  signature_fields: SignatureField[]
  created_at: string
  updated_at: string
}

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'contracts',
    requires_customer_signature: true,
    requires_company_signature: true,
    expiration_days: 30,
    is_active: true,
  })

  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([])

  const loadTemplate = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/signature-templates/${templateId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load template')
      }

      const template: Template = data.template
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category || 'contracts',
        requires_customer_signature: template.requires_customer_signature,
        requires_company_signature: template.requires_company_signature,
        expiration_days: template.expiration_days,
        is_active: template.is_active,
      })
      setSignatureFields(template.signature_fields || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setIsLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  const addField = (type: SignatureField['type']) => {
    const newField: SignatureField = {
      id: `field-${Date.now()}`,
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      page: 1,
      x: 10,
      y: 80,
      width: 30,
      height: type === 'checkbox' ? 3 : 5,
      required: true,
      assignedTo: 'customer',
      tabOrder: signatureFields.length,
    }
    setSignatureFields([...signatureFields, newField])
  }

  const updateField = (id: string, updates: Partial<SignatureField>) => {
    setSignatureFields(fields =>
      fields.map(f => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  const removeField = (id: string) => {
    setSignatureFields(fields => fields.filter(f => f.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/signature-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          signature_fields: signatureFields,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update template')
      }

      router.push('/signatures/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldTypes: { type: SignatureField['type']; label: string }[] = [
    { type: 'signature', label: 'Signature' },
    { type: 'initials', label: 'Initials' },
    { type: 'date', label: 'Date' },
    { type: 'name', label: 'Full Name' },
    { type: 'email', label: 'Email' },
    { type: 'text', label: 'Text Field' },
    { type: 'checkbox', label: 'Checkbox' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading template...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/signatures" className="hover:text-foreground">E-Signatures</Link>
            <span>/</span>
            <Link href="/signatures/templates" className="hover:text-foreground flex items-center gap-1">
              Templates
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <LayoutTemplate className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Edit Template</h1>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Template Details</h2>
            <div className="grid gap-6">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Roofing Contract"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this template..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary bg-card"
                  >
                    <option value="contracts">Contracts</option>
                    <option value="estimates">Estimates</option>
                    <option value="waivers">Waivers</option>
                    <option value="change_orders">Change Orders</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="expiration_days">Expiration (Days)</Label>
                  <Input
                    id="expiration_days"
                    type="number"
                    min={1}
                    max={365}
                    value={formData.expiration_days}
                    onChange={(e) => setFormData({ ...formData, expiration_days: parseInt(e.target.value) || 30 })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signature Requirements */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Signature Requirements</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.requires_customer_signature}
                  onChange={(e) => setFormData({ ...formData, requires_customer_signature: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Requires customer signature</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.requires_company_signature}
                  onChange={(e) => setFormData({ ...formData, requires_company_signature: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Requires company signature</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Template is active</span>
              </label>
            </div>
          </div>

          {/* Signature Fields */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Signature Fields</h2>
              <div className="text-sm text-muted-foreground">
                {signatureFields.length} field{signatureFields.length !== 1 ? 's' : ''}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Add fields that will appear on the document. Position can be adjusted in the visual editor later.
            </p>

            {/* Add Field Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {fieldTypes.map(({ type, label }) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addField(type)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Fields List */}
            {signatureFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                Add signature fields using the buttons above
              </div>
            ) : (
              <div className="space-y-3">
                {signatureFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                    <div className="flex-1 grid md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <div className="font-medium text-foreground capitalize">{field.type}</div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Assigned To</Label>
                        <select
                          value={field.assignedTo}
                          onChange={(e) => updateField(field.id, { assignedTo: e.target.value as SignatureField['assignedTo'] })}
                          className="w-full h-8 px-2 text-sm border border-border rounded-md bg-card"
                        >
                          <option value="customer">Customer</option>
                          <option value="company">Company</option>
                          <option value="any">Any</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="h-3 w-3 rounded border-border text-primary"
                          />
                          Required
                        </label>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(field.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/signatures/templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
