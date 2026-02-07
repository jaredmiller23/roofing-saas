import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { WarrantyList } from '@/components/warranties/warranty-list'

/**
 * Warranties page
 *
 * Lists all warranties across projects for the tenant.
 * Supports filtering by status and adding/editing warranties.
 */
export default async function WarrantiesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4">
          <span>Dashboard</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Warranties</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Warranties</h1>
          </div>
          <p className="text-muted-foreground">
            Track and manage roof warranties across all projects
          </p>
        </div>

        {/* Warranty List */}
        <WarrantyList showProjectColumn={true} />
      </div>
    </div>
  )
}
