'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Mail, MessageSquare, Calendar } from 'lucide-react'

interface NotificationPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  new_leads: boolean
  status_changes: boolean
  task_reminders: boolean
  appointment_reminders: boolean
  team_mentions: boolean
  daily_summary: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    sms_notifications: false,
    new_leads: true,
    status_changes: true,
    task_reminders: true,
    appointment_reminders: true,
    team_mentions: true,
    daily_summary: false,
  })

  const [saving, setSaving] = useState(false)

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    // TODO: Implement save to database
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSaving(false)
    alert('Notification preferences saved!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to receive notifications about your business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Delivery Methods
          </h3>
          <div className="space-y-3 pl-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_notifications}
                onChange={() => handleToggle('email_notifications')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via text message</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.sms_notifications}
                onChange={() => handleToggle('sms_notifications')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Activity Notifications
          </h3>
          <div className="space-y-3 pl-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">New Leads</p>
                <p className="text-sm text-gray-500">When a new lead is added to your pipeline</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.new_leads}
                onChange={() => handleToggle('new_leads')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">Status Changes</p>
                <p className="text-sm text-gray-500">When a contact or project status changes</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.status_changes}
                onChange={() => handleToggle('status_changes')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">Team Mentions</p>
                <p className="text-sm text-gray-500">When someone mentions you in a comment</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.team_mentions}
                onChange={() => handleToggle('team_mentions')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Reminders
          </h3>
          <div className="space-y-3 pl-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">Task Reminders</p>
                <p className="text-sm text-gray-500">Reminders for upcoming tasks and deadlines</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.task_reminders}
                onChange={() => handleToggle('task_reminders')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">Appointment Reminders</p>
                <p className="text-sm text-gray-500">Reminders for scheduled appointments</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.appointment_reminders}
                onChange={() => handleToggle('appointment_reminders')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Digests
          </h3>
          <div className="space-y-3 pl-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">Daily Summary</p>
                <p className="text-sm text-gray-500">Daily email with activity summary</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.daily_summary}
                onChange={() => handleToggle('daily_summary')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
