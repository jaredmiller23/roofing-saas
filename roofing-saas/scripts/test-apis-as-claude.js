/**
 * Test APIs as authenticated claude-test user
 * This diagnoses the signatures page issue
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const VERCEL_URL = 'https://roofing-saas.vercel.app';

const TEST_EMAIL = 'claude-test@roofingsaas.com';
const TEST_PASSWORD = 'ClaudeTest2025!Secure';

async function testAPIs() {
  console.log('=== API DIAGNOSTIC TEST ===\n');

  // 1. Sign in via Supabase
  console.log('1. Signing in as', TEST_EMAIL);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError) {
    console.log('   AUTH ERROR:', authError.message);
    return;
  }

  console.log('   SUCCESS - User ID:', authData.user.id);
  console.log('   Access token:', authData.session.access_token.substring(0, 50) + '...');

  // 2. Test Projects API
  console.log('\n2. Testing /api/projects');
  try {
    const projectsRes = await fetch(`${VERCEL_URL}/api/projects?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('   Status:', projectsRes.status);
    const projectsData = await projectsRes.json();
    console.log('   Response:', JSON.stringify(projectsData, null, 2).substring(0, 500));

    if (projectsData.success && projectsData.data?.projects) {
      console.log('   Projects count:', projectsData.data.projects.length);
    }
  } catch (err) {
    console.log('   FETCH ERROR:', err.message);
  }

  // 3. Test Signature Templates API
  console.log('\n3. Testing /api/signature-templates');
  try {
    const templatesRes = await fetch(`${VERCEL_URL}/api/signature-templates?active_only=true`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('   Status:', templatesRes.status);
    const templatesData = await templatesRes.json();
    console.log('   Response:', JSON.stringify(templatesData, null, 2).substring(0, 500));

    if (templatesData.success && templatesData.data?.templates) {
      console.log('   Templates count:', templatesData.data.templates.length);
    }
  } catch (err) {
    console.log('   FETCH ERROR:', err.message);
  }

  // 4. Test Contacts API
  console.log('\n4. Testing /api/contacts');
  try {
    const contactsRes = await fetch(`${VERCEL_URL}/api/contacts?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('   Status:', contactsRes.status);
    const contactsData = await contactsRes.json();
    console.log('   Response:', JSON.stringify(contactsData, null, 2).substring(0, 500));
  } catch (err) {
    console.log('   FETCH ERROR:', err.message);
  }

  // 5. Check which tenant this user is in
  console.log('\n5. Checking tenant association');
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', authData.user.id);

  console.log('   Tenant associations:', tenantUsers);

  // Sign out
  await supabase.auth.signOut();
  console.log('\n=== DONE ===');
}

testAPIs().catch(console.error);
