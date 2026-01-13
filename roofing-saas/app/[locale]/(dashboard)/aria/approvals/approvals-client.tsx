'use client'

import { BotIcon, InfoIcon } from 'lucide-react'
import { ApprovalQueue } from '@/components/aria'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ApprovalsPageClientProps {
  userId: string
  tenantId: string
}

export function ApprovalsPageClient({ userId: _userId, tenantId: _tenantId }: ApprovalsPageClientProps) {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <BotIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ARIA Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and approve AI-generated responses before they&apos;re sent
          </p>
        </div>
      </div>

      {/* Info alert */}
      <Alert className="mb-6 border-primary/20 bg-primary/5">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Human-in-the-Loop</AlertTitle>
        <AlertDescription>
          Messages about pricing, complaints, cancellations, and reschedules require your approval.
          Simple greetings and confirmations are sent automatically.
        </AlertDescription>
      </Alert>

      {/* Main queue */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Messages waiting for your review. Items expire after 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalQueue initialStatus="pending" />
        </CardContent>
      </Card>
    </div>
  )
}
