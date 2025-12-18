const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  let context;
  
  try {
    context = await browser.newContext({
      storageState: 'playwright/.auth/user.json'
    });
  } catch (e) {
    console.log('No auth state, using fresh context');
    context = await browser.newContext();
  }
  
  const page = await context.newPage();

  console.log('Testing signatures feature...\n');

  // Test 1: Templates page loads and shows templates
  console.log('1. Testing /signatures/templates page...');
  try {
    await page.goto('http://localhost:3000/signatures/templates', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/templates-page.png' });
    console.log('   Screenshot saved to test-results/templates-page.png');
    
    // Check for template content
    const pageContent = await page.content();
    const hasAOB = pageContent.includes('Authorization of Insured') || pageContent.includes('AOB');
    const hasContract = pageContent.includes('Residential Roofing') || pageContent.includes('Contract');
    const hasTemplates = pageContent.includes('template') || pageContent.includes('Template');
    
    console.log('   Has AOB mention:', hasAOB);
    console.log('   Has Contract mention:', hasContract);
    console.log('   Has template mentions:', hasTemplates);
    
    if (hasAOB || hasContract) {
      console.log('   ✓ Templates appear to be loaded\n');
    } else {
      console.log('   ⚠ Templates may not be visible yet\n');
    }
  } catch (e) {
    console.log('   Error:', e.message, '\n');
  }

  // Test 2: Signatures main page
  console.log('2. Testing /signatures page...');
  try {
    await page.goto('http://localhost:3000/signatures', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/signatures-page.png' });
    console.log('   Screenshot saved to test-results/signatures-page.png');
    console.log('   URL:', page.url());
    console.log('   ✓ Page loaded\n');
  } catch (e) {
    console.log('   Error:', e.message, '\n');
  }

  console.log('Testing complete! Check test-results/ for screenshots.');
  
  await browser.close();
})();
