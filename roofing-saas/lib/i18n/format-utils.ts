import { Locale, localeRegions } from './config';

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency: string = 'USD'
): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  
  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date based on locale
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat(localeString, options || defaultOptions).format(dateObj);
}

/**
 * Format date and time based on locale
 */
export function formatDateTime(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Intl.DateTimeFormat(localeString, options || defaultOptions).format(dateObj);
}

/**
 * Format number based on locale
 */
export function formatNumber(
  number: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  
  return new Intl.NumberFormat(localeString, options).format(number);
}

/**
 * Format percentage based on locale
 */
export function formatPercentage(
  value: number,
  locale: Locale,
  decimalPlaces: number = 1
): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  
  return new Intl.NumberFormat(localeString, {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value / 100);
}

/**
 * Get relative time format (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: Locale,
  baseDate: Date = new Date()
): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const diffInMs = dateObj.getTime() - baseDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  const rtf = new Intl.RelativeTimeFormat(localeString, { numeric: 'auto' });
  
  if (Math.abs(diffInDays) > 0) {
    return rtf.format(diffInDays, 'day');
  } else if (Math.abs(diffInHours) > 0) {
    return rtf.format(diffInHours, 'hour');
  } else if (Math.abs(diffInMinutes) > 0) {
    return rtf.format(diffInMinutes, 'minute');
  } else {
    return rtf.format(diffInSeconds, 'second');
  }
}

/**
 * Get locale-specific date format pattern
 */
export function getDateFormatPattern(locale: Locale): string {
  const region = localeRegions[locale];
  
  // US format: MM/DD/YYYY
  // Canadian format: YYYY-MM-DD (ISO format)
  // For consistency, we'll use the region to determine format
  switch (region) {
    case 'US':
      return 'MM/DD/YYYY';
    case 'CA':
      return 'YYYY-MM-DD';
    default:
      return 'MM/DD/YYYY';
  }
}

/**
 * Get locale-specific currency symbol
 */
export function getCurrencySymbol(locale: Locale, currency: string = 'USD'): string {
  const region = localeRegions[locale];
  const localeString = `${locale}-${region}`;
  
  const formatter = new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  // Extract just the currency symbol
  const parts = formatter.formatToParts(0);
  const currencyPart = parts.find(part => part.type === 'currency');
  return currencyPart?.value || '$';
}

/**
 * Check if locale uses RTL (Right-to-Left) direction
 */
export function isRTLLocale(locale: Locale): boolean {
  // None of our current locales (en, es, fr) are RTL
  // This is prepared for future RTL language support
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.includes(locale);
}

/**
 * Get text direction for locale
 */
export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}
