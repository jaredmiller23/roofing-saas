import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ContactForm } from '@/components/contacts/contact-form'

/**
 * New contact page
 */
export default async function NewContactPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Add New Contact</h1>
          <p className="text-muted-foreground mt-1">
            Create a new lead or customer record
          </p>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
