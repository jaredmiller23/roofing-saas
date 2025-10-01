# Next.js 14 App Router Best Practices for Production SaaS

**Comprehensive Guide for Roofing SaaS CRM Application**
*Research Date: October 1, 2025*

---

## Table of Contents

1. [App Router Architecture](#1-app-router-architecture)
2. [Server Actions](#2-server-actions)
3. [Route Organization](#3-route-organization)
4. [Performance Optimization](#4-performance-optimization)
5. [TypeScript Integration](#5-typescript-integration)
6. [Supabase Integration Patterns](#6-supabase-integration-patterns)
7. [Production Checklist](#7-production-checklist)

---

## 1. App Router Architecture

### 1.1 Server Components vs Client Components

**Default Principle**: All components in the App Router are Server Components by default. Only add `"use client"` when absolutely necessary.

#### When to Use Server Components

✅ **Use Server Components for:**
- Data fetching from databases
- Accessing backend resources directly
- Keeping sensitive information on the server (API keys, access tokens)
- Large dependencies that would increase client bundle
- SEO-critical content

```typescript
// app/(dashboard)/contacts/page.tsx
// Server Component (default) - No "use client" directive

import { createServerClient } from '@/lib/supabase/server'
import { ContactList } from '@/components/features/contacts/ContactList'

export default async function ContactsPage() {
  const supabase = createServerClient()

  // Fetch data directly on the server
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to load contacts')
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Contacts</h1>
      <ContactList contacts={contacts} />
    </div>
  )
}
```

#### When to Use Client Components

✅ **Use Client Components for:**
- Interactive event listeners (onClick, onChange, etc.)
- State and lifecycle effects (useState, useEffect, etc.)
- Browser-only APIs (localStorage, geolocation, etc.)
- Custom hooks that depend on state or effects
- React Context providers

```typescript
// components/features/contacts/ContactForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createContact } from '@/app/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ContactForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)

    try {
      await createContact(formData)
      router.push('/contacts')
      router.refresh() // Revalidate server component
    } catch (error) {
      console.error('Failed to create contact:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit}>
      <Input name="name" placeholder="Contact name" required />
      <Input name="email" type="email" placeholder="Email" />
      <Input name="phone" type="tel" placeholder="Phone" />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Contact'}
      </Button>
    </form>
  )
}
```

### 1.2 Composition Pattern: Server + Client

**Best Practice**: Pass Server Components as children to Client Components

```typescript
// components/layouts/ClientWrapper.tsx
"use client"

import { useState } from 'react'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children}
    </div>
  )
}

// app/contacts/page.tsx
// Server Component that uses Client Component
import { ClientWrapper } from '@/components/layouts/ClientWrapper'
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createServerClient()
  const { data } = await supabase.from('contacts').select('*')

  return (
    <ClientWrapper>
      {/* This is still a Server Component! */}
      <div>
        {data.map(contact => (
          <div key={contact.id}>{contact.name}</div>
        ))}
      </div>
    </ClientWrapper>
  )
}
```

### 1.3 Data Fetching Patterns

#### Pattern 1: Parallel Data Fetching (Recommended)

```typescript
// app/(dashboard)/projects/[id]/page.tsx

import { createServerClient } from '@/lib/supabase/server'

// Define data fetching functions
async function getProject(id: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

async function getActivities(projectId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)
  return data
}

async function getDocuments(projectId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
  return data
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  // Initiate all requests in parallel
  const projectPromise = getProject(params.id)
  const activitiesPromise = getActivities(params.id)
  const documentsPromise = getDocuments(params.id)

  // Wait for all promises to resolve
  const [project, activities, documents] = await Promise.all([
    projectPromise,
    activitiesPromise,
    documentsPromise
  ])

  return (
    <div>
      <h1>{project.name}</h1>
      <ActivityTimeline activities={activities} />
      <DocumentList documents={documents} />
    </div>
  )
}
```

#### Pattern 2: Streaming with Suspense

```typescript
// app/(dashboard)/projects/[id]/page.tsx

import { Suspense } from 'react'
import { ProjectHeader } from '@/components/features/projects/ProjectHeader'
import { ActivityTimeline } from '@/components/features/projects/ActivityTimeline'
import { DocumentList } from '@/components/features/projects/DocumentList'
import { Skeleton } from '@/components/ui/skeleton'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* Load immediately - no suspense */}
      <ProjectHeader projectId={params.id} />

      <div className="grid grid-cols-2 gap-6">
        {/* Stream in when ready */}
        <Suspense fallback={<ActivitySkeleton />}>
          <ActivityTimeline projectId={params.id} />
        </Suspense>

        <Suspense fallback={<DocumentSkeleton />}>
          <DocumentList projectId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}

// components/features/projects/ActivityTimeline.tsx
import { createServerClient } from '@/lib/supabase/server'

export async function ActivityTimeline({ projectId }: { projectId: string }) {
  // This fetch will stream independently
  const supabase = createServerClient()
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (
    <div>
      {activities.map(activity => (
        <div key={activity.id}>{activity.description}</div>
      ))}
    </div>
  )
}
```

#### Pattern 3: Sequential (Only when necessary)

```typescript
// Only use sequential when one request depends on another
export default async function DependentDataPage() {
  // First request
  const user = await getUser()

  // Second request depends on first
  const userProjects = await getProjectsForUser(user.id)

  return <div>...</div>
}
```

### 1.4 Loading States and Error Handling

#### Automatic Loading with `loading.tsx`

```typescript
// app/(dashboard)/contacts/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container py-6">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  )
}
```

#### Error Boundaries with `error.tsx`

```typescript
// app/(dashboard)/contacts/error.tsx
"use client"

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Contact page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground">
        {error.message || 'Failed to load contacts'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

#### Global Error Handler

```typescript
// app/global-error.tsx
"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2>Application Error</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  )
}
```

---

## 2. Server Actions

### 2.1 Basic Server Action Pattern

```typescript
// app/actions/contacts.ts
"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Define schema
const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
})

export async function createContact(formData: FormData) {
  // 1. Parse and validate input
  const validatedFields = createContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    company: formData.get('company'),
    notes: formData.get('notes'),
  })

  // 2. Return validation errors
  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // 3. Get authenticated user
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  // 4. Perform database operation
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      ...validatedFields.data,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      message: 'Failed to create contact',
    }
  }

  // 5. Revalidate and redirect
  revalidatePath('/contacts')
  redirect(`/contacts/${data.id}`)
}
```

### 2.2 Form Handling with useFormState

```typescript
// app/actions/contacts.ts
"use server"

import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
})

export type FormState = {
  success: boolean
  errors?: {
    name?: string[]
    email?: string[]
    phone?: string[]
  }
  message?: string
}

export async function createContact(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Validate
  const validatedFields = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // Perform operation
  try {
    const supabase = createServerClient()
    const { error } = await supabase
      .from('contacts')
      .insert(validatedFields.data)

    if (error) throw error

    return {
      success: true,
      message: 'Contact created successfully',
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create contact',
    }
  }
}

// components/features/contacts/CreateContactForm.tsx
"use client"

import { useFormState, useFormStatus } from 'react-dom'
import { createContact, type FormState } from '@/app/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: FormState = {
  success: false,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Contact'}
    </Button>
  )
}

export function CreateContactForm() {
  const [state, formAction] = useFormState(createContact, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          aria-describedby="name-error"
        />
        {state.errors?.name && (
          <p id="name-error" className="text-sm text-destructive mt-1">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          aria-describedby="email-error"
        />
        {state.errors?.email && (
          <p id="email-error" className="text-sm text-destructive mt-1">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
        />
      </div>

      {state.message && (
        <div className={state.success ? 'text-green-600' : 'text-destructive'}>
          {state.message}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
```

### 2.3 Type-Safe Server Actions with next-safe-action

```bash
npm install next-safe-action zod
```

```typescript
// lib/safe-action.ts
import { createSafeActionClient } from "next-safe-action"
import { createServerClient } from '@/lib/supabase/server'

export const action = createSafeActionClient({
  // Middleware for authentication
  async middleware() {
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      throw new Error("Unauthorized")
    }

    return { user, supabase }
  },
})

// app/actions/contacts.ts
"use server"

import { z } from "zod"
import { action } from "@/lib/safe-action"
import { revalidatePath } from "next/cache"

const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export const createContact = action
  .schema(createContactSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { supabase, user } = ctx

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...parsedInput,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error("Failed to create contact")
    }

    revalidatePath("/contacts")
    return { contact: data }
  })

// components/features/contacts/CreateContactForm.tsx
"use client"

import { useAction } from "next-safe-action/hooks"
import { createContact } from "@/app/actions/contacts"
import { toast } from "sonner"

export function CreateContactForm() {
  const { execute, result, isExecuting } = useAction(createContact, {
    onSuccess: ({ data }) => {
      toast.success("Contact created successfully")
      // data is fully typed!
      console.log(data.contact.name)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to create contact")
    },
  })

  return (
    <form action={execute}>
      {/* form fields */}
    </form>
  )
}
```

### 2.4 Optimistic Updates

```typescript
// components/features/contacts/ContactList.tsx
"use client"

import { useOptimistic } from 'react'
import { deleteContact } from '@/app/actions/contacts'
import type { Contact } from '@/types'

export function ContactList({ contacts }: { contacts: Contact[] }) {
  const [optimisticContacts, deleteOptimisticContact] = useOptimistic(
    contacts,
    (state, contactIdToDelete: string) => {
      return state.filter(contact => contact.id !== contactIdToDelete)
    }
  )

  async function handleDelete(contactId: string) {
    // Immediately update UI
    deleteOptimisticContact(contactId)

    // Perform server action
    await deleteContact(contactId)
  }

  return (
    <div>
      {optimisticContacts.map(contact => (
        <div key={contact.id}>
          <span>{contact.name}</span>
          <button onClick={() => handleDelete(contact.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 2.5 Security Best Practices

```typescript
// app/actions/contacts.ts
"use server"

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function deleteContact(contactId: string) {
  // 1. ALWAYS re-authenticate in server actions
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  // 2. Verify user has permission to delete this contact
  const { data: contact } = await supabase
    .from('contacts')
    .select('created_by, organization_id')
    .eq('id', contactId)
    .single()

  if (!contact) {
    throw new Error('Contact not found')
  }

  // 3. Check authorization (organization-level)
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', contact.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    throw new Error('Insufficient permissions')
  }

  // 4. Perform deletion with RLS policies
  const { error: deleteError } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)

  if (deleteError) {
    throw new Error('Failed to delete contact')
  }

  revalidatePath('/contacts')
  return { success: true }
}
```

---

## 3. Route Organization

### 3.1 Recommended Folder Structure for Roofing SaaS

```
app/
├── (auth)/                      # Public authentication routes
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   └── layout.tsx               # Auth layout (centered form)
│
├── (dashboard)/                 # Protected dashboard routes
│   ├── contacts/
│   │   ├── [id]/
│   │   │   ├── page.tsx         # Contact detail
│   │   │   ├── edit/
│   │   │   │   └── page.tsx     # Edit contact
│   │   │   └── loading.tsx
│   │   ├── new/
│   │   │   └── page.tsx         # Create contact
│   │   ├── page.tsx             # Contact list
│   │   ├── loading.tsx
│   │   └── error.tsx
│   │
│   ├── projects/
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   ├── @modal/          # Parallel route for modals
│   │   │   │   └── (.)photos/
│   │   │   │       └── page.tsx
│   │   │   └── photos/
│   │   │       └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   └── loading.tsx
│   │
│   ├── pipeline/
│   │   └── page.tsx             # Kanban board view
│   │
│   ├── calendar/
│   │   └── page.tsx
│   │
│   ├── documents/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   │
│   ├── settings/
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── organization/
│   │   │   └── page.tsx
│   │   ├── integrations/
│   │   │   └── page.tsx
│   │   └── layout.tsx           # Settings nested layout
│   │
│   └── layout.tsx               # Dashboard layout (sidebar + header)
│
├── api/                         # API routes
│   ├── webhooks/
│   │   ├── twilio/
│   │   │   └── route.ts
│   │   ├── quickbooks/
│   │   │   └── route.ts
│   │   └── stripe/
│   │       └── route.ts
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # Supabase auth callback
│   └── cron/
│       └── daily-summary/
│           └── route.ts
│
├── actions/                     # Server actions (alternative to app/actions)
│   ├── contacts.ts
│   ├── projects.ts
│   ├── activities.ts
│   └── documents.ts
│
├── layout.tsx                   # Root layout
├── page.tsx                     # Landing page
├── error.tsx
└── global-error.tsx
```

### 3.2 Route Group Layout Examples

#### Authentication Layout

```typescript
// app/(auth)/layout.tsx

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Roofing SaaS</h1>
          <p className="text-gray-600 mt-2">Manage your roofing business</p>
        </div>
        <div className="bg-white rounded-lg shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
```

#### Dashboard Layout with Sidebar

```typescript
// app/(dashboard)/layout.tsx

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layouts/Sidebar'
import { Header } from '@/components/layouts/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth check
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch user organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization:organizations(*)')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} organization={membership?.organization} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

#### Settings Nested Layout

```typescript
// app/(dashboard)/settings/layout.tsx

import { SettingsNav } from '@/components/features/settings/SettingsNav'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="flex gap-8">
        <aside className="w-64 flex-shrink-0">
          <SettingsNav />
        </aside>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### 3.3 Middleware for Authentication and Multi-Tenancy

```typescript
// middleware.ts

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // Protected routes
  const isProtectedRoute = pathname.startsWith('/contacts') ||
                          pathname.startsWith('/projects') ||
                          pathname.startsWith('/pipeline') ||
                          pathname.startsWith('/settings')

  // Redirect to login if not authenticated
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  const isAuthRoute = pathname.startsWith('/login') ||
                     pathname.startsWith('/signup')

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/contacts', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

### 3.4 API Routes

#### Webhook Handler

```typescript
// app/api/webhooks/twilio/route.ts

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Verify Twilio signature
    const headersList = headers()
    const twilioSignature = headersList.get('x-twilio-signature')

    // Parse webhook payload
    const formData = await request.formData()
    const from = formData.get('From')
    const body = formData.get('Body')
    const messageSid = formData.get('MessageSid')

    // Log to database
    const supabase = createServerClient()
    await supabase.from('sms_messages').insert({
      sid: messageSid,
      from_number: from,
      body: body,
      direction: 'inbound',
      status: 'received',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Auth Callback

```typescript
// app/api/auth/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/contacts', request.url))
}
```

---

## 4. Performance Optimization

### 4.1 Image Optimization

#### Responsive Images with next/image

```typescript
// components/features/projects/ProjectPhotoGallery.tsx

import Image from 'next/image'

export function ProjectPhotoGallery({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="relative aspect-square">
          <Image
            src={photo.url}
            alt={photo.caption || 'Project photo'}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover rounded-lg"
            quality={85}
            placeholder="blur"
            blurDataURL={photo.blur_hash}
          />
        </div>
      ))}
    </div>
  )
}
```

#### Priority Images (Above the Fold)

```typescript
// app/(dashboard)/projects/[id]/page.tsx

import Image from 'next/image'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)

  return (
    <div>
      {/* Hero image - loads first */}
      <div className="relative h-96 w-full">
        <Image
          src={project.featured_image}
          alt={project.name}
          fill
          priority // Preload this image
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Rest of content */}
      <div className="container py-8">
        <h1>{project.name}</h1>
      </div>
    </div>
  )
}
```

#### Image Configuration

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
```

### 4.2 Font Optimization

```typescript
// app/layout.tsx

import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}

// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-roboto-mono)'],
      },
    },
  },
}
```

### 4.3 Code Splitting and Dynamic Imports

```typescript
// components/features/projects/ProjectMap.tsx

import dynamic from 'next/dynamic'

// Lazy load heavy map component
const MapView = dynamic(() => import('./MapView'), {
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />,
  ssr: false, // Don't render on server (uses browser APIs)
})

export function ProjectMap({ coordinates }: { coordinates: [number, number] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Project Location</h3>
      <MapView coordinates={coordinates} />
    </div>
  )
}
```

### 4.4 Caching Strategies

#### Data Cache (fetch)

```typescript
// app/(dashboard)/contacts/page.tsx

// Revalidate every hour
async function getContacts() {
  const res = await fetch('https://api.example.com/contacts', {
    next: { revalidate: 3600 },
  })
  return res.json()
}

// Never cache (always fresh)
async function getLiveData() {
  const res = await fetch('https://api.example.com/live', {
    cache: 'no-store',
  })
  return res.json()
}

// Cache indefinitely (static)
async function getStaticData() {
  const res = await fetch('https://api.example.com/static', {
    cache: 'force-cache',
  })
  return res.json()
}
```

#### Route Segment Config

```typescript
// app/(dashboard)/contacts/page.tsx

// Revalidate this page every hour
export const revalidate = 3600

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'

// Or force static rendering
export const dynamic = 'force-static'

export default async function ContactsPage() {
  // Page content
}
```

#### Revalidation in Server Actions

```typescript
// app/actions/contacts.ts
"use server"

import { revalidatePath, revalidateTag } from 'next/cache'

export async function updateContact(id: string, data: UpdateContactData) {
  // Update contact in database
  await supabase
    .from('contacts')
    .update(data)
    .eq('id', id)

  // Revalidate specific paths
  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)

  // Or revalidate by tag
  revalidateTag('contacts')
}
```

#### On-Demand Revalidation API

```typescript
// app/api/revalidate/route.ts

import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { path, secret } = await request.json()

  // Verify secret token
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  revalidatePath(path)

  return NextResponse.json({ revalidated: true, now: Date.now() })
}
```

### 4.5 Route Prefetching

```typescript
// components/features/contacts/ContactCard.tsx

import Link from 'next/link'

export function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link
      href={`/contacts/${contact.id}`}
      prefetch={true} // Prefetch on hover (default)
      className="block p-4 border rounded-lg hover:shadow-lg transition"
    >
      <h3 className="font-semibold">{contact.name}</h3>
      <p className="text-sm text-gray-600">{contact.email}</p>
    </Link>
  )
}
```

### 4.6 Metadata and SEO

```typescript
// app/(dashboard)/contacts/[id]/page.tsx

import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: contact } = await supabase
    .from('contacts')
    .select('name, company')
    .eq('id', params.id)
    .single()

  return {
    title: `${contact.name} - Contacts`,
    description: `Contact details for ${contact.name}${contact.company ? ` at ${contact.company}` : ''}`,
  }
}

export default async function ContactPage({ params }: Props) {
  // Page content
}
```

---

## 5. TypeScript Integration

### 5.1 Database Types from Supabase

```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id wfifizczqvogbcqamnmw > types/database.types.ts
```

```typescript
// types/database.types.ts (generated)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          status: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string
          created_by?: string
        }
      }
      // ... other tables
    }
  }
}
```

### 5.2 Typed Supabase Client

```typescript
// lib/supabase/server.ts

import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export function createServerClient() {
  const cookieStore = cookies()

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 5.3 Type-Safe Server Actions

```typescript
// types/actions.types.ts

import type { Database } from './database.types'

export type Contact = Database['public']['Tables']['contacts']['Row']
export type InsertContact = Database['public']['Tables']['contacts']['Insert']
export type UpdateContact = Database['public']['Tables']['contacts']['Update']

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// app/actions/contacts.ts
"use server"

import { z } from 'zod'
import type { ActionResult, Contact, InsertContact } from '@/types/actions.types'

const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export async function createContact(
  input: z.infer<typeof createContactSchema>
): Promise<ActionResult<Contact>> {
  try {
    const validated = createContactSchema.parse(input)

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const insertData: InsertContact = {
      ...validated,
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create contact' }
  }
}
```

### 5.4 Type-Safe Route Params

```typescript
// types/routes.types.ts

export type PageProps<T extends Record<string, string> = {}> = {
  params: T
  searchParams: { [key: string]: string | string[] | undefined }
}

// app/(dashboard)/contacts/[id]/page.tsx

import type { PageProps } from '@/types/routes.types'

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<{ id: string }>) {
  // params.id is typed as string
  // searchParams is typed

  const contact = await getContact(params.id)

  return <div>{contact.name}</div>
}
```

### 5.5 Custom Type Helpers

```typescript
// types/helpers.types.ts

// Make specific fields required
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Make specific fields optional
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Flatten nested types
export type Flatten<T> = T extends object
  ? { [K in keyof T]: Flatten<T[K]> }
  : T

// Usage example
type Contact = Database['public']['Tables']['contacts']['Row']

// Contact with email required
type ContactWithEmail = RequiredFields<Contact, 'email'>

// Contact for updates (all fields optional except id)
type UpdateContactInput = OptionalFields<
  Omit<Contact, 'created_at' | 'updated_at'>,
  'name' | 'status'
>
```

---

## 6. Supabase Integration Patterns

### 6.1 Authentication

#### Server Component Auth Check

```typescript
// app/(dashboard)/contacts/page.tsx

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function ContactsPage() {
  const supabase = createServerClient()

  // This sends request to Supabase Auth server (secure)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return <div>Welcome {user.email}</div>
}
```

#### Client Component Auth

```typescript
// components/features/auth/LoginForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    router.push('/contacts')
    router.refresh() // Refresh server components
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

### 6.2 Real-Time Subscriptions

```typescript
// components/features/dashboard/LiveActivityFeed.tsx
"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Activity } from '@/types'

export function LiveActivityFeed({ initialActivities }: { initialActivities: Activity[] }) {
  const [activities, setActivities] = useState(initialActivities)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new activities
    const channel = supabase
      .channel('activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
        },
        (payload: RealtimePostgresChangesPayload<Activity>) => {
          setActivities((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div>
      {activities.map((activity) => (
        <div key={activity.id}>{activity.description}</div>
      ))}
    </div>
  )
}

// app/(dashboard)/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { LiveActivityFeed } from '@/components/features/dashboard/LiveActivityFeed'

export default async function DashboardPage() {
  const supabase = createServerClient()

  // Fetch initial data on server
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <h1>Recent Activity</h1>
      <LiveActivityFeed initialActivities={activities || []} />
    </div>
  )
}
```

### 6.3 File Uploads

```typescript
// components/features/projects/PhotoUploader.tsx
"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function PhotoUploader({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    setUploading(true)

    try {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName)

      // Save to database
      const { error: dbError } = await supabase
        .from('project_photos')
        .insert({
          project_id: projectId,
          storage_path: fileName,
          url: urlData.publicUrl,
        })

      if (dbError) throw dbError

      alert('Photo uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <span>Uploading...</span>}
    </div>
  )
}
```

### 6.4 Row Level Security (RLS) Patterns

```sql
-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view contacts in their organization
CREATE POLICY "Users can view org contacts"
ON contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = contacts.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Policy: Users can insert contacts in their organization
CREATE POLICY "Users can create contacts"
ON contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = contacts.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Policy: Only contact creator or admin can update
CREATE POLICY "Users can update own contacts"
ON contacts
FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = contacts.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'owner')
  )
);
```

---

## 7. Production Checklist

### 7.1 Performance

- [ ] Use Server Components by default
- [ ] Add `loading.tsx` for all route segments
- [ ] Implement proper Suspense boundaries for streaming
- [ ] Optimize images with `next/image`
- [ ] Use font optimization with `next/font`
- [ ] Implement proper caching strategies
- [ ] Lazy load heavy components with `dynamic()`
- [ ] Prefetch important routes
- [ ] Use proper `revalidate` values for data fetching

### 7.2 Security

- [ ] Enable RLS on all Supabase tables
- [ ] Always use `supabase.auth.getUser()` (not `getSession()`) in server code
- [ ] Re-authenticate users in all Server Actions
- [ ] Validate all inputs with Zod
- [ ] Implement proper authorization checks
- [ ] Use environment variables for secrets
- [ ] Add CSRF protection (Server Actions have built-in protection)
- [ ] Validate webhook signatures

### 7.3 User Experience

- [ ] Add error boundaries with `error.tsx`
- [ ] Implement proper loading states
- [ ] Use optimistic updates for instant feedback
- [ ] Add success/error toast notifications
- [ ] Implement proper form validation
- [ ] Add loading skeletons
- [ ] Handle offline states for PWA
- [ ] Add proper metadata for SEO

### 7.4 Code Quality

- [ ] Enable TypeScript strict mode
- [ ] Generate types from Supabase
- [ ] Use proper TypeScript types for all functions
- [ ] Implement consistent error handling
- [ ] Add JSDoc comments for complex functions
- [ ] Use proper file organization
- [ ] Follow naming conventions
- [ ] Add unit tests for critical paths

### 7.5 Monitoring

- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Implement analytics (Vercel Analytics, Google Analytics)
- [ ] Monitor Core Web Vitals
- [ ] Set up uptime monitoring
- [ ] Monitor Supabase quota usage
- [ ] Set up log aggregation
- [ ] Create alert rules for errors

---

## Key Takeaways

### 1. **Server Components First**
Use Server Components by default. Only add `"use client"` when you need interactivity, state, or browser APIs.

### 2. **Composition Pattern**
Pass Server Components as children to Client Components to maintain the benefits of server rendering.

### 3. **Streaming & Suspense**
Use `loading.tsx` and `<Suspense>` to stream content and show loading states without blocking the entire page.

### 4. **Type Safety**
Generate types from Supabase and use them throughout your application for end-to-end type safety.

### 5. **Server Actions**
Use Server Actions with Zod validation for type-safe, secure form handling and data mutations.

### 6. **Security First**
Always re-authenticate in Server Actions, validate inputs, and rely on RLS policies for data access.

### 7. **Performance Optimization**
Implement proper caching, optimize images, use font optimization, and lazy load heavy components.

### 8. **Route Organization**
Use route groups for clean URLs and logical separation of public/protected areas.

---

## Additional Resources

- **Official Next.js 14 Documentation**: https://nextjs.org/docs
- **Supabase Next.js Guide**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- **next-safe-action**: https://next-safe-action.dev/
- **Vercel Production Checklist**: https://nextjs.org/docs/pages/guides/production-checklist
- **shadcn/ui Components**: https://ui.shadcn.com/

---

**Document Version**: 1.0
**Last Updated**: October 1, 2025
**Project**: Roofing SaaS CRM
