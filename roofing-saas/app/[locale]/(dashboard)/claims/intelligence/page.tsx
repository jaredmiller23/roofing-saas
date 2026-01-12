import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AdjusterList } from '@/components/claims/AdjusterList'
import { Users, Building2, BarChart3, FileText } from 'lucide-react'

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Claims Intelligence
          </h1>
          <p className="text-muted-foreground">
            Track patterns, learn from outcomes, and build compounding advantage
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="adjusters" className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto">
            <TabsTrigger
              value="adjusters"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Users className="h-4 w-4" />
              Adjusters
            </TabsTrigger>
            <TabsTrigger
              value="carriers"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Building2 className="h-4 w-4" />
              Carriers
            </TabsTrigger>
            <TabsTrigger
              value="patterns"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <BarChart3 className="h-4 w-4" />
              Patterns
            </TabsTrigger>
            <TabsTrigger
              value="outcomes"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <FileText className="h-4 w-4" />
              Outcomes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="adjusters">
            <AdjusterList />
          </TabsContent>

          <TabsContent value="carriers">
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Carrier Intelligence</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Track carrier-level patterns such as coverage denials, disputed
                line items, and successful counter-arguments.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Coming soon - patterns will aggregate as claims are processed.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="patterns">
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Pattern Analytics</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                View aggregated patterns across all adjusters and carriers. See
                what items are commonly disputed and which arguments win.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Coming soon - analytics will populate as patterns are recorded.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="outcomes">
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Claim Outcomes</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Track claim outcomes to understand what works. Link disputed
                items to successful arguments for future claims.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Coming soon - record outcomes when claims resolve.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
