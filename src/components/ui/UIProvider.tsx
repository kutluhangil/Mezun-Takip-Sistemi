'use client'

import React, { createContext, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lang } from '@/lib/survey-types'

interface UIContextValue {
  lang: Lang
  setLang: (next: Lang) => void
  toggleLang: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({
  initialLang,
  children,
}: {
  initialLang: Lang
  children: React.ReactNode
}) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = async (next: Lang) => {
    setLangState(next)
    document.cookie = `mts_lang=${next}; path=/; max-age=31536000; samesite=lax`
    try {
      await fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: next }),
      })
    } catch {
      // Çerez yerel olarak yazıldı
    }
    router.refresh()
  }

  const toggleLang = () => {
    void setLang(lang === 'tr' ? 'en' : 'tr')
  }

  return (
    <UIContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be wrapped inside UIProvider')
  return ctx
}
