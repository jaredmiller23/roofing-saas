import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';

export default createMiddleware({
  // A list of all locales that are supported
  locales,
  
  // Used when no locale matches
  defaultLocale,
  
  // Automatically redirect to locale-specific URLs
  // e.g., /dashboard -> /en/dashboard
  localeDetection: true,
  
  // Optional: Customize the locale prefix
  // Set to 'never' to not include locale in the URL
  // localePrefix: 'as-needed'
});

export const config = {
  // Match only internationalized pathnames
  // Exclude API routes, static files, and internal Next.js routes
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(en|es|fr)/:path*',
    
    // Enable redirects that add missing locales
    // (e.g. `/dashboard` -> `/en/dashboard`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
