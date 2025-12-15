'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, GitBranch } from 'lucide-react'
import type { WorkflowCondition, ConditionOperator } from '@/lib/automation/workflow-types'

interface ConditionNodeProps {
  condition: WorkflowCondition
  onChange: (condition: WorkflowCondition) => void
  onDelete: (conditionId: string) => void
}

const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' }
]

const CONTACT_FIELDS = [
  { value: 'contact.first_name', label: 'First Name' },
  { value: 'contact.last_name', label: 'Last Name' },
  { value: 'contact.email', label: 'Email' },
  { value: 'contact.phone', label: 'Phone' },
  { value: 'contact.stage', label: 'Stage' },
  { value: 'contact.type', label: 'Type' },
  { value: 'contact.priority', label: 'Priority' },
  { value: 'contact.lead_score', label: 'Lead Score' },
  { value: 'contact.property_type', label: 'Property Type' },
  { value: 'contact.source', label: 'Source' }
]

export function ConditionNode({ condition, onChange, onDelete }: ConditionNodeProps) {
  const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator)

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-sm">Condition</span>
            <Badge variant={condition.logic_gate === 'AND' ? 'default' : 'secondary'}>
              {condition.logic_gate}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(condition.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Logic Gate</Label>
            <Select
              value={condition.logic_gate}
              onValueChange={(value) => onChange({ ...condition, logic_gate: value as 'AND' | 'OR' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND (all conditions must be true)</SelectItem>
                <SelectItem value="OR">OR (any condition can be true)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Field</Label>
            <Select
              value={condition.field}
              onValueChange={(value) => onChange({ ...condition, field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_FIELDS.map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Operator</Label>
            <Select
              value={condition.operator}
              onValueChange={(value) => onChange({ ...condition, operator: value as ConditionOperator })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsValue && (
            <div>
              <Label className="text-xs">Value</Label>
              <Input
                placeholder="Enter comparison value"
                value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value : ''}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
              />
              {(condition.operator === 'in' || condition.operator === 'not_in') && (
                <div className="text-xs text-muted-foreground mt-1">
                  For lists, separate values with commas
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}