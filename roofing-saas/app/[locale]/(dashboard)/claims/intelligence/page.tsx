import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { IntelligenceClient } from './intelligence-client'

export const metadata = {
  title: 'Claims Intelligence | Roofing SaaS',
  description: 'Track adjuster patterns, carrier behaviors, and claim outcomes',
}

export default async function ClaimsIntelligencePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/claims"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Claims
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Claims Intelligence
          </h1>
          <p className="text-muted-foreground">
            Track patterns, learn from outcomes, and build compounding advantage
          </p>
        </div>

        {/* Tab Content */}
        <IntelligenceClient defaultTab="summary" />
      </div>
    </div>
  )
}
