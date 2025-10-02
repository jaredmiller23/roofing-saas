#!/usr/bin/env tsx
/**
 * Netlify SSL/TLS Certificate Diagnostic Tool
 *
 * This script diagnoses why SSL certificates aren't provisioning on Netlify
 * and provides actionable steps to fix the issue.
 *
 * Usage:
 *   npm run diagnose-netlify-ssl
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import {
  getSites,
  findSiteByDomain,
  checkDomainPointing,
} from '../lib/netlify/site-manager'
import { getDnsZones, getDnsRecords } from '../lib/netlify/dns-manager'

const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN
const DOMAIN = 'claimclarityai.com'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function section(title: string) {
  console.log('\n' + '='.repeat(70))
  log(title, 'bright')
  console.log('='.repeat(70) + '\n')
}

async function main() {
  try {
    log('🔍 Netlify SSL/TLS Certificate Diagnostic Tool', 'bright')
    log(`Domain: ${DOMAIN}`, 'cyan')
    console.log('')

    // Validate environment
    if (!NETLIFY_API_TOKEN) {
      throw new Error('NETLIFY_API_TOKEN environment variable not set')
    }

    // Step 1: List all sites
    section('Step 1: Checking Netlify Sites')
    const sites = await getSites(NETLIFY_API_TOKEN)
    log(`Found ${sites.length} Netlify site(s)`, 'blue')

    sites.forEach((site, index) => {
      console.log(`\n${index + 1}. ${site.name}`)
      log(`   Site ID: ${site.id}`, 'blue')
      log(`   URL: ${site.url}`, 'blue')
      if (site.custom_domain) {
        log(`   Custom Domain: ${site.custom_domain}`, 'blue')
      }
      if (site.ssl_url) {
        log(`   SSL URL: ${site.ssl_url}`, 'green')
      }
      log(`   SSL Enabled: ${site.ssl ? '✅' : '❌'}`, site.ssl ? 'green' : 'red')
      log(`   Force SSL: ${site.force_ssl ? '✅' : '❌'}`, site.force_ssl ? 'green' : 'yellow')
      if (site.domain_aliases && site.domain_aliases.length > 0) {
        log(`   Aliases: ${site.domain_aliases.join(', ')}`, 'blue')
      }
    })

    // Step 2: Find site for domain
    section('Step 2: Finding Site for Domain')
    const site = await findSiteByDomain(NETLIFY_API_TOKEN, DOMAIN)

    if (!site) {
      log(`❌ No site found with domain: ${DOMAIN}`, 'red')
      log('', 'reset')
      log('⚠️  ISSUE IDENTIFIED:', 'yellow')
      log(`   The domain ${DOMAIN} is not configured as a custom domain on any Netlify site.`, 'yellow')
      log('', 'reset')
      log('📋 SOLUTION:', 'cyan')
      log('   1. Go to your Netlify site settings', 'blue')
      log('   2. Navigate to Domain Management', 'blue')
      log('   3. Add custom domain: ' + DOMAIN, 'blue')
      log('   4. Follow Netlify\'s DNS configuration instructions', 'blue')
      console.log('')

      // Show which site might be the right one
      if (sites.length > 0) {
        log('💡 TIP: You have these Netlify sites:', 'cyan')
        sites.forEach((s, i) => {
          log(`   ${i + 1}. ${s.name} (${s.url})`, 'blue')
        })
        log('', 'reset')
        log('   Choose one and add your domain to it.', 'cyan')
      }

      return
    }

    log(`✅ Site found: ${site.name}`, 'green')
    log(`   Site ID: ${site.id}`, 'blue')
    log(`   Default URL: ${site.url}`, 'blue')
    log(`   Custom Domain: ${site.custom_domain || 'Not set'}`, 'blue')
    log(`   SSL Status: ${site.ssl ? 'Enabled ✅' : 'Disabled ❌'}`, site.ssl ? 'green' : 'red')

    // Step 3: Check DNS records
    section('Step 3: Checking DNS Configuration')
    const zones = await getDnsZones(NETLIFY_API_TOKEN)
    const zone = zones.find((z) => z.name === DOMAIN)

    if (!zone) {
      log(`❌ DNS zone not found for ${DOMAIN}`, 'red')
      log('', 'reset')
      log('⚠️  ISSUE IDENTIFIED:', 'yellow')
      log(`   Netlify is not managing DNS for ${DOMAIN}`, 'yellow')
      log('', 'reset')
      log('📋 SOLUTION OPTIONS:', 'cyan')
      log('   Option A: Use Netlify DNS', 'blue')
      log('      1. Go to Netlify domain settings', 'blue')
      log('      2. Set nameservers at your domain registrar to:', 'blue')
      log('         - dns1.p01.nsone.net', 'blue')
      log('         - dns2.p01.nsone.net', 'blue')
      log('         - dns3.p01.nsone.net', 'blue')
      log('         - dns4.p01.nsone.net', 'blue')
      log('', 'reset')
      log('   Option B: Use External DNS', 'blue')
      log('      Add these records at your DNS provider:', 'blue')
      log('      - A record: @ → 75.2.60.5', 'blue')
      log('      - CNAME record: www → [your-site].netlify.app', 'blue')
      return
    }

    log(`✅ DNS zone found: ${zone.name}`, 'green')
    log(`   Zone ID: ${zone.id}`, 'blue')

    // Check if domain points to Netlify
    const domainCheck = await checkDomainPointing(NETLIFY_API_TOKEN, DOMAIN, zone.id)

    log('', 'reset')
    log('Current DNS Records:', 'cyan')
    domainCheck.currentRecords.forEach((record) => {
      const symbol = record.type === 'A' && record.value === '75.2.60.5' ? '✅' : '⚠️'
      log(`   ${symbol} ${record.type} ${record.hostname || '@'} → ${record.value}`, 'blue')
    })

    if (domainCheck.pointsToNetlify) {
      log('', 'reset')
      log('✅ Domain DNS points to Netlify correctly', 'green')
    } else {
      log('', 'reset')
      log('❌ Domain DNS does NOT point to Netlify', 'red')
      log('', 'reset')
      log('⚠️  ISSUES FOUND:', 'yellow')
      domainCheck.issues.forEach((issue) => {
        log(`   • ${issue}`, 'yellow')
      })
      log('', 'reset')
      log('📋 REQUIRED DNS RECORDS:', 'cyan')
      domainCheck.expectedRecords.forEach((record) => {
        log(`   ${record.type} ${record.hostname} → ${record.value}`, 'blue')
      })
    }

    // Step 4: Diagnosis summary
    section('🎯 Diagnosis Summary')

    const issues: string[] = []
    const solutions: string[] = []

    // Check 1: Is domain configured on site?
    if (!site.custom_domain || site.custom_domain !== DOMAIN) {
      issues.push(`Domain ${DOMAIN} not set as custom domain on site`)
      solutions.push('Add domain to site in Netlify dashboard → Domain Management')
    }

    // Check 2: Does DNS point to Netlify?
    if (!domainCheck.pointsToNetlify) {
      issues.push('DNS records do not point to Netlify')
      solutions.push('Update A record to point to 75.2.60.5')
    }

    // Check 3: Is SSL enabled?
    if (!site.ssl) {
      issues.push('SSL not enabled on site')
      solutions.push('Provision SSL certificate in Netlify dashboard')
    }

    if (issues.length === 0) {
      log('🎉 No issues found!', 'green')
      log('   Your domain appears to be configured correctly.', 'blue')
      log('', 'reset')
      log('💡 If SSL still isn\'t working:', 'cyan')
      log('   1. Wait 10-15 minutes for DNS propagation', 'blue')
      log('   2. Try triggering SSL provisioning manually in Netlify dashboard', 'blue')
      log('   3. Check Netlify support docs: https://docs.netlify.com/domains-https/', 'blue')
    } else {
      log('⚠️  Issues Found:', 'yellow')
      issues.forEach((issue, i) => {
        log(`   ${i + 1}. ${issue}`, 'yellow')
      })

      log('', 'reset')
      log('✅ Solutions:', 'green')
      solutions.forEach((solution, i) => {
        log(`   ${i + 1}. ${solution}`, 'blue')
      })
    }

    // Step 5: Detailed guidance
    section('📚 Detailed Fix Instructions')

    log('To fix SSL certificate provisioning:', 'bright')
    console.log('')

    log('1️⃣  Configure Custom Domain (if not done)', 'cyan')
    log('   a. Go to: https://app.netlify.com', 'blue')
    log(`   b. Select site: ${site.name}`, 'blue')
    log('   c. Go to: Domain Management → Domains', 'blue')
    log(`   d. Add custom domain: ${DOMAIN}`, 'blue')
    console.log('')

    log('2️⃣  Update DNS Records', 'cyan')
    if (zone) {
      log('   Your DNS is managed by Netlify - good!', 'green')
      log('   Make sure these records exist:', 'blue')
      log('   • A record: @ → 75.2.60.5', 'blue')
      log(`   • CNAME record: www → ${site.name}.netlify.app`, 'blue')
    } else {
      log('   Update at your DNS provider:', 'blue')
      log('   • A record: @ → 75.2.60.5', 'blue')
      log(`   • CNAME record: www → ${site.name}.netlify.app`, 'blue')
    }
    console.log('')

    log('3️⃣  Verify Domain', 'cyan')
    log('   a. In Netlify, go to Domain Management', 'blue')
    log('   b. Verify the domain (green checkmark)', 'blue')
    log('   c. Wait for DNS propagation (10-15 minutes)', 'blue')
    console.log('')

    log('4️⃣  Provision SSL Certificate', 'cyan')
    log('   a. Netlify should auto-provision after domain verification', 'blue')
    log('   b. If not, click "Provision certificate" button', 'blue')
    log('   c. May take a few minutes to complete', 'blue')
    console.log('')

    log('🔗 Resources:', 'cyan')
    log('   • Netlify Docs: https://docs.netlify.com/domains-https/', 'blue')
    log('   • DNS Checker: https://dnschecker.org', 'blue')
    log('   • Netlify Support: https://answers.netlify.com', 'blue')

  } catch (error) {
    section('❌ Diagnostic Failed')
    log(`Error: ${error}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

// Run the diagnostic
main()
