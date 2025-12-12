'use client'

import Link from 'next/link'

interface Project {
  project_id: string
  project_name: string
  gross_profit?: number
  profit_margin_percent?: number
  revenue?: number
}

interface TopPerformersTableProps {
  title: string
  projects: Project[]
  metricKey: 'gross_profit' | 'profit_margin_percent'
  metricLabel: string
}

export function TopPerformersTable({ title, projects, metricKey, metricLabel }: TopPerformersTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatMetric = (project: Project) => {
    if (metricKey === 'profit_margin_percent') {
      return `${(project[metricKey] || 0).toFixed(1)}%`
    }
    return formatCurrency(project[metricKey] || 0)
  }

  const getMetricColor = (project: Project) => {
    const value = project[metricKey] || 0
    if (value >= 0) return 'text-green-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-6">
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.slice(0, 5).map((project, index) => (
              <Link
                key={project.project_id}
                href={`/projects/${project.project_id}`}
                className="block p-3 rounded-lg hover:bg-background transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {project.project_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Revenue: {formatCurrency(project.revenue || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className={`text-sm font-bold ${getMetricColor(project)}`}>
                      {formatMetric(project)}
                    </p>
                    <p className="text-xs text-muted-foreground">{metricLabel}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No projects to display</p>
          </div>
        )}
      </div>
    </div>
  )
}
