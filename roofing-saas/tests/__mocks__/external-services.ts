/**
 * Mock external services (Twilio, Resend, etc.) for testing
 */

import { vi } from 'vitest'

// Mock fetch for external API calls
global.fetch = vi.fn()

export const mockFetch = global.fetch as ReturnType<typeof vi.fn>

// Mock weather API response
export const mockWeatherResponse = {
  location: 'Nashville, TN',
  current: {
    temp_f: 75,
    condition: { text: 'Sunny' },
    wind_mph: 5,
    humidity: 60,
  },
  forecast: {
    forecastday: [
      {
        day: {
          maxtemp_f: 80,
          mintemp_f: 65,
          condition: { text: 'Partly cloudy' },
          maxwind_mph: 10,
        },
      },
    ],
  },
}

// Setup default fetch mocks
export const setupMockFetch = () => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/voice/weather')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockWeatherResponse),
      })
    }

    // Default to successful response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
  })
}

// Mock Twilio
export const mockTwilio = {
  messages: {
    create: vi.fn().mockResolvedValue({
      sid: 'mock-message-sid',
      status: 'sent',
    }),
  },
  calls: {
    create: vi.fn().mockResolvedValue({
      sid: 'mock-call-sid',
      status: 'initiated',
    }),
  },
}

// Mock Resend
export const mockResend = {
  emails: {
    send: vi.fn().mockResolvedValue({
      id: 'mock-email-id',
      status: 'sent',
    }),
  },
}

// Reset all mocks
export const resetExternalMocks = () => {
  mockFetch.mockReset()
  setupMockFetch()
  vi.clearAllMocks()
}