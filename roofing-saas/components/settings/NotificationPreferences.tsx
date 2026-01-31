'use client'

// =============================================
// Notification Preferences Component
// =============================================
// Purpose: UI for managing notification preferences
// Author: Claude Code
// Date: 2025-12-13
// =============================================

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, MessageSquare, Bell, Moon, CheckCircle, AlertCircle } from 'lucide-react'
import type { NotificationPreferences as NotificationPrefsType } from '@/lib/types/notification-preferences'
import { NOTIFICATION_CATEGORIES, DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notification-preferences'

type PreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Partial<NotificationPrefsType>>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  // Clear message after delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<NotificationPrefsType>('/api/profile/notifications')
      setPreferences(data)
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      setMessage({ type: 'error', text: 'Failed to load notification preferences' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key: PreferenceKey, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleTimeChange = (key: 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const data = await apiFetch<NotificationPrefsType>('/api/profile/notifications', {
        method: 'PUT',
        body: preferences,
      })

      setPreferences(data)
      setMessage({ type: 'success', text: 'Notification preferences saved!' })
      setHasChanges(false)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save preferences'
      })
    } finally {
      setSaving(false)
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Mail':
        return <Mail className="h-5 w-5" />
      case 'MessageSquare':
        return <MessageSquare className="h-5 w-5" />
      case 'Bell':
        return <Bell className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={`${message.type === 'success' ? 'bg-green-500/10 border-green-500' : 'bg-destructive/10 border-destructive'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-500' : 'text-destructive'}>
              {message.text}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Notification Categories */}
      {NOTIFICATION_CATEGORIES.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getIcon(category.icon)}
              {category.label}
            </CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {category.settings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.key} className="text-sm font-medium">
                      {setting.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={preferences[setting.key as PreferenceKey] as boolean ?? false}
                    onCheckedChange={(checked) => handleToggle(setting.key as PreferenceKey, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause non-urgent notifications during specified hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiet_hours_enabled" className="text-sm font-medium">
                  Enable Quiet Hours
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mute notifications during your off-hours
                </p>
              </div>
              <Switch
                id="quiet_hours_enabled"
                checked={preferences.quiet_hours_enabled ?? false}
                onCheckedChange={(checked) => handleToggle('quiet_hours_enabled', checked)}
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="quiet_hours_start" className="text-sm">Start Time</Label>
                  <Input
                    id="quiet_hours_start"
                    type="time"
                    value={preferences.quiet_hours_start ?? '22:00'}
                    onChange={(e) => handleTimeChange('quiet_hours_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet_hours_end" className="text-sm">End Time</Label>
                  <Input
                    id="quiet_hours_end"
                    type="time"
                    value={preferences.quiet_hours_end ?? '07:00'}
                    onChange={(e) => handleTimeChange('quiet_hours_end', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  )
}
