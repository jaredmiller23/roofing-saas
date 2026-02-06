import { SkeletonDashboard } from '@/components/ui/skeleton-patterns'

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="space-y-2 mb-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
      </div>
      <SkeletonDashboard />
    </div>
  )
}
