import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)

// Re-export useLocale so existing imports don't break
export { useLocale } from 'next-intl'
