#!/usr/bin/env npx tsx
/**
 * Seed Demo Storm Data for Storm Intelligence Feature
 *
 * Creates realistic Tennessee storm events and alerts for testing
 * the Storm Tracking dashboard.
 *
 * Usage:
 *   npx tsx scripts/seed-storm-demo.ts
 *
 * Or with NAS connection:
 *   SUPABASE_URL=https://api.jobclarity.io \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/seed-storm-demo.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set environment variables or run with:')
  console.error('  SUPABASE_URL=https://api.jobclarity.io SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-storm-demo.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Use Fahredin's user ID (owner of Appalachian Storm Restoration)
// Note: storm_events and storm_alerts use user_id as tenant_id (references auth.users)
const USER_ID = '991df082-00af-44d6-83e6-a03c1bbf0ffc' // fahredin@goappsr.com

// Demo storm events - realistic Tennessee storms
const DEMO_STORMS = [
  {
    noaa_event_id: 'DEMO-2026-001',
    event_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
    event_type: 'hail',
    magnitude: 1.75, // Golf ball size hail
    state: 'TN',
    county: 'Knox',
    city: 'Knoxville',
    latitude: 35.9606,
    longitude: -83.9207,
    path_length: 8.5,
    path_width: 1.2,
    property_damage: 750000,
    injuries: 0,
    deaths: 0,
    event_narrative: 'Large hail up to 1.75 inches in diameter was reported across Knox County. Multiple residential structures sustained roof damage. Storm moved northeast at 45 mph.',
    episode_narrative: 'A strong cold front pushed through East Tennessee producing severe thunderstorms with large hail and damaging winds.',
  },
  {
    noaa_event_id: 'DEMO-2026-002',
    event_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
    event_type: 'thunderstorm_wind',
    magnitude: 70, // 70 mph winds
    state: 'TN',
    county: 'Hamilton',
    city: 'Chattanooga',
    latitude: 35.0456,
    longitude: -85.3097,
    path_length: 12.3,
    path_width: 0.8,
    property_damage: 350000,
    injuries: 2,
    deaths: 0,
    event_narrative: 'Severe thunderstorm winds estimated at 70 mph caused widespread tree damage and power outages. Several structures reported roof damage from falling trees.',
    episode_narrative: 'A squall line ahead of an approaching cold front produced damaging winds across the Chattanooga metro area.',
  },
  {
    noaa_event_id: 'DEMO-2026-003',
    event_date: new Date().toISOString().split('T')[0], // Today
    event_type: 'hail',
    magnitude: 2.0, // Hen egg size hail
    state: 'TN',
    county: 'Davidson',
    city: 'Nashville',
    latitude: 36.1627,
    longitude: -86.7816,
    path_length: 15.0,
    path_width: 2.5,
    property_damage: 2500000,
    injuries: 5,
    deaths: 0,
    event_narrative: 'Significant hail event with stones up to 2 inches in diameter reported across Davidson County. Extensive damage to vehicles and roofing materials. This is an ACTIVE storm requiring immediate attention.',
    episode_narrative: 'A supercell thunderstorm developed ahead of a dryline and produced very large hail across the Nashville metropolitan area.',
  },
]

// Demo alerts linked to the storms
const createDemoAlerts = (stormEventIds: string[]) => [
  {
    tenant_id: USER_ID,
    type: 'storm_approaching',
    priority: 'high',
    storm_event_id: stormEventIds[2], // Nashville storm (today)
    message: 'ACTIVE: Large hail storm impacting Nashville area. 2" hail reported. Immediate customer outreach recommended.',
    action_items: [
      'Contact all customers in Davidson County',
      'Activate Storm Response Mode',
      'Pre-position crews in Nashville area',
      'Prepare damage assessment teams',
    ],
    affected_area: {
      center: { lat: 36.1627, lng: -86.7816 },
      radius: 15,
      counties: ['Davidson', 'Williamson', 'Rutherford'],
    },
    dismissed: false,
    acknowledged_by: [],
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
  },
  {
    tenant_id: USER_ID,
    type: 'hail_detected', // Valid type: storm_approaching, storm_active, hail_detected, high_winds, tornado_warning
    priority: 'medium',
    storm_event_id: stormEventIds[0], // Knoxville storm (2 days ago)
    message: 'Knox County hail damage assessment: 45+ properties likely affected. Follow-up recommended.',
    action_items: [
      'Review existing customers in Knox County',
      'Schedule damage inspections',
      'Prepare insurance claim documentation',
    ],
    affected_area: {
      center: { lat: 35.9606, lng: -83.9207 },
      radius: 10,
      counties: ['Knox'],
    },
    dismissed: false,
    acknowledged_by: [],
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
  },
]

async function seedStormData() {
  console.log('🌩️  Seeding Demo Storm Data')
  console.log('=' .repeat(50))
  console.log(`📍 Supabase: ${supabaseUrl}`)
  console.log(`🏢 Tenant: ${USER_ID}`)
  console.log('')

  // First, clean up any existing demo data
  console.log('🧹 Cleaning up existing demo data...')

  const { error: cleanupAlertsError } = await supabase
    .from('storm_alerts')
    .delete()
    .like('message', '%DEMO%')

  const { error: cleanupEventsError } = await supabase
    .from('storm_events')
    .delete()
    .like('noaa_event_id', 'DEMO-%')

  if (cleanupAlertsError) {
    console.warn('Warning cleaning alerts:', cleanupAlertsError.message)
  }
  if (cleanupEventsError) {
    console.warn('Warning cleaning events:', cleanupEventsError.message)
  }

  // Insert storm events
  console.log('\n📊 Inserting storm events...')
  const stormEventIds: string[] = []

  for (const storm of DEMO_STORMS) {
    const { data, error } = await supabase
      .from('storm_events')
      .insert({
        tenant_id: USER_ID,
        ...storm,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`❌ Failed to insert ${storm.city} storm:`, error.message)
      continue
    }

    stormEventIds.push(data.id)
    console.log(`✅ ${storm.city} ${storm.event_type} (${storm.event_date}) - ID: ${data.id.slice(0, 8)}...`)
  }

  if (stormEventIds.length === 0) {
    console.error('❌ No storm events were created')
    process.exit(1)
  }

  // Insert alerts
  console.log('\n🚨 Inserting storm alerts...')
  const alerts = createDemoAlerts(stormEventIds)

  for (const alert of alerts) {
    const { data, error } = await supabase
      .from('storm_alerts')
      .insert(alert)
      .select('id')
      .single()

    if (error) {
      console.error(`❌ Failed to insert alert:`, error.message)
      continue
    }

    console.log(`✅ Alert: ${alert.type} (${alert.priority}) - ID: ${data.id.slice(0, 8)}...`)
  }

  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📊 SUMMARY')
  console.log('=' .repeat(50))
  console.log(`✅ Storm Events: ${stormEventIds.length}`)
  console.log(`✅ Alerts: ${alerts.length}`)
  console.log('')
  console.log('🎯 Next Steps:')
  console.log('1. Navigate to /storm-tracking in the app')
  console.log('2. You should see the demo storms on the map')
  console.log('3. Check the Alerts panel for active alerts')
  console.log('4. Test acknowledge/dismiss functionality')
  console.log('5. Test Response Mode activation')
  console.log('')
  console.log('🧹 To clean up demo data, run this script again (it clears existing demo data first)')
}

seedStormData().catch(console.error)
