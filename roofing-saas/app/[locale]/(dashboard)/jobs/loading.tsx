import { TableSkeleton } from '@/components/ui/skeletons'

export default function JobsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-24 animate-pulse" />
          <div className="h-4 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded w-28 animate-pulse" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  )
}
