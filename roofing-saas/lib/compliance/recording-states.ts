/**
 * Recording Consent State Detection
 * Determines whether all-party consent is required for call recording
 *
 * Legal Background:
 * - Federal law (18 USC § 2511) allows one-party consent for call recording
 * - Some states require ALL parties to consent before recording
 * - Tennessee is a ONE-PARTY state (only caller needs to consent)
 * - When calling into TWO-PARTY states, MUST announce recording AND get consent
 *
 * Two-Party (All-Party) Consent States (as of 2025):
 * California, Connecticut, Florida, Illinois, Maryland,
 * Massachusetts, Michigan, Montana, New Hampshire,
 * Pennsylvania, Washington
 *
 * Note: Some states have exceptions for business calls or public officials.
 * This implementation takes the conservative approach: if it's a two-party state,
 * we announce and require consent.
 */

import { logger } from '@/lib/logger'

/**
 * States requiring all-party consent for call recording
 * Source: Digital Media Law Project, state statutes
 */
export const TWO_PARTY_CONSENT_STATES = [
  'CA', // California - Cal. Penal Code § 632
  'CT', // Connecticut - Conn. Gen. Stat. § 52-570d
  'FL', // Florida - Fla. Stat. § 934.03
  'IL', // Illinois - 720 ILCS 5/14-2
  'MD', // Maryland - Md. Code, Cts. & Jud. Proc. § 10-402
  'MA', // Massachusetts - Mass. Gen. Laws ch. 272, § 99
  'MI', // Michigan - Mich. Comp. Laws § 750.539c (partial - eavesdropping)
  'MT', // Montana - Mont. Code Ann. § 45-8-213
  'NH', // New Hampshire - N.H. Rev. Stat. § 570-A:2
  'PA', // Pennsylvania - 18 Pa. Cons. Stat. § 5703
  'WA', // Washington - Wash. Rev. Code § 9.73.030
] as const

export type TwoPartyState = (typeof TWO_PARTY_CONSENT_STATES)[number]

/**
 * Area code to state mapping
 * Covers all US area codes as of 2025
 * Format: { areaCode: 'STATE_ABBREV' }
 */
export const AREA_CODE_TO_STATE: Record<string, string> = {
  // Alabama (AL) - One-party
  '205': 'AL', '251': 'AL', '256': 'AL', '334': 'AL', '659': 'AL', '938': 'AL',

  // Alaska (AK) - One-party
  '907': 'AK',

  // Arizona (AZ) - One-party
  '480': 'AZ', '520': 'AZ', '602': 'AZ', '623': 'AZ', '928': 'AZ',

  // Arkansas (AR) - One-party
  '479': 'AR', '501': 'AR', '870': 'AR',

  // California (CA) - TWO-PARTY
  '209': 'CA', '213': 'CA', '279': 'CA', '310': 'CA', '323': 'CA', '341': 'CA',
  '350': 'CA', '408': 'CA', '415': 'CA', '424': 'CA', '442': 'CA', '510': 'CA',
  '530': 'CA', '559': 'CA', '562': 'CA', '619': 'CA', '626': 'CA', '628': 'CA',
  '650': 'CA', '657': 'CA', '661': 'CA', '669': 'CA', '707': 'CA', '714': 'CA',
  '747': 'CA', '760': 'CA', '805': 'CA', '818': 'CA', '820': 'CA', '831': 'CA',
  '840': 'CA', '858': 'CA', '909': 'CA', '916': 'CA', '925': 'CA', '949': 'CA',
  '951': 'CA',

  // Colorado (CO) - One-party
  '303': 'CO', '719': 'CO', '720': 'CO', '970': 'CO', '983': 'CO',

  // Connecticut (CT) - TWO-PARTY
  '203': 'CT', '475': 'CT', '860': 'CT', '959': 'CT',

  // Delaware (DE) - One-party
  '302': 'DE',

  // Florida (FL) - TWO-PARTY
  '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL',
  '448': 'FL', '561': 'FL', '656': 'FL', '689': 'FL', '727': 'FL', '754': 'FL',
  '772': 'FL', '786': 'FL', '813': 'FL', '850': 'FL', '863': 'FL', '904': 'FL',
  '941': 'FL', '954': 'FL',

  // Georgia (GA) - One-party
  '229': 'GA', '404': 'GA', '470': 'GA', '478': 'GA', '678': 'GA', '706': 'GA',
  '762': 'GA', '770': 'GA', '912': 'GA', '943': 'GA',

  // Hawaii (HI) - One-party
  '808': 'HI',

  // Idaho (ID) - One-party
  '208': 'ID', '986': 'ID',

  // Illinois (IL) - TWO-PARTY
  '217': 'IL', '224': 'IL', '309': 'IL', '312': 'IL', '331': 'IL', '447': 'IL',
  '464': 'IL', '618': 'IL', '630': 'IL', '708': 'IL', '773': 'IL', '779': 'IL',
  '815': 'IL', '847': 'IL', '872': 'IL',

  // Indiana (IN) - One-party
  '219': 'IN', '260': 'IN', '317': 'IN', '463': 'IN', '574': 'IN', '765': 'IN',
  '812': 'IN', '930': 'IN',

  // Iowa (IA) - One-party
  '319': 'IA', '515': 'IA', '563': 'IA', '641': 'IA', '712': 'IA',

  // Kansas (KS) - One-party
  '316': 'KS', '620': 'KS', '785': 'KS', '913': 'KS',

  // Kentucky (KY) - One-party
  '270': 'KY', '364': 'KY', '502': 'KY', '606': 'KY', '859': 'KY',

  // Louisiana (LA) - One-party
  '225': 'LA', '318': 'LA', '337': 'LA', '504': 'LA', '985': 'LA',

  // Maine (ME) - One-party
  '207': 'ME',

  // Maryland (MD) - TWO-PARTY
  '240': 'MD', '301': 'MD', '410': 'MD', '443': 'MD', '667': 'MD',

  // Massachusetts (MA) - TWO-PARTY
  '339': 'MA', '351': 'MA', '413': 'MA', '508': 'MA', '617': 'MA', '774': 'MA',
  '781': 'MA', '857': 'MA', '978': 'MA',

  // Michigan (MI) - TWO-PARTY (for eavesdropping)
  '231': 'MI', '248': 'MI', '269': 'MI', '313': 'MI', '517': 'MI', '586': 'MI',
  '616': 'MI', '679': 'MI', '734': 'MI', '810': 'MI', '906': 'MI', '947': 'MI',
  '989': 'MI',

  // Minnesota (MN) - One-party
  '218': 'MN', '320': 'MN', '507': 'MN', '612': 'MN', '651': 'MN', '763': 'MN',
  '952': 'MN',

  // Mississippi (MS) - One-party
  '228': 'MS', '601': 'MS', '662': 'MS', '769': 'MS',

  // Missouri (MO) - One-party
  '314': 'MO', '417': 'MO', '573': 'MO', '636': 'MO', '660': 'MO', '816': 'MO',
  '975': 'MO',

  // Montana (MT) - TWO-PARTY
  '406': 'MT',

  // Nebraska (NE) - One-party
  '308': 'NE', '402': 'NE', '531': 'NE',

  // Nevada (NV) - One-party
  '702': 'NV', '725': 'NV', '775': 'NV',

  // New Hampshire (NH) - TWO-PARTY
  '603': 'NH',

  // New Jersey (NJ) - One-party
  '201': 'NJ', '551': 'NJ', '609': 'NJ', '640': 'NJ', '732': 'NJ', '848': 'NJ',
  '856': 'NJ', '862': 'NJ', '908': 'NJ', '973': 'NJ',

  // New Mexico (NM) - One-party
  '505': 'NM', '575': 'NM',

  // New York (NY) - One-party
  '212': 'NY', '315': 'NY', '332': 'NY', '347': 'NY', '363': 'NY', '516': 'NY',
  '518': 'NY', '585': 'NY', '607': 'NY', '631': 'NY', '646': 'NY', '680': 'NY',
  '716': 'NY', '718': 'NY', '838': 'NY', '845': 'NY', '914': 'NY', '917': 'NY',
  '929': 'NY', '934': 'NY',

  // North Carolina (NC) - One-party
  '252': 'NC', '336': 'NC', '704': 'NC', '743': 'NC', '828': 'NC', '910': 'NC',
  '919': 'NC', '980': 'NC', '984': 'NC',

  // North Dakota (ND) - One-party
  '701': 'ND',

  // Ohio (OH) - One-party
  '216': 'OH', '220': 'OH', '234': 'OH', '283': 'OH', '326': 'OH', '330': 'OH',
  '380': 'OH', '419': 'OH', '440': 'OH', '513': 'OH', '567': 'OH', '614': 'OH',
  '740': 'OH', '937': 'OH',

  // Oklahoma (OK) - One-party
  '405': 'OK', '539': 'OK', '572': 'OK', '580': 'OK', '918': 'OK',

  // Oregon (OR) - One-party
  '458': 'OR', '503': 'OR', '541': 'OR', '971': 'OR',

  // Pennsylvania (PA) - TWO-PARTY
  '215': 'PA', '223': 'PA', '267': 'PA', '272': 'PA', '412': 'PA', '445': 'PA',
  '484': 'PA', '570': 'PA', '582': 'PA', '610': 'PA', '717': 'PA', '724': 'PA',
  '814': 'PA', '835': 'PA', '878': 'PA',

  // Rhode Island (RI) - One-party
  '401': 'RI',

  // South Carolina (SC) - One-party
  '803': 'SC', '839': 'SC', '843': 'SC', '854': 'SC', '864': 'SC',

  // South Dakota (SD) - One-party
  '605': 'SD',

  // Tennessee (TN) - One-party
  '423': 'TN', '615': 'TN', '629': 'TN', '731': 'TN', '865': 'TN', '901': 'TN',
  '931': 'TN',

  // Texas (TX) - One-party
  '210': 'TX', '214': 'TX', '254': 'TX', '281': 'TX', '325': 'TX', '346': 'TX',
  '361': 'TX', '409': 'TX', '430': 'TX', '432': 'TX', '469': 'TX', '512': 'TX',
  '682': 'TX', '713': 'TX', '726': 'TX', '737': 'TX', '806': 'TX', '817': 'TX',
  '830': 'TX', '832': 'TX', '903': 'TX', '915': 'TX', '936': 'TX', '940': 'TX',
  '945': 'TX', '956': 'TX', '972': 'TX', '979': 'TX',

  // Utah (UT) - One-party
  '385': 'UT', '435': 'UT', '801': 'UT',

  // Vermont (VT) - One-party
  '802': 'VT',

  // Virginia (VA) - One-party
  '276': 'VA', '434': 'VA', '540': 'VA', '571': 'VA', '703': 'VA', '757': 'VA',
  '804': 'VA', '826': 'VA', '948': 'VA',

  // Washington (WA) - TWO-PARTY
  '206': 'WA', '253': 'WA', '360': 'WA', '425': 'WA', '509': 'WA', '564': 'WA',

  // Washington DC (DC) - One-party
  '202': 'DC',

  // West Virginia (WV) - One-party
  '304': 'WV', '681': 'WV',

  // Wisconsin (WI) - One-party
  '262': 'WI', '274': 'WI', '414': 'WI', '534': 'WI', '608': 'WI', '715': 'WI',
  '920': 'WI',

  // Wyoming (WY) - One-party
  '307': 'WY',
}

export type RecordingConsentType = 'one_party' | 'two_party'

export interface RecordingConsentResult {
  consentType: RecordingConsentType
  state: string | null
  stateAbbrev: string | null
  requiresAnnouncement: boolean
  requiresVerbalConsent: boolean
  reason: string
}

/**
 * Extract area code from a phone number
 * Handles various formats: +14235551234, 14235551234, (423) 555-1234, etc.
 *
 * @param phoneNumber - Phone number in any common format
 * @returns Area code string or null if invalid
 */
export function extractAreaCode(phoneNumber: string): string | null {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '')

  // Handle US numbers (10 or 11 digits)
  if (digits.length === 10) {
    return digits.substring(0, 3)
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1, 4)
  }

  logger.warn('Could not extract area code from phone number', {
    phoneNumber,
    digitsLength: digits.length,
  })
  return null
}

/**
 * Get full state name from abbreviation
 */
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington DC',
}

/**
 * Check if a state requires two-party consent for recording
 *
 * @param stateAbbrev - Two-letter state abbreviation
 * @returns True if two-party consent required
 */
export function isTwoPartyState(stateAbbrev: string): boolean {
  return TWO_PARTY_CONSENT_STATES.includes(stateAbbrev.toUpperCase() as TwoPartyState)
}

/**
 * Determine recording consent requirements for a phone number
 * Based on the recipient's state (derived from area code)
 *
 * @param phoneNumber - Phone number to check
 * @returns Recording consent requirements
 */
export function getRecordingConsentRequirement(phoneNumber: string): RecordingConsentResult {
  const areaCode = extractAreaCode(phoneNumber)

  if (!areaCode) {
    // Can't determine state - assume two-party for safety
    logger.warn('Unknown area code, defaulting to two-party consent', { phoneNumber })
    return {
      consentType: 'two_party',
      state: null,
      stateAbbrev: null,
      requiresAnnouncement: true,
      requiresVerbalConsent: true,
      reason: 'Unable to determine state from phone number - using conservative two-party default',
    }
  }

  const stateAbbrev = AREA_CODE_TO_STATE[areaCode]

  if (!stateAbbrev) {
    // Unknown area code - assume two-party for safety
    logger.warn('Unknown state for area code, defaulting to two-party consent', {
      phoneNumber,
      areaCode,
    })
    return {
      consentType: 'two_party',
      state: null,
      stateAbbrev: null,
      requiresAnnouncement: true,
      requiresVerbalConsent: true,
      reason: `Unknown state for area code ${areaCode} - using conservative two-party default`,
    }
  }

  const stateName = STATE_NAMES[stateAbbrev] || stateAbbrev
  const isTwoParty = isTwoPartyState(stateAbbrev)

  if (isTwoParty) {
    return {
      consentType: 'two_party',
      state: stateName,
      stateAbbrev,
      requiresAnnouncement: true,
      requiresVerbalConsent: true,
      reason: `${stateName} is a two-party consent state - must announce recording AND obtain verbal consent`,
    }
  }

  return {
    consentType: 'one_party',
    state: stateName,
    stateAbbrev,
    requiresAnnouncement: true, // Always announce for transparency
    requiresVerbalConsent: false, // One-party states don't require verbal consent
    reason: `${stateName} is a one-party consent state - announcement recommended but verbal consent not legally required`,
  }
}

/**
 * Check multiple phone numbers and return the most restrictive requirement
 * Useful when a call might be transferred or involve multiple parties
 *
 * @param phoneNumbers - Array of phone numbers
 * @returns Most restrictive recording consent requirement
 */
export function getMostRestrictiveConsentRequirement(
  phoneNumbers: string[]
): RecordingConsentResult {
  let mostRestrictive: RecordingConsentResult | null = null

  for (const phoneNumber of phoneNumbers) {
    const requirement = getRecordingConsentRequirement(phoneNumber)

    if (!mostRestrictive || requirement.consentType === 'two_party') {
      mostRestrictive = requirement
    }

    // If we found a two-party requirement, that's the most restrictive
    if (requirement.consentType === 'two_party') {
      return requirement
    }
  }

  return (
    mostRestrictive || {
      consentType: 'two_party',
      state: null,
      stateAbbrev: null,
      requiresAnnouncement: true,
      requiresVerbalConsent: true,
      reason: 'No phone numbers provided - using conservative two-party default',
    }
  )
}

/**
 * Generate recording consent announcement text
 * Different text for one-party vs two-party states
 *
 * @param consentType - 'one_party' or 'two_party'
 * @returns Announcement text
 */
export function getRecordingAnnouncementText(consentType: RecordingConsentType): string {
  if (consentType === 'two_party') {
    return 'This call may be recorded for quality assurance. Do you consent to being recorded? Please say yes or no.'
  }

  return 'This call may be recorded for quality assurance and training purposes.'
}
