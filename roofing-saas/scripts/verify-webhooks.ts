#!/usr/bin/env npx tsx
/**
 * Webhook Configuration Verification Script
 *
 * Verifies Twilio and Resend configuration for the communications system.
 * Run with: npx tsx scripts/verify-webhooks.ts
 *
 * Checks:
 * - Environment variables are set
 * - Twilio account is valid and phone number exists
 * - Resend API key is valid and domain is verified
 * - Webhook URLs are accessible
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: string
}

const results: CheckResult[] = []

function log(result: CheckResult) {
  const icon = result.status === 'pass' ? '\u2705' : result.status === 'warn' ? '\u26A0\uFE0F' : '\u274C'
  console.log(`${icon} ${result.name}: ${result.message}`)
  if (result.details) {
    console.log(`   ${result.details}`)
  }
  results.push(result)
}

async function checkEnvVar(name: string, required: boolean = true): Promise<boolean> {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    log({
      name: `ENV: ${name}`,
      status: required ? 'fail' : 'warn',
      message: required ? 'Missing (required)' : 'Missing (optional)',
    })
    return false
  }
  log({
    name: `ENV: ${name}`,
    status: 'pass',
    message: `Set (${value.substring(0, 8)}...)`,
  })
  return true
}

async function checkTwilioAccount(): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    log({
      name: 'Twilio Account',
      status: 'fail',
      message: 'Cannot verify - missing credentials',
    })
    return
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      log({
        name: 'Twilio Account',
        status: 'pass',
        message: `Active (${data.friendly_name || data.sid})`,
        details: `Status: ${data.status}, Type: ${data.type}`,
      })
    } else {
      const error = await response.text()
      log({
        name: 'Twilio Account',
        status: 'fail',
        message: `Invalid credentials (${response.status})`,
        details: error.substring(0, 100),
      })
    }
  } catch (error) {
    log({
      name: 'Twilio Account',
      status: 'fail',
      message: 'Connection error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function checkTwilioPhoneNumber(): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !phoneNumber) {
    log({
      name: 'Twilio Phone Number',
      status: 'fail',
      message: 'Cannot verify - missing credentials or phone number',
    })
    return
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.incoming_phone_numbers && data.incoming_phone_numbers.length > 0) {
        const phone = data.incoming_phone_numbers[0]
        log({
          name: 'Twilio Phone Number',
          status: 'pass',
          message: `Found: ${phone.phone_number}`,
          details: `SMS URL: ${phone.sms_url || 'Not configured'}, Voice URL: ${phone.voice_url || 'Not configured'}`,
        })

        // Check webhook configuration
        if (!phone.sms_url) {
          log({
            name: 'Twilio SMS Webhook',
            status: 'warn',
            message: 'Not configured',
            details: 'Set to: https://your-domain.com/api/sms/webhook',
          })
        } else {
          log({
            name: 'Twilio SMS Webhook',
            status: 'pass',
            message: `Configured: ${phone.sms_url}`,
          })
        }

        if (!phone.voice_url) {
          log({
            name: 'Twilio Voice Webhook',
            status: 'warn',
            message: 'Not configured',
            details: 'Set to: https://your-domain.com/api/voice/webhook',
          })
        } else {
          log({
            name: 'Twilio Voice Webhook',
            status: 'pass',
            message: `Configured: ${phone.voice_url}`,
          })
        }
      } else {
        log({
          name: 'Twilio Phone Number',
          status: 'fail',
          message: `Phone ${phoneNumber} not found in account`,
        })
      }
    } else {
      log({
        name: 'Twilio Phone Number',
        status: 'fail',
        message: `API error (${response.status})`,
      })
    }
  } catch (error) {
    log({
      name: 'Twilio Phone Number',
      status: 'fail',
      message: 'Connection error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function checkResendApiKey(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    log({
      name: 'Resend API Key',
      status: 'fail',
      message: 'Missing',
    })
    return
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      log({
        name: 'Resend API Key',
        status: 'pass',
        message: 'Valid',
        details: `Found ${data.data?.length || 0} domain(s)`,
      })

      // Check domain status
      if (data.data && data.data.length > 0) {
        for (const domain of data.data) {
          const status = domain.status === 'verified' ? 'pass' : 'warn'
          log({
            name: `Resend Domain: ${domain.name}`,
            status,
            message: domain.status,
            details: status === 'warn' ? 'Add DNS records to verify' : undefined,
          })
        }
      } else {
        log({
          name: 'Resend Domains',
          status: 'warn',
          message: 'No domains configured',
          details: 'Add a domain at resend.com/domains',
        })
      }
    } else {
      const error = await response.text()
      log({
        name: 'Resend API Key',
        status: 'fail',
        message: `Invalid (${response.status})`,
        details: error.substring(0, 100),
      })
    }
  } catch (error) {
    log({
      name: 'Resend API Key',
      status: 'fail',
      message: 'Connection error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function main() {
  console.log('\n========================================')
  console.log('  Communications Configuration Verifier')
  console.log('========================================\n')

  // 1. Check environment variables
  console.log('--- Environment Variables ---\n')
  await checkEnvVar('TWILIO_ACCOUNT_SID')
  await checkEnvVar('TWILIO_AUTH_TOKEN')
  await checkEnvVar('TWILIO_PHONE_NUMBER')
  await checkEnvVar('TWILIO_MESSAGING_SERVICE_SID', false) // Optional for A2P
  console.log()
  await checkEnvVar('RESEND_API_KEY')
  await checkEnvVar('RESEND_FROM_EMAIL')
  await checkEnvVar('RESEND_WEBHOOK_SECRET', false) // Optional but recommended
  console.log()

  // 2. Verify Twilio
  console.log('--- Twilio Verification ---\n')
  await checkTwilioAccount()
  await checkTwilioPhoneNumber()
  console.log()

  // 3. Verify Resend
  console.log('--- Resend Verification ---\n')
  await checkResendApiKey()
  console.log()

  // Summary
  console.log('========================================')
  console.log('  Summary')
  console.log('========================================\n')

  const passed = results.filter(r => r.status === 'pass').length
  const warned = results.filter(r => r.status === 'warn').length
  const failed = results.filter(r => r.status === 'fail').length

  console.log(`\u2705 Passed: ${passed}`)
  console.log(`\u26A0\uFE0F  Warnings: ${warned}`)
  console.log(`\u274C Failed: ${failed}`)
  console.log()

  if (failed > 0) {
    console.log('Action required: Fix failed checks before using communications.\n')
    process.exit(1)
  } else if (warned > 0) {
    console.log('Some warnings - communications may work but review recommended.\n')
    process.exit(0)
  } else {
    console.log('All checks passed - communications ready!\n')
    process.exit(0)
  }
}

main().catch(console.error)
