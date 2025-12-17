import { chromium } from 'playwright';

async function captureError() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE ERROR: ' + msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message + '\n' + err.stack);
  });

  // Login first (auth routes don't have locale prefix)
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(2000);

  // Wait for email input to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', 'fahredin@appalachianstorm.com');
  await page.fill('input[type="password"]', 'Test123!@#');

  // Listen for navigation
  const [response] = await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(e => { console.log('Navigation timeout:', e.message); return null; }),
    page.click('button[type="submit"]')
  ]);

  console.log('Navigation response:', response?.url() || 'none');
  await page.waitForTimeout(2000);
  console.log('After login URL:', page.url());

  // Go to projects (with locale)
  await page.goto('http://localhost:3000/en/projects');
  await page.waitForTimeout(4000);

  console.log('Projects page URL:', page.url());

  // Click first project link
  const projectLink = page.locator('a[href^="/projects/"]').first();
  if (await projectLink.isVisible({ timeout: 5000 })) {
    const href = await projectLink.getAttribute('href');
    console.log('Navigating to:', href);
    await projectLink.click();
    await page.waitForTimeout(5000);
  }

  console.log('\n=== CAPTURED ERRORS ===');
  errors.forEach(e => console.log(e));
  console.log('=== END ERRORS ===\n');

  console.log('Final URL:', page.url());

  // Check for error text on page
  const errorText = await page.locator('text=Dashboard Error').isVisible().catch(() => false);
  if (errorText) {
    const devError = await page.locator('.text-xs.font-mono').textContent().catch(() => 'No dev error');
    console.log('DEV ERROR MESSAGE:', devError);
  }

  await browser.close();
}

captureError().catch(console.error);
