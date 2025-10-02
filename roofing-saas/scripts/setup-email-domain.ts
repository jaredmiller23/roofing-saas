#!/usr/bin/env tsx
/**
 * Email Domain Setup Automation
 *
 * This script automates the complete email domain verification process:
 * 1. Checks if domain exists in Resend
 * 2. Adds domain to Resend if needed
 * 3. Gets required DNS records from Resend
 * 4. Adds DNS records to Netlify
 * 5. Verifies domain in Resend
 * 6. Tests email sending
 *
 * Usage:
 *   npm run setup-email-domain
 *
 * Environment variables required:
 *   RESEND_API_KEY - Resend API key
 *   NETLIFY_API_TOKEN - Netlify personal access token
 */

// Load environment variables BEFORE importing modules
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import {
  checkDomain,
  addDomain,
  getRequiredDnsRecords,
  verifyDomain,
  formatDnsRecordsForNetlify,
} from '../lib/resend/domain-manager'
import {
  findDnsZone,
  addMultipleDnsRecords,
  convertResendToNetlifyRecord,
} from '../lib/netlify/dns-manager'
import { sendEmail } from '../lib/resend/email'

const DOMAIN_NAME = 'notifications.claimclarityai.com'
const BASE_DOMAIN = 'claimclarityai.com'
const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function section(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'bright')
  console.log('='.repeat(60) + '\n')
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  try {
    log('🚀 Email Domain Setup Automation', 'bright')
    log(`Domain: ${DOMAIN_NAME}`, 'blue')
    log(`Base Domain: ${BASE_DOMAIN}`, 'blue')
    console.log('')

    // Debug environment variables
    console.log('DEBUG: RESEND_API_KEY exists?', !!process.env.RESEND_API_KEY)
    console.log('DEBUG: RESEND_API_KEY value:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
    console.log('DEBUG: NETLIFY_API_TOKEN exists?', !!NETLIFY_API_TOKEN)

    // Validate environment
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable not set')
    }
    if (!NETLIFY_API_TOKEN) {
      throw new Error('NETLIFY_API_TOKEN environment variable not set')
    }

    // Step 1: Check Resend domain status
    section('Step 1: Checking Resend Domain Status')
    let domainCheck = await checkDomain(DOMAIN_NAME)

    if (!domainCheck.exists) {
      log('❌ Domain not found in Resend', 'yellow')
      log('➕ Adding domain to Resend...', 'blue')

      // Add delay before creating to respect rate limits
      await sleep(1000)

      const newDomain = await addDomain(DOMAIN_NAME, 'us-east-1')
      log(`✅ Domain added: ${newDomain.id}`, 'green')
      log(`   Status: ${newDomain.status}`, 'blue')

      // Refresh domain check to get the newly created domain
      await sleep(1000)
      domainCheck = await checkDomain(DOMAIN_NAME)
    } else {
      log('✅ Domain exists in Resend', 'green')
      log(`   ID: ${domainCheck.domain?.id}`, 'blue')
      log(`   Status: ${domainCheck.domain?.status}`, 'blue')

      if (domainCheck.domain?.status === 'verified') {
        log('🎉 Domain already verified!', 'green')
        log('   No DNS changes needed.', 'blue')
        return
      }
    }

    // Step 2: Get required DNS records (use cached domain data from Step 1)
    section('Step 2: Getting Required DNS Records from Resend')

    if (!domainCheck.domain) {
      throw new Error('Could not retrieve domain data')
    }

    const resendRecords = domainCheck.domain.records || []
    log(`📋 Found ${resendRecords.length} DNS records required`, 'blue')

    resendRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.record} (${record.type})`)
      log(`   Name: ${record.name}`, 'blue')
      log(`   Value: ${record.value.substring(0, 50)}${record.value.length > 50 ? '...' : ''}`, 'blue')
      log(`   Status: ${record.status}`, record.status === 'verified' ? 'green' : 'yellow')
    })

    // Step 3: Find Netlify DNS zone
    section('Step 3: Finding Netlify DNS Zone')
    const zone = await findDnsZone(NETLIFY_API_TOKEN, DOMAIN_NAME)

    if (!zone) {
      throw new Error(
        `DNS zone for ${BASE_DOMAIN} not found in Netlify. ` +
        `Make sure the domain is managed by Netlify DNS.`
      )
    }

    log(`✅ DNS zone found: ${zone.name}`, 'green')
    log(`   Zone ID: ${zone.id}`, 'blue')

    // Step 4: Add DNS records to Netlify
    section('Step 4: Adding DNS Records to Netlify')

    const netlifyRecords = formatDnsRecordsForNetlify(resendRecords).map((record) =>
      convertResendToNetlifyRecord(record, BASE_DOMAIN)
    )

    log(`➕ Adding ${netlifyRecords.length} DNS records...`, 'blue')

    const addedRecords = await addMultipleDnsRecords(
      NETLIFY_API_TOKEN,
      zone.id,
      netlifyRecords
    )

    log(`✅ Added ${addedRecords.length} DNS records`, 'green')
    addedRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.type} - ${record.hostname || '@'}`)
    })

    // Step 5: Wait for DNS propagation
    section('Step 5: Waiting for DNS Propagation')
    log('⏳ Waiting 30 seconds for DNS to propagate...', 'yellow')
    await sleep(30000)

    // Step 6: Verify domain in Resend
    section('Step 6: Verifying Domain in Resend')

    // Use the domain ID we already have (no need to check again)
    if (!domainCheck.domain?.id) {
      throw new Error('Could not get domain ID for verification')
    }

    log('🔍 Triggering Resend verification...', 'blue')

    // Add delay to respect rate limits
    await sleep(2000)

    await verifyDomain(domainCheck.domain.id)

    log('✅ Verification triggered successfully!', 'green')
    log('⏳ DNS propagation typically takes 10-20 minutes', 'yellow')
    log('   Resend will automatically verify within 72 hours', 'blue')
    log('   You can check status at: https://resend.com/domains', 'blue')

    // Step 7: Test email sending (skip for now - domain needs time to verify)
    if (false) {
      section('Step 7: Testing Email Sending')

      const testEmail = process.env.TEST_EMAIL || 'test@example.com'
      log(`📧 Sending test email to: ${testEmail}`, 'blue')

      try {
        const result = await sendEmail({
          to: testEmail,
          subject: '✅ Email Domain Verified!',
          html: `
            <h1>Success! 🎉</h1>
            <p>Your email domain <strong>${DOMAIN_NAME}</strong> has been verified and is ready to use.</p>
            <p>This test email confirms that:</p>
            <ul>
              <li>✅ DNS records are properly configured</li>
              <li>✅ SPF and DKIM are set up</li>
              <li>✅ Email sending is working</li>
            </ul>
            <p>You can now send emails from this domain!</p>
          `,
          text: `Success! Your email domain ${DOMAIN_NAME} has been verified and is ready to use.`,
        })

        log(`✅ Test email sent successfully!`, 'green')
        log(`   Email ID: ${result.id}`, 'blue')
      } catch (error) {
        log(`⚠️  Test email failed: ${error}`, 'yellow')
        log('   Domain is verified but email sending encountered an error', 'blue')
      }
    }

    // Summary
    section('🎊 Setup Complete!')
    log('Domain configuration summary:', 'bright')
    log(`✅ Domain added to Resend: ${DOMAIN_NAME}`, 'green')
    log(`✅ DNS records added to Netlify (${addedRecords.length} records)`, 'green')
    log(`⏳ Verification pending DNS propagation`, 'yellow')

    console.log('\n📚 Next steps:')
    log('   1. Wait 10-20 minutes for DNS propagation', 'blue')
    log('   2. Check domain status: https://resend.com/domains', 'blue')
    log('   3. Resend will auto-verify once DNS propagates (within 72 hours)', 'blue')
    log('   4. Once verified, start sending emails from your app!', 'blue')

    console.log('')
  } catch (error) {
    section('❌ Setup Failed')
    log(`Error: ${error}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
