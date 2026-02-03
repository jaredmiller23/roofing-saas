import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ContactsWithFilters } from '@/components/contacts/contacts-with-filters'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

/**
 * Contacts list page
 *
 * Features:
 * - Configurable filters via FilterBar
 * - Search contacts by name, email, phone
 * - Filter by stage, type, assigned user
 * - Pagination
 * - Quick actions (view, edit, delete)
 */
export default async function ContactsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your leads and customers with configurable filters
            </p>
          </div>

          <Link href="/contacts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        </div>

        {/* Configurable Filters + Search + Table */}
        <ContactsWithFilters />
      </div>
    </div>
  )
}
