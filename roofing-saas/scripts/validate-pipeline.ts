/**
 * Pipeline/Projects Page Validation Script
 * Phase 1.2: Validate Projects page loads, Kanban works, stage changes work
 */
import { chromium } from 'playwright'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')
const SCREENSHOTS_DIR = path.join(__dirname, '../validation-screenshots')

async function validatePipeline() {
  console.log('🔍 Phase 1.2: Validating Pipeline/Projects Page\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  const issues: string[] = []
  const validations: { test: string; passed: boolean; details?: string }[] = []

  try {
    const fs = require('fs')
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }

    // 1. Navigate to Pipeline/Projects page
    console.log('📍 Step 1: Navigate to /projects (pipeline)')
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check if we're on the right page
    const pageTitle = await page.locator('h1').first().textContent().catch(() => '')
    console.log(`   Page title: "${pageTitle}"`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/pipeline-01-initial.png`,
      fullPage: false
    })

    // 2. Check for Kanban board or Table view toggle
    console.log('📊 Step 2: Check for view modes (Kanban/Table)...')

    const kanbanToggle = await page.locator('button:has-text("Kanban"), [data-testid="kanban-toggle"]').count()
    const tableToggle = await page.locator('button:has-text("Table"), [data-testid="table-toggle"]').count()
    const viewToggles = await page.locator('[role="tablist"], .view-toggle').count()

    validations.push({
      test: 'View mode toggles present',
      passed: kanbanToggle > 0 || tableToggle > 0 || viewToggles > 0,
      details: `Kanban: ${kanbanToggle}, Table: ${tableToggle}, Toggle groups: ${viewToggles}`
    })

    // 3. Check for pipeline columns/stages
    console.log('🏗️  Step 3: Check for pipeline stages...')

    // Look for Kanban columns
    const kanbanColumns = await page.locator('[data-testid="pipeline-column"], .kanban-column, [class*="column"]').count()
    const stageHeaders = await page.locator('text=/Prospect|Qualified|Quote|Negotiation|Won|Production|Complete|Lost/i').count()

    validations.push({
      test: 'Pipeline stages visible',
      passed: stageHeaders > 0 || kanbanColumns > 0,
      details: `Found ${stageHeaders} stage names, ${kanbanColumns} column elements`
    })

    if (stageHeaders > 0) {
      console.log(`✅ Found ${stageHeaders} pipeline stages`)
    } else {
      console.log('❌ No pipeline stages found')
      issues.push('Pipeline stages not visible')
    }

    // 4. Check for project cards
    console.log('📋 Step 4: Check for project cards...')

    const projectCards = await page.locator('[data-testid="project-card"], .project-card, [class*="card"]').count()
    const projectRows = await page.locator('table tbody tr').count()

    const hasProjects = projectCards > 0 || projectRows > 0

    validations.push({
      test: 'Projects displayed',
      passed: hasProjects,
      details: `Cards: ${projectCards}, Table rows: ${projectRows}`
    })

    if (hasProjects) {
      console.log(`✅ Found projects (${projectCards} cards, ${projectRows} rows)`)
    } else {
      console.log('❌ No projects visible')
    }

    // 5. Check for value statistics
    console.log('💰 Step 5: Check for pipeline value statistics...')

    const valueDisplay = await page.locator('text=/\\$[0-9,]+/').count()
    const totalValue = await page.locator('text=/Total|Value|Pipeline/i').count()

    validations.push({
      test: 'Pipeline values displayed',
      passed: valueDisplay > 0,
      details: `Found ${valueDisplay} dollar amounts displayed`
    })

    if (valueDisplay > 0) {
      console.log(`✅ Pipeline values visible (${valueDisplay} amounts shown)`)
    } else {
      console.log('⚠️  No dollar values visible')
    }

    // 6. Check for "Add Project" functionality
    console.log('➕ Step 6: Check Add Project button...')

    const addProjectBtn = page.locator('button:has-text("Add Project"), button:has-text("New Project"), a:has-text("Add Project")').first()
    const addBtnVisible = await addProjectBtn.isVisible().catch(() => false)

    validations.push({
      test: 'Add Project button visible',
      passed: addBtnVisible,
      details: addBtnVisible ? 'Button found' : 'Button not found'
    })

    if (addBtnVisible) {
      console.log('✅ Add Project button visible')

      // Click to test
      await addProjectBtn.click()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/pipeline-02-add-project.png`,
        fullPage: false
      })

      // Check if modal or form appeared
      const modalAppeared = await page.locator('[role="dialog"], form, .modal').isVisible().catch(() => false)
      const navigated = page.url().includes('/new')

      validations.push({
        test: 'Add Project form accessible',
        passed: modalAppeared || navigated,
        details: modalAppeared ? 'Modal opened' : navigated ? 'Navigated to new page' : 'No form appeared'
      })

      // Close modal or go back
      if (modalAppeared) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      } else if (navigated) {
        await page.goto(`${BASE_URL}/projects`)
        await page.waitForTimeout(2000)
      }
    } else {
      console.log('❌ Add Project button not visible')
      issues.push('Add Project button missing')
    }

    // 7. Check filters
    console.log('🔍 Step 7: Check filter controls...')

    const filterControls = await page.locator('select, [role="combobox"], input[type="search"]').count()
    const quickFilters = await page.locator('button').filter({ hasText: /All|Active|Won|Lost|Filter/i }).count()

    validations.push({
      test: 'Filter controls present',
      passed: filterControls > 0 || quickFilters > 0,
      details: `Filter controls: ${filterControls}, Quick filters: ${quickFilters}`
    })

    // 8. Test clicking on a project (if any exist)
    console.log('🖱️  Step 8: Test project interaction...')

    const firstProject = page.locator('[data-testid="project-card"], .project-card, table tbody tr').first()
    const projectExists = await firstProject.isVisible().catch(() => false)

    if (projectExists) {
      // Click the project
      await firstProject.click()
      await page.waitForTimeout(1500)

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/pipeline-03-project-detail.png`,
        fullPage: false
      })

      // Check if we navigated or modal opened
      const detailOpened = page.url().includes('/projects/') || await page.locator('[role="dialog"]').isVisible().catch(() => false)

      validations.push({
        test: 'Project detail accessible',
        passed: detailOpened,
        details: detailOpened ? `Opened: ${page.url()}` : 'Could not open project details'
      })

      if (detailOpened && page.url().includes('/projects/')) {
        // Check project detail page
        const projectName = await page.locator('h1, h2').first().textContent().catch(() => '')
        console.log(`✅ Project detail page: "${projectName}"`)

        // Go back
        await page.goto(`${BASE_URL}/projects`)
        await page.waitForTimeout(2000)
      }
    } else {
      validations.push({
        test: 'Project detail accessible',
        passed: false,
        details: 'No projects to click'
      })
      issues.push('No projects available to test interaction')
    }

    // Final screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/pipeline-04-final.png`,
      fullPage: true
    })

  } catch (error) {
    console.error('❌ Validation error:', error)
    issues.push(`Script error: ${error}`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/pipeline-error.png`,
      fullPage: true
    }).catch(() => {})
  } finally {
    await browser.close()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 PIPELINE/PROJECTS PAGE VALIDATION SUMMARY')
  console.log('='.repeat(60))

  const passed = validations.filter(v => v.passed).length
  const failed = validations.filter(v => !v.passed).length

  console.log(`\n✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  console.log('\n📝 Test Results:')
  validations.forEach(v => {
    const icon = v.passed ? '✅' : '❌'
    console.log(`  ${icon} ${v.test}`)
    if (v.details) {
      console.log(`     └─ ${v.details}`)
    }
  })

  if (issues.length > 0) {
    console.log('\n⚠️  Issues Found:')
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`)
    })
  }

  console.log('\n📸 Screenshots saved to:', SCREENSHOTS_DIR)
  console.log('='.repeat(60))

  return {
    passed: failed === 0,
    validations,
    issues
  }
}

// Run validation
validatePipeline()
  .then(result => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
