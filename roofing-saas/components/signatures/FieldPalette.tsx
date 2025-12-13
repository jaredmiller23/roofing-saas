'use client'

import {
  PenLine,
  Calendar,
  Type,
  CheckSquare,
  User,
  Mail,
  Hash
} from 'lucide-react'

export type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox' | 'name' | 'email'

interface FieldConfig {
  type: FieldType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  defaultWidth: number
  defaultHeight: number
}

export const fieldConfigs: FieldConfig[] = [
  {
    type: 'signature',
    label: 'Signature',
    icon: PenLine,
    description: 'Full signature field',
    defaultWidth: 200,
    defaultHeight: 50,
  },
  {
    type: 'initials',
    label: 'Initials',
    icon: Hash,
    description: 'Initials only',
    defaultWidth: 80,
    defaultHeight: 40,
  },
  {
    type: 'date',
    label: 'Date',
    icon: Calendar,
    description: 'Date signed',
    defaultWidth: 120,
    defaultHeight: 30,
  },
  {
    type: 'name',
    label: 'Full Name',
    icon: User,
    description: 'Signer full name',
    defaultWidth: 180,
    defaultHeight: 30,
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    description: 'Signer email',
    defaultWidth: 200,
    defaultHeight: 30,
  },
  {
    type: 'text',
    label: 'Text Field',
    icon: Type,
    description: 'Custom text input',
    defaultWidth: 150,
    defaultHeight: 30,
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    description: 'Agreement checkbox',
    defaultWidth: 24,
    defaultHeight: 24,
  },
]

interface FieldPaletteProps {
  onDragStart: (type: FieldType) => void
}

export function FieldPalette({ onDragStart }: FieldPaletteProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Signature Fields</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Drag fields onto the document
      </p>
      <div className="space-y-2">
        {fieldConfigs.map((config) => {
          const Icon = config.icon
          return (
            <div
              key={config.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('fieldType', config.type)
                onDragStart(config.type)
              }}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border
                         cursor-grab active:cursor-grabbing hover:bg-muted/50
                         hover:border-primary/50 transition-colors"
            >
              <div className="p-1.5 bg-primary/10 rounded">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{config.label}</div>
                <div className="text-xs text-muted-foreground truncate">{config.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function getFieldConfig(type: FieldType): FieldConfig | undefined {
  return fieldConfigs.find(c => c.type === type)
}
