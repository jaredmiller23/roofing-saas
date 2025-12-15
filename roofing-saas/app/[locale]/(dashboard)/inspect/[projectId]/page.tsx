'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InspectionWizard } from '@/components/claims/InspectionWizard'
import type { InspectionState } from '@/lib/claims/inspection-state'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

interface ProjectData {
  id: string
  name: string
  contact_id: string
  tenant_id: string
  contact?: {
    id: string
    first_name: string
    last_name: string
    address?: string
    city?: string
    state?: string
    zip?: string
  }
}

/**
 * Inspection Wizard Page
 *
 * Mobile-first PWA page for conducting property inspections.
 * Route: /inspect/[projectId]
 */
export default function InspectPage({ params }: PageProps) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Resolve params
  useEffect(() => {
    params.then(p => setProjectId(p.projectId))
  }, [params])

  // Fetch project data
  useEffect(() => {
    if (!projectId) return

    async function fetchProject() {
      try {
        const supabase = createClient()

        // Verify authentication
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Fetch project with contact
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select(
            `
            id,
            name,
            contact_id,
            tenant_id,
            contacts:contact_id (
              id,
              first_name,
              last_name,
              address,
              city,
              state,
              zip
            )
          `
          )
          .eq('id', projectId)
          .single()

        if (fetchError) {
          console.error('Project fetch error:', fetchError)
          setError('Project not found or access denied')
          return
        }

        // Transform contacts array to single object
        const contact = Array.isArray(data.contacts)
          ? data.contacts[0]
          : data.contacts

        setProject({
          id: data.id,
          name: data.name,
          contact_id: data.contact_id,
          tenant_id: data.tenant_id,
          contact: contact || undefined,
        })
      } catch (err) {
        console.error('Error fetching project:', err)
        setError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId, router])

  // Handle inspection complete
  const handleComplete = async (state: InspectionState) => {
    console.log('Inspection completed:', state)

    // Navigate back to project
    router.push(`/projects/${projectId}`)
  }

  // Handle cancel
  const handleCancel = () => {
    router.back()
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading inspection...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => router.push('/projects')}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go to Projects
          </button>
        </div>
      </div>
    )
  }

  // Render wizard
  return (
    <InspectionWizard
      projectId={project.id}
      contactId={project.contact_id}
      tenantId={project.tenant_id}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  )
}
