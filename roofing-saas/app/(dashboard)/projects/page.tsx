'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { ProjectsSearch } from '@/components/projects/projects-search'
import { ProjectsTable } from '@/components/projects/projects-table'
import { ProjectsKanbanBoard } from '@/components/projects/projects-kanban-board'
import { LeadsTable } from '@/components/projects/leads-table'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Table, Users, Briefcase, Plus } from 'lucide-react'

/**
 * Unified Projects & Pipeline Page
 *
 * Features:
 * - Entity toggle: Leads (contacts) vs Jobs (projects)
 * - View mode toggle: Kanban vs Table
 * - Leads Kanban: Drag-drop contacts through sales stages
 * - Leads Table: Contact list with projects
 * - Jobs Kanban: Projects by status (future enhancement)
 * - Jobs Table: Existing projects table
 */
export default function ProjectsPage() {
  const [entityType, setEntityType] = useState<'leads' | 'jobs'>('leads')
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {entityType === 'leads' ? 'Sales Pipeline' : 'Projects'}
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                {entityType === 'leads'
                  ? 'Manage leads through your sales process'
                  : 'Track roofing projects and jobs'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Entity Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-lg" data-testid="entity-type-toggle">
                <button
                  data-testid="leads-button"
                  onClick={() => {
                    setEntityType('leads')
                    setViewMode('kanban') // Default to Kanban for leads
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    entityType === 'leads'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Leads</span>
                </button>
                <button
                  data-testid="jobs-button"
                  onClick={() => {
                    setEntityType('jobs')
                    setViewMode('table') // Default to Table for jobs
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    entityType === 'jobs'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Jobs</span>
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-lg" data-testid="view-mode-toggle">
                <button
                  data-testid="kanban-view-button"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
                <button
                  data-testid="table-view-button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Table className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Add New Button */}
              <Link
                href={
                  entityType === 'leads'
                    ? '/contacts/new'
                    : '/projects/new'
                }
              >
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span>
                    {entityType === 'leads' ? 'New Lead' : 'New Project'}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* LEADS KANBAN VIEW */}
          {entityType === 'leads' && viewMode === 'kanban' && (
            <div className="h-full overflow-x-auto overflow-y-hidden bg-gray-100" data-testid="kanban-view">
              <PipelineBoard />
            </div>
          )}

          {/* LEADS TABLE VIEW */}
          {entityType === 'leads' && viewMode === 'table' && (
            <div className="h-full overflow-auto p-4 md:p-8" data-testid="table-view">
              <div className="max-w-7xl mx-auto">
                <LeadsTable />
              </div>
            </div>
          )}

          {/* JOBS KANBAN VIEW */}
          {entityType === 'jobs' && viewMode === 'kanban' && (
            <div className="h-full overflow-x-auto overflow-y-hidden bg-gray-100" data-testid="kanban-view">
              <ProjectsKanbanBoard />
            </div>
          )}

          {/* JOBS TABLE VIEW */}
          {entityType === 'jobs' && viewMode === 'table' && (
            <div className="h-full overflow-auto p-4 md:p-8" data-testid="table-view">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Search and Filters */}
                <ProjectsSearch />

                {/* Projects Table */}
                <ProjectsTable params={{}} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
