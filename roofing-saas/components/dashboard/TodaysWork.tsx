'use client'

/**
 * TodaysWork Component
 *
 * Simplified "Up Next" widget for field workers on the dashboard.
 * Shows the next scheduled job with large, thumb-friendly action buttons.
 * Designed for quick glance and immediate action.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Clock,
  MapPin,
  Navigation,
  Phone,
  Calendar,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface TodaysJob {
  id: string
  projectId: string
  projectName: string
  address: string
  city?: string
  scheduledTime: string
  status: 'scheduled' | 'in_progress' | 'completed'
  contactPhone?: string
}

interface TodaysWorkProps {
  jobs?: TodaysJob[]
  isLoading?: boolean
}

function TodaysWorkSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-36 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 w-14" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TodaysWork({ jobs = [], isLoading }: TodaysWorkProps) {
  if (isLoading) {
    return <TodaysWorkSkeleton />
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No jobs scheduled today</p>
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/jobs">View Schedule</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Find next incomplete job, or first job if all complete
  const nextJob = jobs.find(j => j.status !== 'completed') || jobs[0]

  const handleNavigate = () => {
    const address = nextJob.city
      ? `${nextJob.address}, ${nextJob.city}`
      : nextJob.address
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank')
  }

  const handleCall = () => {
    if (nextJob.contactPhone) {
      window.location.href = `tel:${nextJob.contactPhone}`
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Up Next
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job info */}
        <Link href={`/projects/${nextJob.projectId}`} className="block group">
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
            {nextJob.projectName}
          </h3>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{nextJob.address}</span>
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {nextJob.scheduledTime}
          </p>
        </Link>

        {/* Primary actions - full width, large touch targets */}
        <div className="flex gap-2">
          <Button
            className="flex-1 h-14"
            size="xl"
            onClick={handleNavigate}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Navigate
          </Button>
          {nextJob.contactPhone && (
            <Button
              variant="outline"
              className="h-14 w-14"
              size="xl"
              onClick={handleCall}
              aria-label="Call customer"
            >
              <Phone className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Other jobs indicator */}
        {jobs.length > 1 && (
          <Link
            href="/field/today"
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            +{jobs.length - 1} more job{jobs.length > 2 ? 's' : ''} today
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
