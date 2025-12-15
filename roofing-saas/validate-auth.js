const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔐 Logging in with correct credentials...');
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[type="email"]', 'test@roofingsaas.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ Login SUCCESS - on dashboard');
  } catch (_e) {
    console.log('Current URL:', page.url());
  }
  await page.screenshot({ path: '/tmp/validation-screenshots/10-dashboard.png', fullPage: true });
  
  console.log('📋 Testing Contacts...');
  await page.goto('http://localhost:3000/contacts');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/validation-screenshots/11-contacts.png', fullPage: true });
  
  console.log('📊 Testing Pipeline...');
  await page.goto('http://localhost:3000/projects');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/validation-screenshots/12-pipeline.png', fullPage: true });
  
  console.log('✍️ Testing Signatures...');
  await page.goto('http://localhost:3000/signatures');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/validation-screenshots/13-signatures.png', fullPage: true });
  
  console.log('⚙️ Testing Settings...');
  await page.goto('http://localhost:3000/settings');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/validation-screenshots/14-settings.png', fullPage: true });
  
  console.log('🎤 Testing Voice Assistant...');
  await page.goto('http://localhost:3000/voice-assistant');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/validation-screenshots/15-voice.png', fullPage: true });
  
  await browser.close();
  console.log('\n🎉 Authenticated screenshots saved!');
}

run().catch(e => { console.error(e); process.exit(1); });
