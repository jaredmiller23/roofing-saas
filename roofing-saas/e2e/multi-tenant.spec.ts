/**
 * Multi-Tenant Isolation E2E Tests
 * Tests that tenant data is properly isolated and RLS policies work
 */

import { test, expect } from '@playwright/test'
import { login } from './utils/test-helpers'

test.describe('Multi-Tenant Isolation', () => {
  // Test data for two different tenants
  const tenant1User = {
    email: 'user1@tenant1.com',
    password: 'tenant1password'
  }

  const tenant2User = {
    email: 'user2@tenant2.com',
    password: 'tenant2password'
  }

  test('should isolate contacts between tenants', async ({ page, context }) => {
    // Login as tenant 1 user
    await login(page, tenant1User.email, tenant1User.password)

    // Create a contact as tenant 1
    await page.goto('/contacts')
    await page.click('text=New Contact')
    await page.fill('input[name="first_name"]', 'Tenant1')
    await page.fill('input[name="last_name"]', 'Contact')
    await page.fill('input[name="email"]', 'contact@tenant1.com')
    await page.click('button:has-text("Save")')

    // Get contact ID from URL
    await page.waitForURL(/\/contacts\/[a-f0-9-]+/)
    const tenant1ContactId = page.url().split('/').pop()

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')

    // Login as tenant 2 user in the same context
    await login(page, tenant2User.email, tenant2User.password)

    // Try to access tenant 1's contact directly
    const response = await page.goto(`/contacts/${tenant1ContactId}`)

    // Should be denied access (404 or 403)
    expect([403, 404]).toContain(response?.status() || 0)

    // Should not see tenant 1's contact in list
    await page.goto('/contacts')
    await expect(page.locator('text=contact@tenant1.com')).not.toBeVisible()
    await expect(page.locator('text=Tenant1 Contact')).not.toBeVisible()
  })

  test('should isolate projects between tenants', async ({ page }) => {
    // Login as tenant 1
    await login(page, tenant1User.email, tenant1User.password)

    // Create a project
    await page.goto('/projects')
    await page.click('text=New Project')
    await page.fill('input[name="name"]', 'Tenant 1 Secret Project')
    await page.fill('textarea[name="description"]', 'Confidential project data')
    await page.click('button:has-text("Create")')

    const tenant1ProjectId = page.url().split('/').pop()

    // Logout and login as tenant 2
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')
    await login(page, tenant2User.email, tenant2User.password)

    // Try to access tenant 1's project
    const response = await page.goto(`/projects/${tenant1ProjectId}`)
    expect([403, 404]).toContain(response?.status() || 0)

    // Should not see in projects list
    await page.goto('/projects')
    await expect(page.locator('text=Tenant 1 Secret Project')).not.toBeVisible()
  })

  test('should prevent cross-tenant API access', async ({ page, request }) => {
    // Login as tenant 1 and get auth token
    await login(page, tenant1User.email, tenant1User.password)

    // Get cookies/session
    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'))

    // Create contact as tenant 1
    await page.goto('/api/contacts')
    const createResponse = await page.evaluate(async () => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'API',
          last_name: 'Test',
          email: 'api@tenant1.com'
        })
      })
      return { status: res.status, data: await res.json() }
    })

    expect(createResponse.status).toBe(201)
    const contactId = createResponse.data.id

    // Logout and login as tenant 2
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')
    await login(page, tenant2User.email, tenant2User.password)

    // Try to fetch tenant 1's contact via API
    const fetchResponse = await page.evaluate(async (id) => {
      const res = await fetch(`/api/contacts/${id}`)
      return { status: res.status }
    }, contactId)

    // Should be denied
    expect([401, 403, 404]).toContain(fetchResponse.status)
  })

  test('should maintain tenant context across page navigation', async ({ page }) => {
    await login(page, tenant1User.email, tenant1User.password)

    // Navigate through different sections
    await page.goto('/dashboard')
    await page.goto('/contacts')
    await page.goto('/projects')
    await page.goto('/activities')

    // Check tenant indicator is consistent
    const tenantIndicator = page.locator('[data-testid="tenant-name"]')
    const tenantName = await tenantIndicator.textContent()

    // Navigate to another section
    await page.goto('/settings')

    // Tenant should be the same
    const tenantIndicator2 = page.locator('[data-testid="tenant-name"]')
    await expect(tenantIndicator2).toHaveText(tenantName || '')
  })

  test('should enforce RLS on database queries', async ({ page }) => {
    await login(page, tenant1User.email, tenant1User.password)

    // Open browser console and try to query Supabase directly
    // This tests that RLS policies are active even for direct queries
    const rlsTest = await page.evaluate(async () => {
      try {
        // Try to access data without tenant filter
        // This should be blocked by RLS
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        // Try to get all contacts (should only return current tenant's)
        const { data, error } = await supabase
          .from('contacts')
          .select('*')

        // Check that data doesn't include cross-tenant contacts
        // by verifying tenant_id matches user's tenant
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, reason: 'Not authenticated' }

        const wrongTenantContacts = data?.filter(
          contact => contact.tenant_id !== user.user_metadata.tenant_id
        )

        return {
          success: wrongTenantContacts?.length === 0,
          contactsCount: data?.length || 0,
          wrongTenantCount: wrongTenantContacts?.length || 0
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    expect(rlsTest.success).toBe(true)
    expect(rlsTest.wrongTenantCount).toBe(0)
  })

  test('should show only tenant-specific data in search', async ({ page }) => {
    // Login as tenant 1
    await login(page, tenant1User.email, tenant1User.password)

    // Create uniquely named contact
    await page.goto('/contacts')
    await page.click('text=New Contact')
    await page.fill('input[name="first_name"]', 'SearchTest')
    await page.fill('input[name="last_name"]', 'Tenant1')
    await page.fill('input[name="email"]', 'search@tenant1.com')
    await page.click('button:has-text("Save")')

    // Logout and login as tenant 2
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')
    await login(page, tenant2User.email, tenant2User.password)

    // Search for tenant 1's contact
    await page.goto('/contacts')
    await page.fill('input[placeholder*="Search"]', 'SearchTest')
    await page.keyboard.press('Enter')

    // Should not find tenant 1's contact
    await expect(page.locator('text=search@tenant1.com')).not.toBeVisible()
    await expect(page.locator('text=SearchTest Tenant1')).not.toBeVisible()
  })

  test('should handle tenant switching for admin users', async ({ page }) => {
    // This test assumes admin users can switch between tenants
    // Skip if not implemented
    test.skip(!process.env.ENABLE_TENANT_SWITCHING, 'Tenant switching not enabled')

    await login(page, 'admin@system.com', 'adminpassword')

    // Open tenant switcher
    await page.click('[data-testid="tenant-switcher"]')

    // Get current tenant
    const currentTenant = await page.locator('[data-testid="current-tenant"]').textContent()

    // Switch to different tenant
    await page.click('[data-testid="switch-tenant-button"]')
    await page.click('[data-value="tenant-2"]')

    // Verify switch occurred
    await page.waitForTimeout(1000) // Wait for switch to complete
    const newTenant = await page.locator('[data-testid="current-tenant"]').textContent()

    expect(newTenant).not.toBe(currentTenant)

    // Verify data is different tenant's data
    await page.goto('/contacts')
    // Should see different contacts than before switch
  })

  test('should maintain data integrity during concurrent access', async ({ browser }) => {
    // Create two separate browser contexts for two tenants
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    // Login both users simultaneously
    await Promise.all([
      login(page1, tenant1User.email, tenant1User.password),
      login(page2, tenant2User.email, tenant2User.password)
    ])

    // Both create contacts simultaneously
    await Promise.all([
      (async () => {
        await page1.goto('/contacts')
        await page1.click('text=New Contact')
        await page1.fill('input[name="first_name"]', 'Concurrent')
        await page1.fill('input[name="last_name"]', 'Test1')
        await page1.fill('input[name="email"]', 'concurrent1@tenant1.com')
        await page1.click('button:has-text("Save")')
      })(),
      (async () => {
        await page2.goto('/contacts')
        await page2.click('text=New Contact')
        await page2.fill('input[name="first_name"]', 'Concurrent')
        await page2.fill('input[name="last_name"]', 'Test2')
        await page2.fill('input[name="email"]', 'concurrent2@tenant2.com')
        await page2.click('button:has-text("Save")')
      })()
    ])

    // Verify each tenant only sees their own contact
    await page1.goto('/contacts')
    await expect(page1.locator('text=concurrent1@tenant1.com')).toBeVisible()
    await expect(page1.locator('text=concurrent2@tenant2.com')).not.toBeVisible()

    await page2.goto('/contacts')
    await expect(page2.locator('text=concurrent2@tenant2.com')).toBeVisible()
    await expect(page2.locator('text=concurrent1@tenant1.com')).not.toBeVisible()

    // Cleanup
    await context1.close()
    await context2.close()
  })
})
