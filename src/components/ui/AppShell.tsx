'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, ClipboardList, Home, Lock, Users, FileSpreadsheet, FileText } from 'lucide-react'
import { t } from '@/lib/i18n'
import { useUI } from './UIProvider'
import { Art } from './Art'

export interface NavItem {
  href: string
  label: string
  icon: 'home' | 'survey' | 'admin' | 'overview' | 'analytics' | 'responses' | 'graduates' | 'reports'
  exact?: boolean
}

function renderNavIcon(icon: NavItem['icon']) {
  const cls = 'size-4 shrink-0'
  switch (icon) {
    case 'home': return <Home className={cls} />
    case 'survey': return <ClipboardList className={cls} />
    case 'admin': return <Lock className={cls} />
    case 'overview': return <BarChart3 className={cls} />
    case 'analytics': return <FileSpreadsheet className={cls} />
    case 'responses': return <FileText className={cls} />
    case 'graduates': return <Users className={cls} />
    case 'reports': return <FileSpreadsheet className={cls} />
  }
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/fbu-logo.png"
        alt="Fenerbahçe Üniversitesi"
        className={compact ? 'h-7 w-auto object-contain' : 'h-8 sm:h-9 w-auto object-contain'}
      />
    </span>
  )
}

export function TopNav({
  items,
  rightSlot,
  hideMobileNav = false,
}: {
  items: NavItem[]
  rightSlot?: React.ReactNode
  hideMobileNav?: boolean
}) {
  const pathname = usePathname()
  const { lang, toggleLang } = useUI()
  const pillRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  })

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  useLayoutEffect(() => {
    const update = () => {
      const container = pillRef.current
      if (!container) return
      const activeEl = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')
      if (!activeEl) {
        setIndicator((s) => (s.visible ? { ...s, visible: false } : s))
        return
      }
      setIndicator({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        visible: true,
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [pathname, lang, items])

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-line-2/80 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
            <BrandLogo compact />
            <span className="hidden lg:inline-block border-l border-line pl-2.5 text-xs font-medium tracking-tight text-ink-2">
              {t(lang, 'brand.short')}
            </span>
          </Link>

          <nav
            ref={pillRef}
            aria-label="Ana gezinme"
            className="nav-pill hidden md:flex items-center gap-1 rounded-full border border-line-2 bg-sunk/80 p-1"
          >
            <span
              className="indicator"
              style={{
                left: indicator.left,
                width: indicator.width,
                opacity: indicator.visible ? 1 : 0,
              }}
            />
            {items.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                  }`}
                >
                  {renderNavIcon(item.icon)}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLang}
              aria-label={t(lang, 'lang.aria')}
              className="inline-flex h-10 min-w-[44px] items-center justify-center rounded-full border border-line bg-raised/80 px-3 text-xs font-semibold tracking-wider text-ink transition-colors hover:border-ink-3"
            >
              {lang.toUpperCase()} → {t(lang, 'lang.switch')}
            </button>

            {rightSlot}
          </div>
        </div>
      </header>

      {!hideMobileNav && (
        <nav
          aria-label="Mobil gezinme"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line-2 bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        >
          <div className="grid gap-1 px-2 py-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(5, items.length)}, minmax(0, 1fr))` }}>
            {items.slice(0, 5).map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium transition-colors ${
                    active ? 'bg-raised text-ink shadow-xs' : 'text-ink-3'
                  }`}
                >
                  <span className={active ? 'text-clay' : ''}>{renderNavIcon(item.icon)}</span>
                  <span className="truncate max-w-full">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}

export function SiteFooter() {
  const { lang } = useUI()
  const [year] = useState(() => new Date().getFullYear())
  useEffect(() => {}, [])

  return (
    <footer className="mt-20 border-t border-line-2 bg-[#141413] text-[#c2c0b6]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4 max-w-md">
          <Art name="seal" size={64} className="shrink-0 opacity-80" />
          <div>
            <p className="serif text-lg font-medium text-[#faf9f5]">{t(lang, 'brand.title')}</p>
            <p className="mt-1 text-sm text-[#8f8d85]">{t(lang, 'brand.unit')}</p>
            <p className="mt-2 text-xs text-[#8f8d85]">{t(lang, 'land.footerNote')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link href="/" className="text-[#c2c0b6] hover:text-[#faf9f5] transition-colors">
            {t(lang, 'nav.home')}
          </Link>
          <Link href="/giris" className="text-[#c2c0b6] hover:text-[#faf9f5] transition-colors">
            {t(lang, 'nav.survey')}
          </Link>
          <Link href="/admin/giris" className="text-[#c2c0b6] hover:text-[#faf9f5] transition-colors">
            {t(lang, 'land.adminLink')}
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-[#8f8d85] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {year} {t(lang, 'brand.uni')}</span>
          <span>{t(lang, 'brand.short')}</span>
        </div>
      </div>
    </footer>
  )
}
