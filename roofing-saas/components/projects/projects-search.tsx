'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface ProjectsSearchProps {
  onFilterChange?: (filters: Record<string, string>) => void
}

export function ProjectsSearch({ onFilterChange }: ProjectsSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [pipeline, setPipeline] = useState(searchParams.get('pipeline') || '')
  const [stage, setStage] = useState(searchParams.get('stage') || '')
  const [assignedTo, setAssignedTo] = useState(searchParams.get('assigned_to') || '')

  const [pipelines, setPipelines] = useState<string[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [assignees, setAssignees] = useState<string[]>([])

  // Fetch filter options from API
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('/api/projects/filters')
        if (response.ok) {
          const data = await response.json()
          setPipelines(data.pipelines || [])
          setStages(data.stages || [])
          setAssignees(data.assignees || [])
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error)
      }
    }
    fetchFilterOptions()
  }, [])

  const handleApplyFilters = () => {
    const params = new URLSearchParams()

    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (pipeline) params.set('pipeline', pipeline)
    if (stage) params.set('stage', stage)
    if (assignedTo) params.set('assigned_to', assignedTo)
    params.set('page', '1') // Reset to page 1

    router.push(`/projects?${params.toString()}`)

    if (onFilterChange) {
      onFilterChange({
        search,
        status,
        pipeline,
        stage,
        assigned_to: assignedTo,
      })
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('')
    setPipeline('')
    setStage('')
    setAssignedTo('')
    router.push('/projects')

    if (onFilterChange) {
      onFilterChange({})
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="space-y-4">
        {/* Search Input */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name or number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleApplyFilters()
              }
            }}
          />
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="lead">Lead</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Pipeline Filter */}
          <div>
            <label htmlFor="pipeline" className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline
            </label>
            <select
              id="pipeline"
              value={pipeline}
              onChange={(e) => setPipeline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Pipelines</option>
              {pipelines.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <select
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To Filter */}
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <select
              id="assignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Assignees</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear All
          </button>
        </div>

        {/* Active Filters Display */}
        {(search || status || pipeline || stage || assignedTo) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600">Active filters:</span>
            {search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {search}
              </span>
            )}
            {status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {status}
              </span>
            )}
            {pipeline && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Pipeline: {pipeline}
              </span>
            )}
            {stage && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Stage: {stage}
              </span>
            )}
            {assignedTo && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Assigned: {assignedTo}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
