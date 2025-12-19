import { chromium } from '@playwright/test';

const PROD_URL = 'https://roofing-saas.vercel.app';
const TEST_EMAIL = 'claude-test@roofingsaas.com';
const TEST_PASSWORD = 'ClaudeTest2025!Secure';
const TEMPLATE_ID = 'de4a8c2f-925e-4fd9-a354-dda02f54d634';

async function test() {
  console.log('🚀 Testing PDF generation on production');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log('1. Logging in...');
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 });
    console.log('   ✅ Logged in to:', page.url());

    // Navigate to signatures/new to get proper session
    console.log('2. Navigating to dashboard...');
    await page.goto(`${PROD_URL}/dashboard/signatures`);
    await page.waitForLoadState('networkidle');

    // Create signature document via API using page.evaluate to make request with session
    console.log('3. Creating signature document via API...');
    const result = await page.evaluate(async (templateId) => {
      const response = await fetch('/api/signature-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Test PDF Gen ${Date.now()}`,
          document_type: 'contract',
          template_id: templateId
        })
      });
      return await response.json();
    }, TEMPLATE_ID);

    console.log('');
    console.log('=== API Response ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (result.success && result.data) {
      const doc = result.data.document;
      console.log('📄 Document Created:');
      console.log(`   ID: ${doc?.id}`);
      console.log(`   Title: ${doc?.title}`);
      console.log(`   File URL: ${doc?.file_url || '❌ NULL'}`);

      if (result.data.pdf_generation_error) {
        console.log('');
        console.log('🔴 PDF Generation Error:');
        console.log(`   ${result.data.pdf_generation_error}`);
      } else if (!doc?.file_url) {
        console.log('');
        console.log('⚠️  No file_url and no error - PDF might have failed silently');
      }
    } else {
      console.log('❌ Request failed:', result.error);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

test();
