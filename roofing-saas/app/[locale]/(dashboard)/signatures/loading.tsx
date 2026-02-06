import { CardSkeleton } from '@/components/ui/skeletons'

export default function SignaturesLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-36 animate-pulse" />
          <div className="h-4 bg-muted rounded w-52 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded w-36 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} lines={3} />
        ))}
      </div>
    </div>
  )
}
