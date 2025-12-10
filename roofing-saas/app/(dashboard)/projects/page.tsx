'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { LeadsWithFilters } from '@/components/projects/leads-with-filters'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Table, Plus } from 'lucide-react'

/**
 * Unified Pipeline Page
 *
 * Single view of all sales opportunities from first contact to completion.
 * Use filters to slice the data however you need (active opportunities,
 * in production, closed deals, etc.)
 *
 * Features:
 * - View toggle: Kanban vs Table
 * - Kanban: Drag-drop through pipeline stages with quick filters
 * - Table: Detailed list with configurable filters via FilterBar
 *
 * Note: Each view (Kanban/Table) has its own built-in filtering system.
 * Kanban has quick filter chips at the top, Table has FilterBar component.
 */
export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Pipeline
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Track opportunities from first contact to completion
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
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
              <Link href="/contacts/new">
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span>New Opportunity</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* KANBAN VIEW - Has built-in quick filters and stage toggles */}
          {viewMode === 'kanban' && (
            <div className="h-full overflow-x-auto overflow-y-hidden bg-gray-100" data-testid="kanban-view">
              <PipelineBoard />
            </div>
          )}

          {/* TABLE VIEW - Has built-in FilterBar with configurable filters */}
          {viewMode === 'table' && (
            <div className="h-full overflow-auto p-4 md:p-8" data-testid="table-view">
              <div className="max-w-7xl mx-auto">
                <LeadsWithFilters />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
