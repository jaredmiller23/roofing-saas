'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * New Project Page - Placeholder for project creation
 * TODO: Implement full project creation with template selection (SPRINT3-003)
 */
export default function NewProjectPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Project creation with template selection coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
