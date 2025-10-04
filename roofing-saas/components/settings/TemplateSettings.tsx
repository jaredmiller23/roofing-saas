'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Plus, Pencil, Trash2, Mail, MessageSquare } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  description: string | null
  subject: string
  body: string
  category: string | null
  available_variables: string[] | null
}

interface SMSTemplate {
  id: string
  name: string
  description: string | null
  message: string
  category: string | null
  available_variables: string[] | null
}

type TemplateType = 'email' | 'sms'

export function TemplateSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeType, setActiveType] = useState<TemplateType>('email')
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [smsTemplates, setSMSTemplates] = useState<SMSTemplate[]>([])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | SMSTemplate | null>(null)

  const [emailFormData, setEmailFormData] = useState({
    name: '',
    description: '',
    subject: '',
    body: '',
    category: ''
  })

  const [smsFormData, setSMSFormData] = useState({
    name: '',
    description: '',
    message: '',
    category: ''
  })

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)

      if (activeType === 'email') {
        const res = await fetch('/api/settings/email-templates')
        const data = await res.json()
        setEmailTemplates(data.templates || [])
      } else {
        const res = await fetch('/api/settings/sms-templates')
        const data = await res.json()
        setSMSTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [activeType])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleSaveEmail = async () => {
    try {
      setSaving(true)
      setError(null)

      const url = editingTemplate
        ? `/api/settings/email-templates/${editingTemplate.id}`
        : '/api/settings/email-templates'

      const method = editingTemplate ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailFormData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save template')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      resetForms()
      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSMS = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate SMS length
      if (smsFormData.message.length > 1600) {
        throw new Error('SMS message must be 1600 characters or less')
      }

      const url = editingTemplate
        ? `/api/settings/sms-templates/${editingTemplate.id}`
        : '/api/settings/sms-templates'

      const method = editingTemplate ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsFormData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save template')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      resetForms()
      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleEditEmail = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setEmailFormData({
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      body: template.body,
      category: template.category || ''
    })
    setShowAddForm(true)
  }

  const handleEditSMS = (template: SMSTemplate) => {
    setEditingTemplate(template)
    setSMSFormData({
      name: template.name,
      description: template.description || '',
      message: template.message,
      category: template.category || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const endpoint = activeType === 'email' ? 'email-templates' : 'sms-templates'
      const res = await fetch(`/api/settings/${endpoint}/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete template')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const resetForms = () => {
    setEditingTemplate(null)
    setShowAddForm(false)
    setEmailFormData({ name: '', description: '', subject: '', body: '', category: '' })
    setSMSFormData({ name: '', description: '', message: '', category: '' })
  }

  const templates = activeType === 'email' ? emailTemplates : smsTemplates

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Template saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Template Type Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              onClick={() => { setActiveType('email'); setShowAddForm(false); setEditingTemplate(null) }}
              className={activeType === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Templates
            </Button>
            <Button
              onClick={() => { setActiveType('sms'); setShowAddForm(false); setEditingTemplate(null) }}
              className={activeType === 'sms' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS Templates
            </Button>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>

        {/* Template List */}
        {templates.length === 0 ? (
          <div className="text-gray-500 text-sm py-8 text-center">
            No {activeType} templates configured. Add your first template to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    )}
                    {template.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => activeType === 'email' ? handleEditEmail(template as EmailTemplate) : handleEditSMS(template as SMSTemplate)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {activeType === 'email' && 'subject' in template && (
                  <div className="mt-3 text-sm">
                    <div className="font-medium text-gray-700">Subject:</div>
                    <div className="text-gray-600">{template.subject}</div>
                  </div>
                )}
                {activeType === 'sms' && 'message' in template && (
                  <div className="mt-3 text-sm text-gray-600">
                    {template.message.substring(0, 100)}{template.message.length > 100 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form - Email */}
      {showAddForm && activeType === 'email' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTemplate ? 'Edit Email Template' : 'Add Email Template'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <Input
                  value={emailFormData.name}
                  onChange={(e) => setEmailFormData({ ...emailFormData, name: e.target.value })}
                  placeholder="e.g., Welcome Email, Follow-up"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Input
                  value={emailFormData.category}
                  onChange={(e) => setEmailFormData({ ...emailFormData, category: e.target.value })}
                  placeholder="e.g., sales, support, marketing"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                value={emailFormData.description}
                onChange={(e) => setEmailFormData({ ...emailFormData, description: e.target.value })}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject *
              </label>
              <Input
                value={emailFormData.subject}
                onChange={(e) => setEmailFormData({ ...emailFormData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{company_name}}"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Body *
              </label>
              <textarea
                value={emailFormData.body}
                onChange={(e) => setEmailFormData({ ...emailFormData, body: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Hi {{contact_name}},&#10;&#10;Welcome to {{company_name}}!&#10;&#10;Best regards,&#10;{{user_name}}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{'}{'{'} contact_name {'}'}{'}'}, {'{'}{'{'} company_name {'}'}{'}'}, {'{'}{'{'} user_name {'}'}{'}'}, {'{'}{'{'} project_name {'}'}{'}'}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={resetForms} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEmail}
                disabled={saving || !emailFormData.name || !emailFormData.subject || !emailFormData.body}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Add Template'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form - SMS */}
      {showAddForm && activeType === 'sms' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTemplate ? 'Edit SMS Template' : 'Add SMS Template'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <Input
                  value={smsFormData.name}
                  onChange={(e) => setSMSFormData({ ...smsFormData, name: e.target.value })}
                  placeholder="e.g., Appointment Reminder"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Input
                  value={smsFormData.category}
                  onChange={(e) => setSMSFormData({ ...smsFormData, category: e.target.value })}
                  placeholder="e.g., reminders, follow-up"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                value={smsFormData.description}
                onChange={(e) => setSMSFormData({ ...smsFormData, description: e.target.value })}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Message * ({smsFormData.message.length}/1600 characters)
              </label>
              <textarea
                value={smsFormData.message}
                onChange={(e) => setSMSFormData({ ...smsFormData, message: e.target.value })}
                rows={6}
                maxLength={1600}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Hi {{contact_name}}, this is a reminder about your appointment on {{date}}. - {{company_name}}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{'}{'{'} contact_name {'}'}{'}'}, {'{'}{'{'} company_name {'}'}{'}'}, {'{'}{'{'} date {'}'}{'}'}, {'{'}{'{'} time {'}'}{'}'}
              </p>
              {smsFormData.message.length > 160 && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Message will be sent as {Math.ceil(smsFormData.message.length / 160)} SMS parts
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={resetForms} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleSaveSMS}
                disabled={saving || !smsFormData.name || !smsFormData.message}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Add Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
