'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, ArrowRight } from 'lucide-react'

/**
 * New Project Page
 *
 * Projects are created from contacts to ensure proper linkage.
 * This page guides users to the correct workflow.
 */
export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactId = searchParams.get('contact_id')

  // If contact_id is provided, redirect to that contact's page
  useEffect(() => {
    if (contactId) {
      router.replace(`/contacts/${contactId}`)
    }
  }, [contactId, router])

  // If no contact specified, show guidance
  if (contactId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            Projects are linked to contacts to track customer relationships and job details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              How to create a project
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Go to the <strong>Contacts</strong> page</li>
              <li>Select or create a contact (homeowner, business, etc.)</li>
              <li>Click <strong>&quot;Create Project&quot;</strong> on the contact detail page</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => router.push('/contacts')} className="gap-2">
              <Users className="h-4 w-4" />
              Go to Contacts
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push('/projects')}>
              View Pipeline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
