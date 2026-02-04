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
import { useRouter, usePathname } from '@/lib/i18n/navigation'
import { useLocale } from 'next-intl'

interface LanguageSwitcherProps {
  currentLocale?: Locale
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const intlLocale = useLocale()
  const [isChanging, setIsChanging] = useState(false)

  const detectedLocale = (currentLocale || intlLocale || 'en') as Locale

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === detectedLocale) return

    setIsChanging(true)

    try {
      router.replace(pathname, { locale: newLocale })
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
