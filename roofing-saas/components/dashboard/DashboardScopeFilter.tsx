'use client'

export type DashboardScope = 'user' | 'company'

interface DashboardScopeFilterProps {
  currentScope: DashboardScope
  onScopeChange: (scope: DashboardScope) => void
}

export function DashboardScopeFilter({ currentScope, onScopeChange }: DashboardScopeFilterProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onScopeChange('user')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          currentScope === 'user'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        My Metrics
      </button>
      <button
        onClick={() => onScopeChange('company')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          currentScope === 'company'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Company Metrics
      </button>
    </div>
  )
}
