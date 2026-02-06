'use client'

import { useState } from 'react'
import { TopPerformersTable } from './top-performers-table'
import { JobProfitabilitySheet, type ProjectPLData } from './job-profitability-sheet'

interface ReportsClientProps {
  profitProjects: ProjectPLData[]
  marginProjects: ProjectPLData[]
}

export function ReportsClient({ profitProjects, marginProjects }: ReportsClientProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectPLData | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleProjectClick = (project: ProjectPLData) => {
    setSelectedProject(project)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopPerformersTable
          title="Most Profitable Projects"
          projects={profitProjects}
          metricKey="gross_profit"
          metricLabel="Profit"
          onProjectClick={handleProjectClick}
        />
        <TopPerformersTable
          title="Highest Margin Projects"
          projects={marginProjects}
          metricKey="profit_margin_percent"
          metricLabel="Margin %"
          onProjectClick={handleProjectClick}
        />
      </div>

      <JobProfitabilitySheet
        project={selectedProject}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
