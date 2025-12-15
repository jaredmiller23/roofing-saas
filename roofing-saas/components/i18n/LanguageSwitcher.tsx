'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Check } from 'lucide-react'
import { locales, localeNames, type Locale } from '@/lib/i18n/config'
import { useRouter, usePathname } from 'next/navigation'

interface LanguageSwitcherProps {
  currentLocale?: Locale
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChanging, setIsChanging] = useState(false)

  // Extract current locale from pathname if not provided
  const detectedLocale = currentLocale ||
    (pathname.startsWith('/en/') ? 'en' :
     pathname.startsWith('/es/') ? 'es' :
     pathname.startsWith('/fr/') ? 'fr' : 'en') as Locale

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === detectedLocale) return

    setIsChanging(true)

    try {
      // Remove current locale from pathname
      let newPath = pathname
      for (const locale of locales) {
        if (pathname.startsWith(`/${locale}/`)) {
          newPath = pathname.slice(`/${locale}`.length)
          break
        }
      }

      // Add new locale to pathname
      const finalPath = newLocale === 'en'
        ? newPath || '/'
        : `/${newLocale}${newPath || '/'}`

      router.push(finalPath)
    } catch (error) {
      console.error('Failed to change language:', error)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isChanging}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {localeNames[detectedLocale]}
          </span>
          <span className="sm:hidden">
            {detectedLocale.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className="flex items-center justify-between gap-2"
          >
            <span>{localeNames[locale]}</span>
            {locale === detectedLocale && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}