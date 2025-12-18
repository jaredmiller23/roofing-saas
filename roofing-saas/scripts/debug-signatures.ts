import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  'https://wfifizczqvogbcqamnmw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function checkSignatures() {
  // Check templates in each tenant
  const { data: templates, error: templatesError } = await supabase
    .from('signature_templates')
    .select('id, name, tenant_id, pdf_template_url, signature_fields, tenants(name)')

  console.log('=== SIGNATURE TEMPLATES ===')
  if (templatesError) {
    console.log('ERROR:', templatesError.message)
  } else if (!templates || templates.length === 0) {
    console.log('NO TEMPLATES FOUND IN DATABASE')
  } else {
    templates.forEach(t => {
      console.log(`\nTemplate: ${t.name}`)
      console.log(`  Tenant: ${(t.tenants as any)?.name || t.tenant_id}`)
      console.log(`  PDF URL: ${t.pdf_template_url || 'NONE'}`)
      const fieldsStr = JSON.stringify(t.signature_fields)
      console.log(`  Fields: ${fieldsStr && fieldsStr.length > 2 ? fieldsStr : 'NONE'}`)
    })
  }

  // Check documents
  const { data: docs, error: docsError } = await supabase
    .from('signature_documents')
    .select('id, title, status, tenant_id, tenants(name)')
    .limit(10)

  console.log('\n=== SIGNATURE DOCUMENTS ===')
  if (docsError) {
    console.log('ERROR:', docsError.message)
  } else if (!docs || docs.length === 0) {
    console.log('NO DOCUMENTS FOUND IN DATABASE')
  } else {
    docs.forEach(d => {
      console.log(`\nDocument: ${d.title}`)
      console.log(`  Status: ${d.status}`)
      console.log(`  Tenant: ${(d.tenants as any)?.name || d.tenant_id}`)
    })
  }

  // Check Supabase storage for PDFs
  console.log('\n=== STORAGE BUCKETS ===')
  const { data: buckets } = await supabase.storage.listBuckets()
  buckets?.forEach(b => {
    console.log(`Bucket: ${b.name} (public: ${b.public})`)
  })

  // Check signature-templates bucket contents
  const { data: files, error: filesError } = await supabase.storage
    .from('signature-templates')
    .list('', { limit: 20 })

  console.log('\n=== FILES IN signature-templates BUCKET ===')
  if (filesError) {
    console.log('ERROR:', filesError.message)
  } else if (!files || files.length === 0) {
    console.log('NO FILES IN BUCKET')
  } else {
    files.forEach(f => {
      console.log(`  ${f.name} (${f.metadata?.size || 'unknown size'})`)
    })
  }
}

checkSignatures().catch(console.error)
