import { SkeletonMetricCard } from '@/components/ui/skeleton-patterns'
import { TableSkeleton } from '@/components/ui/skeletons'

export default function FinancialReportsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  )
}
