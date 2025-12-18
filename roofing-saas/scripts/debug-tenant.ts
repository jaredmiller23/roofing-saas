import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load env
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  'https://wfifizczqvogbcqamnmw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function checkJaredTenant() {
  // Find Jared's user ID
  const { data: userData } = await supabase.auth.admin.listUsers()
  const jared = userData?.users.find(u => u.email === 'jaredmiller23@yahoo.com')

  if (!jared) {
    console.log('Jared not found')
    return
  }

  console.log('Jared User ID:', jared.id)

  // Get his tenant memberships
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('tenant_id, status, joined_at, tenants(name)')
    .eq('user_id', jared.id)
    .order('joined_at', { ascending: false })

  console.log('\nTenant memberships (most recent first):')
  tenantUsers?.forEach(tu => {
    console.log(`  - ${(tu.tenants as any)?.name || tu.tenant_id}`)
    console.log(`    Status: ${tu.status}, Joined: ${tu.joined_at}`)
  })

  // Check what getUserTenantId would return (most recent)
  const mostRecent = tenantUsers?.[0]
  console.log('\ngetUserTenantId would return:', (mostRecent?.tenants as any)?.name || mostRecent?.tenant_id)

  // Check territories in each tenant
  for (const tu of tenantUsers || []) {
    const { data: territories, count } = await supabase
      .from('territories')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tu.tenant_id)
      .eq('is_deleted', false)

    console.log(`\nTerritories in ${(tu.tenants as any)?.name || tu.tenant_id}: ${count}`)
  }

  // Check signature templates in each tenant
  for (const tu of tenantUsers || []) {
    const { data: templates, count } = await supabase
      .from('signature_templates')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tu.tenant_id)

    console.log(`Signature templates in ${(tu.tenants as any)?.name || tu.tenant_id}: ${count}`)
  }
}

checkJaredTenant().catch(console.error)
