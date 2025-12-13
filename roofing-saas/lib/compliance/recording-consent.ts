/**
 * Recording Consent Announcements
 * Generates TwiML for TCPA-compliant recording announcements
 *
 * TCPA requires notification before recording calls
 */

import type { RecordingConsentConfig } from './types'

/**
 * Default recording announcement message
 * TCPA compliant notification
 */
const DEFAULT_RECORDING_MESSAGE =
  'This call may be recorded for quality and training purposes.'

/**
 * Generate TwiML for recording announcement
 * Plays announcement before call is connected/recorded
 *
 * @param config - Optional configuration for voice/language/message
 * @returns TwiML XML string
 *
 * @example
 * const twiml = generateRecordingAnnouncementTwiML();
 * // Returns: <Response><Say>This call may be recorded...</Say></Response>
 */
export function generateRecordingAnnouncementTwiML(
  config?: RecordingConsentConfig
): string {
  const message = config?.message || DEFAULT_RECORDING_MESSAGE
  const voice = config?.voice || 'alice'
  const language = config?.language || 'en-US'

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(message)}</Say>
</Response>`
}

/**
 * Generate TwiML for recording announcement with call connection
 * Plays announcement then connects call with recording
 *
 * @param phoneNumber - Number to dial after announcement
 * @param config - Optional configuration
 * @returns TwiML XML string
 *
 * @example
 * const twiml = generateRecordingAnnouncementWithDialTwiML('+14235551234');
 */
export function generateRecordingAnnouncementWithDialTwiML(
  phoneNumber: string,
  config?: RecordingConsentConfig
): string {
  const message = config?.message || DEFAULT_RECORDING_MESSAGE
  const voice = config?.voice || 'alice'
  const language = config?.language || 'en-US'

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(message)}</Say>
  <Dial record="record-from-answer" recordingStatusCallback="/api/twilio/recording-status">
    <Number>${escapeXml(phoneNumber)}</Number>
  </Dial>
</Response>`
}

/**
 * Generate TwiML for conference with recording announcement
 * Used for multi-party calls or conference scenarios
 *
 * @param conferenceName - Name of conference room
 * @param config - Optional configuration
 * @returns TwiML XML string
 */
export function generateConferenceRecordingTwiML(
  conferenceName: string,
  config?: RecordingConsentConfig
): string {
  const message = config?.message || DEFAULT_RECORDING_MESSAGE
  const voice = config?.voice || 'alice'
  const language = config?.language || 'en-US'

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(message)}</Say>
  <Dial>
    <Conference record="record-from-start" recordingStatusCallback="/api/twilio/recording-status">
      ${escapeXml(conferenceName)}
    </Conference>
  </Dial>
</Response>`
}

/**
 * Escape XML special characters for TwiML
 * Prevents XML injection vulnerabilities
 *
 * @param text - Text to escape
 * @returns Escaped text safe for XML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Validate TwiML voice parameter
 * Ensures voice is a valid Twilio voice option
 *
 * @param voice - Voice to validate
 * @returns boolean indicating if voice is valid
 */
export function isValidTwiMLVoice(
  voice: string
): voice is 'alice' | 'man' | 'woman' {
  return ['alice', 'man', 'woman'].includes(voice)
}

/**
 * Get list of supported recording announcement languages
 * Returns common languages supported by Twilio
 *
 * @returns Array of language codes
 */
export function getSupportedLanguages(): string[] {
  return [
    'en-US', // English (US)
    'en-GB', // English (UK)
    'es-ES', // Spanish (Spain)
    'es-MX', // Spanish (Mexico)
    'fr-FR', // French
    'de-DE', // German
    'it-IT', // Italian
    'pt-BR', // Portuguese (Brazil)
    'ja-JP', // Japanese
    'zh-CN', // Chinese (Mandarin)
  ]
}
