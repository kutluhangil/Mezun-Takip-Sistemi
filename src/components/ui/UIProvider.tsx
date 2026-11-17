'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lang } from '@/lib/survey-types'

export type ThemePref = 'light' | 'dark' | 'system'

interface UIContextValue {
  lang: Lang
  toggleLang: () => void
  theme: ThemePref
  cycleTheme: () => void
}

const UIContext = createContext<UIContextValue | null>(null)
const NEXT_THEME: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' }
const YEAR = 60 * 60 * 24 * 365

function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1f1e1d' : '#f9f9f7')
}

export function UIProvider({
  initialLang,
  initialTheme,
  children,
}: {
  initialLang: Lang
  initialTheme: ThemePref
  children: React.ReactNode
}) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>(initialLang)
  const [theme, setTheme] = useState<ThemePref>(initialTheme)

  // Sistem teması seçiliyken işletim sistemi değişimini canlı izle
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])

  const toggleLang = useCallback(() => {
    const next: Lang = lang === 'tr' ? 'en' : 'tr'
    setLang(next)
    document.documentElement.lang = next
    document.cookie = `mts_lang=${next}; path=/; max-age=${YEAR}; samesite=lax`
    router.refresh()
  }, [lang, router])

  const cycleTheme = useCallback(() => {
    const next = NEXT_THEME[theme]
    setTheme(next)
    document.cookie = `mts_theme=${next}; path=/; max-age=${YEAR}; samesite=lax`
  }, [theme])

  return <UIContext.Provider value={{ lang, toggleLang, theme, cycleTheme }}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be wrapped inside UIProvider')
  return ctx
}
