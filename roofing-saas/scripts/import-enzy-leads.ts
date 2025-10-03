/**
 * Enzy Leads Import Script
 *
 * Imports lead data from Enzy JSON files into Supabase database
 * Creates contacts, projects, and events from Enzy lead data
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

// Initialize Supabase client with service role (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Define types
interface EnzyLead {
  customerName: string
  setter: string
  closer: string
  address: string
  appointment: string
  team: string
  leadStatus: string
}

interface ParsedAddress {
  street: string
  city: string
  state: string
  zip: string
}

interface ImportStats {
  totalLeads: number
  contactsCreated: number
  projectsCreated: number
  eventsCreated: number
  errors: Array<{ lead: string; error: string }>
}

// Tenant ID for Appalachian Storm Restoration
const TENANT_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Parse full address string into components
 */
function parseAddress(address: string): ParsedAddress {
  // Format: "244 Stone Edge Cir, Kingsport, TN 37660, USA"
  const parts = address.split(',').map((p) => p.trim())

  return {
    street: parts[0] || '',
    city: parts[1] || '',
    state: parts[2]?.split(' ')[0] || '',
    zip: parts[2]?.split(' ')[1] || '',
  }
}

/**
 * Parse Enzy appointment format to ISO timestamp
 * Format: "Wed, Oct 01 04:30PM"
 */
function parseAppointmentDate(appointmentStr: string): string {
  try {
    // Extract components
    const parts = appointmentStr.replace(',', '').split(' ')
    const month = parts[1]
    const day = parts[2]
    const timeStr = parts[3]

    // Parse time
    const isPM = timeStr.includes('PM')
    const timeOnly = timeStr.replace('AM', '').replace('PM', '')
    const [hours, minutes] = timeOnly.split(':').map((n) => parseInt(n))
    const hour24 = isPM && hours !== 12 ? hours + 12 : hours === 12 && !isPM ? 0 : hours

    // Map month names to numbers
    const monthMap: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    }

    const monthNum = monthMap[month] || '01'
    const year = '2025'

    // Construct ISO string
    const isoDate = `${year}-${monthNum}-${day.padStart(2, '0')}T${hour24
      .toString()
      .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00-04:00`

    return isoDate
  } catch (error) {
    console.error('Error parsing appointment date:', appointmentStr, error)
    return new Date().toISOString()
  }
}

/**
 * Map Enzy lead status to project stage
 */
function mapLeadStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'IRA Signed': 'customer',
    'Inspection No Damage': 'lost',
    'Appointment Schedule...': 'active',
    'Following Up': 'active',
    'Sold': 'customer',
    'Lost': 'lost',
  }

  return statusMap[status] || 'lead'
}

/**
 * Find user by name
 */
async function findUserByName(name: string): Promise<string | null> {
  if (name === 'Unassigned' || !name) {
    return null
  }

  const { data: users } = await supabase.auth.admin.listUsers()

  const existingUser = users.users.find((u) => {
    const fullName = u.user_metadata?.full_name || ''
    return fullName.toLowerCase() === name.toLowerCase()
  })

  if (existingUser) {
    return existingUser.id
  }

  console.log(`User not found: ${name}`)
  return null
}

/**
 * Import a single lead
 */
async function importLead(lead: EnzyLead, stats: ImportStats): Promise<void> {
  try {
    console.log(`\nImporting: ${lead.customerName}`)

    const parsedAddr = parseAddress(lead.address)
    const setterId = await findUserByName(lead.setter)
    const closerId = await findUserByName(lead.closer)

    // 1. Create/find contact
    // Split name into first and last
    const nameParts = lead.customerName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Check for existing contact by address (more reliable than name)
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('address_street', parsedAddr.street)
      .eq('address_city', parsedAddr.city)
      .single()

    let contactId: string

    if (existingContact) {
      console.log('  - Contact already exists')
      contactId = existingContact.id
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: TENANT_ID,
          first_name: firstName,
          last_name: lastName,
          address_street: parsedAddr.street,
          address_city: parsedAddr.city,
          address_state: parsedAddr.state,
          address_zip: parsedAddr.zip,
          type: 'lead',
          source: 'enzy_import',
          tags: [lead.team],
        })
        .select()
        .single()

      if (contactError) throw contactError

      contactId = newContact.id
      stats.contactsCreated++
      console.log('  ✅ Contact created')
    }

    // 2. Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        tenant_id: TENANT_ID,
        contact_id: contactId,
        name: `${lead.customerName} - ${parsedAddr.street}`,
        type: 'residential',
        status: mapLeadStatus(lead.leadStatus),
        custom_fields: {
          setter: lead.setter,
          closer: lead.closer,
          setterId: setterId,
          closerId: closerId,
          original_status: lead.leadStatus,
          team: lead.team,
          source: 'enzy_import',
        },
      })
      .select()
      .single()

    if (projectError) throw projectError

    stats.projectsCreated++
    console.log('  ✅ Project created')

    // 3. Create event
    const appointmentDate = parseAppointmentDate(lead.appointment)
    const startDate = new Date(appointmentDate)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour later

    const { error: eventError } = await supabase.from('events').insert({
      tenant_id: TENANT_ID,
      contact_id: contactId,
      project_id: project.id,
      title: `Appointment - ${lead.customerName}`,
      description: `Enzy appointment\nSetter: ${lead.setter}\nCloser: ${lead.closer}\nStatus: ${lead.leadStatus}`,
      event_type: 'appointment',
      start_at: appointmentDate,
      end_at: endDate.toISOString(),
      organizer: closerId || setterId,
      location: lead.address,
    })

    if (eventError) throw eventError

    stats.eventsCreated++
    console.log('  ✅ Event created')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error(`  ❌ Error:`, errorMessage)
    stats.errors.push({
      lead: lead.customerName,
      error: errorMessage,
    })
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Enzy Leads Import\n')

  const stats: ImportStats = {
    totalLeads: 0,
    contactsCreated: 0,
    projectsCreated: 0,
    eventsCreated: 0,
    errors: [],
  }

  try {
    const filePath = join(process.cwd(), '..', 'Enzy Leads', 'ASR-Leads-ALL.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    const leads: EnzyLead[] = data.leads || []
    stats.totalLeads = leads.length

    console.log(`📊 Found ${stats.totalLeads} leads to import\n`)

    for (const lead of leads) {
      await importLead(lead, stats)
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Leads:      ${stats.totalLeads}`)
    console.log(`Contacts Created: ${stats.contactsCreated}`)
    console.log(`Projects Created: ${stats.projectsCreated}`)
    console.log(`Events Created:   ${stats.eventsCreated}`)
    console.log(`Errors:           ${stats.errors.length}`)

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      stats.errors.forEach((err) => {
        console.log(`  - ${err.lead}: ${err.error}`)
      })
    }

    console.log('\n✅ Import complete!')
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

main()
