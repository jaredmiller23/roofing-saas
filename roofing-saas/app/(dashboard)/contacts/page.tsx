import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ContactsWithFilters } from '@/components/contacts/contacts-with-filters'

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
            <p className="text-gray-600 mt-1">
              Manage your leads and customers with configurable filters
            </p>
          </div>

          <Link
            href="/contacts/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Contact
          </Link>
        </div>

        {/* Configurable Filters + Search + Table */}
        <ContactsWithFilters />
      </div>
    </div>
  )
}
