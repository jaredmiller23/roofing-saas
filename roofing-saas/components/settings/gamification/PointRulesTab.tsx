'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Target,
  Plus,
  Trash2,
  CheckCircle,
  Phone,
  Mail,
  MessageSquare,
  Camera,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react'
import { PointRuleFormDialog } from './dialogs/PointRuleFormDialog'
import type { PointRuleConfigDB } from '@/lib/gamification/types'

// Pre-built point rule templates - using semantic theme tokens
const POINT_RULE_TEMPLATES = [
  {
    id: 'contact-created',
    action_type: 'CONTACT_CREATED',
    action_name: 'Contact Created',
    points_value: 10,
    category: 'Lead Generation',
    description: 'Award points when a new contact is added to the system',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'contact-qualified',
    action_type: 'CONTACT_QUALIFIED',
    action_name: 'Contact Qualified',
    points_value: 20,
    category: 'Lead Generation',
    description: 'Award points when a contact is qualified as a sales lead',
    icon: CheckCircle,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'call-completed',
    action_type: 'CALL_COMPLETED',
    action_name: 'Call Completed',
    points_value: 5,
    category: 'Communication',
    description: 'Award points for each completed phone call',
    icon: Phone,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'email-sent',
    action_type: 'EMAIL_SENT',
    action_name: 'Email Sent',
    points_value: 3,
    category: 'Communication',
    description: 'Award points for each email sent to a contact',
    icon: Mail,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'sms-sent',
    action_type: 'SMS_SENT',
    action_name: 'SMS Sent',
    points_value: 2,
    category: 'Communication',
    description: 'Award points for each SMS message sent',
    icon: MessageSquare,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'appointment-set',
    action_type: 'APPOINTMENT_SET',
    action_name: 'Appointment Set',
    points_value: 20,
    category: 'Communication',
    description: 'Award points when an appointment is scheduled',
    icon: Calendar,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'photo-uploaded',
    action_type: 'PHOTO_UPLOADED',
    action_name: 'Photo Uploaded',
    points_value: 5,
    category: 'Field Work',
    description: 'Award points for each property photo uploaded',
    icon: Camera,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'territory-created',
    action_type: 'TERRITORY_CREATED',
    action_name: 'Territory Created',
    points_value: 10,
    category: 'Field Work',
    description: 'Award points when a new territory is mapped',
    icon: MapPin,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'project-created',
    action_type: 'PROJECT_CREATED',
    action_name: 'Project Created',
    points_value: 15,
    category: 'Sales',
    description: 'Award points when a new project is created',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'project-won',
    action_type: 'PROJECT_WON',
    action_name: 'Project Won',
    points_value: 100,
    category: 'Sales',
    description: 'Award points when a project is marked as won',
    icon: DollarSign,
    color: 'text-primary',
    bgColor: 'bg-muted'
  },
  {
    id: 'door-knock-logged',
    action_type: 'DOOR_KNOCK_LOGGED',
    action_name: 'Door Knock Logged',
    points_value: 3,
    category: 'Field Work',
    description: 'Award points for each door knock logged',
    icon: TrendingUp,
    color: 'text-primary',
    bgColor: 'bg-muted'
  }
]

export function PointRulesTab() {
  const [pointRules, setPointRules] = useState<PointRuleConfigDB[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PointRuleConfigDB | null>(null)

  const fetchPointRules = useCallback(async () => {
    try {
      const data = await apiFetch<PointRuleConfigDB[]>('/api/gamification/point-rules')
      setPointRules(data || [])
    } catch (error) {
      console.error('Failed to fetch point rules:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPointRules()
  }, [fetchPointRules])

  const togglePointRule = async (ruleId: string, isActive: boolean) => {
    try {
      await apiFetch(`/api/gamification/point-rules/${ruleId}`, {
        method: 'PATCH',
        body: { is_active: isActive },
      })
      setPointRules(prev => prev.map(r =>
        r.id === ruleId ? { ...r, is_active: isActive } : r
      ))
    } catch (error) {
      console.error('Failed to toggle point rule:', error)
    }
  }

  const createFromTemplate = async (template: typeof POINT_RULE_TEMPLATES[0]) => {
    setCreating(template.id)
    try {
      await apiFetch('/api/gamification/point-rules', {
        method: 'POST',
        body: {
          action_type: template.action_type,
          action_name: template.action_name,
          points_value: template.points_value,
          category: template.category,
          is_active: true,
        },
      })
      await fetchPointRules()
    } catch (error) {
      console.error('Failed to create point rule:', error)
    } finally {
      setCreating(null)
    }
  }

  const deletePointRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this point rule?')) return

    try {
      await apiFetch(`/api/gamification/point-rules/${ruleId}`, { method: 'DELETE' })
      setPointRules(prev => prev.filter(r => r.id !== ruleId))
    } catch (error) {
      console.error('Failed to delete point rule:', error)
    }
  }

  const isTemplateCreated = (actionType: string) => {
    return pointRules.some(r => r.action_type === actionType)
  }

  const handleSaveRule = async () => {
    await fetchPointRules()
    setDialogOpen(false)
    setEditingRule(null)
  }

  // Group rules by category
  const rulesByCategory = pointRules.reduce((acc, rule) => {
    const category = rule.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(rule)
    return acc
  }, {} as Record<string, PointRuleConfigDB[]>)

  return (
    <div className="space-y-6">
      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Templates</CardTitle>
          <CardDescription>
            One-click setup for common point-earning actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POINT_RULE_TEMPLATES.map(template => {
              const Icon = template.icon
              const isCreated = isTemplateCreated(template.action_type)

              return (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border ${template.bgColor} border`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-card ${template.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm">{template.action_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {template.points_value} pts
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    variant={isCreated ? 'outline' : 'default'}
                    disabled={isCreated || creating === template.id}
                    onClick={() => createFromTemplate(template)}
                  >
                    {creating === template.id ? (
                      'Adding...'
                    ) : isCreated ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Already Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Rule
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Rule Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              setEditingRule(null)
              setDialogOpen(true)
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Point Rule
          </Button>
        </CardContent>
      </Card>

      {/* Active Point Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Point Rules</CardTitle>
              <CardDescription>
                {pointRules.length} rule{pointRules.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading point rules...</div>
          ) : pointRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No point rules yet</p>
              <p className="text-sm mt-1">Use the templates above to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(rulesByCategory).map(([category, rules]) => (
                <div key={category}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">{category}</h4>
                  <div className="space-y-2">
                    {rules.map(rule => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked: boolean) => togglePointRule(rule.id, checked)}
                          />
                          <div>
                            <h4 className="font-medium text-foreground">{rule.action_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {rule.points_value} points
                              </Badge>
                              {rule.is_active ? (
                                <span className="text-xs text-primary">Active</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Inactive</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deletePointRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <PointRuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule}
        onSave={handleSaveRule}
      />
    </div>
  )
}
