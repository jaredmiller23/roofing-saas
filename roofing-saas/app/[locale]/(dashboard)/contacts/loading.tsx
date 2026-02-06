import { TableSkeleton } from '@/components/ui/skeletons'

export default function ContactsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded w-32 animate-pulse" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  )
}
