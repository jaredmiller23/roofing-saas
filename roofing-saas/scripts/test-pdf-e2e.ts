/**
 * E2E test for PDF generation through signature document creation
 * This script uses Playwright to test the full flow with authentication
 */

import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test credentials
dotenv.config({ path: path.join(__dirname, '../.env.test') });

const PROD_URL = 'https://roofing-saas.vercel.app';
const TEST_EMAIL = 'claude-test@roofingsaas.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'ClaudeTest2025!Secure';

// Template with HTML content
const TEMPLATE_ID = 'de4a8c2f-925e-4fd9-a354-dda02f54d634'; // Limited Workmanship Warranty

async function testPdfGeneration() {
  console.log('🚀 Starting PDF generation E2E test');
  console.log(`   Environment: ${PROD_URL}`);
  console.log(`   User: ${TEST_EMAIL}`);
  console.log(`   Template: ${TEMPLATE_ID}`);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 30000 });
    console.log('   ✅ Logged in successfully');

    // Step 2: Navigate to signatures
    console.log('2. Navigating to signatures...');
    await page.goto(`${PROD_URL}/dashboard/signatures/new`, { waitUntil: 'networkidle' });
    console.log('   ✅ On signature creation page');

    // Step 3: Create signature document with template
    console.log('3. Creating signature document with template...');

    // Fill in the form
    const titleInput = await page.$('input[name="title"]');
    if (titleInput) {
      await titleInput.fill(`Test PDF Gen ${Date.now()}`);
    }

    // Select template if dropdown exists
    const templateSelect = await page.$('select[name="template_id"], [data-testid="template-select"]');
    if (templateSelect) {
      await templateSelect.selectOption(TEMPLATE_ID);
    }

    // Select document type
    const docTypeSelect = await page.$('select[name="document_type"]');
    if (docTypeSelect) {
      await docTypeSelect.selectOption('contract');
    }

    // Submit form
    const submitBtn = await page.$('button[type="submit"], button:has-text("Create")');
    if (submitBtn) {
      // Listen for API response
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/signature-documents') && response.request().method() === 'POST',
        { timeout: 120000 }
      );

      await submitBtn.click();

      console.log('   ⏳ Waiting for document creation (this may take 60+ seconds for PDF generation)...');
      const response = await responsePromise;
      const data = await response.json();

      console.log('');
      console.log('=== API Response ===');
      console.log(JSON.stringify(data, null, 2));
      console.log('');

      if (data.success && data.data?.document) {
        const doc = data.data.document;
        console.log('📄 Document Created:');
        console.log(`   ID: ${doc.id}`);
        console.log(`   Title: ${doc.title}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   File URL: ${doc.file_url || '❌ NULL - PDF generation failed'}`);

        if (doc.file_url) {
          console.log('');
          console.log('✅ PDF GENERATION SUCCESS!');
          console.log(`   PDF URL: ${doc.file_url}`);
        } else {
          console.log('');
          console.log('❌ PDF GENERATION FAILED - file_url is null');
        }
      } else {
        console.log('❌ Document creation failed:');
        console.log(JSON.stringify(data, null, 2));
      }
    } else {
      console.log('   ❌ Could not find submit button');
      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/pdf-test-form.png' });
      console.log('   Screenshot saved to /tmp/pdf-test-form.png');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: '/tmp/pdf-test-error.png' });
    console.log('Screenshot saved to /tmp/pdf-test-error.png');
  } finally {
    await browser.close();
  }
}

testPdfGeneration().catch(console.error);
