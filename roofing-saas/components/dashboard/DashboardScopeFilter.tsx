'use client'

import { Button } from '@/components/ui/button'
import { Building2, Users, User } from 'lucide-react'

export type DashboardScope = 'company' | 'team' | 'personal'

interface DashboardScopeFilterProps {
  currentScope: DashboardScope
  onScopeChange: (scope: DashboardScope) => void
}

export function DashboardScopeFilter({ currentScope, onScopeChange }: DashboardScopeFilterProps) {
  const scopes: { value: DashboardScope; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'company', label: 'Company', icon: Building2 },
    { value: 'team', label: 'Team', icon: Users },
    { value: 'personal', label: 'Personal', icon: User },
  ]

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-muted-foreground">View:</span>
      <div className="flex rounded-lg border border-border">
        {scopes.map((scope, index) => {
          const Icon = scope.icon
          const isActive = currentScope === scope.value
          const isFirst = index === 0
          const isLast = index === scopes.length - 1

          return (
            <Button
              key={scope.value}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={`
                ${isFirst ? 'rounded-r-none' : ''}
                ${isLast ? 'rounded-l-none' : ''}
                ${!isFirst && !isLast ? 'rounded-none border-x-0' : ''}
                ${isActive ? 'shadow-sm' : ''}
              `}
              onClick={() => onScopeChange(scope.value)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {scope.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}