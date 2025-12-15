'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useTheme } from '@/lib/hooks/useTheme'
import { Monitor, Moon, Sun } from 'lucide-react'

/**
 * Appearance Settings Component
 * 
 * Allows users to:
 * - Switch between light, dark, and system themes
 * - Preview current theme selection
 * - Understand how system theme detection works
 */
export function AppearanceSettings() {
  const { theme, resolvedTheme, mounted } = useTheme()

  const getThemeDescription = () => {
    if (!mounted) return 'Loading theme preferences...'
    
    switch (theme) {
      case 'light':
        return 'Always use light theme regardless of system preference'
      case 'dark':
        return 'Always use dark theme regardless of system preference'
      case 'system':
        return `Automatically switches based on your system preference (currently ${resolvedTheme})`
      default:
        return 'Theme preference not set'
    }
  }

  const getCurrentThemeIcon = () => {
    if (!mounted) return <Monitor className="h-5 w-5" />
    
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />
      case 'dark':
        return <Moon className="h-5 w-5" />
      case 'system':
        return <Monitor className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Appearance</h2>
        <p className="text-muted-foreground">
          Customize the appearance of the application to match your preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getCurrentThemeIcon()}
            Theme Preference
          </CardTitle>
          <CardDescription>
            Choose how the application should appear. System theme automatically adapts to your device's theme settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Current Theme</Label>
              <p className="text-sm text-muted-foreground">
                {getThemeDescription()}
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="text-sm font-medium mb-3">Theme Options</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Sun className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Light</p>
                  <p className="text-xs text-muted-foreground">Clean and bright interface</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Dark</p>
                  <p className="text-xs text-muted-foreground">Easy on the eyes with warm coral accents</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">System</p>
                  <p className="text-xs text-muted-foreground">Automatically matches your device settings</p>
                </div>
              </div>
            </div>
          </div>

          {mounted && (
            <div className="rounded-lg border p-4 bg-card">
              <h4 className="text-sm font-medium mb-2">Theme Preview</h4>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-primary"></div>
                <span>Primary (Coral)</span>
                <div className="w-4 h-4 rounded-full bg-secondary ml-4"></div>
                <span>Secondary (Teal)</span>
                <div className="w-4 h-4 rounded-full bg-background border ml-4"></div>
                <span>Background</span>
                <div className="w-4 h-4 rounded-full bg-foreground ml-4"></div>
                <span>Text</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
          <CardDescription>
            Theme settings affect readability and eye strain. Dark mode is recommended for low-light environments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              • <strong>Light theme:</strong> Higher contrast, better for bright environments
            </p>
            <p className="text-muted-foreground">
              • <strong>Dark theme:</strong> Reduced eye strain in low-light conditions
            </p>
            <p className="text-muted-foreground">
              • <strong>System theme:</strong> Automatically switches based on your device's time-of-day settings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
