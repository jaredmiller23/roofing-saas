'use client';

import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function LanguageSettings() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('language.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('language.description')}
        </p>
      </div>
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('language.selectLanguage')}</CardTitle>
          <CardDescription>
            {t('language.availableLanguages')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('language.currentLanguage')}</p>
              <p className="text-sm text-muted-foreground">
                Choose your preferred language for the interface
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional Settings</CardTitle>
          <CardDescription>
            Date, time, and number formats are automatically adjusted based on your language selection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Date Format</p>
              <p className="text-muted-foreground">MM/DD/YYYY (US) / YYYY-MM-DD (CA)</p>
            </div>
            <div>
              <p className="font-medium">Currency</p>
              <p className="text-muted-foreground">USD ($)</p>
            </div>
            <div>
              <p className="font-medium">Time Format</p>
              <p className="text-muted-foreground">12-hour / 24-hour</p>
            </div>
            <div>
              <p className="font-medium">Number Format</p>
              <p className="text-muted-foreground">1,234.56 / 1 234,56</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
