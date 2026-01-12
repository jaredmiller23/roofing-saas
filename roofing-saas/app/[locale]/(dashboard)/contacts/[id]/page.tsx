import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PhotoManager } from '@/components/photos'
import { ContactSubstatusManager } from '@/components/contacts/ContactSubstatusManager'
import { CreateProjectDialog } from '@/components/contacts/CreateProjectDialog'

/**
 * Contact detail page
 */
export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !contact) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Contact Not Found</h2>
            <p className="text-destructive/80 mb-4">The contact you are looking for does not exist.</p>
            <Link href="/contacts" className="text-destructive hover:text-destructive/80 underline">
              Back to Contacts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="flex gap-2 mt-2 items-center">
              <span className="px-3 py-1 bg-primary/20 text-primary text-sm font-semibold rounded-full capitalize">
                {contact.type}
              </span>
              <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground text-sm font-semibold rounded-full capitalize">
                {contact.stage}
              </span>
              <ContactSubstatusManager
                contactId={contact.id}
                stage={contact.stage}
                currentSubstatus={contact.substatus}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <CreateProjectDialog
              contactId={contact.id}
              contactName={`${contact.first_name} ${contact.last_name}`}
            />
            <Link
              href={`/contacts/${contact.id}/edit`}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
            >
              Edit
            </Link>
            <Link
              href="/contacts"
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-foreground">{contact.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Phone</label>
              <p className="mt-1 text-foreground">{contact.phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Mobile Phone</label>
              <p className="mt-1 text-foreground">{contact.mobile_phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Source</label>
              <p className="mt-1 text-foreground">{contact.source || '-'}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        {(contact.address_street || contact.address_city) && (
          <div className="bg-card rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Address</h2>
            <div className="text-foreground">
              {contact.address_street && <p>{contact.address_street}</p>}
              {(contact.address_city || contact.address_state || contact.address_zip) && (
                <p>
                  {contact.address_city}
                  {contact.address_state && `, ${contact.address_state}`}
                  {contact.address_zip && ` ${contact.address_zip}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Property Details */}
        {(contact.property_type || contact.roof_type || contact.roof_age) && (
          <div className="bg-card rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Property Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.property_type && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Property Type</label>
                  <p className="mt-1 text-foreground">{contact.property_type}</p>
                </div>
              )}
              {contact.roof_type && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Roof Type</label>
                  <p className="mt-1 text-foreground">{contact.roof_type}</p>
                </div>
              )}
              {contact.roof_age !== null && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Roof Age</label>
                  <p className="mt-1 text-foreground">{contact.roof_age} years</p>
                </div>
              )}
              {contact.square_footage && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Square Footage</label>
                  <p className="mt-1 text-foreground">{contact.square_footage.toLocaleString()} sq ft</p>
                </div>
              )}
              {contact.stories && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Stories</label>
                  <p className="mt-1 text-foreground">{contact.stories}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insurance */}
        {(contact.insurance_carrier || contact.policy_number) && (
          <div className="bg-card rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Insurance Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.insurance_carrier && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Insurance Carrier</label>
                  <p className="mt-1 text-foreground">{contact.insurance_carrier}</p>
                </div>
              )}
              {contact.policy_number && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Policy Number</label>
                  <p className="mt-1 text-foreground">{contact.policy_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Property Photos</h2>
          <PhotoManager
            contactId={contact.id}
            tenantId={tenantId}
            uploadMode="immediate"
            showUpload={true}
            showGallery={true}
          />
        </div>
      </div>
    </div>
  )
}
