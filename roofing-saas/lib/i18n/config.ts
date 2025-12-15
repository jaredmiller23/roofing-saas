import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

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

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    messages: (await import(`./translations/${locale}.json`)).default,
    locale: locale as string
  };
});
