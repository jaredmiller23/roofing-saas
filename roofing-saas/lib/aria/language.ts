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
import { openai } from '@/lib/ai/openai-client'
import { logger } from '@/lib/logger'

// =============================================================================
// Language Detection
// =============================================================================

export interface LanguageDetectionResult {
  language: SupportedLanguage
  confidence: number
}

/**
 * Detect the language of inbound text using gpt-4o-mini.
 * Returns detected language and confidence score.
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  // Short-circuit: if text is very short or obviously English, skip API call
  if (text.length < 3) {
    return { language: 'en', confidence: 0.5 }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a language detector. Identify the language of the user's text.
Only return one of these supported languages: en (English), es (Spanish), fr (French).
If the language is not one of these three, return "en" as default.

Respond in JSON format:
{
  "language": "en" | "es" | "fr",
  "confidence": number (0-1)
}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0,
      max_tokens: 50,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      const result = JSON.parse(content) as { language: string; confidence: number }
      const lang = result.language as SupportedLanguage

      // Validate the language is one we support
      if (locales.includes(lang)) {
        return {
          language: lang,
          confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
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
 * Translate ARIA's response to the target language using gpt-4o-mini.
 * No-op for English — returns input unchanged.
 */
export async function translateResponse(
  text: string,
  targetLanguage: SupportedLanguage,
  context?: string
): Promise<string> {
  // No translation needed for English
  if (targetLanguage === 'en') {
    return text
  }

  // Don't translate empty strings
  if (!text.trim()) {
    return text
  }

  const languageNames: Record<SupportedLanguage, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for a roofing business. Translate the following text from English to ${languageNames[targetLanguage]}.

Rules:
- Maintain the same tone (warm, professional, helpful)
- Keep any proper nouns unchanged (company names, person names, addresses)
- Keep phone numbers, dates, and dollar amounts in their original format
- Do not add or remove information
- If the text contains technical roofing terms, use the appropriate ${languageNames[targetLanguage]} equivalent
${context ? `\nContext: ${context}` : ''}

Return ONLY the translated text, nothing else.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const translated = response.choices[0]?.message?.content?.trim()
    if (translated) {
      return translated
    }
  } catch (error) {
    logger.error('Translation failed, returning original text', {
      error,
      targetLanguage,
    })
  }

  // Fallback: return original text if translation fails
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
