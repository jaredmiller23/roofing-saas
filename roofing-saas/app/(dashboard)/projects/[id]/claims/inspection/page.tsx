'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InspectionWizard } from '@/components/claims'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InspectionState } from '@/lib/claims/inspection-state'

interface Project {
  id: string
  name: string
  contact_id: string
  tenant_id: string
  property_address?: string
  property_city?: string
  property_state?: string
  property_zip?: string
  custom_fields?: {
    property_coords?: {
      latitude: number
      longitude: number
    }
  }
}

export default function InspectionPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data.project)
      } else {
        console.error('Failed to fetch project')
        router.push(`/projects/${projectId}/claims`)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      router.push(`/projects/${projectId}/claims`)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (state: InspectionState) => {
    try {
      // Submit inspection to API
      const res = await fetch(`/api/projects/${projectId}/claims/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })

      if (res.ok) {
        const data = await res.json()
        // Redirect to claim detail page
        router.push(`/projects/${projectId}/claims/${data.claimId}`)
      } else {
        console.error('Failed to submit inspection')
        alert('Failed to submit inspection. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting inspection:', error)
      alert('Failed to submit inspection. Please try again.')
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this inspection? All progress will be lost.')) {
      router.push(`/projects/${projectId}/claims`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Project not found</p>
            <Button onClick={() => router.push('/projects')}>
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/projects/${projectId}/claims`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Claims
        </Button>
        <h1 className="text-3xl font-bold">Property Inspection</h1>
        <p className="text-gray-600 mt-1">{project.name}</p>
        {project.property_address && (
          <p className="text-sm text-gray-500 mt-1">
            {project.property_address}, {project.property_city}, {project.property_state} {project.property_zip}
          </p>
        )}
      </div>

      {/* Inspection Wizard */}
      <InspectionWizard
        projectId={project.id}
        contactId={project.contact_id}
        tenantId={project.tenant_id}
        propertyCoords={project.custom_fields?.property_coords}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  )
}
