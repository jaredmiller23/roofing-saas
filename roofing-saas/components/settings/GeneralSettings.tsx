'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'

interface GeneralSettingsData {
  company_name: string | null
  company_tagline: string | null
  timezone: string
  locale: string
  date_format: string
  time_format: string
  currency: string
  email_notifications_enabled: boolean
  sms_notifications_enabled: boolean
  push_notifications_enabled: boolean
  business_hours: Record<string, { open: string; close: string; enabled: boolean }>
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export function GeneralSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState<GeneralSettingsData>({
    company_name: '',
    company_tagline: '',
    timezone: 'America/New_York',
    locale: 'en-US',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    currency: 'USD',
    email_notifications_enabled: true,
    sms_notifications_enabled: true,
    push_notifications_enabled: true,
    business_hours: {
      monday: { open: '09:00', close: '17:00', enabled: true },
      tuesday: { open: '09:00', close: '17:00', enabled: true },
      wednesday: { open: '09:00', close: '17:00', enabled: true },
      thursday: { open: '09:00', close: '17:00', enabled: true },
      friday: { open: '09:00', close: '17:00', enabled: true },
      saturday: { open: '09:00', close: '13:00', enabled: false },
      sunday: { open: '09:00', close: '13:00', enabled: false },
    }
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
        setSettings(data.settings)
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
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Company Information */}
      <div className="bg-card rounded-lg border border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Company Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Company Name
            </label>
            <Input
              value={settings.company_name || ''}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="Your Company Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Tagline
            </label>
            <Input
              value={settings.company_tagline || ''}
              onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })}
              placeholder="Your company tagline or slogan"
            />
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-card rounded-lg border border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Date Format
            </label>
            <select
              value={settings.date_format}
              onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Time Format
            </label>
            <select
              value={settings.time_format}
              onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-card rounded-lg border border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Business Hours</h3>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-32">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.business_hours[day]?.enabled || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      business_hours: {
                        ...settings.business_hours,
                        [day]: { ...settings.business_hours[day], enabled: e.target.checked }
                      }
                    })}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                  />
                  <span className="text-sm font-medium text-muted-foreground capitalize">{day}</span>
                </label>
              </div>
              {settings.business_hours[day]?.enabled && (
                <>
                  <Input
                    type="time"
                    value={settings.business_hours[day]?.open || '09:00'}
                    onChange={(e) => setSettings({
                      ...settings,
                      business_hours: {
                        ...settings.business_hours,
                        [day]: { ...settings.business_hours[day], open: e.target.value }
                      }
                    })}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={settings.business_hours[day]?.close || '17:00'}
                    onChange={(e) => setSettings({
                      ...settings,
                      business_hours: {
                        ...settings.business_hours,
                        [day]: { ...settings.business_hours[day], close: e.target.value }
                      }
                    })}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card rounded-lg border border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.email_notifications_enabled}
              onChange={(e) => setSettings({ ...settings, email_notifications_enabled: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <span className="ml-2 text-sm text-muted-foreground">Email Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.sms_notifications_enabled}
              onChange={(e) => setSettings({ ...settings, sms_notifications_enabled: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <span className="ml-2 text-sm text-muted-foreground">SMS Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.push_notifications_enabled}
              onChange={(e) => setSettings({ ...settings, push_notifications_enabled: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <span className="ml-2 text-sm text-muted-foreground">Push Notifications</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
