'use client'

import { useMemo, forwardRef } from 'react'
import {
  useRouter as useNextRouter,
  useParams,
} from 'next/navigation'
import NextLink from 'next/link'
import { locales, defaultLocale } from './config'
import type { Locale } from './config'
import type { ComponentProps } from 'react'

/**
 * Adds locale prefix to a path if it doesn't already have one.
 * Handles both bare paths (/contacts) and locale-prefixed paths (/en/contacts).
 */
function addLocalePrefix(path: string, locale: Locale): string {
  // If path already starts with a locale prefix, return as-is
  for (const l of locales) {
    if (path.startsWith(`/${l}/`) || path === `/${l}`) {
      return path
    }
  }
  // Add locale prefix
  return `/${locale}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * Hook to get the current locale from the [locale] route parameter.
 */
export function useLocale(): Locale {
  const params = useParams()
  return (params?.locale as Locale) || defaultLocale
}

/**
 * Locale-aware useRouter that automatically prefixes paths with the current locale.
 * Drop-in replacement for next/navigation's useRouter.
 *
 * Uses useParams() to read the [locale] route segment, which is always available
 * inside app/[locale]/ routes. Falls back to defaultLocale for routes outside
 * the locale segment (e.g., /sign/ pages).
 *
 * Usage:
 *   import { useRouter } from '@/lib/i18n/navigation'
 *   const router = useRouter()
 *   router.push('/contacts') // → navigates to /en/contacts
 */
export function useRouter() {
  const nextRouter = useNextRouter()
  const locale = useLocale()

  return useMemo(() => ({
    ...nextRouter,
    push(href: string, options?: Parameters<typeof nextRouter.push>[1]) {
      nextRouter.push(addLocalePrefix(href, locale), options)
    },
    replace(href: string, options?: Parameters<typeof nextRouter.replace>[1]) {
      nextRouter.replace(addLocalePrefix(href, locale), options)
    },
    prefetch(href: string) {
      nextRouter.prefetch(addLocalePrefix(href, locale))
    },
  }), [nextRouter, locale])
}

/**
 * Locale-aware Link component that automatically prefixes href with the current locale.
 * Drop-in replacement for next/link's Link.
 *
 * Usage:
 *   import { Link } from '@/lib/i18n/navigation'
 *   <Link href="/contacts">Contacts</Link>  // → renders href="/en/contacts"
 */
export const Link = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NextLink>
>(function LocaleLink({ href, ...props }, ref) {
  const locale = useLocale()

  // Only prefix string hrefs that start with /
  const localizedHref =
    typeof href === 'string' && href.startsWith('/')
      ? addLocalePrefix(href, locale)
      : href

  return <NextLink ref={ref} href={localizedHref} {...props} />
})
