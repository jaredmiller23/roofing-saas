import { test, expect } from '@playwright/test'

test.describe('Production Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login to production
    await page.goto('https://roofing-saas.vercel.app/login')
    await page.fill('input[type="email"]', 'demo@roofingsaas.com')
    await page.fill('input[type="password"]', 'Demo2025!')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
  })

  test('SMS endpoint is configured', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch('https://roofing-saas.vercel.app/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '+15551234567', body: 'Test from production validation' }),
        credentials: 'include'
      })
      return { status: response.status, body: await response.json() }
    })
    
    console.log('SMS Test Result:', JSON.stringify(result, null, 2))
    expect(result.status).not.toBe(401)
  })

  test('Email endpoint is configured', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch('https://roofing-saas.vercel.app/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'test@example.com', subject: 'Test', body: 'Test from production validation' }),
        credentials: 'include'
      })
      return { status: response.status, body: await response.json() }
    })
    
    console.log('Email Test Result:', JSON.stringify(result, null, 2))
    expect(result.status).not.toBe(401)
  })

  test('Voice session endpoint is configured', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch('https://roofing-saas.vercel.app/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include'
      })
      return { status: response.status, body: await response.json() }
    })
    
    console.log('Voice Session Test Result:', JSON.stringify(result, null, 2))
    expect(result.status).not.toBe(401)
  })
})
