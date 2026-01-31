import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Locale display names
export const localeNames = {
  en: 'English',
  es: 'Español',
  fr: 'Français'
} as const;

// Locale regions for formatting
export const localeRegions = {
  en: 'US',
  es: 'US', // US Hispanic market
  fr: 'CA'  // Canadian market
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the [locale] URL segment
  const requested = await requestLocale;

  // Validate that the incoming locale parameter is valid, fall back to default
  const locale: Locale = requested && locales.includes(requested as Locale)
    ? (requested as Locale)
    : defaultLocale;

  return {
    messages: (await import(`./translations/${locale}.json`)).default,
    locale,
  };
});
