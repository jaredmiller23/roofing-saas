"use client"

import React, { useEffect } from 'react'
import { CommandPaletteProvider as ContextProvider, useCommandPalette } from '@/lib/hooks/useCommandPalette'
import { CommandPalette } from './CommandPalette'

interface CommandPaletteProviderProps {
  children: React.ReactNode
}

function CommandPaletteWrapper({ children }: CommandPaletteProviderProps) {
  const { open, close, isOpen } = useCommandPalette()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          close()
        } else {
          open()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close, isOpen])

  return (
    <>
      {children}
      <CommandPalette />
    </>
  )
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  return (
    <ContextProvider>
      <CommandPaletteWrapper>
        {children}
      </CommandPaletteWrapper>
    </ContextProvider>
  )
}