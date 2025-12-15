'use client'

// This is a stub - estimates are handled via the projects system
// Users should access estimates through /projects/[id] instead
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EstimateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the project page since estimates are projects
    router.replace(`/projects/${params.id}`)
  }, [params.id, router])

  return null
}