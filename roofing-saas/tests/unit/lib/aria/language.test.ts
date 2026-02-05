/**
 * Unit tests for ARIA Language Service (Phase 11)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectLanguage, translateResponse, resolveLanguage, updateContactLanguage } from '@/lib/aria/language'

// Mock OpenAI client
const mockOpenAIClient = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
}

vi.mock('@/lib/ai/openai-client', () => ({
  getOpenAIClient: () => mockOpenAIClient,
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockCreate = vi.mocked(mockOpenAIClient.chat.completions.create)

describe('Language Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // detectLanguage
  // ===========================================================================
  describe('detectLanguage()', () => {
    it('should detect Spanish text', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ language: 'es', confidence: 0.95 }),
            },
          },
        ],
      } as never)

      const result = await detectLanguage('Hola, necesito ayuda con mi techo')

      expect(result.language).toBe('es')
      expect(result.confidence).toBe(0.95)
    })

    it('should detect French text', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ language: 'fr', confidence: 0.92 }),
            },
          },
        ],
      } as never)

      const result = await detectLanguage('Bonjour, j\'ai besoin d\'aide avec mon toit')

      expect(result.language).toBe('fr')
      expect(result.confidence).toBe(0.92)
    })

    it('should detect English text', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ language: 'en', confidence: 0.99 }),
            },
          },
        ],
      } as never)

      const result = await detectLanguage('Hello, I need help with my roof')

      expect(result.language).toBe('en')
      expect(result.confidence).toBe(0.99)
    })

    it('should return English with low confidence for very short text', async () => {
      const result = await detectLanguage('Hi')

      expect(result.language).toBe('en')
      expect(result.confidence).toBe(0.5)
      // Should NOT call OpenAI for text < 3 chars
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should default to English if detection fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'))

      const result = await detectLanguage('Some text in an unknown language')

      expect(result.language).toBe('en')
      expect(result.confidence).toBe(0.5)
    })

    it('should default to English for unsupported languages', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ language: 'de', confidence: 0.9 }),
            },
          },
        ],
      } as never)

      const result = await detectLanguage('Guten Tag, ich brauche Hilfe')

      expect(result.language).toBe('en')
      expect(result.confidence).toBe(0.5)
    })
  })

  // ===========================================================================
  // translateResponse
  // ===========================================================================
  describe('translateResponse()', () => {
    it('should return input unchanged for English target', async () => {
      const result = await translateResponse('Hello there', 'en')

      expect(result).toBe('Hello there')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should return empty string unchanged', async () => {
      const result = await translateResponse('', 'es')

      expect(result).toBe('')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should translate to Spanish', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Hola, estoy aqui para ayudarte.',
            },
          },
        ],
      } as never)

      const result = await translateResponse('Hello, I am here to help you.', 'es')

      expect(result).toBe('Hola, estoy aqui para ayudarte.')
      expect(mockCreate).toHaveBeenCalledOnce()
    })

    it('should translate to French', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Bonjour, je suis la pour vous aider.',
            },
          },
        ],
      } as never)

      const result = await translateResponse('Hello, I am here to help you.', 'fr')

      expect(result).toBe('Bonjour, je suis la pour vous aider.')
    })

    it('should return original text if translation fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Translation API error'))

      const result = await translateResponse('Hello, I need help.', 'es')

      expect(result).toBe('Hello, I need help.')
    })

    it('should pass context to translation prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Texto traducido',
            },
          },
        ],
      } as never)

      await translateResponse('Some text', 'es', 'SMS response to customer')

      const callArgs = mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> }
      expect(callArgs.messages[0].content).toContain('SMS response to customer')
    })
  })

  // ===========================================================================
  // resolveLanguage
  // ===========================================================================
  describe('resolveLanguage()', () => {
    it('should prefer detected non-English language over stored preference', () => {
      const result = resolveLanguage('es', 'fr')
      expect(result).toBe('es')
    })

    it('should fall back to stored preference when detected is English', () => {
      const result = resolveLanguage('en', 'es')
      expect(result).toBe('es')
    })

    it('should fall back to stored preference when no detection', () => {
      const result = resolveLanguage(undefined, 'fr')
      expect(result).toBe('fr')
    })

    it('should default to English when no detection and no preference', () => {
      const result = resolveLanguage(undefined, undefined)
      expect(result).toBe('en')
    })

    it('should default to English when both are English', () => {
      const result = resolveLanguage('en', 'en')
      expect(result).toBe('en')
    })

    it('should ignore invalid stored preference', () => {
      const result = resolveLanguage(undefined, 'de')
      expect(result).toBe('en')
    })

    it('should use detected language even without stored preference', () => {
      const result = resolveLanguage('fr', undefined)
      expect(result).toBe('fr')
    })
  })

  // ===========================================================================
  // updateContactLanguage
  // ===========================================================================
  describe('updateContactLanguage()', () => {
    it('should call supabase update with correct parameters', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      const mockSupabase = { from: mockFrom } as never

      // Make the second eq call return success
      mockEq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) })

      await updateContactLanguage(mockSupabase, 'contact-123', 'tenant-456', 'es')

      expect(mockFrom).toHaveBeenCalledWith('contacts')
      expect(mockUpdate).toHaveBeenCalledWith({ preferred_language: 'es' })
    })

    it('should not throw on error (logs instead)', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
          }),
        }),
      })

      const mockSupabase = { from: mockFrom } as never

      // Should not throw
      await expect(
        updateContactLanguage(mockSupabase, 'contact-123', 'tenant-456', 'fr')
      ).resolves.toBeUndefined()
    })
  })
})
