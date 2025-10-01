import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ContactsTable } from '@/components/contacts/contacts-table'
import { ContactsSearch } from '@/components/contacts/contacts-search'

/**
 * Contacts list page
 *
 * Features:
 * - Search contacts by name, email, phone
 * - Filter by stage, type, assigned user
 * - Pagination
 * - Quick actions (view, edit, delete)
 */
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-1">
              Manage your leads and customers
            </p>
          </div>

          <Link
            href="/contacts/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Contact
          </Link>
        </div>

        {/* Search and Filters */}
        <ContactsSearch params={params} />

        {/* Table */}
        <div className="mt-6">
          <ContactsTable params={params} />
        </div>
      </div>
    </div>
  )
}
