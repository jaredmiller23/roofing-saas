'use client'

import { useDraggable } from '@dnd-kit/core'
import Link from 'next/link'
import { DollarSign, Calendar, User, Building2, Clock } from 'lucide-react'

interface Project {
  id: string
  name: string
  project_number: string | null
  status: string
  type: string | null
  estimated_value: number
  approved_value: number
  final_value: number | null
  created_at: string
  estimated_start: string | null
  scheduled_start: string | null
  actual_start: string | null
  estimated_completion: string | null
  actual_completion: string | null
  assigned_to_name: string | null
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
  } | null
}

interface ProjectCardProps {
  project: Project
  isDragging?: boolean
}

export function ProjectCard({ project, isDragging = false }: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: project.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const formatCurrency = (value: number | null) => {
    if (!value) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  const getTypeColor = (type: string | null) => {
    if (!type) return 'bg-gray-100 text-gray-700'
    const colors: Record<string, string> = {
      repair: 'bg-blue-100 text-blue-700',
      replacement: 'bg-purple-100 text-purple-700',
      maintenance: 'bg-green-100 text-green-700',
      emergency: 'bg-red-100 text-red-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  // Determine which value to display based on status
  const displayValue = project.final_value || project.approved_value || project.estimated_value

  // Determine which date to display based on status
  const getRelevantDate = () => {
    switch (project.status) {
      case 'estimate':
        return project.estimated_start
      case 'approved':
      case 'scheduled':
        return project.scheduled_start
      case 'in_progress':
        return project.actual_start
      case 'completed':
        return project.actual_completion
      default:
        return null
    }
  }

  const relevantDate = getRelevantDate()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        bg-white rounded-lg border border-gray-200 p-4
        hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
      `}
    >
      {/* Header: Name + Project Number */}
      <div className="flex items-start justify-between mb-3">
        <Link
          href={`/projects/${project.id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {project.name}
        </Link>
        {project.project_number && (
          <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
            #{project.project_number}
          </span>
        )}
      </div>

      {/* Project Value */}
      {displayValue > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-lg font-bold text-green-700">
          <DollarSign className="h-4 w-4" />
          {formatCurrency(displayValue)}
        </div>
      )}

      {/* Contact Info */}
      {project.contact && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="h-4 w-4 text-gray-400" />
            <Link
              href={`/contacts/${project.contact.id}`}
              className="hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              {project.contact.first_name} {project.contact.last_name}
            </Link>
          </div>
          {project.contact.phone && (
            <div className="mt-1 ml-6 text-xs text-gray-500">
              {project.contact.phone}
            </div>
          )}
        </div>
      )}

      {/* Date Info */}
      {relevantDate && (
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDate(relevantDate)}</span>
        </div>
      )}

      {/* Assigned To */}
      {project.assigned_to_name && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span>{project.assigned_to_name}</span>
        </div>
      )}

      {/* Footer: Type Badge + Last Updated */}
      <div className="mt-3 flex items-center justify-between gap-2">
        {project.type && (
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${getTypeColor(project.type)}`}>
            {project.type}
          </span>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
          <Clock className="h-3 w-3" />
          {getTimeSince(project.created_at)}
        </div>
      </div>
    </div>
  )
}
