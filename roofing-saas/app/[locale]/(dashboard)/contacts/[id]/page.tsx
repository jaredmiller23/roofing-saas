import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PhotoManager } from '@/components/photos'
import { ContactSubstatusManager } from '@/components/contacts/ContactSubstatusManager'
import { CreateProjectDialog } from '@/components/contacts/CreateProjectDialog'
import { Lightbulb, ArrowRight } from 'lucide-react'

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

  // Fetch contact and their projects in parallel
  const [contactResult, projectsResult] = await Promise.all([
    supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single(),
    supabase
      .from('projects')
      .select('id, name, pipeline_stage, status')
      .eq('contact_id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .limit(5)
  ])

  const { data: contact, error } = contactResult
  const { data: projects } = projectsResult
  const hasProjects = projects && projects.length > 0

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
                stage={contact.stage ?? 'new'}
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

        {/* Workflow Guidance Banner - Shows when no projects exist */}
        {!hasProjects && (
          <div className="mb-6 bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Next Step: Create a Project</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a project to track this opportunity through your sales pipeline,
                  manage estimates, and collect signatures.
                </p>
                <div className="mt-3">
                  <CreateProjectDialog
                    contactId={contact.id}
                    contactName={`${contact.first_name} ${contact.last_name}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Linked Projects */}
        {hasProjects && (
          <div className="bg-card rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Projects</h2>
              <CreateProjectDialog
                contactId={contact.id}
                contactName={`${contact.first_name} ${contact.last_name}`}
              />
            </div>
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{project.pipeline_stage?.replace(/_/g, ' ')}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

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
