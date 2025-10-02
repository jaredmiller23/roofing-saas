/**
 * Seed Demo Activities
 *
 * Creates realistic activity data for dashboard demo:
 * - Door knocks, calls, emails, notes
 * - Distributed across last 30 days
 * - Linked to real contacts and projects
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Contact {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  tenant_id: string
  contact_id: string
}

interface User {
  id: string
}

const activityTypes = ['door_knock', 'call', 'email', 'note', 'meeting']
const activitySubjects = {
  door_knock: [
    'Initial door knock',
    'Follow-up visit',
    'Property assessment',
    'Left business card',
    'Scheduled callback'
  ],
  call: [
    'Initial contact call',
    'Follow-up call',
    'Quote discussion',
    'Scheduling call',
    'Check-in call'
  ],
  email: [
    'Sent initial quote',
    'Follow-up email',
    'Sent project timeline',
    'Contract sent',
    'Thank you email'
  ],
  note: [
    'Customer interested in full replacement',
    'Requested callback next week',
    'Budget concerns discussed',
    'Competitor quote mentioned',
    'Ready to move forward'
  ],
  meeting: [
    'In-person consultation',
    'Site inspection',
    'Contract signing',
    'Project kickoff',
    'Final walkthrough'
  ]
}

async function main() {
  console.log('🚀 Starting activity seeding...\n')

  // Get first user for created_by
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('user_id')
    .limit(1)

  if (!tenantUsers || tenantUsers.length === 0) {
    console.error('❌ No users found')
    return
  }

  const userId = tenantUsers[0].user_id
  console.log(`👤 Using user: ${userId}`)

  // Get contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, tenant_id, first_name, last_name')
    .eq('is_deleted', false)
    .limit(100)

  if (!contacts || contacts.length === 0) {
    console.error('❌ No contacts found')
    return
  }

  console.log(`📇 Found ${contacts.length} contacts`)

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, tenant_id, contact_id')
    .eq('is_deleted', false)
    .limit(50)

  console.log(`📊 Found ${projects?.length || 0} projects\n`)

  // Generate activities for last 30 days
  const activities = []
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Door knocks: 15-25 per day (450-750 total)
  const doorsPerDay = 20
  for (let day = 0; day < 30; day++) {
    const date = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000)

    for (let i = 0; i < doorsPerDay; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)]
      const randomHour = 9 + Math.floor(Math.random() * 9) // 9am-6pm
      const randomMinute = Math.floor(Math.random() * 60)

      date.setHours(randomHour, randomMinute, 0, 0)

      activities.push({
        tenant_id: contact.tenant_id,
        contact_id: contact.id,
        project_id: null,
        type: 'door_knock',
        subject: activitySubjects.door_knock[Math.floor(Math.random() * activitySubjects.door_knock.length)],
        content: `Visited ${contact.first_name} ${contact.last_name} at property`,
        created_by: userId,
        created_at: date.toISOString(),
      })
    }
  }

  // Calls: 10-15 per day (300-450 total)
  const callsPerDay = 12
  for (let day = 0; day < 30; day++) {
    const date = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000)

    for (let i = 0; i < callsPerDay; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)]
      const project = projects?.find(p => p.contact_id === contact.id) || null
      const randomHour = 9 + Math.floor(Math.random() * 9)
      const randomMinute = Math.floor(Math.random() * 60)

      date.setHours(randomHour, randomMinute, 0, 0)

      activities.push({
        tenant_id: contact.tenant_id,
        contact_id: contact.id,
        project_id: project?.id || null,
        type: 'call',
        subject: activitySubjects.call[Math.floor(Math.random() * activitySubjects.call.length)],
        content: `Called ${contact.first_name} ${contact.last_name}`,
        created_by: userId,
        created_at: date.toISOString(),
      })
    }
  }

  // Emails: 8-12 per day (240-360 total)
  const emailsPerDay = 10
  for (let day = 0; day < 30; day++) {
    const date = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000)

    for (let i = 0; i < emailsPerDay; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)]
      const project = projects?.find(p => p.contact_id === contact.id) || null
      const randomHour = 8 + Math.floor(Math.random() * 10)
      const randomMinute = Math.floor(Math.random() * 60)

      date.setHours(randomHour, randomMinute, 0, 0)

      activities.push({
        tenant_id: contact.tenant_id,
        contact_id: contact.id,
        project_id: project?.id || null,
        type: 'email',
        subject: activitySubjects.email[Math.floor(Math.random() * activitySubjects.email.length)],
        content: `Sent email to ${contact.first_name} ${contact.last_name}`,
        created_by: userId,
        created_at: date.toISOString(),
      })
    }
  }

  // Notes: 5-8 per day (150-240 total)
  const notesPerDay = 6
  for (let day = 0; day < 30; day++) {
    const date = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000)

    for (let i = 0; i < notesPerDay; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)]
      const project = projects?.find(p => p.contact_id === contact.id) || null
      const randomHour = 9 + Math.floor(Math.random() * 9)
      const randomMinute = Math.floor(Math.random() * 60)

      date.setHours(randomHour, randomMinute, 0, 0)

      activities.push({
        tenant_id: contact.tenant_id,
        contact_id: contact.id,
        project_id: project?.id || null,
        type: 'note',
        subject: activitySubjects.note[Math.floor(Math.random() * activitySubjects.note.length)],
        content: `Note about ${contact.first_name} ${contact.last_name}`,
        created_by: userId,
        created_at: date.toISOString(),
      })
    }
  }

  console.log(`📝 Generated ${activities.length} activities`)
  console.log(`   • Door Knocks: ${activities.filter(a => a.type === 'door_knock').length}`)
  console.log(`   • Calls: ${activities.filter(a => a.type === 'call').length}`)
  console.log(`   • Emails: ${activities.filter(a => a.type === 'email').length}`)
  console.log(`   • Notes: ${activities.filter(a => a.type === 'note').length}\n`)

  // Insert in batches of 500
  const batchSize = 500
  for (let i = 0; i < activities.length; i += batchSize) {
    const batch = activities.slice(i, i + batchSize)

    const { error } = await supabase
      .from('activities')
      .insert(batch)

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message)
    } else {
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} activities)`)
    }
  }

  console.log('\n✅ Activity seeding complete!')
  console.log('\n📊 Dashboard metrics should now display:')
  console.log('   • Doors knocked per day: ~20')
  console.log('   • Active calls: ~12/day')
  console.log('   • Emails sent: ~10/day')
  console.log('   • Activity trends for last 7 days')
  console.log('   • Total activities: ~' + activities.length)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
