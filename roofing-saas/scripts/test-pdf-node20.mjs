import { chromium } from '@playwright/test';

const PROD_URL = 'https://roofing-saas.vercel.app';
const TEST_EMAIL = 'claude-test@roofingsaas.com';
const TEST_PASSWORD = 'ClaudeTest2025!Secure';
const TEMPLATE_ID = 'de4a8c2f-925e-4fd9-a354-dda02f54d634';

async function test() {
  console.log('🚀 Testing PDF generation with Node 20');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Logging in...');
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 });
    console.log('   ✅ Logged in');

    console.log('2. Navigating to signatures...');
    await page.goto(`${PROD_URL}/dashboard/signatures`);
    await page.waitForLoadState('networkidle');

    console.log('3. Creating signature document with template...');
    const result = await page.evaluate(async (templateId) => {
      try {
        const response = await fetch('/api/signature-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `PDF Test ${Date.now()}`,
            document_type: 'contract',
            template_id: templateId
          })
        });
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return { error: text.substring(0, 500) };
        }
      } catch (e) {
        return { error: e.message };
      }
    }, TEMPLATE_ID);

    console.log('');
    if (result.success && result.data) {
      const doc = result.data.document;
      if (doc?.file_url) {
        console.log('✅ PDF GENERATION SUCCESS!');
        console.log(`   Title: ${doc.title}`);
        console.log(`   PDF URL: ${doc.file_url}`);
      } else if (result.data.pdf_generation_error) {
        console.log('❌ PDF GENERATION FAILED');
        console.log(`   Error: ${result.data.pdf_generation_error.split('\n')[0]}`);
      } else {
        console.log('⚠️  Document created but no PDF');
        console.log(`   ID: ${doc?.id}`);
      }
    } else {
      console.log('❌ API Error:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
