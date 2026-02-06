/**
 * ARIA Language Service
 * Phase 11 - Multi-Language Support
 *
 * Handles language detection, translation, and preference management.
 * Uses gpt-4o-mini for fast, cheap language operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupportedLanguage } from './types'
import { locales } from '@/lib/i18n/config'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { getAnthropicClient } from '@/lib/ai/anthropic-client'
import { getProviderForTask } from '@/lib/ai/provider'
import { logger } from '@/lib/logger'

// =============================================================================
// Language Detection
// =============================================================================

export interface LanguageDetectionResult {
  language: SupportedLanguage
  confidence: number
}

const LANG_DETECT_PROMPT = `You are a language detector. Identify the language of the user's text.
Only return one of these supported languages: en (English), es (Spanish), fr (French).
If the language is not one of these three, return "en" as default.

Respond in JSON format:
{
  "language": "en" | "es" | "fr",
  "confidence": number (0-1)
}`

/**
 * Detect the language of inbound text.
 * Uses Claude Haiku 4.5 (default) or OpenAI gpt-4o-mini (fallback).
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  if (text.length < 3) {
    return { language: 'en', confidence: 0.5 }
  }

  const providerConfig = getProviderForTask('language_detection')

  try {
    let content: string | null = null

    if (providerConfig.provider === 'anthropic') {
      const client = getAnthropicClient()
      const response = await client.messages.create({
        model: providerConfig.model,
        max_tokens: 100,
        system: LANG_DETECT_PROMPT,
        messages: [{ role: 'user', content: text }],
      })

      const textBlock = response.content.find(b => b.type === 'text')
      content = textBlock && 'text' in textBlock ? textBlock.text : null
    } else {
      const response = await getOpenAIClient().chat.completions.create({
        model: providerConfig.model,
        messages: [
          { role: 'system', content: LANG_DETECT_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 50,
        response_format: { type: 'json_object' },
      })

      content = response.choices[0]?.message?.content ?? null
    }

    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as { language: string; confidence: number }
        const lang = result.language as SupportedLanguage

        if (locales.includes(lang)) {
          return {
            language: lang,
            confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Language detection failed, defaulting to English', { error })
  }

  return { language: 'en', confidence: 0.5 }
}

// =============================================================================
// Response Translation
// =============================================================================

/**
 * Translate ARIA's response to the target language.
 * Uses Claude Haiku 4.5 (default) or OpenAI gpt-4o-mini.
 * No-op for English — returns input unchanged.
 */
export async function translateResponse(
  text: string,
  targetLanguage: SupportedLanguage,
  context?: string
): Promise<string> {
  if (targetLanguage === 'en') return text
  if (!text.trim()) return text

  const languageNames: Record<SupportedLanguage, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
  }

  const systemPrompt = `You are a professional translator for a roofing business. Translate the following text from English to ${languageNames[targetLanguage]}.

Rules:
- Maintain the same tone (warm, professional, helpful)
- Keep any proper nouns unchanged (company names, person names, addresses)
- Keep phone numbers, dates, and dollar amounts in their original format
- Do not add or remove information
- If the text contains technical roofing terms, use the appropriate ${languageNames[targetLanguage]} equivalent
${context ? `\nContext: ${context}` : ''}

Return ONLY the translated text, nothing else.`

  const providerConfig = getProviderForTask('language_detection')

  try {
    let translated: string | null = null

    if (providerConfig.provider === 'anthropic') {
      const client = getAnthropicClient()
      const response = await client.messages.create({
        model: providerConfig.model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
      })

      const textBlock = response.content.find(b => b.type === 'text')
      translated = textBlock && 'text' in textBlock ? textBlock.text.trim() : null
    } else {
      const response = await getOpenAIClient().chat.completions.create({
        model: providerConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })

      translated = response.choices[0]?.message?.content?.trim() ?? null
    }

    if (translated) return translated
  } catch (error) {
    logger.error('Translation failed, returning original text', { error, targetLanguage })
  }

  return text
}

// =============================================================================
// Contact Language Preference
// =============================================================================

/**
 * Update a contact's preferred language in the database.
 */
export async function updateContactLanguage(
  supabase: SupabaseClient,
  contactId: string,
  tenantId: string,
  language: SupportedLanguage
): Promise<void> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ preferred_language: language })
      .eq('id', contactId)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to update contact language preference', {
        error,
        contactId,
        language,
      })
    } else {
      logger.info('Contact language preference updated', {
        contactId,
        language,
      })
    }
  } catch (error) {
    logger.error('Error updating contact language', { error, contactId })
  }
}

// =============================================================================
// Language Resolution
// =============================================================================

/**
 * Resolve the effective language for a conversation.
 * Priority: detected language > stored preference > English default
 */
export function resolveLanguage(
  detected?: SupportedLanguage,
  contactPreference?: string
): SupportedLanguage {
  // Detected language takes priority (it's what the customer is speaking NOW)
  if (detected && detected !== 'en' && locales.includes(detected)) {
    return detected
  }

  // Fall back to stored preference
  if (
    contactPreference &&
    locales.includes(contactPreference as SupportedLanguage)
  ) {
    return contactPreference as SupportedLanguage
  }

  // Default to English
  return 'en'
}
