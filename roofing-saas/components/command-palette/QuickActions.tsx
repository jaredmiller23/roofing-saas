"use client"

import React from 'react'
import { QuickAction } from '@/lib/hooks/useCommandPalette'
import { cn } from '@/lib/utils'
import {
  Plus,
  UserPlus,
  FolderPlus,
  FileText,
  Calendar,
  BarChart3,
  ExternalLink
} from 'lucide-react'

interface QuickActionsProps {
  actions: QuickAction[]
  selectedIndex: number
  startIndex: number
}

export function QuickActions({ actions, selectedIndex, startIndex }: QuickActionsProps) {
  const getActionIcon = (icon: string) => {
    // Map emoji icons to Lucide icons for consistency
    switch (icon) {
      case '👤':
        return <UserPlus className="w-4 h-4" />
      case '📁':
        return <FolderPlus className="w-4 h-4" />
      case '📄':
        return <FileText className="w-4 h-4" />
      case '📅':
        return <Calendar className="w-4 h-4" />
      case '📊':
        return <BarChart3 className="w-4 h-4" />
      default:
        return <Plus className="w-4 h-4" />
    }
  }

  const getActionColor = (action: QuickAction) => {
    // Color based on action type
    if (action.id.includes('create') || action.id.includes('new')) {
      return 'text-green-500'
    }
    if (action.id.includes('view') || action.id.includes('open')) {
      return 'text-blue-500'
    }
    return 'text-gray-500'
  }

  return (
    <div className="space-y-0.5">
      {actions.map((action, index) => {
        const isSelected = startIndex + index === selectedIndex
        return (
          <div
            key={action.id}
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-md text-sm cursor-pointer transition-colors",
              isSelected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            {/* Icon */}
            <div className={cn("flex-shrink-0", getActionColor(action))}>
              {getActionIcon(action.icon)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {action.title}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {action.description}
              </div>
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-2">
              {action.href && (
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              )}

              {/* Keyboard hint */}
              {isSelected && (
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  ↵
                </kbd>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}