/**
 * Billing & Subscription E2E Tests
 *
 * Comprehensive tests for the billing system including:
 * - Settings page billing section rendering
 * - Subscription status display
 * - Plan comparison (Starter, Professional, Enterprise)
 * - Usage metrics display (users, SMS, emails)
 * - Feature access list rendering
 * - Upgrade flow (Stripe checkout session creation)
 * - Manage subscription (Stripe portal session creation)
 * - Trial banner display
 * - Billing API response structure validation
 * - Plans API response validation
 *
 * Stripe interactions are intercepted via page.route() to avoid
 * hitting real Stripe endpoints during testing.
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect } from '@playwright/test'

// ============================================================================
// Mock Data
// ============================================================================

/** Mock subscription response for an active Professional plan */
const MOCK_SUBSCRIPTION_RESPONSE = {
  success: true,
  data: {
    subscription: {
      id: 'sub_test_123',
      status: 'active',
      planTier: 'professional',
      planName: 'Professional',
      priceCents: 29900,
      billingInterval: 'month' as const,
      trialStartedAt: null,
      trialEndsAt: null,
      trialDaysRemaining: null,
      currentPeriodStart: '2026-01-07T00:00:00Z',
      currentPeriodEnd: '2026-02-07T00:00:00Z',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriod: null,
    },
    plan: {
      id: 'professional',
      name: 'Professional',
      description: 'For growing teams',
      featureList: [
        '10 users included',
        'Everything in Starter',
        'Claims/insurance tracking',
        'Storm data integration',
        'Campaigns & automation',
        'QuickBooks integration',
        'ARIA AI (full suite)',
        'SMS/email (1,000/mo)',
        'Priority support',
      ],
    },
    usage: {
      users: { current: 4, limit: 10, unlimited: false },
      sms: { current: 120, limit: 1000, unlimited: false },
      emails: { current: 45, limit: 1000, unlimited: false },
    },
    features: {
      quickbooksIntegration: true,
      claimsTracking: true,
      stormData: true,
      campaigns: true,
      unlimitedMessaging: false,
      customIntegrations: false,
      dedicatedSupport: false,
      aiChat: true,
      aiVoiceAssistant: true,
      aiKnowledgeBase: true,
    },
  },
}

/** Mock subscription response for a trial */
const MOCK_TRIAL_SUBSCRIPTION_RESPONSE = {
  success: true,
  data: {
    subscription: {
      id: 'sub_trial_456',
      status: 'trialing',
      planTier: 'professional',
      planName: 'Professional',
      priceCents: 29900,
      billingInterval: 'month' as const,
      trialStartedAt: '2026-01-25T00:00:00Z',
      trialEndsAt: '2026-02-08T00:00:00Z',
      trialDaysRemaining: 1,
      currentPeriodStart: '2026-01-25T00:00:00Z',
      currentPeriodEnd: '2026-02-08T00:00:00Z',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriod: null,
    },
    plan: {
      id: 'professional',
      name: 'Professional',
      description: 'For growing teams',
      featureList: [
        '10 users included',
        'Everything in Starter',
        'Claims/insurance tracking',
        'Storm data integration',
        'Campaigns & automation',
        'QuickBooks integration',
        'ARIA AI (full suite)',
        'SMS/email (1,000/mo)',
        'Priority support',
      ],
    },
    usage: {
      users: { current: 2, limit: 10, unlimited: false },
      sms: { current: 10, limit: 1000, unlimited: false },
      emails: { current: 5, limit: 1000, unlimited: false },
    },
    features: {
      quickbooksIntegration: true,
      claimsTracking: true,
      stormData: true,
      campaigns: true,
      unlimitedMessaging: false,
      customIntegrations: false,
      dedicatedSupport: false,
      aiChat: true,
      aiVoiceAssistant: true,
      aiKnowledgeBase: true,
    },
  },
}

/** Mock plans API response */
const MOCK_PLANS_RESPONSE = {
  success: true,
  data: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For solo contractors and small crews',
      priceMonthly: 14900,
      priceYearly: 149000,
      maxUsers: 3,
      maxSmsPerMonth: 200,
      maxEmailsPerMonth: 200,
      features: {
        quickbooksIntegration: false,
        claimsTracking: false,
        stormData: false,
        campaigns: false,
        unlimitedMessaging: false,
        customIntegrations: false,
        dedicatedSupport: false,
        aiChat: true,
        aiVoiceAssistant: false,
        aiKnowledgeBase: false,
      },
      featureList: [
        '3 users included',
        'Core CRM & pipeline',
        'Mobile PWA with offline',
        'E-signatures',
        'Territory mapping',
        'SMS/email (200/mo)',
        'ARIA AI chat (basic)',
        'Email support',
      ],
      featured: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing teams',
      priceMonthly: 29900,
      priceYearly: 299000,
      maxUsers: 10,
      maxSmsPerMonth: 1000,
      maxEmailsPerMonth: 1000,
      features: {
        quickbooksIntegration: true,
        claimsTracking: true,
        stormData: true,
        campaigns: true,
        unlimitedMessaging: false,
        customIntegrations: false,
        dedicatedSupport: false,
        aiChat: true,
        aiVoiceAssistant: true,
        aiKnowledgeBase: true,
      },
      featureList: [
        '10 users included',
        'Everything in Starter',
        'Claims/insurance tracking',
        'Storm data integration',
        'Campaigns & automation',
        'QuickBooks integration',
        'ARIA AI (full suite)',
        'SMS/email (1,000/mo)',
        'Priority support',
      ],
      featured: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large operations',
      priceMonthly: 49900,
      priceYearly: 499000,
      maxUsers: -1,
      maxSmsPerMonth: -1,
      maxEmailsPerMonth: -1,
      features: {
        quickbooksIntegration: true,
        claimsTracking: true,
        stormData: true,
        campaigns: true,
        unlimitedMessaging: true,
        customIntegrations: true,
        dedicatedSupport: true,
        aiChat: true,
        aiVoiceAssistant: true,
        aiKnowledgeBase: true,
      },
      featureList: [
        'Unlimited users',
        'Everything in Professional',
        'Unlimited SMS/email',
        'ARIA AI (unlimited)',
        'Custom integrations',
        'Dedicated success manager',
        'SLA guarantee',
      ],
      featured: false,
    },
  ],
}

// ============================================================================
// Helper: Intercept subscription API to return mock data
// ============================================================================

/** Shape of the mocked subscription API response */
interface MockSubscriptionResponse {
  success: boolean
  data: {
    subscription: {
      id: string
      status: string
      planTier: string
      planName: string
      priceCents: number
      billingInterval: 'month' | 'year'
      trialStartedAt: string | null
      trialEndsAt: string | null
      trialDaysRemaining: number | null
      currentPeriodStart: string | null
      currentPeriodEnd: string | null
      cancelAtPeriodEnd: boolean
      canceledAt: string | null
      gracePeriod: { endsAt: string | null; daysRemaining: number | null } | null
    } | null
    plan: {
      id: string
      name: string
      description: string
      featureList: string[]
    } | null
    usage: {
      users: { current: number; limit: number; unlimited: boolean }
      sms: { current: number; limit: number; unlimited: boolean }
      emails: { current: number; limit: number; unlimited: boolean }
    }
    features: Record<string, boolean>
  }
}

/**
 * Sets up route interception for the billing subscription API.
 * Returns mocked subscription data so tests don't depend on real DB state.
 */
async function mockSubscriptionApi(
  page: import('@playwright/test').Page,
  mockResponse: MockSubscriptionResponse = MOCK_SUBSCRIPTION_RESPONSE
) {
  await page.route('**/api/billing/subscription', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Navigate to the settings page and click the Billing sidebar item.
 * On desktop, the sidebar is visible; on mobile, the billing item is in the list.
 */
async function navigateToBilling(page: import('@playwright/test').Page) {
  await page.goto('/settings')
  await page.waitForLoadState('load')

  // Click the Billing item in the settings sidebar/list
  const billingItem = page.locator('text=Billing').first()
  await expect(billingItem).toBeVisible({ timeout: 10000 })
  await billingItem.click()
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Billing', () => {
  // Use authenticated session from auth.setup.ts
  test.use({ storageState: 'playwright/.auth/user.json' })

  // --------------------------------------------------------------------------
  // 1. Billing settings page loads
  // --------------------------------------------------------------------------
  test('billing settings page loads with subscription data', async ({ page }) => {
    // Mock the subscription API so we have deterministic data
    await mockSubscriptionApi(page)

    await navigateToBilling(page)

    // The BillingSettings component should render the "Current Plan" card
    const currentPlanCard = page.locator('text=Current Plan')
    await expect(currentPlanCard).toBeVisible({ timeout: 10000 })
  })

  // --------------------------------------------------------------------------
  // 2. Current subscription displays correctly
  // --------------------------------------------------------------------------
  test('current subscription displays plan name, status, and price', async ({ page }) => {
    await mockSubscriptionApi(page)
    await navigateToBilling(page)

    // Plan name should be visible
    const planName = page.locator('text=Professional').first()
    await expect(planName).toBeVisible({ timeout: 10000 })

    // Status badge should show "Active"
    const statusBadge = page.locator('text=Active').first()
    await expect(statusBadge).toBeVisible({ timeout: 5000 })

    // Price should be displayed ($299/mo)
    const priceText = page.locator('text=$299/mo').first()
    await expect(priceText).toBeVisible({ timeout: 5000 })

    // Next billing date should be shown
    const billingDate = page.locator('text=Next billing date')
    await expect(billingDate).toBeVisible({ timeout: 5000 })
  })

  // --------------------------------------------------------------------------
  // 3. Plan comparison shows all tiers
  // --------------------------------------------------------------------------
  test('plan comparison dialog shows Starter, Professional, and Enterprise', async ({ page }) => {
    await mockSubscriptionApi(page)
    await navigateToBilling(page)

    // Click the "Upgrade Plan" button to open the plan selector dialog
    const upgradeButton = page.locator('button:has-text("Upgrade Plan")')
    await expect(upgradeButton).toBeVisible({ timeout: 10000 })
    await upgradeButton.click()

    // Dialog should open with "Choose Your Plan" title
    const dialogTitle = page.locator('text=Choose Your Plan')
    await expect(dialogTitle).toBeVisible({ timeout: 5000 })

    // All three plan names should be visible
    const starterPlan = page.locator('[role="dialog"]').locator('text=Starter').first()
    const professionalPlan = page.locator('[role="dialog"]').locator('text=Professional').first()
    const enterprisePlan = page.locator('[role="dialog"]').locator('text=Enterprise').first()

    await expect(starterPlan).toBeVisible({ timeout: 5000 })
    await expect(professionalPlan).toBeVisible({ timeout: 5000 })
    await expect(enterprisePlan).toBeVisible({ timeout: 5000 })

    // "Most Popular" badge should be on Professional
    const mostPopular = page.locator('[role="dialog"]').locator('text=Most Popular')
    await expect(mostPopular).toBeVisible({ timeout: 5000 })

    // Monthly/Yearly toggle should be visible
    const monthlyButton = page.locator('[role="dialog"]').locator('text=Monthly')
    const yearlyButton = page.locator('[role="dialog"]').locator('text=Yearly')
    await expect(monthlyButton).toBeVisible({ timeout: 5000 })
    await expect(yearlyButton).toBeVisible({ timeout: 5000 })

    // Prices should be visible (monthly by default)
    // $149 for Starter, $299 for Professional, $499 for Enterprise
    const starterPrice = page.locator('[role="dialog"]').locator('text=$149').first()
    const professionalPrice = page.locator('[role="dialog"]').locator('text=$299').first()
    const enterprisePrice = page.locator('[role="dialog"]').locator('text=$499').first()

    await expect(starterPrice).toBeVisible({ timeout: 5000 })
    await expect(professionalPrice).toBeVisible({ timeout: 5000 })
    await expect(enterprisePrice).toBeVisible({ timeout: 5000 })

    // Professional should show "Current" badge since the mock is on Professional
    const currentBadge = page.locator('[role="dialog"]').locator('text=Current')
    await expect(currentBadge).toBeVisible({ timeout: 5000 })
  })

  // --------------------------------------------------------------------------
  // 4. Usage metrics display
  // --------------------------------------------------------------------------
  test('usage metrics display users, SMS, and email counts', async ({ page }) => {
    await mockSubscriptionApi(page)
    await navigateToBilling(page)

    // UsageCard should have the title
    const usageTitle = page.locator('text=Usage This Month')
    await expect(usageTitle).toBeVisible({ timeout: 10000 })

    // Team Members usage: 4 / 10
    const teamMembers = page.locator('text=Team Members')
    await expect(teamMembers).toBeVisible({ timeout: 5000 })

    // SMS Messages label
    const smsMessages = page.locator('text=SMS Messages')
    await expect(smsMessages).toBeVisible({ timeout: 5000 })

    // Emails label
    const emails = page.locator('text=Emails')
    await expect(emails).toBeVisible({ timeout: 5000 })

    // Usage numbers should render (4 / 10 for users)
    const userUsage = page.locator('text=4 / 10')
    await expect(userUsage).toBeVisible({ timeout: 5000 })

    // SMS usage: 120 / 1,000
    const smsUsage = page.locator('text=120 / 1,000')
    await expect(smsUsage).toBeVisible({ timeout: 5000 })

    // Email usage: 45 / 1,000
    const emailUsage = page.locator('text=45 / 1,000')
    await expect(emailUsage).toBeVisible({ timeout: 5000 })

    // Progress bars should be rendered (3 progress elements)
    const progressBars = page.locator('[role="progressbar"]')
    await expect(progressBars).toHaveCount(3, { timeout: 5000 })
  })

  // --------------------------------------------------------------------------
  // 5. Feature access list renders
  // --------------------------------------------------------------------------
  test('feature access list renders in the plan selector', async ({ page }) => {
    await mockSubscriptionApi(page)
    await navigateToBilling(page)

    // Open the plan selector dialog
    const upgradeButton = page.locator('button:has-text("Upgrade Plan")')
    await expect(upgradeButton).toBeVisible({ timeout: 10000 })
    await upgradeButton.click()

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Each plan card should list features with check marks
    // Starter features
    await expect(dialog.locator('text=Core CRM & pipeline')).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=E-signatures')).toBeVisible({ timeout: 5000 })

    // Professional features
    await expect(dialog.locator('text=Claims/insurance tracking')).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=QuickBooks integration')).toBeVisible({ timeout: 5000 })

    // Enterprise features
    await expect(dialog.locator('text=Unlimited users')).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Custom integrations')).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=SLA guarantee')).toBeVisible({ timeout: 5000 })
  })

  // --------------------------------------------------------------------------
  // 6. Upgrade button initiates checkout
  // --------------------------------------------------------------------------
  test('upgrade button creates Stripe checkout session', async ({ page }) => {
    await mockSubscriptionApi(page)

    // Intercept the checkout API to prevent real Stripe redirect
    let checkoutRequestBody: Record<string, unknown> | null = null

    await page.route('**/api/billing/checkout', async (route) => {
      if (route.request().method() === 'POST') {
        // Capture the request body
        checkoutRequestBody = route.request().postDataJSON()

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              checkoutUrl: 'https://checkout.stripe.com/test_session_123',
              sessionId: 'cs_test_session_123',
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await navigateToBilling(page)

    // Open plan selector dialog
    const upgradeButton = page.locator('button:has-text("Upgrade Plan")')
    await expect(upgradeButton).toBeVisible({ timeout: 10000 })
    await upgradeButton.click()

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Click "Select Plan" on the Starter plan (it's not the current plan)
    // Find the Starter card and click its select button
    const selectButtons = dialog.locator('button:has-text("Select Plan")')

    // There should be at least one selectable plan (Starter or Enterprise)
    const selectButtonCount = await selectButtons.count()
    expect(selectButtonCount).toBeGreaterThan(0)

    // Click the first available "Select Plan" button
    await selectButtons.first().click()

    // Wait for the checkout API call to happen
    // The component attempts to set window.location.href after getting the URL,
    // but since we intercepted the API, we can verify the request was made
    await page.waitForTimeout(1000)

    // Verify the checkout API was called with correct structure
    expect(checkoutRequestBody).not.toBeNull()
    expect(checkoutRequestBody).toHaveProperty('planTier')
    expect(checkoutRequestBody).toHaveProperty('billingInterval')
    expect(checkoutRequestBody).toHaveProperty('successUrl')
    expect(checkoutRequestBody).toHaveProperty('cancelUrl')
  })

  // --------------------------------------------------------------------------
  // 7. Manage subscription opens portal
  // --------------------------------------------------------------------------
  test('manage subscription button creates Stripe portal session', async ({ page }) => {
    await mockSubscriptionApi(page)

    // Intercept the portal API
    let portalRequestBody: Record<string, unknown> | null = null

    await page.route('**/api/billing/portal', async (route) => {
      if (route.request().method() === 'POST') {
        portalRequestBody = route.request().postDataJSON()

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              portalUrl: 'https://billing.stripe.com/test_portal_session',
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await navigateToBilling(page)

    // "Manage Subscription" button should be visible for active subscriptions
    const manageButton = page.locator('button:has-text("Manage Subscription")')
    await expect(manageButton).toBeVisible({ timeout: 10000 })

    // Click manage subscription
    await manageButton.click()

    // Wait for the portal API call
    await page.waitForTimeout(1000)

    // Verify the portal API was called
    expect(portalRequestBody).not.toBeNull()
    expect(portalRequestBody).toHaveProperty('returnUrl')
  })

  // --------------------------------------------------------------------------
  // 8. Trial banner displays
  // --------------------------------------------------------------------------
  test('trial banner shows with correct days remaining', async ({ page }) => {
    // Use the trial mock data instead of active subscription
    await mockSubscriptionApi(page, MOCK_TRIAL_SUBSCRIPTION_RESPONSE)
    await navigateToBilling(page)

    // The SubscriptionStatus should show "Free Trial" badge
    const trialBadge = page.locator('text=Free Trial')
    await expect(trialBadge).toBeVisible({ timeout: 10000 })

    // Should show trial days remaining text
    const trialDaysText = page.locator('text=/\\d+ day(s)? remaining in trial/')
    await expect(trialDaysText).toBeVisible({ timeout: 5000 })

    // Should show "Subscribe Now" button instead of "Upgrade Plan"
    const subscribeButton = page.locator('button:has-text("Subscribe Now")')
    await expect(subscribeButton).toBeVisible({ timeout: 5000 })

    // "Manage Subscription" should NOT be visible during trial
    const manageButton = page.locator('button:has-text("Manage Subscription")')
    await expect(manageButton).not.toBeVisible({ timeout: 3000 })

    // "Trial ends" date should be shown
    const trialEndsText = page.locator('text=Trial ends')
    await expect(trialEndsText).toBeVisible({ timeout: 5000 })
  })

  // --------------------------------------------------------------------------
  // 9. Billing API response structure
  // --------------------------------------------------------------------------
  test('GET /api/billing/subscription returns valid data structure', async ({ page }) => {
    // Make a direct API call using the authenticated session
    const response = await page.request.get('/api/billing/subscription')

    // Should return 200
    expect(response.status()).toBe(200)

    // Parse response body
    const body = await response.json()

    // Validate top-level envelope
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('data')

    const data = body.data

    // Subscription should be present (or null for tenants without one)
    expect(data).toHaveProperty('subscription')

    // Usage should always be present
    expect(data).toHaveProperty('usage')
    expect(data.usage).toHaveProperty('users')
    expect(data.usage).toHaveProperty('sms')
    expect(data.usage).toHaveProperty('emails')

    // Each usage item should have current, limit, unlimited
    for (const key of ['users', 'sms', 'emails']) {
      const usageItem = data.usage[key]
      expect(usageItem).toHaveProperty('current')
      expect(usageItem).toHaveProperty('limit')
      expect(usageItem).toHaveProperty('unlimited')
      expect(typeof usageItem.current).toBe('number')
      expect(typeof usageItem.limit).toBe('number')
      expect(typeof usageItem.unlimited).toBe('boolean')
    }

    // Features should always be present
    expect(data).toHaveProperty('features')

    // If subscription exists, validate its shape
    if (data.subscription) {
      expect(data.subscription).toHaveProperty('id')
      expect(data.subscription).toHaveProperty('status')
      expect(data.subscription).toHaveProperty('planTier')
      expect(data.subscription).toHaveProperty('planName')
      expect(data.subscription).toHaveProperty('priceCents')
      expect(data.subscription).toHaveProperty('billingInterval')
      expect(data.subscription).toHaveProperty('cancelAtPeriodEnd')
      expect(typeof data.subscription.priceCents).toBe('number')
      expect(typeof data.subscription.cancelAtPeriodEnd).toBe('boolean')
      expect(['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired']).toContain(
        data.subscription.status
      )
      expect(['starter', 'professional', 'enterprise']).toContain(
        data.subscription.planTier
      )
    }
  })

  // --------------------------------------------------------------------------
  // 10. Plans API returns all tiers
  // --------------------------------------------------------------------------
  test('GET /api/billing/plans returns 3 plans with correct pricing', async ({ page }) => {
    // The plans API is public (no auth required), but we test it from the
    // authenticated context for consistency
    const response = await page.request.get('/api/billing/plans')

    // Should return 200
    expect(response.status()).toBe(200)

    // Parse response body
    const body = await response.json()

    // Validate top-level envelope
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('data')

    const plans = body.data

    // Should have exactly 3 plans
    expect(Array.isArray(plans)).toBe(true)
    expect(plans).toHaveLength(3)

    // Validate plan IDs
    const planIds = plans.map((p: { id: string }) => p.id)
    expect(planIds).toContain('starter')
    expect(planIds).toContain('professional')
    expect(planIds).toContain('enterprise')

    // Validate each plan has required fields
    for (const plan of plans) {
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('description')
      expect(plan).toHaveProperty('priceMonthly')
      expect(plan).toHaveProperty('priceYearly')
      expect(plan).toHaveProperty('maxUsers')
      expect(plan).toHaveProperty('maxSmsPerMonth')
      expect(plan).toHaveProperty('maxEmailsPerMonth')
      expect(plan).toHaveProperty('features')
      expect(plan).toHaveProperty('featureList')
      expect(plan).toHaveProperty('featured')
      expect(typeof plan.priceMonthly).toBe('number')
      expect(typeof plan.priceYearly).toBe('number')
      expect(Array.isArray(plan.featureList)).toBe(true)
      expect(plan.featureList.length).toBeGreaterThan(0)
    }

    // Validate specific pricing (in cents)
    const starter = plans.find((p: { id: string }) => p.id === 'starter')
    const professional = plans.find((p: { id: string }) => p.id === 'professional')
    const enterprise = plans.find((p: { id: string }) => p.id === 'enterprise')

    expect(starter.priceMonthly).toBe(14900)   // $149
    expect(starter.priceYearly).toBe(149000)    // $1,490

    expect(professional.priceMonthly).toBe(29900) // $299
    expect(professional.priceYearly).toBe(299000) // $2,990

    expect(enterprise.priceMonthly).toBe(49900) // $499
    expect(enterprise.priceYearly).toBe(499000) // $4,990

    // Only Professional should be featured
    expect(starter.featured).toBe(false)
    expect(professional.featured).toBe(true)
    expect(enterprise.featured).toBe(false)

    // Validate user limits
    expect(starter.maxUsers).toBe(3)
    expect(professional.maxUsers).toBe(10)
    expect(enterprise.maxUsers).toBe(-1) // unlimited

    // Validate features structure
    const featureKeys = [
      'quickbooksIntegration',
      'claimsTracking',
      'stormData',
      'campaigns',
      'unlimitedMessaging',
      'customIntegrations',
      'dedicatedSupport',
      'aiChat',
      'aiVoiceAssistant',
      'aiKnowledgeBase',
    ]

    for (const plan of plans) {
      for (const key of featureKeys) {
        expect(plan.features).toHaveProperty(key)
        expect(typeof plan.features[key]).toBe('boolean')
      }
    }

    // Starter should NOT have QuickBooks, claims, etc.
    expect(starter.features.quickbooksIntegration).toBe(false)
    expect(starter.features.claimsTracking).toBe(false)
    expect(starter.features.aiChat).toBe(true)

    // Professional should have QuickBooks, claims, etc.
    expect(professional.features.quickbooksIntegration).toBe(true)
    expect(professional.features.claimsTracking).toBe(true)
    expect(professional.features.unlimitedMessaging).toBe(false)

    // Enterprise should have everything
    expect(enterprise.features.unlimitedMessaging).toBe(true)
    expect(enterprise.features.customIntegrations).toBe(true)
    expect(enterprise.features.dedicatedSupport).toBe(true)
  })

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------
  test('billing settings shows loading state while fetching', async ({ page }) => {
    // Delay the subscription API response to observe the loading state
    await page.route('**/api/billing/subscription', async (route) => {
      // Delay the response by 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SUBSCRIPTION_RESPONSE),
      })
    })

    await navigateToBilling(page)

    // While loading, the spinner should be visible
    // BillingSettings renders a Loader2 spinner with animate-spin class
    const spinner = page.locator('.animate-spin')
    await expect(spinner).toBeVisible({ timeout: 5000 })

    // After loading completes, the spinner should disappear and content should show
    const currentPlanCard = page.locator('text=Current Plan')
    await expect(currentPlanCard).toBeVisible({ timeout: 10000 })
  })

  // --------------------------------------------------------------------------
  // Error state
  // --------------------------------------------------------------------------
  test('billing settings shows error state on API failure', async ({ page }) => {
    // Mock the subscription API to return an error
    await page.route('**/api/billing/subscription', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to load subscription data',
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await navigateToBilling(page)

    // Error alert should be visible
    // BillingSettings shows an Alert with variant="destructive"
    const errorAlert = page.locator('[role="alert"]').or(
      page.locator('text=/Failed to load subscription data|error/i').first()
    )
    await expect(errorAlert.first()).toBeVisible({ timeout: 10000 })
  })

  // --------------------------------------------------------------------------
  // No subscription state
  // --------------------------------------------------------------------------
  test('billing settings shows choose plan prompt when no subscription exists', async ({ page }) => {
    // Mock subscription API returning null subscription
    await page.route('**/api/billing/subscription', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              subscription: null,
              plan: null,
              usage: {
                users: { current: 0, limit: 0, unlimited: false },
                sms: { current: 0, limit: 0, unlimited: false },
                emails: { current: 0, limit: 0, unlimited: false },
              },
              features: {
                quickbooksIntegration: false,
                claimsTracking: false,
                stormData: false,
                campaigns: false,
                unlimitedMessaging: false,
                customIntegrations: false,
                dedicatedSupport: false,
                aiChat: false,
                aiVoiceAssistant: false,
                aiKnowledgeBase: false,
              },
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await navigateToBilling(page)

    // Should show "No subscription found" text
    const noSubText = page.locator('text=No subscription found')
    await expect(noSubText).toBeVisible({ timeout: 10000 })

    // Should show "Choose a Plan" button
    const choosePlanButton = page.locator('button:has-text("Choose a Plan")')
    await expect(choosePlanButton).toBeVisible({ timeout: 5000 })
  })
})
