'use client'

import { DashboardEditor } from '@/components/dashboard/DashboardEditor'
import { useRouter } from 'next/navigation'
import type { Dashboard } from '@/components/dashboard/DashboardEditor'

/**
 * Dashboard Edit Page
 *
 * Provides an interface for creating and editing custom dashboards.
 * Includes the full dashboard editor with drag-and-drop functionality.
 */
export default function DashboardEditPage() {
  const router = useRouter()

  const handleSave = (dashboard: Dashboard) => {
    // TODO: Save dashboard to database
    console.log('Saving dashboard:', dashboard)
    router.push('/dashboard')
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  return (
    <div className="h-screen">
      <DashboardEditor
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}