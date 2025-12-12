'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface BrandingSettingsData {
  company_name: string | null
  company_tagline: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  email_header_logo_url: string | null
  email_footer_text: string | null
  email_signature: string | null
}

export function BrandingSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState<BrandingSettingsData>({
    company_name: '',
    company_tagline: '',
    logo_url: null,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    accent_color: '#8B5CF6',
    email_header_logo_url: null,
    email_footer_text: null,
    email_signature: null,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      const data = await res.json()

      if (data.settings) {
        setSettings({
          company_name: data.settings.company_name,
          company_tagline: data.settings.company_tagline,
          logo_url: data.settings.logo_url,
          primary_color: data.settings.primary_color,
          secondary_color: data.settings.secondary_color,
          accent_color: data.settings.accent_color,
          email_header_logo_url: data.settings.email_header_logo_url,
          email_footer_text: data.settings.email_footer_text,
          email_signature: data.settings.email_signature,
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            Branding settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo Upload */}
          <div className="bg-card rounded-lg border border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Logo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {settings.logo_url ? (
                    <div className="h-20 w-20 rounded-lg border-2 border flex items-center justify-center overflow-hidden relative">
                      <Image src={settings.logo_url} alt="Logo" fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="url"
                      value={settings.logo_url || ''}
                      onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter logo URL or upload to Supabase Storage</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Email Header Logo
                </label>
                <Input
                  type="url"
                  value={settings.email_header_logo_url || ''}
                  onChange={(e) => setSettings({ ...settings, email_header_logo_url: e.target.value })}
                  placeholder="https://example.com/email-logo.png"
                />
                <p className="text-xs text-muted-foreground mt-1">Used in email headers (optional)</p>
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="bg-card rounded-lg border border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Brand Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="h-10 w-16 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="h-10 w-16 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    placeholder="#10B981"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="h-10 w-16 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    placeholder="#8B5CF6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Branding */}
          <div className="bg-card rounded-lg border border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Email Branding</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email Footer Text
                </label>
                <Input
                  value={settings.email_footer_text || ''}
                  onChange={(e) => setSettings({ ...settings, email_footer_text: e.target.value })}
                  placeholder="© 2025 Your Company. All rights reserved."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email Signature
                </label>
                <textarea
                  value={settings.email_signature || ''}
                  onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Best regards,&#10;Your Name&#10;Your Title"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border p-6 sticky top-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Preview</h3>

            {/* Button Previews */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Primary Button</p>
                <button
                  style={{ backgroundColor: settings.primary_color }}
                  className="px-4 py-2 text-white rounded-md font-medium w-full"
                >
                  Primary Action
                </button>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Secondary Button</p>
                <button
                  style={{ backgroundColor: settings.secondary_color }}
                  className="px-4 py-2 text-white rounded-md font-medium w-full"
                >
                  Secondary Action
                </button>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Accent Button</p>
                <button
                  style={{ backgroundColor: settings.accent_color }}
                  className="px-4 py-2 text-white rounded-md font-medium w-full"
                >
                  Accent Action
                </button>
              </div>

              {/* Logo Preview */}
              {settings.logo_url && (
                <div className="pt-4 border-t border">
                  <p className="text-xs text-muted-foreground mb-2">Logo Preview</p>
                  <div className="bg-muted rounded-lg p-4 flex items-center justify-center h-24 relative">
                    <Image src={settings.logo_url} alt="Logo Preview" fill className="object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </div>
  )
}
