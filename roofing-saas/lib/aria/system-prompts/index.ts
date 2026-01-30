/**
 * ARIA System Prompt Selector
 * Returns pre-translated system prompts by language and channel.
 */

import type { SupportedLanguage } from '../types'
import type { ARIAContext } from '../types'

import {
  BASE_PROMPT_EN,
  CHANNEL_VOICE_INBOUND_EN,
  CHANNEL_VOICE_OUTBOUND_EN,
  CHANNEL_SMS_EN,
  AUTHORIZATION_RULES_EN,
} from './en'

import {
  BASE_PROMPT_ES,
  CHANNEL_VOICE_INBOUND_ES,
  CHANNEL_VOICE_OUTBOUND_ES,
  CHANNEL_SMS_ES,
  AUTHORIZATION_RULES_ES,
} from './es'

import {
  BASE_PROMPT_FR,
  CHANNEL_VOICE_INBOUND_FR,
  CHANNEL_VOICE_OUTBOUND_FR,
  CHANNEL_SMS_FR,
  AUTHORIZATION_RULES_FR,
} from './fr'

interface PromptSet {
  base: string
  voiceInbound: string
  voiceOutbound: string
  sms: string
  authorization: string
}

const PROMPTS: Record<SupportedLanguage, PromptSet> = {
  en: {
    base: BASE_PROMPT_EN,
    voiceInbound: CHANNEL_VOICE_INBOUND_EN,
    voiceOutbound: CHANNEL_VOICE_OUTBOUND_EN,
    sms: CHANNEL_SMS_EN,
    authorization: AUTHORIZATION_RULES_EN,
  },
  es: {
    base: BASE_PROMPT_ES,
    voiceInbound: CHANNEL_VOICE_INBOUND_ES,
    voiceOutbound: CHANNEL_VOICE_OUTBOUND_ES,
    sms: CHANNEL_SMS_ES,
    authorization: AUTHORIZATION_RULES_ES,
  },
  fr: {
    base: BASE_PROMPT_FR,
    voiceInbound: CHANNEL_VOICE_INBOUND_FR,
    voiceOutbound: CHANNEL_VOICE_OUTBOUND_FR,
    sms: CHANNEL_SMS_FR,
    authorization: AUTHORIZATION_RULES_FR,
  },
}

/**
 * Get the localized system prompt for ARIA, assembled from pre-translated parts.
 * Context summary (internal data labels) stays English — the LLM handles mixed-language fine.
 */
export function getLocalizedSystemPrompt(
  language: SupportedLanguage,
  channel: ARIAContext['channel']
): string {
  const promptSet = PROMPTS[language] || PROMPTS.en

  let prompt = promptSet.base

  // Add channel-specific instructions
  if (channel === 'voice_inbound') {
    prompt += promptSet.voiceInbound
  } else if (channel === 'voice_outbound') {
    prompt += promptSet.voiceOutbound
  } else if (channel === 'sms') {
    prompt += promptSet.sms
  }

  // Add authorization rules
  prompt += `\n\n${promptSet.authorization}`

  return prompt
}
